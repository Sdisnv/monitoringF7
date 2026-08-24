/* SCOPE-PERSONNEL-TEMPORAL-UX-1 — référentiels Grades / OI / Spécialisations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopePersonnelReferentials = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SDIS_GRADES = Object.freeze([
    { code: 'Rec', libelle: 'Recrue', rang: 1, famille: 'SDIS' },
    { code: 'Sap', libelle: 'Sapeur', rang: 2, famille: 'SDIS' },
    { code: 'App', libelle: 'Appointé', rang: 3, famille: 'SDIS' },
    { code: 'Cpl', libelle: 'Caporal', rang: 4, famille: 'SDIS' },
    { code: 'Sgt', libelle: 'Sergent', rang: 5, famille: 'SDIS' },
    { code: 'Sgt instr', libelle: 'Sergent instructeur', rang: 6, famille: 'SDIS' },
    { code: 'Sgt chef', libelle: 'Sergent-chef', rang: 7, famille: 'SDIS' },
    { code: 'Sgt chef instr', libelle: 'Sergent-chef instructeur', rang: 8, famille: 'SDIS' },
    { code: 'Sgtm', libelle: 'Sergent-major', rang: 9, famille: 'SDIS' },
    { code: 'Four', libelle: 'Fourrier', rang: 10, famille: 'SDIS' },
    { code: 'Adj', libelle: 'Adjudant', rang: 11, famille: 'SDIS' },
    { code: 'Lt', libelle: 'Lieutenant', rang: 12, famille: 'SDIS' },
    { code: 'Lt instr', libelle: 'Lieutenant instructeur', rang: 13, famille: 'SDIS' },
    { code: 'Plt', libelle: 'Premier-lieutenant', rang: 14, famille: 'SDIS' },
    { code: 'Plt instr', libelle: 'Premier-lieutenant instructeur', rang: 15, famille: 'SDIS' },
    { code: 'Of spéc', libelle: 'Officier spécialiste', rang: 16, famille: 'SDIS' },
    { code: 'Cap', libelle: 'Capitaine', rang: 17, famille: 'SDIS' },
    { code: 'Cap instr', libelle: 'Capitaine instructeur', rang: 18, famille: 'SDIS' },
    { code: 'Cap adj', libelle: 'Capitaine adjudant', rang: 19, famille: 'SDIS' },
    { code: 'Maj', libelle: 'Major', rang: 20, famille: 'SDIS' },
    { code: 'Maj instr', libelle: 'Major instructeur', rang: 21, famille: 'SDIS' }
  ]);

  const JSP_GRADES = Object.freeze([
    { code: 'JSP', libelle: 'JSP', rang: 101, famille: 'JSP' },
    { code: 'Flm 1', libelle: 'Flamme 1', rang: 102, famille: 'JSP' },
    { code: 'Flm 2', libelle: 'Flamme 2', rang: 103, famille: 'JSP' },
    { code: 'Flm 3', libelle: 'Flamme 3', rang: 104, famille: 'JSP' }
  ]);

  const CIVIL_GRADES = Object.freeze([
    { code: 'Civ', libelle: 'Civil', rang: 201, famille: 'CIVIL' }
  ]);

  const GRADES = Object.freeze(SDIS_GRADES.concat(JSP_GRADES, CIVIL_GRADES));
  const GRADE_CODES_ASC = Object.freeze(GRADES.map((row) => row.code));
  const UNKNOWN_GRADE_BASE = 1000;
  const FR = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

  const GRADE_ALIASES = Object.freeze({
    'recrue': 'Rec', rec: 'Rec',
    'sapeur': 'Sap', sap: 'Sap',
    'appointe': 'App', 'appointé': 'App', app: 'App',
    'caporal': 'Cpl', cpl: 'Cpl',
    'sergent': 'Sgt', sgt: 'Sgt',
    'sergent instructeur': 'Sgt instr', 'sgt instr': 'Sgt instr',
    'sergent-chef': 'Sgt chef', 'sergent chef': 'Sgt chef', 'sgt-chef': 'Sgt chef', 'sgt chef': 'Sgt chef',
    'sergent-chef instructeur': 'Sgt chef instr', 'sgt chef instr': 'Sgt chef instr',
    'sergent-major': 'Sgtm', 'sergent major': 'Sgtm', sgtm: 'Sgtm',
    'fourrier': 'Four', four: 'Four',
    'adjudant': 'Adj', adj: 'Adj',
    'lieutenant': 'Lt', lt: 'Lt',
    'lieutenant instructeur': 'Lt instr', 'lt instr': 'Lt instr',
    'premier-lieutenant': 'Plt', 'premier lieutenant': 'Plt', '1er lt': 'Plt', plt: 'Plt',
    'premier-lieutenant instructeur': 'Plt instr', 'plt instr': 'Plt instr',
    'officier specialiste': 'Of spéc', 'officier spécialiste': 'Of spéc', 'of spec': 'Of spéc', 'of spéc': 'Of spéc',
    'capitaine': 'Cap', cap: 'Cap',
    'capitaine instructeur': 'Cap instr', 'cap instr': 'Cap instr',
    'capitaine adjudant': 'Cap adj', 'cap adj': 'Cap adj',
    'major': 'Maj', maj: 'Maj',
    'major instructeur': 'Maj instr', 'maj instr': 'Maj instr',
    'civil': 'Civ', civ: 'Civ',
    jsp: 'JSP',
    'flamme 1': 'Flm 1', 'flm 1': 'Flm 1',
    'flamme 2': 'Flm 2', 'flm 2': 'Flm 2',
    'flamme 3': 'Flm 3', 'flm 3': 'Flm 3'
  });

  function clean(value){
    return String(value == null ? '' : value).trim();
  }

  function aliasKey(value){
    return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function canonicalGradeCode(value){
    const raw = clean(value);
    if(!raw) return '';
    const hit = GRADES.find((row) => row.code === raw);
    if(hit) return hit.code;
    const mapped = GRADE_ALIASES[aliasKey(raw)];
    if(mapped) return mapped;
    const byLabel = GRADES.find((row) => aliasKey(row.libelle) === aliasKey(raw));
    return byLabel ? byLabel.code : raw;
  }

  function gradeRank(value){
    const code = canonicalGradeCode(value);
    const idx = GRADE_CODES_ASC.indexOf(code);
    if(idx >= 0) return idx;
    return UNKNOWN_GRADE_BASE + FR.compare(clean(value), ' ');
  }

  function compareGrades(a, b){
    const ra = gradeRank(a);
    const rb = gradeRank(b);
    if(ra !== rb) return ra - rb;
    return FR.compare(clean(a), clean(b));
  }

  const OPERATIONAL_OI_ORDER = Object.freeze([
    'DPS G1', 'DPS C1', 'DPS B1', 'DPS B2',
    'DAP Y1', 'DAP Y2', 'DAP Y3', 'DAP Y4',
    'JSP G1', 'JSP C1', 'JSP B1'
  ]);

  const SPECIALIZATION_ORDER = Object.freeze([
    'FOBA 1', 'FOBA 2', 'FOBA 3', 'PAPR', 'cond VL', 'cond PL', 'JSP'
  ]);

  return {
    SDIS_GRADES,
    JSP_GRADES,
    CIVIL_GRADES,
    GRADES,
    GRADE_CODES_ASC,
    GRADE_SORT_MODE: 'OFFICIAL_HIERARCHY',
    OPERATIONAL_OI_ORDER,
    SPECIALIZATION_ORDER,
    canonicalGradeCode,
    gradeRank,
    compareGrades
  };
});
