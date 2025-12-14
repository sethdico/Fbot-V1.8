// Small Gemini/Generative Language REST wrapper (paste as-is)
const DEFAULT_MODEL = 'text-bison-001';
const DEFAULT_TIMEOUT_MS = 20000;
const MAX_RETRIES = 2;

let fetchImpl;
if (typeof globalThis.fetch === 'function') {
  fetchImpl = globalThis.fetch.bind(globalThis);
} else {
  try {
    fetchImpl = require('node-fetch');
  } catch (err) {
    throw new Error('No fetch available. Use Node 18+ or install node-fetch@2');
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildUrl(model, apiKey) {
  const m = model || DEFAULT_MODEL;
  return `https://generativelanguage.googleapis.com/v1beta2/models/${encodeURIComponent(m)}:generate?key=${encodeURIComponent(apiKey)}`;
}

async function doFetchWithTimeout(url, opts = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  if (controller) {
    opts.signal = controller.signal;
    setTimeout(() => controller.abort(), timeoutMs);
  }
  return fetchImpl(url, opts);
}

async function generate({ model, prompt, temperature = 0.3, maxOutputTokens = 512, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  apiKey = apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing Gemini/Google API key. Set GOOGLE_API_KEY or GEMINI_API_KEY.');

  if (!prompt || typeof prompt !== 'string') throw new Error('Prompt must be a non-empty string.');

  const url = buildUrl(model || DEFAULT_MODEL, apiKey);
  const body = {
    prompt: { text: prompt },
    temperature,
    maxOutputTokens,
  };

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await doFetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, timeoutMs);

      const contentType = res.headers && res.headers.get ? res.headers.get('content-type') : '';
      const data = contentType && contentType.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        lastErr = new Error((data && data.error && data.error.message) ? data.error.message : `HTTP ${res.status}`);
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          await sleep(200 * Math.pow(2, attempt));
          continue;
        }
        throw lastErr;
      }

      let reply = '';
      if (data) {
        if (Array.isArray(data.candidates) && data.candidates[0]) {
          const cand = data.candidates[0];
          reply = cand.output || cand.content || cand.text || (typeof cand === 'string' ? cand : '');
          if (!reply && cand.content) {
            if (Array.isArray(cand.content)) {
              reply = cand.content.map(c => (c && c.text) ? c.text : (typeof c === 'string' ? c : '')).join('\n');
            } else if (cand.content && typeof cand.content === 'object') {
              reply = cand.content.text || JSON.stringify(cand.content);
            }
          }
        }
        if (!reply && data.result) reply = String(data.result);
        if (!reply && data.output) reply = String(data.output);
      }

      if (!reply && typeof data === 'string') reply = data;
      return { ok: true, text: reply, raw: data };
    } catch (err) {
      lastErr = err;
      const isRetriable = err.name === 'AbortError' || err.code === 'ECONNRESET' || err.message && /network|timeout/i.test(err.message);
      if (isRetriable && attempt < MAX_RETRIES) {
        await sleep(200 * Math.pow(2, attempt));
        continue;
      }
      return { ok: false, error: err.message || String(err), raw: lastErr };
    }
  }

  return { ok: false, error: lastErr ? (lastErr.message || String(lastErr)) : 'Unknown error' };
}

module.exports = { generate };
