'use strict';
/**
 * SCOPE-PERSON-1 — fiche individuelle nominative.
 * Réutilise analytics.evaluate / snapshot. Aucun second moteur de taux.
 * QUANTITATIF et LEGACY ne sont jamais attribués à une personne.
 */
const { HttpError, isoDate, isAffectationValide } = require('./_scope-rules');
const { parsePeriod } = require('./_scope-period');
const { createScopeAnalyticsService } = require('./_scope-analytics-service');
const {
  ROOT_DOMAINES,
  familyCodes,
  packFromEvents,
  pointFromPack,
  evolutionDataset,
  compositionDataset,
  personRepartitionDataset,
  domainesAnneesDataset,
  motifsDataset,
  permutationsDataset
} = require('./_scope-graphs');
const { isPrincipalOi } = require('./_scope-personnel-sync-contract');
const { TYPES_PERIODE } = require('./_scope-personnel');
const { ALERTS_CONFIG } = require('./_scope-alerts');
const { isTestPersonnelNip, wantsQualification } = require('./_scope-qualification');
const display = require('../../assets/js/scope-personnel-display.js');

function isArchivedStatut(statut){
  return statut === 'SORTI' || statut === 'DEMISSIONNAIRE';
}

function labelOi(cible){
  if(!cible) return null;
  const domaine = cible.domaine_code || cible.domaineCode;
  const niveau = cible.niveau_code || cible.niveauCode;
  if(!domaine || !niveau) return null;
  return `${domaine}/${niveau}`;
}

function affectationPayload(row){
  if(!row) return null;
  return {
    cibleId: row.aff.cible_id,
    label: row.label,
    domaineCode: row.cible && row.cible.domaine_code,
    niveauCode: row.cible && row.cible.niveau_code,
    dateDebut: row.aff.date_debut,
    dateFin: row.aff.date_fin
  };
}

function coveringAffectations(affectations, date){
  return (affectations || []).filter((row) => isAffectationValide(row, date));
}

function principalOi(affectations, ciblesById, date){
  const covering = coveringAffectations(affectations, date);
  const enriched = covering.map((aff) => {
    const cible = ciblesById.get(aff.cible_id) || null;
    return {
      aff,
      cible,
      label: labelOi(cible),
      principal: cible ? isPrincipalOi(cible.domaine_code, cible.niveau_code) : false
    };
  });
  return enriched.find((row) => row.principal) || enriched[0] || null;
}

async function plannedExpectedEvents(repo, personneId, period, affectations, ciblesById){
  if(!repo.listEvenements) return [];
  const events = (await repo.listEvenements({ statut: 'PLANIFIE' }) || [])
    .filter((event) => event && event.date >= period.from && event.date <= period.to);
  if(!events.length) return [];
  const ids = events.map((event) => event.evenement_id).filter(Boolean);
  const [attendusRows, participationsRows, ciblesRows] = await Promise.all([
    repo.listAttendusForEvents ? repo.listAttendusForEvents(ids) : [],
    repo.listParticipationsForEvents ? repo.listParticipationsForEvents(ids) : [],
    repo.listEventCiblesForEvents ? repo.listEventCiblesForEvents(ids) : []
  ]);
  const expectedEvents = new Set((attendusRows || [])
    .filter((row) => String(row.personne_id) === String(personneId) && row.inclus !== false)
    .map((row) => String(row.evenement_id)));
  if(!expectedEvents.size) return [];
  const participationsByEvent = new Map();
  for(const row of participationsRows || []){
    if(String(row.personne_id) === String(personneId)) participationsByEvent.set(String(row.evenement_id), row);
  }
  const ciblesByEvent = new Map();
  for(const row of ciblesRows || []){
    const eventId = String(row.evenement_id);
    if(!ciblesByEvent.has(eventId)) ciblesByEvent.set(eventId, []);
    ciblesByEvent.get(eventId).push(row.cible_id);
  }
  return events
    .filter((event) => expectedEvents.has(String(event.evenement_id)))
    .map((event) => {
      const eventCibles = (ciblesByEvent.get(String(event.evenement_id)) || [])
        .map((cid) => labelOi(ciblesById.get(cid)))
        .filter(Boolean);
      const part = participationsByEvent.get(String(event.evenement_id));
      return {
        evenementId: event.evenement_id,
        date: event.date,
        libelle: event.libelle,
        domaine: event.domaine_code,
        sousDomaine: event.sous_domaine_code || null,
        cibles: eventCibles,
        oiAtDate: (principalOi(affectations, ciblesById, event.date) || {}).label || null,
        oiAccueil: null,
        permutation: false,
        statutEvenement: event.statut,
        statutParticipation: part ? part.statut : 'NON_RENSEIGNE',
        motif: part && part.motif_absence ? part.motif_absence : null,
        href: `#/exercices/${event.evenement_id}`,
        volumes: null,
        numerator: 0,
        denominator: 0,
        percentage: null,
        appliedObjective: null,
        planned: true
      };
    });
}

