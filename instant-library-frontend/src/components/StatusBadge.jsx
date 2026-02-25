// StatusBadge – reusable pill badge matching Figma design
export default function StatusBadge({ status, children }) {
    const s = (status || '').toLowerCase();

    const variants = {
        approved: 'bg-green-100 text-green-700 border border-green-200',
        pending: 'bg-orange-100 text-orange-700 border border-orange-200',
        rejected: 'bg-red-100 text-red-600 border border-red-200',
        available: 'bg-green-100 text-green-700 border border-green-200',
        unavailable: 'bg-zinc-100 text-zinc-500 border border-zinc-200',
        admin: 'bg-violet-100 text-violet-700 border border-violet-200',
        student: 'bg-blue-100 text-blue-700 border border-blue-200',
        owned: 'bg-green-100 text-green-700 border border-green-200',
        wishlist: 'bg-orange-100 text-orange-700 border border-orange-200',
    };

    const icons = {
        approved: '✓',
        pending: '⏳',
        rejected: '✕',
    };

    const cls = variants[s] || 'bg-zinc-100 text-zinc-600 border border-zinc-200';
    const icon = icons[s];

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${cls}`}>
            {icon && <span>{icon}</span>}
            {children || status}
        </span>
    );
}
