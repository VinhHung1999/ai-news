// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

const GITHUB_REPO_REGEX = /github\.com\/([^/]+\/[^/]+)/;

export async function fetchContentFromUrl(url: string): Promise<{ title: string; content: string }> {
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
