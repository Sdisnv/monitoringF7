/* SCOPE-AUTH-IDLE-1 — inactivité réelle 10 min, refresh cookie uniquement si nécessaire. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeAuthIdle = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const AUTH_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
  const AUTH_IDLE_WARN_MS = 9 * 60 * 1000;
  const AUTH_REFRESH_MIN_INTERVAL_MS = 8 * 60 * 1000;
  const AUTH_IDLE_STORAGE_KEY = 'scope_auth_idle_last_activity';
  const AUTH_IDLE_CHANNEL = 'scope-auth-idle';
  const HUMAN_EVENT_TYPES = Object.freeze([
    'click', 'pointerdown', 'keydown', 'keyup', 'change', 'input', 'submit', 'select'
  ]);
  const HUMAN_EVENT_SET = new Set(HUMAN_EVENT_TYPES);

  function isHumanActivityEvent(event) {
    const type = String((event && event.type) || event || '').toLowerCase();
    if (HUMAN_EVENT_SET.has(type)) return true;
    return false;
  }

  function isSystemActivity(kind) {
    const key = String(kind || '').toLowerCase();
    return key === 'polling' || key === 'refresh' || key === 'timer' || key === 'network' || key === 'fetch' || key === 'animation';
  }

  function createIdleController(options) {
    const opts = options || {};
    let nowFn = opts.now || function () { return Date.now(); };
    const timeoutMs = Number(opts.timeoutMs || AUTH_IDLE_TIMEOUT_MS);
    const warnMs = Number(opts.warnMs || AUTH_IDLE_WARN_MS);
    const refreshMinMs = Number(opts.refreshMinIntervalMs || AUTH_REFRESH_MIN_INTERVAL_MS);
    const storage = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const storageKey = opts.storageKey || AUTH_IDLE_STORAGE_KEY;
    let lastActivityAt = nowFn();
    let lastRefreshAt = 0;
    let warnShown = false;
    let expired = false;
    let tickTimer = null;
    let refreshInflight = null;
    let channel = null;
    const listeners = [];

    function persist(ts) {
      if (!storage) return;
      try { storage.setItem(storageKey, String(ts)); } catch (_err) { /* ignore */ }
    }

    function readShared() {
      if (!storage) return lastActivityAt;
      try {
        const raw = Number(storage.getItem(storageKey) || 0);
        return raw > 0 ? raw : lastActivityAt;
      } catch (_err) {
        return lastActivityAt;
      }
    }

    function broadcast(ts) {
      persist(ts);
      if (channel) {
        try { channel.postMessage({ type: 'activity', at: ts }); } catch (_err) { /* ignore */ }
      }
    }

    function recordActivity(source) {
      if (isSystemActivity(source)) return lastActivityAt;
      lastActivityAt = nowFn();
      warnShown = false;
      broadcast(lastActivityAt);
      return lastActivityAt;
    }

    function recordHumanEvent(event) {
      if (!isHumanActivityEvent(event)) return lastActivityAt;
      return recordActivity('human');
    }

    function idleMs() {
      lastActivityAt = Math.max(lastActivityAt, readShared());
      return nowFn() - lastActivityAt;
    }

    function shouldWarn() {
      const idle = idleMs();
      return idle >= warnMs && idle < timeoutMs && !expired;
    }

    function shouldExpire() {
      return idleMs() >= timeoutMs && !expired;
    }

    function shouldRefresh() {
      if (expired) return false;
      if (idleMs() >= timeoutMs) return false;
      return (nowFn() - lastRefreshAt) >= refreshMinMs;
    }

    function markRefreshed() {
      lastRefreshAt = nowFn();
    }

    function resetOnLogin() {
      expired = false;
      warnShown = false;
      lastActivityAt = nowFn();
      lastRefreshAt = lastActivityAt;
      broadcast(lastActivityAt);
      return lastActivityAt;
    }

    async function refreshSession() {
      if (refreshInflight) return refreshInflight;
      const fn = opts.refreshSession;
      if (typeof fn !== 'function') return false;
      refreshInflight = Promise.resolve()
        .then(fn)
        .then((ok) => {
          if (ok) markRefreshed();
          return Boolean(ok);
        })
        .finally(() => { refreshInflight = null; });
      return refreshInflight;
    }

    function tick() {
      lastActivityAt = Math.max(lastActivityAt, readShared());
      if (shouldExpire()) {
        expired = true;
        if (typeof opts.onExpire === 'function') opts.onExpire();
        return 'expire';
      }
      if (shouldWarn() && !warnShown) {
        warnShown = true;
        if (typeof opts.onWarn === 'function') opts.onWarn();
        return 'warn';
      }
      if (shouldRefresh() && typeof opts.refreshSession === 'function') {
        refreshSession();
        return 'refresh';
      }
      return 'ok';
    }

    function stayConnected() {
      warnShown = false;
      expired = false;
      recordActivity('cta');
    }

    function start() {
      resetOnLogin();
      if (typeof BroadcastChannel === 'function' && !opts.disableChannel) {
        try {
          channel = new BroadcastChannel(AUTH_IDLE_CHANNEL);
          channel.onmessage = (msg) => {
            const at = Number(msg && msg.data && msg.data.at);
            if (at > lastActivityAt) lastActivityAt = at;
          };
        } catch (_err) { channel = null; }
      }
      const onStorage = (event) => {
        if (!event || event.key !== storageKey) return;
        const at = Number(event.newValue || 0);
        if (at > lastActivityAt) lastActivityAt = at;
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', onStorage);
        listeners.push(() => window.removeEventListener('storage', onStorage));
        HUMAN_EVENT_TYPES.forEach((type) => {
          const handler = (event) => recordHumanEvent(event);
          document.addEventListener(type, handler, true);
          listeners.push(() => document.removeEventListener(type, handler, true));
        });
      }
      const interval = Number(opts.tickMs || 15000);
      tickTimer = setInterval(tick, interval);
      listeners.push(() => { if (tickTimer) clearInterval(tickTimer); tickTimer = null; });
      return true;
    }

    function stop() {
      listeners.splice(0).forEach((fn) => { try { fn(); } catch (_err) { /* ignore */ } });
      if (channel) {
        try { channel.close(); } catch (_err) { /* ignore */ }
        channel = null;
      }
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = null;
    }

    return {
      AUTH_IDLE_TIMEOUT_MS: timeoutMs,
      AUTH_IDLE_WARN_MS: warnMs,
      recordActivity,
      recordHumanEvent,
      idleMs,
      shouldWarn,
      shouldExpire,
      shouldRefresh,
      markRefreshed,
      resetOnLogin,
      refreshSession,
      stayConnected,
      tick,
      start,
      stop,
      getLastActivityAt() { return lastActivityAt; }
    };
  }

  async function defaultRefreshSession() {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    return response.ok;
  }

  let activeController = null;
  let refreshInflight = null;

  async function refreshSession() {
    if (refreshInflight) return refreshInflight;
    const fn = (activeController && activeController.refreshSession) || defaultRefreshSession;
    refreshInflight = Promise.resolve(fn()).then((ok) => Boolean(ok)).finally(() => { refreshInflight = null; });
    return refreshInflight;
  }

  async function withAuthRetry(run, alreadyRetried) {
    const response = await run();
    if (!response || response.status !== 401 || alreadyRetried) return response;
    const refreshed = await refreshSession();
    if (!refreshed) return response;
    return run();
  }

  function idleLogoutHref() {
    return '/auth/logout?returnTo=' + encodeURIComponent('/scope.html?idle=1');
  }

  function start(options) {
    stop();
    activeController = createIdleController(Object.assign({
      refreshSession: defaultRefreshSession
    }, options || {}));
    activeController.start();
    return activeController;
  }

  function stop() {
    if (activeController) activeController.stop();
    activeController = null;
  }

  function isStarted() {
    return Boolean(activeController);
  }

  function redirectToLogout() {
    stop();
    if (typeof location !== 'undefined' && location.href) {
      location.href = idleLogoutHref();
    }
  }

  return {
    AUTH_IDLE_TIMEOUT_MS,
    AUTH_IDLE_WARN_MS,
    AUTH_REFRESH_MIN_INTERVAL_MS,
    AUTH_IDLE_STORAGE_KEY,
    AUTH_IDLE_CHANNEL,
    HUMAN_EVENT_TYPES,
    isHumanActivityEvent,
    isSystemActivity,
    createIdleController,
    withAuthRetry,
    refreshSession,
    idleLogoutHref,
    redirectToLogout,
    isStarted,
    start,
    stop,
    stayConnected() { if (activeController) activeController.stayConnected(); },
    recordActivity(source) { if (activeController) activeController.recordActivity(source); }
  };
});
