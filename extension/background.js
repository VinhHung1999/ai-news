// Open side panel on icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle messages from sidepanel and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTranscript') {
    getTranscriptFromPage(message.tabId)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function getTranscriptFromPage(tabId) {
  // Inject content script that hooks into YouTube page context
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN', // Run in page's JS context, not isolated
    func: async () => {
      try {
        // Method 1: Hook into ytInitialPlayerResponse (already in page)
        const playerResponse = window.ytInitialPlayerResponse ||
          document.querySelector('#movie_player')?.getPlayerResponse?.();

        if (!playerResponse) {
          return { error: 'No player response found. Make sure video is loaded.' };
        }

        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!captions || captions.length === 0) {
          return { error: 'No captions available for this video' };
        }

        // Get video details
        const details = playerResponse?.videoDetails || {};
        const title = details.title || document.title;
        const author = details.author || '';
        const thumbnail = details.thumbnail?.thumbnails?.pop()?.url || '';

        // Prefer English track
        const track = captions.find(t => t.languageCode === 'en') || captions[0];
        const url = track.baseUrl;

        // Fetch transcript - this runs in YouTube's page context so it has cookies/POT
        const res = await fetch(url + '&fmt=json3');
        const data = await res.json();

        if (!data.events) {
          return { error: 'No transcript events in response' };
        }

        const transcript = data.events
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
          success: true,
          transcript,
          lang: track.languageCode,
          title,
          author,
          thumbnail,
        };
      } catch (err) {
        return { error: 'Transcript extraction failed: ' + err.message };
      }
    },
  });

  const result = results?.[0]?.result;
  if (!result) throw new Error('Script execution failed');
  if (result.error) throw new Error(result.error);
  return result;
}
