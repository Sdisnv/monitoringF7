const { randomUUID } = require('crypto');
const db = require('./_postgres');
const { ensureScopeSchema } = require('./_scope-schema');
const { isoDate } = require('./_scope-rules');
const { periodFromPersonneRow } = require('./_scope-personnel');

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
    sous_domaine_code: row.sous_domaine_code || null,
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
    identifiant_externe: row.identifiant_externe || null,
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

const PERSONNE_SELECT = `
  id as personne_id,
  id,
  nip,
  nom,
  prenom,
  grade,
  (archived_at is null) as actif,
  date_entree_sdis as date_entree,
  null::date as date_sortie,
  'PERSONNEL'::text as source,
  case when archived_at is null then 'ACTIF' else 'INACTIF' end as statut_rh,
  date_entree_sdis,
  created_at,
  updated_at,
  archived_at
`;

const AFFECTATION_SELECT = `
  a.id as affectation_id,
  a.id,
  a.personne_id,
  c.cible_id,
  a.categorie,
  a.domaine,
  a.cible,
  a.role_domaine,
  a.niveau,
  a.domaine as domaine_code,
  a.cible as niveau_code,
  a.date_actif as date_debut,
  a.date_inactif as date_fin,
  'PERSONNEL'::text as source,
  a.date_actif,
  a.date_inactif,
  a.created_at,
  a.updated_at
`;

function cibleJoinCondition(alias = 'a'){
  return `c.domaine_code = ${alias}.domaine
    and (
      c.niveau_code = ${alias}.cible
      or c.libelle = concat(${alias}.domaine, ' ', ${alias}.cible)
      or (${alias}.domaine = 'JSP' and c.niveau_code = replace(${alias}.cible, 'JSP ', ''))
      or (${alias}.domaine in ('PR','AUTO','FOSPEC') and c.niveau_code = 'GEN')
    )`;
}

function normalizeAffectationInput(row = {}, cible){
  const domaine = row.domaine || row.domaine_code || (cible && cible.domaine_code) || null;
  const cibleCode = row.cible || row.niveau_code || (cible && cible.niveau_code) || null;
  return {
    id: row.affectation_id || row.id || randomUUID(),
    personne_id: row.personne_id,
    categorie: row.categorie || (domaine === 'PR' || domaine === 'AUTO' ? 'SPECIALISATION' : 'OI'),
    domaine,
    cible: cibleCode,
    role_domaine: row.role_domaine || 'PRINCIPAL',
    niveau: row.niveau || null,
    date_actif: isoDate(row.date_actif || row.date_debut),
    date_inactif: isoDate(row.date_inactif || row.date_fin)
  };
}

function mapPersonneDates(row){
  if(!row) return null;
  return {
    ...row,
    date_entree: dateOnly(row.date_entree),
    date_sortie: dateOnly(row.date_sortie),
    date_entree_sdis: dateOnly(row.date_entree_sdis)
  };
}

