from aws import s3_client

BUCKET_NAME = "instant-library-assets"


def generate_upload_url(file_name, file_type):
    """
    Generates a pre-signed URL for uploading a file directly to S3 from the client.

    Pre-signed URLs grant temporary access to a specific S3 permission (like PUT or GET)
    without exposing AWS credentials to the frontend.

    :param file_name: The desired name of the file in S3.
    :param file_type: The MIME type of the file.
    :returns: Dict containing the upload URL and the final accessible file URL.
    """
    # Expiration: URL expires in 60 seconds. This enforces a strict time window
    # to complete the upload, minimizing the risk of the URL being leaked and misused.
    upload_url = s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": BUCKET_NAME, "Key": file_name, "ContentType": file_type},
        ExpiresIn=60,
    )

    file_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{file_name}"

    return {"uploadUrl": upload_url, "fileUrl": file_url}


def generate_download_url(file_name):
    """
    Generates a pre-signed URL for securely downloading a private file from S3.

    Security Benefit: By keeping the bucket private and only sharing pre-signed URLs,
    you restrict file access exclusively to authenticated users whose requests flow
    through your backend validation logic.

    :param file_name: The key/name of the file in S3.
    :returns: The temporary download URL.
    """
    # Valid for 900 seconds (15 minutes).
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": file_name},
        ExpiresIn=900,
    )
