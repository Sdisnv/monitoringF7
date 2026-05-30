/* Monitoring F7 v65 — helpers import JSON centralisés.
   La logique complète reste appelée par app.js, mais les contrôles génériques sont maintenant factorisés. */
(function(){
  'use strict';
  const MAX_JSON_BYTES = 8 * 1024 * 1024;
  const ALLOWED_TOP_LEVEL_KEYS = new Set(['type','app','application','version','exportedAt','records','importedEvents','referencePeriods','selectedReferencePeriodId','references','objectives','schemaVersion','storageSchemaVersion','appVersion','sourceVersion','migrationHistory','storageDiagnostics']);

  function validateImportFile(file, allowedExtensions, maxBytes){
    if(!file) throw new Error('Aucun fichier sélectionné.');
    const name = String(file.name || '').toLowerCase();
    if(allowedExtensions && !allowedExtensions.some(ext => name.endsWith(ext))){
      throw new Error(`Type de fichier refusé. Formats autorisés : ${allowedExtensions.join(', ')}.`);
    }
    if(file.size <= 0) throw new Error('Fichier vide.');
    if(file.size > (maxBytes || MAX_JSON_BYTES)) throw new Error(`Fichier trop volumineux. Limite : ${Math.round((maxBytes || MAX_JSON_BYTES) / 1024 / 1024)} Mo.`);
  }

  function validateMonitoringImportPayload(parsed){
    if(Array.isArray(parsed)){
      if(parsed.length > 20000) throw new Error('Import refusé : nombre d’exercices anormalement élevé.');
      return { format:'legacy-array', records: parsed.length };
    }
    if(!parsed || typeof parsed !== 'object') throw new Error('Le JSON doit contenir un objet ou un tableau d’exercices.');
    if(parsed.type && !String(parsed.type).toLowerCase().includes('monitoring')) throw new Error('Type de sauvegarde JSON non reconnu pour Monitoring F7.');
    const unexpected = Object.keys(parsed).filter(key => !ALLOWED_TOP_LEVEL_KEYS.has(key));
    const criticalUnexpected = unexpected.filter(key => /script|html|token|password|credential|auth/i.test(key));
    if(criticalUnexpected.length) throw new Error('Import refusé : champ critique inattendu détecté (' + criticalUnexpected.join(', ') + ').');
    if(unexpected.length) console.warn('Monitoring F7 : champs JSON non reconnus ignorés', unexpected);
    const hasKnownData = Array.isArray(parsed.records) || Array.isArray(parsed.importedEvents) || Array.isArray(parsed.referencePeriods) || parsed.references || parsed.objectives;
    if(!hasKnownData) throw new Error('Structure JSON non reconnue : records/importedEvents/referencePeriods absents.');
    if(parsed.version && !/^v?\d+/i.test(String(parsed.version))) throw new Error('Version JSON illisible.');
    if(parsed.version && parseInt(String(parsed.version).replace(/\D/g, '') || '0', 10) > 999) throw new Error('Version JSON anormale.');
    if(Array.isArray(parsed.records) && parsed.records.length > 20000) throw new Error('Import refusé : nombre d’exercices anormalement élevé.');
    if(Array.isArray(parsed.importedEvents) && parsed.importedEvents.length > 50000) throw new Error('Import refusé : nombre d’événements importés anormalement élevé.');
    return { format:'object' };
  }

  const api = Object.freeze({ validateImportFile, validateMonitoringImportPayload });
  window.MonitoringDataImport = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.importJson = api;
})();
