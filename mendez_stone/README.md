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
  lead_agent.py   # AI backend: qualifies leads, drafts replies, saves them
  automation.py   # always-on loop: auto-outreach, HOT alerts, follow-up drip
  channels.py     # send messages via console / email (SMTP) / SMS (Twilio)
  inbox_watcher.py# reads replies/Booksy confirmations → auto-stops the drip
```

## Can I just sit back and receive appointments?

Mostly yes — for everything up to the appointment. Honest version: a countertop
business has work software can't do — the **measure, fabrication, and install**
are human. What runs without you is the whole path to a booked job:

```
lead fills form → instant AI reply + price → follow-up drip if no answer
   → they self-book on Booksy → inbox_watcher sees the confirmation
   → drip stops + you get a "📅 BOOKED" alert → you show up to the measure
```

**Booksy is the engine that actually puts appointments on your calendar.** The
page and the agents exist to funnel every lead into that Booksy booking link and
to chase the ones who hesitate. Your job shrinks to: keep the Booksy link in
`config.js` current, and do the great install work.

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

## The automatic agents (always-on loop)

`lead_agent.py` answers leads as they come in. `automation.py` is the **worker
that runs on autopilot** — start it once and leave it running. Every tick it:

1. **Instant outreach** — texts/emails each new lead their quote immediately.
2. **HOT alerts** — notifies *you* the moment a high-value lead lands, so you
   can call while they're still shopping.
3. **Follow-up drip** — keeps nudging leads who haven't replied on a schedule
   (1h → 1d → 3d → 7d), then stops. This is where most jobs are saved: the
   lead that would've gone cold gets a friendly, on-brand reminder automatically.

```bash
cd mendez_stone

# Terminal 1 — capture leads from the website form
python3 lead_agent.py

# Terminal 2 — the autopilot loop
python3 automation.py                 # runs forever, checks every 30s
```

It runs in **console mode** with zero setup so you can watch it work. See a full
drip play out in seconds:

```bash
FOLLOWUP_FAST=1 TICK=2 python3 automation.py
```

Manage the queue any time:

```bash
python3 automation.py list            # every lead + where it is in the drip
python3 automation.py done <lead_id>  # customer replied → stop nudging them
python3 automation.py --once          # single pass (good for cron)
```

### Going live with real Email / SMS (no new packages)

The channels turn on automatically when their env vars are present (see
`channels.py`). Set whichever you want:

```bash
# Email (any SMTP provider)
export SMTP_HOST=smtp.gmail.com SMTP_USER=you@gmail.com SMTP_PASS=app-password
export SMTP_FROM="Mendez Stone <you@gmail.com>"

# SMS (Twilio)
export TWILIO_SID=ACxxx TWILIO_TOKEN=xxx TWILIO_FROM=+1XXXXXXXXXX

# Where HOT-lead alerts go to YOU
export OWNER_PHONE=+1XXXXXXXXXX        # or OWNER_EMAIL=you@email.com

# Smarter, varied follow-up wording (optional)
export ANTHROPIC_API_KEY=sk-ant-...
```

With SMS configured the customer gets a text; otherwise email; otherwise it
prints to the console. A send failure never crashes the loop — it falls back to
console and keeps going.

### Auto-stop the drip when they book or reply (`inbox_watcher.py`)

This is the piece that makes it truly hands-off. Each tick the loop checks your
mailbox and, for any active lead:

- a **Booksy booking confirmation** → marks the lead `booked`, stops the drip,
  and alerts you `📅 BOOKED`;
- a **reply from the customer** → marks the lead `responded`, stops the drip,
  and alerts you `💬 Reply` so a human takes over.

It's inert until you add read-only IMAP credentials (Gmail shown; any IMAP host
works). For Gmail, create an **App Password** — your normal login won't work:

```bash
export IMAP_HOST=imap.gmail.com
export IMAP_USER=you@gmail.com
export IMAP_PASS=your-app-password
# optional: IMAP_PORT=993  IMAP_FOLDER=INBOX  IMAP_LOOKBACK_DAYS=14
```

It only reads recent mail, never deletes anything, and skips silently on error.
Set the mailbox to whatever address receives your Booksy notifications.

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

### Already built
- ✅ Auto Email/SMS the customer the reply (Twilio / SMTP in `channels.py`).
- ✅ Text/email yourself when a `HOT` lead comes in.
- ✅ Automatic multi-touch follow-up drip until they respond.
- ✅ Inbox watcher: auto-stops the drip when a lead books or replies, and
  alerts you to take over (`inbox_watcher.py`).

### Next steps you could wire in
- Push leads into a CRM via its API.
- Auto-suggest specific open Booksy slots in the reply (needs Booksy API access).