function mapAffectationDates(row){
  if(!row) return null;
  return {
    ...row,
    date_debut: dateOnly(row.date_debut),
    date_fin: dateOnly(row.date_fin),
    date_actif: dateOnly(row.date_actif),
    date_inactif: dateOnly(row.date_inactif)
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
    async listSousDomaines(){
      const result = await q(`
        select *, domaine_code as domaine_parent
        from scope_sous_domaines
        where actif = true
        order by code
      `);
      return result.rows;
    },
    async listSuiviNominatif(){
      const columns = await q(`
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'scope_suivi_nominatif'
      `);
      const existing = new Set(columns.rows.map((row) => row.column_name));
      const optional = [
        existing.has('date_fin') ? 'date_fin' : 'null::date as date_fin',
        existing.has('sous_domaine_code') ? 'sous_domaine_code' : 'null::text as sous_domaine_code',
        existing.has('commentaire') ? 'commentaire' : 'null::text as commentaire'
      ];
      const result = await q(`
        select
          suivi_id,
          portee,
          domaine_code,
          ${optional[1]},
          cible_id,
          nominatif_autorise,
          date_debut,
          ${optional[0]},
          ${optional[2]}
        from scope_suivi_nominatif
        order by portee, date_debut
      `);
      return result.rows.map((row) => ({
        ...row,
        date_debut: dateOnly(row.date_debut),
        date_fin: dateOnly(row.date_fin)
      }));
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
        `insert into scope_personnes(id, nip, nom, prenom, grade, date_entree_sdis, archived_at)
         values ($1,$2,$3,$4,$5,$6,$7) returning ${PERSONNE_SELECT}`,
        [
          id,
          row.nip,
          row.nom,
          row.prenom,
          row.grade || null,
          isoDate(row.date_entree_sdis || row.date_entree),
          row.actif === false ? new Date().toISOString() : null
        ]
      );
      const saved = mapPersonneDates(result.rows[0]);
      if(!row.skipPeriodes){
        for(const periode of periodFromPersonneRow(saved)){
          await q(
            `insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [randomUUID(), saved.personne_id, periode.type, periode.date_debut, periode.date_fin, periode.motif, periode.source || 'MANUEL']
          );
        }
      }
      return saved;
    },
    async updatePersonne(id, patch){
      const current = await api.getPersonne(id);
      if(!current) return null;
      const cleaned = Object.fromEntries(Object.entries(patch || {}).filter(([, value]) => value !== undefined));
      const next = { ...current, ...cleaned };
      const archivedAt = next.actif === false ? (current.archived_at || new Date().toISOString()) : null;
      const result = await q(
        `update scope_personnes
         set archived_at = $2, date_entree_sdis = $3,
             nom = $4, prenom = $5, grade = $6, updated_at = now()
         where id = $1 returning ${PERSONNE_SELECT}`,
        [
          id,
          archivedAt,
          isoDate(next.date_entree_sdis || next.date_entree),
          next.nom,
          next.prenom,
          next.grade || null
        ]
      );
      return mapPersonneDates(result.rows[0] || null);
    },
    async listPersonnesPeriodes(personneId){
      const result = await q(
        `select * from scope_personne_periodes where personne_id = $1 order by date_debut, created_at`,
        [personneId]
      );
      return result.rows.map((row) => ({
        ...row,
        date_debut: dateOnly(row.date_debut),
        date_fin: dateOnly(row.date_fin)
      }));
    },
    async listAllPeriodes(){
      const result = await q('select * from scope_personne_periodes order by personne_id, date_debut, created_at');
      return result.rows.map((row) => ({
        ...row,
        date_debut: dateOnly(row.date_debut),
        date_fin: dateOnly(row.date_fin)
      }));
    },
    async insertPeriode(row){
      const result = await q(
        `insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
         values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [
          row.periode_id || randomUUID(), row.personne_id, row.type,
          isoDate(row.date_debut), isoDate(row.date_fin), row.motif || null, row.source || 'MANUEL'
        ]
      );
      const saved = result.rows[0];
      return { ...saved, date_debut: dateOnly(saved.date_debut), date_fin: dateOnly(saved.date_fin) };
    },
    async updatePeriode(id, patch){
      const current = await q('select * from scope_personne_periodes where periode_id = $1', [id]);
      if(!current.rows[0]) return null;
      const next = {
        type: patch.type || current.rows[0].type,
        date_debut: patch.date_debut !== undefined ? isoDate(patch.date_debut) : dateOnly(current.rows[0].date_debut),
        date_fin: patch.date_fin !== undefined ? isoDate(patch.date_fin) : dateOnly(current.rows[0].date_fin),
        motif: patch.motif !== undefined ? patch.motif : current.rows[0].motif
      };
      const result = await q(
        `update scope_personne_periodes
         set type = $2, date_debut = $3, date_fin = $4, motif = $5, updated_at = now()
         where periode_id = $1 returning *`,
        [id, next.type, next.date_debut, next.date_fin, next.motif]
      );
      const saved = result.rows[0];
      return { ...saved, date_debut: dateOnly(saved.date_debut), date_fin: dateOnly(saved.date_fin) };
    },
    async getPersonneByNip(nip){
      const result = await q(`select ${PERSONNE_SELECT} from scope_personnes where nip = $1`, [String(nip)]);
      return mapPersonneDates(result.rows[0] || null);
    },
    async upsertPersonne(row){
      const existing = row.nip ? await api.getPersonneByNip(row.nip) : null;
      if(existing){
        const result = await q(
          `update scope_personnes
           set nom = $2, prenom = $3, grade = $4, date_entree_sdis = coalesce($5, date_entree_sdis), updated_at = now()
           where id = $1 returning ${PERSONNE_SELECT}`,
          [
            existing.personne_id,
            row.nom,
            row.prenom,
            row.grade || existing.grade,
            isoDate(row.date_entree_sdis || row.date_entree)
          ]
        );
        return mapPersonneDates(result.rows[0]);
      }
      return api.insertPersonne(row);
    },
    async getPersonne(id){
      const result = await q(`select ${PERSONNE_SELECT} from scope_personnes where id = $1`, [id]);
      return mapPersonneDates(result.rows[0] || null);
    },
    async listPersonnes({ q: search } = {}){
      if(!search){
        const result = await q(`select ${PERSONNE_SELECT} from scope_personnes order by nom, prenom`);
        return result.rows.map(mapPersonneDates);
      }
      const like = `%${String(search).trim()}%`;
      const result = await q(
        `select ${PERSONNE_SELECT} from scope_personnes
         where nip ilike $1 or nom ilike $1 or prenom ilike $1
            or (nom || ' ' || prenom) ilike $1
            or (prenom || ' ' || nom) ilike $1
         order by nom, prenom`,
        [like]
      );
      return result.rows.map(mapPersonneDates);
    },
    async insertAffectation(row){
      const cible = row.cible_id ? await api.getCible(row.cible_id) : null;
      const next = normalizeAffectationInput(row, cible);
      if(!next.domaine || !next.cible) throw new Error('scope_affectation_target_required');
      const result = await q(
        `with inserted as (
           insert into scope_affectations(id, personne_id, categorie, domaine, cible, role_domaine, niveau, date_actif, date_inactif)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           returning *
         )
         select ${AFFECTATION_SELECT}
         from inserted a
         left join scope_cibles c on ${cibleJoinCondition('a')}
         where a.id = $1`,
        [
          next.id,
          next.personne_id,
          next.categorie,
          next.domaine,
          next.cible,
          next.role_domaine,
          next.niveau,
          next.date_actif,
          next.date_inactif
        ]
      );
      return mapAffectationDates(result.rows[0]);
    },
    async updateAffectation(id, patch){
      patch = patch || {};
      const current = await q('select * from scope_affectations where id = $1', [id]);
      if(!current.rows[0]) return null;
      const row = current.rows[0];
      const cible = patch.cible_id ? await api.getCible(patch.cible_id) : null;
      const next = {
        date_actif: patch.date_actif !== undefined ? isoDate(patch.date_actif) : (patch.date_debut !== undefined ? isoDate(patch.date_debut) : dateOnly(row.date_actif)),
        date_inactif: patch.date_inactif !== undefined ? isoDate(patch.date_inactif) : (patch.date_fin !== undefined ? isoDate(patch.date_fin) : dateOnly(row.date_inactif)),
        domaine: patch.domaine || patch.domaine_code || (cible && cible.domaine_code) || row.domaine,
        cible: patch.cible || patch.niveau_code || (cible && cible.niveau_code) || row.cible,
        categorie: patch.categorie || row.categorie,
        role_domaine: patch.role_domaine !== undefined ? patch.role_domaine : row.role_domaine,
        niveau: patch.niveau !== undefined ? patch.niveau : row.niveau
      };
      const result = await q(
        `with updated as (
           update scope_affectations
           set date_actif = $2, date_inactif = $3, domaine = $4, cible = $5,
               categorie = $6, role_domaine = $7, niveau = $8, updated_at = now()
           where id = $1
           returning *
         )
         select ${AFFECTATION_SELECT}
         from updated a
         left join scope_cibles c on ${cibleJoinCondition('a')}
         where a.id = $1`,
        [id, next.date_actif, next.date_inactif, next.domaine, next.cible, next.categorie, next.role_domaine, next.niveau]
      );
      return mapAffectationDates(result.rows[0]);
    },
    async listAffectations({ personneId, date } = {}){
      const base = `select ${AFFECTATION_SELECT}
        from scope_affectations a
        left join scope_cibles c on ${cibleJoinCondition('a')}`;
      if(personneId && date){
        const result = await q(
          `${base}
           where a.personne_id = $1
             and a.date_actif <= $2::date
             and (a.date_inactif is null or $2::date <= a.date_inactif)`,
          [personneId, isoDate(date)]
        );
        return result.rows.map(mapAffectationDates);
      }
      if(personneId){
        const result = await q(`${base} where a.personne_id = $1`, [personneId]);
        return result.rows.map(mapAffectationDates);
      }
      const result = await q(base);
      return result.rows.map(mapAffectationDates);
    },
    async listAffectationsForCibles(cibleIds, date){
      if(!cibleIds.length) return [];
      const result = await q(
        `select ${AFFECTATION_SELECT}
         from scope_affectations a
         join scope_cibles c on ${cibleJoinCondition('a')}
         where c.cible_id = any($1::uuid[])
           and a.date_actif <= $2::date
           and (a.date_inactif is null or $2::date <= a.date_inactif)`,
        [cibleIds, isoDate(date)]
      );
      return result.rows.map(mapAffectationDates);
    },
    async insertEvenement(row){
      const id = row.evenement_id || randomUUID();
      const { inferModeSuivi } = require('./_scope-analytics');
      const modeSuivi = inferModeSuivi(row);
      const result = await q(
        `insert into scope_evenements(
           evenement_id, date, domaine_code, sous_domaine_code, libelle, statut, origine, mode_suivi, identifiant_externe, version
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,1) returning *`,
        [id, isoDate(row.date), row.domaine_code, row.sous_domaine_code || null, row.libelle, row.statut || 'PLANIFIE', row.origine || 'NOMINATIF', modeSuivi, row.identifiant_externe || row.identifiantExterne || null]
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
           evenement_id, personne_id, statut, motif_absence, commentaire, role, source, auteur_id, cible_suivie_id
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (evenement_id, personne_id) do update set
           statut = excluded.statut,
           motif_absence = excluded.motif_absence,
           commentaire = excluded.commentaire,
           role = excluded.role,
           source = excluded.source,
           auteur_id = excluded.auteur_id,
           cible_suivie_id = excluded.cible_suivie_id,
           updated_at = now()
         returning *`,
        [
          row.evenement_id, row.personne_id, row.statut, row.motif_absence || null,
          row.commentaire || null, row.role || 'PARTICIPANT', row.source || 'SAISIE', row.auteur_id || null,
          row.cible_suivie_id || null
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
           evenement_id, nb_attendus, nb_presents, nb_excuses, nb_non_excuses, nb_dispenses, auteur_id,
           nb_excuses_prive, nb_excuses_professionnel, nb_excuses_armee, nb_excuses_accident_maladie,
           nb_excuses_non_precise, nb_permutations
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (evenement_id) do update set
           nb_attendus = excluded.nb_attendus,
           nb_presents = excluded.nb_presents,
           nb_excuses = excluded.nb_excuses,
           nb_non_excuses = excluded.nb_non_excuses,
           nb_dispenses = excluded.nb_dispenses,
           auteur_id = excluded.auteur_id,
           nb_excuses_prive = excluded.nb_excuses_prive,
           nb_excuses_professionnel = excluded.nb_excuses_professionnel,
           nb_excuses_armee = excluded.nb_excuses_armee,
           nb_excuses_accident_maladie = excluded.nb_excuses_accident_maladie,
           nb_excuses_non_precise = excluded.nb_excuses_non_precise,
           nb_permutations = excluded.nb_permutations,
           updated_at = now()
         returning *`,
        [
          row.evenement_id,
          row.nb_attendus,
          row.nb_presents,
          row.nb_excuses,
          row.nb_non_excuses,
          row.nb_dispenses,
          row.auteur_id || null,
          Number(row.nb_excuses_prive || 0),
          Number(row.nb_excuses_professionnel || 0),
          Number(row.nb_excuses_armee || 0),
          Number(row.nb_excuses_accident_maladie || 0),
          Number(row.nb_excuses_non_precise || 0),
          Number(row.nb_permutations || 0)
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
