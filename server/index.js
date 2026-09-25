require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Load trend data
function loadTrends() {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'trends.json'), 'utf8');
  return JSON.parse(raw);
}

// API: Get all trending topics
app.get('/api/trends', (req, res) => {
  const data = loadTrends();
  res.json({
    lastUpdated: data.lastUpdated,
    topics: data.trendingTopics,
    postingTimes: data.bestPostingTimes,
    formulas: data.engagementFormulas
  });
});

// API: Get post type analytics
app.get('/api/post-types', (req, res) => {
  const data = loadTrends();
  res.json(data.postTypePerformance);
});

// API: Get recommendation based on user answers
app.post('/api/recommend', (req, res) => {
  const { goal, audience, tone, topic, expertise, frequency } = req.body;
  const data = loadTrends();

  // Find matching trending topics
  const matchingTopics = data.trendingTopics.filter(t => {
    const topicLower = (topic || '').toLowerCase();
    return t.topic.toLowerCase().includes(topicLower) ||
           t.hashtags.some(h => h.toLowerCase().includes(topicLower));
  });

  // Determine best post type based on goal
  let recommendedTypes = [];
  const types = data.postTypePerformance;

  if (goal === 'engagement') {
    recommendedTypes = Object.entries(types)
      .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)
      .slice(0, 3)
      .map(([name, info]) => ({ name, ...info }));
  } else if (goal === 'reach') {
    recommendedTypes = Object.entries(types)
      .sort((a, b) => b[1].avgReach - a[1].avgReach)
      .slice(0, 3)
      .map(([name, info]) => ({ name, ...info }));
  } else if (goal === 'authority') {
    recommendedTypes = ['carousel', 'document', 'text-story']
      .map(name => ({ name, ...types[name] }));
  } else if (goal === 'leads') {
    recommendedTypes = ['text-tips', 'carousel', 'poll']
      .map(name => ({ name, ...types[name] }));
  } else {
    recommendedTypes = Object.entries(types)
      .filter(([, info]) => info.trend === 'rising')
      .map(([name, info]) => ({ name, ...info }));
  }

  // Build post templates based on tone and type
  const templates = generateTemplates(recommendedTypes[0]?.name || 'text-story', tone, topic, audience);

  // Get today's best posting time
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  const postingTime = data.bestPostingTimes[today];

  res.json({
    recommendedTypes,
    matchingTopics: matchingTopics.length > 0 ? matchingTopics : data.trendingTopics.slice(0, 3),
    templates,
    bestTime: { day: today, ...postingTime },
    formulas: data.engagementFormulas,
    hashtags: matchingTopics.length > 0
      ? matchingTopics.flatMap(t => t.hashtags)
      : data.trendingTopics.slice(0, 3).flatMap(t => t.hashtags).slice(0, 8)
  });
});

// API: Generate a post draft
app.post('/api/generate-post', (req, res) => {
  const { postType, topic, tone, keyPoints, audience, cta } = req.body;
  const draft = buildPostDraft({ postType, topic, tone, keyPoints, audience, cta });
  res.json({ draft });
});

