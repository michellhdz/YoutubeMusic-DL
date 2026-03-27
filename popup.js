// YouTube Music DL - popup.js v5

const btnDownload = document.getElementById('btnDownload');
const songTitle = document.getElementById('songTitle');
const songArtist = document.getElementById('songArtist');
const coverImg = document.getElementById('coverImg');
const coverPlaceholder = document.getElementById('coverPlaceholder');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const progressPct = document.getElementById('progressPct');

let currentSongInfo = null;
let currentAudioUrl = null;

function setStatus(type, text) {
  statusDot.className = 'status-dot ' + type;
  statusText.textContent = text;
}

function setProgress(show, label = '', pct = 0) {
  progressWrap.style.display = show ? 'block' : 'none';
  progressLabel.textContent = label;
  progressFill.style.width = pct + '%';
  progressPct.textContent = pct + '%';
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

function detectFormat(url) {
  try {
    const mime = new URL(url).searchParams.get('mime') || '';
    if (mime.includes('webm') || mime.includes('opus')) return { mime: 'audio/webm', ext: 'webm' };
  } catch (e) { }
  return { mime: 'audio/mp4', ext: 'm4a' };
}

async function readStream(response, onProgress) {
  const contentLength = parseInt(response.headers.get('content-length') || '0');
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received, contentLength);
  }

  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out.buffer;
}

async function downloadWithCover(audioUrl, songInfo) {
  btnDownload.disabled = true;
  const { mime, ext } = detectFormat(audioUrl);
  setProgress(true, `Descargando audio (${ext.toUpperCase()})...`, 5);

  try {
    // 1. Descargar audio
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) throw new Error(`HTTP ${audioResp.status} al descargar audio`);

    let audioBuffer = await readStream(audioResp, (received, total) => {
      const pct = total > 0
        ? Math.round(5 + (received / total) * 60)
        : Math.min(60, 5 + Math.round(received / 50000));
      setProgress(true, `Descargando... ${(received / 1024 / 1024).toFixed(1)}MB${total > 0 ? ' de ' + (total / 1024 / 1024).toFixed(1) + 'MB' : ''}`, pct);
    });

    setProgress(true, 'Descargando portada...', 70);

    // 2. Descargar portada
    let coverBuffer = null;
    if (songInfo.thumbnail) {
      try {
        const imgResp = await fetch(songInfo.thumbnail);
        if (imgResp.ok) {
          const blob = await imgResp.blob();
          const bmp = await window.createImageBitmap(blob);
          const canvas = document.createElement('canvas');
          canvas.width = bmp.width;
          canvas.height = bmp.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bmp, 0, 0);

          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const b64 = dataUrl.split(',')[1];
            const binStr = atob(b64);
            const arr = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) {
              arr[i] = binStr.charCodeAt(i);
            }
            coverBuffer = arr.buffer;
          } catch (err) {
            console.error("Canvas toDataURL failed", err);
          }
        }
      } catch (e) {
        console.warn('Sin portada:', e);
      }
    }

    // 3. Escribir metadata
    setProgress(true, 'Escribiendo metadata...', 82);
    try {
      if (ext === 'm4a') {
        const tagger = new MP4Tagger(audioBuffer);
        audioBuffer = tagger.addTags({
          title: songInfo.title || 'Canción',
          artist: songInfo.artist || 'Artista',
          album: songInfo.album || 'YouTube Music',
          year: songInfo.year || '',
          track: songInfo.track || 0,
          coverBuffer,
        });
      } else {
        const writer = new ID3Writer(audioBuffer);
        writer.setFrame('TIT2', songInfo.title || 'Canción')
          .setFrame('TPE1', songInfo.artist || 'Artista')
          .setFrame('TALB', songInfo.album || 'YouTube Music');
        if (coverBuffer) {
          writer.setFrame('APIC', {
            type: 3,
            data: coverBuffer,
            description: 'Cover',
            mimeType: 'image/jpeg'
          });
        }
        audioBuffer = writer.addTag();
      }
    } catch (e) {
      console.warn('Error escribiendo tags:', e);
      // Continuar sin tags antes que fallar
    }

    // 4. Descargar
    setProgress(true, 'Guardando archivo...', 95);
    const blob = new Blob([audioBuffer], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    const filename = sanitizeFilename(`${songInfo.artist} - ${songInfo.title}`) + '.' + ext;

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    setProgress(true, '¡Listo! ✓', 100);
    setStatus('active', `Guardado: ${filename}`);
    setTimeout(() => { setProgress(false); btnDownload.disabled = false; }, 4000);

  } catch (err) {
    console.error(err);
    setProgress(false);
    setStatus('error', 'Error: ' + (err.message || 'algo salió mal'));
    btnDownload.disabled = false;
  }
}

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('music.youtube.com')) {
      setStatus('error', 'Abre YouTube Music primero');
      songTitle.textContent = 'No estás en YouTube Music';
      songArtist.textContent = 'Ve a music.youtube.com';
      return;
    }

    setStatus('loading', 'Leyendo canción...');

    let songInfo = null;
    try {
      songInfo = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SONG_INFO' });
    } catch (e) {
      setStatus('error', 'Recarga YouTube Music e intenta de nuevo');
      return;
    }

    if (!songInfo) { setStatus('error', 'No se detectó canción'); return; }

    currentSongInfo = songInfo;
    songTitle.textContent = songInfo.title || 'Sin título';
    songArtist.textContent = songInfo.artist || 'Artista desconocido';

    if (songInfo.thumbnail) {
      coverImg.src = songInfo.thumbnail;
      coverImg.style.display = 'block';
      coverPlaceholder.style.display = 'none';
    }

    const stored = await chrome.runtime.sendMessage({ type: 'GET_STORED_DATA', tabId: tab.id });
    let audioUrl = stored?.audioUrl || songInfo.capturedUrl || null;

    if (audioUrl) {
      currentAudioUrl = audioUrl;
      const { ext } = detectFormat(audioUrl);
      setStatus('active', `Listo para descargar — ${ext.toUpperCase()}`);
      btnDownload.disabled = false;
    } else {
      setStatus('loading', 'Reproduce la canción unos segundos...');
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const s = await chrome.runtime.sendMessage({ type: 'GET_STORED_DATA', tabId: tab.id });
        let url = s?.audioUrl;
        if (!url) {
          try {
            const i2 = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SONG_INFO' });
            url = i2?.capturedUrl;
          } catch (e) { }
        }
        if (url) {
          currentAudioUrl = url;
          const { ext } = detectFormat(url);
          setStatus('active', `Listo para descargar — ${ext.toUpperCase()}`);
          btnDownload.disabled = false;
          clearInterval(interval);
        }
        if (attempts > 30) {
          clearInterval(interval);
          setStatus('error', 'No se capturó audio. Recarga la página.');
        }
      }, 1000);
    }
  } catch (err) {
    setStatus('error', 'Error: ' + err.message);
  }
}

btnDownload.addEventListener('click', () => {
  if (currentAudioUrl && currentSongInfo) downloadWithCover(currentAudioUrl, currentSongInfo);
});

init();
