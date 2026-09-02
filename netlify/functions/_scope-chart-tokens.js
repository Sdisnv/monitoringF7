'use strict';
/** SCOPE-GRAPH-1 / REPORT-1 — tokens graphiques centralisés (écran + PDF). */

const CHART_TOKENS = Object.freeze({
  primary: '#171C8F',
  secondary: '#DE000A',
  neutral: '#54585A',
  warning: '#FFA300'
});

const TOKEN_BY_KEY = Object.freeze({
  officiel: 'primary',
  present: 'primary',
  prive: 'primary',
  excuse: 'warning',
  objectif: 'warning',
  permutation: 'warning',
  professionnel: 'warning',
  nonExcuse: 'secondary',
  sante: 'secondary',
  legacy: 'neutral',
  dispense: 'neutral',
  armee: 'neutral',
  nonPrecise: 'neutral'
});

const INSTITUTION = Object.freeze({
  red: '#DE000A',
  redDark: '#8c000b',
  anthracite: '#2c3038',
  ink: '#1f2730',
  muted: '#6b7785',
  line: '#e3e7ec'
});

function hexToRgb(hex){
  const h = String(hex || '').replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function colorOf(token){
  const key = TOKEN_BY_KEY[token] || token;
  return CHART_TOKENS[key] || CHART_TOKENS.primary;
}

module.exports = { CHART_TOKENS, TOKEN_BY_KEY, INSTITUTION, hexToRgb, colorOf };
