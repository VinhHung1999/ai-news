// Open side panel when clicking extension icon on YouTube
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('youtu.be/'))) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Enable side panel on YouTube tabs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url && (tab.url.includes('youtube.com/watch') || tab.url.includes('youtu.be/'))) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true,
    });
  }
});
