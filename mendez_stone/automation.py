#!/usr/bin/env python3
"""
Mendez Stone — lead automation loop ("the AI agents that run on autopilot").

This is the always-on worker. Start it once and leave it running. It watches
the leads captured by lead_agent.py and, with no human in the loop:

  1. INSTANT OUTREACH  — the moment a new lead lands, sends them the first reply
                         (price range + free-measure offer) by SMS/email.
  2. HOT ALERTS        — texts/emails YOU immediately when a HOT lead comes in
                         so you can call while they're still shopping.
  3. FOLLOW-UP DRIP    — if the lead hasn't been marked as "responded", it keeps
                         nudging on a schedule (1h → 1d → 3d → 7d) with friendly,
                         on-brand messages, then stops. Most jobs are lost to
                         silence; this closes that gap automatically.

It runs in CONSOLE mode out of the box (no accounts, no cost) so you can watch
the whole thing work, and upgrades to real Email/SMS when you set the env vars
in channels.py. Stdlib only.

──────────────────────────────────────────────────────────────────────────────
Run it:
    python3 automation.py                 # loop forever (default 30s tick)
    python3 automation.py --once          # one pass, then exit (cron-friendly)
    TICK=10 python3 automation.py         # check every 10 seconds
    FOLLOWUP_FAST=1 python3 automation.py # compress the drip to seconds (demo)

Manage leads from another terminal:
    python3 automation.py list            # show every lead + its drip state
    python3 automation.py done <lead_id>  # customer replied → stop the drip
──────────────────────────────────────────────────────────────────────────────
"""

import json
import os
import sys
import time
from datetime import datetime, timezone

import channels
import lead_agent as agent

HERE = os.path.dirname(os.path.abspath(__file__))
LEADS_FILE = os.path.join(HERE, "leads.jsonl")
STATE_FILE = os.path.join(HERE, "automation_state.json")

TICK = int(os.environ.get("TICK", "30"))            # seconds between passes
FAST = os.environ.get("FOLLOWUP_FAST") == "1"       # demo: seconds not hours

# Follow-up cadence: (label, delay-after-previous-step in seconds).
# Step 0 is the instant first reply (delay 0). Steps 1..N are the nudges.
_REAL = [
    ("instant",   0),
    ("nudge_1h",  60 * 60),
    ("nudge_1d",  24 * 60 * 60),
    ("nudge_3d",  3 * 24 * 60 * 60),
    ("final_7d",  7 * 24 * 60 * 60),
]
_FAST = [
    ("instant",  0),
    ("nudge_1h", 5),
    ("nudge_1d", 8),
    ("nudge_3d", 12),
    ("final_7d", 16),
]
CADENCE = _FAST if FAST else _REAL


# ── state ──────────────────────────────────────────────────────────────────
def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, encoding="utf-8") as fh:
                return json.load(fh)
        except (ValueError, OSError):
            pass
    return {}


def save_state(state):
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)
    os.replace(tmp, STATE_FILE)


def lead_id(record):
    lead = record.get("lead", {})
    base = record.get("received_at", "") + "|" + (lead.get("phone") or lead.get("email") or lead.get("name") or "?")
    return base


