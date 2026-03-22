const API_BASE = 'https://api-ainews.hungphu.work';

document.addEventListener('DOMContentLoaded', async () => {
  const saveBtn = document.getElementById('save-btn');
  const openBtn = document.getElementById('open-btn');
  const statusEl = document.getElementById('status');
  const pageTitleEl = document.getElementById('page-title');
  const pageUrlEl = document.getElementById('page-url');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveKeyBtn = document.getElementById('save-key-btn');
  const savedBadge = document.getElementById('saved-badge');
  const mainContent = document.getElementById('main-content');
  const noKeyMsg = document.getElementById('no-key-msg');

  // Load saved API key
  const stored = await chrome.storage.local.get('apiKey');
  let apiKey = stored.apiKey || '';

  if (apiKey) {
    apiKeyInput.value = '••••••••••••••••';
    savedBadge.style.display = 'inline';
    showMain();
  } else {
    noKeyMsg.style.display = 'block';
  }

  function showMain() {
    mainContent.style.display = 'block';
    noKeyMsg.style.display = 'none';
  }

  // Save API key
  saveKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key || key === '••••••••••••••••') return;
    await chrome.storage.local.set({ apiKey: key });
    apiKey = key;
    apiKeyInput.value = '••••••••••••••••';
    savedBadge.style.display = 'inline';
    showMain();
  });

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    pageTitleEl.textContent = tab.title || 'Unknown page';
    pageUrlEl.textContent = tab.url || '';
  }


  // Save button
  saveBtn.addEventListener('click', async () => {
    if (!tab?.url || !apiKey) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    statusEl.style.display = 'none';

    try {
      const res = await fetch(`${API_BASE}/api/articles/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ url: tab.url }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      statusEl.textContent = `✓ Saved: ${data.article.title}`;
      statusEl.className = 'status success';
      statusEl.style.display = 'block';
      saveBtn.textContent = 'Saved!';
    } catch (err) {
      statusEl.textContent = `✗ ${err.message}`;
      statusEl.className = 'status error';
      statusEl.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save to AI News';
    }
  });

  // Open dashboard
  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://ai-news.hungphu.work' });
  });
});
