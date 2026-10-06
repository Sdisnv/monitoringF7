'use strict';

const fs = require('node:fs');
const { createScopeQuoVadisService } = require('../netlify/lib/_scope-quo-vadis-service');

// SQL-boundary fixture: the real service runs without any production connection.
function createFixture(file, options = {}) {
  const preparations = file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const queries = [];
  const calendar = [];
  const programme = { programme_id: 'local-qv-2027', annee: 2027, statut: 'PREPARATION', metadata: {} };
  const programmes = [programme];
  const proposals = [];
  const refs = options.references || require('./fixtures/scope-qv-business-references.json');
  const persist = () => { if(file) fs.writeFileSync(file,JSON.stringify(preparations)); };
  const published = { publication_unit_id: 'local-none', evenement_id: 'local-published', libelle: 'Published unchanged', date: '2027-02-01', statut: 'PUBLIE', version: 4 };
  const database = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
      if (/^(update|insert into|delete from) scope_evenements\b/.test(normalized)) throw new Error('Published event write forbidden in fixture');
      if (normalized.startsWith('select') && normalized.includes('from scope_quo_vadis_programmes')) return { rows: programmes.filter(row => row.annee === Number(params[0] || 2027)) };
      if(normalized.startsWith('insert into scope_quo_vadis_programmes')){
        const row = { ...programme,programme_id:`local-qv-${params[0]}`,annee:Number(params[0]),metadata:JSON.parse(params[5]) };
        programmes.push(row); return {rows:[row]};
      }
      if(normalized.startsWith('select') && normalized.includes('from scope_statcom_referentiel')) return {rows:(refs.statcoms || []).filter(row => !params.length || row.code === params[0])};
      if(normalized.startsWith('select') && normalized.includes('from scope_domaine_ois')) return {rows:refs.domainOis || ['DPS:G1','DPS:C1','DPS:B1','DPS:B2','DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4','JSP:G1','JSP:C1','JSP:B1'].map(value => {const [domaine_code,code] = value.split(':');return {domaine_code,code};})};
      if(normalized.startsWith('select') && normalized.includes('from scope_lieux')) return {rows:(refs.lieux || []).filter(row => !params.length || (normalized.includes('where oi_code=') ? row.oi_code === params[0] : row.lieu_id === params[0]))};
      if(normalized.startsWith('select') && normalized.includes('from scope_salles_theorie')) return {rows:(refs.salles || []).filter(row => !params.length || row.salle_id === params[0]).map(row => ({...row,parent_code:((refs.salles || []).find(parent => parent.salle_id === row.parent_salle_id) || {}).code}))};
      if(normalized.startsWith('select') && normalized.includes('from scope_responsable_fonctions')) return {rows:(refs.responsables || []).filter(row => !params.length || row.code === params[0])};
      if(normalized.startsWith('select') && normalized.includes('from scope_quo_vadis_dps_organisation_versions')) return {rows:structuredClone(options.dpsOrganisation || [])};
      if (normalized.startsWith('insert into scope_quo_vadis_calendar_days')) {
        const entry = { programme_id: params[0], jour: params[1], type_jour: normalized.includes("'vacances_scolaires'") ? 'VACANCES_SCOLAIRES' : 'FERIE', libelle: params[2], metadata: JSON.parse(params[3] || '{}') };
        const existing = calendar.find((row) => row.jour === entry.jour && row.type_jour === entry.type_jour && row.libelle === entry.libelle);
        if (existing) Object.assign(existing, entry);
        else calendar.push(entry);
        return { rows: [] };
      }
      if (normalized.startsWith('select') && normalized.includes('from scope_quo_vadis_calendar_days')) return { rows: structuredClone(calendar) };
      if (normalized.startsWith('select') && normalized.includes('from scope_evenements e') && normalized.includes('extract(year from e.date)')) return { rows: structuredClone((options.events || []).filter(row => String(row.date).startsWith(String(params[0])))) };
      if (normalized.startsWith('select code from scope_ois')) return { rows: params[0].map((code) => ({ code })) };
      if (normalized.includes('from scope_qv_publication_links')) return { rows: [published] };
      if (normalized.startsWith('select') && normalized.includes('from scope_quo_vadis_obligations')) {
        if(normalized.includes("metadata ? 'businessvalidation'")) return {rows:preparations.filter(row => row.metadata.businessValidation || row.metadata.lifecycleDecision).map(row => ({...row,annee:(programmes.find(p => p.programme_id === row.programme_id) || {}).annee}))};
        return { rows: preparations.filter(row => (!params.length || row.programme_id === params[0]) && (params.length < 2 || row.source_ref === params[1])) };
      }
      if(normalized.startsWith('select') && normalized.includes('from scope_quo_vadis_proposals')) return {rows:proposals.filter(row => preparations.some(o => o.obligation_id === row.obligation_id && o.programme_id === params[0]))};
      if(normalized.startsWith('insert into scope_quo_vadis_proposals')){
        if(!proposals.some(row => row.obligation_id === params[0] && row.starts_at === params[1])) proposals.push({proposal_id:`proposal-${proposals.length+1}`,obligation_id:params[0],starts_at:params[1],ends_at:params[2],day_class:params[3],reasons:JSON.parse(params[4]),conflict_summary:JSON.parse(params[5]),status:params[8]});
        return {rows:[]};
      }
      if (normalized.startsWith('insert into scope_quo_vadis_obligations') || normalized.startsWith('update scope_quo_vadis_obligations')) {
        if(params.length === 17){
          let row = preparations.find(item => item.programme_id === params[0] && item.source_type === params[1] && item.source_ref === params[2]);
          if(row) return {rows:[]};
          row = {obligation_id:`local-${preparations.length+1}`,programme_id:params[0],source_type:params[1],source_ref:params[2],title:params[5],domain:params[6],cible_codes:params[7],priority:params[8],imposed_start_at:params[9],imposed_end_at:params[10],statcom_policy:params[11],lieu_id:params[12],lieu_libre:params[13],metadata:JSON.parse(params[15]),statut:params[16],include_in_programme:true};
          preparations.push(row);persist();return {rows:[row]};
        }
        if(normalized.startsWith('update') && params.length <= 7){
          const row = preparations.find(item => item.obligation_id === params[0]);
          if(!row) return {rows:[]};
          if(normalized.includes('set statut=$2')) Object.assign(row,{statut:params[1],metadata:{...row.metadata,...JSON.parse(params[2])}});
          else if(normalized.includes('statcom_code=$2')) Object.assign(row,{statcom_code:params[1],lieu_id:params[2],lieu_libre:params[3],salle_theorie_id:params[4],responsable_fonction_code:params[5]});
          else if(normalized.includes('title = $2')) Object.assign(row,{title:params[1],domain:params[2],cible_codes:params[3],statut:params[4],metadata:{...row.metadata,...JSON.parse(params[6])}});
          else if(params.length === 2){row.metadata={...row.metadata,...JSON.parse(params[1])};if(normalized.includes('include_in_programme ='))row.include_in_programme=!normalized.includes('include_in_programme = false');}
          persist();return {rows:[]};
        }
        if (params.length === 8 || params.length === 9) {
          const [programmeId, sourceRef, title, domain, publics, statcom, metadata, statut] = params;
          let row = preparations.find((item) => item.programme_id === programmeId && item.source_ref === sourceRef);
          const existed = Boolean(row);
          if (!row) { row = { obligation_id: `local-${preparations.length + 1}`, source_ref: sourceRef,source_type:'MANUAL' }; preparations.push(row); }
          Object.assign(row, { programme_id: programmeId, ...(!existed ? {title,domain,cible_codes:publics,statcom_code:statcom} : {}),
          metadata: { ...row.metadata, ...JSON.parse(metadata) }, statut:JSON.parse(metadata).planningStatus || statut, updated_at: new Date().toISOString() });
          if (file) fs.writeFileSync(file, JSON.stringify(preparations));
          return { rows: [{ obligation_id: row.obligation_id }] };
        }
        const [programmeId, sourceRef, title, domain, publics, start, end, statcom, lieuId, libre, salleId, responsable, metadata] = params;
        let row = preparations.find((item) => item.programme_id === programmeId && item.source_ref === sourceRef);
        if (!row) { row = { obligation_id: `local-${preparations.length + 1}`, source_ref: sourceRef,source_type:'MANUAL' }; preparations.push(row); }
        Object.assign(row, { programme_id: programmeId, title, domain, cible_codes: publics, imposed_start_at: start, imposed_end_at: end,
          statcom_code: statcom, lieu_id: lieuId, lieu_libre: libre, salle_theorie_id: salleId, responsable_fonction_code: responsable,
          metadata: { ...row.metadata, ...JSON.parse(metadata) }, statut:JSON.parse(metadata).planningStatus || (start ? 'PLANIFIE' : 'A_PLANIFIER'), updated_at: new Date().toISOString() });
        if (file) fs.writeFileSync(file, JSON.stringify(preparations));
        return { rows: [{ obligation_id: row.obligation_id }] };
      }
      return { rows: [] };
    },
    async transaction(fn) {
      const before = { preparations:structuredClone(preparations),programmes:structuredClone(programmes),
        proposals:structuredClone(proposals),calendar:structuredClone(calendar) };
      try { return await fn({query:database.query}); }
      catch(error){
        for(const [rows,saved] of [[preparations,before.preparations],[programmes,before.programmes],
          [proposals,before.proposals],[calendar,before.calendar]]) rows.splice(0,rows.length,...saved);
        persist();
        throw error;
      }
    }
  };
  return { database, service: createScopeQuoVadisService({ database }), preparations, published, queries,programmes,proposals };
}

function installLocalHandler(fixture) {
  const postgres = require('../netlify/lib/_postgres');
  Object.assign(postgres, fixture.database, { withMetrics: async (_label, fn) => fn() });
  require('../netlify/lib/_scope-pg').getPgRepo = async () => ({ database: fixture.database });
  require('../netlify/lib/_user-store').getUserByIdentity = async () => null;
  delete require.cache[require.resolve('../netlify/functions/scope')];
  return require('../netlify/functions/scope').handler;
}

module.exports = { createFixture, installLocalHandler };
