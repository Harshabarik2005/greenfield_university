# services/otp_service.py - email one-time passcodes for 2-step login and signup verification
#
# Flow: a correct password (login) or a new registration starts a "challenge". A 6-digit code is
# emailed, and the client gets only the challenge id. POST /api/auth/verify-otp with the id + code
# returns the JWT. Codes are stored as HMAC hashes, expire, allow limited attempts, and have a
# resend cooldown.
import hashlib
import hmac
import math
import os
import secrets
import time
from html import escape

from flask import current_app
from nanoid import generate as nanoid

from db import db
from services.email_service import send_email

OTP_LENGTH = 6
MAX_ATTEMPTS = 5  # wrong codes allowed per challenge before it is invalidated
MAX_SENDS = 5  # emails allowed per challenge (first send + resends)
RESEND_COOLDOWN_SECONDS = 30
CHALLENGE_TTL_SECONDS = 60 * 60  # a sign-in session must finish within an hour

PURPOSE_LOGIN = "login"
PURPOSE_REGISTER = "register"


class OtpError(Exception):
    """An OTP failure that maps to an HTTP error response."""

    def __init__(self, message, status=400, **extra):
        super().__init__(message)
        self.message = message
        self.status = status
        self.extra = extra

    def to_response(self):
        return {"error": self.message, **self.extra}, self.status


def _expiry_seconds():
    try:
        minutes = float(os.getenv("OTP_EXPIRES_MINUTES") or 10)
    except ValueError:
        minutes = 10
    return max(60, int(minutes * 60))


def demo_mode():
    """OTP_DEMO_MODE=true also returns the code in the API response (for demos without real inboxes)."""
    return (os.getenv("OTP_DEMO_MODE") or "").strip().lower() in ("1", "true", "yes", "on")


def _generate_code():
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def _hash_code(challenge_id, code):
    key = (os.getenv("JWT_SECRET") or "").encode("utf-8")
    return hmac.new(key, f"{challenge_id}:{code}".encode("utf-8"), hashlib.sha256).hexdigest()


def _seconds_until(timestamp, now):
    return max(0, math.ceil(timestamp - now))


def _email_content(purpose, code, name):
    minutes = _expiry_seconds() // 60
    greeting = f"Hi {name}," if name else "Hi,"
    if purpose == PURPOSE_REGISTER:
        subject = "Verify your Greenfield Library email"
        intro = "Use this code to verify your email and finish creating your account:"
        ignore = "If you didn't create a Greenfield Library account, you can ignore this email."
    else:
        subject = "Your Greenfield Library sign-in code"
        intro = "Use this code to finish signing in:"
        ignore = "If you didn't try to sign in, someone may know your password - please change it."

    text = f"{greeting}\n\n{intro}\n\n{code}\n\nThis code expires in {minutes} minutes.\n\n{ignore}\n"
    # The name is user-supplied: escape it so nobody can inject links/markup into our emails
    html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#18181b">
  <h2 style="margin:0 0 16px">Greenfield Library</h2>
  <p>{escape(greeting)}</p>
  <p>{intro}</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0;font-family:monospace">{code}</p>
  <p>This code expires in {minutes} minutes.</p>
  <p style="color:#71717a;font-size:12px">{ignore}</p>
