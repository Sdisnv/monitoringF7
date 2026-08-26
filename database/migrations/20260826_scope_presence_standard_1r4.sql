-- SCOPE-PRESENCE-STANDARD-1R4
-- Add MONITEUR to the encadrement role contract without touching rows.

alter table scope_participations drop constraint if exists scope_participations_role_chk;

alter table scope_participations add constraint scope_participations_role_chk check (role in (
  'PARTICIPANT',
  'FORMATEUR',
  'MONITEUR',
  'SURVEILLANT',
  'AUXILIAIRE',
  'RENFORT',
  'REMPLACANT'
));
