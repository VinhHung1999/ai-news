const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

let cachedData = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; 

app.get('/api/github', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedData && (now - lastFetchTime < CACHE_TTL)) {
      console.log('Serving from cache to prevent rate limits...');
      return res.json(cachedData);
    }
    
    // Look back 14 days
    const date = new Date();
    date.setDate(date.getDate() - 14);
    const dateString = date.toISOString().split('T')[0];
    
    // Updated query: Now explicitly hunting for AI Agents, Agent Skills, and LLMs
    const query = `"ai agent" OR "llm" OR "machine learning" created:>${dateString}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AI-News-Hacker-Dashboard' }
    });
    
    if (response.status === 403 || response.status === 429) {
      if (cachedData) {
        console.warn('Rate limited! Serving stale cache.');
        return res.json(cachedData); 
      }
      throw new Error('GitHub API Rate Limit exceeded (403). Try again in a minute.');
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error('Github response body:', errText);
      throw new Error(`GitHub API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const formattedData = data.items.slice(0, 30).map((repo, i) => ({
      id: repo.id,
      title: repo.full_name,
      source: "GitHub",
      time: new Date(repo.updated_at).toLocaleDateString(),
      tags: repo.topics && repo.topics.length > 0 ? repo.topics.slice(0, 3) : ['ai-agent'],
      upvotes: repo.stargazers_count,
      comments: repo.forks_count,
      desc: repo.description ? repo.description.substring(0, 120) + "..." : "No description provided.",
      gradient: "linear-gradient(135deg, #001a1a 0%, #003333 100%)",
      url: repo.html_url,
      delay: (i % 10) * 0.05
    }));
    
    cachedData = formattedData;
    lastFetchTime = now;
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching GitHub data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001; 
app.listen(PORT, () => {
  console.log(`[root@ai.news:~#] Backend server active on http://localhost:${PORT}`);
});
