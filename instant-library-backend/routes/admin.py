# routes/admin.py - DynamoDB version
from flask import Blueprint, current_app, jsonify
from nanoid import generate as nanoid

from db import db
from middleware.auth import admin_only, auth_required
from services.books_service import add_book, decrement_copies, delete_book, get_books
from services.notification_service import send_notification

# DynamoDB services
from services.requests_service import clear_requests, get_request_by_id, get_requests, update_request_status
from utils.helpers import get_json_body, now_iso, to_number

admin_bp = Blueprint("admin", __name__)


# 📥 Get all requests (Admin) – enriched with user name & book title
@admin_bp.route("/requests", methods=["GET"])
@auth_required
@admin_only
def all_requests():
    try:
        requests = get_requests()
        books = get_books()
        users = db.get("users")

        # Build lookup maps
        book_map = {b.get("id"): b.get("title") for b in books}
        user_map = {u.get("id"): u.get("name") for u in users}

        enriched = [
            {
                **r,
                "bookTitle": book_map.get(r.get("bookId")) or "Unknown Book",
                "userName": user_map.get(r.get("userId")) or "Unknown User",
            }
            for r in requests
        ]

        return jsonify({"requests": enriched})
    except Exception:
        current_app.logger.exception("Admin fetch requests error")
        return jsonify({"error": "Failed to fetch requests"}), 500


# 🗑️ Clear all requests
@admin_bp.route("/requests/clear", methods=["DELETE"])
@auth_required
@admin_only
def clear_all_requests():
    try:
        clear_requests()
        return jsonify({"message": "Requests log cleared successfully"})
    except Exception:
        current_app.logger.exception("Admin clear requests error")
        return jsonify({"error": "Failed to clear requests"}), 500


# ✅ Approve / reject request
@admin_bp.route("/requests/<request_id>", methods=["PUT"])
@auth_required
@admin_only
def update_request(request_id):
    try:
        body = get_json_body()
        if "status" not in body:
            # Same as the JS version: a missing status fails the update instead of writing NULL
            raise ValueError("status is required")
        status = body["status"]

        # If approving, decrement the book's available copies
        if status == "approved":
            existing = get_request_by_id(request_id)
            if existing and existing.get("bookId"):
                decrement_copies(existing["bookId"])

        update_request_status(request_id, status)

        send_notification(
            "Request Updated",
            f"Request {request_id} status changed to {status}",
        )

        return jsonify({"message": "Request updated", "requestId": request_id, "status": status})
    except Exception:
        current_app.logger.exception("Admin update request error")
        return jsonify({"error": "Failed to update request"}), 500


# ➕ Add book (Admin)
@admin_bp.route("/books", methods=["POST"])
@auth_required
@admin_only
def admin_add_book():
    try:
        body = get_json_body()
        title = body.get("title")
        copies_total = body.get("copiesTotal")

        if not title or not copies_total:
            return jsonify({"error": "title and copiesTotal required"}), 400

        book = {
            "id": nanoid(),
            "title": title,
            "authors": body.get("authors") or [],
            "subjects": body.get("subjects") or [],
            "isbn": body.get("isbn") or None,
            "copiesTotal": to_number(copies_total),
            "copiesAvailable": to_number(copies_total),
            "coverUrl": body.get("coverUrl") or "",
            "ebookKey": body.get("ebookKey") or None,
            "createdAt": now_iso(),
        }

        add_book(book)

        return jsonify({"book": book})
    except Exception:
        current_app.logger.exception("Admin add book error")
        return jsonify({"error": "Failed to add book"}), 500


# 🗑️ Delete book (Admin)
@admin_bp.route("/books/<book_id>", methods=["DELETE"])
@auth_required
@admin_only
def admin_delete_book(book_id):
    try:
        delete_book(book_id)
        return jsonify({"message": "Book deleted", "bookId": book_id})
    except Exception:
        current_app.logger.exception("Admin delete book error")
        return jsonify({"error": "Failed to delete book"}), 500
