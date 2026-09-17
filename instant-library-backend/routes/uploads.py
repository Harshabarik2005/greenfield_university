from flask import Blueprint, current_app, jsonify, request

from middleware.auth import auth_required
from services import s3_service
from utils.helpers import get_json_body

uploads_bp = Blueprint("uploads", __name__)


@uploads_bp.route("/upload-url", methods=["POST"])
@auth_required
def upload_url():
    """
    📝 POST /api/upload-url
    Endpoint for generating a pre-signed URL to upload files to S3 directly from the browser.
    """
    try:
        body = get_json_body()
        file_name = body.get("fileName")
        file_type = body.get("fileType")

        if not file_name or not file_type:
            return jsonify({"error": "fileName and fileType are required."}), 400

        data = s3_service.generate_upload_url(file_name, file_type)
        return jsonify(data)  # Returns { uploadUrl: string, fileUrl: string }

    except Exception:
        current_app.logger.exception("Error generating signed upload URL")
        return jsonify({"error": "Failed to generate upload URL"}), 500


@uploads_bp.route("/download-url", methods=["GET"])
@auth_required
def download_url():
    """
    🔒 GET /api/download-url?key=...
    Endpoint for generating a temporary, secure pre-signed URL to view or download a file from S3.
    """
    try:
        key = request.args.get("key")

        if not key:
            return jsonify({"error": "S3 Object Key (file name) is required."}), 400

        url = s3_service.generate_download_url(key)
        return jsonify({"downloadUrl": url})

    except Exception:
        current_app.logger.exception("Error generating signed download URL")
        return jsonify({"error": "Failed to generate download URL"}), 500
