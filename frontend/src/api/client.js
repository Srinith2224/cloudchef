// One place for every request to the CloudChef API.
// In development the CRA proxy forwards /api to localhost:4000.
// In production set REACT_APP_API_URL if the API lives on another domain.
export const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

export const TOKEN_KEY = 'cloudchef.token';
export const USER_KEY = 'cloudchef.user';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * api('/recipes')                         -> GET
 * api('/ratings', { method: 'POST', body }) -> JSON body
 * api('/recipes', { method: 'POST', form })  -> multipart FormData
 */
export async function api(path, { method = 'GET', body, form, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, { method, headers, body: payload, signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError("Can't reach CloudChef. Check your internet connection.", 0);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      // Token expired or account removed: let the auth layer sign the user out
      window.dispatchEvent(new CustomEvent('cloudchef:unauthorized'));
    }
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, data);
  }
  return data;
}

/** Turns stored media paths into full URLs (Cloudinary URLs pass straight through). */
export const assetUrl = (url) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
};