def read_leads():
    if not os.path.exists(LEADS_FILE):
        return []
    out = []
    with open(LEADS_FILE, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except ValueError:
                continue
    return out


def now():
    return datetime.now(timezone.utc).timestamp()


# ── follow-up copy ─────────────────────────────────────────────────────────
_TEMPLATES = {
    "nudge_1h": (
        "Hi {first}, it's {biz} — just confirming we got your {material} "
        "countertop request. Your ballpark is {est}. When's a good time this week "
        "for a free, no-obligation measure?{book}"
    ),
    "nudge_1d": (
        "Hi {first}, following up on your {material} countertops ({est} ballpark). "
        "We have install slots opening up — want me to hold one while you decide?{book}"
    ),
    "nudge_3d": (
        "Hi {first}, still happy to get you an exact written quote on those "
        "{material} countertops whenever you're ready. The measure is free and "
        "takes 20 minutes.{book}"
    ),
    "final_7d": (
        "Hi {first}, last note from {biz} so I don't crowd your inbox — if the "
        "{material} project is still on, just reply and I'll get you scheduled. "
        "Either way, thanks for considering us!{book}"
    ),
}


def followup_body(step_label, record):
    lead = record.get("lead", {})
    first = (lead.get("name") or "there").split(" ")[0]
    material = lead.get("material") or "stone"
    est = record.get("estimate") or agent.estimate(material, lead.get("sqft"))
    book = f" Book anytime: {agent.BOOKSY_URL}" if agent.BOOKSY_URL else ""

    # Try Claude for a fresh, natural nudge; fall back to the template.
    drafted = _ai_followup(step_label, lead, est)
    if drafted:
        return drafted
    return _TEMPLATES[step_label].format(
        first=first, biz=agent.BUSINESS_NAME, material=material, est=est, book=book
    )


def _ai_followup(step_label, lead, est):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
    except ImportError:
        return None
    tone = {
        "nudge_1h": "a quick same-hour check-in confirming you received their request",
        "nudge_1d": "a next-day nudge offering to hold an install slot",
        "nudge_3d": "a low-pressure 3-day follow-up reminding them the measure is free",
        "final_7d": "a final, gracious 7-day message inviting a reply, no pressure",
    }.get(step_label, "a friendly follow-up")
    system = (
        f"You are the front-desk assistant for {agent.BUSINESS_NAME}, a premium "
        "countertop installer. Write ONE short follow-up message (1-2 sentences, "
        "SMS-length) to a lead who hasn't replied yet. Warm, human, never pushy. "
        f"This is {tone}. Reference their material and ballpark price naturally. "
        "Do not invent dates or prices."
        + (f" You may mention they can book on Booksy: {agent.BOOKSY_URL}." if agent.BOOKSY_URL else "")
    )
    user = (
        f"Lead: {lead.get('name')} | {lead.get('material')} | {lead.get('sqft')} sq ft "
        f"| ballpark {est} | project: {lead.get('project')}"
    )
    try:
        client = anthropic.Anthropic(api_key=key)
        resp = client.messages.create(
            model=agent.MODEL, max_tokens=200, system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
    except Exception as exc:
        sys.stderr.write(f"[ai_followup] template fallback: {exc}\n")
        return None


# ── one pass over all leads ────────────────────────────────────────────────
def tick(state):
    changed = False
    for record in read_leads():
        lid = lead_id(record)
        lead = record.get("lead", {})
        st = state.get(lid)
        if st is None:
            st = {
                "name": lead.get("name"),
                "material": lead.get("material"),
                "priority": record.get("signals", {}).get("priority", "warm"),
                "first_seen": now(),
                "last_step_at": 0.0,
                "step": -1,            # index of last step sent in CADENCE
                "status": "active",    # active | responded | done
                "hot_alerted": False,
            }
            state[lid] = st
            changed = True

        if st["status"] != "active":
            continue

        # HOT alert to the owner (once)
        if not st["hot_alerted"] and st["priority"] == "HOT":
            channels.alert_owner(
                f"🔥 HOT lead: {lead.get('name')}",
                f"{lead.get('material')} · {lead.get('sqft')} sq ft · "
                f"{record.get('estimate','')}\nPhone: {lead.get('phone')}  "
                f"Email: {lead.get('email')}\nCall now while they're shopping.\n"
                f"(stop drip: python3 automation.py done {lid})",
            )
            st["hot_alerted"] = True
            changed = True

        # Is the next cadence step due?
        nxt = st["step"] + 1
        if nxt >= len(CADENCE):
            st["status"] = "done"   # drip exhausted, no reply
            changed = True
            continue

        label, delay = CADENCE[nxt]
        ref = st["first_seen"] if nxt == 0 else st["last_step_at"]
        if now() - ref < delay:
            continue  # not time yet

        # Send it.
        if nxt == 0:
            subject = f"Your {agent.BUSINESS_NAME} countertop quote"
            body = (record.get("reply") or "").replace("<br>", "\n")
            if not body:
                body = followup_body("nudge_1h", record)
        else:
            subject = f"Quick follow-up from {agent.BUSINESS_NAME}"
            body = followup_body(label, record)

        channels.send_customer(lead, subject, body)
        st["step"] = nxt
        st["last_step_at"] = now()
        st["last_label"] = label
        changed = True
        print(f"[sent] {label:>9} → {lead.get('name')} ({st['priority']})")

    if changed:
        save_state(state)
    return changed


# ── CLI sub-commands ───────────────────────────────────────────────────────
def cmd_list():
    state = load_state()
    if not state:
        print("No leads tracked yet. Start the loop and submit the quote form.")
        return
    print(f"{'LEAD ID':52} {'PRIORITY':9} {'STEP':10} STATUS")
    for lid, st in state.items():
        step = st.get("last_label", "—") if st.get("step", -1) >= 0 else "—"
        print(f"{lid[:50]:52} {st.get('priority',''):9} {step:10} {st.get('status')}")


def cmd_done(lid):
    state = load_state()
    # allow prefix match for convenience
    matches = [k for k in state if k == lid or k.startswith(lid)]
    if not matches:
        print(f"No lead matching: {lid}")
        return
    for k in matches:
        state[k]["status"] = "responded"
        print(f"✓ stopped follow-ups for {k}")
    save_state(state)


def main():
    args = sys.argv[1:]
    if args and args[0] == "list":
        return cmd_list()
    if args and args[0] == "done":
        if len(args) < 2:
            print("usage: python3 automation.py done <lead_id>")
            return
        return cmd_done(args[1])

    once = "--once" in args
    chans = ", ".join(channels.active_channels())
    mode = "LIVE Claude" if os.environ.get("ANTHROPIC_API_KEY") else "rule-based"
    cadence = "FAST demo (seconds)" if FAST else "real (1h/1d/3d/7d)"
    print(f"{agent.BUSINESS_NAME} automation loop")
    print(f"  channels : {chans}")
    print(f"  copy     : {mode}")
    print(f"  cadence  : {cadence}")
    print(f"  watching : {LEADS_FILE}")
    if once:
        tick(load_state())
        return
    print(f"  tick     : every {TICK}s   (Ctrl-C to stop)\n")
    state = load_state()
    try:
        while True:
            tick(state)
            time.sleep(TICK)
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    main()
