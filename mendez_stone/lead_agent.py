#!/usr/bin/env python3
"""
Mendez Stone — AI lead agent.

A tiny, dependency-light server that powers the "AI agents that automate leads"
part of the site. For every quote-form submission it:

  1. Qualifies the lead (material, size, urgency, completeness).
  2. Computes an instant price range from your pricing table.
  3. Drafts a warm, on-brand reply with the Claude API (or a clean rule-based
     reply when no API key is set, so it always works).
  4. Appends the lead to leads.jsonl so nothing is ever lost.

Run it:
    python3 lead_agent.py                 # serves on http://localhost:8000
    PORT=9000 python3 lead_agent.py       # custom port

Then in config.js set:
    leadEndpoint: "http://localhost:8000/lead"

Optional live AI replies:
    export ANTHROPIC_API_KEY=sk-ant-...   # else falls back to rule-based copy

No web framework required — uses only the Python standard library. The
`anthropic` package (already in requirements.txt) is used only if installed
*and* a key is present.
"""

import json
import os
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ── Business config — match these to your real numbers ─────────────────────
BUSINESS_NAME = "Mendez Stone"
BOOKSY_URL = os.environ.get("BOOKSY_URL", "")  # optional, included in replies
PORT = int(os.environ.get("PORT", "8000"))
LEADS_FILE = os.path.join(os.path.dirname(__file__), "leads.jsonl")

# Per-installed-square-foot pricing (USD). Keep in sync with config.js.
PRICING = {
    "Granite": (45, 75),
    "Quartz": (55, 90),
    "Marble": (70, 120),
    "Not sure yet": (45, 120),
}
MIN_JOB = 1200

MODEL = os.environ.get("MENDEZ_MODEL", "claude-opus-4-8")


# ── Lead qualification ─────────────────────────────────────────────────────
def estimate(material, sqft):
    """Return a human-readable price range string."""
    low, high = PRICING.get(material, (45, 120))
    try:
        sq = float(sqft)
    except (TypeError, ValueError):
        sq = 0
    if sq > 0:
        lo = round(sq * low)
        hi = round(sq * high)
        if hi < MIN_JOB:
            # Small job below our minimum — quote the minimum, don't invert.
            return f"around ${MIN_JOB:,} (minimum job)"
        lo = max(MIN_JOB, lo)
        return f"${lo:,}–${hi:,}"
    return f"${low}–${high} / sq ft installed"


def qualify(lead):
    """Score completeness and flag hot leads. Returns a dict of signals."""
    sqft = lead.get("sqft")
    try:
        sq = float(sqft)
    except (TypeError, ValueError):
        sq = 0
    text = (lead.get("project", "") or "").lower()
    urgent = any(w in text for w in ("asap", "urgent", "this week", "soon", "ready"))
    has_contact = bool(lead.get("phone") or lead.get("email"))
    # "hot" = real contact + a sizeable, specified job or stated urgency
    hot = has_contact and (sq >= 30 or urgent)
    return {
        "complete": bool(lead.get("name") and has_contact and lead.get("material")),
        "sqft": sq,
        "urgent": urgent,
        "hot": hot,
        "priority": "HOT" if hot else ("warm" if has_contact else "cold"),
    }


# ── Reply drafting ─────────────────────────────────────────────────────────
def rule_based_reply(lead, signals):
    first = (lead.get("name") or "there").split(" ")[0]
    material = lead.get("material") or "stone"
    est = estimate(material, lead.get("sqft"))
    contact = lead.get("phone") or lead.get("email") or "you"
    book = f"\n\nWant to lock in a time now? Book on Booksy: {BOOKSY_URL}" if BOOKSY_URL else ""
    return (
        f"Thanks, {first}! Based on what you shared, your {material} countertops "
        f"would run about {est}. That's a ballpark — your exact written price comes "
        f"after a quick, free laser measure with no obligation.\n\n"
        f"A {BUSINESS_NAME} installer will reach out to {contact} today to set up "
        f"your free estimate.{book}"
    )


def ai_reply(lead, signals):
    """Draft with Claude if available; otherwise fall back to rule-based."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return rule_based_reply(lead, signals)
    try:
        import anthropic
    except ImportError:
        return rule_based_reply(lead, signals)

    est = estimate(lead.get("material") or "stone", lead.get("sqft"))
    system = (
        f"You are the friendly front-desk assistant for {BUSINESS_NAME}, a premium "
        "countertop fabrication and installation company. Write a short (3-4 sentence) "
        "reply to a new lead from the website quote form. Be warm, confident, and "
        "concrete. ALWAYS include the price estimate you are given verbatim, frame it as "
        "a no-obligation ballpark that's finalized after a free in-home laser measure, and "
        "tell them an installer will follow up today. Do not invent prices, dates, or "
        "facts. No markdown headers."
        + (f" If natural, mention they can also book instantly on Booksy: {BOOKSY_URL}." if BOOKSY_URL else "")
    )
    user = (
        f"New lead:\n"
        f"- Name: {lead.get('name')}\n"
        f"- Phone: {lead.get('phone')}\n"
        f"- Email: {lead.get('email')}\n"
        f"- Material: {lead.get('material')}\n"
        f"- Approx sq ft: {lead.get('sqft')}\n"
        f"- Project: {lead.get('project')}\n"
        f"- Priority: {signals['priority']}\n\n"
        f"Price estimate to include verbatim: {est}"
    )
    try:
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model=MODEL,
            max_tokens=400,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
    except Exception as exc:  # network/key/quota — never fail the lead
        sys.stderr.write(f"[ai_reply] falling back to rule-based: {exc}\n")
        return rule_based_reply(lead, signals)


# ── Persistence ────────────────────────────────────────────────────────────
def save_lead(record):
    with open(LEADS_FILE, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def handle_lead(lead):
    signals = qualify(lead)
    reply = ai_reply(lead, signals)
    record = {
        "received_at": datetime.now(timezone.utc).isoformat(),
        "lead": lead,
        "signals": signals,
        "estimate": estimate(lead.get("material") or "stone", lead.get("sqft")),
        "reply": reply,
    }
    save_lead(record)
    # The reply is sent back to the browser; convert newlines to <br> for HTML.
    return {"ok": True, "reply": reply.replace("\n", "<br>"), "priority": signals["priority"]}


# ── HTTP server (stdlib only) ──────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path in ("/", "/health"):
            self._json(200, {"ok": True, "service": f"{BUSINESS_NAME} lead agent"})
        else:
            self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path != "/lead":
            self._json(404, {"ok": False, "error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length) if length else b"{}"
            lead = json.loads(body or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._json(400, {"ok": False, "error": "invalid json"})
            return
        try:
            result = handle_lead(lead)
            priority = result.get("priority")
            sys.stdout.write(
                f"[lead] {priority:>4} | {lead.get('name','?')} | "
                f"{lead.get('material','?')} | {lead.get('sqft','?')} sq ft\n"
            )
            sys.stdout.flush()
            self._json(200, result)
        except Exception as exc:  # noqa
            sys.stderr.write(f"[error] {exc}\n")
            self._json(500, {"ok": False, "error": "server error"})

    def _json(self, code, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):  # quiet default logging; we print our own
        pass


def main():
    mode = "LIVE (Claude)" if os.environ.get("ANTHROPIC_API_KEY") else "rule-based (no API key)"
    print(f"{BUSINESS_NAME} lead agent → http://localhost:{PORT}/lead   [{mode}]")
    print(f"Leads saved to: {LEADS_FILE}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
