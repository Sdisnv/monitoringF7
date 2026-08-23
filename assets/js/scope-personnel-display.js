/* SCOPE-AUTO-SPECIALISATIONS-PRIORITE-1
   Libellés métier centralisés + règle AUTO PL > VL DPS (effectif uniquement). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelDisplay = api;
  root.ScopePersonnelDisplay = api;
  root.ScopePersonnelDisplay = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SPECIALIZATION_SEPARATOR = ', ';
  const SPECIALIZATION_ORDER = Object.freeze(['FOBA 1', 'FOBA 2', 'FOBA 3', 'PAPR', 'cond VL', 'cond PL', 'JSP']);
  const SPECIALIZATION_DISPLAY_ORDER = SPECIALIZATION_ORDER;
  const SPECIALIZATION_CODE_LABELS = Object.freeze({
    FOBA_1: 'FOBA 1',
    FOBA_2: 'FOBA 2',
    FOBA_3: 'FOBA 3',
    PAPR: 'PAPR',
    PR: 'PAPR',
    AUTO_VL_DPS: 'cond VL',
    AUTO_VL_DAP: 'cond VL',
    AUTO_PL: 'cond PL',
    JSP: 'JSP'
  });
  const MSG_PL_PRIORITY = 'Priorité cond PL — cond PL déjà actif, hors effectif cond VL DPS';
  const MSG_PL_WITHOUT_DPS = 'Conducteur PL sans affectation DPS active';

  function clean(value){
    return String(value == null ? '' : value).trim();
  }

  function valuesEqual(a, b){
    return clean(a).toUpperCase() === clean(b).toUpperCase();
  }

  function assignmentParts(assignment){
    if(!assignment) return { domaine: '', cible: '' };
    if(typeof assignment === 'string'){
      const raw = clean(assignment).replace(/\//g, ' ').replace(/\s+/g, ' ');
      const compact = raw.toUpperCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_');
      if(SPECIALIZATION_CODE_LABELS[compact]){
        const mapped = compact === 'PR' ? 'PAPR' : compact;
        if(mapped.indexOf('FOBA_') === 0) return { domaine: 'FOBA', cible: mapped.slice(5) };
        if(mapped === 'PAPR') return { domaine: 'PR', cible: 'PR' };
        if(mapped === 'AUTO_VL_DPS') return { domaine: 'AUTO', cible: 'VL_DPS' };
        if(mapped === 'AUTO_VL_DAP') return { domaine: 'AUTO', cible: 'VL_DAP' };
        if(mapped === 'AUTO_PL') return { domaine: 'AUTO', cible: 'PL' };
        if(mapped === 'JSP') return { domaine: 'JSP', cible: '' };
      }
      const upper = raw.toUpperCase();
      if(upper === 'COND VL' || upper === 'COND VL — DPS' || upper === 'COND VL - DPS' || upper === 'COND VL DPS'){
        return { domaine: 'AUTO', cible: 'VL_DPS' };
      }
      if(upper === 'COND VL — DAP' || upper === 'COND VL - DAP' || upper === 'COND VL DAP'){
        return { domaine: 'AUTO', cible: 'VL_DAP' };
      }
      if(upper === 'COND PL') return { domaine: 'AUTO', cible: 'PL' };
      if(upper === 'PAPR' || upper === 'PR') return { domaine: 'PR', cible: 'PR' };
      const parts = raw.split(' ').filter(Boolean);
      return { domaine: parts[0] || '', cible: parts.slice(1).join(' ') };
    }
    return {
      domaine: clean(assignment.domaine || assignment.domaineCode || assignment.domaine_code || ''),
      cible: clean(assignment.cible || assignment.niveauCode || assignment.niveau_code || '')
    };
  }

  function normalizeAutoCible(cible){
    const raw = clean(cible).toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if(raw === 'VL DPS' || raw === 'COND VL DPS' || raw === 'AUTO VL DPS' || raw === 'VL_DPS') return 'VL_DPS';
    if(raw === 'VL DAP' || raw === 'COND VL DAP' || raw === 'AUTO VL DAP' || raw === 'VL_DAP') return 'VL_DAP';
    if(raw === 'PL' || raw === 'COND PL' || raw === 'AUTO PL' || raw === 'AUTO_PL') return 'PL';
    return clean(cible);
  }

  function normalizeFobaCible(cible){
    const match = String(cible || '').match(/([123])/);
    return match ? match[1] : clean(cible);
  }

  function specializationCode(assignment){
    const parts = assignmentParts(assignment);
    const domaine = parts.domaine.toUpperCase();
    if(domaine === 'PR' || domaine === 'PAPR') return 'PAPR';
    if(domaine === 'AUTO'){
      const cible = normalizeAutoCible(parts.cible);
      if(cible === 'VL_DPS') return 'AUTO_VL_DPS';
      if(cible === 'VL_DAP') return 'AUTO_VL_DAP';
      if(cible === 'PL') return 'AUTO_PL';
      return '';
    }
    if(domaine === 'FOBA'){
      const level = normalizeFobaCible(parts.cible);
      if(level === '1' || level === '2' || level === '3') return `FOBA_${level}`;
      return '';
    }
    const raw = typeof assignment === 'string' ? clean(assignment).toUpperCase().replace(/[\s-]+/g, '_') : '';
    if(SPECIALIZATION_CODE_LABELS[raw] && raw !== 'JSP') return raw === 'PR' ? 'PAPR' : raw;
    return '';
  }

  function specializationUserLabel(assignmentOrCode){
    if(assignmentOrCode == null || assignmentOrCode === '') return '';
    if(typeof assignmentOrCode === 'string' && SPECIALIZATION_CODE_LABELS[assignmentOrCode]){
      return SPECIALIZATION_CODE_LABELS[assignmentOrCode];
    }
    const code = specializationCode(assignmentOrCode);
    return code ? (SPECIALIZATION_CODE_LABELS[code] || '') : '';
  }

  function assignmentDateValue(assignment, keys){
    if(!assignment || typeof assignment === 'string') return '';
    for(let i = 0; i < keys.length; i += 1){
      if(assignment[keys[i]]) return clean(assignment[keys[i]]).slice(0, 10);
    }
    return '';
  }

  function isAssignmentActiveAt(assignment, date){
    if(!assignment) return false;
    const day = clean(date).slice(0, 10);
    const start = assignmentDateValue(assignment, ['date_actif', 'dateActif', 'date_debut', 'dateDebut']);
    const end = assignmentDateValue(assignment, ['date_inactif', 'dateInactif', 'date_fin', 'dateFin']);
    if(!day) return !end;
    if(start && start > day) return false;
    if(end && end < day) return false;
    return true;
  }

  function isAutoVlDps(assignment){ return specializationCode(assignment) === 'AUTO_VL_DPS'; }
  function isAutoVlDap(assignment){ return specializationCode(assignment) === 'AUTO_VL_DAP'; }
  function isAutoPl(assignment){ return specializationCode(assignment) === 'AUTO_PL'; }

  function isDpsOi(assignment){
    if(!assignment || typeof assignment === 'string') return assignmentParts(assignment).domaine.toUpperCase() === 'DPS';
    const domaine = assignmentParts(assignment).domaine.toUpperCase();
    if(domaine !== 'DPS') return false;
    const cat = String(assignment.categorie || assignment.category || 'OI').toUpperCase();
    return cat === 'OI' || cat === '';
  }

  function hasActiveAutoPl(assignments, date){
    return (assignments || []).some((row) => isAutoPl(row) && isAssignmentActiveAt(row, date));
  }

  function hasActiveAutoVlDps(assignments, date){
    return (assignments || []).some((row) => isAutoVlDps(row) && isAssignmentActiveAt(row, date));
  }

  function hasActiveAutoVlDap(assignments, date){
    return (assignments || []).some((row) => isAutoVlDap(row) && isAssignmentActiveAt(row, date));
  }

  function hasActiveDpsOi(assignments, date){
    return (assignments || []).some((row) => isDpsOi(row) && isAssignmentActiveAt(row, date));
  }

  function countsInVlDpsEffectif(assignments, date){
    return hasActiveAutoVlDps(assignments, date) && !hasActiveAutoPl(assignments, date);
  }

  function countsInPlEffectif(assignments, date){
    return hasActiveAutoPl(assignments, date) && hasActiveDpsOi(assignments, date);
  }

  function countsInVlDapEffectif(assignments, date){
    return hasActiveAutoVlDap(assignments, date);
  }

  function isEffectiveCondVlDps(assignments, date){
    return countsInVlDpsEffectif(assignments, date);
  }

  function vlDpsPriorityNote(assignments, date){
    if(hasActiveAutoVlDps(assignments, date) && hasActiveAutoPl(assignments, date)) return MSG_PL_PRIORITY;
    return '';
  }

  function evaluateAutoSpecializations(assignments, date, importCode){
    const hasPl = hasActiveAutoPl(assignments, date);
    const hasVlDps = hasActiveAutoVlDps(assignments, date);
    const hasDps = hasActiveDpsOi(assignments, date);
    const infos = [];
    const anomalies = [];
    if(hasPl && hasVlDps && importCode !== 'AUTO_VL_DAP'){
      infos.push(MSG_PL_PRIORITY);
    }
    if(hasPl && !hasDps){
      anomalies.push(MSG_PL_WITHOUT_DPS);
    }
    return {
      infos,
      anomalies,
      plPriorityForVlDps: hasPl && hasVlDps,
      plWithoutActiveDps: hasPl && !hasDps,
      countsInVlDpsEffectif: countsInVlDpsEffectif(assignments, date),
      countsInPlEffectif: countsInPlEffectif(assignments, date),
      countsInVlDapEffectif: countsInVlDapEffectif(assignments, date)
    };
  }

  function countsInImportPopulation(assignments, resolved, date){
    const code = resolved && resolved.code;
    if(code === 'AUTO_VL_DPS') return countsInVlDpsEffectif(assignments, date);
    if(code === 'AUTO_PL') return countsInPlEffectif(assignments, date);
    return true;
  }

  function sortSpecializationLabels(labels){
    return labels.slice().sort((a, b) => {
      const ia = SPECIALIZATION_ORDER.indexOf(a);
      const ib = SPECIALIZATION_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, 'fr');
    });
  }

  function formatSpecializations(list, options){
    const opts = options || {};
    const date = opts.date;
    const labels = [];
    const seen = new Set();
    (list || []).forEach((item) => {
      if(date && !isAssignmentActiveAt(item, date)) return;
      const label = specializationUserLabel(item);
      if(!label || seen.has(label)) return;
      seen.add(label);
      labels.push(label);
    });
    const ordered = sortSpecializationLabels(labels);
    const text = ordered.join(SPECIALIZATION_SEPARATOR);
    const note = opts.withPriorityNote === false ? '' : vlDpsPriorityNote(list, date);
    return { text, note, labels: ordered };
  }

  function compactAssignmentLabel(domaine, cible, extra){
    const spec = specializationUserLabel({ domaine, cible });
    if(spec) return [spec, clean(extra)].filter(Boolean).join(' ');
    const domain = clean(domaine);
    const target = clean(cible).replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
    const rest = clean(extra);
    let core = '';
    if(!domain && !target) core = '';
    else if(!target) core = domain;
    else if(!domain) core = target;
    else {
      const d = domain.toUpperCase();
      const t = target.toUpperCase();
      if(t === d) core = domain;
      else if(t.startsWith(`${d} `) || t.startsWith(`${d}/`)) core = target;
      else core = `${domain} ${target}`;
    }
    return [core, rest].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  function assignmentRoleSuffix(assignment){
    const role = assignment && (assignment.role_domaine || assignment.roleDomaine || '');
    if(role === 'SECONDAIRE') return 'secondaire';
    return '';
  }

  function formatAssignment(assignment){
    if(!assignment) return '';
    const spec = specializationUserLabel(assignment);
    if(spec) return spec;
    if(typeof assignment === 'string'){
      const parts = clean(assignment).replace(/\//g, ' ').split(/\s+/).filter(Boolean);
      if(parts.length >= 2) return compactAssignmentLabel(parts[0], parts.slice(1).join(' '));
      return clean(assignment);
    }
    const domaine = assignment.domaine || assignment.domaineCode || assignment.domaine_code || '';
    const cible = assignment.cible || assignment.niveauCode || assignment.niveau_code || '';
    const fromParts = compactAssignmentLabel(domaine, cible, assignmentRoleSuffix(assignment));
    if(fromParts) return fromParts;
    return compactAssignmentLabel('', assignment.label || '', assignmentRoleSuffix(assignment));
  }

  function formatOtherAffectations(list, options){
    const spec = formatSpecializations(list, options);
    const seen = new Set(spec.labels);
    const rest = [];
    (list || []).forEach((item) => {
      if(specializationUserLabel(item)) return;
      const label = formatAssignment(item);
      if(!label || seen.has(label)) return;
      seen.add(label);
      rest.push(label);
    });
    const text = [spec.text, rest.join(SPECIALIZATION_SEPARATOR)].filter(Boolean).join(SPECIALIZATION_SEPARATOR);
    return { text, note: spec.note, labels: spec.labels.concat(rest) };
  }

  function formatAssignmentList(list){
    return formatOtherAffectations(list, { withPriorityNote: false }).text;
  }

  function previewStatus(row){
    return String((row && (row.statut || row.status)) || '');
  }

  function hasAnomaly(row){
    if(!row) return false;
    if((row.errors || []).length) return true;
    if((row.warnings || []).length) return true;
    if((row.messages || []).length && previewStatus(row) === 'ERROR') return true;
    return false;
  }

  function needsUserDecision(row){
    const status = previewStatus(row);
    if(status === 'CONFLIT' || status === 'ERROR' || status === 'ERREUR') return true;
    if(status === 'ABSENT_DU_NOUVEL_IMPORT' || status === 'ABSENT_DU_FICHIER') return true;
    if(status === 'ARCHIVE_RETROUVE') return true;
    const decision = String((row && row.decision) || '').toUpperCase();
    return decision === 'EXAMINER';
  }

  function isStrictlyIdenticalPreviewRow(row){
    const status = previewStatus(row);
    if(status !== 'IDENTICAL' && status !== 'INCHANGE') return false;
    if(hasAnomaly(row) || needsUserDecision(row)) return false;
    if((row.infos || []).length) return false;
    return true;
  }

  function previewDetailRows(rows){
    return (rows || []).filter((row) => !isStrictlyIdenticalPreviewRow(row));
  }

  function previewRowKind(row){
    const status = previewStatus(row);
    if(status === 'ERROR' || status === 'ERREUR' || status === 'CONFLIT') return 'error';
    if((row.warnings || []).length) return 'anomaly';
    if(status === 'NEW_PERSON' || status === 'NEW_JSP' || status === 'NOUVEAU'
      || status === 'MODIFIED' || status === 'NEW_ASSIGNMENT'
      || status === 'ABSENT_DU_NOUVEL_IMPORT' || status === 'ABSENT_DU_FICHIER'
      || status === 'ARCHIVE_RETROUVE') return 'action';
    if((row.infos || []).length) return 'info';
    return 'identical';
  }

  function previewSourceRows(preview){
    return (preview && (preview.lines || preview.rows || (preview.lignes || []).concat(preview.absents || []))) || [];
  }

  function countPreviewKind(rows, kind){
    return previewDetailRows(rows).filter((row) => previewRowKind(row) === kind).length;
  }

  function importHasMutations(preview){
    if(preview && typeof preview.needsWrite === 'boolean') return preview.needsWrite;
    const counts = (preview && (preview.counts || preview.summary)) || {};
    return ['countNewPersons', 'countNewJsp', 'countModified', 'countNewAssignments', 'countErrors']
      .some((key) => Number(counts[key] || 0) > 0);
  }

  function importCanCommit(preview){
    if(!preview || preview.canCommit === false) return false;
    const rows = previewSourceRows(preview);
    if(countPreviewKind(rows, 'error') > 0) return false;
    if(importHasMutations(preview)) return true;
    return countPreviewKind(rows, 'action') > 0;
  }

  function importIsFullyIdentical(preview){
    const rows = previewSourceRows(preview);
    if(!rows.length) return false;
    return !importHasMutations(preview) && countPreviewKind(rows, 'action') === 0
      && countPreviewKind(rows, 'anomaly') === 0 && countPreviewKind(rows, 'error') === 0
      && countPreviewKind(rows, 'info') === 0;
  }

  function defaultImportFilter(preview){
    const rows = previewSourceRows(preview);
    if(countPreviewKind(rows, 'action') || countPreviewKind(rows, 'anomaly') || countPreviewKind(rows, 'error')){
      return 'CHANGEMENTS';
    }
    if(countPreviewKind(rows, 'info')) return 'INFOS';
    return 'CHANGEMENTS';
  }

  function filterPreviewRows(rows, filter){
    const detail = previewDetailRows(rows);
    const status = (row) => previewStatus(row);
    if(filter === 'TOUS') return detail;
    if(filter === 'INFOS') return detail.filter((row) => previewRowKind(row) === 'info');
    if(filter === 'NOUVEAU'){
      return detail.filter((row) => status(row) === 'NOUVEAU' || status(row) === 'NEW_PERSON' || status(row) === 'NEW_JSP');
    }
    if(filter === 'MODIFICATIONS'){
      return detail.filter((row) => status(row) === 'MODIFIED' || status(row) === 'NEW_ASSIGNMENT' || status(row) === 'CHANGEMENT_OI' || status(row) === 'CHANGEMENT_GRADE');
    }
    if(filter === 'ABSENT_DU_FICHIER'){
      return detail.filter((row) => status(row) === 'ABSENT_DU_FICHIER' || status(row) === 'ABSENT_DU_NOUVEL_IMPORT');
    }
    if(filter === 'ANOMALIES'){
      return detail.filter((row) => previewRowKind(row) === 'anomaly' || previewRowKind(row) === 'error');
    }
    if(filter === 'CONFLIT'){
      return detail.filter((row) => status(row) === 'CONFLIT' || status(row) === 'ERROR' || status(row) === 'ERREUR');
    }
    return detail.filter((row) => {
      const kind = previewRowKind(row);
      return kind === 'action' || kind === 'anomaly' || kind === 'error';
    });
  }

  function importFilterButtons(preview){
    const rows = previewSourceRows(preview);
    const detail = previewDetailRows(rows);
    const count = (fn) => detail.filter(fn).length;
    const status = (row) => previewStatus(row);
    const buttons = [
      { id: 'CHANGEMENTS', label: 'À traiter', count: count((row) => ['action', 'anomaly', 'error'].includes(previewRowKind(row))), always: true },
      { id: 'INFOS', label: 'Informations', count: count((row) => previewRowKind(row) === 'info') },
      { id: 'NOUVEAU', label: 'Nouveaux', count: count((row) => status(row) === 'NOUVEAU' || status(row) === 'NEW_PERSON' || status(row) === 'NEW_JSP') },
      { id: 'MODIFICATIONS', label: 'Modifications', count: count((row) => status(row) === 'MODIFIED' || status(row) === 'NEW_ASSIGNMENT') },
      { id: 'ABSENT_DU_FICHIER', label: 'Absents', count: count((row) => status(row) === 'ABSENT_DU_FICHIER' || status(row) === 'ABSENT_DU_NOUVEL_IMPORT') },
      { id: 'ANOMALIES', label: 'Anomalies', count: count((row) => previewRowKind(row) === 'anomaly' || previewRowKind(row) === 'error') },
      { id: 'TOUS', label: 'Tous', count: detail.length, always: true }
    ];
    return buttons.filter((item) => item.always || item.count > 0);
  }

  function situationLabel(row){
    const kind = previewRowKind(row);
    if(kind === 'error') return 'Erreur';
    if(kind === 'anomaly') return 'Anomalie';
    if(kind === 'info') return 'Information';
    if(kind === 'action'){
      const status = previewStatus(row);
      if(status === 'NEW_PERSON' || status === 'NEW_JSP' || status === 'NOUVEAU') return 'À traiter';
      if(status === 'ABSENT_DU_NOUVEL_IMPORT' || status === 'ABSENT_DU_FICHIER') return 'À traiter';
      return 'À traiter';
    }
    return row.statusLabel || 'Identique';
  }

  function situationPillClass(row){
    const kind = previewRowKind(row);
    if(kind === 'error') return 'err';
    if(kind === 'anomaly') return 'warn';
    if(kind === 'info') return 'info';
    if(kind === 'action') return 'action';
    return 'ok';
  }

  function previewModificationText(row){
    const parts = [];
    identityDiffFields(row).forEach((field) => {
      parts.push(`${field.label} ${field.current || '—'} → ${field.proposed || '—'}`);
    });
    const status = previewStatus(row);
    if(status === 'NEW_PERSON' || status === 'NEW_JSP' || status === 'NOUVEAU') parts.push('Nouvelle personne');
    if(status === 'NEW_ASSIGNMENT') parts.push('Nouvelle affectation');
    if(status === 'ABSENT_DU_NOUVEL_IMPORT' || status === 'ABSENT_DU_FICHIER') parts.push('Absente du nouvel import');
    if(status === 'MODIFIED' && !parts.length) parts.push('Identité ou affectation modifiée');
    (row.infos || []).forEach((msg) => { if(msg && !parts.includes(msg)) parts.push(msg); });
    (row.warnings || []).forEach((msg) => { if(msg && !parts.includes(msg)) parts.push(msg); });
    (row.errors || []).forEach((msg) => { if(msg && !parts.includes(msg)) parts.push(msg); });
    return parts.join(' · ') || row.statusLabel || situationLabel(row);
  }

  function importEmptyState(preview, filter, visibleCount){
    if(visibleCount) return null;
    if(importIsFullyIdentical(preview)){
      const counts = (preview && (preview.counts || preview.summary)) || {};
      const people = Number(counts.totalUniqueNips || counts.totalLines || 0);
      const existing = Number(counts.countExistingAssignments || counts.countIdentical || people);
      return {
        title: 'Aucune divergence détectée',
        text: `${people} personne${people > 1 ? 's' : ''} analysée${people > 1 ? 's' : ''} · ${existing} affectation${existing > 1 ? 's' : ''} déjà conforme${existing > 1 ? 's' : ''}. Aucune modification n’est nécessaire.`
      };
    }
    if(filter === 'CHANGEMENTS' && countPreviewKind(previewSourceRows(preview), 'info')){
      return {
        title: 'Aucune ligne à traiter',
        text: 'Des informations métier sont disponibles dans l’onglet Informations.'
      };
    }
    return { title: 'Aucune ligne dans ce filtre', text: 'Changez de filtre pour afficher d’autres lignes de la prévisualisation.' };
  }

  function identityDiffFields(row){
    const identity = (row && row.diff && row.diff.identity) || {};
    const person = (row && row.diff && row.diff.person) || {};
    const n = (row && row.normalized) || {};
    return [
      { key: 'grade', label: 'Grade' },
      { key: 'nom', label: 'Nom' },
      { key: 'prenom', label: 'Prénom' }
    ].map((field) => {
      const current = (identity[field.key] && identity[field.key].current)
        || (person[field.key] && person[field.key].before)
        || '';
      const proposed = (identity[field.key] && identity[field.key].proposed)
        || (person[field.key] && person[field.key].after)
        || n[field.key]
        || '';
      return {
        key: field.key,
        label: field.label,
        current: clean(current),
        proposed: clean(proposed),
        changed: !valuesEqual(current, proposed)
      };
    }).filter((field) => field.changed);
  }

  function formatIdentitySide(row, side){
    const status = previewStatus(row);
    const diffs = identityDiffFields(row);
    if(!diffs.length) return '—';
    if((status === 'NEW_PERSON' || status === 'NEW_JSP' || status === 'NOUVEAU') && side === 'current'){
      return '—';
    }
    return diffs.map((field) => {
      const value = side === 'current' ? field.current : field.proposed;
      return `${field.label} : ${value || '—'}`;
    }).join(' · ');
  }

  function assignmentSides(row){
    const diff = (row && row.diff) || {};
    const pop = diff.population || {};
    let current = '';
    let proposed = '';
    if(pop.oiSite && (pop.oiSite.current || pop.oiSite.proposed)){
      current = formatAssignment(pop.oiSite.current);
      proposed = formatAssignment(pop.oiSite.proposed);
    }
    if(pop.specialization && (pop.specialization.current || pop.specialization.proposed)){
      current = current || formatAssignment(pop.specialization.current);
      proposed = proposed || formatAssignment(pop.specialization.proposed);
    }
    if(!current && Array.isArray(diff.principalChanges) && diff.principalChanges.length){
      current = diff.principalChanges.map((change) => compactAssignmentLabel(change.domaine, change.before)).join(SPECIALIZATION_SEPARATOR);
    }
    if(!proposed && Array.isArray(diff.principalChanges) && diff.principalChanges.length){
      proposed = diff.principalChanges.map((change) => compactAssignmentLabel(change.domaine, change.after)).join(SPECIALIZATION_SEPARATOR);
    }
    if(!current){
      current = formatAssignmentList(diff.missingAssignments || [])
        || formatAssignmentList(diff.existingAssignments || []);
    }
    if(!proposed){
      proposed = formatAssignmentList(diff.newAssignments || [])
        || formatAssignmentList((row.normalized && row.normalized.assignments) || []);
    }
    current = current || '—';
    proposed = proposed || '—';
    if(valuesEqual(current, proposed)){
      return { current: '—', proposed: '—' };
    }
    return { current, proposed };
  }

  return {
    compactAssignmentLabel,
    compactAssignmentLabel: compactAssignmentLabel,
    formatAssignment,
    formatAssignment: formatAssignment,
    formatAssignmentList,
    formatAssignmentList: formatAssignmentList,
    formatSpecializations,
    formatOtherAffectations,
    specializationUserLabel,
    specializationUserLabel: specializationUserLabel,
    specializationCode,
    specializationCode: specializationCode,
    isAutoVlDps,
    isAutoVlDap,
    isAutoPl,
    hasActiveAutoPl,
    hasActiveAutoVlDps,
    hasActiveAutoVlDap,
    hasActiveDpsOi,
    countsInVlDpsEffectif,
    countsInPlEffectif,
    countsInVlDapEffectif,
    isEffectiveCondVlDps,
    vlDpsPriorityNote,
    evaluateAutoSpecializations,
    evaluateAutoSpecializations: evaluateAutoSpecializations,
    countsInImportPopulation,
    countsInImportPopulation: countsInImportPopulation,
    isAssignmentActiveAt,
    isAssignmentActiveAt: isAssignmentActiveAt,
    isAutoVlDps: isAutoVlDps,
    countsInVlDpsEffectif: countsInVlDpsEffectif,
    countsInImportPopulation: countsInImportPopulation,
    SPECIALIZATION_SEPARATOR,
    SPECIALIZATION_ORDER,
    SPECIALIZATION_DISPLAY_ORDER: SPECIALIZATION_ORDER,
    SPECIALIZATION_CODE_LABELS,
    MSG_PL_PRIORITY,
    MSG_PL_WITHOUT_DPS,
    isStrictlyIdenticalPreviewRow,
    previewDetailRows,
    previewRowKind,
    filterPreviewRows,
    filterPreviewRows: filterPreviewRows,
    importFilterButtons,
    importFilterButtons: importFilterButtons,
    importHasMutations,
    importCanCommit,
    importCanCommit: importCanCommit,
    importIsFullyIdentical,
    importIsFullyIdentical: importIsFullyIdentical,
    defaultImportFilter,
    defaultImportFilter: defaultImportFilter,
    situationPillClass,
    situationPillClass: situationPillClass,
    previewModificationText,
    previewModificationText: previewModificationText,
    importEmptyState,
    importEmptyState: importEmptyState,
    situationLabel,
    situationLabel: situationLabel,
    identityDiffFields,
    identityDiffFields: identityDiffFields,
    formatIdentitySide,
    formatIdentitySide: formatIdentitySide,
    assignmentSides,
    assignmentSides: assignmentSides
  };
});
