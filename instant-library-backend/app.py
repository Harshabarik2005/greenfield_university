# app.py - main entry
import os

from dotenv import load_dotenv

# Load .env before anything reads os.environ (AWS region, JWT secret, ...)
load_dotenv()

from flask import Flask  # noqa: E402
from flask_cors import CORS  # noqa: E402

from routes.admin import admin_bp  # noqa: E402
from routes.auth import auth_bp  # noqa: E402
from routes.books import books_bp  # noqa: E402
from routes.requests import requests_bp  # noqa: E402
from routes.uploads import uploads_bp  # noqa: E402


def create_app():
    app = Flask(__name__)

    # Like Express, treat "/api/books" and "/api/books/" as the same route (no redirect,
    # which would break CORS preflight requests from the frontend)
    app.url_map.strict_slashes = False

    CORS(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(books_bp, url_prefix="/api/books")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(uploads_bp, url_prefix="/api")

    @app.route("/")
    def index():
        return "Instant Library Backend is running"

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT") or 4000)
    print(f"Server listening on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port)
