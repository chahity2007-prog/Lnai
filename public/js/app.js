// ============================================
// PostPilot — LinkedIn Post Automation App
// ============================================

const state = {
  trends: null,
  postTypes: null,
  answers: {},
  currentStep: 0,
  totalSteps: 6,
  draft: null
};

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initQuestionnaire();
  loadTrends();
  loadPostTypes();
});

// ---- Tab Navigation ----
function initTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  document.querySelectorAll('.section').forEach(s => {
    s.classList.toggle('active', s.id === tabId);
  });
}

// ---- Load Trending Topics ----
async function loadTrends() {
  try {
    const res = await fetch('/api/trends');
    const data = await res.json();
    state.trends = data;
    renderTrends(data);
  } catch (err) {
    document.getElementById('trend-grid').innerHTML =
      '<div class="empty-state"><p>Failed to load trends. Please refresh.</p></div>';
  }
}

function renderTrends(data) {
  const grid = document.getElementById('trend-grid');
  grid.innerHTML = data.topics.map((t, i) => {
    const heatClass = t.heat >= 85 ? 'heat-high' : t.heat >= 70 ? 'heat-medium' : 'heat-low';
    return `
      <div class="trend-card" data-topic="${escHtml(t.topic)}">
        <div class="trend-header">
          <div>
            <div class="trend-title">${escHtml(t.topic)}</div>
            <div class="trend-growth">${escHtml(t.growth)} this month</div>
          </div>
          <div class="trend-heat ${heatClass}">🔥 ${t.heat}</div>
        </div>
        <div class="trend-desc">${escHtml(t.description)}</div>
        <div class="trend-meta">
          ${t.hashtags.slice(0, 4).map(h => `<span class="trend-tag">${escHtml(h)}</span>`).join('')}
        </div>
        <div class="trend-footer">
          <div class="trend-best-type">
            📝 Best as: <strong style="margin-left: 4px;">${formatTypeName(t.bestPostType)}</strong>
          </div>
          <button class="trend-use-btn" onclick="useTrend('${escAttr(t.topic)}')">Use this →</button>
        </div>
      </div>
    `;
  }).join('');
}

function useTrend(topic) {
  state.answers.topic = topic;
  switchTab('create');
  // Jump to step 0 (goal) but pre-fill topic
  const topicInput = document.getElementById('q-topic');
  if (topicInput) topicInput.value = topic;
}

// ---- Load Post Types ----
async function loadPostTypes() {
  try {
    const res = await fetch('/api/post-types');
    const data = await res.json();
    state.postTypes = data;
    renderPostTypes(data);
  } catch (err) {
    document.getElementById('type-grid').innerHTML =
      '<div class="empty-state"><p>Failed to load post types. Please refresh.</p></div>';
  }
}

function renderPostTypes(data) {
  const grid = document.getElementById('type-grid');
  const entries = Object.entries(data).sort((a, b) => b[1].avgEngagement - a[1].avgEngagement);

  grid.innerHTML = entries.map(([name, info]) => {
    const trendClass = `trend-${info.trend}`;
    const trendLabel = {
      rising: '📈 Rising',
      'stable-high': '✅ Stable High',
      stable: '➡️ Stable',
      declining: '📉 Declining'
    }[info.trend] || info.trend;

    return `
      <div class="type-card">
        <div class="type-name">${formatTypeName(name)}</div>
        <span class="type-trend-badge ${trendClass}">${trendLabel}</span>
        <div class="type-stats">
          <div class="type-stat">
            <div class="type-stat-value">${info.avgEngagement}%</div>
            <div class="type-stat-label">Avg Engagement</div>
          </div>
          <div class="type-stat">
            <div class="type-stat-value">${(info.avgReach / 1000).toFixed(1)}K</div>
            <div class="type-stat-label">Avg Reach</div>
          </div>
        </div>
        <div class="type-best-for"><strong>Best for:</strong> ${escHtml(info.bestFor)}</div>
        <div class="type-tip">💡 ${escHtml(info.tips)}</div>
      </div>
    `;
  }).join('');
}

