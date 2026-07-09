import { renderDocument } from '/js/render.js';

let profile = null;
let docType = 'resume';
let template = 'classic';
let saveTimer = null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Schema for repeatable sections.
const REPEATABLE = {
  experience: {
    listId: 'experienceList',
    fields: [
      { key: 'title', label: 'Job title', type: 'input' },
      { key: 'company', label: 'Company', type: 'input' },
      { key: 'location', label: 'Location', type: 'input' },
      { key: 'startDate', label: 'Start', type: 'input', half: true },
      { key: 'endDate', label: 'End', type: 'input', half: true },
      { key: 'description', label: 'Highlights (one per line)', type: 'textarea' },
    ],
  },
  education: {
    listId: 'educationList',
    fields: [
      { key: 'degree', label: 'Degree', type: 'input' },
      { key: 'school', label: 'School', type: 'input' },
      { key: 'location', label: 'Location', type: 'input' },
      { key: 'startDate', label: 'Start', type: 'input', half: true },
      { key: 'endDate', label: 'End', type: 'input', half: true },
      { key: 'description', label: 'Details (one per line)', type: 'textarea' },
    ],
  },
  certifications: {
    listId: 'certificationsList',
    fields: [
      { key: 'name', label: 'Certification', type: 'input' },
      { key: 'issuer', label: 'Issuer', type: 'input', half: true },
      { key: 'year', label: 'Year', type: 'input', half: true },
    ],
  },
  languages: {
    listId: 'languagesList',
    fields: [
      { key: 'name', label: 'Language', type: 'input', half: true },
      { key: 'level', label: 'Proficiency', type: 'input', half: true },
    ],
  },
};

async function load() {
  const res = await fetch('/api/profile');
  if (res.status === 401) return void (location.href = '/');
  profile = await res.json();
  // Ensure arrays exist.
  for (const k of ['experience', 'education', 'skills', 'certifications', 'languages']) {
    if (!Array.isArray(profile[k])) profile[k] = [];
  }
  hydrateBasics();
  renderRepeatables();
  renderSkills();
  renderPreview();
}

function hydrateBasics() {
  $$('[data-bind]').forEach((el) => {
    const key = el.dataset.bind;
    el.value = profile[key] ?? '';
    el.addEventListener('input', () => {
      profile[key] = el.value;
      renderPreview();
      scheduleSave();
    });
  });
}

function renderRepeatables() {
  for (const [section, cfg] of Object.entries(REPEATABLE)) {
    const list = document.getElementById(cfg.listId);
    list.innerHTML = '';
    profile[section].forEach((item, idx) => list.appendChild(buildRepeatItem(section, cfg, item, idx)));
  }
}

function buildRepeatItem(section, cfg, item, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'repeat-item';

  const rows = [];
  let i = 0;
  while (i < cfg.fields.length) {
    const f = cfg.fields[i];
    if (f.half && cfg.fields[i + 1]?.half) {
      rows.push(`<div class="grid-2">${fieldHtml(f, item)}${fieldHtml(cfg.fields[i + 1], item)}</div>`);
      i += 2;
    } else {
      rows.push(fieldHtml(f, item));
      i += 1;
    }
  }

  wrap.innerHTML = `<button class="remove" title="Remove">×</button>${rows.join('')}`;

  wrap.querySelector('.remove').addEventListener('click', () => {
    profile[section].splice(idx, 1);
    renderRepeatables();
    renderPreview();
    scheduleSave();
  });

  $$('[data-field]', wrap).forEach((el) => {
    el.addEventListener('input', () => {
      profile[section][idx][el.dataset.field] = el.value;
      renderPreview();
      scheduleSave();
    });
  });
  return wrap;
}

function fieldHtml(f, item) {
  const val = (item[f.key] ?? '').toString().replace(/"/g, '&quot;');
  if (f.type === 'textarea') {
    return `<div class="field"><label>${f.label}</label><textarea data-field="${f.key}" rows="3">${(item[f.key] ?? '')
      .toString()
      .replace(/</g, '&lt;')}</textarea></div>`;
  }
  return `<div class="field"><label>${f.label}</label><input data-field="${f.key}" value="${val}" /></div>`;
}

// ---- Skills (tag input) ----
function renderSkills() {
  const container = $('#skillsInput');
  const entry = $('#skillEntry');
  // Remove existing tags (keep the input).
  $$('.tag', container).forEach((t) => t.remove());
  profile.skills.forEach((skill, idx) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${skill.replace(/</g, '&lt;')} <button title="Remove">×</button>`;
    tag.querySelector('button').addEventListener('click', () => {
      profile.skills.splice(idx, 1);
      renderSkills();
      renderPreview();
      scheduleSave();
    });
    container.insertBefore(tag, entry);
  });
}

$('#skillEntry').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    e.preventDefault();
    profile.skills.push(e.target.value.trim());
    e.target.value = '';
    renderSkills();
    renderPreview();
    scheduleSave();
  }
});

// ---- Add buttons ----
$$('[data-add]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.add;
    profile[section].push({});
    renderRepeatables();
    scheduleSave();
    // Focus the last added block's first input.
    const list = document.getElementById(REPEATABLE[section].listId);
    list.lastElementChild?.querySelector('input, textarea')?.focus();
  });
});

// ---- Controls ----
$$('#docType button').forEach((b) => {
  b.addEventListener('click', () => {
    $$('#docType button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    docType = b.dataset.doc;
    renderPreview();
  });
});
$('#template').addEventListener('change', (e) => {
  template = e.target.value;
  renderPreview();
});
$('#downloadBtn').addEventListener('click', () => window.print());

// Mobile Edit/Preview tab toggle
$$('#mobileTabs button').forEach((b) => {
  b.addEventListener('click', () => {
    const mode = b.dataset.mode;
    $$('#mobileTabs button').forEach((x) => x.classList.toggle('active', x === b));
    const wrap = $('#editorWrap');
    wrap.classList.toggle('mode-edit', mode === 'edit');
    wrap.classList.toggle('mode-preview', mode === 'preview');
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
});
$('#logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/';
});

// ---- Preview + save ----
function renderPreview() {
  $('#printArea').innerHTML = renderDocument(profile, docType, template);
}

function scheduleSave() {
  const el = $('#saveState');
  el.textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      el.textContent = 'All changes saved';
      setTimeout(() => (el.textContent = ''), 1500);
    } catch {
      el.textContent = 'Save failed';
    }
  }, 600);
}

load();
