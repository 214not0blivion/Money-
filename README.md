# Digital Product Factory

An AI-assisted pipeline that turns a one-line idea into a **finished, sellable
digital product** — the content file (Markdown, HTML, and PDF) plus the
marketplace listing copy you paste straight into Gumroad, Etsy, or Payhip.

You supply the niche and press the button. The agents do the research, writing,
formatting, and listing copy. You review and upload. That's the whole loop.

---

## The honest version of "passive income"

Read this once so the rest makes sense.

There is **no button that deposits money into your bank with zero human
involvement.** Anyone who tells you otherwise is selling the dream, not the
thing. Real digital-product income has three human jobs that software cannot do
for you:

1. **Judgment** — picking a niche real people will pay for. The tool helps, but
   you decide.
2. **Distribution** — getting the product in front of buyers (a marketplace's
   own search, a social post, a small ad, an audience). Listings don't sell
   themselves on day one.
3. **A payment account** — Gumroad/Etsy/Payhip, where the actual money lands.

What this factory removes is the part that used to take days: **producing the
product and its sales copy.** That collapses from "a weekend" to "a few
minutes." Once a product is listed, *that individual product* can sell while you
sleep — that's the "passive" part, and it's real. But it becomes passive only
*after* the human work of choosing well and getting eyeballs on it. Build a
catalog of 10–30 good products and the math starts working in your favor.

Treat this as a **factory that makes your inventory cheap**, not a money printer.

---

## Setup (5 minutes)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. (Optional, for live generation) add your Anthropic API key
cp .env.example .env
#   then edit .env and paste your key from https://console.anthropic.com
```

You do **not** need a key to try it — see dry-run below.

---

## Run it

### Free preview — no key, no cost

See the entire pipeline run with placeholder text, so you understand the output
before spending a cent:

```bash
python3 -m digital_factory.cli --niche "meal prep for busy parents" --dry-run
```

### Real generation

```bash
# Quick one-liner
python3 -m digital_factory.cli \
  --niche "Notion templates for freelance designers" \
  --audience "freelance designers who lose track of projects" \
  --type template_bundle --sections 6 --price 24

# Or use a saved brief (recommended — easy to tweak and reuse)
cp config.example.yaml config.yaml
#   edit config.yaml, then:
python3 -m digital_factory.cli --config config.yaml
```

Each run creates a timestamped folder in `output/` containing:

| File | What it is | What you do with it |
|------|-----------|---------------------|
| `product.pdf` / `product.html` / `product.md` | The product itself | This is what the buyer downloads |
| `listing.md` | Title, hook, bullets, SEO tags, suggested price | Paste into your marketplace listing |
| `manifest.json` | Machine-readable record of the run | Inventory tracking / automation |

> PDF export needs `reportlab` (in `requirements.txt`). Without it you still get
> Markdown + HTML — open the HTML and "Print → Save as PDF" in any browser.

---

## Product types

`--type` accepts:

- `guide` — an ebook / how-to guide (chapters)
- `prompt_pack` — a pack of ready-to-use AI prompts
- `template_bundle` — fill-in-the-blank templates
- `checklist_pack` — actionable checklists

---

## The actual money-making workflow

The tool is step 3. Here is the whole loop:

1. **Pick a niche with buyers.** Look at what's already selling on Gumroad/Etsy —
   if products in a niche have reviews and sales counts, money is changing hands.
   Go narrow: "budget templates for new parents" beats "budget templates."
2. **Generate 3–5 candidate products** for that niche (a few minutes each).
3. **Review and edit.** Read what came out. Fix anything wrong, add a personal
   example, make it genuinely good. *You are the quality bar.* A product that
   reads like obvious filler gets refunded and tanks your ratings.
4. **List it** on Gumroad (easiest to start — free, instant payouts) or Etsy
   (built-in search traffic, small listing fee). Use the generated `listing.md`.
5. **Get the first eyeballs.** Post it where your audience already hangs out — a
   relevant subreddit (read their self-promo rules first), a niche Facebook
   group, your own social, or a $5–20 test ad. This is the step most people skip
   and then wonder why nothing sold.
6. **Keep the winners, cut the losers, repeat.** Reinvest time into niches that
   sell. A catalog compounds.

### Cost reality check

Live generation uses the Claude API. A typical product (≈11 model calls) costs
on the order of **a few cents to ~$1** depending on length and the `effort`
setting. Selling one $19 product covers hundreds of generations. Use `--dry-run`
to design your brief for free, then spend the cents on the real run.

---

## What "on autopilot by AI agents" really means here

The agents automate the **production line**, each as a focused stage:

```
brief → [name it] → [outline it] → [write each section] → [write the listing] → files
```

You can absolutely script this further — loop it over a list of niches, schedule
it, wire the output into a marketplace's upload API — and several stages are
designed to be automated (every run writes a `manifest.json` for exactly that).
But keep a human review gate before anything goes live. Marketplaces ban
accounts that flood low-quality auto-generated junk, and refunds/bad reviews
destroy the economics. The winning move is **high-volume production + human
taste**, not zero-touch spam.

---

## Project layout

```
digital_factory/
  cli.py        # command-line entry point
  config.py     # the product brief (validated)
  llm.py        # Anthropic API wrapper (+ free dry-run mode)
  prompts.py    # the prompt for each pipeline stage
  pipeline.py   # orchestrates: name → outline → sections → listing → files
  assemble.py   # Markdown → HTML/PDF deliverables
config.example.yaml
requirements.txt
.env.example
```

---

## Roadmap ideas (good next steps)

- A `batch` command that runs a CSV of niches overnight.
- A cover-image stage (the API can drive an image model, or generate an SVG).
- A "market scan" stage that researches demand before generating.
- A simple review UI before publishing.

These are deliberately left as extensions — the core loop is intentionally small
and honest so you can trust what it does.
