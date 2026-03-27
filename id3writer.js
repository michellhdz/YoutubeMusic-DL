// browser-id3-writer simplified - escribe tags ID3v2 en ArrayBuffer de audio
// Adaptado para uso en extensión Chrome sin npm

class ID3Writer {
  constructor(buffer) {
    this._buffer = buffer;
    this._frames = [];
  }

  setFrame(frameName, value) {
    this._frames.push({ name: frameName, value });
    return this;
  }

  addTag() {
    const encoder = new TextEncoder();

    const frameBuffers = this._frames.map(frame => {
      if (frame.name === 'APIC') {
        // Imagen
        const { type, data, description, mimeType } = frame.value;
        const mimeBytes = encoder.encode(mimeType + '\0');
        const descBytes = encoder.encode((description || '') + '\0');
        const content = new Uint8Array(1 + mimeBytes.length + 1 + descBytes.length + data.byteLength);
        let offset = 0;
        content[offset++] = 0; // encoding UTF-8... actually latin1 here
        content.set(mimeBytes, offset); offset += mimeBytes.length;
        content[offset++] = type; // picture type (3 = front cover)
        content.set(descBytes, offset); offset += descBytes.length;
        content.set(new Uint8Array(data), offset);
        return this._buildFrame(frame.name, content.buffer);
      } else {
        // Texto
        const text = String(frame.value);
        const textBytes = encoder.encode(text);
        const content = new Uint8Array(1 + textBytes.length);
        content[0] = 3; // UTF-8
        content.set(textBytes, 1);
        return this._buildFrame(frame.name, content.buffer);
      }
    });

    // Calcular tamaño total de frames
    const framesSize = frameBuffers.reduce((acc, fb) => acc + fb.byteLength, 0);
    const id3Size = 10 + framesSize;
    const result = new Uint8Array(id3Size + this._buffer.byteLength);

    // Header ID3v2.3
    result[0] = 0x49; result[1] = 0x44; result[2] = 0x33; // "ID3"
    result[3] = 0x03; result[4] = 0x00; // version 2.3.0
    result[5] = 0x00; // flags

    // Tamaño en synchsafe
    const size = framesSize;
    result[6] = (size >> 21) & 0x7f;
    result[7] = (size >> 14) & 0x7f;
    result[8] = (size >> 7) & 0x7f;
    result[9] = size & 0x7f;

    // Copiar frames
    let offset = 10;
    for (const fb of frameBuffers) {
      result.set(new Uint8Array(fb), offset);
      offset += fb.byteLength;
    }

    // Copiar audio original
    result.set(new Uint8Array(this._buffer), offset);

    return result.buffer;
  }

  _buildFrame(name, contentBuffer) {
    const nameBytes = new TextEncoder().encode(name);
    const size = contentBuffer.byteLength;
    const frame = new Uint8Array(10 + size);
    frame.set(nameBytes, 0);
    frame[4] = (size >> 24) & 0xff;
    frame[5] = (size >> 16) & 0xff;
    frame[6] = (size >> 8) & 0xff;
    frame[7] = size & 0xff;
    frame[8] = 0; frame[9] = 0; // flags
    frame.set(new Uint8Array(contentBuffer), 10);
    return frame.buffer;
  }
}
