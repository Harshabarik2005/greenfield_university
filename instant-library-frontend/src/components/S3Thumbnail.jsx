// S3Thumbnail – tiny image component that fetches a presigned URL for private S3 objects
import usePresignedUrl from '../hooks/usePresignedUrl';

export default function S3Thumbnail({ s3Url, alt = '', className = '' }) {
    const src = usePresignedUrl(s3Url);

    if (src) {
        return <img src={src} alt={alt} className={className} />;
    }

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <span className="text-lg opacity-30">📕</span>
        </div>
    );
}
