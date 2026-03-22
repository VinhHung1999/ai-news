// Open side panel on icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle transcript requests from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTranscript') {
    fetchTranscript(message.videoId)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function fetchTranscript(videoId) {
  // Step 1: Get video page to extract caption tracks (browser context has cookies)
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  });
  const html = await pageRes.text();

  // Extract video title
  const titleMatch = html.match(/"title":"(.*?)"/);
  const title = titleMatch ? JSON.parse(`"${titleMatch[1]}"`) : '';

  // Extract author
  const authorMatch = html.match(/"ownerChannelName":"(.*?)"/);
  const author = authorMatch ? JSON.parse(`"${authorMatch[1]}"`) : '';

  // Extract thumbnail
  const thumbMatch = html.match(/"thumbnail":\{"thumbnails":\[\{"url":"(.*?)"/);
  const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // Extract caption tracks
  const captionsMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!captionsMatch) {
    throw new Error('No captions available for this video');
  }

  const tracks = JSON.parse(captionsMatch[1]);
  if (!tracks || tracks.length === 0) {
    throw new Error('No caption tracks found');
  }

  // Prefer English
  const track = tracks.find(t => t.languageCode === 'en') || tracks[0];

  // Step 2: Fetch transcript (extension background has YouTube cookies)
  // Use fmt=json3 for structured JSON
  let url = track.baseUrl;
  // Decode unicode escapes
  url = url.replace(/\\u0026/g, '&');
  url += '&fmt=json3';

  const transcriptRes = await fetch(url);
  const transcriptText = await transcriptRes.text();

  if (!transcriptText || transcriptText.length === 0) {
    throw new Error('Transcript response empty (may require POT token)');
  }

  const transcriptData = JSON.parse(transcriptText);
  const items = (transcriptData.events || [])
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

  return { transcript: items, lang: track.languageCode, title, author, thumbnail };
}
