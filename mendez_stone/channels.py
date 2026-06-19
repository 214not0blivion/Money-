#!/usr/bin/env python3
"""
Mendez Stone — notification channels.

One tiny abstraction for *sending a message to someone*, with three backends
that turn on automatically based on which environment variables you set:

  • console  — always on. Prints the message. Great for testing the whole
               automation with zero accounts or cost.
  • email    — on when SMTP_HOST / SMTP_USER / SMTP_PASS are set. Stdlib smtplib.
  • sms      — on when TWILIO_SID / TWILIO_TOKEN / TWILIO_FROM are set.
               Uses Twilio's REST API over urllib (no twilio package needed).

Nothing here is required to be configured — with no env vars it runs in console
mode so the loops are fully testable. Add credentials later to go live.
"""

import os
import sys
import smtplib
import urllib.parse
import urllib.request
from email.mime.text import MIMEText


def _have(*names):
    return all(os.environ.get(n) for n in names)


# ── Console (always available) ─────────────────────────────────────────────
def _send_console(to, subject, body, kind):
    bar = "─" * 56
    sys.stdout.write(
        f"\n{bar}\n[{kind.upper()} → {to}] {subject}\n{bar}\n{body}\n{bar}\n"
    )
    sys.stdout.flush()
    return True


# ── Email via SMTP ─────────────────────────────────────────────────────────
def _send_email(to, subject, body):
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ["SMTP_USER"]
    pwd = os.environ["SMTP_PASS"]
    sender = os.environ.get("SMTP_FROM", user)

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    try:
        with smtplib.SMTP(host, port, timeout=20) as s:
            s.starttls()
            s.login(user, pwd)
            s.sendmail(sender, [to], msg.as_string())
        return True
    except Exception as exc:  # never crash the loop on a send failure
        sys.stderr.write(f"[email] failed ({exc}); falling back to console\n")
        return _send_console(to, subject, body, "email")


# ── SMS via Twilio REST (urllib, no SDK) ───────────────────────────────────
def _send_sms(to, body):
    sid = os.environ["TWILIO_SID"]
    token = os.environ["TWILIO_TOKEN"]
    frm = os.environ["TWILIO_FROM"]
    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    data = urllib.parse.urlencode({"To": to, "From": frm, "Body": body}).encode()
    req = urllib.request.Request(url, data=data)
    auth = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    auth.add_password(None, url, sid, token)
    opener = urllib.request.build_opener(urllib.request.HTTPBasicAuthHandler(auth))
    try:
        with opener.open(req, timeout=20) as resp:
            return 200 <= resp.status < 300
    except Exception as exc:
        sys.stderr.write(f"[sms] failed ({exc}); falling back to console\n")
        return _send_console(to, "(SMS)", body, "sms")


# ── Public API ─────────────────────────────────────────────────────────────
def send_customer(lead, subject, body):
    """Reach the customer on the best available channel (SMS → email → console)."""
    phone = lead.get("phone")
    email = lead.get("email")
    if phone and _have("TWILIO_SID", "TWILIO_TOKEN", "TWILIO_FROM"):
        return _send_sms(phone, body)
    if email and _have("SMTP_HOST", "SMTP_USER", "SMTP_PASS"):
        return _send_email(email, subject, body)
    return _send_console(phone or email or "customer", subject, body, "customer")


def alert_owner(subject, body):
    """Notify the business owner (you) — uses OWNER_PHONE / OWNER_EMAIL."""
    phone = os.environ.get("OWNER_PHONE")
    email = os.environ.get("OWNER_EMAIL")
    if phone and _have("TWILIO_SID", "TWILIO_TOKEN", "TWILIO_FROM"):
        return _send_sms(phone, f"{subject}\n{body}")
    if email and _have("SMTP_HOST", "SMTP_USER", "SMTP_PASS"):
        return _send_email(email, subject, body)
    return _send_console(phone or email or "OWNER", subject, body, "owner-alert")


def active_channels():
    out = ["console"]
    if _have("SMTP_HOST", "SMTP_USER", "SMTP_PASS"):
        out.append("email")
    if _have("TWILIO_SID", "TWILIO_TOKEN", "TWILIO_FROM"):
        out.append("sms")
    return out
