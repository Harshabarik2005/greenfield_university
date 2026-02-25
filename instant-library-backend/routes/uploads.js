const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const s3Service = require('../services/s3Service');

/**
 * 📝 POST /api/upload-url
 * Endpoint for generating a pre-signed URL to upload files to S3 directly from the browser.
 */
router.post('/upload-url', authMiddleware, async (req, res) => {
    try {
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ error: "fileName and fileType are required." });
        }

        const data = await s3Service.generateUploadUrl(fileName, fileType);
        res.json(data); // Returns { uploadUrl: string, fileUrl: string }

    } catch (err) {
        console.error("Error generating signed upload URL:", err);
        res.status(500).json({ error: "Failed to generate upload URL" });
    }
});

/**
 * 🔒 GET /api/download-url?key=...
 * Endpoint for generating a temporary, secure pre-signed URL to view or download a file from S3.
 */
router.get('/download-url', authMiddleware, async (req, res) => {
    try {
        const { key } = req.query;

        if (!key) {
            return res.status(400).json({ error: "S3 Object Key (file name) is required." });
        }

        const downloadUrl = await s3Service.generateDownloadUrl(key);
        res.json({ downloadUrl });

    } catch (err) {
        console.error("Error generating signed download URL:", err);
        res.status(500).json({ error: "Failed to generate download URL" });
    }
});

module.exports = router;
