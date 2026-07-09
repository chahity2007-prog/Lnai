// LinkedIn "Sign In with LinkedIn using OpenID Connect" integration.
//
// IMPORTANT NOTE ON DATA AVAILABILITY:
// The standard, publicly-approvable LinkedIn product ("Sign In with LinkedIn
// using OpenID Connect") only returns a *basic* profile: name, email, locale
// and profile picture. Rich data such as full work history, education, skills
// and summary is gated behind LinkedIn's restricted partner programs and is
// NOT available to a normal application.
//
// Because of that, this app uses LinkedIn to authenticate the user and pull
// the basics, then lets the user complete/enrich the rest in an editor
// (optionally seeded from a LinkedIn data export) before generating the
// resume and CV.

import crypto from 'node:crypto';

const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

// A value counts as "set" only if it exists and isn't one of the placeholder
// defaults shipped in .env.example.
function isReal(v) {
  return Boolean(v) && !/^your_.*_here$/.test(v);
}

export function isConfigured() {
  return (
    isReal(process.env.LINKEDIN_CLIENT_ID) &&
    isReal(process.env.LINKEDIN_CLIENT_SECRET) &&
    isReal(process.env.LINKEDIN_REDIRECT_URI)
  );
}

export function buildAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    state,
    scope: process.env.LINKEDIN_SCOPES || 'openid profile email',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export function makeState() {
  return crypto.randomBytes(16).toString('hex');
}

export async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function fetchUserInfo(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`userinfo failed (${res.status}): ${text}`);
  }
  return res.json();
}

// Map the OpenID `userinfo` payload into our internal profile shape.
export function userInfoToProfile(info) {
  return {
    fullName: info.name || [info.given_name, info.family_name].filter(Boolean).join(' '),
    firstName: info.given_name || '',
    lastName: info.family_name || '',
    email: info.email || '',
    picture: info.picture || '',
    locale:
      typeof info.locale === 'object'
        ? [info.locale.language, info.locale.country].filter(Boolean).join('-')
        : info.locale || '',
    linkedinId: info.sub || '',
  };
}
