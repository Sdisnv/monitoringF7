'use strict';

const {randomUUID} = require('crypto');
const {HttpError} = require('./_scope-rules');
const {createPgRepo} = require('./_scope-pg');
const {createScopeService} = require('./_scope-service');
const {ScopeQvPostgresStore} = require('./_scope-qv-publication-postgres-store');
const logic = require('../../assets/js/scope-ui-logic');

const EDITORIAL_FIELDS = new Set(['activityLabel','themes','publicFreeLabels','family']);
const REVISION_FIELDS = ['activityLabel','themes','publicFreeLabels','date','startTime','endTime','statCom',
  'domain','family','oiCodes','publicCodes','responsibleLabel','lieuId','lieuLibre','salleTheorieId',
  'qualificationCodes','cursusId','participationEvaluation','ecawinActivityCode','planningStatus','sold','ecawinExport','activityNature','annualRecurrence'];
function comparable(value){
  return Array.isArray(value) ? value.slice().sort() : value == null ? '' : value;
}
function revisionChanges(before,after){
  const changedFields = REVISION_FIELDS.filter(key=>JSON.stringify(comparable(before[key])) !== JSON.stringify(comparable(after[key])));
  return {changedFields,kind:changedFields.some(key=>!EDITORIAL_FIELDS.has(key)) ? 'MAJOR' : 'MINOR'};
}

function fieldsFromProgrammeRow(row,qv){
  const reference=qv.historicalAgenda2026?.references?.find(item=>item.sourceLine===row.historicalProposal?.sourceLine);
  return {activityLabel:row.eventDisplayLabel || row.activityLabel || row.label,themes:row.themes || [],
    publicFreeLabels:row.publicFreeLabels || [],date:String(!row.preparation && row.publishedEventDate || row.startsAt || '').slice(0,10) || null,
    startTime:String(row.startsAt || '').slice(11,16) || null,endTime:String(row.endsAt || '').slice(11,16) || null,
    oiCodes:row.oiSelections || [],publicCodes:row.publics || [],statCom:row.statCom || '',
    domain:logic.qvProgrammeFunctionalDomain(row,reference),family:logic.qvProgrammeFamily(row),responsibleLabel:row.responsible || '',
    lieuId:row.lieuId || row.business?.lieuId || null,lieuLibre:row.lieuLibre || '',
    salleTheorieId:row.salleTheorieId || row.business?.salleTheorieId || null,
    qualificationCodes:row.qualificationCodes || [],cursusId:row.cursusId || null,ecawinActivityCode:row.ecawinActivityCode || '',
    planningStatus:row.preparation && ['A_PLANIFIER','PROPOSE','PLANIFIE'].includes(row.status) ? row.status
      : row.historicalProposal || row.paprProposal?.origin==='AUTOMATIC' ? 'PROPOSE' : row.startsAt ? 'PLANIFIE' : 'A_PLANIFIER',
    ...logic.qvProgrammeParameters(row)};
}

async function history(query,year,itemId,{personnelRead=false}={}){
  const entries=(await query(`select j.* from scope_journal_metier j where
    (j.entite='quo_vadis_occurrence' and j.entite_id=$2)
    or (j.entite in ('evenement','SCOPE_EVENEMENT') and j.entite_id in (
      select evenement_id::text from scope_qv_publication_links where source_year=$1 and publication_unit_id=$2))
    order by j.at desc,j.journal_id`,[Number(year),String(itemId)])).rows;
  if(!personnelRead || !entries.length) return entries;
  const authors=[...new Set(entries.map(row=>row.auteur_id).filter(Boolean))];
  const people=(await query(`select nip,nom,prenom from scope_personnes
    where nip=any($1::text[]) or ('local:' || nip)=any($1::text[])`,[authors])).rows;
  const unresolved=authors.filter(actor=>!people.some(person=>(actor===String(person.nip) || actor===`local:${person.nip}`)
    && (person.nom || person.prenom)));
  let profiles=[];
  if(unresolved.length && (await query("select to_regclass('public.monitoring_f7_user_profiles') is not null as ready")).rows[0]?.ready)
    profiles=(await query(`select subject,nip,display_name from monitoring_f7_user_profiles
      where subject=any($1::text[]) or nip=any($1::text[]) or ('local:' || nip)=any($1::text[])`,[unresolved])).rows;
  return entries.map(entry=>{
    const person=people.find(row=>entry.auteur_id===String(row.nip) || entry.auteur_id===`local:${row.nip}`);
    const profile=profiles.find(row=>entry.auteur_id===row.subject || entry.auteur_id===row.nip || entry.auteur_id===`local:${row.nip}`);
    const label=[person?.prenom,person?.nom].filter(Boolean).join(' ') || profile?.display_name;
    return {...entry,...(label?{authorLabel:label}:{})};
  });
}

