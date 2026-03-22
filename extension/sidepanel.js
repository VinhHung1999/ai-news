const API_BASE = 'https://api-ainews.hungphu.work';

let currentVideoInfo = null;

async function getApiKey() {
  const stored = await chrome.storage.local.get('apiKey');
  return stored.apiKey || '';
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || (!tab.url.includes('youtube.com/watch') && !tab.url.includes('youtu.be/'))) {
    document.getElementById('not-youtube').style.display = 'block';
    return;
  }

  document.getElementById('loading').style.display = 'block';

  try {
    const res = await fetch(`${API_BASE}/api/youtube/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tab.url }),
    });

    if (!res.ok) throw new Error('Failed to fetch video info');
    const info = await res.json();
    currentVideoInfo = { ...info, url: tab.url };

    // Show video info
    document.getElementById('thumbnail').src = info.thumbnail;
    document.getElementById('video-title').textContent = info.title;
    document.getElementById('video-author').textContent = info.author;

    // Show transcript
    const transcriptEl = document.getElementById('transcript');
    if (info.transcript && info.transcript !== 'Transcript not available for this video.') {
      info.transcript.split('\n').forEach(line => {
        const div = document.createElement('div');
        div.className = 'transcript-line';
        const tsMatch = line.match(/^\[(\d+:\d+)\]\s*(.*)/);
        if (tsMatch) {
          div.innerHTML = `<span class="ts">${tsMatch[1]}</span>${tsMatch[2]}`;
        } else {
          div.textContent = line;
        }
        transcriptEl.appendChild(div);
      });
    } else {
      transcriptEl.innerHTML = '<p style="color:#888">Transcript not available for this video.</p>';
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
  } catch (err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('not-youtube').style.display = 'block';
    document.getElementById('not-youtube').querySelector('p').textContent = `Error: ${err.message}`;
  }
}

// Summarize
document.getElementById('summarize-btn').addEventListener('click', async () => {
  if (!currentVideoInfo) return;
  const btn = document.getElementById('summarize-btn');
  const spinner = document.getElementById('sum-spinner');
  btn.disabled = true;
  spinner.style.display = 'inline-block';
  btn.childNodes[btn.childNodes.length - 1].textContent = ' Summarizing...';

  try {
    const res = await fetch(`${API_BASE}/api/youtube/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: currentVideoInfo.title, transcript: currentVideoInfo.transcript }),
    });

    if (!res.ok) throw new Error('Summarize failed');
    const data = await res.json();

    const summaryEl = document.getElementById('summary-content');
    // Simple markdown-ish rendering
    summaryEl.innerHTML = data.summary
      .replace(/^- /gm, '• ')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    document.getElementById('summary-section').classList.add('visible');
    btn.childNodes[btn.childNodes.length - 1].textContent = ' ✓ Done';
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
    btn.disabled = false;
    btn.childNodes[btn.childNodes.length - 1].textContent = ' Summarize';
  } finally {
    spinner.style.display = 'none';
  }
});

// Save
document.getElementById('save-btn').addEventListener('click', async () => {
  if (!currentVideoInfo) return;
  const apiKey = await getApiKey();
  if (!apiKey) {
    showStatus('Set API key in popup first', 'error');
    return;
  }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch(`${API_BASE}/api/articles/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ url: currentVideoInfo.url }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Save failed');
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
chrome.tabs.onActivated.addListener(() => {
  document.getElementById('content').style.display = 'none';
  document.getElementById('not-youtube').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  document.getElementById('summary-section').classList.remove('visible');
  currentVideoInfo = null;
  init();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    document.getElementById('content').style.display = 'none';
    document.getElementById('not-youtube').style.display = 'none';
    document.getElementById('summary-section').classList.remove('visible');
    currentVideoInfo = null;
    init();
  }
});

init();
