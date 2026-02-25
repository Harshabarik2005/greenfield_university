// FilterBar – clean light Figma-matched design with category pills + search
export default function FilterBar({ filters, setFilters, onSearch, isLoading }) {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilters(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const clearFilters = () => {
        const emptyFilters = { search: '', author: '', subject: '', available: false };
        setFilters(emptyFilters);
        onSearch(emptyFilters);
    };

    return (
        <div className="card p-5 mb-6">
            {/* Search row */}
            <div className="flex flex-wrap gap-3 mb-4">
                {/* Title search */}
                <div className="flex-[2_1_180px] relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-sm">🔍</span>
                    <input
                        type="text"
                        name="search"
                        placeholder="Search by title..."
                        value={filters.search}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-900
              placeholder:text-zinc-400 outline-none transition-[border-color,box-shadow] duration-150
              focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    />
                </div>

                {/* Author */}
                <div className="flex-[1_1_140px]">
                    <input
                        type="text"
                        name="author"
                        placeholder="Filter by author"
                        value={filters.author}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-900
              placeholder:text-zinc-400 outline-none transition-[border-color,box-shadow] duration-150
              focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    />
                </div>

                {/* Subject */}
                <div className="flex-[1_1_140px]">
                    <input
                        type="text"
                        name="subject"
                        placeholder="Filter by subject"
                        value={filters.subject}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-900
              placeholder:text-zinc-400 outline-none transition-[border-color,box-shadow] duration-150
              focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    />
                </div>
            </div>

            {/* Bottom row: availability + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                {/* Availability toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <div
                        className={`w-9 h-5 rounded-full flex items-center transition-colors duration-200 ${filters.available ? 'bg-zinc-900' : 'bg-zinc-200'
                            }`}
                    >
                        <div
                            className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-0.5 ${filters.available ? 'translate-x-4' : ''
                                }`}
                        />
                        <input
                            type="checkbox"
                            name="available"
                            checked={filters.available}
                            onChange={handleChange}
                            className="sr-only"
                        />
                    </div>
                    <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">
                        Available only
                    </span>
                </label>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                    {isLoading && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1.5 mr-1">
                            <span className="spinner w-3.5 h-3.5 flex-shrink-0" /> Searching…
                        </span>
                    )}
                    <button
                        onClick={clearFilters}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600
              hover:bg-zinc-100 hover:border-zinc-300 disabled:opacity-40 transition-colors duration-150"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => onSearch()}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-semibold
              hover:bg-zinc-700 disabled:opacity-40 transition-colors duration-150"
                    >
                        {isLoading ? 'Searching…' : 'Apply Filters'}
                    </button>
                </div>
            </div>
        </div>
    );
}
