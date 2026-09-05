'use strict';

function clean(value){
  return String(value == null ? '' : value).trim();
}

function isApplicationIdentity(value){
  const text = clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return text === 'SCOPE' || text === 'APPLICATION SCOPE' || text === 'APP SCOPE';
}

function firstHuman(values){
  for(const value of values || []){
    const text = clean(value);
    if(text && !isApplicationIdentity(text)) return text;
  }
  return '';
}

function displayNameFromClaims(claims = {}){
  const fullFromParts = [claims.given_name, claims.family_name].map(clean).filter(Boolean).join(' ');
  return firstHuman([
    claims.name,
    fullFromParts,
    claims.email,
    claims.preferred_username,
    claims.sub
  ]) || 'Utilisateur institutionnel';
}

function displayNameFromUser(user = {}){
  return firstHuman([
    user.displayName,
    user.name,
    user.display_name,
    user.email,
    user.preferred_username,
    user.nip,
    user.subject,
    user.sub,
    user.storedDisplayName
  ]) || 'Utilisateur institutionnel';
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
  displayNameFromClaims,
  displayNameFromUser,
  mergeStoredUserWithIdentity
};
