# routes/requests.py - DynamoDB version
from flask import Blueprint, current_app, g, jsonify
from nanoid import generate as nanoid

from middleware.auth import auth_required
from services.books_service import get_books
from services.notification_service import send_notification

# DynamoDB services
from services.requests_service import add_request, get_requests
from utils.helpers import now_iso

requests_bp = Blueprint("requests", __name__)


# ➕ Create request
@requests_bp.route("/<book_id>", methods=["POST"])
@auth_required
def create_request(book_id):
    try:
        new_request = {
            "id": nanoid(),
            "bookId": book_id,
            "userId": g.user["id"],
            "status": "pending",
            "requestedAt": now_iso(),
        }

        add_request(new_request)

        send_notification(
            "New Book Request",
            f"User {g.user['id']} requested book {book_id}",
        )

        return jsonify({"request": new_request})
    except Exception:
        current_app.logger.exception("Error creating request")
        return jsonify({"error": "Failed to create request"}), 500


# 📌 Get my requests – enriched with book title
@requests_bp.route("/", methods=["GET"])
@auth_required
def my_requests():
    try:
        all_requests = get_requests()
        books = get_books()
        mine = [r for r in all_requests if r.get("userId") == g.user["id"]]

        # Build book title lookup
        book_map = {b.get("id"): b.get("title") for b in books}

        enriched = [
            {**r, "bookTitle": book_map.get(r.get("bookId")) or "Unknown Book"}
            for r in mine
        ]

        return jsonify({"requests": enriched})
    except Exception:
        current_app.logger.exception("Error fetching requests")
        return jsonify({"error": "Failed to fetch requests"}), 500
