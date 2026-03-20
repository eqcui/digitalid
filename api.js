/**
 * api.js
 * ------
 * All network calls to the backend in one place.
 * Replace API_BASE_URL with your actual server address.
 *
 * Every function throws an Error whose `.message` is a human-readable
 * string (taken from the server's { "error": "..." } response, or a
 * generic fallback). Callers can catch and display these directly.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

export const API_BASE_URL = 'http://192.168.0.6:3000/v1';

// How long (ms) before we consider a request timed out
const TIMEOUT_MS = 10_000;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Wraps fetch with:
 *   - automatic JSON serialisation / deserialisation
 *   - timeout via AbortController
 *   - unified error handling (throws on non-2xx)
 *
 * @param {string} path        – e.g. "/auth/pin"
 * @param {object} options     – fetch options (method, body, headers …)
 * @param {string|null} token  – Bearer token, or null for public endpoints
 */
async function request(path, options = {}, token = null) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw new Error('Network error. Check your connection and try again.');
  }

  clearTimeout(timeoutId);

  // Try to parse JSON regardless of status so we can read the error message
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const msg =
      data?.error ||
      data?.message ||
      `Server error ${response.status}. Please try again.`;
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Authenticate with a User ID and PIN.
 *
 * @param {string} userId - the UUID of the user
 * @param {string} pin – the user's 4-digit PIN
 * @returns {{ token: string, user: UserObject }}
 *
 * UserObject shape:
 * {
 *   id, firstName, lastName, dateOfBirth, address,
 *   email, phone, profilePhotoUrl, signaturePhotoUrl
 * }
 */
export async function loginWithPin(userId, pin) {
  return request('/auth/pin', {
    method: 'POST',
    body: JSON.stringify({ userId, pin }),
  });
}

/**
 * Invalidate the current session token server-side.
 *
 * @param {string} token
 */
export async function logout(token) {
  return request('/auth/logout', { method: 'POST' }, token);
}

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's profile.
 *
 * @param {string} token
 * @returns {UserObject}
 */
export async function fetchMe(token) {
  return request('/user/me', {}, token);
}

/**
 * Update the authenticated user's editable profile fields.
 *
 * @param {string} token
 * @param {{ email?, phone?, address? }} fields
 * @returns {UserObject}
 */
export async function updateMe(token, fields) {
  return request('/user/me', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  }, token);
}

// ─── Licences ─────────────────────────────────────────────────────────────────

/**
 * Fetch all licences for the authenticated user.
 *
 * @param {string} token
 * @returns {{ licences: LicenceObject[] }}
 *
 * LicenceObject shape:
 * {
 *   id, type, label, licenceNumber, cardNumber,
 *   expiry, expiryShort, licenceClass, conditions,
 *   status  // "active" | "suspended" | "expired"
 * }
 */
export async function fetchLicences(token) {
  return request('/user/me/licences', {}, token);
}

/**
 * Fetch a fresh, time-limited QR code URL for a specific licence.
 * QR codes expire ~5 min after issue to prevent screenshot replay.
 *
 * @param {string} token
 * @param {string} licenceId – the `id` field from the licence object
 * @returns {{ qrCodeUrl: string, expiresAt: string }}
 */
export async function fetchQRCode(token, licenceId) {
  return request(`/user/me/licences/${licenceId}/qr`, {}, token);
}

/**
 * Fetch the photo URLs associated with a specific licence.
 * Returns per-licence profile and signature photo URLs from the server.
 *
 * @param {string} token
 * @param {string} licenceId – the `id` field from the licence object
 * @returns {{ profilePhotoUrl: string|null, signaturePhotoUrl: string|null }}
 *
 * Falls back gracefully — callers should use user.profilePhotoUrl /
 * user.signaturePhotoUrl if this endpoint returns null values.
 */
export async function fetchLicencePhotos(token, licenceId) {
  return request(`/user/me/licences/${licenceId}/photos`, {}, token);
}