const reservationConflicts=rows=>require('./_scope-quo-vadis-coverage').reservationConflicts(rows,
  require('./_scope-functional-catalog').compatibilityBetween);

// Actual bookings are read by date, never by the displayed business cycle. No seeding here.
async function reservations(query,qv){
  const year=Number(qv.programme.annee),from=`${year}-01-01`;
  const to=[`${year}-12-31`,qv.programme.periodeFin || '',qv.programmeCycle?.endDate || ''].sort().pop();
  const events=(await query(`select e.evenement_id,e.libelle,e.date::text,e.date_fin::text,
    coalesce(e.heure_debut_prevue,e.heure_debut)::text as start_time,
    coalesce(e.heure_fin_prevue,e.heure_fin)::text as end_time,e.journee_reservee,
    e.lieu_id,e.salle_theorie_id,e.salle,e.statut,e.statcom_code,
    (e.engine_snapshot->>'exclusiveLocation'='true') as exclusive_location,
    array(select ressource_code from scope_evenement_ressources_qv where evenement_id=e.evenement_id) as resource_codes,
    e.engine_snapshot->'publicCodes' as public_codes,
    e.engine_snapshot->'canonicalRow'->>'definitionId' as definition_id,
    l.source_year,l.publication_unit_id
    from scope_evenements e left join lateral (
      select source_year,publication_unit_id from scope_qv_publication_links
      where evenement_id=e.evenement_id order by source_year desc limit 1
    ) l on true
    where e.date <= $2::date + 1 and coalesce(e.date_fin,e.date) >= $1::date - 1
      and (e.salle_theorie_id is not null or e.engine_snapshot->>'exclusiveLocation'='true'
        or exists(select 1 from scope_salles_theorie s where (e.lieu_id is null or s.lieu_id=e.lieu_id)
          and (lower(trim(s.code))=lower(trim(e.salle)) or lower(trim(s.libelle))=lower(trim(e.salle))))
        or exists(select 1 from scope_evenement_ressources_qv where evenement_id=e.evenement_id))
      and e.statut not in ('ANNULE','NON_RETENU')`,[from,to])).rows;
  const other=(await query(`select o.obligation_id,o.source_ref,o.title,o.statut,p.annee,
    o.metadata->'planningFields' as fields,o.lieu_id,o.salle_theorie_id,
    o.statcom_code,coalesce(l.evenement_id,o.scope_evenement_id) as evenement_id,
    to_char(o.imposed_start_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI') as starts_at,
    to_char(o.imposed_end_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI') as ends_at
    from scope_quo_vadis_obligations o join scope_quo_vadis_programmes p using(programme_id)
    left join scope_qv_publication_links l on l.source_year=p.annee and l.publication_unit_id=o.source_ref
    where (p.annee<>$3 or coalesce(o.metadata->>'source','')<>'QV_PROGRAMME_PREPARATION')
      and o.statut not in ('ANNULE','NON_RETENU')
      and coalesce(o.metadata->'planningFields'->>'date',o.imposed_start_at::date::text) <= ($2::date+1)::text
      and coalesce(o.metadata->'planningFields'->>'date',o.imposed_end_at::date::text) >= ($1::date-1)::text`,[from,to,year])).rows;
  const current=(qv.canonicalProgramme?.rows || []).filter(logic.qvProgrammeIsActive);
  const byEvent=new Map(current.filter(row=>row.publishedEventId).map(row=>[row.publishedEventId,row]));
  const normalize=row=>{
    const key=value=>String(value || '').trim().toLocaleLowerCase('fr-CH');
    const matches=(qv.sallesTheorie || []).filter(item=>row.salleTheorieId?item.salleId===row.salleTheorieId
      : Boolean(row.room) && (key(item.code)===key(row.room) || key(item.libelle)===key(row.room))
      && (!row.lieuId || item.lieuId===row.lieuId));
    const room=matches.length===1?matches[0]:null;
    return {...row,salleTheorieId:room?.salleId || row.salleTheorieId || null,
      lieuId:row.lieuId || room?.lieuId || null,room:room?.libelle || row.room || '',
      location:row.location || qv.lieux?.find(item=>item.lieuId===(row.lieuId || room?.lieuId))?.nomCourt || ''};
  };
  const bookings=current.map(row=>normalize({
    id:row.id,label:row.eventDisplayLabel || row.activityLabel || row.label,startsAt:row.startsAt,endsAt:row.endsAt,
    lieuId:row.lieuId || row.business?.lieuId,salleTheorieId:row.salleTheorieId || row.business?.salleTheorieId,
    room:row.room,location:row.location,status:row.status,sourceYear:year,statCom:row.statCom,
    definitionId:row.definitionId,publics:row.publics,exclusiveLocation:row.exclusiveLocation,
    resourceCodes:row.resourceCodes,externalActivity:row.externalActivity,publishedEventId:row.publishedEventId,
    reservationOwner:row.publishedEventId?`EVENT:${row.publishedEventId}`:`QV:${year}:${row.id}`}));
  for(const event of events){
    const source=byEvent.get(event.evenement_id),start=event.start_time || (event.journee_reservee?'00:00':null),
      end=event.end_time || (event.journee_reservee?'23:59':null);
    bookings.push(normalize({id:source?.id || `RESERVATION:${event.evenement_id}`,label:event.libelle,
      startsAt:start && `${event.date}T${start.slice(0,5)}`,endsAt:end && `${event.date_fin || event.date}T${end.slice(0,5)}`,
      lieuId:event.lieu_id,salleTheorieId:event.salle_theorie_id,room:event.salle,status:event.statut,
      sourceYear:Number(event.source_year) || null,publishedEventId:event.evenement_id,
      exclusiveLocation:event.exclusive_location===true,resourceCodes:event.resource_codes,
      reservationOwner:`EVENT:${event.evenement_id}`,reservationOnly:!source,
      statCom:event.statcom_code,definitionId:source?.definitionId || event.definition_id,
      publics:source?.publics || event.public_codes || []}));
  }
  for(const row of other){
    const fields=row.fields || {};
    const source=Number(row.annee)===year?current.find(item=>item.preparation?.id===row.obligation_id || item.id===row.source_ref):null;
    if(source) continue;
    bookings.push(normalize({id:source?.id || `RESERVATION:${row.annee}:${row.source_ref}`,label:fields.activityLabel || row.title,
      startsAt:fields.date && fields.startTime?`${fields.date}T${fields.startTime}`:row.starts_at,
      endsAt:fields.date && fields.endTime?`${fields.date}T${fields.endTime}`:row.ends_at,
      lieuId:row.lieu_id || fields.lieuId,salleTheorieId:row.salle_theorie_id || fields.salleTheorieId,
      room:fields.roomLabel,location:fields.locationLabel,status:row.statut,sourceYear:Number(row.annee),
      publishedEventId:row.evenement_id,
      reservationOwner:row.evenement_id?`EVENT:${row.evenement_id}`:`QV:${row.annee}:${source?.id || row.source_ref}`,reservationOnly:!source,
      statCom:row.statcom_code,publics:fields.publicCodes || [],exclusiveLocation:fields.exclusiveLocation,
      resourceCodes:fields.resourceCodes || []}));
  }
  const unique=new Map();
  for(const row of bookings.filter(row=>row.startsAt && row.endsAt && !['ANNULE','NON_RETENU'].includes(row.status)
    && (row.salleTheorieId || row.exclusiveLocation || row.resourceCodes?.length)))
    unique.set(JSON.stringify([row.reservationOwner,String(row.startsAt).slice(0,16),String(row.endsAt).slice(0,16),
      row.salleTheorieId,Boolean(row.exclusiveLocation),[...(row.resourceCodes || [])].sort()]),row);
  return [...unique.values()];
}

