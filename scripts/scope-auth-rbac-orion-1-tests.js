const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const rbac = require(path.join(ROOT, 'netlify/functions/_rbac.js'));
const userStoreSource = fs.readFileSync(path.join(ROOT, 'netlify/functions/_user-store.js'), 'utf8');
const oidcSource = fs.readFileSync(path.join(ROOT, 'netlify/functions/_oidc-utils.js'), 'utf8');
const authMeSource = fs.readFileSync(path.join(ROOT, 'netlify/functions/auth-me.js'), 'utf8');
const frontendRbac = fs.readFileSync(path.join(ROOT, 'assets/js/rbac.js'), 'utf8');
const scopeUi = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const adminUsers = fs.readFileSync(path.join(ROOT, 'assets/js/admin-users.js'), 'utf8');
const dbSchema = fs.readFileSync(path.join(ROOT, 'database/schema.sql'), 'utf8');

function pass(name, fn){
  fn();
  console.log(`PASS\t${name}`);
}

pass('01 — rôles SCOPE définitifs uniquement exposés', () => {
  assert.deepStrictEqual(rbac.KNOWN_ROLES, ['UTILISATEUR', 'GESTIONNAIRE', 'ADMINISTRATEUR']);
  assert.ok(!rbac.KNOWN_ROLES.includes('LECTEUR'));
  assert.ok(!rbac.KNOWN_ROLES.includes('RÉDACTEUR'));
});

pass('02 — matrice serveur unique rôle vers permissions', () => {
  assert.ok(rbac.ROLE_PERMISSIONS.UTILISATEUR.includes('personnel:read'));
  assert.ok(!rbac.ROLE_PERMISSIONS.UTILISATEUR.includes('personnel:manage'));
  assert.ok(rbac.ROLE_PERMISSIONS.GESTIONNAIRE.includes('personnel:manage'));
  assert.ok(rbac.ROLE_PERMISSIONS.ADMINISTRATEUR.includes('personnel:manage'));
  assert.ok(rbac.ROLE_PERMISSIONS.ADMINISTRATEUR.includes('admin:manage'));
  assert.ok(rbac.ROLE_PERMISSIONS.ADMINISTRATEUR.includes('users:admin'));
});

pass('03 — aliases legacy préservés sans devenir rôles finaux', () => {
  assert.deepStrictEqual(rbac.normalizeRoles(['sdis-user']), ['UTILISATEUR']);
  assert.deepStrictEqual(rbac.normalizeRoles(['sdis-commandement']), ['GESTIONNAIRE']);
  assert.deepStrictEqual(rbac.normalizeRoles(['sdis-admin']), ['ADMINISTRATEUR']);
  assert.strictEqual(rbac.hasPermission({ roles:['sdis-user'] }, 'personnel:manage'), false);
  assert.strictEqual(rbac.hasPermission({ roles:['sdis-commandement'] }, 'personnel:manage'), true);
  assert.strictEqual(rbac.hasPermission({ roles:['sdis-admin'] }, 'admin:manage'), true);
});

pass('04 — import Personnel contrôlé par personnel:manage', () => {
  const analyze = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-import-analyze.js'), 'utf8');
  const commit = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-import-commit.js'), 'utf8');
  const scopeRouter = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
  assert.ok(analyze.includes("requirePermission(claims, 'personnel:manage')"));
  assert.ok(commit.includes("requirePermission(claims, 'personnel:manage')"));
  assert.ok(analyze.includes('getUserByIdentity([claims.sub, claims.email, claims.nip])'));
  assert.ok(commit.includes('getUserByIdentity([claims.sub, claims.email, claims.nip])'));
  assert.ok(scopeRouter.includes('getUserByIdentity([claims.sub, claims.email, claims.nip])'));
  assert.strictEqual(rbac.hasPermission({ roles:['UTILISATEUR'] }, 'personnel:manage'), false);
  assert.strictEqual(rbac.hasPermission({ roles:['GESTIONNAIRE'] }, 'personnel:manage'), true);
  assert.strictEqual(rbac.hasPermission({ roles:['ADMINISTRATEUR'] }, 'personnel:manage'), true);
});

pass('05 — auth-me relit le profil DB OIDC', () => {
  assert.ok(authMeSource.includes('getUserByIdentity([claims.sub, claims.email, claims.nip])'));
  assert.ok(authMeSource.includes('user_profile_missing'));
  assert.ok(!authMeSource.includes("permissionsForRoles(roles, claims.permissions)"));
});

pass('06 — callback OIDC préserve le rôle DB existant', () => {
  assert.ok(oidcSource.includes('getUserByIdentity([user.subject, user.email, user.nip]) || await userStore.ensureUser'));
  assert.ok(oidcSource.includes("return ['UTILISATEUR']"));
  assert.ok(!oidcSource.includes("const roles = ['sdis-user']"));
  assert.ok(!oidcSource.includes("roles.push('sdis-admin')"));
});

pass('07 — frontend sans matrice RBAC dupliquée', () => {
  assert.ok(frontendRbac.includes('CurrentPermissions'));
  assert.ok(!frontendRbac.includes('ROLE_PERMISSIONS'));
  assert.ok(!frontendRbac.includes('sdis-admin'));
  assert.ok(scopeUi.includes('roleLabel()'));
  assert.ok(scopeUi.includes('Administrateur'));
  assert.ok(scopeUi.includes('Gestionnaire'));
  assert.ok(scopeUi.includes('Utilisateur'));
});

pass('08 — administration utilisateurs limitée aux trois rôles', () => {
  const adminUsersFunction = fs.readFileSync(path.join(ROOT, 'netlify/functions/admin-users.js'), 'utf8');
  assert.ok(adminUsers.includes("value:'UTILISATEUR'"));
  assert.ok(adminUsers.includes("value:'GESTIONNAIRE'"));
  assert.ok(adminUsers.includes("value:'ADMINISTRATEUR'"));
  assert.ok(!adminUsers.includes("value:'sdis-readonly'"));
  assert.ok(!adminUsers.includes("value:'sdis-chef-formation'"));
  assert.ok(adminUsersFunction.includes('getUserByIdentity([claims.sub, claims.email, claims.nip])'));
});

pass('09 — modèle utilisateur applicatif séparé du Personnel métier', () => {
  assert.ok(dbSchema.includes('monitoring_f7_user_profiles'));
  assert.ok(userStoreSource.includes('monitoring_f7_user_profiles'));
  assert.ok(!userStoreSource.includes('scope_personnes'));
  assert.ok(!userStoreSource.includes('scope_affectations'));
});

pass('10 — pas de CSV nominatif public dans l’admin utilisateurs', () => {
  assert.ok(!adminUsers.includes('assets/data/PersonnelSDIS.csv'));
  assert.ok(!adminUsers.includes('PERSONNEL_CSV_URL'));
  assert.ok(!adminUsers.includes('monitoring_f7_personnel_sdis_csv_v1'));
});

console.log('SCOPE-AUTH-RBAC-ORION-1: 10 PASS');
