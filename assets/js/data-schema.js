/* Monitoring F7 v65 — schéma de données explicite, client-only et backend-ready. */
(function(){
  'use strict';

  const SCHEMA_VERSION = 4;

  const fields = Object.freeze({
    record: [
      'id','dateExercice','domain','subStructure','template','statCom','status','aComptabiliser',
      'nbConvoques','nbPresents','nbMaladie','nbAccident','nbArmee','nbProfessionnel','nbPrive','nbAbsents',
      'nbPermutation','remarque','importedEventId','createdAt','updatedAt'
    ],
    importedEvent: ['id','dateExercice','domain','subStructure','template','statCom','status','createdAt','updatedAt'],
    referencePeriod: ['id','dateEffective','dateEnd','domaines','organes','foba','suivi','createdAt','updatedAt'],
    objective: ['key','value','domain','scope','updatedAt'],
    auditEntry: ['id','level','eventType','status','message','context','at','version']
  });

  const required = Object.freeze({
    record: ['id','dateExercice','domain','subStructure','template'],
    importedEvent: ['id','dateExercice','domain','template'],
    referencePeriod: ['id','dateEffective'],
    objective: ['key','value'],
    auditEntry: ['id','level','eventType','message','at']
  });

  function isObject(value){ return !!value && typeof value === 'object' && !Array.isArray(value); }
  function missingRequired(entity, value){
    const req = required[entity] || [];
    if(!isObject(value)) return req;
    return req.filter(key => value[key] === undefined || value[key] === null || String(value[key]).trim?.() === '');
  }
  function validateEntity(entity, value){
    const missing = missingRequired(entity, value);
    return Object.freeze({
      ok: missing.length === 0,
      entity,
      missing,
      allowedFields: fields[entity] || []
    });
  }

  window.MonitoringDataSchema = Object.freeze({
    app: 'Monitoring F7',
    version: window.MonitoringConfig?.version || 'v65',
    schemaVersion: SCHEMA_VERSION,
    fields,
    required,
    validateEntity,
    exportEnvelope: Object.freeze({
      type: 'MonitoringF7Export',
      schemaVersion: SCHEMA_VERSION,
      appVersion: window.MonitoringConfig?.version || 'v65',
      entities: ['records','importedEvents','referencePeriods','objectives']
    })
  });
})();
