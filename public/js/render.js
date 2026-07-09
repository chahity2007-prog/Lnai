// Builds the résumé / CV document HTML from a profile object.
// docType: 'resume' | 'cv'  ·  template: 'classic' | 'modern' | 'minimal'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Turn a multi-line description into <li> bullets.
function bullets(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean);
  if (!lines.length) return '';
  return `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

function contactLine(p) {
  const parts = [p.email, p.phone, p.location, p.website, p.linkedin].filter(Boolean);
  return parts.map((x) => `<span>${esc(x)}</span>`).join('<span>·</span>');
}

function experienceSection(p) {
  if (!p.experience?.length) return '';
  const items = p.experience
    .map(
      (e) => `
      <div class="entry">
        <div class="row">
          <div><span class="role">${esc(e.title)}</span>${e.company ? ` — <span class="org">${esc(e.company)}</span>` : ''}${e.location ? `, ${esc(e.location)}` : ''}</div>
          <div class="dates">${esc(e.startDate)}${e.endDate ? ` – ${esc(e.endDate)}` : ''}</div>
        </div>
        ${bullets(e.description)}
      </div>`
    )
    .join('');
  return `<div class="doc-section"><h2>Experience</h2>${items}</div>`;
}

function educationSection(p, detailed) {
  if (!p.education?.length) return '';
  const items = p.education
    .map(
      (e) => `
      <div class="entry">
        <div class="row">
          <div><span class="role">${esc(e.degree)}</span>${e.school ? ` — <span class="org">${esc(e.school)}</span>` : ''}${e.location ? `, ${esc(e.location)}` : ''}</div>
          <div class="dates">${esc(e.startDate)}${e.endDate ? ` – ${esc(e.endDate)}` : ''}</div>
        </div>
        ${detailed ? bullets(e.description) : ''}
      </div>`
    )
    .join('');
  return `<div class="doc-section"><h2>Education</h2>${items}</div>`;
}

function skillsSection(p) {
  if (!p.skills?.length) return '';
  const chips = p.skills.map((s) => `<span class="skill-chip">${esc(s)}</span>`).join('');
  return `<div class="doc-section"><h2>Skills</h2><div class="skills-wrap">${chips}</div></div>`;
}

function certsSection(p) {
  if (!p.certifications?.length) return '';
  const items = p.certifications
    .map(
      (c) =>
        `<div class="entry"><div class="row"><div><span class="role">${esc(c.name)}</span>${c.issuer ? ` — <span class="org">${esc(c.issuer)}</span>` : ''}</div><div class="dates">${esc(c.year)}</div></div></div>`
    )
    .join('');
  return `<div class="doc-section"><h2>Certifications</h2>${items}</div>`;
}

function languagesSection(p) {
  if (!p.languages?.length) return '';
  const items = p.languages
    .map((l) => `<div>${esc(l.name)}${l.level ? ` — <em>${esc(l.level)}</em>` : ''}</div>`)
    .join('');
  return `<div class="doc-section"><h2>Languages</h2><div class="two-col">${items}</div></div>`;
}

function summarySection(p, label) {
  if (!p.summary) return '';
  return `<div class="doc-section"><h2>${label}</h2><p>${esc(p.summary).replace(/\n/g, '<br>')}</p></div>`;
}

function header(p) {
  return `
    <div class="doc-header">
      <h1>${esc(p.fullName) || 'Your Name'}</h1>
      ${p.headline ? `<div class="headline">${esc(p.headline)}</div>` : ''}
      <div class="contact">${contactLine(p)}</div>
    </div>`;
}

export function renderDocument(profile, docType = 'resume', template = 'classic') {
  const p = profile || {};
  const isCV = docType === 'cv';
  // CV = fuller, includes detailed education, certifications, languages.
  const summaryLabel = isCV ? 'Profile' : 'Summary';

  const bodyMain = [
    summarySection(p, summaryLabel),
    experienceSection(p),
    educationSection(p, isCV),
    isCV ? certsSection(p) : '',
    isCV ? languagesSection(p) : '',
  ].join('');

  if (template === 'modern') {
    // Sidebar: contact + skills + languages. Main: header + summary + experience + education.
    const side = `
      <div class="side">
        <div class="doc-header"><h1>${esc(p.fullName) || 'Your Name'}</h1>${p.headline ? `<div class="headline">${esc(p.headline)}</div>` : ''}</div>
        <div class="doc-section"><h2>Contact</h2><div style="display:flex;flex-direction:column;gap:4px;font-size:13px">${[p.email, p.phone, p.location, p.website, p.linkedin].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>
        ${skillsSection(p)}
        ${languagesSection(p)}
      </div>`;
    const main = `
      <div class="main">
        ${summarySection(p, summaryLabel)}
        ${experienceSection(p)}
        ${educationSection(p, isCV)}
        ${isCV ? certsSection(p) : ''}
      </div>`;
    return `<div class="page tpl-modern" id="docPage">${side}${main}</div>`;
  }

  const tplClass = template === 'minimal' ? 'tpl-minimal' : 'tpl-classic';
  return `
    <div class="page ${tplClass}" id="docPage">
      ${header(p)}
      ${bodyMain}
      ${template !== 'modern' ? skillsSection(p) : ''}
    </div>`;
}
