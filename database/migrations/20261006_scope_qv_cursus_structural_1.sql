-- Source: QUO VADIS '26, SHA-256 58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742.
-- Additive cursus structure; CI-DPS and all programme/publication decisions remain untouched.
begin;
select pg_advisory_xact_lock(671902274);

create temporary table qv_cursus_source (
  code text, libelle text, domain_code text, step_code text, step_label text,
  ordre integer, source_line integer, source_year integer
) on commit drop;

insert into qv_cursus_source values
  ('CI-DAP','CI DAP','FOCA','M01','Module 1 - Leadership et bases légales',1,190,2026),
  ('CI-DAP','CI DAP','FOCA','M02','Module 2 - Activités de conduite',2,268,2026),
  ('CI-DAP','CI DAP','FOCA','M03','Module 3 - Interventions, aspects tactico-techniques',3,386,2026),
  ('CI-DAP','CI DAP','FOCA','M04','Module 4 - Interventions varia',4,686,2026),
  ('CI-DAP','CI DAP','FOCA','M05','Module 5 - Rapport d''intervention et fin d''engagement',5,759,2026),
  ('C-GROUPE','C groupe','FOCA','M01','Module 1 - Conduite et leadership',1,48,2026),
  ('C-GROUPE','C groupe','FOCA','M02','Module 2 - Méthodologie didactique',2,507,2026),
  ('C-GROUPE','C groupe','FOCA','M03','Module 3 - Consolidation théorique et pratique',3,580,2026),
  ('C-GROUPE','C groupe','FOCA','M04','Module 4 - Consolidation théorique et pratique',4,756,2026),
  ('PAPR','PAPR','PR','M01','Module 1 - Petzi découvre l''APR',1,899,2027),
  ('PAPR','PAPR','PR','M02','Module 2 - Matériel PR',2,10,2026),
  ('PAPR','PAPR','PR','M03','Module 3 - AO Simulateur',3,373,2026),
  ('PAPR','PAPR','PR','M04','Module 4 - Surveillance PR',4,687,2026),
  ('PAPR','PAPR','PR','M05','Module 5 - R&S grand volume',5,803,2026),
  ('PAPR','PAPR','PR','M06','Module 6 - Cobra',6,826,2026),
  ('PAPR','PAPR','PR','M07','Module 7 - Engagement pratique',7,845,2026),
  ('TP9','TP9','AUTO','M01','Module 1 - Discovery',1,77,2026),
  ('TP9','TP9','AUTO','M02','Module 2 - Practice',2,122,2026),
  ('TP9','TP9','AUTO','M03.1','Module 3.1 - Drive',3,150,2026),
  ('TP9','TP9','AUTO','M03.2','Module 3.2 - Drive',4,258,2026),
  ('TP9','TP9','AUTO','LIBRE','Conduite libre',5,397,2026),
  ('COND-VL','cond VL','AUTO','M01.0','Module 1.0 - théorie',1,902,2027),
  ('COND-VL','cond VL','AUTO','M02.0','Module 2.0 - Connaissance véhicule',2,34,2026),
  ('COND-VL','cond VL','AUTO','M03.1','Module 3.1 - remorques',3,504,2026),
  ('COND-VL','cond VL','AUTO','M03.2','Module 3.2 - remorques',4,536,2026),
  ('COND-VL','cond VL','AUTO','M04.1','Module 4.1 - validation moyens prioritaires',5,811,2026),
  ('COND-VL','cond VL','AUTO','M04.2','Module 4.2 - validation moyens prioritaires',6,819,2026),
  ('MEA','MEA','AUTO','M01.0','Module 1.0',1,890,2027),
  ('MEA','MEA','AUTO','M02.1','Module 2.1',2,19,2026),
  ('MEA','MEA','AUTO','M02.2','Module 2.2',3,21,2026),
  ('MEA','MEA','AUTO','M03.1','Module 3.1',4,70,2026),
  ('MEA','MEA','AUTO','M03.2','Module 3.2',5,86,2026),
  ('MEA','MEA','AUTO','M04.1','Module 4.1',6,111,2026),
  ('MEA','MEA','AUTO','M04.2','Module 4.2',7,127,2026),
  ('MEA','MEA','AUTO','M05.1','Module 5.1',8,149,2026),
  ('MEA','MEA','AUTO','M05.2','Module 5.2',9,156,2026),
  ('MEA','MEA','AUTO','M06.1','Module 6.1',10,233,2026),
  ('MEA','MEA','AUTO','M06.2','Module 6.2',11,236,2026),
  ('MEA','MEA','AUTO','M07.1','Module 7.1',12,240,2026),
  ('MEA','MEA','AUTO','M07.2','Module 7.2',13,249,2026),
  ('MEA','MEA','AUTO','M08.1','Module 8.1',14,306,2026),
  ('MEA','MEA','AUTO','M08.2','Module 8.2',15,311,2026),
  ('MEA','MEA','AUTO','M09.1','Module 9.1',16,385,2026),
  ('MEA','MEA','AUTO','M09.2','Module 9.2',17,396,2026),
  ('JSP','JSP','JSP','M01','Module 1 - Petzi découvre les pin-pon',1,6,2026),
  ('JSP','JSP','JSP','M02','Module 2 - Petzi apprend les bases',2,8,2026),
  ('OFSI-BASE','OFSI formation de base','FOSPEC','M01','Formation de base',1,266,2026),
  ('OPERATEUR-VPC','Opérateur VPC','FOSPEC','M01','Module 1',1,49,2026),
  ('ELEVATEUR-S2','Élévateur à timon S2','AUTO','M01','Module 1',1,114,2026);

