// Open side panel on icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Store captured timedtext URLs (with POT token) from YouTube player
const capturedUrls = {};

// Intercept YouTube player's timedtext requests to capture POT token
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('/api/timedtext') && details.url.includes('v=')) {
      const url = new URL(details.url);
      const videoId = url.searchParams.get('v');
      if (videoId) {
        capturedUrls[videoId] = details.url;
      }
    }
  },
  { urls: ['*://www.youtube.com/api/timedtext*'] }
);

// Handle transcript requests from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTranscript') {
    fetchTranscript(message.videoId, message.tabId)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function fetchTranscript(videoId, tabId) {
  // Get video info from oEmbed
  const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
  const oembed = oembedRes.ok ? await oembedRes.json() : {};
  const title = oembed.title || '';
  const author = oembed.author_name || '';
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // Check if we already captured a timedtext URL for this video
  let timedtextUrl = capturedUrls[videoId];

  if (!timedtextUrl) {
    // Reload the tab to trigger YouTube player to fetch captions
    // Then wait a bit for the webRequest listener to capture it
    if (tabId) {
      await chrome.tabs.reload(tabId);
      // Wait for the player to load and request captions
      await new Promise(resolve => setTimeout(resolve, 3000));
      timedtextUrl = capturedUrls[videoId];
    }
  }

  if (!timedtextUrl) {
    // Last resort: try to extract from page via content script
    if (tabId) {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Try to get transcript from YouTube's transcript panel
          const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
          if (segments.length > 0) {
            return Array.from(segments).map(seg => {
              const ts = seg.querySelector('.segment-timestamp')?.textContent?.trim() || '';
              const text = seg.querySelector('.segment-text')?.textContent?.trim() || '';
              return { ts, text };
            });
          }
          return null;
        }
      });

      const domTranscript = results?.[0]?.result;
      if (domTranscript && domTranscript.length > 0) {
        return { transcript: domTranscript, lang: 'en', title, author, thumbnail };
      }
    }

    throw new Error('No captions captured yet. Try opening the video first, then click the extension icon again.');
  }

  // Fetch transcript using captured URL (has POT token)
  // Change format to json3
  const url = new URL(timedtextUrl);
  url.searchParams.set('fmt', 'json3');

  const transcriptRes = await fetch(url.toString());
  const transcriptText = await transcriptRes.text();

  if (!transcriptText || transcriptText.length === 0) {
    throw new Error('Transcript response empty');
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

  return { transcript: items, lang: url.searchParams.get('lang') || 'en', title, author, thumbnail };
}
