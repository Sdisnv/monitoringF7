-- SCOPE-QUAL-1-R1 — import pilote DAP Y4 uniquement.
-- Idempotent. N'écrit que scope_personnes et scope_affectations.
-- Cible unique DAP/Y4. date_debut = 2026-08-19. source = CSV_IMPORT.
-- Aucun événement, aucune participation, aucune autre table métier.

insert into scope_personnes (personne_id, nip, nom, prenom, grade, actif, source)
select gen_random_uuid(), v.nip, v.nom, v.prenom, v.grade, v.actif, v.source
from (
  values
  ('40132', 'Jeanneret', 'Céline', 'Sap', true, 'CSV_IMPORT'),
  ('47386', 'Tomic', 'Ivan', 'Sap', true, 'CSV_IMPORT'),
  ('16268', 'Forestier', 'Frank', 'Sap', true, 'CSV_IMPORT'),
  ('40196', 'Boesiger', 'Mathys', 'Sap', true, 'CSV_IMPORT'),
  ('13869', 'Grosso', 'Ignazio', 'App', true, 'CSV_IMPORT'),
  ('26474', 'Frydig', 'Sabrina', 'App', true, 'CSV_IMPORT'),
  ('19903', 'Compondu', 'Johan', 'App', true, 'CSV_IMPORT'),
  ('19904', 'Chenaux', 'Stéphane', 'App', true, 'CSV_IMPORT'),
  ('38103', 'Meusy', 'Martin', 'App', true, 'CSV_IMPORT'),
  ('38192', 'Von Martini', 'Simon', 'Cpl', true, 'CSV_IMPORT'),
  ('28047', 'Hirschi', 'Sacha', 'Sgt chef', true, 'CSV_IMPORT'),
  ('51205', 'Corthésy', 'Adrien', 'Sgt chef', true, 'CSV_IMPORT'),
  ('24525', 'Cochet', 'Jean-Claude', 'Plt', true, 'CSV_IMPORT'),
  ('24989', 'David', 'Cédric', 'Plt', true, 'CSV_IMPORT'),
  ('25274', 'Boesiger', 'Xavier', 'Plt', true, 'CSV_IMPORT'),
  ('20599', 'Kobi', 'Serge', 'Cap', true, 'CSV_IMPORT')
) as v(nip, nom, prenom, grade, actif, source)
on conflict (nip) do nothing;

insert into scope_affectations (affectation_id, personne_id, cible_id, date_debut, date_fin, source)
select gen_random_uuid(), p.personne_id, c.cible_id, '2026-08-19'::date, null, 'CSV_IMPORT'
from scope_personnes p
join scope_cibles c
  on c.domaine_code = 'DAP'
 and c.niveau_code = 'Y4'
where p.nip in ('40132', '47386', '16268', '40196', '13869', '26474', '19903', '19904', '38103', '38192', '28047', '51205', '24525', '24989', '25274', '20599')
  and not exists (
    select 1
    from scope_affectations a
    where a.personne_id = p.personne_id
      and a.cible_id = c.cible_id
      and a.date_fin is null
  );
