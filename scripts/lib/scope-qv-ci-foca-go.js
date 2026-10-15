'use strict';

const targets=[
  ['ea7029d5-4355-4b8c-b976-6037d6bcea7e','CI-DPS','2026-09-16T09:42:16.75416+00:00'],
  ['f618cd32-7e4a-4b2a-a34c-47d4fd5d02f1','CI-DAP','2026-09-22T16:24:49.795449+00:00']
];

function correctionSql({commit=false,manageTransaction=true}={}){
  const values=targets.map(([id,code,at])=>`('${id}'::uuid,'${code}','${at}'::timestamptz)`).join(',');
  return `${manageTransaction?'BEGIN ISOLATION LEVEL REPEATABLE READ;':''}
SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='60s';
CREATE TEMP TABLE ci_foca_before ON COMMIT DROP AS SELECT cursus_id,to_jsonb(d) AS data FROM scope_quo_vadis_cursus_definitions d;
CREATE TEMP TABLE ci_foca_protected(name text PRIMARY KEY,before_hash text,after_hash text) ON COMMIT DROP;
CREATE TEMP TABLE ci_foca_results(id uuid,code text,status text) ON COMMIT DROP;
CREATE TEMP TABLE ci_foca_journal_before ON COMMIT DROP AS SELECT journal_id,md5(to_jsonb(j)::text) AS hash FROM scope_journal_metier j;
DO $ci_foca$
DECLARE t record; d scope_quo_vadis_cursus_definitions%ROWTYPE; tab text; h text;
BEGIN
  FOREACH tab IN ARRAY ARRAY['scope_quo_vadis_obligations','scope_evenements','scope_affectations','scope_participations',
    'scope_attendus','scope_qv_publication_links','scope_event_code_allocations','scope_person_qualifications',
    'scope_quo_vadis_cursus_programmes','scope_quo_vadis_cursus_step_programmes','scope_quo_vadis_cursus_versions',
    'scope_quo_vadis_cursus_steps','scope_quo_vadis_cohortes','scope_public_definitions','scope_public_rule_versions'] LOOP
    EXECUTE format('SELECT md5(coalesce(string_agg(md5(to_jsonb(x)::text),'''' ORDER BY md5(to_jsonb(x)::text)),'''')) FROM %I x',tab) INTO h;
    INSERT INTO ci_foca_protected VALUES(tab,h,NULL);
  END LOOP;
  FOR t IN SELECT * FROM (VALUES ${values}) AS x(id,code,at) LOOP
    SELECT * INTO STRICT d FROM scope_quo_vadis_cursus_definitions WHERE cursus_id=t.id FOR UPDATE;
    IF d.code<>t.code OR d.statut<>'ACTIF' THEN RAISE EXCEPTION 'Cursus identity/status conflict'; END IF;
    IF d.domain_code='FOCA' THEN INSERT INTO ci_foca_results VALUES(t.id,t.code,'CONFORME'); CONTINUE; END IF;
    IF d.domain_code IS NOT NULL OR d.updated_at IS DISTINCT FROM t.at THEN RAISE EXCEPTION 'Cursus concurrent change, no write'; END IF;
    UPDATE scope_quo_vadis_cursus_definitions SET domain_code='FOCA',updated_at=clock_timestamp() WHERE cursus_id=t.id;
    INSERT INTO scope_journal_metier(journal_id,auteur_id,entite,entite_id,action,avant,apres,commentaire)
    VALUES(gen_random_uuid(),'codex:moa-go:2026-10-15','quo_vadis_cursus',t.id::text,'MODIFIER_CURSUS',
      jsonb_build_object('code',t.code,'domain_code',d.domain_code),jsonb_build_object('code',t.code,'domain_code','FOCA'),
      'GO MOA complément 15.10.2026 : rattachement CI à FOCA uniquement');
    INSERT INTO ci_foca_results VALUES(t.id,t.code,'CORRECTED');
  END LOOP;
  IF EXISTS(SELECT 1 FROM ci_foca_before b FULL JOIN scope_quo_vadis_cursus_definitions p USING(cursus_id)
    WHERE b.cursus_id IS NULL OR p.cursus_id IS NULL OR CASE WHEN EXISTS(SELECT 1 FROM ci_foca_results r WHERE r.id=b.cursus_id AND status='CORRECTED')
      THEN b.data-'domain_code'-'updated_at' IS DISTINCT FROM to_jsonb(p)-'domain_code'-'updated_at'
      ELSE b.data IS DISTINCT FROM to_jsonb(p) END) THEN RAISE EXCEPTION 'Unexpected cursus change'; END IF;
  FOR tab IN SELECT name FROM ci_foca_protected LOOP
    EXECUTE format('SELECT md5(coalesce(string_agg(md5(to_jsonb(x)::text),'''' ORDER BY md5(to_jsonb(x)::text)),'''')) FROM %I x',tab) INTO h;
    UPDATE ci_foca_protected SET after_hash=h WHERE name=tab;
  END LOOP;
  IF EXISTS(SELECT 1 FROM ci_foca_protected WHERE before_hash<>after_hash) THEN RAISE EXCEPTION 'Protected data changed'; END IF;
  IF EXISTS(SELECT 1 FROM ci_foca_journal_before b LEFT JOIN scope_journal_metier j USING(journal_id)
    WHERE j.journal_id IS NULL OR b.hash<>md5(to_jsonb(j)::text)) THEN RAISE EXCEPTION 'Journal history changed'; END IF;
  IF (SELECT count(*) FROM scope_journal_metier)<>(SELECT count(*) FROM ci_foca_journal_before)
    +(SELECT count(*) FROM ci_foca_results WHERE status='CORRECTED') THEN RAISE EXCEPTION 'Unexpected journal write'; END IF;
END $ci_foca$;
SELECT jsonb_build_object('at',now(),'committed',${commit},'results',(SELECT jsonb_agg(to_jsonb(r)) FROM ci_foca_results r),
  'protectedTables',(SELECT jsonb_agg(to_jsonb(p) ORDER BY name) FROM ci_foca_protected p)) AS proof;
${manageTransaction?(commit?'COMMIT;':'ROLLBACK;'):''}`;
}

module.exports={correctionSql};
