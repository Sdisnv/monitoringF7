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
      const result = await q(
        `insert into scope_evenements(
           evenement_id, date, domaine_code, libelle, statut, origine, version
         ) values ($1,$2,$3,$4,$5,$6,1) returning *`,
        [id, isoDate(row.date), row.domaine_code, row.libelle, row.statut || 'PLANIFIE', row.origine || 'NOMINATIF']
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
    async setEventCibles(id, cibleIds){
      await q('delete from scope_evenement_cibles where evenement_id = $1', [id]);
      for(const cibleId of cibleIds){
        await q('insert into scope_evenement_cibles(evenement_id, cible_id) values ($1,$2)', [id, cibleId]);
      }
    },
    async updateEventIfVersion(id, baseVersion, patch){
      const allowed = [
        'date','domaine_code','libelle','statut','origine','population_figee','population_version',
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
           nb_convoques, nb_presents, nb_excuses, nb_absents, payload_v67
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) returning *`,
        [
          id, row.source_record_id || null, isoDate(row.date), row.domaine_code, row.libelle || null,
          row.nb_convoques ?? null, row.nb_presents ?? null, row.nb_excuses ?? null, row.nb_absents ?? null,
          JSON.stringify(row.payload_v67 || {})
        ]
      );
      return result.rows[0];
    },
    async listLegacy(){
      const result = await q('select * from scope_legacy_aggregates order by date');
      return result.rows;
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
