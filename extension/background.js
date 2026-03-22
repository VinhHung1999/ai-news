// Always open side panel on icon click (no popup)
chrome.sidePanel.setOptions({ enabled: true, path: 'sidepanel.html' });

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