function generateTemplates(postType, tone, topic, audience) {
  const templates = {
    'text-story': [
      {
        name: 'Hook Story',
        structure: `[Bold opening line that stops the scroll]\n\n[2-3 lines of context / backstory]\n\n[The turning point or lesson]\n\n[3-5 bullet points of takeaways]\n\n[Question to drive comments]\n\n[Hashtags]`,
        example: `I got rejected 47 times before landing my dream role.\n\nHere's what nobody tells you about ${topic || 'the job search'}:\n\n→ Point 1\n→ Point 2\n→ Point 3\n\nWhat's your biggest lesson from rejection?\n\n#CareerGrowth #Resilience`
      },
      {
        name: 'Contrarian Take',
        structure: `[Unpopular opinion statement]\n\n[Why most people get it wrong]\n\n[Your evidence / experience]\n\n[The nuanced truth]\n\n[Agree or disagree?]`,
        example: `Unpopular opinion: ${topic || 'Hustle culture'} is broken.\n\nHere's why 👇\n\n[Your reasoning]\n\nAm I wrong? Tell me in the comments.`
      }
    ],
    'carousel': [
      {
        name: 'Step-by-Step Guide',
        structure: `Slide 1: [Attention-grabbing title + "Swipe →"]\nSlide 2-8: [One step per slide with visual]\nSlide 9: [Summary / Key takeaway]\nSlide 10: [CTA - Follow for more + Save this]`,
        example: `Slide 1: "How to master ${topic || 'this skill'} in 30 days 🔥"\nSlide 2: "Step 1: ..."\n...`
      }
    ],
    'poll': [
      {
        name: 'Industry Debate',
        structure: `[Context paragraph about the debate]\n\nWhat's your take?\n\nOption A: [Position 1]\nOption B: [Position 2]\nOption C: [Position 3]\nOption D: [Other / depends]`,
        example: `${topic || 'AI'} is changing how we work.\n\nBut here's the real question:\n\n🅰️ It will create more jobs\n🅱️ It will replace most jobs\n🅲️ It depends on the industry\n🅳️ Too early to tell`
      }
    ],
    'document': [
      {
        name: 'Framework / Playbook',
        structure: `[Title page with compelling headline]\n[Problem statement]\n[Your framework — 3-5 pillars]\n[Each pillar explained with examples]\n[Summary + how to apply]\n[About you + CTA]`,
        example: `"The ${topic || 'Growth'} Framework I Wish I Had 5 Years Ago"\n[6-8 page PDF]`
      }
    ],
    'text-tips': [
      {
        name: 'Numbered Tips',
        structure: `[Hook: "X things I learned about {topic}"]\n\n1️⃣ [Tip 1]\n2️⃣ [Tip 2]\n3️⃣ [Tip 3]\n4️⃣ [Tip 4]\n5️⃣ [Tip 5]\n\n[Which one resonates most?]\n\n[Hashtags]`,
        example: `5 things I learned about ${topic || 'leadership'} this year:\n\n1️⃣ ...\n2️⃣ ...\n\nWhich one hits different? 👇`
      }
    ]
  };

  return templates[postType] || templates['text-story'];
}

function buildPostDraft({ postType, topic, tone, keyPoints, audience, cta }) {
  const points = (keyPoints || '').split('\n').filter(p => p.trim());
  const toneMap = {
    professional: { emoji: false, casual: false },
    conversational: { emoji: true, casual: true },
    inspirational: { emoji: true, casual: false },
    educational: { emoji: false, casual: false },
    provocative: { emoji: false, casual: true }
  };
  const style = toneMap[tone] || toneMap.conversational;

  let draft = '';

  switch (postType) {
    case 'text-story':
      draft = buildStoryPost(topic, points, style, cta);
      break;
    case 'carousel':
      draft = buildCarouselOutline(topic, points, style, cta);
      break;
    case 'poll':
      draft = buildPollPost(topic, points, style);
      break;
    case 'text-tips':
      draft = buildTipsPost(topic, points, style, cta);
      break;
    case 'document':
      draft = buildDocumentOutline(topic, points, style, cta);
      break;
    default:
      draft = buildStoryPost(topic, points, style, cta);
  }

  return draft;
}

function buildStoryPost(topic, points, style, cta) {
  const hook = `${style.emoji ? '🔥 ' : ''}Most people get ${topic || 'this'} completely wrong.`;
  const body = points.length > 0
    ? points.map((p, i) => `${style.emoji ? '→' : `${i + 1}.`} ${p}`).join('\n')
    : `→ [Key insight 1]\n→ [Key insight 2]\n→ [Key insight 3]`;
  const ctaLine = cta || 'What do you think? Drop your take below 👇';

  return `${hook}\n\nHere's what I've learned:\n\n${body}\n\nThe biggest takeaway?\n[Summarize the core lesson here]\n\n${ctaLine}\n\n---\n♻️ Repost if this resonates\n🔔 Follow for more on ${topic || 'this topic'}`;
}

