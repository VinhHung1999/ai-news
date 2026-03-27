import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchContentFromUrl } from './content-fetcher';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('fetchContentFromUrl - Defuddle integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse Defuddle response with YAML frontmatter', async () => {
    const defuddleResponse = `---
title: "Hello GPT-4o"
site: "openai.com"
source: "https://openai.com/index/hello-gpt-4o/"
domain: "openai.com"
language: "en-US"
word_count: 1739
---

## Hello GPT-4o

We're announcing GPT-4o, our new flagship model.`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(defuddleResponse),
    });

    const result = await fetchContentFromUrl('https://openai.com/index/hello-gpt-4o/');

    expect(result.title).toBe('Hello GPT-4o');
    expect(result.content).toContain('## Hello GPT-4o');
    expect(result.content).toContain('new flagship model');
    // Should not contain frontmatter
    expect(result.content).not.toContain('word_count');

    // Verify Defuddle URL was called (not Jina)
    expect(mockFetch).toHaveBeenCalledWith('https://defuddle.md/https://openai.com/index/hello-gpt-4o/');
  });

  it('should extract title without quotes from frontmatter', async () => {
    const defuddleResponse = `---
title: Example Domain
source: "https://example.com"
language: "en"
word_count: 17
---

This domain is for use in documentation examples.`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(defuddleResponse),
    });

    const result = await fetchContentFromUrl('https://example.com');

    expect(result.title).toBe('Example Domain');
    expect(result.content).toBe('This domain is for use in documentation examples.');
  });

  it('should fallback to hostname when no frontmatter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Just plain markdown content'),
    });

    const result = await fetchContentFromUrl('https://example.com/page');

    expect(result.title).toBe('example.com');
    expect(result.content).toBe('Just plain markdown content');
  });

  it('should throw on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchContentFromUrl('https://example.com'))
      .rejects.toThrow('Failed to fetch content from https://example.com');
  });

  it('should not call Defuddle for YouTube URLs', async () => {
    // YouTube oEmbed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        title: 'Test Video',
        author_name: 'Test Channel',
        thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
      }),
    });

    // Mock execFile for youtube transcript - will throw, that's fine
    const result = await fetchContentFromUrl('https://www.youtube.com/watch?v=abcdefghijk');

    // First call should be to YouTube oEmbed, not Defuddle
    expect(mockFetch.mock.calls[0][0]).toContain('youtube.com/oembed');
    expect(mockFetch.mock.calls[0][0]).not.toContain('defuddle.md');
  });

  it('should not call Defuddle for GitHub URLs', async () => {
    // GitHub repo info
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        full_name: 'owner/repo',
        description: 'A test repo',
      }),
    });
    // GitHub README
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('# Repo README'),
    });

    const result = await fetchContentFromUrl('https://github.com/owner/repo');

    expect(result.title).toBe('owner/repo');
    expect(mockFetch.mock.calls[0][0]).toContain('api.github.com');
    expect(mockFetch.mock.calls[0][0]).not.toContain('defuddle.md');
  });
});
