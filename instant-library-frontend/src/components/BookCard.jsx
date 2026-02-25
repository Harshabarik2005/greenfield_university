// BookCard – standalone card component matching the Figma library design
// Uses presigned URLs for cover images and PDF downloads from private S3
import StatusBadge from './StatusBadge';
import usePresignedUrl, { extractS3Key } from '../hooks/usePresignedUrl';

const API = `${import.meta.env.VITE_API_URL}/api`;

export default function BookCard({ book, onRequest }) {
    const available = book.copiesAvailable > 0;
    const coverSrc = usePresignedUrl(book.coverUrl);

    // Handler to open PDF via presigned URL
    const handleOpenPdf = async (e) => {
        e.preventDefault();
        const key = extractS3Key(book.ebookKey);
        if (!key) return;
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API}/download-url?key=${encodeURIComponent(key)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.downloadUrl) window.open(data.downloadUrl, '_blank');
        } catch { /* silently fail */ }
    };

    return (
        <div className="group bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col w-full">
            {/* Cover image */}
            <div className="relative h-48 bg-zinc-100 overflow-hidden flex-shrink-0">
                {coverSrc ? (
                    <img
                        src={coverSrc}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl opacity-20">📕</span>
                    </div>
                )}
                {/* Availability badge */}
                <div className="absolute top-2 right-2">
                    <StatusBadge status={available ? 'available' : 'unavailable'}>
                        {available ? `${book.copiesAvailable} left` : 'Unavailable'}
                    </StatusBadge>
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 p-3.5 gap-1.5">
                <h4 className="text-sm font-semibold text-zinc-900 leading-snug line-clamp-2">
                    {book.title}
                </h4>
                <p className="text-xs text-zinc-500">
                    by {book.authors?.join(', ') || 'Unknown'}
                </p>

                {/* Category badge */}
                {book.subjects?.length > 0 && (
                    <span className="inline-flex self-start px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-medium border border-zinc-200">
                        {book.subjects[0]}
                    </span>
                )}

                {/* Meta info */}
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-auto pt-2 border-t border-zinc-100">
                    <span>ISBN: {book.isbn || 'N/A'}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-1">
                    <button
                        onClick={() => onRequest(book.id)}
                        disabled={!available}
                        className="flex-1 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold
              hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-150"
                    >
                        Request
                    </button>
                    {book.ebookKey && (
                        <button
                            onClick={handleOpenPdf}
                            className="flex-1 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 text-xs font-semibold text-center
                hover:bg-zinc-50 transition-colors duration-150 cursor-pointer"
                        >
                            📄 PDF
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
