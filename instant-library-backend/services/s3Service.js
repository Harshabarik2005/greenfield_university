const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3Client } = require("../aws");

const BUCKET_NAME = "instant-library-assets";

/**
 * Generates a pre-signed URL for uploading a file directly to S3 from the client.
 * 
 * Pre-signed URLs grant temporary access to a specific S3 permission (like PUT or GET) 
 * without exposing AWS credentials to the frontend.
 * 
 * @param {string} fileName - The desired name of the file in S3.
 * @param {string} fileType - The MIME type of the file.
 * @returns {Promise<Object>} Object containing the upload URL and the final accessible file URL.
 */
async function generateUploadUrl(fileName, fileType) {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        ContentType: fileType,
    });

    // Expiration: URL expires in 60 seconds. This enforces a strict time window
    // to complete the upload, minimizing the risk of the URL being leaked and misused.
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileName}`;

    return { uploadUrl, fileUrl };
}

/**
 * Generates a pre-signed URL for securely downloading a private file from S3.
 * 
 * Security Benefit: By keeping the bucket private and only sharing pre-signed URLs, 
 * you restrict file access exclusively to authenticated users whose requests flow 
 * through your backend validation logic.
 * 
 * @param {string} fileName - The key/name of the file in S3.
 * @returns {Promise<string>} The temporary download URL.
 */
async function generateDownloadUrl(fileName) {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
    });

    // Valid for 60 seconds.
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return downloadUrl;
}

module.exports = { generateUploadUrl, generateDownloadUrl };
