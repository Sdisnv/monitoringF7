'use strict';

const OFFICIAL_LIEUX = Object.freeze([
  { code: 'G1-CASERNE', nomCourt: 'Caserne G1', adresseLigne1: 'Arsenal 8', npa: '', localite: 'Yverdon-les-Bains', oiCode: 'G1', kind: 'CASERNE' },
  { code: 'C1-CASERNE', nomCourt: 'Caserne C1', adresseLigne1: 'Chemin du Borné-nau', npa: '', localite: 'Grandson', oiCode: 'C1', kind: 'CASERNE' },
  { code: 'B1-CASERNE', nomCourt: 'Caserne B1', adresseLigne1: 'Petite-Amérique 2', npa: '', localite: 'Yvonand', oiCode: 'B1', kind: 'CASERNE' },
  { code: 'B2-CASERNE', nomCourt: 'Caserne B2', adresseLigne1: 'En Chenaux', npa: '', localite: 'Concise', oiCode: 'B2', kind: 'CASERNE' },
  { code: 'Y1-LOCAL', nomCourt: 'Local Y1', adresseLigne1: 'Chemin du Grassis 1', npa: '', localite: 'Chavannes-le-Chêne', oiCode: 'Y1', kind: 'LOCAL' },
  { code: 'Y2-LOCAL', nomCourt: 'Local Y2', adresseLigne1: 'Chemin des Pâquis 4', npa: '', localite: 'Belmont-sur-Yverdon', oiCode: 'Y2', kind: 'LOCAL' },
  { code: 'Y3-LOCAL', nomCourt: 'Local Y3', adresseLigne1: "Grand'rue 1", npa: '', localite: 'Montagny-près-Yverdon', oiCode: 'Y3', kind: 'LOCAL' },
  { code: 'Y4-LOCAL', nomCourt: 'Local Y4', adresseLigne1: 'Route de la Cour 2', npa: '', localite: 'Bonvillars', oiCode: 'Y4', kind: 'LOCAL' }
]);

const THEORY_ROOMS = Object.freeze([
  { code: 'G1-VULCAIN', libelle: 'Vulcain', lieuCode: 'G1-CASERNE', parentCode: null },
  { code: 'G1-JURA', libelle: 'Jura', lieuCode: 'G1-CASERNE', parentCode: 'G1-VULCAIN' },
  { code: 'G1-ALPES', libelle: 'Alpes', lieuCode: 'G1-CASERNE', parentCode: 'G1-VULCAIN' },
  { code: 'G1-OXYGENE', libelle: 'Oxygène', lieuCode: 'G1-CASERNE', parentCode: null },
  { code: 'G1-O2', libelle: 'O2', lieuCode: 'G1-CASERNE', parentCode: 'G1-OXYGENE' },
  { code: 'G1-O3', libelle: 'O3', lieuCode: 'G1-CASERNE', parentCode: 'G1-OXYGENE' },
  { code: 'G1-FLASHOVER', libelle: 'Flashover', lieuCode: 'G1-CASERNE', parentCode: null },
  { code: 'G1-BACKDRAFT', libelle: 'Backdraft', lieuCode: 'G1-CASERNE', parentCode: null },
  { code: 'G1-ETAT-MAJOR', libelle: 'État-major', lieuCode: 'G1-CASERNE', parentCode: null },
  { code: 'C1-THEORIE', libelle: 'Théorie C1', lieuCode: 'C1-CASERNE', parentCode: null },
  { code: 'B1-THEORIE', libelle: 'Théorie B1', lieuCode: 'B1-CASERNE', parentCode: null }
]);

const SITES_WITHOUT_THEORY_ROOMS = Object.freeze(['B2-CASERNE', 'Y1-LOCAL', 'Y2-LOCAL', 'Y3-LOCAL', 'Y4-LOCAL']);

const RESPONSIBLE_FUNCTIONS = Object.freeze([
  'C audiovisuel',
  'C DAP',
  'C FOBA',
  'C for',
  'C FOSPEC',
  'C JSP',
  'C log',
  'C op',
  'C PR',
  'C scrt',
  'C site',
  'C site JSP',
  'Cdt',
  'Of auto',
  'Of spéc',
  'Présidente CI',
  'Présidente Codir',
  'QM',
  'Réf sanitaire',
  'Répondant sport',
  'Resp ABC',
  'Resp APR',
  'Resp for JSP',
  'Resp mat',
  'Resp mat JSP',
  'Resp OFSI',
  'Resp Sports',
  'Resp VPC'
]);

