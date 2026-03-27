// YouTube Music DL - content.js v3

(function () {
  let capturedUrl = null;
  let lastVideoId = null;

  function isAudioUrl(url) {
    if (!url) return false;
    if (!url.includes('videoplayback')) return false;
    try {
      const itag = parseInt(new URL(url).searchParams.get('itag') || '0');
      const videoOnly = [137, 248, 136, 247, 135, 244, 134, 243, 133, 242, 160, 278, 249, 250, 251];
      if (videoOnly.includes(itag)) return false;
    } catch (e) { }
    return true;
  }

  // Interceptar fetch
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (isAudioUrl(url)) {
      capturedUrl = url;
      chrome.runtime.sendMessage({ type: 'AUDIO_URL', url });
    }
    return origFetch.apply(this, arguments);
  };

  // Interceptar XHR
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (isAudioUrl(url)) {
      capturedUrl = url;
      chrome.runtime.sendMessage({ type: 'AUDIO_URL', url });
    }
    return origOpen.apply(this, arguments);
  };

  function getSongInfo() {
    try {
      const title =
        document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim() ||
        document.querySelector('yt-formatted-string.title')?.textContent?.trim() ||
        'Canción';

      const artist =
        document.querySelector('.byline.ytmusic-player-bar a')?.textContent?.trim() ||
        document.querySelector('span.subtitle a')?.textContent?.trim() ||
        'Artista';

      let thumbnail =
        document.querySelector('#thumbnail.ytmusic-player-bar img')?.src ||
        document.querySelector('img.ytmusic-player-bar')?.src ||
        document.querySelector('ytmusic-player-bar img')?.src ||
        null;

      if (thumbnail) {
        thumbnail = thumbnail.replace(/=w\d+-h\d+.*/, '=w500-h500-l90-rj');
      }

      const videoId =
        new URLSearchParams(window.location.search).get('v') ||
        document.querySelector('ytmusic-player')?.getAttribute('video-id') ||
        null;

      return { title, artist, thumbnail, videoId, capturedUrl };
    } catch (e) {
      return { title: 'Canción', artist: 'Artista', thumbnail: null, videoId: null, capturedUrl };
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_SONG_INFO') {
      sendResponse(getSongInfo());
    }
    return true;
  });

  setInterval(() => {
    try {
      const videoId = new URLSearchParams(window.location.search).get('v') ||
        document.querySelector('ytmusic-player')?.getAttribute('video-id');
      if (videoId && videoId !== lastVideoId) {
        lastVideoId = videoId;
        capturedUrl = null;
        chrome.runtime.sendMessage({ type: 'SONG_CHANGED' });
      }
    } catch (e) { }
  }, 1000);
})();
