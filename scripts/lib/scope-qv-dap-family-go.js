'use strict';
const assert=require('node:assert/strict');
const L=require('../../assets/js/scope-ui-logic');
const revisions=require('../../netlify/lib/_scope-qv-programme-revisions');
const canonical=require('../../netlify/lib/data/scope-qv-programme-2027.json');
const definitions=new Set(canonical.rows.map(row=>row.definitionId).filter(id=>
  /^QV26-(?:EXERCICE-DAP-[1-4]-|COURS-DE-CADRES-EXERCICE-DAP-[1-4]-)/.test(id)));

function prepare(preflight){
  assert.equal(preflight.readOnly,'on');
  return preflight.rows.map(({record:r,fingerprint})=>{
    const source=r.metadata.canonicalRow,fields=r.metadata.planningFields || {};
    assert.ok(definitions.has(source.definitionId));
    const oi=L.qvProgrammeConfirmedOiCodes({...source,oiSelections:fields.oiCodes || source.oiSelections});
    const family=fields.family ?? source.family;
    const stat=fields.statCom ?? r.statcom_code;
    const proven=oi.length===1 && /^DAP:Y[1-4]$/.test(oi[0]) && stat===`013${oi[0].slice(4)}` && stat===r.statcom_code;
    const change=revisions.revisionChanges(fields,{...fields,family:'DAP'});
    const status=family==='DAP'?'CONFORME':proven && family==='Exercice' && change.kind==='MINOR'
      && JSON.stringify(change.changedFields)==='["family"]'?'CANDIDATE':'BLOCKED_REFERENTIAL';
    return {id:r.obligation_id,sourceRef:r.source_ref,definitionId:source.definitionId,statCom:stat,oi:oi[0],
      family,status,fingerprint,date:fields.date || null,activity:fields.activityLabel || r.title,updatedAt:r.updated_at};
  });
}

