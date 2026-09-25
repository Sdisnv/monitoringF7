const INITIAL_STATCOM_CODES = [
  ['050F0', 'Heure administrative', 'ADMIN', 'ADMIN', 'F0', null],
  ['070F0', 'Séance Commandement F0', 'SEANCE', 'SEANCE', 'F0', null],
  ['070F1', 'Séance Personnel F1', 'SEANCE', 'SEANCE', 'F1', null],
  ['070F23', 'Séance Renseignements F2/3', 'SEANCE', 'SEANCE', 'F23', null],
  ['070F4', 'Séance Logistique F4', 'SEANCE', 'SEANCE', 'F4', null],
  ['070F56', 'Séance SIC F5/6', 'SEANCE', 'SEANCE', 'F56', null],
  ['070F7', 'Séance Formation F7', 'SEANCE', 'SEANCE', 'F7', null],
  ['070F8', 'Séance Finances F8', 'SEANCE', 'SEANCE', 'F8', null],
  ['014B1', 'Exercice divers B1', 'DPS', 'EXERCI', 'B1', null],
  ['012B1', 'FOCO DPS B1', 'DPS', 'EXERCI', 'B1', null],
  ['040B1', 'Solde heures matériel B1', 'DPS', 'ENTRET', 'B1', null],
  ['040B1P', 'Solde matériel / préposé gaz B1', 'DPS', 'ENTRET', 'B1', 'PREPOSE_GAZ'],
  ['020B1', 'Permanence week-end B1', 'DPS', 'PERM', 'B1', null],
  ['030B1', 'Autres prestations de garde B1', 'DPS', 'PISECU', 'B1', null],
  ['014B2', 'Exercice divers B2', 'DPS', 'EXERCI', 'B2', null],
  ['012B2', 'FOCO DPS B2', 'DPS', 'EXERCI', 'B2', null],
  ['040B2', 'Solde heures matériel B2', 'DPS', 'ENTRET', 'B2', null],
  ['040B2P', 'Solde matériel / préposé gaz B2', 'DPS', 'ENTRET', 'B2', 'PREPOSE_GAZ'],
  ['020B2', 'Permanence week-end B2', 'DPS', 'PERM', 'B2', null],
  ['030B2', 'Autres prestations de garde B2', 'DPS', 'PISECU', 'B2', null],
  ['014C1', 'Exercice divers C1', 'DPS', 'EXERCI', 'C1', null],
  ['012C1', 'FOCO DPS C1', 'DPS', 'EXERCI', 'C1', null],
  ['040C1', 'Solde heures matériel C1', 'DPS', 'ENTRET', 'C1', null],
  ['040C1P', 'Solde matériel / préposé gaz C1', 'DPS', 'ENTRET', 'C1', 'PREPOSE_GAZ'],
  ['020C1', 'Permanence week-end C1', 'DPS', 'PERM', 'C1', null],
  ['030C1', 'Autres prestations de garde C1', 'DPS', 'PISECU', 'C1', null],
  ['CECA', 'Cours ECA', 'COURS', 'COURS', null, null],
  ['CFSSP', 'Cours FSSP', 'COURS', 'COURS', null, null],
  ['CDIV', 'Cours divers', 'COURS', 'COURS', null, null],
  ['CONCOUR', 'Concours', 'EXERCICE', 'EXERCI', null, null],
  ['010FOBC', 'Cours de cadres FOBA', 'FOBA', 'EXERCI', null, 'CADRES'],
  ['EXDIV', 'Instruction sur demande ECA', 'EXERCICE', 'EXERCI', null, null],
  ['010FOBA', 'Exercices FOBA', 'FOBA', 'EXERCI', null, null],
  ['010JSP', 'Exercices JSP', 'JSP', 'EXERCI', null, null],
  ['011PR', 'PR', 'PR', 'EXERCI', null, null],
  ['014G1', 'Exercice divers G1', 'DAP', 'EXERCI', 'G1', null],
  ['012G1', 'FOCO DPS G1', 'DPS', 'EXERCI', 'G1', null],
  ['040G1', 'Solde heures matériel G1', 'DAP', 'ENTRET', 'G1', null],
  ['040G1P', 'Solde matériel / préposé gaz G1', 'DAP', 'ENTRET', 'G1', 'PREPOSE_GAZ'],
  ['020G1', 'Permanence week-end G1', 'DAP', 'PERM', 'G1', null],
  ['030G1', 'Autres prestations de garde G1', 'DAP', 'PISECU', 'G1', null],
  ['071F3', 'Rapport annuel du SDIS NV', 'ADMIN', 'EXERCI', 'F3', null],
  ['072F3', 'Revue quinquennale SDIS NV', 'ADMIN', 'EXERCI', 'F3', null],
  ['073F56', 'Représentation externe', 'ADMIN', 'EXERCI', 'F56', null],
  ['0151F7', 'Solde instruction AUTO EA', 'AUTO', 'EXERCI', 'F7', 'EA'],
  ['0152F7', 'Solde instruction AUTO PL/VL', 'AUTO', 'EXERCI', 'F7', 'PL_VL'],
  ['01521F7', 'Solde instruction AUTO PL', 'AUTO', 'EXERCI', 'F7', 'PL'],
  ['01522F7', 'Solde instruction AUTO VL', 'AUTO', 'EXERCI', 'F7', 'VL'],
  ['0153F7', 'Solde instruction AUTO BAT', 'AUTO', 'EXERCI', 'F7', 'BAT'],
  ['0154F7', 'Solde instruction AUTO GRUE', 'AUTO', 'EXERCI', 'F7', 'GRUE'],
  ['0155F7', 'Solde instruction AUTO DIVERS', 'AUTO', 'EXERCI', 'F7', 'DIVERS'],
  ['0161F7', 'Solde instruction FOSPEC PIO', 'FOSPEC', 'EXERSR', 'F7', 'PIO'],
  ['0162F7', 'Solde instruction FOSPEC OFSI', 'FOSPEC', 'EXOFSI', 'F7', 'OFSI'],
  ['0163F7', 'Solde instruction FOSPEC VPC', 'FOSPEC', 'EXERCI', 'F7', 'VPC'],
  ['0164F7', 'Solde instruction FOSPEC ABC', 'FOSPEC', 'EXERCI', 'F7', 'ABC'],
  ['0165F7', 'Solde instruction FOSPEC NAC', 'FOSPEC', 'EXERCI', 'F7', 'NAC'],
  ['0166F7', 'Solde instruction FOSPEC ANTICHUTE', 'FOSPEC', 'EXERCI', 'F7', 'ANTICHUTE'],
  ['0167F7', 'Solde instruction FOSPEC SANITAIRE', 'FOSPEC', 'EXERCI', 'F7', 'SANITAIRE'],
  ['0168F7', 'Solde instruction FOSPEC DIVERS', 'FOSPEC', 'EXERCI', 'F7', 'DIVERS'],
  ['0170F7', 'Solde instruction FOCA (tous les cadres)', 'FOCA', 'EXERCI', 'F7', 'TOUS_CADRES'],
  ['0171F7', 'Solde instruction FOCA DPS', 'FOCA', 'EXERCI', 'F7', 'DPS'],
  ['0172F7', 'Solde instruction FOCA DAP', 'FOCA', 'EXERCI', 'F7', 'DAP'],
  ['0173F7', 'Solde instruction FOCA RECO DPS', 'FOCA', 'EXERCI', 'F7', 'RECO_DPS'],
  ['0174F7', 'Solde instruction FOCA RECO DAP', 'FOCA', 'EXERCI', 'F7', 'RECO_DAP'],
  ['0175F7', 'Solde instruction FOCA DIVERS', 'FOCA', 'EXERCI', 'F7', 'DIVERS'],
  ['0120F7', 'Solde instruction FOCO DPS (4 DPS)', 'DPS', 'EXERCI', 'F7', 'FOCO_DPS_4'],
  ['0130F7', 'Solde instruction FOCO DAP (4 DAP)', 'DAP', 'EXERCI', 'F7', 'FOCO_DAP_4'],
  ['050F23', 'Heure administrative renseignements F2/3', 'ADMIN', 'ADMIN', 'F23', null],
  ['013Y1', 'FOCO DAP Y1', 'DAP', 'EXERCI', 'Y1', null],
  ['040Y1', 'Solde matériel Y1', 'DAP', 'ENTRET', 'Y1', null],
  ['030Y1', 'Autres prestations de garde Y1', 'DAP', 'ENTRET', 'Y1', null],
  ['013Y2', 'FOCO DAP Y2', 'DAP', 'EXERCI', 'Y2', null],
  ['040Y2', 'Solde matériel Y2', 'DAP', 'ENTRET', 'Y2', null],
  ['030Y2', 'Autres prestations de garde Y2', 'DAP', 'ENTRET', 'Y2', null],
  ['013Y3', 'FOCO DAP Y3', 'DAP', 'EXERCI', 'Y3', null],
  ['040Y3', 'Solde matériel Y3', 'DAP', 'ENTRET', 'Y3', null],
  ['030Y3', 'Autres prestations de garde Y3', 'DAP', 'ENTRET', 'Y3', null],
  ['013Y4', 'FOCO DAP Y4', 'DAP', 'EXERCI', 'Y4', null],
  ['040Y4', 'Solde matériel Y4', 'DAP', 'ENTRET', 'Y4', null],
  ['030Y4', 'Autres prestations de garde Y4', 'DAP', 'ENTRET', 'Y4', null],
  ['050F56', 'Heure administrative Informations F5/6', 'ADMIN', 'ADMIN', 'F56', null],
  ['050F7', 'Heure administrative Formation F7', 'ADMIN', 'ADMIN', 'F7', null],
  ['050F70', 'Heure administrative Formation FOBA', 'FOBA', 'ADMIN', 'F7', null],
  ['050F71', 'Heure administrative Formation PR', 'PR', 'ADMIN', 'F7', null],
  ['050F75', 'Heure administrative Formation AUTO', 'AUTO', 'ADMIN', 'F7', null],
  ['050F76', 'Heure administrative Formation FOSPEC', 'FOSPEC', 'ADMIN', 'F7', null],
  ['050F77', 'Heure administrative Formation FOCA', 'FOCA', 'ADMIN', 'F7', null],
  ['010JB1', 'Exercices JSP B1', 'JSP', 'EXERCI', 'B1', null, '2026-01-01', "QUO VADIS '26"],
  ['010JC1', 'Exercices JSP C1', 'JSP', 'EXERCI', 'C1', null, '2026-01-01', "QUO VADIS '26"],
  ['010JG1', 'Exercices JSP G1', 'JSP', 'EXERCI', 'G1', null, '2026-01-01', "QUO VADIS '26"],
  ['COURJSP', 'Cours JSP', 'JSP', 'COURS', null, null, '2026-01-01', "QUO VADIS '26"]
];

