// Sidebar – persistent left navigation matching Figma design
import StatusBadge from './StatusBadge';

const navItemBase =
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer select-none';

function NavItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`${navItemBase} w-full text-left ${active
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
        >
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
        </button>
    );
}

export default function Sidebar({ user, activeView, setActiveView, onLogout, mobile }) {
    const isAdmin = user?.role === 'admin';

    const studentNav = [
        { id: 'library', icon: '📚', label: 'Library' },
        { id: 'requests', icon: '📋', label: 'My Requests' },
    ];

    const adminNav = [
        { id: 'manage', icon: '📚', label: 'Manage Books' },
        { id: 'requests', icon: '📋', label: 'Book Requests' },
    ];

    const navItems = isAdmin ? adminNav : studentNav;

    return (
        <aside className={`${mobile ? 'flex' : 'hidden md:flex'} flex-col w-60 flex-shrink-0 bg-white border-r border-zinc-200 h-screen sticky top-0 overflow-y-auto`}>
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-100">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    📚
                </div>
                <div>
                    <p className="text-sm font-bold text-zinc-900 leading-tight">Greenfield Library</p>
                    <p className="text-[10px] text-zinc-400 leading-tight">Greenfield University</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-1 p-3 flex-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-1 mt-1">
                    {isAdmin ? 'Administration' : 'Browse'}
                </p>
                {navItems.map(item => (
                    <NavItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        active={activeView === item.id}
                        onClick={() => setActiveView(item.id)}
                    />
                ))}
            </nav>

            {/* User info + logout */}
            <div className="p-3 border-t border-zinc-100">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 truncate">{user?.name}</p>
                        <StatusBadge status={user?.role}>{user?.role}</StatusBadge>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500
            hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                >
                    <span>↪</span>
                    <span>Sign out</span>
                </button>
            </div>
        </aside>
    );
}
