/* SCOPE-IMPL-1B — client /api/scope/* */
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
      this.serverVersion = (payload && (payload.serverVersion || (payload.details && payload.details.serverVersion))) || null;
      this.payload = payload || null;
    }
  }

  function withBaseVersion(body, baseVersion) {
    const payload = Object.assign({}, body || {});
    if (baseVersion !== undefined && baseVersion !== null && payload.baseVersion === undefined) {
      payload.baseVersion = baseVersion;
    }
    return payload;
  }

  function queryString(params) {
    const usp = new URLSearchParams();
    Object.keys(params || {}).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '' && value !== 'tous') usp.set(key, String(value));
    });
    const text = usp.toString();
    return text ? `?${text}` : '';
  }

  function createHttpClient(options) {
    const base = String((options && options.baseUrl) || '/api/scope').replace(/\/+$/, '');
    const getToken = (options && options.getToken) || function () {
      return (typeof window !== 'undefined' && window.MonitoringApiClient && window.MonitoringApiClient.getAccessToken()) || null;
    };

    async function request(method, path, body) {
      const headers = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      let response;
      try {
        response = await fetch(`${base}${path}`, {
          method,
          headers,
          credentials: 'same-origin',
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
      } catch (error) {
        throw new ScopeApiError(0, { error: 'network', message: String(error && error.message || error) });
      }
      let payload = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        payload = { message: await response.text() };
      }
      if (!response.ok) throw new ScopeApiError(response.status, payload || {});
      return payload;
    }

    async function directRequest(method, path, body) {
      const headers = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      let response;
      try {
        response = await fetch(path, {
          method,
          headers,
          credentials: 'same-origin',
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
      } catch (error) {
        throw new ScopeApiError(0, { error: 'network', message: String(error && error.message || error) });
      }
      let payload = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        payload = { message: await response.text() };
      }
      if (!response.ok) throw new ScopeApiError(response.status, payload || {});
      return payload;
    }

    async function sessionMe() {
      let response;
      try {
        response = await fetch('/auth/me', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'same-origin'
        });
      } catch (error) {
        throw new ScopeApiError(0, { error: 'network', message: String(error && error.message || error) });
      }
      let payload = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) payload = await response.json();
      else payload = { message: await response.text() };
      if (!response.ok) throw new ScopeApiError(response.status, payload || {});
      return payload;
    }

    return {
      kind: 'http',
      ScopeApiError,
      sessionMe,
      referentiels() { return request('GET', '/referentiels'); },
      listPersonnes(q) { return request('GET', `/personnes${queryString({ q })}`); },
      listEvenements(params) { return request('GET', `/evenements${queryString(params || {})}`); },
      getEvenement(id) { return request('GET', `/evenements/${encodeURIComponent(id)}`); },
      createEvenement(body) { return request('POST', '/evenements', body); },
      patchEvenement(id, body, baseVersion) { return request('PATCH', `/evenements/${encodeURIComponent(id)}`, withBaseVersion(body, baseVersion)); },
      previewAttendus(id) { return request('POST', `/evenements/${encodeURIComponent(id)}/preview-attendus`, {}); },
      figer(id, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/figer`, withBaseVersion({}, baseVersion)); },
      ajouterException(id, body, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/exceptions`, withBaseVersion(body, baseVersion)); },
      retirerAttendu(id, body, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/retraits`, withBaseVersion(body, baseVersion)); },
      enregistrerParticipations(id, participations, baseVersion) {
        return request('POST', `/evenements/${encodeURIComponent(id)}/participations`, withBaseVersion({ participations }, baseVersion));
      },
      resetParticipations(id, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/participations/reset`, withBaseVersion({}, baseVersion)); },
      ajouterEncadrement(id, body, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/encadrement`, withBaseVersion(body, baseVersion)); },
      retirerEncadrement(id, body, baseVersion) { return request('DELETE', `/evenements/${encodeURIComponent(id)}/encadrement`, withBaseVersion(body, baseVersion)); },
      cloturer(id, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/cloturer`, withBaseVersion({}, baseVersion)); },
      reouvrir(id, motif, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/reouvrir`, withBaseVersion({ motif }, baseVersion)); },
      annuler(id, motif, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/annuler`, withBaseVersion({ motif }, baseVersion)); },
      supprimerOuAnnuler(id, motif, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/supprimer-ou-annuler`, withBaseVersion({ motif }, baseVersion)); },
      taux(id) { return request('GET', `/evenements/${encodeURIComponent(id)}/taux`); },
      suggestModeSuivi(params) { return request('GET', `/mode-suivi-suggere${queryString(params || {})}`); },
      previewTauxQuantitatif(id, body) { return request('POST', `/evenements/${encodeURIComponent(id)}/preview-taux-quantitatif`, body || {}); },
      enregistrerSaisieQuantitative(id, body, baseVersion) {
        return request('POST', `/evenements/${encodeURIComponent(id)}/saisie-quantitative`, withBaseVersion(body, baseVersion));
      },
      convertirNominatif(id, body, baseVersion) {
        return request('POST', `/evenements/${encodeURIComponent(id)}/convertir-nominatif`, withBaseVersion(body, baseVersion));
      },
      convertirQuantitatif(id, body, baseVersion) {
        return request('POST', `/evenements/${encodeURIComponent(id)}/convertir-quantitatif`, withBaseVersion(body || {}, baseVersion));
      },
      listCycles(params) { return request('GET', `/cycles${queryString(params || {})}`); },
      getCycle(id) { return request('GET', `/cycles/${encodeURIComponent(id)}`); },
      createCycle(body) { return request('POST', '/cycles', body); },
      patchCycle(id, body) { return request('PATCH', `/cycles/${encodeURIComponent(id)}`, body); },
      attachCycleEvent(id, body) { return request('POST', `/cycles/${encodeURIComponent(id)}/evenements`, body); },
      detachCycleEvent(id, body) { return request('DELETE', `/cycles/${encodeURIComponent(id)}/evenements`, body); },
      upsertCyclePersonne(id, body) { return request('POST', `/cycles/${encodeURIComponent(id)}/personnes`, body); },
      removeCyclePersonne(id, body) { return request('DELETE', `/cycles/${encodeURIComponent(id)}/personnes`, body); },
      proposeCycle(body) { return request('POST', '/cycles/proposer', body); },
      previewImportEvenements(body) { return request('POST', '/imports/evenements/preview', body); },
      commitImportEvenements(body) { return request('POST', '/imports/evenements/commit', body); },
      async previewPersonnelSync(body) {
        const payload = await directRequest('POST', '/.netlify/functions/scope-personnel-import-analyze', Object.assign({}, body || {}, {
          fileText: (body && (body.fileText || body.csvText)) || '',
          csvText: (body && (body.csvText || body.fileText)) || '',
          importType: (body && (body.importType || body.contexte || body.context)) || 'GENERAL',
          contexte: (body && (body.contexte || body.importType || body.context)) || 'GENERAL',
          siteJsp: body && (body.siteJsp || body.site),
          anneeMonitoring: body && (body.anneeMonitoring || body.annee)
        }));
        const result = payload && (payload.result || payload);
        const lines = (result && result.lines) || [];
        return Object.assign({}, result, {
          wrote: false,
          rows: lines.map((line) => Object.assign({
            rowId: String(line.lineNumber || line.id || (line.normalized && line.normalized.nip) || line.nip || ''),
            statut: line.status === 'NEW_JSP' ? 'NOUVEAU' : (line.status === 'ABSENT_DU_NOUVEL_IMPORT' ? 'ABSENT_DU_FICHIER' : line.status),
            statusLabel: line.statusLabel,
            nip: (line.normalized && line.normalized.nip) || line.nip,
            decision: line.status === 'NEW_PERSON' || line.status === 'NEW_JSP'
              ? 'CREER'
              : (line.status === 'ABSENT_DU_NOUVEL_IMPORT'
                ? 'CONSERVER'
                : (line.status === 'MODIFIED'
                  ? 'EXAMINER'
                  : (line.status === 'IDENTICAL' ? 'IGNORER' : 'APPLIQUER')))
          }, line)),
          fingerprint: result && (result.fingerprint || [result.contexte, result.siteJsp, result.anneeMonitoring, result.filename].filter(Boolean).join('|')),
          importId: result && (result.importId || result.batchId || null),
          summary: (result && result.counts) || {},
          importSummary: Object.assign({}, result && result.counts, {
            contextLabel: result && result.contextLabel,
            siteJspLabel: result && result.siteJspLabel,
            anneeMonitoring: result && result.anneeMonitoring
          })
        });
      },
      commitPersonnelSync(body) {
        return directRequest('POST', '/.netlify/functions/scope-personnel-import-commit', {
          fileText: body && (body.fileText || body.csvText),
          csvText: body && (body.csvText || body.fileText),
          filename: body && body.filename,
          importType: body && (body.importType || body.contexte),
          contexte: body && (body.contexte || body.importType),
          siteJsp: body && (body.siteJsp || body.site),
          anneeMonitoring: body && (body.anneeMonitoring || body.annee),
          decisions: body && body.decisions,
          confirmed: true
        }).then((payload) => Object.assign({}, payload, {
          summary: Object.assign({}, payload && payload.summary, {
            mutations: payload && payload.summary && payload.summary.mutations != null
              ? payload.summary.mutations
              : ((payload && payload.personsTouched) || 0) + ((payload && payload.assignmentsCreated) || 0) + ((payload && payload.closures) || 0)
          })
        }));
      },
      listPersonnelDirectory(params) { return directRequest('GET', `/.netlify/functions/scope-personnel-list${queryString(params || {})}`); },
      inactivatePersonne(body) { return directRequest('POST', '/.netlify/functions/scope-personnel-inactivate', body); },
      createPersonnelSabbatical(body) {
        return directRequest('POST', '/.netlify/functions/scope-personnel-inactivate', Object.assign({}, body || {}, { action: 'sabbatical' }));
      },
      endPersonnelSabbatical(body) {
        return directRequest('POST', '/.netlify/functions/scope-personnel-inactivate', Object.assign({}, body || {}, { action: 'end_sabbatical' }));
      },
      createPersonnelAffectation(body) {
        const payload = Object.assign({}, body || {}, { action: 'create_affectation' });
        const id = payload.personneId || payload.id;
        return directRequest('POST', `/.netlify/functions/scope-personnel-detail${queryString({ id })}`, payload);
      },
      lookupPersonneByNip(nip) {
        return directRequest('POST', '/.netlify/functions/scope-personnel-detail', { action: 'lookup_nip', nip });
      },
      createManualPersonne(body) {
        return directRequest('POST', '/.netlify/functions/scope-personnel-detail', Object.assign({}, body || {}, { action: 'create_personne' }));
      },
      listPersonnelHistory(params) { return directRequest('GET', `/.netlify/functions/scope-personnel-history${queryString(params || {})}`); },
      correctPersonnelPeriod(body) { return directRequest('POST', '/.netlify/functions/scope-personnel-correct-period', body); },
      updatePersonne(id, body) { return request('PATCH', `/personnel/${encodeURIComponent(id)}`, body || {}); },
      async getPersonneFiche(id, params) {
        const payload = await directRequest('GET', `/.netlify/functions/scope-personnel-detail${queryString(Object.assign({}, params || {}, { id }))}`);
        let analytics = null;
        try {
          analytics = await request('GET', `/personnel/${encodeURIComponent(id)}${queryString(params || {})}`);
        } catch (_error) {
          analytics = null;
        }
        const analyticsSlice = analytics && (analytics.kpi || analytics.evenements)
          ? {
              kpi: analytics.kpi,
              evenements: analytics.evenements || [],
              domaines: analytics.domaines,
              jsp: analytics.jsp,
              explain: analytics.explain,
              graphs: analytics.graphs || {},
              objectif: analytics.objectif,
              alertesPersonne: analytics.alertesPersonne,
              period: analytics.period
            }
          : null;
        if (payload && payload.personne && !payload.identite) {
          const personne = payload.personne;
          const affectations = personne.affectations || [];
          const primary = affectations.find((aff) => aff.roleDomaine === 'PRINCIPAL' && aff.categorie === 'OI')
            || affectations.find((aff) => aff.role_domaine === 'PRINCIPAL' && aff.categorie === 'OI')
            || affectations[0]
            || null;
          const display = typeof window !== 'undefined' ? window.ScopePersonnelDisplay : null;
          const label = display && display.formatAssignment
            ? display.formatAssignment(primary)
            : (primary ? (String(primary.domaine || '').toUpperCase() === String(primary.cible || '').toUpperCase()
              ? (primary.domaine || primary.cible)
              : [primary.domaine, primary.cible].filter(Boolean).join(' ')) : '');
          return Object.assign({}, payload, {
            sabbatical: payload.sabbatical || personne.sabbatical || null,
            identite: {
              personneId: personne.id || id,
              nip: personne.nip,
              grade: personne.grade,
              nom: personne.nom,
              prenom: personne.prenom,
              dateEntreeSdis: personne.dateEntreeSdis || personne.date_entree_sdis || personne.dateEntree || personne.date_entree || null,
              dateInactif: personne.dateInactif || personne.date_inactif || null,
              oiActuel: primary ? { label } : null,
              statutRh: (personne.statutTemporel === 'inactif' || personne.archivedAt || personne.archived_at) ? 'INACTIF' : 'ACTIF',
              archivee: Boolean(personne.statutTemporel === 'inactif' || personne.archivedAt || personne.archived_at),
              libelleStatut: (personne.statutTemporel === 'inactif' || personne.archivedAt || personne.archived_at) ? 'Personnel inactif' : 'Personnel actif'
            },
            period: (analyticsSlice && analyticsSlice.period) || params || {},
            historiqueRh: {
              periodes: personne.periodes || [],
              affectations: affectations.map((aff) => ({
                affectationId: aff.id || aff.affectationId,
                dateDebut: aff.dateActif || aff.date_actif || aff.dateDebut,
                dateFin: aff.dateInactif || aff.date_inactif || aff.dateFin,
                label: display && display.formatAssignment ? display.formatAssignment(aff) : [aff.domaine, aff.cible].filter(Boolean).join(' '),
                domaineCode: aff.domaine,
                niveauCode: aff.cible,
                categorie: aff.categorie,
                roleDomaine: aff.roleDomaine || aff.role_domaine
              }))
            },
            kpi: { volumes: {}, analyticStatus: 'NON_EVALUABLE', percentage: null },
            explain: {},
            graphs: {},
            evenements: []
          }, analyticsSlice || {});
        }
        const sabbatical = payload && (payload.sabbatical || (payload.personne && payload.personne.sabbatical) || null);
        if (payload && payload.identite && analyticsSlice) return Object.assign({}, payload, analyticsSlice, { sabbatical });
        if (payload && sabbatical && !payload.sabbatical) return Object.assign({}, payload, { sabbatical });
        return payload;
      },
      personnelEffectifAtDate(params) { return directRequest('GET', `/.netlify/functions/scope-personnel-effectif-at-date${queryString(params || {})}`); },
      analyticsPerson(id, params) {
        return request('GET', `/analytics/persons/${encodeURIComponent(id)}${queryString(params || {})}`);
      },
      analyticsSummary(params) { return request('GET', `/analytics/summary${queryString(params || {})}`); },
      analyticsExplain(params) { return request('GET', `/analytics/explain${queryString(params || {})}`); },
      analyticsTimeseries(params) { return request('GET', `/analytics/timeseries${queryString(params || {})}`); },
      analyticsGraphs(params) { return request('GET', `/analytics/graphs${queryString(params || {})}`); },
      dashboard(params) { return request('GET', `/dashboard${queryString(params || {})}`); },
      listAlerts(params) { return request('GET', `/alerts${queryString(params || {})}`); },
      acquitterAlerte(body) { return request('POST', '/alerts/acquitter', body); },
      listObjectifs(params) { return request('GET', `/objectifs${queryString(params || {})}`); },
      createObjectif(body) { return request('POST', '/objectifs', body); },
      patchObjectif(id, body) { return request('PATCH', `/objectifs/${encodeURIComponent(id)}`, body); },
      cloturerObjectif(id, body) { return request('POST', `/objectifs/${encodeURIComponent(id)}/cloturer`, body); },
      nouvellePeriodeObjectif(id, body) { return request('POST', `/objectifs/${encodeURIComponent(id)}/nouvelle-periode`, body); },
      desactiverObjectif(id, body) { return request('POST', `/objectifs/${encodeURIComponent(id)}/desactiver`, body || {}); },
      async generateReport(body) {
        const headers = { Accept: 'application/pdf' };
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        let response;
        try {
          response = await fetch(`${base}/reports`, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
            credentials: 'same-origin',
            body: JSON.stringify(body || {})
          });
        } catch (error) {
          throw new ScopeApiError(0, { error: 'network', message: String(error && error.message || error) });
        }
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok) {
          let payload = null;
          if (contentType.includes('application/json')) payload = await response.json();
          else payload = { message: await response.text() };
          throw new ScopeApiError(response.status, payload || {});
        }
        const buffer = await response.arrayBuffer();
        return {
          buffer,
          blob: new Blob([buffer], { type: 'application/pdf' }),
          filename: response.headers.get('X-Scope-Report-Filename') || 'SCOPE_Rapport.pdf',
          sha256: response.headers.get('X-Scope-Report-Sha256') || '',
          pages: Number(response.headers.get('X-Scope-Report-Pages') || 0)
        };
      }
    };
  }

  return { ScopeApiError, createHttpClient, withBaseVersion };
});
