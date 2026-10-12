'use strict';

const {randomUUID} = require('crypto');
const {HttpError} = require('./_scope-rules');
const {createPgRepo} = require('./_scope-pg');
const {createScopeService} = require('./_scope-service');
const {ScopeQvPostgresStore} = require('./_scope-qv-publication-postgres-store');
const logic = require('../../assets/js/scope-ui-logic');

const EDITORIAL_FIELDS = new Set(['activityLabel','themes','publicFreeLabels']);
const REVISION_FIELDS = ['activityLabel','themes','publicFreeLabels','date','startTime','endTime','statCom',
  'domain','oiCodes','publicCodes','responsibleLabel','lieuId','lieuLibre','salleTheorieId',
  'qualificationCodes','cursusId','participationEvaluation','ecawinActivityCode','planningStatus','sold','ecawinExport'];
function comparable(value){
  return Array.isArray(value) ? value.slice().sort() : value == null ? '' : value;
}
function revisionChanges(before,after){
  const changedFields = REVISION_FIELDS.filter(key=>JSON.stringify(comparable(before[key])) !== JSON.stringify(comparable(after[key])));
  return {changedFields,kind:changedFields.some(key=>!EDITORIAL_FIELDS.has(key)) ? 'MAJOR' : 'MINOR'};
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
  if(String(fields.statCom || '') !== String(locked.statcom_code || ''))
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
  if(changedFields.includes('domain')) patch.domaineCode=fields.domain;
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
  for(const key of ['themes','publicFreeLabels','participationEvaluation','planningStatus','sold','ecawinExport','ecawinActivityCode'])
    if(changedFields.includes(key)) snapshot[key]=fields[key];
  if(changedFields.includes('publicCodes')) snapshot.descriptivePublics=fields.publicCodes
    .filter(code=>Object.hasOwn(descriptive,code)).map(code=>({code,label:descriptive[code]}));
  await client.query(`update scope_evenements set lieu_id=case when $5 then $2 else lieu_id end,
    salle_theorie_id=case when $6 then $3 else salle_theorie_id end,
    engine_snapshot=coalesce(nullif(engine_snapshot,'null'::jsonb),'{}'::jsonb) || $4::jsonb
    where evenement_id=$1`,[link.evenement_id,fields.lieuId || null,fields.salleTheorieId || null,JSON.stringify(snapshot),
    changedFields.includes('lieuId'),changedFields.includes('salleTheorieId')]);
  if(relationTarget) await service.reconcileExpectedPopulation({eventIds:[link.evenement_id],reason:'QV_TARGETED_REVISION'}, {sub:actor});
  return {eventId:link.evenement_id,version:updated.version};
}

module.exports={EDITORIAL_FIELDS,REVISION_FIELDS,revisionChanges,journal,applyPublishedRevision};
