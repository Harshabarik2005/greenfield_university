# middleware/auth.py - JWT verification and role check
import os
from functools import wraps

import jwt
from flask import g, jsonify, request

from db import db


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(
                token,
                os.getenv("JWT_SECRET"),
                algorithms=["HS256", "HS384", "HS512"],
            )
        except Exception:
            return jsonify({"error": "Invalid token"}), 401

        # attach user object (full user fetched from db)
        user = db.find("users", id=payload.get("id"))
        if not user:
            return jsonify({"error": "User not found"}), 401
        if not user.get("emailVerified", True):
            return jsonify({"error": "Email not verified"}), 401
        g.user = {
            "id": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role"),
            "name": user.get("name"),
        }
        return fn(*args, **kwargs)

    return wrapper


def admin_only(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = g.get("user")
        if user and user.get("role") == "admin":
            return fn(*args, **kwargs)
        return jsonify({"error": "Admin access required"}), 403

    return wrapper
