# PostPilot — LinkedIn Post Automation

Analyze what's trending on LinkedIn, see which post types perform best,
and generate optimized posts through an interactive questionnaire.

## What it does

1. **🔥 Trending Topics** — See the hottest LinkedIn topics right now with
   engagement scores, growth rates, best post formats, and suggested hashtags.

2. **📊 Post Type Analytics** — Compare engagement and reach across all
   LinkedIn post formats (carousel, text story, poll, document, video, etc.)
   with tips for each.

3. **✍️ Smart Post Creator** — Answer 6 quick questions about your goal,
   audience, tone, topic, key points, and CTA. The app recommends the best
   format and generates a ready-to-use draft.

4. **📋 Draft & Export** — Get your post draft with recommended hashtags,
   best posting time, engagement formulas, and one-click copy. Instantly
   switch between formats (story, carousel, poll, tips, document).

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3000

## Project Structure

```
├── server/
│   └── index.js          # Express API server
├── public/
│   ├── index.html         # Main app page
│   ├── css/style.css      # Styles (light + dark mode)
│   └── js/app.js          # Frontend logic
├── data/
│   └── trends.json        # Trending topics & post type data
├── package.json
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trends` | Get trending topics, best times, formulas |
| GET | `/api/post-types` | Get post type performance analytics |
| POST | `/api/recommend` | Get personalized recommendations |
| POST | `/api/generate-post` | Generate a post draft |

## How the Questionnaire Works

The app walks you through 6 steps:

1. **Goal** — engagement, reach, authority, or leads
2. **Audience** — founders, professionals, recruiters, or tech
3. **Tone** — professional, conversational, inspirational, or provocative
4. **Topic** — free text with trending topic suggestions
5. **Key Points** — your main talking points (one per line)
6. **CTA** — what you want readers to do

Based on your answers it recommends the best post type, matches trending
topics, suggests hashtags, shows the best time to post today, and generates
a formatted draft you can copy straight to LinkedIn.
