// mp4tags.js - Escribe metadatos iTunes/MP4 en archivos M4A
// Inserta átomos ilst dentro del contenedor MP4

class MP4Tagger {
  constructor(buffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
  }

  // Escribir uint32 big-endian
  writeUint32(arr, offset, value) {
    arr[offset] = (value >>> 24) & 0xff;
    arr[offset + 1] = (value >>> 16) & 0xff;
    arr[offset + 2] = (value >>> 8) & 0xff;
    arr[offset + 3] = value & 0xff;
  }

  // Crear átomo MP4: [size(4)][name(4)][data]
  makeAtom(name, data) {
    const size = 8 + data.length;
    const atom = new Uint8Array(size);
    this.writeUint32(atom, 0, size);
    for (let i = 0; i < 4; i++) {
      atom[4 + i] = name.charCodeAt(i) & 0xff;
    }
    atom.set(data, 8);
    return atom;
  }

  // Crear átomo data con flags (1=texto, 13=jpeg, 14=png)
  makeDataAtom(flags, data) {
    const payload = new Uint8Array(8 + data.length);
    this.writeUint32(payload, 0, flags); // type indicator
    this.writeUint32(payload, 4, 0);     // locale
    payload.set(data, 8);
    return this.makeAtom('data', payload);
  }

  // Crear átomo de texto (título, artista, etc.)
  makeTextAtom(name, text) {
    const textBytes = new TextEncoder().encode(text);
    const dataAtom = this.makeDataAtom(1, textBytes);
    return this.makeAtom(name, dataAtom);
  }

  // Crear átomo de imagen (portada)
  makeCoverAtom(imageBuffer) {
    const imageBytes = new Uint8Array(imageBuffer);
    const flags = (imageBytes[0] === 0x89) ? 14 : 13; // 14=png, 13=jpeg
    const dataAtom = this.makeDataAtom(flags, imageBytes);
    return this.makeAtom('covr', dataAtom);
  }

  // Crear átomo trkn (número de pista)
  makeTrackAtom(track, total = 0) {
    const payload = new Uint8Array([
      0, 0,
      (track >> 8) & 0xff, track & 0xff,
      (total >> 8) & 0xff, total & 0xff,
      0, 0
    ]);
    const dataAtom = this.makeDataAtom(0, payload);
    return this.makeAtom('trkn', dataAtom);
  }

  // Encontrar átomo por nombre en el buffer
  findAtom(buffer, name, offset = 0) {
    const view = new DataView(buffer);
    let pos = offset;
    while (pos < buffer.byteLength - 8) {
      const size = view.getUint32(pos);
      if (size < 8) break;
      const atomName = String.fromCharCode(
        view.getUint8(pos + 4), view.getUint8(pos + 5),
        view.getUint8(pos + 6), view.getUint8(pos + 7)
      );
      if (atomName === name) return { offset: pos, size };
      pos += size;
    }
    return null;
  }

  // Encontrar átomo anidado siguiendo un path
  findNestedAtom(buffer, path) {
    let currentBuffer = buffer;
    let absoluteOffset = 0;

    for (let i = 0; i < path.length; i++) {
      const name = path[i];
      const startSearch = (i === 0) ? 0 : 8; // skip header for nested
      const result = this.findAtom(currentBuffer, name, startSearch);
      if (!result) return null;

      absoluteOffset += result.offset;

      if (i === path.length - 1) {
        return { offset: absoluteOffset, size: result.size };
      }

      // Entrar al átomo (skip 8 bytes de header)
      currentBuffer = currentBuffer.slice(result.offset + 8, result.offset + result.size);
      absoluteOffset += 8;
    }
    return null;
  }

