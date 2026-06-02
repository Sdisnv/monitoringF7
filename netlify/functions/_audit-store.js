const db = require('./_postgres');
function rid(){ return (global.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function safeContext(value){
  if(!value || typeof value !== 'object') return {};
  const out = {};
  Object.entries(value).forEach(([k,v]) => {
    if(/password|token|secret|credential|cookie/i.test(k)) return;
    out[k] = v;
  });
  return out;
}
async function addAudit({ level='info', eventType='action', status='success', message='', context={}, actorSubject='', source='api' }){
  const entry = { id:rid(), level, eventType, status, message, context:safeContext(Object.assign({ source }, context)), actorSubject, createdAt:new Date().toISOString() };
  try{
    await db.query(`insert into monitoring_f7_audit_entries(id, level, event_type, status, message, context, actor_subject, created_at)
      values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`, [entry.id, entry.level, entry.eventType, entry.status, entry.message, JSON.stringify(entry.context), entry.actorSubject || null, entry.createdAt]);
  }catch(error){ /* l'audit ne doit pas bloquer l'action principale */ }
  return entry;
}
async function listAudit(limit){
  const n = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const result = await db.query(`select id, level, event_type, status, message, context, actor_subject, created_at from monitoring_f7_audit_entries order by created_at desc limit $1`, [n]);
  return (result.rows || []).map(r => ({ id:r.id, level:r.level, eventType:r.event_type, status:r.status, message:r.message, context:r.context || {}, actorSubject:r.actor_subject, createdAt:r.created_at }));
}
module.exports = { addAudit, listAudit };