function correctionSql(plan,{commit=false,manageTransaction=true}={}){
  assert.equal(plan.length,32);assert.equal(new Set(plan.map(row=>row.id)).size,32);
  const values=JSON.stringify(plan);assert.ok(!values.includes('$moa_targets$'));
  return `${manageTransaction?'BEGIN ISOLATION LEVEL REPEATABLE READ;':''}
SET LOCAL TIME ZONE 'UTC';
SET LOCAL lock_timeout='4s';
SET LOCAL statement_timeout='90s';
CREATE TEMP TABLE moa_dap_targets ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset($moa_targets$${values}$moa_targets$::jsonb)
  AS x(id uuid,"sourceRef" text,"definitionId" text,"statCom" text,oi text,family text,status text,fingerprint text,date text,activity text,"updatedAt" text);
CREATE TEMP TABLE moa_dap_before ON COMMIT DROP AS SELECT obligation_id,to_jsonb(o) AS data FROM scope_quo_vadis_obligations o;
CREATE TEMP TABLE moa_dap_journal_before ON COMMIT DROP AS SELECT journal_id,md5(to_jsonb(j)::text) AS hash FROM scope_journal_metier j;
CREATE TEMP TABLE moa_dap_integrity(name text PRIMARY KEY,before_hash text,after_hash text) ON COMMIT DROP;
CREATE TEMP TABLE moa_dap_results(id uuid,"sourceRef" text,status text,reason text,before_family text,after_family text) ON COMMIT DROP;
DO $moa_go$
DECLARE t record; o scope_quo_vadis_obligations%ROWTYPE; old_meta jsonb; new_meta jsonb; trace jsonb; tab text; h text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM scope_quo_vadis_programmes WHERE programme_id='84611ad2-d4e8-4de1-86a2-88bebbe0153c' AND annee=2027)
    THEN RAISE EXCEPTION 'Wrong SCOPE programme'; END IF;
  FOREACH tab IN ARRAY ARRAY['scope_evenements','scope_qv_publication_links','scope_affectations','scope_participations','scope_attendus',
    'scope_event_code_allocations','scope_evenement_ois','scope_evenement_publics_qv','scope_person_qualifications'] LOOP
    EXECUTE format('SELECT md5(coalesce(string_agg(md5(to_jsonb(x)::text),'''' ORDER BY md5(to_jsonb(x)::text)),'''')) FROM %I x',tab) INTO h;
    INSERT INTO moa_dap_integrity VALUES(tab,h,NULL);
  END LOOP;
  FOR t IN SELECT * FROM moa_dap_targets ORDER BY id LOOP
    BEGIN
      SELECT * INTO o FROM scope_quo_vadis_obligations WHERE obligation_id=t.id FOR UPDATE;
      IF NOT FOUND THEN INSERT INTO moa_dap_results VALUES(t.id,t."sourceRef",'BLOCKED','Missing occurrence',NULL,NULL); CONTINUE; END IF;
      old_meta=o.metadata;
      IF coalesce(old_meta->'planningFields'->>'family',old_meta->'canonicalRow'->>'family')='DAP' THEN
        INSERT INTO moa_dap_results VALUES(t.id,t."sourceRef",'CONFORME','Already corrected, untouched','DAP','DAP'); CONTINUE;
      END IF;
      IF t.status<>'CANDIDATE' OR md5(to_jsonb(o)::text)<>t.fingerprint OR o.source_ref<>t."sourceRef"
        OR o.programme_id<>'84611ad2-d4e8-4de1-86a2-88bebbe0153c' OR o.statcom_code IS DISTINCT FROM t."statCom"
        OR old_meta->'canonicalRow'->>'definitionId' IS DISTINCT FROM t."definitionId" THEN
        INSERT INTO moa_dap_results VALUES(t.id,t."sourceRef",'BLOCKED','Concurrent change or unproven reference',t.family,NULL); CONTINUE;
      END IF;
      IF o.scope_evenement_id IS NOT NULL OR EXISTS(SELECT 1 FROM scope_qv_publication_links WHERE source_year=2027 AND publication_unit_id=o.source_ref)
        OR old_meta->'publicationRevision'->>'status' IN ('PENDING','WITHDRAWN') OR old_meta->'validationWithdrawal' IS NOT NULL AND old_meta->'validationWithdrawal'<>'null'::jsonb
        OR o.statut NOT IN ('A_PLANIFIER','PROPOSE','PLANIFIE') THEN
        INSERT INTO moa_dap_results VALUES(t.id,t."sourceRef",'BLOCKED','Publication/revision/workflow requires separate handling',t.family,NULL); CONTINUE;
      END IF;
      new_meta=jsonb_set(old_meta,'{planningFields}',coalesce(old_meta->'planningFields','{}'::jsonb)
        ||jsonb_build_object('family','DAP','updatedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
      IF old_meta->>'automatedSnapshot'='true' AND old_meta->>'humanDecision' IS DISTINCT FROM 'true' THEN
        new_meta=jsonb_set(new_meta,'{familyDecision}',jsonb_build_object('scope','FAMILY_ONLY','family','DAP',
          'source','MOA_GO_20261015','actor','codex:moa-go:2026-10-15','at',clock_timestamp()));
      END IF;
      trace=jsonb_build_object('action','MODIFIER_OCCURRENCE','motif','GO MOA 15.10.2026 : classification DAP seule, QV-DAP-002',
        'actor','codex:moa-go:2026-10-15','at',clock_timestamp(),'validation',old_meta->'businessValidation','revision',old_meta->'publicationRevision');
      new_meta=jsonb_set(new_meta,'{validationHistory}',coalesce(old_meta->'validationHistory','[]'::jsonb)||jsonb_build_array(trace));
      UPDATE scope_quo_vadis_obligations SET metadata=new_meta,updated_at=clock_timestamp() WHERE obligation_id=t.id;
      INSERT INTO scope_journal_metier(journal_id,auteur_id,entite,entite_id,action,avant,apres,commentaire)
      VALUES(gen_random_uuid(),'codex:moa-go:2026-10-15','quo_vadis_occurrence',o.source_ref,'MODIFIER_OCCURRENCE',
        jsonb_build_object('validation',old_meta->'businessValidation','fields',old_meta->'planningFields'),
        jsonb_build_object('validation',new_meta->'businessValidation','fields',new_meta->'planningFields','revision',new_meta->'publicationRevision',
          'transaction',jsonb_build_object('source','Programme SCOPE','workflow','SAVE','classificationOnly',true,'authorization','GO MOA 15.10.2026')),
        'GO MOA 15.10.2026 : classification DAP seule, QV-DAP-002');
      INSERT INTO moa_dap_results VALUES(t.id,t."sourceRef",'CORRECTED','Editorial family-only SAVE; previous validation retained',t.family,'DAP');
    EXCEPTION WHEN lock_not_available OR serialization_failure THEN
      INSERT INTO moa_dap_results VALUES(t.id,t."sourceRef",'BLOCKED','Concurrent lock/change; target skipped',t.family,NULL);
    END;
  END LOOP;
  IF EXISTS(SELECT 1 FROM moa_dap_before b FULL JOIN scope_quo_vadis_obligations p USING(obligation_id)
    WHERE b.obligation_id IS NULL OR p.obligation_id IS NULL OR
    CASE WHEN EXISTS(SELECT 1 FROM moa_dap_results r WHERE r.id=b.obligation_id AND r.status='CORRECTED') THEN
      b.data-'metadata'-'updated_at' IS DISTINCT FROM to_jsonb(p)-'metadata'-'updated_at'
      OR (b.data->'metadata')-'planningFields'-'validationHistory'-'familyDecision' IS DISTINCT FROM p.metadata-'planningFields'-'validationHistory'-'familyDecision'
      OR coalesce(b.data->'metadata'->'planningFields','{}'::jsonb)-'family'-'updatedAt' IS DISTINCT FROM (p.metadata->'planningFields')-'family'-'updatedAt'
      OR coalesce(b.data->'metadata'->'validationHistory','[]'::jsonb) IS DISTINCT FROM (SELECT coalesce(jsonb_agg(v ORDER BY n),'[]'::jsonb)
        FROM jsonb_array_elements(p.metadata->'validationHistory') WITH ORDINALITY a(v,n)
        WHERE n<=jsonb_array_length(coalesce(b.data->'metadata'->'validationHistory','[]'::jsonb)))
    ELSE b.data IS DISTINCT FROM to_jsonb(p) END)
    THEN RAISE EXCEPTION 'Protected occurrence data changed; full rollback'; END IF;
  IF EXISTS(SELECT 1 FROM moa_dap_journal_before b LEFT JOIN scope_journal_metier j USING(journal_id)
    WHERE j.journal_id IS NULL OR b.hash<>md5(to_jsonb(j)::text)) THEN RAISE EXCEPTION 'Previous journal changed'; END IF;
  IF (SELECT count(*) FROM scope_journal_metier)<>(SELECT count(*) FROM moa_dap_journal_before)+(SELECT count(*) FROM moa_dap_results WHERE status='CORRECTED')
    THEN RAISE EXCEPTION 'Unexpected journal count'; END IF;
  FOR tab IN SELECT name FROM moa_dap_integrity LOOP
    EXECUTE format('SELECT md5(coalesce(string_agg(md5(to_jsonb(x)::text),'''' ORDER BY md5(to_jsonb(x)::text)),'''')) FROM %I x',tab) INTO h;
    UPDATE moa_dap_integrity SET after_hash=h WHERE name=tab;
  END LOOP;
  IF EXISTS(SELECT 1 FROM moa_dap_integrity WHERE before_hash<>after_hash) THEN RAISE EXCEPTION 'Protected table changed'; END IF;
END $moa_go$;
SELECT jsonb_build_object('at',now(),'committed',${commit?'true':'false'},'scope','MOA GO 15.10.2026, family only',
  'results',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r."sourceRef") FROM moa_dap_results r),
  'protectedTables',(SELECT jsonb_agg(to_jsonb(i) ORDER BY name) FROM moa_dap_integrity i),
  'statComAndCodesIdenticalPercent',100,'existingValidationHistoryPreserved',true) AS proof;
${manageTransaction?(commit?'COMMIT;':'ROLLBACK;'):''}`;
}
module.exports={prepare,correctionSql};
