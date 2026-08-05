/**
 * api/index.js — Fetch wrappers for all Benkyo backend endpoints.
 *
 * Base URL resolution:
 *   - In dev: Vite proxies /api → http://localhost:8000, so BASE = '/api'
 *   - In prod: set VITE_API_URL env var to the deployed backend URL
 */

const BASE = import.meta.env.VITE_API_URL ?? '/api'
// Mirrors the backend's optional BENKYO_ACCESS_KEY demo-protection gate —
// unset by default (open access) for local dev.
const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY

function withAccessKey(headers) {
  return ACCESS_KEY ? { ...headers, 'X-Access-Key': ACCESS_KEY } : headers
}

async function request(method, path, body, isFormData = false) {
  const headers = withAccessKey(isFormData ? {} : { 'Content-Type': 'application/json' })
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Upload ──────────────────────────────────────────────────────
/**
 * Upload one or more files.
 * @param {File[]} files
 * @param {string} sessionId
 * @param {(pct: number) => void} onProgress  – called with 0–100
 */
export function uploadFiles(files, sessionId, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('session_id', sessionId)
    for (const f of files) form.append('files', f)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/upload`)
    if (ACCESS_KEY) xhr.setRequestHeader('X-Access-Key', ACCESS_KEY)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        const err = JSON.parse(xhr.responseText || '{}')
        reject(new Error(err.detail ?? err.error ?? `HTTP ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(form)
  })
}

// ─── Chat ────────────────────────────────────────────────────────
/**
 * @param {string} question
 * @param {string} sessionId
 * @param {{ role: string, content: string }[]} history
 * @param {number[]|null} documentIds
 */
export function ask(question, sessionId, history = [], documentIds = null) {
  return request('POST', '/ask', {
    question,
    session_id: sessionId,
    history,
    document_ids: documentIds,
  })
}

// ─── Quiz ────────────────────────────────────────────────────────
export function generateQuiz(sessionId, opts) {
  return request('POST', '/quiz/generate', { session_id: sessionId, ...opts })
}

export function submitQuiz(sessionId, results) {
  return request('POST', '/quiz/submit', { session_id: sessionId, results })
}

// ─── Flashcards ──────────────────────────────────────────────────
export function generateFlashcards(sessionId, opts) {
  return request('POST', '/flashcards/generate', { session_id: sessionId, ...opts })
}

// ─── Notes ───────────────────────────────────────────────────────
export function generateNotes(sessionId, opts) {
  return request('POST', '/notes/generate', { session_id: sessionId, ...opts })
}

export function summarizeNotes(sessionId, opts) {
  return request('POST', '/notes/summarize', { session_id: sessionId, ...opts })
}

// ─── Progress ────────────────────────────────────────────────────
export function getWeakTopics(sessionId) {
  return request('GET', `/progress/weak-topics?session_id=${sessionId}`)
}

export function getStats(sessionId) {
  return request('GET', `/progress/stats?session_id=${sessionId}`)
}

// ─── Session ─────────────────────────────────────────────────────
export function resetSession(sessionId) {
  return request('DELETE', `/session/${sessionId}`)
}
