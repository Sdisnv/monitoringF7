(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ScopeActivityLabel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clean(value) {
    return String(value == null ? '' : value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function splitActivityThemeLabel(value) {
    const label = clean(value);
    const separator = label.indexOf('|');
    if (separator < 0) return { activity: label, theme: null };
    const activity = clean(label.slice(0, separator));
    const theme = clean(label.slice(separator + 1));
    return { activity, theme: theme || null };
  }

  function formatActivityThemeLabel(activityOrLabel, theme) {
    const parsed = theme === undefined
      ? splitActivityThemeLabel(activityOrLabel)
      : { activity: clean(activityOrLabel), theme: clean(theme) || null };
    return parsed.theme ? `${parsed.activity} · ${parsed.theme}` : parsed.activity;
  }

  return { clean, splitActivityThemeLabel, formatActivityThemeLabel };
});
