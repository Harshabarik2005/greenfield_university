# routes/auth.py - password login + email OTP (2-step) and signup email verification
import math
import os
import re
import time

import bcrypt
import jwt
from flask import Blueprint, jsonify
from nanoid import generate as nanoid

from db import db
from services.otp_service import (
    PURPOSE_LOGIN,
    PURPOSE_REGISTER,
    OtpError,
    ensure_can_send,
    resend_challenge,
    start_challenge,
    verify_challenge,
)
from utils.helpers import get_json_body

auth_bp = Blueprint("auth", __name__)

# ─── Password policy ──────────────────────────────────────────
# At least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
SPECIAL_CHARS = r"""!@#$%^&*()_\-+={}\[\]:;"'<>,.?/\\|`~"""
PASSWORD_REGEX = re.compile(
    rf"^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[{SPECIAL_CHARS}])[A-Za-z0-9{SPECIAL_CHARS}]{{8,}}$"
)


def validate_password(pw):
    errors = []
    if len(pw) < 8:
        errors.append("at least 8 characters")
    if not re.search(r"[a-z]", pw):
        errors.append("one lowercase letter")
    if not re.search(r"[A-Z]", pw):
        errors.append("one uppercase letter")
    if not re.search(r"[0-9]", pw):  # ASCII digits only, like JS \d
        errors.append("one digit")
    if not re.search(rf"[{SPECIAL_CHARS}]", pw):
        errors.append("one special character")
    return errors


# ─── Password hashing ─────────────────────────────────────────
# bcrypt only uses the first 72 bytes; truncate explicitly (as Node's bcrypt does) so
# hashes created by the old Node backend keep verifying and newer bcrypt doesn't raise.
def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(rounds=10)).decode("utf-8")


def check_password(password, password_hash):
    return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))


# ─── JWT ──────────────────────────────────────────────────────
# TOKEN_EXPIRES_IN uses the same timespan format as jsonwebtoken's expiresIn ("7d", "12h", "90m", ...)
TIMESPAN_REGEX = re.compile(
    r"^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m"
    r"|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$",
    re.IGNORECASE,
)


def parse_timespan(value):
    """Timespan string -> seconds. A bare number means milliseconds, like the `ms` package."""
    match = TIMESPAN_REGEX.match(value)
    if not match:
        raise ValueError(f'"expiresIn" should be a number of seconds or string representing a timespan: {value}')
    amount = float(match.group(1))
    unit = (match.group(2) or "ms").lower()
    if unit.startswith("ms") or unit.startswith("milli"):
        return amount / 1000
    if unit.startswith("s"):
        return amount
    if unit.startswith("m"):
        return amount * 60
    if unit.startswith("h"):
        return amount * 60 * 60
    if unit.startswith("d"):
        return amount * 60 * 60 * 24
    if unit.startswith("w"):
        return amount * 60 * 60 * 24 * 7
    return amount * 60 * 60 * 24 * 365.25  # years


def sign_token(user):
    iat = int(time.time())
    exp = math.floor(iat + parse_timespan(os.getenv("TOKEN_EXPIRES_IN") or "7d"))
    return jwt.encode(
        {"id": user["id"], "email": user["email"], "iat": iat, "exp": exp},
        os.getenv("JWT_SECRET"),
        algorithm="HS256",
    )


def public_user(user):
    return {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}


def otp_error(err):
    payload, status = err.to_response()
    return jsonify(payload), status


# ─── Student Registration (step 1: create unverified account, email a code) ─────
@auth_bp.route("/register", methods=["POST"])
def register():
    body = get_json_body()
    name = body.get("name")
    email = body.get("email")
    password = body.get("password")
    phone = body.get("phone")

    if not name or not isinstance(email, str) or not email or not isinstance(password, str) or not password:
        return jsonify({"error": "name, email, password required"}), 400

    email = email.strip().lower()

    # Email must end with @greenfield.edu
    if not email.endswith("@greenfield.edu"):
        return jsonify({"error": "Email must end with @greenfield.edu"}), 400

    # Password policy
    pw_errors = validate_password(password)
    if pw_errors:
        return jsonify({"error": f"Password must contain: {', '.join(pw_errors)}"}), 400

    existing = db.find("users", email=email)
    if existing and existing.get("emailVerified", True):
        return jsonify({"error": "An account with this email already exists"}), 400

    password_hash = hash_password(password)

    try:
        with db.lock:
            user = db.find("users", email=email)
            if user and user.get("emailVerified", True):
                return jsonify({"error": "An account with this email already exists"}), 400

            if user:
                # Registered before but never verified: whoever owns the inbox can register again
                ensure_can_send(user, PURPOSE_REGISTER)
                user.update({"name": name, "passwordHash": password_hash, "phone": phone or None})
                db.write()
            else:
                user = {
                    "id": nanoid(),
                    "name": name,
                    "email": email,
                    "passwordHash": password_hash,
                    "role": "student",
                    "phone": phone or None,
                    "emailVerified": False,
                }
                db.push("users", user)

        return jsonify(start_challenge(user, PURPOSE_REGISTER))
    except OtpError as err:
        return otp_error(err)


# ─── Login (shared for student & admin; step 1: password, then email a code) ────
@auth_bp.route("/login", methods=["POST"])
def login():
    body = get_json_body()
    email = body.get("email")
    password = body.get("password")
    role = body.get("role")

    if not isinstance(email, str) or not email or not isinstance(password, str) or not password:
        return jsonify({"error": "email, password required"}), 400

    user = db.find("users", email=email.strip().lower())
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    # If a role hint is provided, validate it matches
    if role and user.get("role") != role:
        return jsonify({
            "error": "This account is not an admin account"
            if role == "admin"
            else "This account is not a student account. Use the admin login."
        }), 401

    if not check_password(password, user["passwordHash"]):
        return jsonify({"error": "Invalid credentials"}), 401

    # Accounts that never finished signup get a verification code instead of a sign-in code
    purpose = PURPOSE_LOGIN if user.get("emailVerified", True) else PURPOSE_REGISTER

    try:
        return jsonify(start_challenge(user, purpose))
    except OtpError as err:
        return otp_error(err)


# ─── Step 2: verify the emailed code and issue the JWT ─────────────────────────
@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    body = get_json_body()
    try:
        user = verify_challenge(body.get("challengeId"), body.get("code"))
    except OtpError as err:
        return otp_error(err)

    token = sign_token(user)
    return jsonify({"token": token, "user": public_user(user)})


# ─── Resend a code for an in-progress sign-in / signup ─────────────────────────
@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    body = get_json_body()
    try:
        return jsonify(resend_challenge(body.get("challengeId")))
    except OtpError as err:
        return otp_error(err)