</div>"""
    return subject, text, html


def _deliver(user, purpose, code):
    subject, text, html = _email_content(purpose, code, user.get("name"))
    try:
        send_email(user["email"], subject, text, html)
    except Exception:
        current_app.logger.exception("Failed to send OTP email to %s", user["email"])
        if not demo_mode():
            raise OtpError("We couldn't send the verification code. Please try again later.", 502)


def _challenge_response(challenge, user, code):
    now = time.time()
    body = {
        "otpRequired": True,
        "challengeId": challenge["id"],
        "purpose": challenge["purpose"],
        "email": user["email"],
        "expiresIn": _seconds_until(challenge["expiresAt"], now),
        "resendIn": _seconds_until(challenge["lastSentAt"] + RESEND_COOLDOWN_SECONDS, now),
        "message": f"We sent a {OTP_LENGTH}-digit code to {user['email']}.",
    }
    if demo_mode():
        body["demoCode"] = code
    return body


def ensure_can_send(user, purpose):
    """Raise a 429 OtpError if a code was emailed to this user for this purpose within the cooldown."""
    now = time.time()
    with db.lock:
        for existing in db.get("otps"):
            if existing["userId"] == user["id"] and existing["purpose"] == purpose:
                wait = _seconds_until(existing["lastSentAt"] + RESEND_COOLDOWN_SECONDS, now)
                if wait > 0:
                    raise OtpError(
                        f"A code was just sent. Please wait {wait} seconds before requesting another.",
                        429,
                        retryAfter=wait,
                    )


def start_challenge(user, purpose):
    """Create a new challenge for the user, email the code, and return the API response body."""
    now = time.time()
    code = _generate_code()

    with db.lock:
        # Drop abandoned challenges
        db.remove("otps", lambda c: now - c.get("createdAt", 0) > CHALLENGE_TTL_SECONDS)

        ensure_can_send(user, purpose)

        # Only one active challenge per user + purpose
        db.remove("otps", lambda c: c["userId"] == user["id"] and c["purpose"] == purpose)

        challenge_id = nanoid()
        challenge = {
            "id": challenge_id,
            "userId": user["id"],
            "purpose": purpose,
            "codeHash": _hash_code(challenge_id, code),
            "createdAt": now,
            "expiresAt": now + _expiry_seconds(),
            "lastSentAt": now,
            "sendCount": 1,
            "attempts": 0,
        }
        db.push("otps", challenge)

    # Send outside the lock so a slow mail server doesn't block other requests
    try:
        _deliver(user, purpose, code)
    except OtpError:
        db.remove("otps", lambda c: c["id"] == challenge_id)
        raise

    return _challenge_response(challenge, user, code)


def resend_challenge(challenge_id):
    """Issue a fresh code for an existing challenge (respecting cooldown and send limits)."""
    now = time.time()
    code = _generate_code()

    with db.lock:
        challenge = db.find("otps", id=challenge_id)
        if not challenge or now - challenge.get("createdAt", 0) > CHALLENGE_TTL_SECONDS:
            raise OtpError("This sign-in session has expired. Please start again.", 401, restart=True)

        user = db.find("users", id=challenge["userId"])
        if not user:
            db.remove("otps", lambda c: c["id"] == challenge_id)
            raise OtpError("Account not found. Please start again.", 401, restart=True)

        wait = _seconds_until(challenge["lastSentAt"] + RESEND_COOLDOWN_SECONDS, now)
        if wait > 0:
            raise OtpError(f"Please wait {wait} seconds before requesting another code.", 429, retryAfter=wait)

        if challenge["sendCount"] >= MAX_SENDS:
            db.remove("otps", lambda c: c["id"] == challenge_id)
            raise OtpError("Too many codes requested. Please start again.", 429, restart=True)

        challenge.update({
            "codeHash": _hash_code(challenge_id, code),
            "expiresAt": now + _expiry_seconds(),
            "lastSentAt": now,
            "sendCount": challenge["sendCount"] + 1,
            "attempts": 0,
        })
        db.write()

    _deliver(user, challenge["purpose"], code)
    return _challenge_response(challenge, user, code)


def verify_challenge(challenge_id, code):
    """Check a submitted code. Returns the verified user, or raises OtpError."""
    code = str(code or "").strip()
    if not challenge_id or len(code) != OTP_LENGTH or not code.isascii() or not code.isdigit():
        raise OtpError(f"Enter the {OTP_LENGTH}-digit code from your email.", 400)

    now = time.time()
    with db.lock:
        challenge = db.find("otps", id=challenge_id)
        if not challenge or now - challenge.get("createdAt", 0) > CHALLENGE_TTL_SECONDS:
            raise OtpError("This sign-in session has expired. Please start again.", 401, restart=True)

        if now > challenge["expiresAt"]:
            raise OtpError("This code has expired. Request a new one.", 401, expired=True)

        if not hmac.compare_digest(challenge["codeHash"], _hash_code(challenge_id, code)):
            challenge["attempts"] += 1
            remaining = MAX_ATTEMPTS - challenge["attempts"]
            if remaining <= 0:
                db.remove("otps", lambda c: c["id"] == challenge_id)
                raise OtpError("Too many incorrect attempts. Please start again.", 401, restart=True)
            db.write()
            plural = "attempt" if remaining == 1 else "attempts"
            raise OtpError(f"Incorrect code. {remaining} {plural} left.", 401, attemptsLeft=remaining)

        # Success: a code is single-use
        db.remove("otps", lambda c: c["id"] == challenge_id)

        user = db.find("users", id=challenge["userId"])
        if not user:
            raise OtpError("Account not found. Please start again.", 401, restart=True)

        # Receiving the code proves the user owns this email address
        if not user.get("emailVerified", True):
            user["emailVerified"] = True
            db.write()

        return user
