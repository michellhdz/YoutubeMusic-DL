// YouTube Music DL - background.js v5

let audioUrlStore = {};
const videoOnlyItags = [137, 248, 136, 247, 135, 244, 134, 243, 133, 242, 160, 278, 298, 299, 302, 303, 308, 315];

function processUrl(url) {
  try {
    const u = new URL(url);
    const mime = u.searchParams.get('mime') || '';
    if (mime.includes('webm')) return null;

    const itag = parseInt(u.searchParams.get('itag') || '0');
    if (videoOnlyItags.includes(itag)) return null;

    const clen = parseInt(u.searchParams.get('clen') || '0');

    // range debe ser 0 a (clen-1), no 0 a clen
    if (clen > 0) {
      u.searchParams.set('range', `0-${clen - 1}`);
    } else {
      u.searchParams.delete('range');
    }

    u.searchParams.delete('rn');
    u.searchParams.delete('rbuf');
    u.searchParams.delete('alr');
    u.searchParams.delete('ump');
    u.searchParams.delete('srfvp');

    return u.toString();
  } catch (e) {
    return url;
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    if (!url.includes('videoplayback')) return;
    const processed = processUrl(url);
    if (!processed) return;
    audioUrlStore[details.tabId] = processed;
    if (details.tabId === -1) {
      audioUrlStore['-1'] = processed;
    }
  },
  {
    urls: [
      'https://*.googlevideo.com/*',
      'https://*.c.youtube.com/*',
      'https://*.youtube.com/*',
      'https://lh3.googleusercontent.com/*',
      'https://storage.googleapis.com/*'
    ],
    types: ['media', 'xmlhttprequest', 'other']
  }
);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (msg.type === 'AUDIO_URL' && tabId && msg.url) {
    const processed = processUrl(msg.url);
    if (processed) audioUrlStore[tabId] = processed;
  }

  if (msg.type === 'SONG_CHANGED' && tabId) {
    audioUrlStore[tabId] = null;
    audioUrlStore['-1'] = null;
  }

  if (msg.type === 'GET_STORED_DATA') {
    sendResponse({ audioUrl: audioUrlStore[msg.tabId] || audioUrlStore['-1'] || null });
    return true;
  }
});
