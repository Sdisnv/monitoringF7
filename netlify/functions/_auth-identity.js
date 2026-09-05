'use strict';

function clean(value){
  return String(value == null ? '' : value).trim();
}

function normalizeIdentityText(value){
  return clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function isApplicationIdentity(value){
  const text = normalizeIdentityText(value);
  if(!text) return true;
  if(text === 'SCOPE' || text === 'APPLICATION SCOPE' || text === 'APP SCOPE') return true;
  if(text === 'MONITORING F7' || text === 'CLIENT SCOPE' || text === 'OAUTH SCOPE') return true;
  if(/^HTTPS?:\/\//.test(text)) return true;
  return false;
}

function firstHuman(values){
  for(const value of values || []){
    const text = clean(value);
    if(text && !isApplicationIdentity(text)) return text;
  }
  return '';
}

function resolveHumanIdentity(input = {}){
  const fullFromParts = [input.given_name || input.givenName, input.family_name || input.familyName].map(clean).filter(Boolean).join(' ');
  return firstHuman([
    fullFromParts,
    input.name,
    input.displayName,
    input.display_name,
    input.preferred_username,
    input.email,
    input.nip,
    input.subject,
    input.sub,
    input.storedDisplayName
  ]);
}

function hasHumanIdentity(input = {}){
  return Boolean(resolveHumanIdentity(input));
}

function displayNameFromClaims(claims = {}){
  return resolveHumanIdentity(claims);
}

function displayNameFromUser(user = {}){
  return resolveHumanIdentity(user);
}

function mergeStoredUserWithIdentity(stored, identity){
  if(!stored) return identity;
  const humanDisplayName = displayNameFromUser({
    displayName: identity && identity.displayName,
    name: identity && identity.name,
    email: (identity && identity.email) || stored.email,
    preferred_username: identity && identity.nip,
    nip: (identity && identity.nip) || stored.nip,
    subject: (identity && identity.subject) || stored.subject,
    display_name: stored.display_name,
    storedDisplayName: stored.displayName
  });
  return Object.assign({}, stored, {
    displayName: humanDisplayName,
    email: stored.email || (identity && identity.email) || '',
    nip: stored.nip || (identity && identity.nip) || stored.email || stored.subject || '',
    roles: stored.roles || (identity && identity.roles) || [],
    permissions: stored.permissions || (identity && identity.permissions) || []
  });
}

module.exports = {
  clean,
  isApplicationIdentity,
  resolveHumanIdentity,
  hasHumanIdentity,
  displayNameFromClaims,
  displayNameFromUser,
  mergeStoredUserWithIdentity
};
