const { response, verifyToken, bearerToken } = require('./_auth-utils');
const db = require('./_postgres');
const { storageDriver } = require('./_data-store');

async function count(table){
  const result = await db.query(`select count(*)::int as count from ${table}`);
  return Number(result.rows?.[0]?.count || 0);
}

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  try{ verifyToken(bearerToken(event), 'access'); }
  catch(error){ return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) }); }

  try{
    await db.ensureCoreSchema();
    const collections = {
      records: await count('monitoring_f7_records'),
      importedEvents: await count('monitoring_f7_imported_events'),
      referencePeriods: await count('monitoring_f7_reference_periods'),
      objectives: await count('monitoring_f7_objectives')
    };
    return response(200, { ok:true, storageDriver:storageDriver(), collections, checkedAt:new Date().toISOString() });
  }catch(error){
    return response(500, { ok:false, error:'data_status_failed', message:String(error.message || error) });
  }
};
