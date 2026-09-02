'use strict';
const { randomUUID } = require('crypto');
const { HttpError, isoDate } = require('./_scope-rules');
const {
  PORTEES,
  addDays,
  periodsOverlap,
  scopeKey,
  mapObjective,
  resolveObjective
} = require('./_scope-objectives');

function actorId(actor){
  return String(actor?.sub || actor?.email || actor?.nip || actor || 'systeme');
}

function parseSeuil(value){
  if(value === undefined || value === null || value === ''){
    throw new HttpError(400, 'seuil_obligatoire', 'Le seuil de participation est obligatoire.');
  }
  const n = Number(value);
  if(!Number.isFinite(n)) throw new HttpError(422, 'seuil_invalide', 'Le seuil doit être un nombre.');
  if(n < 0) throw new HttpError(422, 'seuil_negatif', 'Le seuil ne peut pas être inférieur à 0 %.');
  if(n > 100) throw new HttpError(422, 'seuil_excessif', 'Le seuil ne peut pas être supérieur à 100 %.');
  return Math.round(n * 10) / 10;
}

function createScopeObjectivesService(repo){
  function summarize(row){
    const mapped = mapObjective(row);
    return {
      ...mapped,
      actif: row.actif !== false,
      auteurId: row.auteur_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      statut: row.actif === false ? 'NEUTRALISE' : (mapped.dateFin ? 'CLOTURE' : 'OUVERT')
    };
  }

  async function listObjectifs(query = {}){
    const rows = await repo.listObjectifs(query);
    return { objectifs: rows.map(summarize) };
  }

  async function getObjectif(id){
    const row = await repo.getObjectif(id);
    if(!row) throw new HttpError(404, 'objectif_introuvable', 'Objectif introuvable.');
    return { objectif: summarize(row) };
  }

  async function assertNoOverlap(candidate, ignoreId){
    const existing = await repo.listObjectifs({ actif: true });
    const key = scopeKey(candidate);
    for(const row of existing){
      if(ignoreId && row.objectif_id === ignoreId) continue;
      if(row.actif === false) continue;
      if(scopeKey(row) !== key) continue;
      if(periodsOverlap(candidate, row)){
        throw new HttpError(
          422,
          'chevauchement_objectif',
          'Un objectif existe déjà pour ce périmètre sur tout ou partie de cette période.'
        );
      }
    }
  }

  async function normalizePortee(body){
    const portee = String(body.portee || body.scope || '').toUpperCase();
    if(![PORTEES.GLOBAL, PORTEES.DOMAINE, PORTEES.CIBLE].includes(portee)){
      throw new HttpError(400, 'portee_invalide', 'La portée doit être GLOBAL, DOMAINE ou CIBLE.');
    }
    let domaineCode = body.domaineCode || body.domaine_code || null;
    let cibleId = body.cibleId || body.cible_id || null;
    if(portee === PORTEES.GLOBAL){
      if(domaineCode || cibleId){
        throw new HttpError(422, 'portee_incoherente', 'Un objectif global n’a ni domaine ni cible.');
      }
      domaineCode = null;
      cibleId = null;
    }
    if(portee === PORTEES.DOMAINE){
      if(!domaineCode || cibleId){
        throw new HttpError(422, 'portee_incoherente', 'Un objectif de domaine exige un domaine, sans cible.');
      }
      const domaines = await repo.listDomaines();
      if(!domaines.some((d) => d.code === domaineCode)){
        throw new HttpError(400, 'domaine_inconnu', 'Domaine inconnu.');
      }
    }
    if(portee === PORTEES.CIBLE){
      if(!cibleId){
        throw new HttpError(422, 'portee_incoherente', 'Un objectif de cible exige une cible.');
      }
      const cible = await repo.getCible(cibleId);
      if(!cible) throw new HttpError(404, 'cible_introuvable', 'Cible introuvable.');
      if(domaineCode && domaineCode !== cible.domaine_code){
        throw new HttpError(422, 'portee_incoherente', 'Le domaine ne correspond pas à la cible.');
      }
      domaineCode = cible.domaine_code;
    }
    return { portee, domaineCode, cibleId };
  }

  async function createObjectif(body, actor){
    const { portee, domaineCode, cibleId } = await normalizePortee(body);
    const dateDebut = isoDate(body.dateDebut || body.date_debut);
    if(!dateDebut) throw new HttpError(400, 'date_debut_obligatoire', 'La date de début est obligatoire.');
    const dateFin = body.dateFin === undefined || body.dateFin === null || body.dateFin === ''
      ? null
      : isoDate(body.dateFin || body.date_fin);
    if(body.dateFin && !dateFin) throw new HttpError(400, 'date_fin_invalide', 'Date de fin invalide.');
    if(dateFin && dateFin < dateDebut){
      throw new HttpError(422, 'dates_incoherentes', 'La date de fin doit être postérieure à la date de début.');
    }
    const seuilPct = parseSeuil(body.seuilPct ?? body.seuil_pct);
    const commentaire = body.commentaire != null ? String(body.commentaire) : null;
    const row = {
      objectif_id: randomUUID(),
      portee,
      domaine_code: domaineCode,
      cible_id: cibleId,
      date_debut: dateDebut,
      date_fin: dateFin,
      seuil_pct: seuilPct,
      actif: true,
      commentaire
    };
    await assertNoOverlap(row);
    const saved = await repo.insertObjectif(row);
    await repo.appendJournal({
      auteur_id: actorId(actor),
      entite: 'objectif',
      entite_id: saved.objectif_id,
      action: 'CREER_OBJECTIF',
      apres: saved
    });
    return { objectif: summarize(saved) };
  }

  async function patchObjectif(id, body, actor){
    const current = await repo.getObjectif(id);
    if(!current) throw new HttpError(404, 'objectif_introuvable', 'Objectif introuvable.');
    const forbidden = ['seuilPct', 'seuil_pct', 'portee', 'dateDebut', 'date_debut', 'dateFin', 'date_fin', 'domaineCode', 'cibleId'];
    if(forbidden.some((key) => body[key] !== undefined)){
      throw new HttpError(
        422,
        'historique_protege',
        'Le seuil et les dates ne se modifient pas. Clôturez la période puis créez-en une nouvelle.'
      );
    }
    const commentaire = body.commentaire !== undefined ? String(body.commentaire) : current.commentaire;
    const saved = await repo.updateObjectif(id, { commentaire });
    await repo.appendJournal({
      auteur_id: actorId(actor),
      entite: 'objectif',
      entite_id: id,
      action: 'MODIFIER_OBJECTIF',
      avant: { commentaire: current.commentaire },
      apres: { commentaire }
    });
    return { objectif: summarize(saved) };
  }

  async function cloturerObjectif(id, body, actor){
    const current = await repo.getObjectif(id);
    if(!current) throw new HttpError(404, 'objectif_introuvable', 'Objectif introuvable.');
    if(current.actif === false){
      throw new HttpError(422, 'objectif_neutralise', 'Un objectif neutralisé ne peut pas être clôturé.');
    }
    if(current.date_fin){
      throw new HttpError(422, 'deja_cloture', 'Cette période est déjà clôturée. Créez une nouvelle période.');
    }
    const dateFin = isoDate(body.dateFin || body.date_fin);
    if(!dateFin) throw new HttpError(400, 'date_fin_obligatoire', 'Indiquez la date de clôture.');
    if(dateFin < isoDate(current.date_debut)){
      throw new HttpError(422, 'dates_incoherentes', 'La date de fin doit être postérieure à la date de début.');
    }
    const candidate = { ...current, date_fin: dateFin };
    await assertNoOverlap(candidate, id);
    const saved = await repo.updateObjectif(id, { date_fin: dateFin });
    await repo.appendJournal({
      auteur_id: actorId(actor),
      entite: 'objectif',
      entite_id: id,
      action: 'CLOTURER_OBJECTIF',
      avant: { date_fin: current.date_fin },
      apres: { date_fin: dateFin }
    });
    return { objectif: summarize(saved) };
  }

  async function nouvellePeriode(id, body, actor){
    const current = await repo.getObjectif(id);
    if(!current) throw new HttpError(404, 'objectif_introuvable', 'Objectif introuvable.');
    if(current.actif === false){
      throw new HttpError(422, 'objectif_neutralise', 'Un objectif neutralisé ne peut pas être prolongé.');
    }
    const dateDebut = isoDate(body.dateDebut || body.date_debut);
    if(!dateDebut) throw new HttpError(400, 'date_debut_obligatoire', 'La date de début de la nouvelle période est obligatoire.');
    const previousDebut = isoDate(current.date_debut);
    if(dateDebut <= previousDebut){
      throw new HttpError(422, 'periode_anterieure', 'La nouvelle période doit commencer après le début de la période précédente.');
    }
    const closeOn = addDays(dateDebut, -1);
    if(current.date_fin && isoDate(current.date_fin) >= dateDebut){
      throw new HttpError(422, 'periode_ouverte', 'Clôturez d’abord la période précédente avant la nouvelle date.');
    }
    if(!current.date_fin){
      await repo.updateObjectif(id, { date_fin: closeOn });
    }
    const created = await createObjectif({
      portee: current.portee,
      domaineCode: current.domaine_code,
      cibleId: current.cible_id,
      dateDebut,
      dateFin: body.dateFin || body.date_fin || null,
      seuilPct: body.seuilPct ?? body.seuil_pct,
      commentaire: body.commentaire != null ? body.commentaire : current.commentaire
    }, actor);
    await repo.appendJournal({
      auteur_id: actorId(actor),
      entite: 'objectif',
      entite_id: created.objectif.objectifId,
      action: 'NOUVELLE_PERIODE_OBJECTIF',
      avant: { objectif_id: id },
      apres: created.objectif
    });
    return { precedent: summarize(await repo.getObjectif(id)), objectif: created.objectif };
  }

  async function desactiverObjectif(id, body, actor){
    const current = await repo.getObjectif(id);
    if(!current) throw new HttpError(404, 'objectif_introuvable', 'Objectif introuvable.');
    if(current.actif === false) return { objectif: summarize(current) };
    const saved = await repo.updateObjectif(id, { actif: false });
    await repo.appendJournal({
      auteur_id: actorId(actor),
      entite: 'objectif',
      entite_id: id,
      action: 'DESACTIVER_OBJECTIF',
      commentaire: body && body.motif || 'Neutralisation',
      avant: { actif: true },
      apres: { actif: false }
    });
    return { objectif: summarize(saved) };
  }

  async function resolveObjectif(query = {}){
    const date = isoDate(query.date);
    if(!date) throw new HttpError(400, 'date_obligatoire', 'Indiquez une date pour l’aperçu de l’objectif effectif.');
    const domaineCode = query.domaineCode || query.domaine_code || query.domaine || null;
    const cibleId = query.cibleId || query.cible_id || null;
    const rows = await repo.listObjectifs({ actif: true });
    const analysisGrain = cibleId ? 'CIBLE' : (domaineCode ? 'DOMAINE' : 'GLOBAL');
    const objectif = resolveObjective({
      date,
      domaineCode,
      cibleId,
      analysisGrain,
      objectives: rows
    });
    return { objectif };
  }

  return {
    listObjectifs,
    getObjectif,
    createObjectif,
    patchObjectif,
    cloturerObjectif,
    nouvellePeriode,
    desactiverObjectif,
    resolveObjectif
  };
}

module.exports = { createScopeObjectivesService };
