'use strict';

function normalizeLieuName(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugLieuCode(value){
  const slug = normalizeLieuName(value).replace(/\s+/g, '-').toUpperCase();
  return slug ? slug.slice(0, 48) : '';
}

function parseSwissAddress(value){
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if(!text) return null;
  const match = text.match(/(?:^|[\s,;])(\d{4})\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ.'’\- ]{2,})$/);
  if(!match) return null;
  const npa = match[1];
  const localite = match[2].trim();
  const before = text.slice(0, match.index).replace(/[,;:\-–]+\s*$/, '').trim();
  const street = before
    .replace(/^(caserne|local|centre de formation|centre)[^,]*(?:,|\s+[-–:]\s+)/i, '')
    .trim();
  if(street && /^caserne\s+[a-z0-9]+$/i.test(street)){
    return { adresseLigne1: '', npa, localite };
  }
  return {
    adresseLigne1: street && /\d/.test(street) ? street : '',
    npa,
    localite
  };
}

function extractOi(value){
  const match = String(value || '').toUpperCase().match(/\b([GBC][12]|Y[1-4])\b/);
  return match ? match[1] : '';
}

function lieuLookupKeys(row){
  const keys = new Set();
  [
    row && (row.nom_court || row.nomCourt),
    row && (row.nom_complet || row.nomComplet),
    row && row.code
  ].forEach((value) => {
    const key = normalizeLieuName(value);
    if(key) keys.add(key);
  });
  const oi = String((row && (row.oi_code || row.oiCode)) || '').toUpperCase();
  if(oi) keys.add(`caserne ${oi.toLowerCase()}`);
  return keys;
}

function matchLieu(lieux, salle){
  const salleKey = normalizeLieuName(salle);
  if(!salleKey) return null;
  const salleOi = extractOi(salle);
  for(const lieu of lieux || []){
    if(lieuLookupKeys(lieu).has(salleKey)) return lieu;
    if(salleOi && String(lieu.oi_code || lieu.oiCode || '').toUpperCase() === salleOi && /^caserne\b/.test(salleKey)) return lieu;
  }
  return null;
}

function emptyAddress(lieu){
  return !String((lieu && (lieu.adresse_ligne1 || lieu.adresseLigne1)) || '').trim()
    && !String((lieu && lieu.npa) || '').trim()
    && !String((lieu && lieu.localite) || '').trim();
}

function planLieuAddressConsolidation(lieux, salles){
  const existing = (lieux || []).slice();
  const seenSalles = new Set();
  const uniqueSalles = [];
  (salles || []).forEach((value) => {
    const salle = String(value || '').trim();
    const key = normalizeLieuName(salle);
    if(!salle || !key || seenSalles.has(key)) return;
    seenSalles.add(key);
    uniqueSalles.push(salle);
  });
  const updates = [];
  const inserts = [];
  const duplicatesAvoided = [];
  const queuedCodes = new Set(existing.map((row) => String(row.code || '').toUpperCase()).filter(Boolean));
  const queuedNames = new Set();
  existing.forEach((row) => lieuLookupKeys(row).forEach((key) => queuedNames.add(key)));

  uniqueSalles.forEach((salle) => {
    const parsed = parseSwissAddress(salle);
    const matched = matchLieu(existing, salle);
    if(matched){
      duplicatesAvoided.push(salle);
      if(!parsed) return;
      if(!emptyAddress(matched) && String(matched.adresse_ligne1 || matched.adresseLigne1 || '').trim()) return;
      updates.push({
        lieuId: matched.lieu_id || matched.lieuId,
        code: matched.code,
        adresseLigne1: parsed.adresseLigne1 || '',
        npa: parsed.npa || '',
        localite: parsed.localite || ''
      });
      return;
    }
    if(/^a defin|lieu a defin|a definir/i.test(normalizeLieuName(salle))) return;
    const stableSite = /^(caserne|local|centre)\b/i.test(salle);
    if(!parsed && !stableSite) return;
    const code = slugLieuCode(salle.replace(/,.*$/, '')) || slugLieuCode(salle);
    if(!code || queuedCodes.has(code) || queuedNames.has(normalizeLieuName(salle))){
      duplicatesAvoided.push(salle);
      return;
    }
    queuedCodes.add(code);
    queuedNames.add(normalizeLieuName(salle));
    inserts.push({
      code,
      nomCourt: salle.replace(/[,;].*$/, '').trim() || salle,
      adresseLigne1: parsed ? parsed.adresseLigne1 : '',
      npa: parsed ? parsed.npa : '',
      localite: parsed ? parsed.localite : '',
      oiCode: extractOi(salle) || null
    });
  });

  const enriched = updates.filter((row) => row.adresseLigne1 || row.npa || row.localite).length
    + inserts.filter((row) => row.adresseLigne1 || row.npa || row.localite).length;
  const remaining = existing.filter((row) => emptyAddress(row)
    && !updates.some((item) => String(item.lieuId) === String(row.lieu_id || row.lieuId))).length
    + inserts.filter((row) => !row.adresseLigne1 && !row.npa && !row.localite).length;

  return {
    lieuxAnalyzed: existing.length,
    sallesAnalyzed: uniqueSalles.length,
    addressesFound: uniqueSalles.filter((salle) => parseSwissAddress(salle)).length,
    lieuxEnriched: enriched,
    duplicatesAvoided: duplicatesAvoided.length,
    lieuxWithoutAddress: remaining,
    updates,
    inserts
  };
}

module.exports = {
  normalizeLieuName,
  parseSwissAddress,
  matchLieu,
  planLieuAddressConsolidation
};