function openRows(periodes, types){
  return (periodes || []).filter((row) => types.includes(row.type) && !row.date_fin);
}

function periodOverlap(startA, endA, startB, endB){
  const a2 = endA || '9999-12-31';
  const b2 = endB || '9999-12-31';
  return String(startA) <= String(b2) && String(startB) <= String(a2);
}

function statutLabel(personne, periodes){
  const archive = openRows(periodes, [TYPES_PERIODE.SORTI, TYPES_PERIODE.DEMISSIONNAIRE])[0];
  if(archive){
    return archive.type === TYPES_PERIODE.DEMISSIONNAIRE ? 'DEMISSIONNAIRE' : 'SORTI';
  }
  if(openRows(periodes, [TYPES_PERIODE.INDISPONIBLE]).length) return 'INDISPONIBLE';
  return personne.statut_rh || 'ACTIF';
}

function matchesOi(label, oiFilter){
  if(!oiFilter) return true;
  if(!label) return false;
  const a = String(label).toUpperCase().replace(/\s+/g, '');
  const b = String(oiFilter).toUpperCase().replace(/\s+/g, '');
  const compactA = a.replace(/\//g, '');
  const compactB = b.replace(/\//g, '');
  return a === b
    || compactA === compactB
    || a.endsWith(`/${b}`)
    || a.split('/')[1] === b;
}

function visibleInDirectory({ archived, test }, statutFilter, searching, includeQualification){
  if(test && !includeQualification) return false;
  if(statutFilter === 'archives') return archived;
  if(statutFilter === 'actifs') return !archived;
  return true;
}

function congeLibelle(row){
  if(!row) return null;
  const fin = row.date_fin ? ` au ${row.date_fin}` : '';
  if(row.motif === 'CONGE_SABBATIQUE') return `Congé sabbatique du ${row.date_debut}${fin}`;
  return `Indisponible du ${row.date_debut}${fin}`;
}

function identityPayload(personne, periodes, affectations, ciblesById, today, period){
  const archive = openRows(periodes, [TYPES_PERIODE.SORTI, TYPES_PERIODE.DEMISSIONNAIRE])[0];
  const conge = openRows(periodes, [TYPES_PERIODE.INDISPONIBLE])[0]
    || (periodes || []).find((row) =>
      row.type === TYPES_PERIODE.INDISPONIBLE
      && periodOverlap(row.date_debut, row.date_fin, period.from, period.to)
    )
    || null;
  const current = principalOi(affectations, ciblesById, today);
  const openAff = coveringAffectations(affectations, today);
  return {
    personneId: personne.personne_id,
    nip: personne.nip,
    nom: personne.nom,
    prenom: personne.prenom,
    grade: personne.grade || null,
    dateEntreeSdis: personne.date_entree_sdis || personne.date_entree || null,
    statutRh: statutLabel(personne, periodes),
    actif: !archive,
    archivee: Boolean(archive),
    libelleStatut: archive
      ? (archive.type === 'DEMISSIONNAIRE' ? 'Personne démissionnaire' : 'Personne archivée')
      : (conge && !conge.date_fin ? 'Congé / indisponible' : 'Personne active'),
    conge: conge ? {
      motif: conge.motif,
      dateDebut: conge.date_debut,
      dateFin: conge.date_fin,
      libelle: congeLibelle(conge)
    } : null,
    oiActuel: affectationPayload(current),
    affectationsOuvertes: openAff.map((aff) => {
      const cible = ciblesById.get(aff.cible_id);
      return {
        affectationId: aff.affectation_id,
        cibleId: aff.cible_id,
        label: labelOi(cible),
        domaineCode: cible && cible.domaine_code,
        niveauCode: cible && cible.niveau_code,
        dateDebut: aff.date_debut,
        dateFin: aff.date_fin
      };
    })
  };
}

function personGraphs(evaluated, series, explain, careerEvents){
  const included = evaluated.includedEvents || [];
  const career = careerEvents || included;
  const evolution = evolutionDataset({
    officiel: (series && series.officiel) || [],
    legacy: []
  }, explain);
  evolution.question = 'La participation de cette personne évolue-t-elle ?';
  const domainPoints = ROOT_DOMAINES.map((code) => {
    const codes = familyCodes(code);
    const events = included.filter((row) => codes.includes(row.domaine));
    const pack = packFromEvents(events);
    return pointFromPack(code, code === 'PR' ? 'PAPR' : code, pack, null);
  });
  const hasDomain = domainPoints.some((p) => p.eventCount > 0);
  const oiBuckets = new Map();
  for(const row of included){
    const key = row.oiAtDate || row.sousDomaine || row.domaine || '—';
    if(!oiBuckets.has(key)) oiBuckets.set(key, []);
    oiBuckets.get(key).push(row);
  }
  const oiPoints = [...oiBuckets.entries()].map(([label, events]) => {
    return pointFromPack(label, label, packFromEvents(events), null);
  });
  const dapEvents = included.filter((row) => row.domaine === 'DAP');
  return {
    evolution,
    domaines: {
      id: 'domaines',
      question: 'Comment cette personne participe-t-elle par domaine ?',
      type: 'bar',
      kind: 'OFFICIEL',
      series: [{ id: 'domaines', kind: 'OFFICIEL', label: 'Domaines', points: hasDomain ? domainPoints : [] }],
      emptyReason: hasDomain ? null : 'NON_EVALUABLE',
      explain: explain ? { period: explain.period, totals: explain.totals } : null
    },
    domainesAnnees: domainesAnneesDataset(career, explain),
    children: {
      id: 'children',
      question: 'Selon quel OI la personne était-elle affectée à la date de l’événement ?',
      type: 'bar',
      kind: 'OFFICIEL',
      series: [{ id: 'oi', kind: 'OFFICIEL', label: 'OI à la date', points: oiPoints }],
      emptyReason: oiPoints.length ? null : 'NON_EVALUABLE'
    },
    composition: compositionDataset(evaluated.officiel, explain),
    repartition: personRepartitionDataset(evaluated.officiel, explain),
    motifs: motifsDataset(evaluated.officiel, explain),
    permutations: permutationsDataset(evaluated.officiel, dapEvents.length ? 'DAP' : null, explain)
  };
}

function createScopePersonService(repo){
  const analytics = createScopeAnalyticsService(repo);

  function actorId(actor){
    return actor && (actor.sub || actor.email || actor.userId || actor.nip || actor.id) || null;
  }

  function cleanedIdentityPatch(body = {}){
    const nom = String(body.nom || '').trim();
    const prenom = String(body.prenom || '').trim();
    if(!nom) throw new HttpError(400, 'nom_obligatoire', 'Le nom est obligatoire.');
    if(!prenom) throw new HttpError(400, 'prenom_obligatoire', 'Le prénom est obligatoire.');
    const dateEntree = body.dateEntreeSdis || body.date_entree_sdis || body.dateEntree || body.date_entree || null;
    return {
      grade: String(body.grade || '').trim() || null,
      nom,
      prenom,
      date_entree_sdis: dateEntree ? isoDate(dateEntree) : null
    };
  }

  async function ciblesMap(){
    const cibles = await repo.listCibles();
    return new Map(cibles.map((c) => [c.cible_id, c]));
  }

  async function directory(query = {}){
    const period = parsePeriod(query);
    const q = String(query.q || query.search || '').trim();
    const statutFilter = String(query.statut || query.filter || 'actifs').toLowerCase();
    const oiFilter = String(query.oi || query.cible || '').trim();
    const domaineFilter = String(query.domaine || query.domaineCode || '').trim().toUpperCase();
    const today = isoDate(query.date) || isoDate(new Date().toISOString());
    const [personnes, affectations, cibles, periodes, ratesBundle] = await Promise.all([
      repo.listPersonnes({ q: q || undefined }),
      repo.listAffectations({}),
      repo.listCibles(),
      typeof repo.listAllPeriodes === 'function' ? repo.listAllPeriodes() : Promise.resolve([]),
      analytics.directoryRates({
        from: period.from,
        to: period.to,
        preset: period.preset,
        year: period.year,
        month: period.month,
        quarter: period.quarter,
        includeQualification: query.includeQualification,
        include_qualification: query.include_qualification
      })
    ]);
    const ciblesById = new Map(cibles.map((c) => [c.cible_id, c]));
    const affByPid = new Map();
    for(const aff of affectations){
      const pid = aff.personne_id;
      if(!affByPid.has(pid)) affByPid.set(pid, []);
      affByPid.get(pid).push(aff);
    }
    const perByPid = new Map();
    for(const row of periodes){
      const pid = row.personne_id;
      if(!perByPid.has(pid)) perByPid.set(pid, []);
      perByPid.get(pid).push(row);
    }
    const searching = Boolean(q);
    const includeQualification = wantsQualification(query);
    const rows = [];
    for(const personne of personnes){
      const test = isTestPersonnelNip(personne.nip);
      const persPeriodes = perByPid.get(personne.personne_id) || [];
      const statut = statutLabel(personne, persPeriodes);
      const archived = isArchivedStatut(statut);
      if(!visibleInDirectory({ archived, test }, statutFilter, searching, includeQualification)) continue;
      const affs = affByPid.get(personne.personne_id) || [];
      const current = principalOi(affs, ciblesById, today);
      if(!matchesOi(current && current.label, oiFilter)) continue;
      if(domaineFilter && current && current.cible && current.cible.domaine_code !== domaineFilter) continue;
      const ouvertes = coveringAffectations(affs, today).map((aff) => {
        const cible = ciblesById.get(aff.cible_id);
        return {
          aff,
          cible,
          label: labelOi(cible),
          principal: cible ? isPrincipalOi(cible.domaine_code, cible.niveau_code) : false
        };
      });
      const primary = current || ouvertes[0] || null;
      const primaryAffectation = affectationPayload(primary);
      const otherAffectations = ouvertes
        .filter((row) => !primary || row.aff.affectation_id !== primary.aff.affectation_id)
        .map(affectationPayload)
        .filter(Boolean);
      const rate = (ratesBundle.rates && ratesBundle.rates[personne.personne_id]) || {
        numerator: 0,
        denominator: 0,
        percentage: null,
        eventCount: 0
      };
      rows.push({
        personneId: personne.personne_id,
        nip: personne.nip,
        nom: personne.nom,
        prenom: personne.prenom,
        grade: personne.grade || null,
        statutRh: statut,
        archivee: archived,
        test,
        oiActuel: current ? current.label : null,
        oiPrincipal: primaryAffectation ? primaryAffectation.label : null,
        affectationPrincipale: primaryAffectation,
        autresAffectations: otherAffectations,
        dateActif: primaryAffectation ? primaryAffectation.dateDebut : null,
        dateInactif: primaryAffectation ? primaryAffectation.dateFin : null,
        taux: {
          percentage: rate.percentage,
          numerator: rate.numerator,
          denominator: rate.denominator,
          eventCount: rate.eventCount
        }
      });
    }
    rows.sort((a, b) =>
      String(a.nom).localeCompare(String(b.nom), 'fr')
      || String(a.prenom).localeCompare(String(b.prenom), 'fr')
    );
    return {
      period,
      filter: statutFilter,
      count: rows.length,
      personnes: rows,
      performance: {
        mode: 'batch',
        note: 'Un chargement analytics pour la période, puis agrégation mémoire par personne. Pas de N+1.'
      }
    };
  }

  async function fiche(personneId, query = {}){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const snap = await analytics.snapshot(Object.assign({}, query, { personneId }));
    const [periodes, affectations, ciblesById] = await Promise.all([
      repo.listPersonnesPeriodes(personneId),
      repo.listAffectations({ personneId }),
      ciblesMap()
    ]);
    const today = isoDate(query.date) || isoDate(new Date().toISOString());
    const identity = identityPayload(personne, periodes, affectations, ciblesById, today, snap.summary.period);
    const included = (snap.evaluated.includedEvents || []).map((row) => {
      const oi = principalOi(affectations, ciblesById, row.date);
      const eventCibles = (row.cibleIds || []).map((cid) => labelOi(ciblesById.get(cid))).filter(Boolean);
      const accueil = row.cibleSuivieId ? labelOi(ciblesById.get(row.cibleSuivieId)) : null;
      const statut = row.statutParticipation || 'NON_RENSEIGNE';
      return {
        evenementId: row.evenementId,
        date: row.date,
        libelle: row.libelle,
        domaine: row.domaine,
        sousDomaine: row.sousDomaine,
        cibles: eventCibles,
        oiAtDate: oi ? oi.label : null,
        oiAccueil: accueil,
        permutation: statut === 'PERMUTATION',
        statutParticipation: statut,
        motif: row.motif || null,
        href: `#/exercices/${row.evenementId}`,
        volumes: row.volumes,
        numerator: row.numerator,
        denominator: row.denominator,
        percentage: row.percentage,
        appliedObjective: row.appliedObjective || null
      };
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.libelle).localeCompare(String(a.libelle)));
    const planned = await plannedExpectedEvents(repo, personneId, snap.summary.period, affectations, ciblesById);
    const plannedById = new Map(planned.map((row) => [String(row.evenementId), row]));
    for(const row of included) plannedById.delete(String(row.evenementId));
    const ficheEvents = included.concat([...plannedById.values()])
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.libelle).localeCompare(String(a.libelle)));

    const evaluated = Object.assign({}, snap.evaluated, { includedEvents: included });
    const entry = isoDate(personne.date_entree_sdis || personne.date_entree) || snap.summary.period.from;
    const careerFrom = `${String(entry).slice(0, 4)}-01-01`;
    let careerEvents = included;
    if(careerFrom < snap.summary.period.from){
      const careerSnap = await analytics.snapshot(Object.assign({}, query, {
        personneId,
        from: careerFrom,
        to: snap.summary.period.to,
        preset: 'CUSTOM'
      }));
      careerEvents = (careerSnap.evaluated && careerSnap.evaluated.includedEvents) || included;
    }
    const graphs = personGraphs(evaluated, snap.timeseries, snap.explain, careerEvents);
    const officiel = snap.summary.officiel || {};
    const ctx = officiel.objectiveContext || {};
    let objectifMessage = 'Aucun objectif défini.';
    if(ctx.homogeneous === false && (ctx.distinctObjectives || []).length > 1){
      objectifMessage = 'Plusieurs objectifs ont été applicables sur cette période.';
    } else if(officiel.objective && officiel.objective.thresholdPct != null){
      objectifMessage = `Objectif applicable : ${officiel.objective.thresholdPct} %.`;
    }
    const volumes = officiel.volumes || {};
    const absencesNonExcusees = Number(volumes.nonExcuses || 0);
    const domaines = ROOT_DOMAINES.map((code) => {
      const codes = familyCodes(code);
      const events = included.filter((row) => codes.includes(row.domaine));
      const pack = packFromEvents(events);
      return {
        code,
        libelle: code === 'PR' ? 'PAPR' : code,
        percentage: pack.percentage,
        numerator: pack.numerator,
        denominator: pack.denominator,
        eventCount: pack.eventCount,
        analyticStatus: pack.analyticStatus
      };
    });
    const jspEvents = included.filter((row) => String(row.domaine || '').toUpperCase() === 'JSP');
    const jspRole = display.classifyJspRole(personne, affectations, today);
    const jspStats = display.jspParticipation(jspEvents);
    const jspDomain = domaines.find((row) => row.code === 'JSP') || null;
    const oiHisto = [];
    const seenOi = new Set();
    for(const row of included){
      if(!row.oiAtDate || seenOi.has(row.oiAtDate)) continue;
      seenOi.add(row.oiAtDate);
      oiHisto.push({
        label: row.oiAtDate,
        eventCount: included.filter((x) => x.oiAtDate === row.oiAtDate).length
      });
    }
    return {
      period: snap.summary.period,
      identite: identity,
      historiqueRh: {
        periodes: (periodes || []).slice().sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut))),
        affectations: (affectations || []).slice().sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut))).map((aff) => {
          const cible = ciblesById.get(aff.cible_id);
          return {
            affectationId: aff.affectation_id,
            dateDebut: aff.date_debut,
            dateFin: aff.date_fin,
            label: labelOi(cible),
            domaineCode: cible && cible.domaine_code,
            niveauCode: cible && cible.niveau_code
          };
        })
      },
      kpi: {
        percentage: officiel.percentage,
        numerator: officiel.numerator,
        denominator: officiel.denominator,
        eventCount: officiel.eventCount,
        analyticStatus: officiel.analyticStatus,
        analyticStatusReason: officiel.analyticStatusReason,
        volumes: {
          attendus: Number(officiel.eventCount || 0),
          presents: Number(volumes.presents || 0),
          excuses: Number(volumes.excuses || 0),
          nonExcuses: absencesNonExcusees,
          dispenses: Number(volumes.dispenses || 0),
          nonRenseignes: Number(volumes.nonRenseignes || 0),
          permutations: Number(volumes.permutations || 0)
        },
        motifs: {
          prive: Number(volumes.excusesPrive || 0),
          professionnel: Number(volumes.excusesProfessionnel || 0),
          armee: Number(volumes.excusesArmee || 0),
          accidentMaladie: Number(volumes.excusesAccidentMaladie || 0),
          nonPrecise: Number(volumes.excusesNonPrecise || 0)
        }
      },
      objectif: {
        message: objectifMessage,
        objective: officiel.objective || null,
        objectiveContext: ctx,
        gapPct: officiel.gapPct
      },
      alertesPersonne: {
        active: false,
        absencesNonExcusees,
        config: {
          repeatedUnexcusedAbsences: ALERTS_CONFIG.repeatedUnexcusedAbsences,
          personUnderObjective: ALERTS_CONFIG.personUnderObjective
        },
        message: 'Aucune alerte individuelle active. Le seuil d’absences répétées n’est pas validé par la MOA.'
      },
      evenements: ficheEvents,
      domaines,
      jsp: {
        role: jspRole,
        roleLabel: jspRole === 'MONITEUR' ? 'Moniteur JSP' : jspRole === 'JEUNE' ? 'JSP' : null,
        tauxJeunes: jspRole === 'JEUNE' ? jspDomain : null,
        tauxMoniteurs: jspRole === 'MONITEUR' ? jspDomain : null,
        participationJsp: jspRole ? jspStats : null
      },
      oiHistoriqueEvenements: oiHisto,
      explain: Object.assign({}, snap.explain, {
        modesInclus: 'NOMINATIF uniquement. QUANTITATIF et LEGACY ne sont jamais attribués à une personne.'
      }),
      timeseries: snap.timeseries,
      graphs,
      exclusions: snap.explain.exclusions,
      rapportPersonne: { disponible: true, kind: 'PERSON' }
    };
  }

  async function updateIdentite(personneId, body = {}, actor = null){
    const current = await repo.getPersonne(personneId);
    if(!current) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const patch = cleanedIdentityPatch(body);
    const before = {
      personneId: current.personne_id,
      nip: current.nip,
      grade: current.grade || null,
      nom: current.nom,
      prenom: current.prenom,
      dateEntreeSdis: current.date_entree_sdis || current.date_entree || null
    };
    const updated = await repo.updatePersonne(personneId, patch);
    const after = {
      personneId: updated.personne_id,
      nip: updated.nip,
      grade: updated.grade || null,
      nom: updated.nom,
      prenom: updated.prenom,
      dateEntreeSdis: updated.date_entree_sdis || updated.date_entree || null
    };
    if(typeof repo.appendJournal === 'function'){
      await repo.appendJournal({
        auteur_id: actorId(actor),
        entite: 'PERSONNE',
        entite_id: personneId,
        action: 'MODIFIER_PERSONNE_IDENTITE',
        avant: before,
        apres: after,
        commentaire: 'FICHE_PERSONNE'
      });
    }
    return { personne: after };
  }

  return { directory, fiche, updateIdentite, isTestPersonnelNip };
}

module.exports = { createScopePersonService, isTestPersonnelNip };
