const crypto = require('crypto');
const db = require('./_postgres');

async function auditEntry(entry){
  try{
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    await db.query(
      `insert into monitoring_f7_audit_entries(id, level, event_type, status, message, context, actor_subject, created_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,now())`,
      [id, entry.level || 'info', entry.eventType || entry.action || 'event', entry.status || 'success', entry.message || '', JSON.stringify(entry.context || {}), entry.actor || null]
    );
  }catch(error){
    console.warn('[Monitoring F7 audit]', error.message || error);
  }
}
async function listAudit(limit){
  const n = Math.min(Math.max(parseInt(limit || '100',10) || 100, 1), 500);
  const result = await db.query(`select id, level, event_type, status, message, context, actor_subject, created_at from monitoring_f7_audit_entries order by created_at desc limit $1`, [n]);
  return result.rows || [];
}
module.exports = { auditEntry, listAudit };
