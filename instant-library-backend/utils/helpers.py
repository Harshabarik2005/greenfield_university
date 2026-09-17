# utils/helpers.py - small shared helpers replacing JS built-ins used by the routes
from datetime import datetime, timezone

from flask import request


def get_json_body():
    """Parsed JSON body as a dict - {} when missing, like Express's req.body with bodyParser.json()."""
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


def now_iso():
    """UTC timestamp formatted like JS new Date().toISOString(), e.g. 2026-01-01T10:00:00.000Z."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def to_number(value):
    """Like JS Number(): "5" -> 5, "2.5" -> 2.5. Raises ValueError/TypeError on non-numeric input."""
    number = float(value)
    return int(number) if number.is_integer() else number
