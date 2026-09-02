/* SCOPE-IMPL-1B — adaptateur mémoire local. Aucune écriture PostgreSQL. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeDemo = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ScopeApiError = (root => (root.ScopeApi && root.ScopeApi.ScopeApiError) || class ScopeApiError extends Error {
    constructor(status, payload) {
      super((payload && payload.message) || 'Erreur SCOPE');
      this.status = status;
      this.error = payload && payload.error;
      this.details = payload && payload.details;
      this.serverVersion = payload && payload.serverVersion;
    }
  })(typeof window !== 'undefined' ? window : globalThis);

  const DOMAINES = [
    { code: 'FOBA', libelle: 'Formation de base' },
    { code: 'FOCA', libelle: 'Formation des cadres' },
    { code: 'DPS', libelle: 'Défense incendie et protection contre les sinistres' },
    { code: 'DAP', libelle: 'Détachement d’appui' },
    { code: 'PR', libelle: 'Premiers secours' },
    { code: 'AUTO', libelle: 'Automobile' },
    { code: 'FOSPEC', libelle: 'Formations spéciales' },
    { code: 'JSP', libelle: 'Jeunes sapeurs-pompiers' }
  ];

  const CIBLE_SPEC = [
    ['FOBA', '1', 'FOBA 1'], ['FOBA', '2', 'FOBA 2'], ['FOBA', '3', 'FOBA 3'],
    ['FOCA', 'GEN', 'FOCA'],
    ['DPS', 'GEN', 'DPS'],
    ['DPS', 'G1', 'DPS G1'], ['DPS', 'C1', 'DPS C1'], ['DPS', 'B1', 'DPS B1'], ['DPS', 'B2', 'DPS B2'],
    ['DAP', 'GEN', 'DAP'],
    ['DAP', 'Y1', 'DAP Y1'], ['DAP', 'Y2', 'DAP Y2'], ['DAP', 'Y3', 'DAP Y3'], ['DAP', 'Y4', 'DAP Y4'],
    ['PR', 'G1', 'PAPR G1'], ['PR', 'C1', 'PAPR C1'], ['PR', 'B1', 'PAPR B1'], ['PR', 'B2', 'PAPR B2'], ['PR', 'GEN', 'PAPR GEN'],
    ['AUTO', 'VL', 'AUTO VL'], ['AUTO', 'PL', 'AUTO PL'],
    ['FOSPEC', 'GEN', 'FOSPEC'],
    ['JSP', 'G1', 'JSP G1'], ['JSP', 'C1', 'JSP C1'], ['JSP', 'B1', 'JSP B1'], ['JSP', 'CAD', 'JSP CAD'], ['JSP', 'GEN', 'JSP GEN']
  ];

  const PILOTE_15 = [
    ['Berger', 'Luc', '10231', 'G1'], ['Chappuis', 'Yves', '10412', 'G1'], ['Coppey', 'Nadia', '10503', 'G1'],
    ['Dupont', 'Marc', '10118', 'G1'], ['Favre', 'Alain', '10344', 'G1'], ['Gilliéron', 'Paul', '10621', 'G1'],
    ['Martin', 'Sophie', '10755', 'G1'], ['Mottier', 'Jean', '10802', 'G1'], ['Nicolet', 'Anne', '10977', 'G1'],
    ['Perret', 'Claire', '11014', 'G1'], ['Rochat', 'Isabelle', '11108', 'G1'], ['Schmutz', 'Pierre', '11290', 'G1'],
    ['Reymond', 'Carla', '11333', 'G1'], ['Vuilleumier', 'Hugo', '11441', 'G1'], ['Bonvin', 'Rita', '11502', 'G1']
  ];

  const GROUP_EXTRA = [
    ['Dufour', 'Léon', '12001', 'C1'], ['Guignard', 'Eva', '12002', 'C1'], ['Hirt', 'Pascal', '12003', 'C1'],
    ['Jaccard', 'Nina', '12004', 'C1'], ['Kohler', 'Rémy', '12005', 'C1'], ['Loup', 'Camille', '12006', 'C1'],
    ['Monnier', 'Fred', '12007', 'C1'], ['Piguet', 'Odile', '12008', 'C1'], ['Rossier', 'Théo', '12009', 'C1'],
    ['Aubert', 'Céline', '13001', 'B1'], ['Blanc', 'David', '13002', 'B1'], ['Crettenand', 'Jo', '13003', 'B1'],
    ['Deslarzes', 'Marie', '13004', 'B1'], ['Emery', 'Nils', '13005', 'B1'], ['Fivaz', 'Olga', '13006', 'B1'],
    ['Golay', 'René', '13007', 'B1'], ['Hueber', 'Sara', '13008', 'B1'], ['Iseli', 'Tom', '13009', 'B1'],
    ['Jaccard', 'Ulysse', '14001', 'B2'], ['Krähenbühl', 'Vic', '14002', 'B2'], ['Mayor', 'Wanda', '14003', 'B2'],
    ['Noverraz', 'Xavier', '14004', 'B2'], ['Obrist', 'Yann', '14005', 'B2'], ['Pasche', 'Zoé', '14006', 'B2'],
    ['Quillet', 'André', '14007', 'B2'], ['Renaud', 'Brice', '14008', 'B2'], ['Suter', 'Chloé', '14009', 'B2']
  ];

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }

  function round1(value) { return Math.round(value * 10) / 10; }

  function computeTaux(participations, attendus) {
    const inclus = new Set((attendus || []).filter((a) => a.inclus !== false).map((a) => a.personne_id));
    let present = 0, excuse = 0, absent = 0, dispense = 0, nonRenseigne = 0, nonConcerne = 0;
    for (const p of participations || []) {
      if (!inclus.has(p.personne_id)) continue;
      if (p.statut === 'PRESENT' || p.statut === 'PERMUTATION') present += 1;
      else if (p.statut === 'ABSENT_EXCUSE') excuse += 1;
      else if (p.statut === 'ABSENT_NON_EXCUSE') absent += 1;
      else if (p.statut === 'DISPENSE') dispense += 1;
      else if (p.statut === 'NON_RENSEIGNE') nonRenseigne += 1;
      else if (p.statut === 'NON_CONCERNE') nonConcerne += 1;
    }
    const denominator = present + excuse + absent;
    return {
      numerator: present,
      denominator,
      percentage: denominator === 0 ? null : round1((100 * present) / denominator),
      presents: present,
      excuses: excuse,
      nonExcuses: absent,
      dispenses: dispense,
      nonRenseignes: nonRenseigne,
      nonConcernes: nonConcerne
    };
  }

  function createDemoClient(options) {
    const forceConflict = Boolean(options && options.forceConflict);
    const cibles = CIBLE_SPEC.map(([domaine_code, niveau_code, libelle]) => ({
      cible_id: uid(), domaine_code, niveau_code, libelle, actif: true
    }));
    const cibleBy = (domaine, niveau) => cibles.find((c) => c.domaine_code === domaine && c.niveau_code === niveau);
    const personnes = new Map();
    const affectations = [];
    function addPersonne(nom, prenom, nip, niveau) {
      const personne_id = uid();
      personnes.set(personne_id, { personne_id, nip, nom, prenom, actif: true });
      const cible = cibleBy('DPS', niveau);
      if (cible) affectations.push({ personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01', date_fin: null });
      return personne_id;
    }
    PILOTE_15.forEach((row) => addPersonne(row[0], row[1], row[2], row[3]));
    GROUP_EXTRA.forEach((row) => addPersonne(row[0], row[1], row[2], row[3]));

    const evenements = new Map();
    const eventCibles = new Map();
    const attendus = new Map();
    const participations = new Map();
    const cycles = new Map();
    const cyclePersonnes = new Map();
    const quantitatives = new Map();
    const objectifs = new Map();
    const journal = [];
    const key = (e, p) => `${e}::${p}`;
    const cyclePersonKey = (c, p, r) => `${c}::${p}::${r || 'PARTICIPANT'}`;

    function requireVersion(event, baseVersion) {
      if (forceConflict) {
        throw new ScopeApiError(409, {
          error: 'conflict',
          message: 'L’événement a été modifié ailleurs.',
          serverVersion: event.version,
          details: { serverVersion: event.version }
        });
      }
      if (Number(baseVersion) !== Number(event.version)) {
        throw new ScopeApiError(409, {
          error: 'conflict',
          message: 'L’événement a été modifié ailleurs.',
          serverVersion: event.version,
          details: { serverVersion: event.version }
        });
      }
    }

    function bump(event) {
      event.version += 1;
      event.updated_at = new Date().toISOString();
      return event.version;
    }

    function getEvent(id) {
      const evenement = evenements.get(id);
      if (!evenement) throw new ScopeApiError(404, { error: 'evenement_introuvable', message: 'Événement introuvable.' });
      return evenement;
    }

    function previewOf(eventId) {
      const evenement = getEvent(eventId);
      const cibleIds = new Set(eventCibles.get(eventId) || []);
      const byPersonne = new Map();
      for (const aff of affectations) {
        if (!cibleIds.has(aff.cible_id)) continue;
        if (aff.date_debut > evenement.date) continue;
        if (aff.date_fin && aff.date_fin < evenement.date) continue;
        const personne = personnes.get(aff.personne_id);
        if (!personne) continue;
        const cible = cibles.find((c) => c.cible_id === aff.cible_id);
        const current = byPersonne.get(aff.personne_id) || {
          personneId: aff.personne_id,
          nip: personne.nip,
          nom: personne.nom,
          prenom: personne.prenom,
          cibles: [],
          origine: 'REGLE',
          motifInclusion: ''
        };
        current.cibles.push({ cibleId: aff.cible_id, niveauCode: cible && cible.niveau_code, domaineCode: cible && cible.domaine_code });
        current.motifInclusion = current.cibles
          .map((c) => `${c.domaineCode}_${c.niveauCode}`)
          .filter((value) => value && !value.includes('undefined'))
          .join('|') || 'affectation_valide';
        byPersonne.set(aff.personne_id, current);
      }
      const list = [...byPersonne.values()];
      return { count: list.length, personnes: list };
    }

    function summarize(evenement) {
      const ids = eventCibles.get(evenement.evenement_id) || [];
      const evCibles = cibles.filter((c) => ids.includes(c.cible_id));
      const att = [...attendus.values()].filter((a) => a.evenement_id === evenement.evenement_id);
      const parts = [...participations.values()].filter((p) => p.evenement_id === evenement.evenement_id);
      const saisie = quantitatives.get(evenement.evenement_id) || null;
      const mode = evenement.mode_suivi || 'NOMINATIF';
      let compteurs = computeTaux(parts, att);
      let attendusInclus = att.filter((a) => a.inclus !== false).length;
      if (mode === 'QUANTITATIF' && saisie) {
        attendusInclus = saisie.nb_attendus;
        compteurs = { numerator: saisie.nb_presents, denominator: saisie.nb_presents + saisie.nb_excuses + saisie.nb_non_excuses, percentage: null, presents: saisie.nb_presents };
      }
      return {
        evenement: Object.assign({}, evenement),
        cibles: evCibles,
        compteurs,
        attendusInclus,
        saisieQuantitative: saisie,
        modeSuivi: mode
      };
    }

    function fiche(id) {
      const evenement = getEvent(id);
      const att = [...attendus.values()].filter((a) => a.evenement_id === id);
      const parts = [...participations.values()].filter((p) => p.evenement_id === id);
      const ids = eventCibles.get(id) || [];
      const personnesMap = {};
      [...att, ...parts].forEach((row) => {
        const p = personnes.get(row.personne_id);
        if (p) personnesMap[p.personne_id] = p;
      });
      return {
        ok: true,
        evenement: Object.assign({}, evenement),
        cibles: cibles.filter((c) => ids.includes(c.cible_id)),
        attendus: att,
        participations: parts,
        encadrement: parts.filter((p) => ['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(p.role)),
        personnes: personnesMap,
        journal: journal.filter((j) => j.entite_id === id),
        compteurs: evenement.mode_suivi === 'QUANTITATIF' && quantitatives.get(id)
          ? { numerator: quantitatives.get(id).nb_presents, denominator: quantitatives.get(id).nb_presents + quantitatives.get(id).nb_excuses + quantitatives.get(id).nb_non_excuses, percentage: null, presents: quantitatives.get(id).nb_presents }
          : computeTaux(parts, att),
        saisieQuantitative: quantitatives.get(id) || null,
        modeSuivi: evenement.mode_suivi || 'NOMINATIF',
        version: evenement.version
      };
    }

    return {
      kind: 'demo',
      ScopeApiError,
      async referentiels() {
        return {
          ok: true,
          domaines: DOMAINES.map((d) => ({ code: d.code, libelle: d.libelle, libelleAffiche: d.code === 'PR' ? 'PR' : d.code, actif: true })),
          cibles: cibles.map((c) => ({ cibleId: c.cible_id, domaineCode: c.domaine_code, niveauCode: c.niveau_code, libelle: c.libelle, actif: true }))
        };
      },
      async listPersonnes(q) {
        const query = String(q || '').trim().toLowerCase();
        const list = [...personnes.values()].filter((p) => {
          if (!query) return true;
          return `${p.nom} ${p.prenom} ${p.nip}`.toLowerCase().includes(query);
        });
        return { ok: true, personnes: list };
      },
      async listEvenements(params) {
        let items = [...evenements.values()];
        if (params && params.annee) items = items.filter((e) => String(e.date).slice(0, 4) === String(params.annee));
        if (params && params.statut && params.statut !== 'tous') items = items.filter((e) => e.statut === params.statut);
        if (params && params.domaineCode && params.domaineCode !== 'tous') items = items.filter((e) => e.domaine_code === params.domaineCode);
        items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        return { ok: true, evenements: items.map(summarize) };
      },
      async getEvenement(id) { return fiche(id); },
      async createEvenement(body) {
        const id = uid();
        const evenement = {
          evenement_id: id,
          date: body.date,
          domaine_code: body.domaineCode || body.domaine_code,
          libelle: String(body.libelle || '').trim(),
          statut: 'PLANIFIE',
          origine: 'NOMINATIF',
          mode_suivi: String(body.modeSuivi || body.mode_suivi || 'NOMINATIF').toUpperCase() === 'QUANTITATIF' ? 'QUANTITATIF' : 'NOMINATIF',
          population_figee: false,
          population_version: 0,
          version: 1
        };
        evenements.set(id, evenement);
        eventCibles.set(id, [...(body.cibleIds || body.cible_ids || [])]);
        return { ok: true, evenement, version: 1 };
      },
      async patchEvenement(id, body, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        if (body.libelle) evenement.libelle = String(body.libelle).trim();
        bump(evenement);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async listCycles(params) {
        let list = [...cycles.values()];
        if (params && params.annee) list = list.filter((c) => String(c.annee || '') === String(params.annee));
        if (params && params.domaine && params.domaine !== 'tous') list = list.filter((c) => c.domaine_code === params.domaine);
        return { ok: true, cycles: list.map((cycle) => Object.assign({}, cycle, {
          eventCount: [...evenements.values()].filter((e) => e.cycle_id === cycle.cycle_id).length,
          populationCount: [...cyclePersonnes.values()].filter((p) => p.cycle_id === cycle.cycle_id && p.role_cycle === 'PARTICIPANT').length,
          metrics: {
            populationDistincte: [...cyclePersonnes.values()].filter((p) => p.cycle_id === cycle.cycle_id && p.role_cycle === 'PARTICIPANT').length,
            participantsReconnusDistincts: 0,
            effectifEngageCycle: 0,
            tauxParticipationCycle: { percentage: null, numerator: 0, denominator: 0 }
          }
        })) };
      },
      async getCycle(id) {
        const cycle = cycles.get(id);
        if (!cycle) throw new ScopeApiError(404, { error: 'cycle_introuvable', message: 'Cycle introuvable.' });
        const evs = [...evenements.values()].filter((e) => e.cycle_id === id);
        const rows = [...cyclePersonnes.values()].filter((p) => p.cycle_id === id).map((row) => Object.assign({}, row, personnes.get(row.personne_id) || {}));
        return { ok: true, cycle: Object.assign({}, cycle), evenements: evs, personnes: rows, metrics: {
          populationDistincte: rows.filter((p) => p.role_cycle === 'PARTICIPANT').length,
          participantsReconnusDistincts: 0,
          nonRenseignesDistincts: 0,
          formateursDistincts: rows.filter((p) => p.role_cycle === 'FORMATEUR').length,
          moniteursDistincts: rows.filter((p) => p.role_cycle === 'MONITEUR').length,
          surveillantsDistincts: rows.filter((p) => p.role_cycle === 'SURVEILLANT').length,
          auxiliairesDistincts: rows.filter((p) => p.role_cycle === 'AUXILIAIRE').length,
          effectifEngageCycle: 0,
          tauxParticipationCycle: { percentage: null, numerator: 0, denominator: rows.filter((p) => p.role_cycle === 'PARTICIPANT').length },
          sessionCounts: evs.map((e) => ({ eventId: e.evenement_id, codeCours: e.code_cours || null, date: e.date, population: 0, presents: 0 })),
          distributionSessions: []
        } };
      },
      async createCycle(body) {
        const id = uid();
        const cycle = {
          cycle_id: id,
          cycle_key: body.cycleKey || body.cycle_key || null,
          annee: Number(body.annee || new Date().getFullYear()),
          domaine_code: body.domaineCode || body.domaine_code || 'PR',
          type_cycle: body.typeCycle || body.type_cycle || 'ALTERNATIF',
          libelle: String(body.libelle || '').trim(),
          statut: body.statut || 'PLANIFIE',
          stat_com: body.statCom || body.stat_com || null,
          qui: body.qui || null,
          date_debut: body.dateDebut || body.date_debut || null,
          date_fin: body.dateFin || body.date_fin || null
        };
        cycles.set(id, cycle);
        return this.getCycle(id);
      },
      async patchCycle(id, body) {
        const cycle = cycles.get(id);
        if (!cycle) throw new ScopeApiError(404, { error: 'cycle_introuvable', message: 'Cycle introuvable.' });
        Object.assign(cycle, body || {});
        return this.getCycle(id);
      },
      async attachCycleEvent(id, body) {
        const ev = evenements.get(body.evenementId || body.evenement_id);
        if (!ev) throw new ScopeApiError(404, { error: 'evenement_introuvable', message: 'Événement introuvable.' });
        ev.cycle_id = id;
        return this.getCycle(id);
      },
      async detachCycleEvent(id, body) {
        const ev = evenements.get(body.evenementId || body.evenement_id);
        if (ev && ev.cycle_id === id) ev.cycle_id = null;
        return this.getCycle(id);
      },
      async upsertCyclePersonne(id, body) {
        let personneId = body.personneId || body.personne_id;
        if (!personneId && body.nip) {
          const p = [...personnes.values()].find((row) => row.nip === String(body.nip));
          personneId = p && p.personne_id;
        }
        if (!personneId) throw new ScopeApiError(404, { error: 'personne_introuvable', message: 'Personne introuvable.' });
        const role = body.roleCycle || body.role_cycle || 'PARTICIPANT';
        cyclePersonnes.set(cyclePersonKey(id, personneId, role), {
          cycle_id: id,
          personne_id: personneId,
          role_cycle: role,
          statut_cycle: body.statutCycle || body.statut_cycle || 'ACTIF',
          session_event_id: body.sessionEventId || body.session_event_id || null,
          participated_event_id: body.participatedEventId || body.participated_event_id || null
        });
        return this.getCycle(id);
      },
      async removeCyclePersonne(id, body) {
        cyclePersonnes.delete(cyclePersonKey(id, body.personneId || body.personne_id, body.roleCycle || body.role_cycle));
        return this.getCycle(id);
      },
      async proposeCycle() { return { ok: true, proposition: { action: 'REVIEW_REQUIRED', automatic: false, evidence: [] } }; },
      async previewAttendus(id) { return Object.assign({ ok: true }, previewOf(id)); },
      async figer(id, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        if (evenement.population_figee) throw new ScopeApiError(422, { error: 'deja_figee', message: 'La population est déjà figée.' });
        const preview = previewOf(id);
        preview.personnes.forEach((p) => {
          attendus.set(key(id, p.personneId), {
            evenement_id: id, personne_id: p.personneId, inclus: true, origine: 'REGLE', motif_inclusion: p.motifInclusion
          });
          participations.set(key(id, p.personneId), {
            evenement_id: id, personne_id: p.personneId, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION'
          });
        });
        evenement.population_figee = true;
        evenement.population_version += 1;
        bump(evenement);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version, count: preview.count };
      },
      async ajouterException(id, body, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        if (!evenement.population_figee) throw new ScopeApiError(422, { error: 'population_non_figee', message: 'Figer la population avant d’ajouter une exception.' });
        const personneId = body.personneId || body.personne_id;
        const existing = attendus.get(key(id, personneId));
        if (existing && existing.inclus) throw new ScopeApiError(422, { error: 'doublon', message: 'Cette personne est déjà attendue.' });
        attendus.set(key(id, personneId), {
          evenement_id: id, personne_id: personneId, inclus: true, origine: 'EXCEPTION_AJOUT', motif_inclusion: 'exception_ajout'
        });
        participations.set(key(id, personneId), {
          evenement_id: id, personne_id: personneId, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'EXCEPTION'
        });
        bump(evenement);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async retirerAttendu(id, body, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        const personneId = body.personneId || body.personne_id;
        const attendu = attendus.get(key(id, personneId));
        if (!attendu) throw new ScopeApiError(404, { error: 'attendu_introuvable', message: 'Attendu introuvable.' });
        attendu.inclus = false;
        attendu.origine_retrait = 'EXCEPTION_RETRAIT';
        const part = participations.get(key(id, personneId));
        if (part) part.statut = 'NON_CONCERNE';
        bump(evenement);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async enregistrerParticipations(id, items, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        (items || []).forEach((item) => {
          const personneId = item.personneId || item.personne_id;
          const attendu = attendus.get(key(id, personneId));
          if (!attendu || attendu.inclus === false) {
            throw new ScopeApiError(422, { error: 'non_attendu', message: 'Saisie réservée aux personnes attendues incluses.' });
          }
          const part = participations.get(key(id, personneId)) || { evenement_id: id, personne_id: personneId, role: 'PARTICIPANT' };
          part.statut = item.statut;
          part.motif_absence = item.motif_absence || item.motifAbsence || null;
          part.commentaire = item.commentaire || null;
          part.role = item.role === 'FORMATEUR' && item.statut === 'PRESENT' ? 'FORMATEUR' : 'PARTICIPANT';
          part.source = 'SAISIE';
          participations.set(key(id, personneId), part);
        });
        bump(evenement);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async ajouterEncadrement(id, body, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        const personneId = body.personneId || body.personne_id;
        const attendu = attendus.get(key(id, personneId));
        const existing = participations.get(key(id, personneId));
        if (existing && ['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(existing.role)) {
          throw new ScopeApiError(422, { error: 'deja_encadrement', message: 'Cette personne est déjà ajoutée à l’encadrement.' });
        }
        if (existing && existing.statut !== 'NON_CONCERNE' && !(attendu && attendu.inclus)) {
          throw new ScopeApiError(422, { error: 'doublon', message: 'Une participation existe déjà pour cette personne.' });
        }
        const attenduInclus = attendu && attendu.inclus;
        participations.set(key(id, personneId), {
          evenement_id: id,
          personne_id: personneId,
          statut: attenduInclus && ['FORMATEUR', 'SURVEILLANT'].includes(body.role) ? 'PRESENT' : 'NON_CONCERNE',
          role: body.role,
          source: 'ENCADREMENT'
        });
        bump(evenement);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async resetParticipations(id, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        const expected = [...attendus.values()].filter((a) => a.evenement_id === id && a.inclus !== false);
        const expectedIds = new Set(expected.map((a) => a.personne_id));
        for (const a of expected) {
          const existing = participations.get(key(id, a.personne_id)) || { evenement_id: id, personne_id: a.personne_id };
          participations.set(key(id, a.personne_id), Object.assign({}, existing, {
            statut: 'NON_RENSEIGNE',
            motif_absence: null,
            commentaire: null,
            role: 'PARTICIPANT',
            source: 'RESET'
          }));
        }
        [...participations.values()].forEach((p) => {
          if (p.evenement_id === id && ['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(p.role) && !expectedIds.has(p.personne_id)) {
            participations.delete(key(id, p.personne_id));
          }
        });
        bump(evenement);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async retirerEncadrement(id, body, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        const personneId = body.personneId || body.personne_id;
        const part = participations.get(key(id, personneId));
        if (!part || !['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(part.role)) {
          throw new ScopeApiError(404, { error: 'encadrement_introuvable', message: 'Encadrement introuvable.' });
        }
        participations.delete(key(id, personneId));
        bump(evenement);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async cloturer(id, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        if (evenement.mode_suivi === 'QUANTITATIF') {
          const saisie = quantitatives.get(id);
          if (!saisie) throw new ScopeApiError(422, { error: 'saisie_manquante', message: 'Saisissez les volumes avant de clôturer.' });
          evenement.statut = 'REALISE';
          bump(evenement);
          journal.push({ entite: 'evenement', entite_id: id, action: 'CLOTURER', at: new Date().toISOString() });
          return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version, taux: { numerator: saisie.nb_presents, denominator: saisie.nb_presents + saisie.nb_excuses + saisie.nb_non_excuses, percentage: null } };
        }
        const att = [...attendus.values()].filter((a) => a.evenement_id === id && a.inclus !== false);
        const errors = [];
        att.forEach((a) => {
          const p = participations.get(key(id, a.personne_id));
          if (p && p.statut === 'ABSENT_EXCUSE' && !p.motif_absence) {
            errors.push({ code: 'motif_absence_obligatoire', personne_id: a.personne_id, message: 'Une absence excusée doit avoir un motif.' });
          }
        });
        if (errors.length) {
          throw new ScopeApiError(422, { error: 'cloture_refusee', message: 'Clôture refusée.', details: { errors } });
        }
        evenement.statut = 'REALISE';
        bump(evenement);
        const parts = [...participations.values()].filter((p) => p.evenement_id === id);
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version, taux: computeTaux(parts, att) };
      },
      async reouvrir(id, motif, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        if (!String(motif || '').trim()) throw new ScopeApiError(400, { error: 'motif_obligatoire', message: 'La réouverture exige un motif.' });
        evenement.statut = 'PLANIFIE';
        bump(evenement);
        journal.push({ entite: 'evenement', entite_id: id, action: 'REOUVRIR', commentaire: String(motif), at: new Date().toISOString() });
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async annuler(id, motif, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        if (!String(motif || '').trim()) throw new ScopeApiError(400, { error: 'motif_obligatoire', message: 'L’annulation exige un motif.' });
        evenement.statut = 'ANNULE';
        bump(evenement);
        journal.push({ entite: 'evenement', entite_id: id, action: 'ANNULER', commentaire: String(motif), at: new Date().toISOString() });
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async taux(id) {
        const ficheData = fiche(id);
        const officiel = ficheData.evenement.statut === 'REALISE';
        return { ok: true, taux: Object.assign({}, ficheData.compteurs, { officiel }) };
      },
      async suggestModeSuivi() {
        return {
          ok: true,
          suggested: 'QUANTITATIF',
          requireExplicit: false,
          message: 'Mode proposé : Quantitatif.'
        };
      },
      async previewTauxQuantitatif(id, body) {
        getEvent(id);
        const attendusN = Number(body.attendus);
        const presents = Number(body.presents);
        const excuses = Number(body.excuses);
        const nonExcuses = Number(body.nonExcuses);
        const dispenses = body.dispenses === undefined || body.dispenses === '' ? 0 : Number(body.dispenses);
        const equal = attendusN === presents + excuses + nonExcuses + dispenses;
        return {
          ok: true,
          valide: equal,
          officiel: false,
          taux: equal ? { numerator: presents, denominator: presents + excuses + nonExcuses, percentage: null, source: 'PREVIEW' } : null,
          message: equal
            ? 'Aperçu. Ce n’est pas encore un taux officiel réalisé.'
            : 'Présents + excusés + non excusés + dispensés doit être égal aux attendus.'
        };
      },
      async enregistrerSaisieQuantitative(id, body, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        if (evenement.mode_suivi !== 'QUANTITATIF') {
          throw new ScopeApiError(422, { error: 'mode_non_quantitatif', message: 'Cette action concerne uniquement le suivi quantitatif.' });
        }
        const row = {
          evenement_id: id,
          nb_attendus: Number(body.attendus),
          nb_presents: Number(body.presents),
          nb_excuses: Number(body.excuses),
          nb_non_excuses: Number(body.nonExcuses),
          nb_dispenses: body.dispenses === undefined || body.dispenses === '' ? 0 : Number(body.dispenses)
        };
        quantitatives.set(id, row);
        bump(evenement);
        journal.push({ entite: 'evenement', entite_id: id, action: 'SAISIE_QUANTITATIVE', at: new Date().toISOString() });
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version, saisie: row };
      },
      async convertirNominatif(id, body, baseVersion) {
        const evenement = getEvent(id);
        requireVersion(evenement, baseVersion);
        if (!body || body.confirmation !== true) {
          throw new ScopeApiError(400, { error: 'confirmation_requise', message: 'Confirmez la conversion : les volumes quantitatifs seront supprimés.' });
        }
        quantitatives.delete(id);
        evenement.mode_suivi = 'NOMINATIF';
        bump(evenement);
        journal.push({ entite: 'evenement', entite_id: id, action: 'CONVERTIR_NOMINATIF', at: new Date().toISOString() });
        return { ok: true, evenement: Object.assign({}, evenement), version: evenement.version };
      },
      async convertirQuantitatif() {
        throw new ScopeApiError(422, { error: 'conversion_interdite', message: 'La conversion nominatif → quantitatif est interdite.' });
      },
      async dashboard(params) {
        const year = String((params && (params.year || params.annee)) || '2026');
        const preset = String((params && params.preset) || 'YEAR').toUpperCase();
        const empty = {
          percentage: null,
          numerator: 0,
          denominator: 0,
          eventCount: 0,
          kind: 'OFFICIEL',
          volumes: { presents: 0, excuses: 0, nonExcuses: 0, dispenses: 0 },
          objective: null,
          gapPct: null,
          analyticStatus: 'NON_EVALUABLE',
          analyticStatusReason: 'denominator_zero',
          objectiveContext: { homogeneous: true, distinctObjectives: [], reason: 'OBJECTIVE_NOT_FOUND' }
        };
        const today = new Date().toISOString().slice(0, 10);
        const inbox = [...evenements.values()]
          .filter((ev) => ev.statut === 'PLANIFIE' && String(ev.date).slice(0, 4) === year)
          .map((ev) => {
            const echu = ev.date < today;
            const mode = ev.mode_suivi || 'NOMINATIF';
            if (!echu) return null;
            if (ev.origine === 'LEGACY_AGGREGATED' || mode === 'LEGACY') return null;
            let reasonCode = 'ECHU_PLANIFIE';
            let reason = 'La date est passée et l’exercice reste planifié.';
            let message = 'Exercice échu non clôturé';
            let label = 'Ouvrir la fiche';
            let href = `#/exercices/${ev.evenement_id}`;
            let action = 'ouvrir';
            if (mode === 'QUANTITATIF') {
              reasonCode = 'QUANTITATIF_INCOMPLET';
              reason = 'Aucune saisie quantitative exploitable.';
              message = 'Saisie des volumes incomplète';
              label = 'Saisir les présences';
              action = 'saisir-volumes';
              href = `#/exercices/${ev.evenement_id}/saisie`;
            } else if (!ev.population_figee) {
              reasonCode = 'NOMINATIF_NON_FIGE';
              reason = 'L’exercice est échu. La liste des participants doit être figée avant la saisie.';
              message = 'Population non figée';
              label = 'Figer la population';
              action = 'figer';
            }
            return {
              evenementId: ev.evenement_id,
              date: ev.date,
              domaine: ev.domaine_code,
              libelle: ev.libelle,
              modeSuivi: mode,
              cibles: [],
              reasonCode,
              reason,
              cta: { action, label, href },
              alert: {
                fingerprint: `${reasonCode}|EVENEMENT|${ev.evenement_id}`,
                code: reasonCode,
                level: 'P0',
                levelLabel: 'Action requise',
                category: 'OPERATIONNEL',
                title: ev.libelle,
                message,
                reason,
                scope: 'EVENEMENT',
                entityType: 'EVENEMENT',
                entityId: ev.evenement_id,
                domainCode: ev.domaine_code,
                eventId: ev.evenement_id,
                eventDate: ev.date,
                action,
                actionLabel: label,
                actionHref: href,
                createdFrom: 'ALERTS-1',
                evaluable: true,
                metadata: { modeSuivi: mode, cibles: [] }
              }
            };
          })
          .filter(Boolean);
        const alerts = inbox.map((row) => row.alert);
        return {
          ok: true,
          period: { from: `${year}-01-01`, to: `${year}-12-31`, preset },
          analysisGrain: 'SDIS',
          officiel: empty,
          legacy: { kind: 'LEGACY', eventCount: 0, points: [], globalKpi: null },
          absencesNonExcusees: { count: 0, events: [] },
          domaines: DOMAINES.map((d) => ({
            code: d.code,
            libelle: d.libelle,
            libelleAffiche: d.code === 'PR' ? 'PR' : d.code,
            officiel: Object.assign({}, empty)
          })),
          cibles: [],
          evenements: [],
          timeseries: { officiel: [], legacy: [] },
          inbox: inbox.map((row) => ({
            evenementId: row.evenementId,
            date: row.date,
            domaine: row.domaine,
            libelle: row.libelle,
            modeSuivi: row.modeSuivi,
            cibles: row.cibles,
            reasonCode: row.reasonCode,
            reason: row.reason,
            cta: row.cta
          })),
          alerts: {
            period: { from: `${year}-01-01`, to: `${year}-12-31`, preset },
            today,
            timezone: 'Europe/Zurich',
            counts: { total: alerts.length, p0: alerts.length, p1: 0, p2: 0 },
            alerts,
            config: { timezone: 'Europe/Zurich', jMinusUnfrozen: null }
          },
          explain: {
            period: { from: `${year}-01-01`, to: `${year}-12-31`, preset },
            perimeter: { domaine: null, cible: null },
            kind: 'OFFICIEL',
            totals: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 },
            exclusions: { legacy: 0, annules: 0, reportes: 0, dispenses: 0 },
            includedEvents: [],
            excludedEvents: [],
            objective: null,
            analyticStatus: 'NON_EVALUABLE',
            analyticStatusReason: 'denominator_zero',
            gapPct: null
          },
          vigilanceMarginPct: null,
          graphs: {
            contract: 'SCOPE-GRAPH-1',
            renderer: 'svg',
            pdfReady: true,
            period: { from: `${year}-01-01`, to: `${year}-12-31`, preset },
            perimeter: { domaine: null, cible: null },
            evolution: {
              id: 'evolution',
              question: 'Comment évolue notre taux de participation ?',
              type: 'line',
              emptyReason: 'AUCUNE_SERIE_OFFICIELLE',
              series: [
                { id: 'officiel', kind: 'OFFICIEL', label: 'Taux officiel', points: [] },
                { id: 'legacy', kind: 'LEGACY', label: 'Historique agrégé (LEGACY)', points: [] }
              ]
            },
            domaines: { id: 'domaines', question: 'Quels domaines contribuent aux écarts de participation ?', type: 'bar', emptyReason: 'NON_EVALUABLE', series: [{ id: 'domaines', kind: 'OFFICIEL', points: [] }] },
            children: { id: 'children', emptyReason: 'CONTEXTE_SDIS', series: [] },
            composition: { id: 'composition', question: 'De quoi est composé le résultat de participation ?', type: 'stacked', emptyReason: 'AUCUNE_COMPOSITION', series: [{ points: [] }] },
            motifs: { id: 'motifs', question: 'Pourquoi le personnel est-il excusé ?', type: 'bar', emptyReason: 'AUCUN_MOTIF', series: [{ points: [] }] },
            permutations: { id: 'permutations', emptyReason: 'HORS_DAP', series: [] }
          }
        };
      },
      async listAlerts(params) {
        const dash = await this.dashboard(params);
        return { ok: true, period: dash.alerts.period, counts: dash.alerts.counts, alerts: dash.alerts.alerts, config: dash.alerts.config };
      },
      async acquitterAlerte() {
        return { ok: true, hidesAlert: true, note: 'Démonstration : aucun acquittement persisté.' };
      },
      async listObjectifs() {
        return { ok: true, objectifs: [...objectifs.values()] };
      },
      async createObjectif(body) {
        const portee = String(body.portee || '').toUpperCase();
        const seuilPct = Number(body.seuilPct);
        if (!['GLOBAL', 'DOMAINE', 'CIBLE'].includes(portee)) {
          throw new ScopeApiError(400, { error: 'portee_invalide', message: 'La portée doit être GLOBAL, DOMAINE ou CIBLE.' });
        }
        if (!Number.isFinite(seuilPct) || seuilPct < 0 || seuilPct > 100) {
          throw new ScopeApiError(422, { error: 'seuil_invalide', message: 'Le seuil doit être compris entre 0 et 100 %.' });
        }
        const dateDebut = String(body.dateDebut || '').slice(0, 10);
        const dateFin = body.dateFin ? String(body.dateFin).slice(0, 10) : null;
        if (!dateDebut) throw new ScopeApiError(400, { error: 'date_debut_obligatoire', message: 'La date de début est obligatoire.' });
        if (dateFin && dateFin < dateDebut) {
          throw new ScopeApiError(422, { error: 'dates_incoherentes', message: 'La date de fin ne peut pas être antérieure au début.' });
        }
        const row = {
          objectifId: uid(),
          scope: portee,
          thresholdPct: seuilPct,
          dateDebut,
          dateFin,
          domaineCode: portee === 'GLOBAL' ? null : (body.domaineCode || null),
          cibleId: portee === 'CIBLE' ? (body.cibleId || null) : null,
          actif: true,
          commentaire: body.commentaire || null,
          statut: dateFin ? 'CLOTURE' : 'OUVERT'
        };
        const key = portee === 'GLOBAL' ? 'GLOBAL' : portee === 'DOMAINE' ? `DOMAINE:${row.domaineCode}` : `CIBLE:${row.cibleId}`;
        for (const existing of objectifs.values()) {
          if (existing.actif === false) continue;
          const existingKey = existing.scope === 'GLOBAL' ? 'GLOBAL' : existing.scope === 'DOMAINE' ? `DOMAINE:${existing.domaineCode}` : `CIBLE:${existing.cibleId}`;
          if (existingKey !== key) continue;
          const aEnd = existing.dateFin || '9999-12-31';
          const bEnd = row.dateFin || '9999-12-31';
          if (existing.dateDebut <= bEnd && dateDebut <= aEnd) {
            throw new ScopeApiError(422, { error: 'chevauchement_objectif', message: 'Cette période chevauche un objectif déjà défini pour la même portée.' });
          }
        }
        objectifs.set(row.objectifId, row);
        return { ok: true, objectif: row };
      },
      async cloturerObjectif(id, body) {
        const row = objectifs.get(id);
        if (!row) throw new ScopeApiError(404, { error: 'objectif_introuvable', message: 'Objectif introuvable.' });
        row.dateFin = String(body.dateFin || '').slice(0, 10);
        row.statut = 'CLOTURE';
        return { ok: true, objectif: row };
      },
      async nouvellePeriodeObjectif(id, body) {
        const current = objectifs.get(id);
        if (!current) throw new ScopeApiError(404, { error: 'objectif_introuvable', message: 'Objectif introuvable.' });
        const dateDebut = String(body.dateDebut || '').slice(0, 10);
        const prev = new Date(`${dateDebut}T00:00:00.000Z`);
        prev.setUTCDate(prev.getUTCDate() - 1);
        current.dateFin = prev.toISOString().slice(0, 10);
        current.statut = 'CLOTURE';
        return this.createObjectif({
          portee: current.scope,
          domaineCode: current.domaineCode,
          cibleId: current.cibleId,
          dateDebut,
          dateFin: body.dateFin || null,
          seuilPct: body.seuilPct,
          commentaire: body.commentaire
        });
      },
      async desactiverObjectif(id) {
        const row = objectifs.get(id);
        if (!row) throw new ScopeApiError(404, { error: 'objectif_introuvable', message: 'Objectif introuvable.' });
        row.actif = false;
        row.statut = 'NEUTRALISE';
        return { ok: true, objectif: row };
      },
      async generateReport() {
        throw new ScopeApiError(501, {
          error: 'reports_live_only',
          message: 'La génération PDF est disponible en mode LIVE uniquement. Le moteur PDF s’exécute sur le serveur SCOPE.'
        });
      },
      async listPersonnelDirectory() {
        return {
          ok: true,
          personnes: [],
          count: 0,
          filter: 'actifs',
          performance: { mode: 'demo', note: 'Démonstration : aucun nominatif réel.' }
        };
      },
      async getPersonneFiche() {
        throw new ScopeApiError(501, {
          error: 'person_live_only',
          message: 'La fiche individuelle nominative est disponible en mode LIVE uniquement.'
        });
      },
      async patchObjectif(id, body) {
        const row = objectifs.get(id);
        if (!row) throw new ScopeApiError(404, { error: 'objectif_introuvable', message: 'Objectif introuvable.' });
        if (body.commentaire !== undefined) row.commentaire = String(body.commentaire);
        return { ok: true, objectif: row };
      }
    };
  }

  return { createDemoClient };
});
