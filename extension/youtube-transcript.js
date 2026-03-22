// Content script injected into YouTube page to extract transcript
(async () => {
  try {
    // Get player response from page's ytInitialPlayerResponse
    const scripts = document.querySelectorAll('script');
    let playerResponse = null;

    for (const script of scripts) {
      const text = script.textContent || '';
      const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (match) {
        playerResponse = JSON.parse(match[1]);
        break;
      }
    }

    if (!playerResponse) {
      // Try from ytplayer.config
      playerResponse = window.ytInitialPlayerResponse;
    }

    if (!playerResponse) {
      return { error: 'No player response found' };
    }

    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) {
      return { error: 'No captions available for this video' };
    }

    // Prefer English
    const track = captions.find(t => t.languageCode === 'en') || captions[0];
    const url = track.baseUrl;

    // Fetch transcript XML from the page context (same origin, has cookies)
    const res = await fetch(url);
    const xml = await res.text();

    // Parse
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const texts = doc.querySelectorAll('text');

    const transcript = [];
    texts.forEach(el => {
      const start = parseFloat(el.getAttribute('start') || '0');
      const text = el.textContent || '';
      const mins = Math.floor(start / 60);
      const secs = Math.floor(start % 60);
      const ts = `${mins}:${secs.toString().padStart(2, '0')}`;
      transcript.push({ ts, text: text.trim() });
    });

    return { transcript, lang: track.languageCode };
  } catch (err) {
    return { error: err.message };
  }
})();
