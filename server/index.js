import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isConfigured,
  buildAuthUrl,
  makeState,
  exchangeCodeForToken,
  fetchUserInfo,
  userInfoToProfile,
} from './linkedin.js';
import { demoProfile } from './demo-profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const app = express();
const PORT = process.env.PORT || 3000;
const DEMO_MODE = String(process.env.DEMO_MODE).toLowerCase() === 'true';

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-insecure-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 },
  })
);

// --- Auth status ----------------------------------------------------------
app.get('/api/status', (req, res) => {
  res.json({
    authenticated: Boolean(req.session.profile),
    demoMode: DEMO_MODE,
    linkedinConfigured: isConfigured(),
  });
});

// --- Begin LinkedIn OAuth -------------------------------------------------
app.get('/auth/linkedin', (req, res) => {
  // Demo mode: skip real OAuth and seed a sample profile.
  if (DEMO_MODE && !isConfigured()) {
    req.session.profile = { ...demoProfile };
    return res.redirect('/editor.html');
  }

  if (!isConfigured()) {
    return res
      .status(500)
      .send(
        'LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID / ' +
          'LINKEDIN_CLIENT_SECRET / LINKEDIN_REDIRECT_URI in your .env, or ' +
          'enable DEMO_MODE=true.'
      );
  }

  const state = makeState();
  req.session.oauthState = state;
  res.redirect(buildAuthUrl(state));
});

// --- LinkedIn OAuth callback ---------------------------------------------
app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return res
      .status(400)
      .send(`LinkedIn authorization failed: ${error} - ${errorDescription || ''}`);
  }
  if (!code || !state || state !== req.session.oauthState) {
    return res.status(400).send('Invalid OAuth state. Please try connecting again.');
  }
  delete req.session.oauthState;

  try {
    const token = await exchangeCodeForToken(code);
    const info = await fetchUserInfo(token.access_token);
    const base = userInfoToProfile(info);

    // Merge basics from LinkedIn onto our fuller profile shape (empty fields
    // for the user to complete in the editor).
    req.session.profile = {
      ...emptyProfile(),
      ...base,
      linkedin: base.linkedinId ? '' : '',
    };
    res.redirect('/editor.html');
  } catch (err) {
    console.error(err);
    res.status(500).send(`Failed to complete LinkedIn sign-in: ${err.message}`);
  }
});

// --- Profile read/update --------------------------------------------------
app.get('/api/profile', (req, res) => {
  if (!req.session.profile) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.session.profile);
});

app.put('/api/profile', (req, res) => {
  if (!req.session.profile) return res.status(401).json({ error: 'Not authenticated' });
  req.session.profile = { ...req.session.profile, ...req.body };
  res.json(req.session.profile);
});

// --- Logout ---------------------------------------------------------------
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// --- Static files ---------------------------------------------------------
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`\n  LinkedIn Resume & CV Generator running:`);
  console.log(`  → http://localhost:${PORT}\n`);
  console.log(`  Demo mode: ${DEMO_MODE ? 'ON' : 'off'}`);
  console.log(`  LinkedIn OAuth configured: ${isConfigured() ? 'yes' : 'no'}\n`);
});

function emptyProfile() {
  return {
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    picture: '',
    headline: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
  };
}
