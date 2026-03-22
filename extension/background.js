// On YouTube tabs: disable popup so action.onClicked fires
// On other tabs: restore popup
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) return;
  const isYouTube = tab.url.includes('youtube.com/watch') || tab.url.includes('youtu.be/');

  if (isYouTube) {
    await chrome.action.setPopup({ tabId, popup: '' });
    await chrome.sidePanel.setOptions({ tabId, path: 'sidepanel.html', enabled: true });
  } else {
    await chrome.action.setPopup({ tabId, popup: 'popup.html' });
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;
    const isYouTube = tab.url.includes('youtube.com/watch') || tab.url.includes('youtu.be/');
    if (isYouTube) {
      await chrome.action.setPopup({ tabId, popup: '' });
    } else {
      await chrome.action.setPopup({ tabId, popup: 'popup.html' });
    }
  } catch {}
});

// Click icon on YouTube (no popup) → open side panel (user gesture context)
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
