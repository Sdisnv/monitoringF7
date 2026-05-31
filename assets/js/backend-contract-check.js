/* Monitoring F7 v65 — vérificateur local des contrats backend, sans appel réseau. */
(function(){
  'use strict';

  function isObject(value){ return !!value && typeof value === 'object' && !Array.isArray(value); }
  function hasMethod(contract){ return ['GET','POST','PUT','PATCH','DELETE'].includes(String(contract?.method || '').toUpperCase()); }
  function hasPath(contract){ return /^\/[a-z0-9][a-z0-9/_-]*$/i.test(String(contract?.path || '')); }
  function hasAuthMode(contract){ return ['none','bearer','refresh-token'].includes(String(contract?.auth || '')); }

  function validateContracts(){
    const registry = window.MonitoringApiContracts;
    const contracts = registry?.list ? registry.list() : {};
    const names = Object.keys(contracts || {});
    const findings = [];
    names.forEach(name => {
      const contract = contracts[name];
      if(!isObject(contract)) findings.push({ level:'error', name, message:'Contrat absent ou invalide.' });
      else {
        if(!hasMethod(contract)) findings.push({ level:'error', name, message:'Méthode HTTP manquante ou invalide.' });
        if(!hasPath(contract)) findings.push({ level:'error', name, message:'Chemin API manquant ou invalide.' });
        if(!hasAuthMode(contract)) findings.push({ level:'error', name, message:'Mode auth manquant ou invalide.' });
        if(!isObject(contract.response)) findings.push({ level:'warn', name, message:'Réponse documentée absente.' });
      }
    });
    return { names, findings };
  }

  function validateSchema(){
    const schema = window.MonitoringDataSchema;
    const requiredEntities = ['record','importedEvent','referencePeriod','objective','auditEntry'];
    const findings = [];
    if(!schema) return { findings:[{ level:'error', name:'schema', message:'MonitoringDataSchema non chargé.' }] };
    requiredEntities.forEach(entity => {
      if(!Array.isArray(schema.fields?.[entity])) findings.push({ level:'error', name:entity, message:'Champs non documentés.' });
      if(!Array.isArray(schema.required?.[entity])) findings.push({ level:'warn', name:entity, message:'Champs obligatoires non documentés.' });
    });
    if(!schema.exportEnvelope?.schemaVersion) findings.push({ level:'warn', name:'exportEnvelope', message:'Version enveloppe export absente.' });
    return { findings };
  }

  function run(){
    const cfg = window.MonitoringBackendConfig?.current || {};
    const contractResult = validateContracts();
    const schemaResult = validateSchema();
    const findings = [...contractResult.findings, ...schemaResult.findings];
    const errors = findings.filter(item => item.level === 'error').length;
    const warnings = findings.filter(item => item.level === 'warn').length;
    return Object.freeze({
      ok: errors === 0,
      checkedAt: new Date().toISOString(),
      appVersion: window.MonitoringConfig?.version || 'v65',
      contractCount: contractResult.names.length,
      schemaVersion: window.MonitoringDataSchema?.schemaVersion || null,
      backendEnabled: cfg.backendEnabled === true,
      syncEnabled: cfg.syncEnabled === true,
      serverAuthEnabled: cfg.serverAuthEnabled === true,
      networkCallPerformed: false,
      errors,
      warnings,
      findings
    });
  }

  function format(result){
    const status = result.ok ? 'OK' : 'À corriger';
    const mode = result.backendEnabled ? 'backend activable par configuration' : 'backend désactivé';
    const summary = `${status} · ${result.contractCount} contrats · schéma v${result.schemaVersion || '—'} · ${mode} · aucun appel réseau`;
    if(!result.findings.length) return summary;
    return `${summary}\n${result.findings.map(item => `- ${item.level.toUpperCase()} ${item.name}: ${item.message}`).join('\n')}`;
  }

  window.MonitoringBackendContractCheck = Object.freeze({
    run,
    format
  });
})();