do $$ begin
  if exists (select 1 from qv_cursus_source s left join scope_domaines d on d.code=s.domain_code where d.code is null)
    or exists (select 1 from qv_cursus_source s join scope_quo_vadis_cursus_definitions d on d.code=s.code
               where d.libelle<>s.libelle or (d.domain_code is not null and d.domain_code<>s.domain_code))
    or exists (select 1 from qv_cursus_source s join scope_quo_vadis_cursus_definitions d on d.code=s.code
               join scope_quo_vadis_cursus_versions v on v.cursus_id=d.cursus_id and v.version_code='2027'
               join scope_quo_vadis_cursus_steps t on t.cursus_version_id=v.cursus_version_id and t.step_code=s.step_code
               where t.ordre<>s.ordre or t.libelle<>s.step_label) then
    raise exception 'QV cursus source/referential divergence: manual review required';
  end if;
end $$;

insert into scope_quo_vadis_cursus_definitions(code,libelle,domain_code,description,metadata)
select distinct code,libelle,domain_code,'Structure modulaire constatée dans QUO VADIS 2026.',
  jsonb_build_object('source','QUO_VADIS_2026','sourceWorkbookSha256','58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742')
from qv_cursus_source
on conflict (code) do nothing;

insert into scope_quo_vadis_cursus_versions(cursus_id,version_code,valid_from,metadata)
select distinct d.cursus_id,'2027','2027-01-01'::date,
  jsonb_build_object('source','QUO_VADIS_2026','role','2027_REFERENTIAL_FROM_HISTORICAL_SOURCE')
from qv_cursus_source s join scope_quo_vadis_cursus_definitions d on d.code=s.code
on conflict (cursus_id,version_code) do nothing;

insert into scope_quo_vadis_cursus_steps(cursus_version_id,step_code,libelle,ordre,logical_year,metadata)
select v.cursus_version_id,s.step_code,s.step_label,s.ordre,1,
  jsonb_build_object('source','QUO_VADIS_2026','sourceLine',s.source_line,'sourceYear',s.source_year)
from qv_cursus_source s
join scope_quo_vadis_cursus_definitions d on d.code=s.code
join scope_quo_vadis_cursus_versions v on v.cursus_id=d.cursus_id and v.version_code='2027'
on conflict (cursus_version_id,step_code) do nothing;

-- Only five explicit 2027, already-validated preparations receive their proven step FK.
update scope_quo_vadis_obligations o set cursus_step_id=t.step_id,updated_at=now()
from (values
  ('qv-source-886','JSP','M01'),('qv-source-890','MEA','M01.0'),
  ('qv-source-899','PAPR','M01'),('qv-source-902','COND-VL','M01.0'),('qv-source-903','JSP','M02')
) as x(source_ref,code,step_code)
join scope_quo_vadis_cursus_definitions d on d.code=x.code
join scope_quo_vadis_cursus_versions v on v.cursus_id=d.cursus_id and v.version_code='2027' and v.active is true
join scope_quo_vadis_cursus_steps t on t.cursus_version_id=v.cursus_version_id and t.step_code=x.step_code
where o.source_ref=x.source_ref and o.source_type='MANUAL' and o.cursus_step_id is null
  and exists (select 1 from scope_quo_vadis_programmes p where p.programme_id=o.programme_id and p.annee=2027)
  and o.statut='PLANIFIE' and o.metadata->>'source'='QV_PROGRAMME_PREPARATION'
  and o.metadata->>'automatedSnapshot'='true' and o.metadata->>'humanDecision'='false';

do $$ begin
  if (select count(*) from qv_cursus_source)<>49
    or (select count(distinct code) from qv_cursus_source)<>10
    or (select count(*) from qv_cursus_source s
        join scope_quo_vadis_cursus_definitions d on d.code=s.code
        join scope_quo_vadis_cursus_versions v on v.cursus_id=d.cursus_id and v.version_code='2027'
        join scope_quo_vadis_cursus_steps t on t.cursus_version_id=v.cursus_version_id and t.step_code=s.step_code
        where t.ordre=s.ordre and t.libelle=s.step_label)<>49
    or (select count(*) from scope_quo_vadis_obligations o
        join scope_quo_vadis_cursus_steps t on t.step_id=o.cursus_step_id
        join scope_quo_vadis_cursus_versions v on v.cursus_version_id=t.cursus_version_id
        join scope_quo_vadis_cursus_definitions d on d.cursus_id=v.cursus_id
        where (o.source_ref,d.code,t.step_code) in
          (('qv-source-886','JSP','M01'),('qv-source-890','MEA','M01.0'),
           ('qv-source-899','PAPR','M01'),('qv-source-902','COND-VL','M01.0'),('qv-source-903','JSP','M02')))<>5 then
    raise exception 'QV cursus reconciliation incomplete: no changes committed';
  end if;
end $$;

insert into monitoring_f7_schema_migrations(version)
values ('scope-qv-cursus-structural-1') on conflict (version) do nothing;
commit;
