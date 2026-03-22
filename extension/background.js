// Open side panel on message from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidePanel' && message.tabId) {
    chrome.sidePanel.open({ tabId: message.tabId });
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
