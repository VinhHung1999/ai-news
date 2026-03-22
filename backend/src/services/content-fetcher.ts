// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import path from 'path';
// Fetch YouTube transcript via Python youtube-transcript-api (server-side)
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

async function getYoutubeTranscript(videoId: string): Promise<{ ts: string; text: string }[]> {
  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'youtube-transcript.py');
  const { stdout } = await execFileAsync('python3', [scriptPath, videoId], { timeout: 15000 });
  const result = JSON.parse(stdout) as { success: boolean; transcript?: { ts: string; text: string }[]; error?: string };
  if (!result.success) throw new Error(result.error || 'Failed to fetch transcript');
  return result.transcript || [];
}

const GITHUB_REPO_REGEX = /github\.com\/([^/]+\/[^/]+)/;
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url);
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

export interface YouTubeInfo {
  title: string;
  author: string;
  thumbnail: string;
  videoId: string;
  transcript: string;
}

export async function fetchYouTubeInfo(url: string): Promise<YouTubeInfo> {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  // Fetch video info via oEmbed
  const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
  if (!oembedRes.ok) throw new Error(`YouTube oEmbed error: ${oembedRes.status}`);
  const oembed = await oembedRes.json() as { title: string; author_name: string; thumbnail_url: string };

  // Fetch transcript
  let transcript: string;
  try {
    const items = await getYoutubeTranscript(videoId);
    transcript = items.map(item => `[${item.ts}] ${item.text}`).join('\n');
  } catch (err) {
    transcript = 'Transcript not available for this video.';
  }

  return {
    title: oembed.title,
    author: oembed.author_name,
    thumbnail: oembed.thumbnail_url,
    videoId,
    transcript,
  };
}

export async function fetchContentFromUrl(url: string): Promise<{ title: string; content: string; thumbnail?: string }> {
  // YouTube: fetch transcript
  if (isYouTubeUrl(url)) {
    const info = await fetchYouTubeInfo(url);
    return {
      title: info.title,
      content: `**Channel:** ${info.author}\n\n## Transcript\n\n${info.transcript}`,
      thumbnail: info.thumbnail,
    };
  }

  // GitHub: fetch README
  const githubMatch = url.match(GITHUB_REPO_REGEX);
  if (githubMatch) {
    const repoName = githubMatch[1].replace(/\.git$/, '');
    // Get repo info for title
    const repoRes = await fetch(`https://api.github.com/repos/${repoName}`, {
      headers: { 'User-Agent': 'AI-News-Hacker-Dashboard' }
    });
    let title = repoName;
    let description = '';
    if (repoRes.ok) {
      const repo = await repoRes.json() as { full_name: string; description?: string };
      title = repo.full_name;
      description = repo.description || '';
    }

    // Get README
    const readmeRes = await fetch(`https://api.github.com/repos/${repoName}/readme`, {
      headers: { 'Accept': 'application/vnd.github.raw', 'User-Agent': 'AI-News-Hacker-Dashboard' }
    });
    if (!readmeRes.ok) throw new Error(`GitHub README not found for ${repoName}`);
    const content = await readmeRes.text();

    return { title, content: description ? `> ${description}\n\n${content}` : content };
  }

  // Other URLs: Jina Reader
  const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
    headers: { 'Accept': 'text/markdown', 'User-Agent': 'AI-News-Hacker-Dashboard' }
  });
  if (!jinaRes.ok) throw new Error(`Failed to fetch content from ${url}`);
  const markdown = await jinaRes.text();

  // Extract title from first heading or Jina title line
  const titleMatch = markdown.match(/^(?:Title:\s*(.+)|#\s+(.+))/m);
  const title = titleMatch?.[1] || titleMatch?.[2] || new URL(url).hostname;

  return { title, content: markdown };
}

export async function extractContentFromFile(buffer: Buffer, filename: string): Promise<{ title: string; content: string }> {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'pdf') {
    const data = await pdf(buffer);
    return { title: filename.replace(/\.pdf$/i, ''), content: data.text };
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return { title: filename.replace(/\.docx$/i, ''), content: result.value };
  }

  if (ext === 'md' || ext === 'txt') {
    const text = buffer.toString('utf-8');
    const titleMatch = text.match(/^#\s+(.+)/m);
    return { title: titleMatch?.[1] || filename, content: text };
  }

  throw new Error(`Unsupported file type: .${ext}. Supported: .pdf, .docx, .md, .txt`);
}