  addTags({ title, artist, album, year, track, coverBuffer }) {
    const buf = this.buffer;

    // Construir átomos ilst
    const atoms = [];
    if (title) atoms.push(this.makeTextAtom('\u00a9nam', title));   // ©nam
    if (artist) atoms.push(this.makeTextAtom('\u00a9ART', artist));  // ©ART
    if (album) atoms.push(this.makeTextAtom('\u00a9alb', album));   // ©alb
    if (year) atoms.push(this.makeTextAtom('\u00a9day', year));    // ©day
    if (track) atoms.push(this.makeTrackAtom(track));               // trkn
    if (coverBuffer) atoms.push(this.makeCoverAtom(coverBuffer));

    // Calcular tamaño total de ilst
    const ilstSize = atoms.reduce((a, b) => a + b.length, 0) + 8;
    const ilstHeader = new Uint8Array(8);
    this.writeUint32(ilstHeader, 0, ilstSize);
    new TextEncoder().encode('ilst').forEach((b, i) => ilstHeader[4 + i] = b);

    // Construir udta > meta > hdlr + ilst
    // meta necesita 4 bytes de padding (version/flags) después del header
    const metaPadding = new Uint8Array(4);

    // Crear hdlr mdir (mandatory for iTunes)
    const hdlrData = new Uint8Array([
      0, 0, 0, 0, // version & flags
      0, 0, 0, 0, // pre_defined
      109, 100, 105, 114, // 'mdir'
      97, 112, 112, 108, // 'appl'
      0, 0, 0, 0, // reserved
      0, 0, 0, 0, // reserved
      0 // null string
    ]);
    const hdlrAtom = this.makeAtom('hdlr', hdlrData);

    const metaContent = new Uint8Array([
      ...metaPadding,
      ...hdlrAtom,
      ...ilstHeader,
      ...atoms.reduce((a, b) => [...a, ...b], [])
    ]);
    const metaAtom = this.makeAtom('meta', metaContent);
    const udtaAtom = this.makeAtom('udta', metaAtom);

    // Insertar udta antes del átomo mdat o al final de moov
    // Buscar moov
    const moovResult = this.findAtom(buf, 'moov');
    if (!moovResult) {
      // Sin moov, insertar al final
      const result = new Uint8Array(buf.byteLength + udtaAtom.length);
      result.set(new Uint8Array(buf));
      result.set(udtaAtom, buf.byteLength);
      return result.buffer;
    }

    const moovStart = moovResult.offset;
    let moovSize = moovResult.size;
    let workingBuf = new Uint8Array(buf);

    // Búsqueda profunda para purgar un udta pre-existente
    // Si YouTube ya incrustó un udta, iTunes leerá ESE primero y descartará el nuestro.
    const udtaResult = this.findAtom(buf, 'udta', moovStart + 8);
    if (udtaResult && udtaResult.offset < moovStart + moovSize) {
      const uStart = udtaResult.offset;
      const uSize = udtaResult.size;
      const p1 = workingBuf.slice(0, uStart);
      const p2 = workingBuf.slice(uStart + uSize);
      const newBuf = new Uint8Array(p1.length + p2.length);
      newBuf.set(p1, 0);
      newBuf.set(p2, p1.length);
      workingBuf = newBuf;
      moovSize -= uSize;

      // Asegurar que el tamaño reducido de moov se actualice antes de inyectar
      this.writeUint32(workingBuf, moovStart, moovSize);
    }

    const newMoovSize = moovSize + udtaAtom.length;
    const result = new Uint8Array(workingBuf.byteLength + udtaAtom.length);

    // Copiar todo hasta el final de moov
    result.set(workingBuf.slice(0, moovStart + moovSize));
    // Insertar udta al final de moov
    result.set(udtaAtom, moovStart + moovSize);
    // Copiar lo que viene después de moov
    result.set(workingBuf.slice(moovStart + moovSize), moovStart + moovSize + udtaAtom.length);

    // Actualizar tamaño de moov
    this.writeUint32(result, moovStart, newMoovSize);

    // Parche crítico para Apple Music:
    // Los audios del catálogo de YouTube son DASH (Fragmented MP4), cuyo 'ftyp' es 'dash' o 'iso5'.
    // Los reproductores de Apple IGNORAN los metadatos si ven la marca 'dash'.
    // Sobrescribimos el ftyp en-sitio para que se identifique como un 'M4A ' estándar.
    const ftypFinal = this.findAtom(result.buffer, 'ftyp');
    if (ftypFinal) {
      const start = ftypFinal.offset;
      const size = ftypFinal.size;
      const m4a = [0x4D, 0x34, 0x41, 0x20]; // 'M4A '
      const isom = [0x69, 0x73, 0x6f, 0x6d]; // 'isom'

      if (size >= 12) result.set(m4a, start + 8);
      if (size >= 16) result.set([0, 0, 0, 0], start + 12);
      if (size >= 20) result.set(m4a, start + 16);
      if (size >= 24) result.set(isom, start + 20);
      for (let i = 24; i < size; i += 4) {
        result.set([0, 0, 0, 0], start + i); // wipe remaining brands
      }
    }

    return result.buffer;
  }
}
