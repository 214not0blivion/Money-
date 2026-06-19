# Mendez Stone — Countertop Services Landing Page

A fast, mobile-friendly landing page for **Mendez Stone** (granite, quartz &
marble countertops) with an **AI lead agent** that answers every quote request
in seconds, gives an instant price range, and books the free estimate — while a
real installer follows up the same day.

It pairs with your **Booksy** booking page: every "Book" button links straight
to Booksy, and the quote form captures the people who aren't ready to book yet
so no lead is lost.

```
mendez_stone/
  index.html      # the page
  styles.css      # all styling (edit colors / gallery photos here)
  config.js       # ← your settings: Booksy link, pricing, backend URL
  app.js          # form handling + instant AI reply in the browser
  lead_agent.py   # optional AI backend: qualifies leads, drafts replies, saves them
```

---

## Quick start (zero setup)

Just open the page — it works fully on its own, including the instant AI-style
quote reply (computed in the browser).

```bash
# from the repo root
open mendez_stone/index.html        # macOS
# or: xdg-open mendez_stone/index.html   (Linux)
# or just double-click the file
```

To serve it locally instead (recommended, avoids browser file restrictions):

```bash
cd mendez_stone
python3 -m http.server 5500
# then visit http://localhost:5500
```

---

## Make it yours (edit `config.js`)

```js
booksyUrl:    "https://booksy.com/your-business",   // your Booksy link
leadEndpoint: "",                                   // "" = browser-only demo
pricing: { Granite: {low:45, high:75}, ... },       // your real $/sq ft
```

- **Booksy link** — on Booksy: *Profile → Share → copy your booking link*. Paste
  it as `booksyUrl`. Until then, every "Book" button sends people to the quote
  form so you still capture the lead.
- **Pricing** — drives the instant estimate. Set it to your real numbers.
- **Photos** — replace the colored gallery tiles with your project photos by
  editing the `.gallery figure` backgrounds in `styles.css` (e.g.
  `background:url('assets/kitchen1.jpg')`).
- **Contact info** — update phone, email, and area in the footer of `index.html`.

---

## Turn on the real AI agent (optional)

The browser demo is convincing, but the `lead_agent.py` server adds the parts
that actually run a business: it **saves every lead**, **qualifies** it
(hot / warm / cold), and drafts the reply with the **Claude API** when a key is
set. It uses only the Python standard library — no web framework needed.

```bash
cd mendez_stone

# (optional) live AI-written replies instead of the rule-based template:
export ANTHROPIC_API_KEY=sk-ant-...     # from https://console.anthropic.com
export BOOKSY_URL="https://booksy.com/your-business"   # optional

python3 lead_agent.py                   # serves http://localhost:8000/lead
```

Then point the site at it in `config.js`:

```js
leadEndpoint: "http://localhost:8000/lead",
```

Now form submissions are sent to the agent, which:

1. Computes the price range from `PRICING` in `lead_agent.py`.
2. Qualifies the lead and tags priority (`HOT` / `warm` / `cold`).
3. Drafts a warm, on-brand reply (Claude if a key is set, otherwise a clean
   rule-based template — it never fails the lead).
4. Appends the full record to `leads.jsonl`.

Your incoming leads live in `mendez_stone/leads.jsonl` (one JSON object per
line) — open it any time, import to a CRM, or pipe it into a follow-up flow.

---

## What "AI agents that automate leads" means here (honest version)

The agent automates the **instant response and intake** — the part that wins
jobs because most contractors reply hours or days late. Concretely it:

- answers every lead in seconds with a real price range,
- qualifies and prioritizes so you call the hot ones first,
- captures and stores every lead so none slip through.

What still needs a human: doing the measure, fabricating, installing, and
closing. The AI makes sure **no lead goes cold while you're on a job** — it
doesn't replace the craftsmanship that earns the 5-star reviews.

### Next steps you can wire in
- Email/SMS the customer the reply automatically (add Twilio/SendGrid in
  `handle_lead`).
- Text yourself when a `HOT` lead comes in.
- Push leads into Booksy or a CRM via their API.
- Auto-suggest open Booksy slots in the reply.
