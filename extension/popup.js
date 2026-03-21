const API_BASE = 'https://api-ainews.hungphu.work';
const API_KEY = 'f3626b5739823a2a8c33b60e72ed774403c23afc2953cfb36408713872e3bf26';

document.addEventListener('DOMContentLoaded', async () => {
  const saveBtn = document.getElementById('save-btn');
  const openBtn = document.getElementById('open-btn');
  const statusEl = document.getElementById('status');
  const pageTitleEl = document.getElementById('page-title');
  const pageUrlEl = document.getElementById('page-url');

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    pageTitleEl.textContent = tab.title || 'Unknown page';
    pageUrlEl.textContent = tab.url || '';
  }

  // Save button
  saveBtn.addEventListener('click', async () => {
    if (!tab?.url) return;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    statusEl.style.display = 'none';

    try {
      const res = await fetch(`${API_BASE}/api/articles/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
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
