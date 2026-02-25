// usePresignedUrl – hook to fetch a presigned download URL for private S3 objects
import { useState, useEffect } from 'react';

const API = `${import.meta.env.VITE_API_URL}/api`;

/**
 * Given an S3 URL or key, extract just the object key portion.
 */
function extractS3Key(urlOrKey) {
    if (!urlOrKey) return null;
    try {
        const url = new URL(urlOrKey);
        return decodeURIComponent(url.pathname.replace(/^\//, ''));
    } catch {
        return urlOrKey;
    }
}

/**
 * React hook that returns a presigned URL for a given S3 key/URL.
 * Returns null while loading or if the key is empty.
 */
export default function usePresignedUrl(s3UrlOrKey) {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const key = extractS3Key(s3UrlOrKey);
        if (!key) { setUrl(null); return; }

        const token = localStorage.getItem('token');
        fetch(`${API}/download-url?key=${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (!cancelled && data?.downloadUrl) setUrl(data.downloadUrl); })
            .catch(() => { });

        return () => { cancelled = true; };
    }, [s3UrlOrKey]);

    return url;
}

export { extractS3Key };
