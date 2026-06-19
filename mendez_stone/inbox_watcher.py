#!/usr/bin/env python3
"""
Mendez Stone — inbox watcher (closes the loop so you can sit back).

The automation loop sends outreach. This reads the *replies* so the system
knows when to stop nudging and hand a warm lead to you:

  • Booksy booking confirmation lands  → mark that lead BOOKED, stop the drip,
                                          alert you: "appointment booked".
  • A customer emails back             → mark that lead RESPONDED, stop the drip,
                                          alert you so a human takes over.

Without this, the drip can't tell who already booked and might keep nudging a
customer who's on your calendar. With it, the funnel is hands-off:
   lead → instant reply → follow-ups → self-books on Booksy → you get the alert.

It is INERT until you set IMAP credentials (so the rest runs fine without it):

    export IMAP_HOST=imap.gmail.com          # your mailbox
    export IMAP_USER=you@gmail.com
    export IMAP_PASS=app-password            # Gmail: an App Password, not login
    # optional: export IMAP_PORT=993  IMAP_FOLDER=INBOX  IMAP_LOOKBACK_DAYS=14

Stdlib only (imaplib). Safe: read-only, only touches recent messages, never
deletes anything, never crashes the loop on an error.
"""

import email
import imaplib
import os
import sys
from datetime import datetime, timedelta
from email.header import decode_header
from email.utils import parseaddr

import channels

# Senders that mean "an appointment was booked".
BOOKSY_HINTS = ("booksy",)
BOOKING_SUBJECT_HINTS = (
    "booking", "appointment", "confirmed", "reservation", "scheduled", "you're booked",
)


def configured():
    return all(os.environ.get(k) for k in ("IMAP_HOST", "IMAP_USER", "IMAP_PASS"))


def _decode(value):
    if not value:
        return ""
    parts = decode_header(value)
    out = []
    for text, enc in parts:
        if isinstance(text, bytes):
            try:
                out.append(text.decode(enc or "utf-8", "replace"))
            except (LookupError, TypeError):
                out.append(text.decode("utf-8", "replace"))
        else:
            out.append(text)
    return "".join(out)


def _body_text(msg):
    try:
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    payload = part.get_payload(decode=True) or b""
                    return payload.decode(part.get_content_charset() or "utf-8", "replace")
            return ""
        payload = msg.get_payload(decode=True) or b""
        return payload.decode(msg.get_content_charset() or "utf-8", "replace")
    except Exception:
        return ""


def _fetch_recent():
    """Return list of (from_addr, from_name, subject, body) for recent mail."""
    host = os.environ["IMAP_HOST"]
    port = int(os.environ.get("IMAP_PORT", "993"))
    user = os.environ["IMAP_USER"]
    pwd = os.environ["IMAP_PASS"]
    folder = os.environ.get("IMAP_FOLDER", "INBOX")
    lookback = int(os.environ.get("IMAP_LOOKBACK_DAYS", "14"))

    msgs = []
    try:
        M = imaplib.IMAP4_SSL(host, port)
        M.login(user, pwd)
        M.select(folder, readonly=True)
        since = (datetime.utcnow() - timedelta(days=lookback)).strftime("%d-%b-%Y")
        typ, data = M.search(None, f'(SINCE {since})')
        if typ == "OK":
            ids = data[0].split()
            for num in ids[-200:]:  # cap work per pass
                typ, raw = M.fetch(num, "(RFC822)")
                if typ != "OK" or not raw or not raw[0]:
                    continue
                msg = email.message_from_bytes(raw[0][1])
                name, addr = parseaddr(_decode(msg.get("From", "")))
                subject = _decode(msg.get("Subject", ""))
                msgs.append((addr.lower(), name, subject, _body_text(msg)))
        M.logout()
    except Exception as exc:
        sys.stderr.write(f"[inbox] scan skipped ({exc})\n")
    return msgs


def _looks_like_booking(from_addr, subject):
    s = subject.lower()
    if any(h in from_addr for h in BOOKSY_HINTS):
        return True
    if any(h in from_addr for h in BOOKSY_HINTS) or "booksy" in s:
        return any(h in s for h in BOOKING_SUBJECT_HINTS) or True
    return False


def scan_and_update(state, contacts):
    """
    contacts: list of {"lead_id","email","name","phone"} for ACTIVE leads.
    Marks matching leads booked/responded in `state` and alerts the owner.
    Returns the number of leads updated.
    """
    if not configured() or not contacts:
        return 0

    msgs = _fetch_recent()
    if not msgs:
        return 0

    by_email = {}
    by_name = {}
    for c in contacts:
        if c.get("email"):
            by_email[c["email"].lower()] = c
        if c.get("name"):
            by_name[c["name"].lower()] = c

    updated = 0
    for from_addr, from_name, subject, body in msgs:
        text = f"{subject}\n{body}".lower()

        # 1) Booksy booking confirmation → find which tracked lead it's about.
        if _looks_like_booking(from_addr, subject):
            match = None
            for em, c in by_email.items():
                if em and em in text:
                    match = c
                    break
            if not match:
                for nm, c in by_name.items():
                    if nm and nm in text:
                        match = c
                        break
            if match:
                st = state.get(match["lead_id"])
                if st and st.get("status") == "active":
                    st["status"] = "booked"
                    updated += 1
                    channels.alert_owner(
                        f"📅 BOOKED: {match.get('name')}",
                        f"{match.get('name')} booked an appointment (via Booksy). "
                        f"Drip stopped. Check your Booksy calendar for the time.",
                    )
            else:
                # A booking we couldn't tie to a tracked lead — still tell you.
                channels.alert_owner(
                    "📅 New Booksy booking",
                    f"A booking confirmation arrived ({subject}). "
                    f"Check your Booksy calendar.",
                )
            continue

        # 2) A reply from a tracked lead's own address → human takeover.
        c = by_email.get(from_addr)
        if c:
            st = state.get(c["lead_id"])
            if st and st.get("status") == "active":
                st["status"] = "responded"
                updated += 1
                channels.alert_owner(
                    f"💬 Reply from {c.get('name')}",
                    f"{c.get('name')} <{from_addr}> replied: \"{subject}\". "
                    f"Drip stopped — your turn to close it.",
                )
    return updated
