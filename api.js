/**
 * api.js
 * ------
 * Network calls routed through Tor (default) or regular fetch (clearnet build).
 * Controlled by the EXPO_PUBLIC_USE_TOR build-time environment variable.
 */

import { getTor } from './tor';

export const USE_TOR = process.env.EXPO_PUBLIC_USE_TOR !== 'false';

export const API_BASE_URL = USE_TOR
  ? 'http://4uajlgcjw75mfnxuniv2zrgxj3wpiloeilaxuvgx7z4mcxsnowkp5yqd.onion'
  : (process.env.EXPO_PUBLIC_CLEARNET_API_URL || '');

// ─── Internal request helper ──────────────────────────────────────────────────

async function request(path, options = {}, token = null) {
  const url    = `${API_BASE_URL}/v1${path}`;
  const method = (options.method || 'GET').toUpperCase();
  const body   = options.body   || '';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (USE_TOR) {
    const tor = getTor();
    if (!tor) {
      throw new Error('Network error. Tor is not initialized yet. Please wait and try again.');
    }

    let response;
    try {
      if (method === 'GET') {
        response = await tor.get(url, headers, true);
      } else if (method === 'POST') {
        response = await tor.post(url, body, headers, true);
      } else {
        // PATCH, PUT, DELETE
        response = await tor.request(url, method, body, headers);
      }
    } catch (err) {
      const detail = err?.message || err?.toString() || 'unknown';
      console.warn('[api] request failed:', method, path, detail);
      throw new Error(`Network error: ${detail}`);
    }

    // response.json may arrive as a string or already parsed object
    const data = typeof response.json === 'string'
      ? JSON.parse(response.json)
      : response.json;

    if (response.respCode >= 400) {
      const msg  = data?.error || data?.message || `Server error ${response.respCode}.`;
      const err  = new Error(msg);
      err.status = response.respCode;
      throw err;
    }

    return data;
  } else {
    // Clearnet: use regular fetch
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        ...(body ? { body } : {}),
      });
    } catch (err) {
      const detail = err?.message || err?.toString() || 'unknown';
      console.warn('[api] request failed:', method, path, detail);
      throw new Error(`Network error: ${detail}`);
    }

    const data = await res.json();

    if (!res.ok) {
      const msg  = data?.error || data?.message || `Server error ${res.status}.`;
      const err  = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return data;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginWithPin(userId, pin) {
  return request('/auth/pin', {
    method: 'POST',
    body:   JSON.stringify({ userId, pin }),
  });
}

export async function logout(token) {
  return request('/auth/logout', { method: 'POST' }, token);
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function fetchMe(token) {
  return request('/user/me', {}, token);
}

export async function updateMe(token, fields) {
  return request('/user/me', {
    method: 'PATCH',
    body:   JSON.stringify(fields),
  }, token);
}

// ─── Licences ─────────────────────────────────────────────────────────────────

export async function fetchLicences(token) {
  return request('/user/me/licences', {}, token);
}

export async function fetchQRCode(token, licenceId) {
  return request(`/user/me/licences/${licenceId}/qr`, {}, token);
}

export async function fetchLicencePhotos(token, licenceId) {
  return request(`/user/me/licences/${licenceId}/photos`, {}, token);
}

export async function fetchPhotoAsDataUri(photoUrl) {
  if (USE_TOR) {
    const tor = getTor();
    if (!tor) throw new Error('Tor not initialized');
    const response = await tor.get(photoUrl, {}, true);
    if (response.respCode >= 400) throw new Error(`Photo fetch failed: ${response.respCode}`);
    return `data:${response.mimeType};base64,${response.b64Data}`;
  } else {
    const res = await fetch(photoUrl);
    if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
