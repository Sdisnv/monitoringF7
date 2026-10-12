'use strict';

const ecawin = require('../../assets/js/scope-ecawin');

async function synchronizeEcawinReferential(client) {
  const references = ecawin.associations.map(row => ({code:row.statCom,label:row.description,active:row.active,
    metadata:{ecawin:{activityCode:row.activityCode,source:row.source,sourceImage:ecawin.sourceImage,
      historicalOnly:!row.active}}}));
  // Keep SCOPE identifiers, internal taxonomy, validity dates and prior suspensions.
  await client.query(`insert into scope_statcom_referentiel as current(code,label,active,metadata)
    select code,label,active,metadata from jsonb_to_recordset($1::jsonb)
      as reference(code text,label text,active boolean,metadata jsonb)
    on conflict(code) do update set label=excluded.label,
      active=current.active and excluded.active,metadata=current.metadata || excluded.metadata,updated_at=now()
    where current.label is distinct from excluded.label
      or current.active is distinct from (current.active and excluded.active)
      or current.metadata is distinct from (current.metadata || excluded.metadata)`,[JSON.stringify(references)]);
  await client.query(`update scope_statcom_referentiel set active=false,
    metadata=metadata || '{"ecawinQualification":"UNQUALIFIED_HISTORICAL"}'::jsonb,updated_at=now()
    where active=true and code <> 'EMSEA' and not(code=any($1::text[]))`,[references.map(row=>row.code)]);
}

module.exports = {synchronizeEcawinReferential};
