const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Send a text query to the backend.
 * @param {string} text
 * @returns {Promise<object>}
 */
export async function sendQuery(text) {
  const res = await fetch(`${BACKEND_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to process query');
  }
  return res.json();
}

/**
 * Send an audio blob to the backend for voice processing.
 * @param {Blob} audioBlob
 * @returns {Promise<object>}
 */
export async function sendVoice(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const res = await fetch(`${BACKEND_URL}/voice`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to process voice');
  }
  return res.json();
}

/**
 * Fetch the 10 most recent queries.
 * @returns {Promise<Array>}
 */
export async function fetchRecent() {
  const res = await fetch(`${BACKEND_URL}/recent`);
  if (!res.ok) throw new Error('Failed to fetch recent queries');
  return res.json();
}

/**
 * Check backend health.
 * @returns {Promise<object>}
 */
export async function checkHealth() {
  const res = await fetch(`${BACKEND_URL}/health`);
  if (!res.ok) throw new Error('Backend unavailable');
  return res.json();
}
