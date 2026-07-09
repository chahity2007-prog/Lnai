// Parses a LinkedIn "Data Export" ZIP archive (Settings → Data Privacy →
// Get a copy of your data) into our internal profile shape.
//
// The export contains CSV files at either the root or under a folder called
// "Basic_LinkedInDataExport_MM-DD-YYYY". File names have historically shifted
// (with/without spaces, singular/plural). We match case-insensitively on the
// stripped basename.

import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';

const CSV_OPTS = {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true,
  trim: true,
  bom: true,
};

// Try several possible column names and return the first non-empty value.
function pick(row, ...names) {
  for (const n of names) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === n.toLowerCase()) {
        const v = row[key];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
  }
  return '';
}

// Loosely extract a year from a LinkedIn date string like "January 1, 2020",
// "Jan 2020", "2020", or "2020-01-01".
function yearOf(str) {
  const m = String(str || '').match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : '';
}

// Load every CSV in the ZIP, keyed by lowercased basename.
function readCsvsFromZip(buffer) {
  const zip = new AdmZip(buffer);
  const files = {};
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    if (!/\.csv$/i.test(entry.entryName)) continue;
    const base = entry.entryName.split('/').pop().toLowerCase();
    try {
      files[base] = parse(entry.getData(), CSV_OPTS);
    } catch {
      // Skip files that fail to parse — keep going for the ones that work.
    }
  }
  return files;
}

// Match a file by any of the given basenames (with or without spaces).
function grab(files, ...candidates) {
  for (const c of candidates) {
    const key = c.toLowerCase();
    if (files[key]) return files[key];
    // Try without spaces (LinkedIn sometimes drops them: "PhoneNumbers.csv").
    const nospace = key.replace(/\s+/g, '');
    for (const k of Object.keys(files)) {
      if (k.replace(/\s+/g, '') === nospace) return files[k];
    }
  }
  return null;
}

export function parseLinkedInExport(buffer) {
  const files = readCsvsFromZip(buffer);
  const p = {};

  // ---- Profile.csv (name, headline, summary, location, websites) ----
  const profileRow = grab(files, 'Profile.csv')?.[0];
  if (profileRow) {
    p.firstName = pick(profileRow, 'First Name');
    p.lastName = pick(profileRow, 'Last Name');
    p.fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
    p.headline = pick(profileRow, 'Headline');
    p.summary = pick(profileRow, 'Summary');
    p.location = pick(profileRow, 'Geo Location', 'Address');
    p.website = pick(profileRow, 'Websites');
    // Strip "[TYPE:OTHER]:" wrappers LinkedIn sometimes adds around websites.
    if (p.website) p.website = p.website.replace(/\[.*?\]:/g, '').split(',')[0].trim();
  }

  // ---- Email Addresses.csv ----
  const emails = grab(files, 'Email Addresses.csv');
  if (emails?.length) {
    const primary = emails.find((r) => pick(r, 'Primary').toLowerCase() === 'yes') || emails[0];
    p.email = pick(primary, 'Email Address');
  }

  // ---- Phone Numbers.csv ----
  const phones = grab(files, 'PhoneNumbers.csv', 'Phone Numbers.csv');
  if (phones?.length) {
    p.phone = pick(phones[0], 'Number');
  }

  // ---- Positions.csv → experience[] ----
  const positions = grab(files, 'Positions.csv');
  if (positions?.length) {
    p.experience = positions.map((r) => ({
      title: pick(r, 'Title'),
      company: pick(r, 'Company Name', 'Company'),
      location: pick(r, 'Location'),
      startDate: pick(r, 'Started On', 'Start Date'),
      endDate: pick(r, 'Finished On', 'End Date') || 'Present',
      description: pick(r, 'Description'),
    }));
  }

  // ---- Education.csv → education[] ----
  const education = grab(files, 'Education.csv');
  if (education?.length) {
    p.education = education.map((r) => {
      const notes = pick(r, 'Notes');
      const activities = pick(r, 'Activities');
      return {
        degree: pick(r, 'Degree Name', 'Degree'),
        school: pick(r, 'School Name', 'School'),
        location: '',
        startDate: pick(r, 'Start Date', 'Started On'),
        endDate: pick(r, 'End Date', 'Finished On'),
        description: [notes, activities].filter(Boolean).join('\n'),
      };
    });
  }

  // ---- Skills.csv → skills[] ----
  const skills = grab(files, 'Skills.csv');
  if (skills?.length) {
    p.skills = skills.map((r) => pick(r, 'Name', 'Skill')).filter(Boolean);
  }

  // ---- Languages.csv → languages[] ----
  const languages = grab(files, 'Languages.csv');
  if (languages?.length) {
    p.languages = languages.map((r) => ({
      name: pick(r, 'Name', 'Language'),
      level: pick(r, 'Proficiency', 'Level'),
    })).filter((l) => l.name);
  }

  // ---- Certifications.csv → certifications[] ----
  const certs = grab(files, 'Certifications.csv');
  if (certs?.length) {
    p.certifications = certs.map((r) => ({
      name: pick(r, 'Name'),
      issuer: pick(r, 'Authority', 'Issuer'),
      year: yearOf(pick(r, 'Started On', 'Start Date', 'Finished On', 'End Date')),
    })).filter((c) => c.name);
  }

  return { profile: p, filesSeen: Object.keys(files) };
}

// Short human-readable summary of what was actually imported.
export function summarize(profile) {
  const parts = [];
  if (profile.fullName) parts.push('Name');
  if (profile.email) parts.push('Email');
  if (profile.headline) parts.push('Headline');
  if (profile.summary) parts.push('Summary');
  if (profile.experience?.length) parts.push(`${profile.experience.length} positions`);
  if (profile.education?.length) parts.push(`${profile.education.length} education entries`);
  if (profile.skills?.length) parts.push(`${profile.skills.length} skills`);
  if (profile.languages?.length) parts.push(`${profile.languages.length} languages`);
  if (profile.certifications?.length) parts.push(`${profile.certifications.length} certifications`);
  return parts.join(', ') || 'nothing usable — check the ZIP is a LinkedIn Data Export';
}
