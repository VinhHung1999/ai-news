const API_BASE = 'https://api-ainews.hungphu.work';

let pageData = null; // { url, title, content, thumbnail, isYouTube, summary }

async function getApiKey() {
  const stored = await chrome.storage.local.get('apiKey');
  return stored.apiKey || '';
}

// API key settings toggle
document.getElementById('key-toggle').addEventListener('click', () => {
  document.getElementById('settings-bar').classList.toggle('visible');
});

document.getElementById('save-key-btn').addEventListener('click', async () => {
  const key = document.getElementById('api-key-input').value.trim();
  if (!key) return;
  await chrome.storage.local.set({ apiKey: key });
  document.getElementById('api-key-input').value = '••••••••';
  showStatus('API key saved!', 'success');
  document.getElementById('settings-bar').classList.remove('visible');
});

// Init: check if key exists
(async () => {
  const key = await getApiKey();
  if (!key) {
    document.getElementById('settings-bar').classList.add('visible');
  }
})();

async function loadPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || tab.url.startsWith('chrome://')) {
    document.getElementById('loading').innerHTML = '<p style="color:#888">Navigate to a web page to get started.</p>';
    document.getElementById('loading').style.display = 'block';
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('content-wrapper').style.display = 'none';
  document.getElementById('summary-section').classList.remove('visible');

  const isYouTube = tab.url.includes('youtube.com/watch') || tab.url.includes('youtu.be/');

  try {
    if (isYouTube) {
      // YouTube: get transcript via backend API (Python youtube-transcript-api)
      const res = await fetch(`${API_BASE}/api/youtube/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tab.url }),
      });
      if (!res.ok) throw new Error('Failed to fetch video info');
      const result = await res.json();

      const transcriptText = result.transcript || '';

      pageData = {
        url: tab.url,
        title: result.title || tab.title,
        content: transcriptText || 'Transcript not available for this video.',
        thumbnail: result.thumbnail,
        isYouTube: true,
        author: result.author,
        summary: null,
      };

      // Show thumbnail
      const thumbEl = document.getElementById('thumbnail');
      if (result.thumbnail) {
        thumbEl.src = result.thumbnail;
        thumbEl.classList.add('visible');
      }
      document.getElementById('page-title').textContent = pageData.title;
      document.getElementById('page-meta').textContent = `🎬 ${result.author} · YouTube`;
      document.getElementById('content-label').textContent = 'Transcript';

      // Render transcript
      const bodyEl = document.getElementById('content-body');
      bodyEl.innerHTML = '';
      if (transcriptText) {
        transcriptText.split('\n').forEach(line => {
          const div = document.createElement('div');
          const tsMatch = line.match(/^\[(\d+:\d+)\]\s*(.*)/);
          if (tsMatch) {
            div.innerHTML = `<span class="ts">${tsMatch[1]}</span>${tsMatch[2]}`;
          } else {
            div.textContent = line;
          }
          bodyEl.appendChild(div);
        });
      } else {
        bodyEl.innerHTML = '<p style="color:#888">Transcript not available for this video.</p>';
      }
    } else {
      // Other pages: fetch via Jina Reader
      const res = await fetch(`https://r.jina.ai/${tab.url}`, {
        headers: { 'Accept': 'text/markdown', 'User-Agent': 'AI-News-Hacker-Dashboard' }
      });
      if (!res.ok) throw new Error(`Failed to fetch content (${res.status})`);
      const markdown = await res.text();

      // Extract title
      const titleMatch = markdown.match(/^(?:Title:\s*(.+)|#\s+(.+))/m);
      const title = titleMatch?.[1] || titleMatch?.[2] || tab.title || 'Untitled';

      pageData = {
        url: tab.url,
        title,
        content: markdown,
        thumbnail: null,
        isYouTube: false,
        summary: null,
      };

      document.getElementById('thumbnail').classList.remove('visible');
      document.getElementById('page-title').textContent = title;
      document.getElementById('page-meta').textContent = new URL(tab.url).hostname;
      document.getElementById('content-label').textContent = 'Content';

      // Render markdown as plain text (simple)
      const bodyEl = document.getElementById('content-body');
      bodyEl.innerText = markdown;
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('content-wrapper').style.display = 'flex';
    document.getElementById('content-wrapper').style.flexDirection = 'column';
    document.getElementById('content-wrapper').style.flex = '1';
    document.getElementById('content-wrapper').style.overflow = 'hidden';

    // Reset buttons
    const sumBtn = document.getElementById('summarize-btn');
    sumBtn.disabled = false;
    sumBtn.innerHTML = '✦ Summarize';
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save';
    saveBtn.className = 'btn-save';

  } catch (err) {
    document.getElementById('loading').innerHTML = `<p style="color:#ef4444">Error: ${err.message}</p>`;
  }
}

// Summarize
document.getElementById('summarize-btn').addEventListener('click', async () => {
  if (!pageData?.content) return;
  const btn = document.getElementById('summarize-btn');
  const spinner = document.getElementById('sum-spinner');
  btn.disabled = true;
  spinner.style.display = 'inline-block';
  btn.lastChild.textContent = ' Summarizing...';

  try {
    const res = await fetch(`${API_BASE}/api/youtube/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: pageData.title, transcript: pageData.content }),
    });
    if (!res.ok) throw new Error('Summarize failed');
    const data = await res.json();

    pageData.summary = data.summary;

    document.getElementById('summary-content').innerHTML = data.summary
      .replace(/^- /gm, '• ')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    document.getElementById('summary-section').classList.add('visible');
    btn.lastChild.textContent = ' ✓ Done';
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
    btn.disabled = false;
    btn.lastChild.textContent = ' Summarize';
  } finally {
    spinner.style.display = 'none';
  }
});

// Save (content + summary)
document.getElementById('save-btn').addEventListener('click', async () => {
  if (!pageData) return;
  const apiKey = await getApiKey();
  if (!apiKey) {
    showStatus('Set API key first (🔑)', 'error');
    document.getElementById('settings-bar').classList.add('visible');
    return;
  }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    // Save article
    const res = await fetch(`${API_BASE}/api/articles/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ url: pageData.url }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Save failed');
    }
    const { article } = await res.json();

    // If we have a summary, save it too
    if (pageData.summary && article.id) {
      await fetch(`${API_BASE}/api/articles/${article.id}/save-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ summary: pageData.summary }),
      });
    }

    btn.className = 'btn-saved';
    btn.textContent = '✓ Saved';
    showStatus('Saved to AI News!', 'success');
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
    btn.disabled = false;
    btn.textContent = '💾 Save';
    btn.className = 'btn-save';
  }
});

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type}`;
  setTimeout(() => { el.className = 'status'; }, 5000);
}

// Listen for tab changes
chrome.tabs.onActivated.addListener(() => loadPage());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) loadPage();
});

loadPage();
