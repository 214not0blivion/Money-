"""Prompt builders for each pipeline stage.

Each function returns (system, user_prompt, stub) where `stub` is the text the
dry-run mode returns so the pipeline produces realistic structure for free.
"""

from __future__ import annotations

from .config import Brief

_TYPE_WORDS = {
    "guide": ("guide / ebook", "chapter"),
    "prompt_pack": ("pack of ready-to-use AI prompts", "prompt category"),
    "template_bundle": ("bundle of fill-in-the-blank templates", "template"),
    "checklist_pack": ("set of actionable checklists", "checklist"),
}


def _kind(brief: Brief) -> tuple[str, str]:
    return _TYPE_WORDS[brief.product_type]


def title_prompt(brief: Brief):
    product, _ = _kind(brief)
    system = (
        "You are a digital-product strategist who names products that sell on "
        "marketplaces like Gumroad and Etsy. You write titles that are specific, "
        "benefit-driven, and free of hype or clickbait."
    )
    user = f"""Propose a title and one-line subtitle for a {product} in this niche.

Niche: {brief.niche}
Audience: {brief.audience or "general"}
Tone: {brief.tone}

Rules:
- The title is concrete and promises a clear outcome.
- The subtitle (under 15 words) sharpens who it's for and the payoff.
- No emojis, no "ultimate", no "secrets".

Respond in exactly this format and nothing else:
TITLE: <title>
SUBTITLE: <subtitle>"""
    stub = (
        f"TITLE: The {brief.niche.title()} Playbook\n"
        f"SUBTITLE: A practical system for {brief.audience or 'busy people'}."
    )
    return system, user, stub


def outline_prompt(brief: Brief, title: str):
    product, unit = _kind(brief)
    system = (
        "You design the table of contents for digital products. Each item is "
        "self-contained, action-oriented, and ordered so a reader builds momentum."
    )
    user = f"""Create an outline of exactly {brief.sections} {unit}s for this {product}.

Title: {title}
Niche: {brief.niche}
Audience: {brief.audience or "general"}

Rules:
- Each line is one {unit}, phrased as a clear, specific heading.
- Logical progression from foundational to advanced.
- No numbering, no extra commentary.

Respond as a plain list, one {unit} per line, and nothing else."""
    stub = "\n".join(f"{unit.title()} {i}: A focused topic" for i in range(1, brief.sections + 1))
    return system, user, stub


def section_prompt(brief: Brief, title: str, heading: str, index: int, total: int):
    product, unit = _kind(brief)
    system = (
        f"You are an expert writing one {unit} of a paid {product}. Your writing "
        "is concrete, example-rich, and immediately usable. Buyers should feel the "
        "purchase paid for itself. Never pad. Never restate the heading as filler."
    )
    user = f"""Write the full content for this {unit} of "{title}".

{unit.title()} {index} of {total}: {heading}
Niche: {brief.niche}
Audience: {brief.audience or "general"}
Tone: {brief.tone}

Requirements:
- Start with a short intro that frames why this matters to the reader.
- Give specific, actionable steps, examples, scripts, or fill-in templates.
- Where useful, include a short checklist or a worked example.
- 400-700 words. Use Markdown: '## {heading}' as the heading, then '###'
  subheadings, bullet lists, and **bold** for key terms.
- End with one concrete "Do this now" action.

Output only the Markdown for this {unit}."""
    stub = (
        f"## {heading}\n\n"
        "[DRY RUN] This is placeholder content. With an API key and without "
        "--dry-run, the model writes a full, usable section here.\n\n"
        "### Why it matters\n\nA short framing paragraph.\n\n"
        "### Steps\n\n- First concrete step\n- Second concrete step\n\n"
        "**Do this now:** one specific action.\n"
    )
    return system, user, stub


def listing_prompt(brief: Brief, title: str, subtitle: str):
    product, _ = _kind(brief)
    system = (
        "You write high-converting marketplace listings (Gumroad, Etsy, Payhip). "
        "You lead with the transformation, use scannable bullets, and write tags "
        "buyers actually search. No hype, no fake scarcity."
    )
    user = f"""Write the complete marketplace listing for this {product}.

Title: {title}
Subtitle: {subtitle}
Niche: {brief.niche}
Audience: {brief.audience or "general"}
Suggested price: ${brief.target_price_usd:.0f}

Produce, in Markdown:
1. A punchy listing TITLE (<= 60 chars, can differ slightly from the book title).
2. A 2-3 sentence HOOK describing the transformation the buyer gets.
3. "What's inside" — 5-8 benefit-driven bullets.
4. "Who it's for" — 3 bullets.
5. 12-15 comma-separated SEO TAGS / keywords buyers would search.
6. A recommended price and a one-line rationale.

Use clear '## ' section headers for each part."""
    stub = (
        f"## Listing Title\n{title}\n\n"
        "## Hook\n[DRY RUN] A 2-3 sentence transformation hook goes here.\n\n"
        "## What's inside\n- Benefit one\n- Benefit two\n\n"
        "## Who it's for\n- Reader type one\n\n"
        f"## Tags\n{brief.niche}, productivity, templates, guide\n\n"
        f"## Price\n${brief.target_price_usd:.0f} — priced for an impulse buy.\n"
    )
    return system, user, stub
