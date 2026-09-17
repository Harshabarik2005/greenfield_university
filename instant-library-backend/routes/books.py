# routes/books.py - DynamoDB version
from flask import Blueprint, current_app, jsonify, request
from nanoid import generate as nanoid

from middleware.auth import auth_required

# ✅ Import DynamoDB service
from services.books_service import add_book, get_books
from utils.helpers import get_json_body, now_iso, to_number

books_bp = Blueprint("books", __name__)


# 📚 GET all books
@books_bp.route("/", methods=["GET"])
def list_books():
    try:
        books = get_books({
            "search": request.args.get("search"),
            "author": request.args.get("author"),
            "subject": request.args.get("subject"),
            "available": request.args.get("available"),
        })
        return jsonify({"books": books})
    except Exception:
        current_app.logger.exception("Error fetching books")
        return jsonify({"error": "Failed to fetch books"}), 500


# 📖 GET single book by ID
@books_bp.route("/<book_id>", methods=["GET"])
def get_book(book_id):
    try:
        books = get_books()
        book = next((b for b in books if b.get("id") == book_id), None)

        if not book:
            return jsonify({"error": "Book not found"}), 404

        return jsonify({"book": book})
    except Exception:
        current_app.logger.exception("Error fetching book")
        return jsonify({"error": "Failed to fetch book"}), 500


# ➕ ADD new book (authenticated)
@books_bp.route("/", methods=["POST"])
@auth_required
def create_book():
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

            # S3 Integrations
            # If the client provides a pre-signed upload URL resolution (coverUrl) or the raw object key (ebookKey),
            # we attach it directly. We fallback to empty strings or None to guarantee older frontends that simply
            # omit these new S3 fields don't accidentally wipe existing DB structures or cause runtime crashes.
            "coverUrl": body.get("coverUrl") or "",
            "ebookKey": body.get("ebookKey") or None,

            "createdAt": now_iso(),
        }

        add_book(book)

        return jsonify({"book": book})
    except Exception:
        current_app.logger.exception("Error adding book")
        return jsonify({"error": "Failed to add book"}), 500