function normalizeStatComCode(value){
  return String(value || '').trim().toUpperCase();
}

function initialStatComCodes(){
  return INITIAL_STATCOM_CODES.map(([code, label, domain, category, oi, specialization, validFrom = '2023-01-01', source = "Plan comptable - StatCOM QuoVadis'23.pdf"], index) => ({
    code,
    label,
    domain,
    category,
    oi: oi || null,
    specialization: specialization || null,
    valid_from: validFrom,
    valid_to: null,
    active: true,
    metadata: {
      source,
      sourceList: 'Liste des activités et Stat COMM pour saisie dans ECAWIN',
      sourceOrder: index + 1
    }
  }));
}

const STATCOM_SUCCESSIONS = Object.freeze([
  Object.freeze({ sourceCode:'010JY3',canonicalCode:'010JC1',effectiveFrom:'2026-01-01' })
]);

function resolveStatComCode(value,date){
  const sourceCode = normalizeStatComCode(value);
  if(!sourceCode) return { sourceCode:null,canonicalCode:null,successionApplied:false,effectiveFrom:null };
  const day = date ? String(date).slice(0,10) : null;
  const succession = STATCOM_SUCCESSIONS.find((row) => row.sourceCode === sourceCode && day && day >= row.effectiveFrom);
  return succession
    ? { sourceCode,canonicalCode:succession.canonicalCode,successionApplied:true,effectiveFrom:succession.effectiveFrom }
    : { sourceCode,canonicalCode:sourceCode,successionApplied:false,effectiveFrom:null };
}

function isStatComValidForDate(row, date){
  if(!row) return false;
  const day = date ? String(date).slice(0, 10) : null;
  if(row.active === false || row.actif === false) return false;
  const validFrom = row.valid_from || row.validFrom || null;
  const validTo = row.valid_to || row.validTo || null;
  if(day && validFrom && day < String(validFrom).slice(0, 10)) return false;
  if(day && validTo && day > String(validTo).slice(0, 10)) return false;
  return true;
}

function statComSnapshot(row){
  if(!row) return null;
  return {
    code: normalizeStatComCode(row.code),
    label: row.label || row.libelle || '',
    domain: row.domain || row.domain_code || row.domainCode || null,
    category: row.category || row.categorie || null,
    oi: row.oi || row.oi_code || row.oiCode || null,
    specialization: row.specialization || row.specialisation || null,
    valid_from: row.valid_from || row.validFrom || null,
    valid_to: row.valid_to || row.validTo || null,
    active: row.active !== false && row.actif !== false
  };
}

module.exports = {
  initialStatComCodes,
  isStatComValidForDate,
  normalizeStatComCode,
  resolveStatComCode,
  STATCOM_SUCCESSIONS,
  statComSnapshot
};
