/* Monitoring F7 v52 — helpers DOM centralisés.
   Objectif: fournir une façade stable aux anciens appels app.js tout en préparant une extraction progressive. */
(function(){
  'use strict';

  function byId(id){ return document.getElementById(id); }
  function qs(selector, root){ return (root || document).querySelector(selector); }
  function qsa(selector, root){ return Array.from((root || document).querySelectorAll(selector)); }
  function safeText(value){
    if(window.MonitoringSecurity && typeof window.MonitoringSecurity.safeText === 'function'){
      return window.MonitoringSecurity.safeText(value);
    }
    return String(value ?? '');
  }
  function escapeHTML(value){
    if(window.MonitoringSecurity && typeof window.MonitoringSecurity.escapeHTML === 'function'){
      return window.MonitoringSecurity.escapeHTML(value);
    }
    return safeText(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function escapeAttr(value){ return escapeHTML(value).replace(/`/g, '&#96;'); }
  function setText(el, value, className){
    if(!el) return;
    el.textContent = safeText(value);
    if(className) el.className = className;
  }
  function setHTML(el, html){
    if(!el) return;
    if(window.MonitoringSecurity && typeof window.MonitoringSecurity.safeSetHTML === 'function'){
      window.MonitoringSecurity.safeSetHTML(el, html);
      return;
    }
    el.innerHTML = escapeHTML(html);
  }
  function createElement(tagName, attrs = {}, children = []){
    if(window.MonitoringSecurity && typeof window.MonitoringSecurity.createSafeElement === 'function'){
      return window.MonitoringSecurity.createSafeElement(tagName, attrs, children);
    }
    const el = document.createElement(String(tagName || 'div'));
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if(key === 'className') el.className = safeText(value);
      else if(key === 'text') el.textContent = safeText(value);
      else if(key.startsWith('data-') || ['id','class','type','value','title','colspan','rowspan','aria-label','role'].includes(key)) el.setAttribute(key, safeText(value));
    });
    (Array.isArray(children) ? children : [children]).forEach(child => {
      if(child == null) return;
      el.appendChild(child instanceof Node ? child : document.createTextNode(safeText(child)));
    });
    return el;
  }
  function clear(el){ if(el) el.textContent = ''; }

  const api = Object.freeze({ byId, qs, qsa, safeText, escapeHTML, escapeAttr, setText, setHTML, createElement, clear });
  window.MonitoringDomUtils = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.dom = api;
})();