function buildCarouselOutline(topic, points, style, cta) {
  let slides = `📑 CAROUSEL OUTLINE: ${topic || 'Your Topic'}\n\n`;
  slides += `Slide 1 (Cover): "${topic || 'Your Topic'}: What Nobody Tells You ${style.emoji ? '🔥' : ''}" + "Swipe →"\n\n`;

  if (points.length > 0) {
    points.forEach((p, i) => {
      slides += `Slide ${i + 2}: ${p}\n`;
    });
  } else {
    for (let i = 2; i <= 8; i++) {
      slides += `Slide ${i}: [Key point ${i - 1} — one idea per slide, large text, minimal design]\n`;
    }
  }

  slides += `\nSlide ${points.length > 0 ? points.length + 2 : 9}: Summary — Key Takeaways\n`;
  slides += `Slide ${points.length > 0 ? points.length + 3 : 10}: ${cta || 'Follow + Save for later'}\n`;
  slides += `\n---\nCaption for the post:\n"I spent [time] learning about ${topic || 'this'}.\n\nHere are the ${points.length || 7} lessons that changed everything.\n\nSwipe through and save for later ${style.emoji ? '🔖' : ''}"\n`;

  return slides;
}

function buildPollPost(topic, points, style) {
  const options = points.length >= 2
    ? points.slice(0, 4)
    : ['Option A — [Your first choice]', 'Option B — [Your second choice]', 'Option C — [Your third choice]', 'Other (comment below)'];

  let poll = `${style.emoji ? '🗳️ ' : ''}POLL: ${topic || 'Your Topic'}\n\n`;
  poll += `[Write 2-3 lines of context about why this question matters]\n\n`;
  poll += `What's your take?\n\n`;
  options.forEach((opt, i) => {
    const letters = ['🅰️', '🅱️', '🅲️', '🅳️'];
    poll += `${letters[i]} ${opt}\n`;
  });
  poll += `\n💬 Tell me WHY in the comments — I read every single one.\n`;

  return poll;
}

function buildTipsPost(topic, points, style, cta) {
  const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  let post = `${points.length || 5} things I wish I knew about ${topic || 'this'} sooner:\n\n`;

  if (points.length > 0) {
    points.forEach((p, i) => {
      post += `${nums[i] || '•'} ${p}\n\n`;
    });
  } else {
    for (let i = 0; i < 5; i++) {
      post += `${nums[i]} [Tip ${i + 1}]\n\n`;
    }
  }

  post += `---\n\n${cta || 'Which one resonates most? Comment below 👇'}\n`;
  post += `\n♻️ Repost to help your network\n🔔 Follow for daily ${topic || ''} tips`;

  return post;
}

function buildDocumentOutline(topic, points, style, cta) {
  let doc = `📄 DOCUMENT / PDF OUTLINE: ${topic || 'Your Topic'}\n\n`;
  doc += `Page 1 — Title: "${topic || 'Your Framework'}: A Complete Guide"\n`;
  doc += `Page 2 — The Problem: Why most people struggle with ${topic || 'this'}\n`;

  if (points.length > 0) {
    points.forEach((p, i) => {
      doc += `Page ${i + 3} — ${p}\n`;
    });
  } else {
    doc += `Page 3 — Pillar 1: [Foundation concept]\n`;
    doc += `Page 4 — Pillar 2: [Core strategy]\n`;
    doc += `Page 5 — Pillar 3: [Advanced tactic]\n`;
  }

  doc += `Page ${points.length > 0 ? points.length + 3 : 6} — Summary + Action Steps\n`;
  doc += `Page ${points.length > 0 ? points.length + 4 : 7} — ${cta || 'About You + Follow CTA'}\n`;
  doc += `\n---\nCaption: "I created this ${topic || ''} guide after [experience].\n\nIt covers everything I wish someone told me on day 1.\n\nDownload it. Save it. Share it with someone who needs it."`;

  return doc;
}

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LinkedIn Post Automation running at http://localhost:${PORT}`);
});
