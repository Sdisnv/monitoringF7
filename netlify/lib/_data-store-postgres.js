const db = require('./_postgres');

const COLLECTIONS = Object.freeze({
  records: { table:'monitoring_f7_records', idField:'id' },
  'imported-events': { table:'monitoring_f7_imported_events', idField:'id' },
  'reference-periods': { table:'monitoring_f7_reference_periods', idField:'id' },
  objectives: { table:'monitoring_f7_objectives', idField:'key' }
});

function getCollectionConfig(collection){
  const config = COLLECTIONS[String(collection || '')];
  if(!config) throw new Error(`Collection PostgreSQL non supportee: ${collection}`);
  return config;
}

function itemId(item, fallbackPrefix, index){
  if(item && typeof item === 'object'){
    if(item.id !== undefined && item.id !== null && String(item.id).trim()) return String(item.id);
    if(item.key !== undefined && item.key !== null && String(item.key).trim()) return String(item.key);
  }
  return `${fallbackPrefix}-${index + 1}`;
}

async function readCollection(collection){
  await db.ensureCoreSchema();
  const config = getCollectionConfig(collection);
  const result = await db.query(
    `select payload, schema_version, updated_at from ${config.table} order by updated_at desc, id asc`
  );
  const rows = result.rows || [];
  const updatedAt = rows.length ? rows[0].updated_at : null;
  const schemaVersion = rows.length ? rows[0].schema_version : 4;
  return {
    ok: true,
    data: {
      schemaVersion,
      updatedAt,
      items: rows.map(row => row.payload)
    }
  };
}

async function writeCollection(collection, items, schemaVersion){
  await db.ensureCoreSchema();
  const config = getCollectionConfig(collection);
  const now = new Date().toISOString();
  await db.transaction(async client => {
    for(const [index, item] of items.entries()){
      await client.query(
        `insert into ${config.table}(id, payload, schema_version, updated_at)
         values ($1, $2::jsonb, $3, $4)
         on conflict (id) do update set payload = excluded.payload, schema_version = excluded.schema_version, updated_at = excluded.updated_at`,
        [itemId(item, collection, index), JSON.stringify(item || {}), schemaVersion || 4, now]
      );
    }
  });
  return { ok:true, updatedAt:now };
}

module.exports = {
  readCollection,
  writeCollection
};