// ---- Questionnaire ----
function initQuestionnaire() {
  // Build progress bar
  const progressEl = document.getElementById('q-progress');
  for (let i = 0; i < state.totalSteps; i++) {
    const step = document.createElement('div');
    step.className = 'q-progress-step' + (i === 0 ? ' current' : '');
    progressEl.appendChild(step);
  }

  // Option click handlers
  document.querySelectorAll('.q-options').forEach(optGroup => {
    const field = optGroup.dataset.field;
    optGroup.querySelectorAll('.q-option').forEach(opt => {
      opt.addEventListener('click', () => {
        optGroup.querySelectorAll('.q-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        state.answers[field] = opt.dataset.value;
        // Enable next button
        const step = opt.closest('.q-step');
        const nextBtn = step.querySelector('.q-next');
        if (nextBtn) nextBtn.disabled = false;
      });
    });
  });

  // Next / Prev button handlers
  document.querySelectorAll('.q-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = btn.closest('.q-step');
      const stepIndex = parseInt(step.dataset.step);

      // Capture text inputs
      if (stepIndex === 3) {
        state.answers.topic = document.getElementById('q-topic').value;
      }
      if (stepIndex === 4) {
        state.answers.keyPoints = document.getElementById('q-keypoints').value;
      }

      // Last step => generate
      if (stepIndex === state.totalSteps - 1) {
        generatePost();
        return;
      }

      goToStep(stepIndex + 1);
    });
  });

  document.querySelectorAll('.q-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = btn.closest('.q-step');
      const stepIndex = parseInt(step.dataset.step);
      goToStep(stepIndex - 1);
    });
  });

  // Topic suggestions
  renderTopicSuggestions();
}

function goToStep(index) {
  state.currentStep = index;

  document.querySelectorAll('.q-step').forEach(s => s.classList.remove('active'));
  const target = document.querySelector(`.q-step[data-step="${index}"]`);
  if (target) target.classList.add('active');

  // Update progress
  document.querySelectorAll('.q-progress-step').forEach((s, i) => {
    s.className = 'q-progress-step';
    if (i < index) s.classList.add('done');
    if (i === index) s.classList.add('current');
  });

  // Re-enable next if already answered
  const step = document.querySelector(`.q-step[data-step="${index}"]`);
  if (step) {
    const optGroup = step.querySelector('.q-options');
    if (optGroup) {
      const field = optGroup.dataset.field;
      const nextBtn = step.querySelector('.q-next');
      if (state.answers[field] && nextBtn) {
        nextBtn.disabled = false;
        // Re-select the option
        optGroup.querySelectorAll('.q-option').forEach(o => {
          o.classList.toggle('selected', o.dataset.value === state.answers[field]);
        });
      }
    }
  }
}

function renderTopicSuggestions() {
  // Wait for trends to load, then show clickable suggestions
  const checkInterval = setInterval(() => {
    if (state.trends) {
      clearInterval(checkInterval);
      const container = document.getElementById('topic-suggestions');
      container.innerHTML = state.trends.topics.slice(0, 6).map(t =>
        `<span class="hashtag" onclick="selectTopicSuggestion('${escAttr(t.topic)}')">${escHtml(t.topic)}</span>`
      ).join('');
    }
  }, 300);
}

function selectTopicSuggestion(topic) {
  document.getElementById('q-topic').value = topic;
  state.answers.topic = topic;
}

// ---- Generate Post ----
async function generatePost() {
  // First get recommendations
  try {
    const recRes = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.answers)
    });
    const recommendations = await recRes.json();

    // Then generate draft using top recommended type
    const topType = recommendations.recommendedTypes[0]?.name || 'text-story';

    const draftRes = await fetch('/api/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postType: topType,
        topic: state.answers.topic,
        tone: state.answers.tone,
        keyPoints: state.answers.keyPoints,
        audience: state.answers.audience,
        cta: state.answers.cta
      })
    });
    const draftData = await draftRes.json();

    state.draft = {
      ...draftData,
      recommendations,
      postType: topType
    };

    renderResults(state.draft, recommendations);
    switchTab('results');
  } catch (err) {
    console.error('Generation failed:', err);
    alert('Something went wrong generating your post. Please try again.');
  }
}

