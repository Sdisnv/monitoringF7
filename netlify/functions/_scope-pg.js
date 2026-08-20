const { randomUUID } = require('crypto');
const db = require('./_postgres');
const { ensureScopeSchema } = require('./_scope-schema');
const { isoDate } = require('./_scope-rules');

function dateOnly(value){
  if(!value) return null;
  if(value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapEvent(row){
  if(!row) return null;
  return {
    evenement_id: row.evenement_id,
    date: dateOnly(row.date),
    domaine_code: row.domaine_code,
    libelle: row.libelle,
    statut: row.statut,
    origine: row.origine,
    mode_suivi: row.mode_suivi || (row.origine === 'LEGACY_AGGREGATED' ? 'LEGACY' : 'NOMINATIF'),
    population_figee: row.population_figee,
    population_version: row.population_version,
    figee_at: row.figee_at,
    figee_par: row.figee_par,
    cloture_at: row.cloture_at,
    cloture_par: row.cloture_par,
    version: row.version,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapObjectif(row){
  if(!row) return null;
  return {
    ...row,
    date_debut: dateOnly(row.date_debut),
    date_fin: dateOnly(row.date_fin),
    seuil_pct: row.seuil_pct == null ? null : Number(row.seuil_pct),
    actif: row.actif !== false
  };
}

function createPgRepo(client){
  const q = (text, params) => (client || db).query(text, params);

  const api = {
    async withTransaction(fn){
      if(client) return fn(api);
      return db.transaction(async (txClient) => fn(createPgRepo(txClient)));
    },
    async listDomaines(){
      const result = await q('select * from scope_domaines where actif = true order by code');
      return result.rows;
    },
    async listCibles(){
      const result = await q('select * from scope_cibles where actif = true order by domaine_code, niveau_code');
      return result.rows;
    },
    async getCible(id){
      const result = await q('select * from scope_cibles where cible_id = $1', [id]);
      return result.rows[0] || null;
    },
    async findCible(domaine, niveau){
      const result = await q(
        'select * from scope_cibles where domaine_code = $1 and niveau_code = $2',
        [domaine, niveau]
      );
      return result.rows[0] || null;
    },
    async insertPersonne(row){
      const id = row.personne_id || randomUUID();
      const result = await q(
        `insert into scope_personnes(personne_id, nip, nom, prenom, grade, actif, date_entree, date_sortie, source)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
        [id, row.nip, row.nom, row.prenom, row.grade || null, row.actif !== false,
          isoDate(row.date_entree), isoDate(row.date_sortie), row.source || 'MANUEL']
      );
      return result.rows[0];
    },
    async getPersonneByNip(nip){
      const result = await q('select * from scope_personnes where nip = $1', [String(nip)]);
      return result.rows[0] || null;
    },
    async upsertPersonne(row){
      const existing = row.nip ? await api.getPersonneByNip(row.nip) : null;
      if(existing){
        const result = await q(
          `update scope_personnes
           set nom = $2, prenom = $3, grade = $4, source = $5, updated_at = now()
           where personne_id = $1 returning *`,
          [existing.personne_id, row.nom, row.prenom, row.grade || existing.grade, row.source || existing.source]
        );
        return result.rows[0];
      }
      return api.insertPersonne(row);
    },
    async getPersonne(id){
      const result = await q('select * from scope_personnes where personne_id = $1', [id]);
      return result.rows[0] || null;
    },
    async listPersonnes({ q: search } = {}){
      if(!search){
        const result = await q('select * from scope_personnes order by nom, prenom');
        return result.rows;
      }
      const like = `%${String(search).trim()}%`;
      const result = await q(
        `select * from scope_personnes
         where nip ilike $1 or nom ilike $1 or prenom ilike $1
            or (nom || ' ' || prenom) ilike $1
            or (prenom || ' ' || nom) ilike $1
         order by nom, prenom`,
        [like]
      );
      return result.rows;
    },
    async insertAffectation(row){
      const id = row.affectation_id || randomUUID();
      const result = await q(
        `insert into scope_affectations(affectation_id, personne_id, cible_id, date_debut, date_fin, source)
         values ($1,$2,$3,$4,$5,$6) returning *`,
        [id, row.personne_id, row.cible_id, isoDate(row.date_debut), isoDate(row.date_fin), row.source || 'MANUEL']
      );
      return result.rows[0];
    },
    async listAffectations({ personneId, date } = {}){
      if(personneId && date){
        const result = await q(
          `select * from scope_affectations
           where personne_id = $1
             and date_debut <= $2::date
             and (date_fin is null or $2::date <= date_fin)`,
          [personneId, isoDate(date)]
        );
        return result.rows.map(r => ({ ...r, date_debut: dateOnly(r.date_debut), date_fin: dateOnly(r.date_fin) }));
      }
      if(personneId){
        const result = await q('select * from scope_affectations where personne_id = $1', [personneId]);
        return result.rows.map(r => ({ ...r, date_debut: dateOnly(r.date_debut), date_fin: dateOnly(r.date_fin) }));
      }
      const result = await q('select * from scope_affectations');
      return result.rows.map(r => ({ ...r, date_debut: dateOnly(r.date_debut), date_fin: dateOnly(r.date_fin) }));
    },
    async listAffectationsForCibles(cibleIds, date){
      if(!cibleIds.length) return [];
      const result = await q(
        `select * from scope_affectations
         where cible_id = any($1::uuid[])
           and date_debut <= $2::date
           and (date_fin is null or $2::date <= date_fin)`,
        [cibleIds, isoDate(date)]
      );
      return result.rows.map(r => ({ ...r, date_debut: dateOnly(r.date_debut), date_fin: dateOnly(r.date_fin) }));
    },
    async insertEvenement(row){
      const id = row.evenement_id || randomUUID();
      const { inferModeSuivi } = require('./_scope-analytics');
      const modeSuivi = inferModeSuivi(row);
      const result = await q(
        `insert into scope_evenements(
           evenement_id, date, domaine_code, libelle, statut, origine, mode_suivi, version
         ) values ($1,$2,$3,$4,$5,$6,$7,1) returning *`,
        [id, isoDate(row.date), row.domaine_code, row.libelle, row.statut || 'PLANIFIE', row.origine || 'NOMINATIF', modeSuivi]
      );
      const cibleIds = row.cible_ids || [];
      for(const cibleId of cibleIds){
        await q(
          'insert into scope_evenement_cibles(evenement_id, cible_id) values ($1,$2) on conflict do nothing',
          [id, cibleId]
        );
      }
      return mapEvent(result.rows[0]);
    },
    async listEvenements({ annee, statut, domaine } = {}){
      const clauses = [];
      const params = [];
      let i = 1;
      if(annee){
        clauses.push(`extract(year from date) = $${i}`);
        params.push(Number(annee));
        i += 1;
      }
      if(statut){
        clauses.push(`statut = $${i}`);
        params.push(String(statut));
        i += 1;
      }
      if(domaine){
        clauses.push(`domaine_code = $${i}`);
        params.push(String(domaine));
        i += 1;
      }
      const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
      const result = await q(`select * from scope_evenements ${where} order by date desc, libelle`, params);
      return result.rows.map(mapEvent);
    },
    async getEvent(id){
      const result = await q('select * from scope_evenements where evenement_id = $1', [id]);
      return mapEvent(result.rows[0] || null);
    },
    async getEventForUpdate(id){
      const result = await q('select * from scope_evenements where evenement_id = $1 for update', [id]);
      return mapEvent(result.rows[0] || null);
    },
    async listEventCibleIds(id){
      const result = await q('select cible_id from scope_evenement_cibles where evenement_id = $1', [id]);
      return result.rows.map(r => r.cible_id);
    },
    async listEventCiblesForEvents(ids){
      if(!ids || !ids.length) return [];
      const result = await q(
        `select ec.evenement_id, c.*
         from scope_evenement_cibles ec
         join scope_cibles c on c.cible_id = ec.cible_id
         where ec.evenement_id = any($1::uuid[])`,
        [ids]
      );
      return result.rows;
    },
    async setEventCibles(id, cibleIds){
      await q('delete from scope_evenement_cibles where evenement_id = $1', [id]);
      for(const cibleId of cibleIds){
        await q('insert into scope_evenement_cibles(evenement_id, cible_id) values ($1,$2)', [id, cibleId]);
      }
    },
    async updateEventIfVersion(id, baseVersion, patch){
      const allowed = [
        'date','domaine_code','libelle','statut','origine','mode_suivi','population_figee','population_version',
        'figee_at','figee_par','cloture_at','cloture_par'
      ];
      const sets = ['version = version + 1', 'updated_at = now()'];
      const params = [];
      let i = 1;
      for(const key of allowed){
        if(Object.prototype.hasOwnProperty.call(patch, key)){
          sets.push(`${key} = $${i}`);
          params.push(patch[key]);
          i += 1;
        }
      }
      params.push(id, Number(baseVersion));
      const result = await q(
        `update scope_evenements set ${sets.join(', ')}
         where evenement_id = $${i} and version = $${i + 1}
         returning *`,
        params
      );
      return mapEvent(result.rows[0] || null);
    },
    async listAttendus(eventId){
      const result = await q('select * from scope_attendus where evenement_id = $1', [eventId]);
      return result.rows;
    },
    async listAttendusForEvents(ids){
      if(!ids || !ids.length) return [];
      const result = await q('select * from scope_attendus where evenement_id = any($1::uuid[])', [ids]);
      return result.rows;
    },
    async getAttendu(eventId, personneId){
      const result = await q(
        'select * from scope_attendus where evenement_id = $1 and personne_id = $2',
        [eventId, personneId]
      );
      return result.rows[0] || null;
    },
    async upsertAttendu(row){
      const result = await q(
        `insert into scope_attendus(evenement_id, personne_id, inclus, origine, origine_retrait, motif_inclusion)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (evenement_id, personne_id) do update set
           inclus = excluded.inclus,
           origine = excluded.origine,
           origine_retrait = excluded.origine_retrait,
           motif_inclusion = excluded.motif_inclusion,
           updated_at = now()
         returning *`,
        [row.evenement_id, row.personne_id, row.inclus !== false, row.origine, row.origine_retrait || null, row.motif_inclusion || null]
      );
      return result.rows[0];
    },
    async listParticipations(eventId){
      const result = await q('select * from scope_participations where evenement_id = $1', [eventId]);
      return result.rows;
    },
    async listParticipationsForEvents(ids){
      if(!ids || !ids.length) return [];
      const result = await q('select * from scope_participations where evenement_id = any($1::uuid[])', [ids]);
      return result.rows;
    },
    async getParticipation(eventId, personneId){
      const result = await q(
        'select * from scope_participations where evenement_id = $1 and personne_id = $2',
        [eventId, personneId]
      );
      return result.rows[0] || null;
    },
    async upsertParticipation(row){
      const result = await q(
        `insert into scope_participations(
           evenement_id, personne_id, statut, motif_absence, commentaire, role, source, auteur_id
         ) values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (evenement_id, personne_id) do update set
           statut = excluded.statut,
           motif_absence = excluded.motif_absence,
           commentaire = excluded.commentaire,
           role = excluded.role,
           source = excluded.source,
           auteur_id = excluded.auteur_id,
           updated_at = now()
         returning *`,
        [
          row.evenement_id, row.personne_id, row.statut, row.motif_absence || null,
          row.commentaire || null, row.role || 'PARTICIPANT', row.source || 'SAISIE', row.auteur_id || null
        ]
      );
      return result.rows[0];
    },
    async insertLegacy(row){
      const id = row.legacy_id || randomUUID();
      const result = await q(
        `insert into scope_legacy_aggregates(
           legacy_id, source_record_id, date, domaine_code, libelle,
           nb_convoques, nb_presents, nb_excuses, nb_absents, payload_v67,
           evenement_id, fingerprint
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12) returning *`,
        [
          id, row.source_record_id || null, isoDate(row.date), row.domaine_code, row.libelle || null,
          row.nb_convoques ?? null, row.nb_presents ?? null, row.nb_excuses ?? null, row.nb_absents ?? null,
          JSON.stringify(row.payload_v67 || {}),
          row.evenement_id || null, row.fingerprint || null
        ]
      );
      return result.rows[0];
    },
    async listLegacy(){
      const result = await q('select * from scope_legacy_aggregates order by date');
      return result.rows;
    },
    async getLegacyByEvenementId(eventId){
      const result = await q(
        'select * from scope_legacy_aggregates where evenement_id = $1',
        [eventId]
      );
      return result.rows[0] || null;
    },
    async listReglesBascule(){
      const result = await q('select * from scope_regles_bascule');
      return result.rows.map((row) => Object.assign({}, row, { date_bascule: dateOnly(row.date_bascule) }));
    },
    async upsertRegleBascule(row){
      const portee = String(row.portee || (row.cible_id ? 'CIBLE' : (row.domaine_code ? 'DOMAINE' : 'GLOBAL'))).toUpperCase();
      const cibleId = portee === 'CIBLE' ? row.cible_id : null;
      const domaineCode = portee === 'GLOBAL' ? null : (row.domaine_code || null);
      let existing;
      if(portee === 'CIBLE'){
        existing = await q(
          `select * from scope_regles_bascule where portee = 'CIBLE' and cible_id = $1`,
          [cibleId]
        );
      }else if(portee === 'DOMAINE'){
        existing = await q(
          `select * from scope_regles_bascule where portee = 'DOMAINE' and domaine_code = $1`,
          [row.domaine_code]
        );
      }else{
        existing = await q(`select * from scope_regles_bascule where portee = 'GLOBAL'`);
      }
      if(existing.rows[0]){
        const result = await q(
          `update scope_regles_bascule
           set date_bascule = $2, commentaire = $3, domaine_code = $4, updated_at = now()
           where regle_id = $1 returning *`,
          [existing.rows[0].regle_id, isoDate(row.date_bascule), row.commentaire || null, domaineCode]
        );
        return result.rows[0];
      }
      const result = await q(
        `insert into scope_regles_bascule(portee, cible_id, domaine_code, date_bascule, commentaire)
         values ($1,$2,$3,$4,$5) returning *`,
        [portee, cibleId, domaineCode, isoDate(row.date_bascule), row.commentaire || null]
      );
      return result.rows[0];
    },
    async insertImport(row){
      const id = row.import_id || randomUUID();
      const result = await q(
        `insert into scope_imports(
           import_id, source_filename, source_sha256, imported_par, statut, nb_lignes, rapport
         ) values ($1,$2,$3,$4,$5,$6,$7::jsonb) returning *`,
        [
          id, row.source_filename || null, row.source_sha256 || null, row.imported_par || null,
          row.statut || 'COMMITE', row.nb_lignes || 0, JSON.stringify(row.rapport || null)
        ]
      );
      return result.rows[0];
    },
    async insertImportLigne(row){
      const result = await q(
        `insert into scope_import_lignes(
           import_id, ligne_no, fingerprint, statut, type_propose,
           evenement_id, legacy_id, payload_source, raison, action
         ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) returning *`,
        [
          row.import_id, row.ligne_no, row.fingerprint, row.statut, row.type_propose || null,
          row.evenement_id || null, row.legacy_id || null,
          JSON.stringify(row.payload_source || null), row.raison || null, row.action || null
        ]
      );
      return result.rows[0];
    },
    async listImportedFingerprints(){
      const result = await q(
        `select fingerprint from scope_import_lignes where statut = 'IMPORTE'`
      );
      return result.rows.map((r) => r.fingerprint);
    },
    async countTable(name){
      const allowed = new Set([
        'scope_personnes', 'scope_evenements', 'scope_attendus', 'scope_participations',
        'scope_legacy_aggregates', 'scope_imports', 'scope_import_lignes', 'scope_saisies_quantitatives',
        'scope_objectifs', 'scope_alertes_acquittements'
      ]);
      if(!allowed.has(name)) return 0;
      const result = await q(`select count(*)::int as n from ${name}`);
      return result.rows[0].n;
    },
    async appendJournal(row){
      const result = await q(
        `insert into scope_journal_metier(journal_id, auteur_id, entite, entite_id, action, avant, apres, commentaire)
         values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) returning *`,
        [
          randomUUID(), row.auteur_id || null, row.entite, String(row.entite_id), row.action,
          JSON.stringify(row.avant || null), JSON.stringify(row.apres || null), row.commentaire || null
        ]
      );
      return result.rows[0];
    },
    async getQuantitatifSaisie(eventId){
      const result = await q('select * from scope_saisies_quantitatives where evenement_id = $1', [eventId]);
      return result.rows[0] || null;
    },
    async listQuantitatifSaisiesForEvents(ids){
      if(!ids || !ids.length) return [];
      const result = await q(
        'select * from scope_saisies_quantitatives where evenement_id = any($1::uuid[])',
        [ids]
      );
      return result.rows;
    },
    async listAcquittementsByUser(utilisateurId){
      const result = await q(
        'select * from scope_alertes_acquittements where utilisateur_id = $1',
        [String(utilisateurId)]
      );
      return result.rows;
    },
    async upsertAcquittement(row){
      const result = await q(
        `insert into scope_alertes_acquittements(
           acquittement_id, fingerprint, code, entity_type, entity_id, utilisateur_id, commentaire
         ) values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (utilisateur_id, fingerprint) do update set
           commentaire = excluded.commentaire,
           created_at = now()
         returning *`,
        [
          row.acquittement_id || randomUUID(),
          row.fingerprint,
          row.code,
          row.entity_type,
          row.entity_id,
          row.utilisateur_id,
          row.commentaire || null
        ]
      );
      return result.rows[0];
    },
    async upsertQuantitatifSaisie(row){
      const result = await q(
        `insert into scope_saisies_quantitatives(
           evenement_id, nb_attendus, nb_presents, nb_excuses, nb_non_excuses, nb_dispenses, auteur_id
         ) values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (evenement_id) do update set
           nb_attendus = excluded.nb_attendus,
           nb_presents = excluded.nb_presents,
           nb_excuses = excluded.nb_excuses,
           nb_non_excuses = excluded.nb_non_excuses,
           nb_dispenses = excluded.nb_dispenses,
           auteur_id = excluded.auteur_id,
           updated_at = now()
         returning *`,
        [
          row.evenement_id,
          row.nb_attendus,
          row.nb_presents,
          row.nb_excuses,
          row.nb_non_excuses,
          row.nb_dispenses,
          row.auteur_id || null
        ]
      );
      return result.rows[0];
    },
    async deleteQuantitatifSaisie(eventId){
      await q('delete from scope_saisies_quantitatives where evenement_id = $1', [eventId]);
    },
    async listObjectifs({ actif } = {}){
      const result = actif === undefined
        ? await q('select * from scope_objectifs order by date_debut, portee')
        : await q('select * from scope_objectifs where actif = $1 order by date_debut, portee', [Boolean(actif)]);
      return result.rows.map(mapObjectif);
    },
    async getObjectif(id){
      const result = await q('select * from scope_objectifs where objectif_id = $1', [id]);
      return mapObjectif(result.rows[0] || null);
    },
    async insertObjectif(row){
      const result = await q(
        `insert into scope_objectifs(
           objectif_id, portee, domaine_code, cible_id, date_debut, date_fin, seuil_pct, actif, commentaire, auteur_id
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
        [
          row.objectif_id,
          row.portee,
          row.domaine_code || null,
          row.cible_id || null,
          isoDate(row.date_debut),
          isoDate(row.date_fin),
          row.seuil_pct,
          row.actif !== false,
          row.commentaire || null,
          row.auteur_id || null
        ]
      );
      return mapObjectif(result.rows[0]);
    },
    async updateObjectif(id, patch){
      const current = await api.getObjectif(id);
      if(!current) return null;
      const next = { ...current, ...patch };
      const result = await q(
        `update scope_objectifs set
           date_fin = $2,
           seuil_pct = $3,
           actif = $4,
           commentaire = $5,
           updated_at = now()
         where objectif_id = $1
         returning *`,
        [
          id,
          isoDate(next.date_fin),
          next.seuil_pct,
          next.actif !== false,
          next.commentaire || null
        ]
      );
      return mapObjectif(result.rows[0]);
    },
    async loadAnalyticsBundle({ from, to, domaineCode, cibleId, evenementId, personneId } = {}){
      const clauses = ['e.date >= $1::date', 'e.date <= $2::date'];
      const params = [from, to];
      let i = 3;
      if(domaineCode){
        clauses.push(`e.domaine_code = $${i}`);
        params.push(domaineCode);
        i += 1;
      }
      if(evenementId){
        clauses.push(`e.evenement_id = $${i}`);
        params.push(evenementId);
        i += 1;
      }
      if(cibleId){
        clauses.push(`exists (select 1 from scope_evenement_cibles x where x.evenement_id = e.evenement_id and x.cible_id = $${i})`);
        params.push(cibleId);
        i += 1;
      }
      if(personneId){
        clauses.push(`coalesce(e.mode_suivi, case when e.origine = 'LEGACY_AGGREGATED' then 'LEGACY' else 'NOMINATIF' end) = 'NOMINATIF'`);
        clauses.push(`exists (select 1 from scope_attendus a where a.evenement_id = e.evenement_id and a.personne_id = $${i}::uuid and a.inclus is not false)`);
        params.push(personneId);
        i += 1;
      }
      const eventsRes = await q(
        `select e.* from scope_evenements e where ${clauses.join(' and ')} order by e.date, e.libelle`,
        params
      );
      const events = eventsRes.rows.map(mapEvent);
      const ids = events.map((event) => event.evenement_id);
      const bundle = {
        events: [],
        attendusByEvent: {},
        participationsByEvent: {},
        cibleIdsByEvent: {},
        legacyByEvent: {},
        quantitatifByEvent: {},
        personneId: personneId || null
      };
      if(!ids.length) return bundle;
      const [ciblesRes, attendusRes, partsRes, legacyRes, qtyRes] = await Promise.all([
        q('select evenement_id, cible_id from scope_evenement_cibles where evenement_id = any($1::uuid[])', [ids]),
        q('select * from scope_attendus where evenement_id = any($1::uuid[])', [ids]),
        q('select * from scope_participations where evenement_id = any($1::uuid[])', [ids]),
        q('select * from scope_legacy_aggregates where evenement_id = any($1::uuid[])', [ids]),
        q('select * from scope_saisies_quantitatives where evenement_id = any($1::uuid[])', [ids])
      ]);
      for(const row of ciblesRes.rows){
        if(!bundle.cibleIdsByEvent[row.evenement_id]) bundle.cibleIdsByEvent[row.evenement_id] = [];
        bundle.cibleIdsByEvent[row.evenement_id].push(row.cible_id);
      }
      for(const row of attendusRes.rows){
        if(!bundle.attendusByEvent[row.evenement_id]) bundle.attendusByEvent[row.evenement_id] = [];
        bundle.attendusByEvent[row.evenement_id].push(row);
      }
      for(const row of partsRes.rows){
        if(!bundle.participationsByEvent[row.evenement_id]) bundle.participationsByEvent[row.evenement_id] = [];
        bundle.participationsByEvent[row.evenement_id].push(row);
      }
      for(const row of legacyRes.rows){
        let payload = row.payload_v67;
        if(typeof payload === 'string'){
          try { payload = JSON.parse(payload); } catch { payload = {}; }
        }
        bundle.legacyByEvent[row.evenement_id] = {
          ...row,
          date: dateOnly(row.date),
          payload_v67: payload || {}
        };
      }
      for(const row of qtyRes.rows){
        bundle.quantitatifByEvent[row.evenement_id] = row;
      }
      for(const event of events){
        bundle.events.push({ ...event, cible_ids: bundle.cibleIdsByEvent[event.evenement_id] || [] });
        bundle.attendusByEvent[event.evenement_id] = bundle.attendusByEvent[event.evenement_id] || [];
        bundle.participationsByEvent[event.evenement_id] = bundle.participationsByEvent[event.evenement_id] || [];
        bundle.legacyByEvent[event.evenement_id] = bundle.legacyByEvent[event.evenement_id] || null;
        bundle.quantitatifByEvent[event.evenement_id] = bundle.quantitatifByEvent[event.evenement_id] || null;
      }
      return bundle;
    },
    async listJournal(entite, entiteId){
      const result = await q(
        'select * from scope_journal_metier where entite = $1 and entite_id = $2 order by at',
        [entite, String(entiteId)]
      );
      return result.rows;
    }
  };
  return api;
}

async function getPgRepo(){
  await ensureScopeSchema();
  return createPgRepo(null);
}

module.exports = { createPgRepo, getPgRepo };
