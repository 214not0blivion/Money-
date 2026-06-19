"""The factory pipeline: brief -> finished, sellable product on disk."""

from __future__ import annotations

import datetime as _dt
import json
import re
from pathlib import Path

from . import assemble, prompts
from .config import Brief
from .llm import LLM, LLMConfig


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:60] or "product"


def _parse_title(raw: str) -> tuple[str, str]:
    title, subtitle = "", ""
    for line in raw.splitlines():
        if line.upper().startswith("TITLE:"):
            title = line.split(":", 1)[1].strip()
        elif line.upper().startswith("SUBTITLE:"):
            subtitle = line.split(":", 1)[1].strip()
    if not title:  # model didn't follow format; fall back to first line
        title = raw.strip().splitlines()[0] if raw.strip() else "Untitled Product"
    return title, subtitle


def _parse_outline(raw: str, expected: int) -> list[str]:
    items: list[str] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        line = re.sub(r"^[\-\*\d\.\)\s]+", "", line).strip()  # strip bullets/numbers
        if line:
            items.append(line)
    return items[:expected] if items else [f"Section {i}" for i in range(1, expected + 1)]


def build_product(brief: Brief, *, dry_run: bool, out_root: Path, log=print) -> Path:
    llm = LLM(LLMConfig(model=brief.model, effort=brief.effort, dry_run=dry_run))

    mode = "DRY RUN (no API calls, no cost)" if dry_run else f"LIVE via {brief.model}"
    log(f"\n  Mode: {mode}")
    log(f"  Niche: {brief.niche}  |  Type: {brief.product_type}  |  Sections: {brief.sections}")

    # 1. Title + subtitle
    log("\n[1/4] Naming the product...")
    system, user, stub = prompts.title_prompt(brief)
    title, subtitle = _parse_title(llm.generate(user, system=system, max_tokens=300, stub=stub))
    log(f"      Title:    {title}")
    if subtitle:
        log(f"      Subtitle: {subtitle}")

    # 2. Outline
    log("\n[2/4] Building the outline...")
    system, user, stub = prompts.outline_prompt(brief, title)
    headings = _parse_outline(
        llm.generate(user, system=system, max_tokens=900, stub=stub), brief.sections
    )
    for i, h in enumerate(headings, 1):
        log(f"      {i:>2}. {h}")

    # 3. Section content
    log(f"\n[3/4] Writing {len(headings)} sections...")
    parts = [f"# {title}", ""]
    if subtitle:
        parts += [f"*{subtitle}*", ""]
    for i, heading in enumerate(headings, 1):
        log(f"      Writing section {i}/{len(headings)}: {heading}")
        system, user, stub = prompts.section_prompt(brief, title, heading, i, len(headings))
        body = llm.generate(user, system=system, max_tokens=4000, stub=stub)
        if not body.lstrip().startswith("#"):
            body = f"## {heading}\n\n{body}"
        parts += [body, ""]
    content_md = "\n".join(parts)

    # 4. Listing copy
    log("\n[4/4] Writing the marketplace listing...")
    system, user, stub = prompts.listing_prompt(brief, title, subtitle)
    listing_md = llm.generate(user, system=system, max_tokens=1500, stub=stub)

    # ── Assemble deliverables ─────────────────────────────────────────────
    stamp = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    product_dir = out_root / f"{stamp}_{_slugify(title)}"
    product_dir.mkdir(parents=True, exist_ok=True)

    md_path = product_dir / "product.md"
    html_path = product_dir / "product.html"
    listing_path = product_dir / "listing.md"

    assemble.write_markdown(content_md, md_path)
    assemble.write_html(title, content_md, html_path)
    assemble.write_markdown(listing_md, listing_path)

    pdf_path = product_dir / "product.pdf"
    has_pdf = assemble.write_pdf(title, content_md, pdf_path)

    manifest = {
        "title": title,
        "subtitle": subtitle,
        "niche": brief.niche,
        "audience": brief.audience,
        "product_type": brief.product_type,
        "sections": headings,
        "target_price_usd": brief.target_price_usd,
        "model": brief.model if not dry_run else "dry-run",
        "created_at": _dt.datetime.now().isoformat(timespec="seconds"),
        "files": {
            "content_markdown": md_path.name,
            "content_html": html_path.name,
            "content_pdf": pdf_path.name if has_pdf else None,
            "listing": listing_path.name,
        },
    }
    (product_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    log("\n  Done. Files written to:")
    log(f"    {product_dir}/")
    log(f"      - product.md / product.html" + ("  / product.pdf" if has_pdf else ""))
    log(f"      - listing.md      (paste into Gumroad / Etsy / Payhip)")
    log(f"      - manifest.json")
    if not has_pdf:
        log("\n  Note: install 'reportlab' for PDF export "
            "(or open product.html and Print -> Save as PDF).")
    return product_dir
