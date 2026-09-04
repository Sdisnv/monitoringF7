'use strict';
/** SCOPE-REPORT-1 — orchestration. Le client n’envoie jamais les chiffres. */

const crypto = require('crypto');
const { HttpError } = require('./_scope-rules');
const { hasPermission } = require('./_rbac');
const { collectReport, normalizeKind, REPORT_KINDS } = require('./_scope-report-data');
const { renderReportPdf } = require('./_scope-pdf-renderer');

const ALLOWED_KEYS = new Set([
  'kind', 'type',
  'evenementId', 'evenement_id', 'id',
  'domaine', 'domaineCode',
  'cible', 'cibleId',
  'site', 'niveau', 'perimeter', 'blocks',
  'year', 'annee', 'preset', 'month', 'quarter', 'from', 'to',
  'nominatif', 'includeNominatif',
  'includeQualification', 'include_qualification',
  'personneId', 'personne_id', 'asOf', 'date'
]);

const FORBIDDEN_KEYS = new Set([
  'percentage', 'numerator', 'denominator', 'taux', 'volumes', 'officiel',
  'participations', 'attendus', 'graphs', 'alerts', 'nominatifRows',
  'kpi', 'gapPct', 'eventCount', 'presents', 'excuses'
]);

function actorLabel(claims){
  if(!claims) return 'session SCOPE';
  return claims.displayName || claims.name || claims.email || claims.sub || 'session SCOPE';
}

function sanitizeQuery(body){
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const keys = Object.keys(raw);
  const forbidden = keys.filter((key) => FORBIDDEN_KEYS.has(key) || /^(percentage|numerator|denominator|taux)/i.test(key));
  if(forbidden.length){
    throw new HttpError(400, 'payload_interdit', 'Le client transmet uniquement le type, le périmètre et la période. Les chiffres sont reconstruits côté serveur.');
  }
  const unknown = keys.filter((key) => !ALLOWED_KEYS.has(key));
  if(unknown.length){
    throw new HttpError(400, 'payload_inconnu', `Champ(s) non autorisé(s) : ${unknown.join(', ')}.`);
  }
  return {
    kind: normalizeKind(raw.kind || raw.type),
    evenementId: raw.evenementId || raw.evenement_id || raw.id || null,
    domaine: raw.domaineCode || raw.domaine || null,
    cible: raw.cibleId || raw.cible || null,
    site: raw.site || raw.niveau || null,
    perimeter: raw.perimeter || null,
    blocks: raw.blocks || null,
    year: raw.year || raw.annee || null,
    preset: raw.preset || null,
    month: raw.month || null,
    quarter: raw.quarter || null,
    from: raw.from || null,
    to: raw.to || null,
    nominatif: raw.nominatif === true || raw.nominatif === 'true' || raw.includeNominatif === true || raw.includeNominatif === 'true',
    includeQualification: raw.includeQualification != null && raw.includeQualification !== ''
      ? raw.includeQualification
      : (raw.include_qualification != null && raw.include_qualification !== '' ? raw.include_qualification : undefined),
    personneId: raw.personneId || raw.personne_id || raw.id || null,
    asOf: raw.asOf || raw.date || null
  };
}

function pdfHeaders(filename, sha256, pages){
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Cache-Control': 'no-store',
    'X-Scope-Report-Filename': filename,
    'X-Scope-Report-Sha256': sha256,
    'X-Scope-Report-Pages': String(pages),
    'Access-Control-Expose-Headers': 'X-Scope-Report-Filename, X-Scope-Report-Sha256, X-Scope-Report-Pages, Content-Disposition'
  };
}

async function generateReport(repo, body, claims, options){
  if(!hasPermission(claims, 'dashboard:read')){
    throw new HttpError(403, 'forbidden', 'La consultation des rapports exige dashboard:read.');
  }
  const query = sanitizeQuery(body);
  if(query.kind === 'PERSON' && !hasPermission(claims, 'personnel:read')){
    throw new HttpError(403, 'forbidden', 'La fiche PDF individuelle exige personnel:read.');
  }
  const wantsNominatif = query.nominatif;
  if(wantsNominatif && !hasPermission(claims, 'reports:nominatif')){
    throw new HttpError(403, 'forbidden_nominatif', 'Le rapport nominatif est réservé aux profils habilités. Les droits agrégés ne suffisent pas.');
  }
  const includeNominatif = wantsNominatif && hasPermission(claims, 'reports:nominatif');
  const model = await collectReport(repo, query, { includeNominatif });
  const generatedAt = (options && options.generatedAt) || new Date().toISOString();
  const meta = {
    generatedAt,
    authorLabel: actorLabel(claims),
    authorId: claims && (claims.sub || claims.userId) || null
  };
  const { buffer, pages } = await renderReportPdf(model, meta);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if(typeof repo.appendJournal === 'function'){
    await repo.appendJournal({
      auteur_id: meta.authorId,
      entite: 'rapport',
      entite_id: (model.event && model.event.id) || model.kind,
      action: 'GENERER_RAPPORT',
      apres: {
        kind: model.kind,
        period: model.period,
        domaine: model.domaine,
        cible: model.cible,
        nominatif: Boolean(includeNominatif && model.nominatif && model.nominatif.length),
        filename: model.filename,
        sha256,
        pages
      },
      commentaire: includeNominatif ? 'nominatif' : 'agrege'
    });
  }
  return {
    buffer,
    filename: model.filename,
    sha256,
    pages,
    meta: {
      kind: model.kind,
      period: model.period,
      filename: model.filename,
      nominatif: Boolean(model.nominatif && model.nominatif.length),
      isLegacy: Boolean(model.isLegacy)
    }
  };
}

function pdfResponse(result){
  return {
    statusCode: 200,
    headers: pdfHeaders(result.filename, result.sha256, result.pages),
    body: result.buffer.toString('base64'),
    isBase64Encoded: true
  };
}

module.exports = {
  REPORT_KINDS,
  sanitizeQuery,
  generateReport,
  pdfResponse,
  pdfHeaders
};
