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
      ajouterEncadrement(id, body, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/encadrement`, withBaseVersion(body, baseVersion)); },
      cloturer(id, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/cloturer`, withBaseVersion({}, baseVersion)); },
      reouvrir(id, motif, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/reouvrir`, withBaseVersion({ motif }, baseVersion)); },
      annuler(id, motif, baseVersion) { return request('POST', `/evenements/${encodeURIComponent(id)}/annuler`, withBaseVersion({ motif }, baseVersion)); },
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
      previewImportEvenements(body) { return request('POST', '/imports/evenements/preview', body); },
      commitImportEvenements(body) { return request('POST', '/imports/evenements/commit', body); },
      previewPersonnelSync(body) { return request('POST', '/imports/personnel/preview', body); },
      commitPersonnelSync(body) { return request('POST', '/imports/personnel/commit', body); },
      listPersonnelDirectory(params) { return request('GET', `/personnel${queryString(params || {})}`); },
      getPersonneFiche(id, params) {
        return request('GET', `/personnel/${encodeURIComponent(id)}${queryString(params || {})}`);
      },
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
