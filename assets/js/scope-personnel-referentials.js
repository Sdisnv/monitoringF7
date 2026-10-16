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
    { code: 'JSP', libelle: 'JSP', famille: 'JSP' },
    { code: 'Flm 1', libelle: 'Flamme 1', famille: 'JSP' },
    { code: 'Flm 2', libelle: 'Flamme 2', famille: 'JSP' },
    { code: 'Flm 3', libelle: 'Flamme 3', famille: 'JSP' }
  ]);

  const CIVIL_GRADES = Object.freeze([
    { code: 'Civ', libelle: 'Civil', famille: 'CIVIL' }
  ]);

  const GRADE_SEQUENCE = CIVIL_GRADES.concat(
    JSP_GRADES,
    SDIS_GRADES
  );
  const GRADES = Object.freeze(GRADE_SEQUENCE.map((row, index) => Object.freeze(Object.assign({}, row, { rang: index }))));
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
    'FOBA 1', 'FOBA 2', 'FOBA 3', 'PAPR', 'PABC', 'cond VL', 'cond PL', 'JSP'
  ]);

  // Institutional metadata in the existing reference component. Never creates a personal fact.
  const INSTITUTIONAL_GROUPS=Object.freeze(['Commandement et responsables','Encadrement','Personnel et spécialisations']);
  const INSTITUTIONAL_REFERENCES=Object.freeze([
    {"code":"CMDT:CDT","officialTitle":"Commandant","label":"Commandant","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":0,"domain":"F0","compatibleOiDomains":[],"aliases":["Cdt","CDT"],"source":"OS101§5.1/INDEX","newPublicChoice":false},
    {"code":"CMDT:REMPL-CDT","officialTitle":"Remplaçant du Commandant","label":"Rempl. Commandant","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":0,"domain":"F0","compatibleOiDomains":[],"aliases":["Remplaçant du Commandant"],"source":"OS101§5.1/INDEX","newPublicChoice":true},
    {"code":"CMDT:QM","officialTitle":"Quartier-maître F1/8","label":"Quartier-maître","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"F1/8","compatibleOiDomains":[],"aliases":["QM","Quartier-maître F1/8"],"source":"OS101§5.1/INDEX","newPublicChoice":false},
    {"code":"CMDT:C-OP","officialTitle":"Chef opérationnel F2/3","label":"Chef opérationnel","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"F2/3","compatibleOiDomains":[],"aliases":["C op","Chef OP","Chef opérationnel F2/3"],"source":"OS101§5.1/INDEX","newPublicChoice":false},
    {"code":"CMDT:C-LOG","officialTitle":"Chef logistique F4","label":"Chef logistique","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"F4","compatibleOiDomains":[],"aliases":["C log","Chef logistique F4"],"source":"OS101§5.1/INDEX","newPublicChoice":false},
    {"code":"CMDT:C-FOR","officialTitle":"Chef formation F7","label":"Chef formation","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"F7","compatibleOiDomains":[],"aliases":["C for","Chef formation F7"],"source":"OS101§5.1/INDEX","newPublicChoice":false},
    {"code":"F56:OF-INFO","officialTitle":"Officier information F5/6","label":"Officier information","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"F5/6","compatibleOiDomains":[],"aliases":["Officier information F5/6"],"source":"OS101§5.1/INDEX","newPublicChoice":true},
    {"code":"C site","officialTitle":"Chef de site DPS / Chef de site JSP","label":"Chef site","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"DPS/JSP","compatibleOiDomains":["DPS","JSP"],"aliases":["Chef de site DPS","Chef site DPS","Chef de site JSP","Chef site JSP","C site JSP"],"source":"OS101§5.1/INDEX/MOA","newPublicChoice":false},
    {"code":"C DAP","officialTitle":"Chef DAP","label":"Chef DAP","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"DAP","compatibleOiDomains":["DAP"],"aliases":["Chef DAP"],"source":"OS101§5.1/INDEX/MOA","newPublicChoice":false},
    {"code":"C JSP","officialTitle":"Chef JSP","label":"Chef JSP","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"JSP","compatibleOiDomains":["JSP"],"aliases":["Chef JSP"],"source":"INDEX/MOA","newPublicChoice":false},
    {"code":"C FOCA","officialTitle":"Chef formation des cadres","label":"Chef FOCA","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":20,"domain":"FOCA","compatibleOiDomains":[],"aliases":["Chef formation des cadres","Chef FOCA"],"source":"OS101§5.1/INDEX","newPublicChoice":true},
    {"code":"C FOBA","officialTitle":"Chef formation de base","label":"Chef FOBA","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":30,"domain":"FOBA","compatibleOiDomains":[],"aliases":["Chef FOBA","Chef formation de base"],"source":"OS101§5.1/INDEX/MOA","newPublicChoice":true},
    {"code":"PR:C-PR","officialTitle":"Chef protection respiratoire","label":"Chef PR","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":30,"domain":"PR","compatibleOiDomains":[],"aliases":["C PR","Chef PR","Chef protection respiratoire"],"source":"OS101§5.1/INDEX/MOA","newPublicChoice":false},
    {"code":"AUTO:OF-AUTO","officialTitle":"Officier automobile","label":"Officier auto","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":30,"domain":"AUTO","compatibleOiDomains":[],"aliases":["Of auto","Officier auto","Officier automobile"],"source":"OS101§5.1/INDEX/MOA","newPublicChoice":false},
    {"code":"C FOSPEC","officialTitle":"Chef formation des spécialistes","label":"Chef FOSPEC","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":30,"domain":"FOSPEC","compatibleOiDomains":[],"aliases":["Chef FOSPEC","Chef formation des spécialistes"],"source":"OS101§5.1/INDEX/MOA","newPublicChoice":true},
    {"code":"ENC:C-SECTION","officialTitle":"Chef de section DPS / DAP","label":"Chef section","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":10,"domain":"DPS/DAP","compatibleOiDomains":["DPS","DAP"],"aliases":["C scrt","C sct","C section","Chef section DPS","Chef section DAP","Chef de section DPS","Chef de section DAP","CMDT:CHEF-SECTION-DAP"],"source":"OS101§5.1/INDEX/MOA","newPublicChoice":false},
    {"code":"C audiovisuel","officialTitle":"Chef audiovisuel","label":"Chef audiovisuel","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":40,"domain":"F5/6","compatibleOiDomains":[],"aliases":["C audiovisuel"],"source":"OS101§5.1/INDEX","newPublicChoice":true},
    {"code":"C publication","officialTitle":"Chef publication","label":"Chef publication","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":40,"domain":"F5/6","compatibleOiDomains":[],"aliases":["C publication"],"source":"OS101§5.1/INDEX","newPublicChoice":true},
    {"code":"C IT","officialTitle":"Chef informatique","label":"Chef IT","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":40,"domain":"F5/6","compatibleOiDomains":[],"aliases":["Chef informatique","Chef IT"],"source":"OS101§5.1/INDEX","newPublicChoice":true},
    {"code":"C communication","officialTitle":"Chef communication","label":"Chef communication","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":40,"domain":"F5/6","compatibleOiDomains":[],"aliases":["Of communication","C communication"],"source":"OS101§5.1/INDEX","newPublicChoice":true},
    {"code":"ENC:RESP-MATERIEL","officialTitle":"Responsable matériel","label":"Resp matériel","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":40,"domain":"F4","compatibleOiDomains":[],"aliases":["Resp mat","Responsable matériel","Resp matériel"],"source":"OS101§5.1/INDEX","newPublicChoice":false},
    {"code":"F1:FOURRIER","officialTitle":"Fourrier","label":"Fourrier","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":40,"domain":"F1/8","compatibleOiDomains":[],"aliases":[],"source":"OS101§5.1/INDEX","newPublicChoice":true},
    {"code":"Resp APR","officialTitle":"Responsable APR","label":"Responsable APR","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"F4","compatibleOiDomains":[],"aliases":[],"source":"INDEX","newPublicChoice":true},
    {"code":"Resp ABC","officialTitle":"Responsable ABC","label":"Responsable ABC","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":[],"source":"INDEX","newPublicChoice":true},
    {"code":"Resp OFSI","officialTitle":"Responsable OFSI","label":"Responsable OFSI","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":[],"source":"INDEX","newPublicChoice":true},
    {"code":"Resp VPC","officialTitle":"Responsable VPC","label":"Responsable VPC","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":[],"source":"INDEX","newPublicChoice":true},
    {"code":"Resp mat JSP","retired":true,"officialTitle":"Resp matériel JSP","label":"Resp matériel JSP","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"JSP","compatibleOiDomains":["JSP"],"aliases":["Responsable matériel JSP"],"source":"INDEX","newPublicChoice":false},
    {"code":"Réf sanitaire","officialTitle":"Référent sanitaire","label":"Référent sanitaire","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":["Réf. Sanitaire"],"source":"INDEX","newPublicChoice":true},
    {"code":"Répondant sport","officialTitle":"Répondant sport","label":"Répondant sport","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":[],"source":"INDEX","newPublicChoice":true},
    {"code":"Resp Sports","officialTitle":"Responsable sports","label":"Responsable sports","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":[],"source":"INDEX","newPublicChoice":true},
    {"code":"ENC:REMPL-C-SITE","officialTitle":"Remplaçant chef de site DPS / JSP","label":"Rempl. chef site","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":10,"domain":"DPS/JSP","compatibleOiDomains":["DPS","JSP"],"aliases":["Remplaçant chef de site DPS","Remplaçant chef de site JSP"],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"ENC:REMPL-C-SECTION","officialTitle":"Remplaçant chef de section DPS / DAP","label":"Rempl. chef section","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":10,"domain":"DPS/DAP","compatibleOiDomains":["DPS","DAP"],"aliases":["Rempl chef de section DPS","Remplaçant chef de section DPS","Remplaçant chef de section DAP"],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"ENC:C-GROUPE","officialTitle":"Chef de groupe","label":"Chef groupe","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":30,"domain":"DPS/DAP","compatibleOiDomains":["DPS","DAP"],"aliases":["C groupe","Chef de groupe"],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"ENC:OSR","officialTitle":"OSR","label":"OSR","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":30,"domain":"DPS","compatibleOiDomains":["DPS"],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"ENC:CI-DPS","officialTitle":"Chef intervention DPS","label":"CI DPS","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":30,"domain":"DPS","compatibleOiDomains":["DPS"],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"ENC:CI-DAP","officialTitle":"Chef intervention DAP","label":"CI DAP","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":30,"domain":"DAP","compatibleOiDomains":["DAP"],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"FOBA:REMPL-CHEF","officialTitle":"Remplaçant chef FOBA","label":"Rempl. chef FOBA","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":30,"domain":"FOBA","compatibleOiDomains":[],"aliases":["Rempl. chef FOBA","Remplaçant chef FOBA"],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"ENC:CADRE-FOBA","officialTitle":"Cadre FOBA","label":"Cadre FOBA","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":50,"domain":"FOBA","compatibleOiDomains":[],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"JSP:CHEF-FORMATION","retired":true,"officialTitle":"Chef formation JSP","label":"Chef formation JSP","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":50,"domain":"JSP","compatibleOiDomains":["JSP"],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"Resp for JSP","officialTitle":"Responsable formation JSP","label":"Resp formation","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":40,"domain":"JSP","compatibleOiDomains":["JSP"],"aliases":["Resp. formation JSP","Responsable formation JSP","Resp formation JSP"],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"JSP:MONITEUR","officialTitle":"Moniteur JSP","label":"Moniteur JSP","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"JSP","compatibleOiDomains":["JSP"],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"JSP:AIDE-MONITEUR","officialTitle":"Aide-moniteur JSP","label":"Aide-moniteur JSP","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"JSP","compatibleOiDomains":["JSP"],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"PR:FORMATEUR-PR","officialTitle":"Formateur PR","label":"Formateur PR","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"PR","compatibleOiDomains":[],"aliases":["PR:FORMATEURS"],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"PR:FMF","officialTitle":"Formateur maison de feu","label":"Formateur maison de feu","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"PR","compatibleOiDomains":[],"aliases":["Formateur maison Feu (FMF)","Formateur maison de feu"],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"PR:CHEF-PISTE","officialTitle":"Chef de piste","label":"Chef de piste","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"PR","compatibleOiDomains":[],"aliases":["Chef piste"],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"PR:REMPL-CHEF","officialTitle":"Remplaçant chef PR","label":"Rempl. chef PR","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":30,"domain":"PR","compatibleOiDomains":[],"aliases":["Remplaçant chef PR"],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"AUTO:MONITEUR-CONDUITE","officialTitle":"Moniteur de conduite","label":"Moniteur conduite","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"AUTO","compatibleOiDomains":[],"aliases":["AUTO:MONITEURS","Moniteur de conduite"],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"AUTO:FORMATEUR-C1-118","officialTitle":"Formateur permis C1/118","label":"Formateur C1/118","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"AUTO","compatibleOiDomains":[],"aliases":["AUTO:FORM-C1","Formateur permis C1/118"],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"AUTO:FORM-EA","officialTitle":"Formateur EA","label":"Formateur EA","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"AUTO","compatibleOiDomains":[],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"AUTO:FORM-GRUTIER","officialTitle":"Formateur grutier","label":"Formateur grutier","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"AUTO","compatibleOiDomains":[],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":false},
    {"code":"FOSPEC:FORM-ANTICHUTE","officialTitle":"Formateur antichute","label":"Formateur antichute","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"FOSPEC","compatibleOiDomains":[],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"SAN:INSTR-BLS-AED","officialTitle":"Instructeur BLS/AED","label":"Instructeur BLS/AED","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"F7","compatibleOiDomains":[],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"ENC:INSTR-FEDERAL","officialTitle":"Instructeur fédéral","label":"Instructeur fédéral","abbreviation":null,"kind":"FUNCTION","group":"Encadrement","rank":60,"domain":"F7","compatibleOiDomains":[],"aliases":[],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"VPC:REMPL-RESP","officialTitle":"Remplaçant responsable VPC","label":"Rempl. responsable VPC","abbreviation":null,"kind":"FUNCTION","group":"Commandement et responsables","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":["Remplaçant responsable VPC"],"source":"OS101§5/INDEX/MOA","newPublicChoice":true},
    {"code":"PR:2","officialTitle":"Porteur d’appareil de protection respiratoire","label":"PAPR","abbreviation":"PAPR","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"PR","compatibleOiDomains":["DPS"],"aliases":["Porteur APR","PAPR","PR-PAPR"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"AUTO:3","officialTitle":"Conducteur véhicule léger","label":"cond VL","abbreviation":"cond VL","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS","DAP"],"aliases":["Conducteur véhicule léger","Cond VL","AUTO_VL_DPS","AUTO_VL_DAP","COND_VL","AUTO-COND-VL"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"AUTO:1","officialTitle":"Conducteur poids lourd","label":"cond PL","abbreviation":"cond PL","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS"],"aliases":["Conducteur poids-lourd","Cond PL","AUTO_PL","COND_PL","AUTO-COND-PL"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"AUTO:2","officialTitle":"Conducteur poids lourd TP 9000","label":"cond PL TP9","abbreviation":"cond PL TP9","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS:G1"],"aliases":["Conducteur poids-lourd Ydon 129","cond TP9","Cond TP9","Ydon 129","COND_TP9","AUTO-COND-TP9"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"AUTO:5","officialTitle":"Machiniste EA","label":"MEA","abbreviation":"MEA","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS:G1"],"aliases":["Machiniste EA","MEA","MACHINISTE_EA","AUTO-MEA"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"AUTO:6","officialTitle":"Pilote bateau","label":"pil bat","abbreviation":"pil bat","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS:G1"],"aliases":["Pilote bateau","Pilote BAT","PILOTE_BAT","AUTO-PILOTE-BAT"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"CARISTE","officialTitle":"Cariste","label":"cariste","abbreviation":"cariste","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS","DAP"],"aliases":["Cariste"],"source":"OS106§4.1","newPublicChoice":true},
    {"code":"AUTO:ELEVATEUR-TIMON","officialTitle":"Opérateur élévateur à timon","label":"OP élévateur à timon","abbreviation":"OP élévateur à timon","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS","DAP"],"aliases":["Élévateur à timon","Opérateur élévateur à timon"],"source":"OS106§4.1/MOA","newPublicChoice":true},
    {"code":"AUTO:PONTIER","officialTitle":"Pontier-élingueur","label":"pontier","abbreviation":"pontier","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS:B1"],"aliases":["Pontier-élingueur"],"source":"OS106§4.1","newPublicChoice":true},
    {"code":"AUTO:4","officialTitle":"Grutier","label":"grutier","abbreviation":"grutier","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS:G1"],"aliases":["Grutier","GRUTIER","AUTO-GRUTIER"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"FOSPEC:4","officialTitle":"Opérateur VPC","label":"op VPC","abbreviation":"op VPC","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"FOSPEC","compatibleOiDomains":["DPS:G1"],"aliases":["Opérateur Ydon 0","OP VPC","Ydon 0","OP_VPC","VPC","FOSPEC-VPC","FOSPEC-OP-VPC"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"FOSPEC:1","officialTitle":"Spécialiste antichute","label":"Spéc antichute","abbreviation":"Spéc antichute","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"FOSPEC","compatibleOiDomains":["DPS","DAP"],"aliases":["Spécialiste Antichute","Antichute","ANTICHUTE","FOSPEC-ANTICHUTE"],"source":"OS106§4.1/MOA","newPublicChoice":false},
    {"code":"PR:3","officialTitle":"Porteur ABC tenue lourde","label":"PABC","abbreviation":"PABC","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"FOSPEC","compatibleOiDomains":["DPS:G1"],"aliases":["Porteur ABC tenue lourde","PR-ABC","PR_ABC","PABC","PR-PABC"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"FOSPEC:2","officialTitle":"Spécialiste NAC","label":"NAC","abbreviation":"NAC","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"FOSPEC","compatibleOiDomains":["DPS"],"aliases":["NAC","FOSPEC-NAC"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"F2:REP-RENS","officialTitle":"Répondant renseignement","label":"rép rens","abbreviation":"rép rens","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F2","compatibleOiDomains":["DPS","DAP"],"aliases":["Répondant renseignement"],"source":"OS106§4.1","newPublicChoice":true},
    {"code":"ENC:PREPOSE-MATERIEL","officialTitle":"Préposé au matériel","label":"prép mat","abbreviation":"prép mat","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F4","compatibleOiDomains":["DPS"],"aliases":["Préposé au matériel","Préposé matériel"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"PR:PREPOSE-APR","officialTitle":"Préposé APR","label":"prép APR","abbreviation":"prép APR","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F4","compatibleOiDomains":["DPS"],"aliases":["Préposé APR"],"source":"OS106§4.1","newPublicChoice":false},
    {"code":"F56:SPEC-AV","officialTitle":"Spécialiste audiovisuel","label":"spéc AV","abbreviation":"spéc AV","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F5/6","compatibleOiDomains":["DPS","DAP"],"aliases":["Membre audiovisuel"],"source":"OS106§4.1","newPublicChoice":true},
    {"code":"F56:SPEC-PUB","officialTitle":"Spécialiste publication","label":"spéc pub","abbreviation":"spéc pub","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F5/6","compatibleOiDomains":["DPS","DAP"],"aliases":["Membre publication"],"source":"OS106§4.1","newPublicChoice":true},
    {"code":"F56:SPEC-IT","officialTitle":"Spécialiste IT","label":"spéc IT","abbreviation":"spéc IT","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F5/6","compatibleOiDomains":["DPS","DAP"],"aliases":["Membre IT"],"source":"OS106§4.1","newPublicChoice":true},
    {"code":"F56:SPEC-COM","officialTitle":"Spécialiste communication","label":"spéc com","abbreviation":"spéc com","kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F5/6","compatibleOiDomains":["DPS","DAP"],"aliases":["Membre communication"],"source":"OS106§4.1","newPublicChoice":true},
    {"code":"FOSPEC:3","officialTitle":"Personnel OFSI","label":"OFSI","abbreviation":null,"kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"FOSPEC","compatibleOiDomains":[],"aliases":["Personnel OFSI","OFSI","FOSPEC-OFSI"],"source":"INDEX","newPublicChoice":false},
    {"code":"PR:COBRA","officialTitle":"Porteur Cobra","label":"Porteur Cobra","abbreviation":null,"kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"PR","compatibleOiDomains":[],"aliases":["Porteur Cobra"],"source":"INDEX","newPublicChoice":true},
    {"code":"F4:PREPOSE-TUYAUX","officialTitle":"Préposé aux tuyaux","label":"Préposé aux tuyaux","abbreviation":null,"kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F4","compatibleOiDomains":[],"aliases":["Préposé aux tuyaux"],"source":"INDEX","newPublicChoice":true},
    {"code":"SAN:BLS-AED","officialTitle":"Certification BLS/AED","label":"Certification BLS/AED","abbreviation":null,"kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":["Certification BLS/AED"],"source":"INDEX","newPublicChoice":true},
    {"code":"SAN:IAS-1","officialTitle":"Secouriste IAS Niveau I","label":"Secouriste IAS Niveau I","abbreviation":null,"kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":["Secouriste IAS Niveau I"],"source":"INDEX","newPublicChoice":true},
    {"code":"SAN:IAS-2","officialTitle":"Secouriste IAS Niveau II","label":"Secouriste IAS Niveau II","abbreviation":null,"kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":["Secouriste IAS Niveau II"],"source":"INDEX","newPublicChoice":true},
    {"code":"SAN:IAS-3","officialTitle":"Secouriste IAS Niveau III","label":"Secouriste IAS Niveau III","abbreviation":null,"kind":"SPECIALIZATION","group":"Personnel et spécialisations","rank":50,"domain":"F7","compatibleOiDomains":[],"aliases":["Secouriste IAS Niveau III"],"source":"INDEX","newPublicChoice":true},
    {"code":"F1:PERMANENT","officialTitle":"Personnel permanent","label":"Personnel permanent","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":50,"domain":"F1","compatibleOiDomains":[],"aliases":["Personnel permanent"],"source":"INDEX","newPublicChoice":true},
    {"code":"ECH:0","officialTitle":"Échelon 0","label":"Échelon 0","abbreviation":null,"kind":"ECHELON","group":"Personnel et spécialisations","rank":0,"domain":"SDIS","compatibleOiDomains":["DPS","DAP","JSP"],"aliases":[],"source":"OS101§2.2","newPublicChoice":false},
    {"code":"ECH:I","officialTitle":"Échelon I","label":"Échelon I","abbreviation":null,"kind":"ECHELON","group":"Personnel et spécialisations","rank":0,"domain":"SDIS","compatibleOiDomains":["DPS","DAP","JSP"],"aliases":[],"source":"OS101§2.2","newPublicChoice":false},
    {"code":"ECH:II","officialTitle":"Échelon II","label":"Échelon II","abbreviation":null,"kind":"ECHELON","group":"Personnel et spécialisations","rank":0,"domain":"SDIS","compatibleOiDomains":["DPS","DAP","JSP"],"aliases":[],"source":"OS101§2.2","newPublicChoice":false},
    {"code":"ECH:III","officialTitle":"Échelon III","label":"Échelon III","abbreviation":null,"kind":"ECHELON","group":"Personnel et spécialisations","rank":0,"domain":"SDIS","compatibleOiDomains":["DPS","DAP","JSP"],"aliases":[],"source":"OS101§2.2","newPublicChoice":false},
    {"code":"ECH:IV","officialTitle":"Échelon IV","label":"Échelon IV","abbreviation":null,"kind":"ECHELON","group":"Personnel et spécialisations","rank":0,"domain":"SDIS","compatibleOiDomains":["DPS","DAP","JSP"],"aliases":[],"source":"OS101§2.2","newPublicChoice":false},
    {"code":"FOBA:1","officialTitle":"FOBA 1","label":"FOBA 1","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":10,"domain":"FOBA","compatibleOiDomains":[],"aliases":["FOBA-1"],"source":"MOA","oiRule":"NONE_DPS_DAP","newPublicChoice":false},
    {"code":"FOBA:2","officialTitle":"FOBA 2","label":"FOBA 2","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":10,"domain":"FOBA","compatibleOiDomains":["DPS","DAP"],"aliases":["FOBA-2"],"source":"MOA","newPublicChoice":false},
    {"code":"FOBA:3","officialTitle":"FOBA 3","label":"FOBA 3","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":10,"domain":"FOBA","compatibleOiDomains":["DPS"],"aliases":["FOBA-3"],"source":"MOA","newPublicChoice":false},
    {"code":"GEN:RECRUE","officialTitle":"Recrue","label":"Recrue","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":20,"domain":"SDIS","compatibleOiDomains":[],"aliases":[],"source":"INDEX","newPublicChoice":false},
    {"code":"GEN:SAPEUR","officialTitle":"Sapeur","label":"Sapeur","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":20,"domain":"SDIS","compatibleOiDomains":[],"aliases":[],"source":"INDEX","newPublicChoice":false},
    {"code":"GEN:SAPEUR-DPS","officialTitle":"Sapeur DPS","label":"Sapeur DPS","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":20,"domain":"SDIS","compatibleOiDomains":["DPS"],"aliases":[],"source":"INDEX","newPublicChoice":false},
    {"code":"GEN:SAPEUR-DAP","officialTitle":"Sapeur DAP","label":"Sapeur DAP","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":20,"domain":"SDIS","compatibleOiDomains":["DAP"],"aliases":[],"source":"INDEX","newPublicChoice":false},
    {"code":"JSP:1","officialTitle":"JSP","label":"JSP","abbreviation":null,"kind":"POPULATION","group":"Personnel et spécialisations","rank":20,"domain":"JSP","compatibleOiDomains":["JSP"],"aliases":[],"source":"INDEX","newPublicChoice":false},
    {"code":"CMDT:CODIR","officialTitle":"Membres du Codir","label":"Membres du Codir","abbreviation":null,"kind":"POPULATION","group":"Commandement et responsables","rank":-10,"domain":"F0","compatibleOiDomains":[],"aliases":[],"source":"SCOPE_EXISTING","newPublicChoice":false},
    {"code":"ENC:CAND-C-GROUPE","officialTitle":"Candidat Chef de groupe","label":"Candidat Chef groupe","abbreviation":null,"kind":"CANDIDATE","group":"Encadrement","rank":30,"domain":"DPS/DAP","compatibleOiDomains":["DPS","DAP"],"aliases":[],"source":"SCOPE_EXISTING/MOA","candidateOf":"ENC:C-GROUPE","newPublicChoice":false},
    {"code":"ENC:CAND-CI-DPS","officialTitle":"Candidat Chef intervention DPS","label":"Candidat CI DPS","abbreviation":null,"kind":"CANDIDATE","group":"Encadrement","rank":30,"domain":"DPS","compatibleOiDomains":["DPS","DAP"],"aliases":[],"source":"SCOPE_EXISTING/MOA","candidateOf":"ENC:CI-DPS","newPublicChoice":false},
    {"code":"ENC:CAND-CI-DAP","officialTitle":"Candidat Chef intervention DAP","label":"Candidat CI DAP","abbreviation":null,"kind":"CANDIDATE","group":"Encadrement","rank":30,"domain":"DAP","compatibleOiDomains":["DPS","DAP"],"aliases":[],"source":"SCOPE_EXISTING/MOA","candidateOf":"ENC:CI-DAP","newPublicChoice":false},
    {"code":"PR:CAND-PAPR","officialTitle":"Candidat Porteur d’appareil de protection respiratoire","label":"Candidat PAPR","abbreviation":null,"kind":"CANDIDATE","group":"Personnel et spécialisations","rank":50,"domain":"PR","compatibleOiDomains":["DPS"],"aliases":[],"source":"SCOPE_EXISTING/MOA","candidateOf":"PR:2","newPublicChoice":false},
    {"code":"AUTO:CAND-PL","officialTitle":"Candidat Conducteur poids lourd","label":"Candidat cond PL","abbreviation":null,"kind":"CANDIDATE","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS"],"aliases":[],"source":"SCOPE_EXISTING/MOA","candidateOf":"AUTO:1","newPublicChoice":false},
    {"code":"AUTO:CAND-TP9","officialTitle":"Candidat Conducteur poids lourd TP 9000","label":"Candidat cond PL TP9","abbreviation":null,"kind":"CANDIDATE","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS:G1"],"aliases":[],"source":"SCOPE_EXISTING/MOA","candidateOf":"AUTO:2","newPublicChoice":false},
    {"code":"AUTO:CAND-VL","officialTitle":"Candidat Conducteur véhicule léger","label":"Candidat cond VL","abbreviation":null,"kind":"CANDIDATE","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS","DAP"],"aliases":[],"source":"SCOPE_EXISTING/MOA","candidateOf":"AUTO:3","newPublicChoice":false},
    {"code":"AUTO:CAND-EA","officialTitle":"Candidat Machiniste EA","label":"Candidat MEA","abbreviation":null,"kind":"CANDIDATE","group":"Personnel et spécialisations","rank":50,"domain":"AUTO","compatibleOiDomains":["DPS:G1"],"aliases":[],"source":"SCOPE_EXISTING/MOA","candidateOf":"AUTO:5","newPublicChoice":false},
    {"code":"CMDT:SECRETAIRE-EM","officialTitle":"Secrétaire EM","label":"Secrétaire EM","abbreviation":null,"kind":"FUNCTION","group":"Personnel et spécialisations","rank":30,"domain":"F0","compatibleOiDomains":[],"aliases":[],"source":"INDEX1","newPublicChoice":true}
  ].map(row=>Object.freeze(row)));
  const INSTITUTIONAL_BY_ALIAS=new Map();
  for(const row of INSTITUTIONAL_REFERENCES) for(const value of [row.code,row.label,row.officialTitle,...row.aliases])
    if(!INSTITUTIONAL_BY_ALIAS.has(aliasKey(value))) INSTITUTIONAL_BY_ALIAS.set(aliasKey(value),row);
  function institutionalReference(value){return INSTITUTIONAL_BY_ALIAS.get(aliasKey(value)) || null;}
  function institutionalLabel(value){
    const reference=institutionalReference(value);
    if(reference) return reference.label;
    const raw=clean(value);
    const technical=/^(?:[A-Z0-9_-]+:[A-Z0-9_:-]+|[A-Z0-9]+(?:[_:-][A-Z0-9]+)+)$/.test(raw)
      || /^(?:[0-9a-f]{8}-[0-9a-f-]{27}|[0-9a-f]{32,64})$/i.test(raw);
    return technical?'Référence historique':raw;
  }
  function compareInstitutional(a,b){
    const left=institutionalReference(a),right=institutionalReference(b);
    const parent=row=>row?.candidateOf?institutionalReference(row.candidateOf):row;
    const la=parent(left),rb=parent(right);
    const rank=row=>row?[INSTITUTIONAL_GROUPS.indexOf(row.group),row.rank]:[2,999];
    const ar=rank(la),br=rank(rb);
    return ar[0]-br[0] || ar[1]-br[1] || FR.compare(la?.label || institutionalLabel(a),rb?.label || institutionalLabel(b))
      || Number(Boolean(left?.candidateOf))-Number(Boolean(right?.candidateOf)) || FR.compare(String(a),String(b));
  }
  function institutionalGroups(values){
    return INSTITUTIONAL_GROUPS.map(group=>({group,items:[...(values || [])].filter(value=>(institutionalReference(value)?.group || INSTITUTIONAL_GROUPS[2])===group)
      .sort(compareInstitutional)}));
  }
  function institutionalLabels(values){
    return [...new Set([...(values || [])].sort(compareInstitutional).map(institutionalLabel).filter(Boolean))];
  }
  const FOBA_POPULATIONS=Object.freeze([
    {level:'1',kind:'POPULATION',trainingYear:1,echelon:'0',incorporation:'NONE_DPS_DAP'},
    {level:'2',kind:'POPULATION',trainingYear:2,incorporation:'DPS_OR_DAP',operationalObligations:'BY_ASSIGNMENT'},
    {level:'3',kind:'POPULATION',trainingYear:3,incorporation:'DPS',exerciseCount:3,additionalPionnierOi:'DPS:G1'}
  ]);

  return {
    INSTITUTIONAL_GROUPS,INSTITUTIONAL_REFERENCES,FOBA_POPULATIONS,
    institutionalReference,institutionalLabel,compareInstitutional,institutionalGroups,institutionalLabels,
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