function renderResults(draft, rec) {
  const container = document.getElementById('results-content');

  const typesHtml = rec.recommendedTypes.map(t => `
    <div class="type-card" style="margin-bottom: 0;">
      <div class="type-name">${formatTypeName(t.name)}</div>
      <span class="type-trend-badge trend-${t.trend}">${t.trend === 'rising' ? '📈 Rising' : t.trend === 'stable-high' ? '✅ High' : '➡️ Stable'}</span>
      <div class="type-stats">
        <div class="type-stat">
          <div class="type-stat-value">${t.avgEngagement}%</div>
          <div class="type-stat-label">Engagement</div>
        </div>
        <div class="type-stat">
          <div class="type-stat-value">${(t.avgReach / 1000).toFixed(1)}K</div>
          <div class="type-stat-label">Reach</div>
        </div>
      </div>
      <div class="type-tip">💡 ${escHtml(t.tips)}</div>
    </div>
  `).join('');

  const hashtagsHtml = rec.hashtags
    .filter((h, i, arr) => arr.indexOf(h) === i)
    .slice(0, 10)
    .map(h => `<span class="hashtag" onclick="copyText('${escAttr(h)}')">${escHtml(h)}</span>`)
    .join('');

  const matchingTopicsHtml = rec.matchingTopics.slice(0, 3).map(t => `
    <div style="padding: 8px 12px; background: var(--bg); border-radius: var(--radius-sm); margin-bottom: 6px;">
      <strong>${escHtml(t.topic)}</strong>
      <span class="trend-growth" style="margin-left: 8px;">${escHtml(t.growth)}</span>
      <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${escHtml(t.description)}</div>
    </div>
  `).join('');

  const formulasHtml = rec.formulas.map((f, i) => `
    <div class="formula-item">
      <div class="formula-num">${i + 1}</div>
      <span>${escHtml(f)}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">🎯 Your Personalized Recommendations</div>
      <div class="card-subtitle">Based on your answers, here's the best strategy for your LinkedIn post.</div>

      <div class="results-grid" style="margin-top: 16px;">

        <div class="result-full">
          <div class="result-label">🏆 Recommended Post Types</div>
          <div class="type-grid" style="margin-top: 8px;">
            ${typesHtml}
          </div>
        </div>

        <div class="result-full" style="margin-top: 8px;">
          <div class="result-label">🔥 Matching Trending Topics</div>
          ${matchingTopicsHtml}
        </div>

        <div>
          <div class="result-label">⏰ Best Time to Post Today</div>
          <div class="time-widget">
            <div class="time-icon">🕐</div>
            <div class="time-info">
              <h4>${rec.bestTime.day} — ${rec.bestTime.best}</h4>
              <p>Also good: ${rec.bestTime.good.join(', ')}</p>
            </div>
          </div>
        </div>

        <div>
          <div class="result-label">#️⃣ Suggested Hashtags</div>
          <div class="hashtag-list" style="margin-top: 8px;">
            ${hashtagsHtml}
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Click to copy</div>
        </div>

        <div class="result-full" style="margin-top: 8px;">
          <div class="result-label">🧪 Engagement Formulas</div>
          <div class="formula-list" style="margin-top: 8px;">
            ${formulasHtml}
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 16px;">
      <div class="card-title">📝 Your Post Draft</div>
      <div class="card-subtitle">Format: ${formatTypeName(draft.postType)} — Edit and refine, then copy to LinkedIn.</div>

      <div class="draft-container">
        <div class="draft-output" id="draft-output">${escHtml(draft.draft)}</div>
        <div class="draft-actions">
          <button class="copy-btn" onclick="copyDraft()">📋 Copy to Clipboard</button>
          <button class="btn btn-secondary" onclick="regenerateAs('text-story')">📝 As Story</button>
          <button class="btn btn-secondary" onclick="regenerateAs('carousel')">📑 As Carousel</button>
          <button class="btn btn-secondary" onclick="regenerateAs('poll')">🗳️ As Poll</button>
          <button class="btn btn-secondary" onclick="regenerateAs('text-tips')">💡 As Tips</button>
          <button class="btn btn-secondary" onclick="regenerateAs('document')">📄 As Document</button>
          <button class="btn btn-secondary" onclick="switchTab('create')">✏️ Start Over</button>
        </div>
      </div>
    </div>
  `;
}

// ---- Regenerate in Different Format ----
async function regenerateAs(postType) {
  try {
    const res = await fetch('/api/generate-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postType,
        topic: state.answers.topic,
        tone: state.answers.tone,
        keyPoints: state.answers.keyPoints,
        audience: state.answers.audience,
        cta: state.answers.cta
      })
    });
    const data = await res.json();
    state.draft.draft = data.draft;
    state.draft.postType = postType;

    const output = document.getElementById('draft-output');
    output.textContent = data.draft;

    // Update subtitle
    const subtitle = output.closest('.card').querySelector('.card-subtitle');
    if (subtitle) subtitle.textContent = `Format: ${formatTypeName(postType)} — Edit and refine, then copy to LinkedIn.`;
  } catch (err) {
    console.error('Regeneration failed:', err);
  }
}

// ---- Utilities ----
function copyDraft() {
  const text = document.getElementById('draft-output').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy to Clipboard'; }, 2000);
  });
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Brief visual feedback could be added here
  });
}

function formatTypeName(name) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
