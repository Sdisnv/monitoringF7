/* SCOPE-APP-BASELINE-1 — client SCOPE raccordé aux Netlify Functions versionnées. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeApi = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  class ScopeApiError extends Error {
    constructor(status, payload) {
      super((payload && (payload.message || payload.error)) || 'Erreur SCOPE');
      this.status = status;
      this.error = payload && payload.error;
      this.details = payload && payload.details;
      this.payload = payload || null;
    }
  }

  const DOMAINES = Object.freeze([
    { code: 'DPS', libelle: 'DPS', libelleAffiche: 'DPS', nature: 'DOMAINE' },
    { code: 'DAP', libelle: 'DAP', libelleAffiche: 'DAP', nature: 'DOMAINE' },
    { code: 'JSP', libelle: 'JSP', libelleAffiche: 'JSP', nature: 'DOMAINE' },
    { code: 'FOBA', libelle: 'FOBA', libelleAffiche: 'FOBA', nature: 'DOMAINE' },
    { code: 'FOSPEC', libelle: 'Formations spécialisées', libelleAffiche: 'FOSPEC', nature: 'DOMAINE' },
    { code: 'PR', libelle: 'Protection respiratoire', libelleAffiche: 'PAPR', nature: 'SOUS_DOMAINE', parentCode: 'FOSPEC' },
    { code: 'AUTO', libelle: 'AUTO', libelleAffiche: 'AUTO', nature: 'SOUS_DOMAINE', parentCode: 'FOSPEC' }
  ]);

  const CIBLES = Object.freeze([
    ['DPS', 'G1'], ['DPS', 'C1'], ['DPS', 'B1'], ['DPS', 'B2'],
    ['DAP', 'Y1'], ['DAP', 'Y2'], ['DAP', 'Y3'], ['DAP', 'Y4'],
    ['JSP', 'JSP G1'], ['JSP', 'JSP C1'], ['JSP', 'JSP B1'],
    ['FOBA', '1'], ['FOBA', '2'], ['FOBA', '3'],
    ['PR', 'PR'], ['AUTO', 'cond VL'], ['AUTO', 'cond PL']
  ].map(([domaineCode, niveauCode]) => ({
    id: `${domaineCode}:${niveauCode}`,
    domaineCode,
    niveauCode,
    libelle: niveauCode,
    libelleAffiche: niveauCode
  })));

  function queryString(params) {
    const usp = new URLSearchParams();
    Object.keys(params || {}).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '' && value !== 'tous') usp.set(key, String(value));
    });
    const text = usp.toString();
    return text ? `?${text}` : '';
  }

  async function requestJson(method, path, body) {
    let response;
    try {
      response = await fetch(path, {
        method,
        headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (error) {
      throw new ScopeApiError(0, { error: 'network', message: String(error && error.message || error) });
    }
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json().catch(() => ({})) : { message: await response.text() };
    if (!response.ok || payload.ok === false) throw new ScopeApiError(response.status, payload || {});
    return payload || {};
  }

  function activeAssignments(person) {
    const today = new Date().toISOString().slice(0, 10);
    return (person.affectations || []).filter((a) => !a.dateInactif || String(a.dateInactif).slice(0, 10) >= today);
  }

  function oiLabel(assignments) {
    const current = activeAssignments({ affectations: assignments }).find((a) => a.categorie === 'OI' && a.roleDomaine === 'PRINCIPAL');
    return current ? `${current.domaine}/${current.cible}` : '';
  }

  function toDirectoryPerson(person) {
    const assignments = person.affectations || [];
    return {
      personneId: person.id,
      nip: person.nip,
      grade: person.grade || '',
      nom: person.nom || '',
      prenom: person.prenom || '',
      oiActuel: oiLabel(assignments),
      statutRh: person.archivedAt ? 'ARCHIVE' : 'ACTIF',
      taux: null,
      affectations: assignments
    };
  }

  function toFiche(person, params) {
    const assignments = person.affectations || [];
    const domaines = [...new Set(assignments.map((a) => a.domaine).filter(Boolean))].map((code) => ({
      code,
      libelle: code,
      eventCount: 0,
      percentage: null
    }));
    return {
      period: {
        preset: (params && params.preset) || 'YEAR',
        from: (params && params.from) || `${new Date().getFullYear()}-01-01`,
        to: (params && params.to) || `${new Date().getFullYear()}-12-31`
      },
      identite: {
        personneId: person.id,
        nip: person.nip,
        grade: person.grade || '',
        nom: person.nom || '',
        prenom: person.prenom || '',
        statutRh: person.archivedAt ? 'ARCHIVE' : 'ACTIF',
        oiActuel: { label: oiLabel(assignments) || '—' }
      },
      kpi: {
        analyticStatus: 'NON_EVALUABLE',
        percentage: null,
        numerator: 0,
        denominator: 0,
        volumes: { attendus: 0, presents: 0, excuses: 0, nonExcuses: 0, dispenses: 0 }
      },
      objectif: { message: 'Aucun objectif individuel calculé dans cette baseline.' },
      explain: { modesInclus: 'NOMINATIF uniquement', includedEvents: [], exclusions: {} },
      graphs: {},
      domaines,
      evenements: [],
      historiqueRh: {
        periodes: person.dateEntreeSdis ? [{ date_debut: person.dateEntreeSdis, type: 'ACTIF' }] : [],
        affectations: assignments.map((a) => ({
          dateDebut: a.dateActif,
          dateFin: a.dateInactif,
          label: `${a.domaine} ${a.cible}${a.roleDomaine ? ` ${a.roleDomaine.toLowerCase()}` : ''}`
        }))
      },
      alertesPersonne: { message: 'Aucune alerte individuelle active.' }
    };
  }

  function emptyDashboard(params) {
    const year = new Date().getFullYear();
    return {
      period: {
        preset: (params && params.preset) || 'YEAR',
        from: (params && params.from) || `${year}-01-01`,
        to: (params && params.to) || `${year}-12-31`
      },
      officiel: { analyticStatus: 'NON_EVALUABLE', percentage: null, eventCount: 0, gapPct: null },
      alerts: { counts: { p0: 0 }, alerts: [] },
      graphs: {},
      absencesNonExcusees: { count: 0 },
      legacy: { eventCount: 0 }
    };
  }

  function createHttpClient() {
    return {
      kind: 'http',
      ScopeApiError,
      async sessionMe() {
        return requestJson('GET', '/auth/me');
      },
      async referentiels() {
        return { domaines: DOMAINES.slice(), cibles: CIBLES.slice(), arbre: [], suiviNominatif: [] };
      },
      async listPersonnes(q) {
        const data = await requestJson('GET', `/.netlify/functions/scope-personnel-list${queryString({ q })}`);
        return { personnes: (data.personnes || []).map(toDirectoryPerson) };
      },
      async listEvenements() {
        return { evenements: [] };
      },
      async dashboard(params) {
        return emptyDashboard(params || {});
      },
      async listAlerts() {
        return { counts: { p0: 0, p1: 0, p2: 0 }, alerts: [] };
      },
      async listObjectifs() {
        return { objectifs: [] };
      },
      async listPersonnelDirectory(params) {
        const data = await requestJson('GET', `/.netlify/functions/scope-personnel-list${queryString({
          q: params && params.q,
          domaine: params && params.domaine,
          cible: params && params.cible
        })}`);
        return {
          personnes: (data.personnes || []).map(toDirectoryPerson),
          period: params || {},
          performance: { note: 'Lecture PostgreSQL SCOPE via Netlify Functions.' }
        };
      },
      async getPersonneFiche(id, params) {
        const data = await requestJson('GET', `/.netlify/functions/scope-personnel-detail?id=${encodeURIComponent(id)}`);
        return toFiche(data.personne || {}, params || {});
      },
      async previewPersonnelSync(body) {
        const data = await requestJson('POST', '/.netlify/functions/scope-personnel-import-analyze', {
          fileText: body && (body.csvText || body.fileText),
          filename: body && body.filename,
          importType: 'OI',
          contexte: 'OI',
          anneeMonitoring: new Date().getFullYear()
        });
        const result = data.result || {};
        const counts = result.counts || {};
        return {
          canCommit: Number(counts.countErrors || 0) === 0,
          batchId: result.batchId,
          importId: result.batchId,
          fingerprint: result.batchId,
          counts,
          summary: {
            personnelFichier: counts.totalLines || 0,
            inchanges: counts.countIdentical || 0,
            nouveaux: counts.countNewPersons || 0,
            changementsOi: counts.countNewAssignments || 0,
            changementsGrade: counts.countModified || 0,
            absents: counts.countMissingAssignments || 0,
            conflits: counts.countErrors || 0
          },
          rows: (result.lines || []).map((line) => ({
            rowId: String(line.lineNumber),
            nip: line.normalized && line.normalized.nip,
            nom: line.normalized && line.normalized.nom,
            prenom: line.normalized && line.normalized.prenom,
            oiActuel: '—',
            oiPropose: ((line.normalized && line.normalized.assignments) || []).map((a) => `${a.domaine}/${a.cible}`).join(', '),
            statut: line.status === 'IDENTICAL' ? 'INCHANGE' : line.status === 'NEW_PERSON' ? 'NOUVEAU' : line.status === 'ERROR' ? 'ERREUR' : 'APPLIQUER',
            decision: line.status === 'IDENTICAL' ? 'IGNORER' : 'APPLIQUER',
            message: (line.errors || []).join(', ')
          }))
        };
      },
      async commitPersonnelSync(body) {
        const data = await requestJson('POST', '/.netlify/functions/scope-personnel-import-commit', {
          batchId: body && (body.batchId || body.importId || body.fingerprint)
        });
        const mutations = Number(data.personsTouched || 0) + Number(data.assignmentsCreated || 0);
        return Object.assign({}, data, {
          summary: {
            mutations,
            analysed: mutations,
            inchanges: 0,
            creations: Number(data.personsTouched || 0),
            changementsOi: Number(data.assignmentsCreated || 0),
            changementsGrade: 0,
            reactivations: 0,
            archivages: 0,
            conflits: 0,
            erreurs: 0
          }
        });
      },
      async analyticsPerson() { return {}; },
      async analyticsSummary() { return {}; },
      async analyticsExplain() { return {}; },
      async analyticsTimeseries() { return {}; },
      async analyticsGraphs() { return {}; },
      async generateReport() {
        throw new ScopeApiError(501, { error: 'not_implemented', message: 'Rapports non repris dans cette baseline.' });
      }
    };
  }

  return { ScopeApiError, createHttpClient };
});
