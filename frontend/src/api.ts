export const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3343'
  : window.location.hostname === 'dev-ai-news.hungphu.work'
    ? 'https://dev-api-ainews.hungphu.work'
    : '';

const API_KEY = 'f3626b5739823a2a8c33b60e72ed774403c23afc2953cfb36408713872e3bf26';

export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('X-API-Key', API_KEY);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
