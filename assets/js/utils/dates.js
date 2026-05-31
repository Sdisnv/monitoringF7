/* Monitoring F7 v52 — helpers dates centralisés. */
(function(){
  'use strict';
  function isoToday(){ return new Date().toISOString().slice(0,10); }
  function currentYear(){ return new Date().getFullYear(); }
  function yearOf(value){ return new Date(value).getFullYear(); }
  function quarterOf(value){ const m = new Date(value).getMonth() + 1; return m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : 4; }
  function semesterOf(value){ const m = new Date(value).getMonth() + 1; return m <= 6 ? 1 : 2; }
  function fmtDate(value){
    if(!value) return '—';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('fr-CH', { day:'2-digit', month:'2-digit', year:'numeric' });
  }
  function fmtDateInputValue(value){
    if(!value) return '';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  }
  function parseFlexibleDateToIso(value){
    const raw = String(value || '').trim();
    if(!raw) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const match = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/);
    if(match){
      let [, dd, mm, yy] = match;
      dd = dd.padStart(2,'0'); mm = mm.padStart(2,'0');
      if(yy.length === 2){ const yr = parseInt(yy, 10); yy = String(yr >= 70 ? 1900 + yr : 2000 + yr); }
      return `${yy}-${mm}-${dd}`;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0,10);
  }
  function autoFormatDateInput(rawValue){
    const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 8);
    if(digits.length <= 2) return digits;
    if(digits.length <= 4) return `${digits.slice(0,2)}.${digits.slice(2)}`;
    return `${digits.slice(0,2)}.${digits.slice(2,4)}.${digits.slice(4)}`;
  }
  const api = Object.freeze({ isoToday, currentYear, yearOf, quarterOf, semesterOf, fmtDate, fmtDateInputValue, parseFlexibleDateToIso, autoFormatDateInput });
  window.MonitoringDateUtils = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.dates = api;
})();