function reservationMessages(conflicts,itemId){
  return conflicts.filter(item=>item.leftId===itemId || item.rightId===itemId).map(item=>({
    otherLabel:item.leftId===itemId?item.rightLabel:item.leftLabel,
    otherStartsAt:item.leftId===itemId?item.rightStartsAt:item.leftStartsAt,
    otherEndsAt:item.leftId===itemId?item.rightEndsAt:item.leftEndsAt,
    roomLabel:item.roomLabel,causes:item.causes}));
}

async function journal(client,{actor,itemId,action,before,after,motif}){
  await client.query(`insert into scope_journal_metier(journal_id,auteur_id,entite,entite_id,action,avant,apres,commentaire)
    values($1,$2,'quo_vadis_occurrence',$3,$4,$5::jsonb,$6::jsonb,$7)`,
    [randomUUID(),actor || null,String(itemId),action,JSON.stringify(before),JSON.stringify(after),motif || null]);
}

// Use the operational editor and population motor, on the existing event, in the preparation transaction.
async function applyPublishedRevision(client,link,fields,changedFields,{actor,motif,expectedVersion,confirmPopulationImpact}){
  const locked = (await client.query('select * from scope_evenements where evenement_id=$1 for update',[link.evenement_id])).rows[0];
  if(!locked) throw new HttpError(404,'programme_evenement_introuvable','Événement publié introuvable.');
  if(Number(expectedVersion) !== Number(locked.version))
    throw new HttpError(409,'programme_publication_conflit','L’événement publié a changé. Rouvrez sa fiche avant de poursuivre.');
  // This linked legacy EM publication predates the Programme's EMSEA reference; retain its null code.
  const legacyEm=locked.statcom_code==null && fields.statCom==='EMSEA'
    && locked.code_source==='QV26-SEANCE-EM-ED042EBD'
    && link.source_definition_id===locked.code_source
    && link.evenement_id===locked.evenement_id && !changedFields.includes('statCom');
  if(String(fields.statCom || '') !== String(locked.statcom_code || '') && !legacyEm)
    throw new HttpError(422,'programme_statcom_publie_immutable','Le Stat.Com de l’événement publié doit être conservé.');
  if(changedFields.some(key=>['qualificationCodes','cursusId'].includes(key)))
    throw new HttpError(422,'programme_revision_configuration_requise','Cette révision nécessite la configuration de formation existante de l’événement. La publication et les présences restent conservées.');
  const repo = createPgRepo(client);
  const service = createScopeService(repo);
  const patch = {baseVersion:Number(locked.version),motif,
    confirmPopulationImpact:confirmPopulationImpact === true};
  if(changedFields.includes('activityLabel')) patch.libelle=fields.activityLabel;
  if(changedFields.includes('date')) patch.date=fields.date;
  if(changedFields.includes('startTime')) patch.heureDebut=fields.startTime;
  if(changedFields.includes('endTime')) patch.heureFin=fields.endTime;
  if(changedFields.includes('domain') && !/^F[0-8]$/.test(fields.domain)) patch.domaineCode=fields.domain;
  if(changedFields.includes('responsibleLabel')) patch.responsable=fields.responsibleLabel;
  if(changedFields.includes('salleTheorieId')) patch.salle=fields.roomLabel || null;
  let relationTarget;
  let references;
  if(changedFields.some(key=>['oiCodes','publicCodes'].includes(key))){
    const oiChanged=changedFields.includes('oiCodes');
    const descriptive = logic.qvProgrammeDescriptivePublics();
    const currentCodes = async(table,column)=>(await client.query(`select ${column} as code from ${table} where evenement_id=$1`,[link.evenement_id])).rows.map(row=>row.code);
    relationTarget={event:{locationCode:null,roomCode:null},relations:{
      domainCodes:await currentCodes('scope_evenement_domaines','domaine_code'),
      targetCodes:oiChanged ? fields.oiCodes.map(code=>code.replace(':','-')) : await currentCodes('scope_evenement_cibles_qv','cible_code'),
      oiCodes:oiChanged ? logic.qvOiSites(fields.oiCodes) : (await client.query(`select o.code from scope_evenement_ois eo
        join scope_ois o using(oi_id) where eo.evenement_id=$1`,[link.evenement_id])).rows.map(row=>row.code),
      publicCodes:fields.publicCodes.filter(code=>!Object.hasOwn(descriptive,code)),
      roleCodes:await currentCodes('scope_evenement_roles_qv','role_code'),
      resourceCodes:await currentCodes('scope_evenement_ressources_qv','ressource_code')}};
    references=await ScopeQvPostgresStore.prototype.resolveReferences.call({query:(...args)=>client.query(...args)},relationTarget);
    if(oiChanged) patch.cibleIds=references.exactTargets;
    else references.exactTargets=(await client.query('select cible_id from scope_evenement_cibles where evenement_id=$1',[link.evenement_id])).rows.map(row=>row.cible_id);
  }
  const updated=await service.patchEvenement(link.evenement_id,patch,{sub:actor});
  if(relationTarget) await ScopeQvPostgresStore.prototype.replaceRelations.call({query:(...args)=>client.query(...args)},link.evenement_id,relationTarget,references);
  const descriptive=logic.qvProgrammeDescriptivePublics();
  const snapshot={};
  for(const key of ['themes','publicFreeLabels','family','participationEvaluation','planningStatus','sold','ecawinExport','ecawinActivityCode','activityNature','annualRecurrence'])
    if(changedFields.includes(key)) snapshot[key]=fields[key];
  if(changedFields.includes('domain')) snapshot.programmeDomain=fields.domain;
  if(changedFields.includes('publicCodes')) snapshot.descriptivePublics=fields.publicCodes
    .filter(code=>Object.hasOwn(descriptive,code)).map(code=>({code,label:descriptive[code]}));
  await client.query(`update scope_evenements set lieu_id=case when $5 then $2 else lieu_id end,
    salle_theorie_id=case when $6 then $3 else salle_theorie_id end,
    engine_snapshot=coalesce(nullif(engine_snapshot,'null'::jsonb),'{}'::jsonb) || $4::jsonb,
    date_fin=case when $7::boolean and date_fin=$8::date then $9::date else date_fin end
    where evenement_id=$1`,[link.evenement_id,fields.lieuId || null,fields.salleTheorieId || null,JSON.stringify(snapshot),
    changedFields.includes('lieuId'),changedFields.includes('salleTheorieId'),changedFields.includes('date'),locked.date,fields.date]);
  if(relationTarget) await service.reconcileExpectedPopulation({eventIds:[link.evenement_id],reason:'QV_TARGETED_REVISION'}, {sub:actor});
  return {eventId:link.evenement_id,version:updated.version};
}

module.exports={EDITORIAL_FIELDS,REVISION_FIELDS,revisionChanges,fieldsFromProgrammeRow,history,reservations,reservationMessages,reservationConflicts,journal,applyPublishedRevision};
