// Simple in-memory per-user conversation memory + rate limiter.

const DEFAULT_HISTORY = 3;
const COOLDOWN_MS = 3000; // 3 seconds
const MAX_PER_MINUTE = 20;

class AIMemory {
  constructor({ historyLimit = DEFAULT_HISTORY } = {}) {
    this.historyLimit = historyLimit;
    this.map = new Map();
    this.lastRequest = new Map();
    this.quotaWindow = new Map();
  }

  addMessage(senderId, role, text) {
    if (!senderId) return;
    const arr = this.map.get(senderId) || [];
    arr.push({ role: role || 'user', text: String(text || ''), ts: Date.now() });
    if (arr.length > this.historyLimit) arr.splice(0, arr.length - this.historyLimit);
    this.map.set(senderId, arr);
  }

  getRecent(senderId) {
    return (this.map.get(senderId) || []).slice();
  }

  clear(senderId) {
    if (!senderId) return;
    this.map.delete(senderId);
    this.lastRequest.delete(senderId);
    this.quotaWindow.delete(senderId);
  }

  allowRequest(senderId) {
    const now = Date.now();
    const last = this.lastRequest.get(senderId) || 0;
    if (now - last < COOLDOWN_MS) {
      return { ok: false, reason: 'cooldown', wait: COOLDOWN_MS - (now - last) };
    }

    const q = this.quotaWindow.get(senderId) || { count: 0, windowStart: now };
    if (now - q.windowStart > 60_000) {
      q.count = 0;
      q.windowStart = now;
    }
    if (q.count >= MAX_PER_MINUTE) {
      return { ok: false, reason: 'quota', wait: 60_000 - (now - q.windowStart) };
    }

    q.count += 1;
    this.quotaWindow.set(senderId, q);
    this.lastRequest.set(senderId, now);
    return { ok: true };
  }
}

module.exports = AIMemory;