const SCOPE_SITE_ORDER = Object.freeze(OFFICIAL_LIEUX.map((row) => String(row.oiCode)));

function extractSiteCode(value){
  const match = String(value || '').toUpperCase().match(/\b([GBC][12]|Y[1-4])\b/);
  return match ? match[1] : '';
}

function scopeSiteRank(value){
  const code = extractSiteCode(value);
  if(!code) return SCOPE_SITE_ORDER.length;
  const index = SCOPE_SITE_ORDER.indexOf(code);
  return index < 0 ? SCOPE_SITE_ORDER.length : index;
}

function compareScopeSites(a, b){
  return scopeSiteRank(a) - scopeSiteRank(b);
}

function sortByScopeSiteOrder(rows, getter){
  const get = getter || ((row) => row && (row.oiCode || row.oi_code || row.nomCourt || row.code || row.lieu || row));
  return (rows || []).slice().sort((a, b) => {
    const cmp = compareScopeSites(get(a), get(b));
    if(cmp) return cmp;
    return String(get(a) || '').localeCompare(String(get(b) || ''), 'fr');
  });
}

function siteCodeFromActivity(activity){
  const sources = [
    activity && activity.oi,
    activity && activity.oiCode,
    activity && activity.title,
    ...((activity && activity.cibleCodes) || [])
  ];
  for(const source of sources){
    const code = extractSiteCode(source);
    if(code) return code;
  }
  return '';
}

function lieuByOiCode(lieux, oiCode){
  const wanted = String(oiCode || '').toUpperCase();
  if(!wanted) return null;
  return (lieux || []).find((row) => String(row.oiCode || row.oi_code || '').toUpperCase() === wanted) || null;
}

function suggestLieu(activity, lieux, currentLieuId){
  if(currentLieuId) return { lieuId: currentLieuId, source: 'humain', overwritten: false };
  const oi = siteCodeFromActivity(activity);
  const lieu = lieuByOiCode(lieux, oi);
  if(!lieu) return { lieuId: null, source: '', overwritten: false };
  return {
    lieuId: lieu.lieuId || lieu.lieu_id || null,
    source: 'site-oi',
    overwritten: false
  };
}

function roomsForLieu(rooms, lieuId, lieuCode){
  return (rooms || []).filter((row) => {
    if(lieuId && String(row.lieuId || row.lieu_id || '') === String(lieuId)) return true;
    if(lieuCode && String(row.lieuCode || row.lieu_code || '') === String(lieuCode)) return true;
    return false;
  });
}

function occupancyKeys(room, byCode){
  const code = String((room && (room.code || room.salleCode)) || '');
  const keys = new Set([code]);
  const parent = room && (room.parentCode || (room.parent && room.parent.code));
  if(parent) keys.add(String(parent));
  const node = byCode && byCode.get(code);
  const parentCode = node && (node.parentCode || node.parent_code);
  if(parentCode) keys.add(String(parentCode));
  (byCode ? Array.from(byCode.values()) : []).forEach((child) => {
    const childParent = child.parentCode || child.parent_code;
    if(childParent && (childParent === code || keys.has(String(childParent))) && String(child.code) !== code){
      keys.add(String(child.code));
    }
  });
  return keys;
}

function roomsConflict(roomA, roomB, rooms){
  if(!roomA || !roomB) return false;
  const byCode = new Map((rooms || THEORY_ROOMS).map((row) => [row.code, row]));
  const a = typeof roomA === 'string' ? byCode.get(roomA) : roomA;
  const b = typeof roomB === 'string' ? byCode.get(roomB) : roomB;
  if(!a || !b) return false;
  if(a.code === b.code) return true;
  const keysA = occupancyKeys(a, byCode);
  return keysA.has(b.code);
}

function hasTheoryRooms(lieuCode){
  return !SITES_WITHOUT_THEORY_ROOMS.includes(String(lieuCode || ''));
}

module.exports = {
  OFFICIAL_LIEUX,
  THEORY_ROOMS,
  SITES_WITHOUT_THEORY_ROOMS,
  RESPONSIBLE_FUNCTIONS,
  SCOPE_SITE_ORDER,
  extractSiteCode,
  scopeSiteRank,
  compareScopeSites,
  sortByScopeSiteOrder,
  siteCodeFromActivity,
  lieuByOiCode,
  suggestLieu,
  roomsForLieu,
  roomsConflict,
  hasTheoryRooms
};
