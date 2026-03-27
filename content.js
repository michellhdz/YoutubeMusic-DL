// YouTube Music DL - content.js v3

(function () {
  let capturedUrl = null;
  let lastVideoId = null;

  function isAudioUrl(url) {
    if (!url) return false;
    if (!url.includes('videoplayback')) return false;

    try {
      const u = new URL(url);
      const mime = u.searchParams.get('mime') || '';
      if (mime.includes('webm')) return false;

      const itag = parseInt(u.searchParams.get('itag') || '0');
      const videoOnly = [137, 248, 136, 247, 135, 244, 134, 243, 133, 242, 160, 278, 298, 299, 302, 303, 308, 315];
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
      const ms = navigator.mediaSession && navigator.mediaSession.metadata;

      let title = ms?.title ||
        document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim() ||
        document.querySelector('yt-formatted-string.title')?.textContent?.trim() ||
        'Canción';

      let artist = ms?.artist || '';
      let album = ms?.album || '';
      let year = '';
      let track = 0;

      const bylineParts = (document.querySelector('.byline.ytmusic-player-bar')?.textContent || '').split('•').map(p => p.trim());
      if (!artist || artist === 'Artista') {
        artist = bylineParts[0] || document.querySelector('span.subtitle a')?.textContent?.trim() || 'Artista';
      }

      if (bylineParts.length >= 3) {
        if (!album) album = bylineParts[1];
        year = bylineParts[2];
      } else if (bylineParts.length === 2) {
        if (/^\\d{4}$/.test(bylineParts[1])) {
          year = bylineParts[1];
        } else {
          if (!album) album = bylineParts[1];
        }
      }

      const queueItems = document.querySelectorAll('ytmusic-player-queue-item');
      if (queueItems.length > 0) {
        for (let i = 0; i < queueItems.length; i++) {
          if (queueItems[i].hasAttribute('selected')) {
            track = i + 1;
            break;
          }
        }
      }

      let thumbnail = ms?.artwork?.[ms.artwork.length - 1]?.src ||
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

      return { title, artist, album, year, track, thumbnail, videoId, capturedUrl };
    } catch (e) {
      return { title: 'Canción', artist: 'Artista', album: '', year: '', track: 0, thumbnail: null, videoId: null, capturedUrl };
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
