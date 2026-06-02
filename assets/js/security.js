/* Monitoring F7 v66.22 — sécurité client, journalisation et alerte runtime critique uniquement. */
(function(){
  'use strict';

  const ALLOWED_HTML_TAGS = new Set(['B','STRONG','I','EM','U','BR','SPAN','DIV','P','SMALL','TABLE','THEAD','TBODY','TR','TH','TD','UL','OL','LI','BUTTON','INPUT','LABEL','SELECT','OPTION']);
  const ALLOWED_ATTRS = new Set(['class','id','type','value','title','colspan','rowspan','data-tab-target','data-overdue-handle','data-f7-treat','data-source','data-f7-edit','data-f7-preview-effectif','data-f7-load-effectif','data-f7-delete-effectif','checked','disabled','aria-label','role','style']);
  const EVENT_ATTR = /^on/i;
  const URL_ATTR = /^(href|src|xlink:href)$/i;

  function safeText(value){
    return String(value ?? '');
  }

  function escapeHTML(value){
    return safeText(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function sanitizeNode(node){
    if(!node) return;
    if(node.nodeType === Node.ELEMENT_NODE){
      if(!ALLOWED_HTML_TAGS.has(node.tagName)){
        node.replaceWith(document.createTextNode(node.textContent || ''));
        return;
      }
      [...node.attributes].forEach(attr => {
        const name = attr.name;
        const value = String(attr.value || '');
        if(EVENT_ATTR.test(name) || URL_ATTR.test(name) || !ALLOWED_ATTRS.has(name)){
          node.removeAttribute(name);
          return;
        }
        if(name === 'style' && /url\s*\(|expression\s*\(|javascript:/i.test(value)){
          node.removeAttribute(name);
        }
      });
    }
    [...node.childNodes].forEach(sanitizeNode);
  }

  function sanitizeHTML(html){
    const tpl = document.createElement('template');
    tpl.innerHTML = safeText(html);
    [...tpl.content.childNodes].forEach(sanitizeNode);
    return tpl.innerHTML;
  }

  function safeSetHTML(el, html){
    if(!el) return;
    el.innerHTML = sanitizeHTML(html);
  }

  function createSafeElement(tagName, attrs = {}, children = []){
    const el = document.createElement(String(tagName || 'div'));
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if(EVENT_ATTR.test(key) || URL_ATTR.test(key)) return;
      if(key === 'className') el.className = safeText(value);
      else if(key === 'text') el.textContent = safeText(value);
      else if(key.startsWith('data-')) el.setAttribute(key, safeText(value));
      else if(ALLOWED_ATTRS.has(key)) el.setAttribute(key, safeText(value));
    });
    (Array.isArray(children) ? children : [children]).forEach(child => {
      if(child == null) return;
      el.appendChild(child instanceof Node ? child : document.createTextNode(safeText(child)));
    });
    return el;
  }

  function confirmSensitiveAction(message, detail){
    return window.confirm([message, detail].filter(Boolean).join('\n\n'));
  }

  function logSecurity(type, detail, data){
    const payload = { version: window.MonitoringConfig?.version || 'v66.22', type, detail, at: new Date().toISOString(), data };
    console.warn('[Monitoring F7 sécurité]', payload);
    if(type === 'js-error' || type === 'promise-rejection') window.MonitoringAuditLog?.logError(type, detail, data || {});
    else window.MonitoringAuditLog?.logWarning(type, detail, data || {});
  }

  window.MonitoringSecurity = Object.freeze({ safeText, escapeHTML, sanitizeHTML, safeSetHTML, createSafeElement, confirmSensitiveAction, logSecurity });
  window.safeText = window.safeText || safeText;
  window.safeSetHTML = window.safeSetHTML || safeSetHTML;

  function shouldShowRuntimeWarning(event){
    const source = String(event?.filename || '');
    const message = String(event?.message || event?.reason?.message || event?.reason || '');
    // Production v66: l'utilisateur ne voit une alerte rouge que si l'erreur bloque réellement
    // l'authentification, le chargement applicatif, le stockage ou les modules critiques.
    if(!source && /SyntaxError|Unexpected token|Expected/.test(message)) return false;
    if(source && !source.includes(location.origin) && !source.startsWith(location.pathname) && !source.includes('/assets/')) return false;
    const critical = /auth|oidc|session|storage|indexeddb|database|api-client|render-main|app\.js|security/i.test(source + ' ' + message);
    return critical === true;
  }

  function markRuntimeWarning(event){
    if(!shouldShowRuntimeWarning(event)) return;
    document.body?.classList.add('monitoring-runtime-critical');
  }

  window.addEventListener('error', event => {
    logSecurity('js-error', event.message || 'Erreur JavaScript', { source: event.filename, line: event.lineno, col: event.colno });
    markRuntimeWarning(event);
  });

  window.addEventListener('unhandledrejection', event => {
    logSecurity('promise-rejection', event.reason?.message || String(event.reason || 'Promesse rejetée'));
    markRuntimeWarning(event);
  });

  document.addEventListener('DOMContentLoaded', () => {
    try {
      if(navigator.storage && navigator.storage.estimate){
        navigator.storage.estimate().then(estimate => {
          const quota = estimate.quota || 0;
          const usage = estimate.usage || 0;
          if(quota && usage / quota > 0.85){
            logSecurity('storage-quota', 'Quota stockage local proche de la limite', { usage, quota });
          }
        }).catch(()=>{});
      }
    } catch {}
  });
})();
