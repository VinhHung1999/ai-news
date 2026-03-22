// Open side panel on icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle transcript requests from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTranscript') {
    fetchTranscriptViaInnertube(message.videoId)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }
});

async function fetchTranscriptViaInnertube(videoId) {
  // Use Android client — doesn't require POT token
  const playerResponse = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.09.37',
          androidSdkVersion: 30,
          hl: 'en',
          gl: 'US',
        }
      }
    })
  });

  const data = await playerResponse.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) {
    throw new Error('No captions available');
  }

  // Prefer English
  const track = tracks.find(t => t.languageCode === 'en') || tracks[0];

  // Fetch transcript as JSON
  const transcriptUrl = track.baseUrl + '&fmt=json3';
  const transcriptResponse = await fetch(transcriptUrl);
  const transcript = await transcriptResponse.json();

  const items = (transcript.events || [])
    .filter(e => e.segs)
    .map(e => {
      const startSec = (e.tStartMs || 0) / 1000;
      const mins = Math.floor(startSec / 60);
      const secs = Math.floor(startSec % 60);
      return {
        ts: `${mins}:${secs.toString().padStart(2, '0')}`,
        text: e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim(),
      };
    })
    .filter(item => item.text);

  return {
    transcript: items,
    lang: track.languageCode,
    title: data?.videoDetails?.title || '',
    author: data?.videoDetails?.author || '',
    thumbnail: data?.videoDetails?.thumbnail?.thumbnails?.pop()?.url || '',
  };
}
