const API_BASE = 'https://api-ainews.hungphu.work';

let pageData = null; // { url, title, content, thumbnail, isYouTube, summary }
let tutorMessages = []; // Deep Tutor chat history
let tutorStarted = false;
let savedArticleId = null; // Article ID after saving

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

// Tab switching
document.getElementById('tab-content-btn').addEventListener('click', () => switchTab('content'));
document.getElementById('tab-tutor-btn').addEventListener('click', () => switchTab('tutor'));

function switchTab(tab) {
  document.getElementById('tab-content-btn').classList.toggle('active', tab === 'content');
  document.getElementById('tab-tutor-btn').classList.toggle('active', tab === 'tutor');
  document.getElementById('tab-content').classList.toggle('active', tab === 'content');
  document.getElementById('tab-tutor').classList.toggle('active', tab === 'tutor');

  // Auto-start Deep Tutor on first switch
  if (tab === 'tutor' && !tutorStarted && pageData?.content) {
    startDeepTutor();
  }
}

// Deep Tutor
async function startDeepTutor() {
  tutorStarted = true;
  const initMsg = { role: 'user', content: 'Please provide a structured overview and outline of this article. Break it into key sections and highlight the main points I should pay attention to.' };
  tutorMessages = [initMsg];
  renderTutorMessages();
  addTutorLoading();

  document.getElementById('tutor-input').disabled = true;
  document.getElementById('tutor-send-btn').disabled = true;

  try {
    // If article is saved, use article ID endpoint; otherwise use direct content
    let reply;
    if (savedArticleId) {
      const res = await fetch(`${API_BASE}/api/articles/${savedArticleId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [initMsg], mode: 'deep-tutor' }),
      });
      if (!res.ok) throw new Error('Deep Tutor request failed');
      const data = await res.json();
      reply = data.reply;
    } else {
      // For unsaved articles, save first to get an article ID for chat
      const apiKey = await getApiKey();
      if (apiKey) {
        const saveRes = await fetch(`${API_BASE}/api/articles/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
          body: JSON.stringify({ url: pageData.url }),
        });
        if (saveRes.ok) {
          const saveData = await saveRes.json();
          savedArticleId = saveData.article.id;
          const res = await fetch(`${API_BASE}/api/articles/${savedArticleId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [initMsg], mode: 'deep-tutor' }),
          });
          if (!res.ok) throw new Error('Deep Tutor request failed');
          const data = await res.json();
          reply = data.reply;
        }
      }
      if (!reply) {
        reply = 'Please save the article first or set your API key to use Deep Tutor.';
      }
    }

    tutorMessages.push({ role: 'assistant', content: reply });
    renderTutorMessages();
  } catch (err) {
    tutorMessages.push({ role: 'assistant', content: `Error: ${err.message}` });
    renderTutorMessages();
  } finally {
    document.getElementById('tutor-input').disabled = false;
    document.getElementById('tutor-send-btn').disabled = false;
    removeTutorLoading();
  }
}

async function sendTutorMessage() {
  const input = document.getElementById('tutor-input');
  const text = input.value.trim();
  if (!text || !savedArticleId) return;

  const userMsg = { role: 'user', content: text };
  tutorMessages.push(userMsg);
  input.value = '';
  renderTutorMessages();
  addTutorLoading();

  input.disabled = true;
  document.getElementById('tutor-send-btn').disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/articles/${savedArticleId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: tutorMessages, mode: 'deep-tutor' }),
    });
    if (!res.ok) throw new Error('Chat failed');
    const data = await res.json();
    tutorMessages.push({ role: 'assistant', content: data.reply });
    renderTutorMessages();
  } catch (err) {
    tutorMessages.push({ role: 'assistant', content: `Error: ${err.message}` });
    renderTutorMessages();
  } finally {
    input.disabled = false;
    document.getElementById('tutor-send-btn').disabled = false;
    removeTutorLoading();
  }
}

function renderTutorMessages() {
  const container = document.getElementById('tutor-messages');
  container.innerHTML = '';
  for (const msg of tutorMessages) {
    const div = document.createElement('div');
    div.className = `tutor-msg tutor-msg-${msg.role}`;
    if (msg.role === 'assistant') {
      div.innerHTML = msg.content
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- /gm, '• ')
        .replace(/^### (.+)$/gm, '<strong style="color:#10b981;font-size:13px">$1</strong>')
        .replace(/^## (.+)$/gm, '<strong style="color:#10b981;font-size:14px">$1</strong>')
        .replace(/\n/g, '<br>');
    } else {
      div.textContent = msg.content;
    }
    container.appendChild(div);
  }
  container.scrollTop = container.scrollHeight;
}

function addTutorLoading() {
  const container = document.getElementById('tutor-messages');
  const div = document.createElement('div');
  div.className = 'tutor-msg tutor-msg-assistant';
  div.id = 'tutor-loading';
  div.innerHTML = '<span class="spinner"></span> Analyzing...';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTutorLoading() {
  const el = document.getElementById('tutor-loading');
  if (el) el.remove();
}

document.getElementById('tutor-send-btn').addEventListener('click', sendTutorMessage);
document.getElementById('tutor-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendTutorMessage();
});

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

  // Reset tutor state
  tutorMessages = [];
  tutorStarted = false;
  savedArticleId = null;
  document.getElementById('tutor-messages').innerHTML = '';
  switchTab('content');

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
        thumbEl.style.display = 'block';
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

      document.getElementById('thumbnail').style.display = 'none';
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
  if (spinner) spinner.style.display = 'inline-block';
  btn.innerHTML = '<span class="spinner" id="sum-spinner"></span> Summarizing...';

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
    btn.innerHTML = '✓ Done';
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
    btn.disabled = false;
    btn.innerHTML = '✦ Summarize';
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
    savedArticleId = article.id;

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
