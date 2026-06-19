"""Turn generated Markdown into deliverable files: Markdown, HTML, and PDF.

PDF export uses reportlab if installed; if it isn't, the factory still produces
Markdown + HTML (which any buyer can read, and which you can 'Print to PDF').
"""

from __future__ import annotations

import html
import re
from pathlib import Path

try:
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        ListFlowable,
        ListItem,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
    )

    _HAS_REPORTLAB = True
except ImportError:
    _HAS_REPORTLAB = False


def _inline_md_to_html(text: str) -> str:
    """Escape, then re-apply **bold** and *italic*."""
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
    return text


def write_markdown(content: str, path: Path) -> None:
    path.write_text(content, encoding="utf-8")


def write_html(title: str, content: str, path: Path) -> None:
    body_lines: list[str] = []
    in_list = False

    def close_list() -> None:
        nonlocal in_list
        if in_list:
            body_lines.append("</ul>")
            in_list = False

    for raw in content.splitlines():
        line = raw.rstrip()
        if not line:
            close_list()
            continue
        if line.startswith("### "):
            close_list()
            body_lines.append(f"<h3>{_inline_md_to_html(line[4:])}</h3>")
        elif line.startswith("## "):
            close_list()
            body_lines.append(f"<h2>{_inline_md_to_html(line[3:])}</h2>")
        elif line.startswith("# "):
            close_list()
            body_lines.append(f"<h1>{_inline_md_to_html(line[2:])}</h1>")
        elif line.lstrip().startswith(("- ", "* ")):
            if not in_list:
                body_lines.append("<ul>")
                in_list = True
            body_lines.append(f"<li>{_inline_md_to_html(line.lstrip()[2:])}</li>")
        else:
            close_list()
            body_lines.append(f"<p>{_inline_md_to_html(line)}</p>")
    close_list()

    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
  body {{ font-family: Georgia, serif; max-width: 720px; margin: 3rem auto;
          padding: 0 1.25rem; line-height: 1.65; color: #1c1c1c; }}
  h1 {{ font-size: 2rem; border-bottom: 2px solid #c0552c; padding-bottom: .3rem; }}
  h2 {{ margin-top: 2.4rem; color: #b34a24; }}
  h3 {{ margin-top: 1.5rem; }}
  ul {{ padding-left: 1.3rem; }}
  li {{ margin: .25rem 0; }}
</style></head>
<body>
{chr(10).join(body_lines)}
</body></html>
"""
    path.write_text(doc, encoding="utf-8")


def write_pdf(title: str, content: str, path: Path) -> bool:
    """Render Markdown to a styled PDF. Returns False if reportlab is missing."""
    if not _HAS_REPORTLAB:
        return False

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("H1c", parent=styles["Title"], textColor="#b34a24"))
    styles.add(
        ParagraphStyle("H2c", parent=styles["Heading2"], textColor="#b34a24", spaceBefore=16)
    )

    def inline(t: str) -> str:
        return _inline_md_to_html(t)

    flow = []
    bullets: list[ListItem] = []

    def flush_bullets() -> None:
        if bullets:
            flow.append(ListFlowable(list(bullets), bulletType="bullet", leftIndent=18))
            flow.append(Spacer(1, 6))
            bullets.clear()

    for raw in content.splitlines():
        line = raw.rstrip()
        if not line:
            flush_bullets()
            continue
        if line.startswith("### "):
            flush_bullets()
            flow.append(Paragraph(inline(line[4:]), styles["Heading3"]))
        elif line.startswith("## "):
            flush_bullets()
            flow.append(Paragraph(inline(line[3:]), styles["H2c"]))
        elif line.startswith("# "):
            flush_bullets()
            flow.append(Paragraph(inline(line[2:]), styles["H1c"]))
        elif line.lstrip().startswith(("- ", "* ")):
            bullets.append(ListItem(Paragraph(inline(line.lstrip()[2:]), styles["BodyText"])))
        else:
            flush_bullets()
            flow.append(Paragraph(inline(line), styles["BodyText"]))
            flow.append(Spacer(1, 4))
    flush_bullets()

    doc = SimpleDocTemplate(
        str(path), pagesize=LETTER,
        topMargin=0.9 * inch, bottomMargin=0.9 * inch,
        leftMargin=1 * inch, rightMargin=1 * inch,
        title=title,
    )
    doc.build(flow)
    return True
