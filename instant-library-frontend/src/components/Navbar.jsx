// Navbar – top bar for dashboard pages
export default function Navbar({ user, title, onLogout, onMenuOpen }) {
    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-zinc-200 px-5 h-14 flex items-center justify-between gap-4">
            {/* Mobile menu button */}
            <button
                className="md:hidden p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors"
                onClick={onMenuOpen}
                aria-label="Open menu"
            >
                <span className="text-lg">☰</span>
            </button>

            {/* Page title */}
            <h1 className="text-base font-bold text-zinc-900 truncate flex-1 md:flex-none">
                {title}
            </h1>

            {/* Right actions */}
            <div className="flex items-center gap-2">
                {/* Mobile logout */}
                <button
                    onClick={onLogout}
                    className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200
            text-xs font-semibold text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200
            transition-colors duration-150"
                >
                    Sign out
                </button>

                {/* Desktop user pill */}
                <div className="hidden md:flex items-center gap-2 pl-3 border-l border-zinc-200">
                    <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-zinc-700 hidden lg:block">
                        {user?.name}
                    </span>
                </div>
            </div>
        </header>
    );
}
