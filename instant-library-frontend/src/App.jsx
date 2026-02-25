import { useState, useEffect, useCallback } from "react";
import FilterBar from "./components/FilterBar";
import FileUpload from "./components/FileUpload";
import BookCard from "./components/BookCard";
import StatusBadge from "./components/StatusBadge";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import FormInput from "./components/FormInput";
import S3Thumbnail from "./components/S3Thumbnail";

const API = `${import.meta.env.VITE_API_URL}/api`;

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, addToast };
}

function ToastContainer({ toasts }) {
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="font-bold">{icons[t.type]}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return <div className="spinner flex-shrink-0" style={{ width: size, height: size }} />;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  /* Auth */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");

  /* Registration extras */
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loginMode, setLoginMode] = useState("student"); // "student" | "admin" | "register"

  /* Books */
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", author: "", subject: "", available: false });

  /* Requests */
  const [requests, setRequests] = useState([]);

  /* Admin – Add Book */
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [subjects, setSubjects] = useState("");
  const [isbn, setIsbn] = useState("");
  const [copies, setCopies] = useState(1);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [addingBook, setAddingBook] = useState(false);

  /* UI */
  const [activeView, setActiveView] = useState(user?.role === "admin" ? "manage" : "library");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { toasts, addToast } = useToast();

  // ── Restore session on page load ───────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setActiveView(parsed.role === "admin" ? "manage" : "library");
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  useEffect(() => { if (user) { fetchBooks(); fetchRequests(); } }, [user]);

  // Clear form when switching login modes
  function switchMode(mode) {
    setLoginMode(mode);
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPw("");
    setRegName("");
    setRegPhone("");
  }

  // ── Password policy helpers ───────────────────────────────────────────────
  const pwChecks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", ok: /[a-z]/.test(password) },
    { label: "One number (0-9)", ok: /\d/.test(password) },
    { label: "One special character (!@#...)", ok: /[!@#$%^&*()_\-+={}[\]:;"'<>,.?/\\|`~]/.test(password) },
  ];
  const pwAllPass = pwChecks.every(c => c.ok);

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function login(e) {
    e.preventDefault(); setError(""); setAuthLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: loginMode === "admin" ? "admin" : "student" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid credentials"); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setActiveView(data.user.role === "admin" ? "manage" : "library");
      addToast(`Welcome back, ${data.user.name}!`, "success");
    } catch { setError("Could not reach the server."); }
    finally { setAuthLoading(false); }
  }

  async function register(e) {
    e.preventDefault(); setError(""); setAuthLoading(true);
    // Client-side validations
    if (!email.toLowerCase().endsWith("@greenfield.edu")) {
      setError("Email must end with @greenfield.edu"); setAuthLoading(false); return;
    }
    if (!pwAllPass) {
      setError("Password does not meet all requirements"); setAuthLoading(false); return;
    }
    if (password !== confirmPw) {
      setError("Passwords do not match"); setAuthLoading(false); return;
    }
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email, password, phone: regPhone || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setActiveView("library");
      addToast(`Welcome, ${data.user.name}! Your account is ready.`, "success");
    } catch { setError("Could not reach the server."); }
    finally { setAuthLoading(false); }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null); setBooks([]); setRequests([]);
    addToast("Logged out.", "info");
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  async function fetchBooks(overrideFilters) {
    setBooksLoading(true);
    const activeFilters = overrideFilters || filters;
    try {
      const q = new URLSearchParams();
      if (activeFilters.search) q.append("search", activeFilters.search);
      if (activeFilters.author) q.append("author", activeFilters.author);
      if (activeFilters.subject) q.append("subject", activeFilters.subject);
      if (activeFilters.available) q.append("available", "true");
      const res = await fetch(`${API}/books?${q}`);
      const data = await res.json();
      setBooks(data.books || []);
    } catch { addToast("Failed to fetch books.", "error"); }
    finally { setBooksLoading(false); }
  }

  async function fetchRequests() {
    const token = localStorage.getItem("token");
    const url = user?.role === "admin" ? `${API}/admin/requests` : `${API}/requests`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch { addToast("Failed to load requests.", "error"); }
  }

  async function requestBook(bookId) {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/requests/${bookId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      addToast("Book requested!", "success"); fetchRequests();
    } catch { addToast("Failed to submit request.", "error"); }
  }

  async function approveRequest(id) {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/admin/requests/${id}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      addToast("Request approved.", "success"); fetchRequests(); fetchBooks();
    } catch { addToast("Failed to approve.", "error"); }
  }

  async function handleDeleteBook(bookId, bookTitle) {
    if (!confirm(`Delete "${bookTitle}"? This cannot be undone.`)) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/books/${bookId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || `Failed to delete (${res.status})`, "error");
        return;
      }
      addToast(`"${bookTitle}" removed.`, "success");
      fetchBooks();
    } catch { addToast("Failed to delete book — server unreachable.", "error"); }
  }

  async function handleClearRequests() {
    if (!confirm("Are you sure you want to delete ALL requests? This cannot be undone.")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/requests/clear`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      addToast("All requests cleared.", "success");
      fetchRequests();
    } catch { addToast("Failed to clear requests.", "error"); }
  }

  async function addBook(e) {
    e.preventDefault(); setAddingBook(true);
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/admin/books`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          authors: authors.split(",").map(a => a.trim()).filter(Boolean),
          subjects: subjects.split(",").map(s => s.trim()).filter(Boolean),
          isbn,
          copiesTotal: Number(copies),
          coverUrl: coverImageUrl,
          ebookKey: pdfUrl,
        }),
      });
      const savedTitle = title;
      setTitle(""); setAuthors(""); setSubjects(""); setIsbn(""); setCopies(1);
      setCoverImageUrl(""); setPdfUrl("");
      addToast(`"${savedTitle}" added!`, "success"); fetchBooks();
    } catch { addToast("Failed to add book.", "error"); }
    finally { setAddingBook(false); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN / REGISTER PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  if (!user) {
    return (
      <>
        <ToastContainer toasts={toasts} />
        <div className="flex min-h-screen overflow-hidden">

          {/* LEFT BRAND PANEL */}
          <div className="hidden md:flex flex-col flex-1 relative bg-zinc-900 p-12 overflow-hidden justify-between">
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
            />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg">📚</div>
              <span className="text-lg font-bold text-white">Greenfield Library</span>
            </div>
            <div className="relative z-10">
              <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
                Search.<br />Borrow.<br />
                <span className="text-zinc-400">Get Access.</span>
              </h1>
              <p className="text-zinc-500 text-base leading-relaxed max-w-sm mb-10">
                Discover books, manage requests, and access digital resources anytime, anywhere.
              </p>
              <div className="flex gap-10">
                {[{ value: "10,000+", label: "BOOKS AVAILABLE" }, { value: "95%", label: "AVAILABILITY RATE" }].map(s => (
                  <div key={s.label}>
                    <p className="text-2xl font-extrabold text-white">{s.value}</p>
                    <p className="text-[10px] text-zinc-500 font-semibold tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-zinc-700 relative z-10">Powered by Greenfield University</p>
          </div>

          {/* RIGHT FORM PANEL */}
          <div className="flex-1 md:flex-none md:w-[520px] flex items-center justify-center px-6 py-8 bg-zinc-50 overflow-y-auto">
            <div className="w-full max-w-sm">
              {/* Mobile logo */}
              <div className="flex items-center gap-2 mb-6 md:hidden">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-sm">📚</div>
                <span className="text-lg font-bold text-zinc-900">Greenfield Library</span>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-7">
                {/* ── Mode Tabs ── */}
                <div className="flex rounded-xl bg-zinc-100 p-1 mb-6">
                  {[
                    { id: "student", label: "🎓 Student" },
                    { id: "admin", label: "🛡️ Admin" },
                    { id: "register", label: "✨ Register" },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => switchMode(tab.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${loginMode === tab.id
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── STUDENT LOGIN ── */}
                {loginMode === "student" && (
                  <>
                    <h2 className="text-lg font-extrabold text-zinc-900 mb-0.5 tracking-tight">Student Sign In</h2>
                    <p className="text-sm text-zinc-500 mb-5">Login with your @greenfield.edu email</p>
                    <form onSubmit={login} className="flex flex-col gap-3.5">
                      <FormInput label="Email" type="email" placeholder="you@greenfield.edu" value={email}
                        onChange={e => setEmail(e.target.value)} required icon="✉" />
                      <FormInput label="Password" type="password" placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)} required icon="🔒" />
                      {error && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                          <span>⚠</span> {error}
                        </div>
                      )}
                      <button type="submit" disabled={authLoading}
                        className="mt-1 w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-bold
                          hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center justify-center gap-2 transition-colors duration-150">
                        {authLoading ? <Spinner size={18} /> : "Sign In as Student →"}
                      </button>
                    </form>
                    <p className="mt-5 text-center text-xs text-zinc-400">
                      New student?{" "}
                      <button onClick={() => switchMode("register")} className="text-zinc-700 font-semibold hover:underline">
                        Create an account
                      </button>
                    </p>
                  </>
                )}

                {/* ── ADMIN LOGIN ── */}
                {loginMode === "admin" && (
                  <>
                    <h2 className="text-lg font-extrabold text-zinc-900 mb-0.5 tracking-tight">Admin Sign In</h2>
                    <p className="text-sm text-zinc-500 mb-5">Access the library administration panel</p>
                    <form onSubmit={login} className="flex flex-col gap-3.5">
                      <FormInput label="Admin Email" type="email" placeholder="admin@greenfield.edu" value={email}
                        onChange={e => setEmail(e.target.value)} required icon="🛡️" />
                      <FormInput label="Password" type="password" placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)} required icon="🔒" />
                      {error && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                          <span>⚠</span> {error}
                        </div>
                      )}
                      <button type="submit" disabled={authLoading}
                        className="mt-1 w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-bold
                          hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center justify-center gap-2 transition-colors duration-150">
                        {authLoading ? <Spinner size={18} /> : "Sign In as Admin →"}
                      </button>
                    </form>
                    <p className="mt-5 text-center text-xs text-zinc-400">
                      Admin accounts are created by the system administrator.
                    </p>
                  </>
                )}

                {/* ── REGISTER ── */}
                {loginMode === "register" && (
                  <>
                    <h2 className="text-lg font-extrabold text-zinc-900 mb-0.5 tracking-tight">Create Account</h2>
                    <p className="text-sm text-zinc-500 mb-5">Register as a new student</p>
                    <form onSubmit={register} className="flex flex-col gap-3.5">
                      <FormInput label="Full Name *" type="text" placeholder="John Doe" value={regName}
                        onChange={e => setRegName(e.target.value)} required icon="👤" />
                      <FormInput label="Email *" type="email" placeholder="you@greenfield.edu" value={email}
                        onChange={e => setEmail(e.target.value)} required icon="✉" />
                      <FormInput label="Phone (optional)" type="tel" placeholder="9876543210" value={regPhone}
                        onChange={e => setRegPhone(e.target.value)} icon="📞" />
                      <FormInput label="Password *" type="password" placeholder="Min 8 chars, upper, lower, digit, special" value={password}
                        onChange={e => setPassword(e.target.value)} required icon="🔒" />

                      {/* Password policy checklist */}
                      {password.length > 0 && (
                        <div className="flex flex-col gap-1 px-1">
                          {pwChecks.map(c => (
                            <div key={c.label} className={`flex items-center gap-2 text-xs ${c.ok ? "text-green-600" : "text-zinc-400"}`}>
                              <span>{c.ok ? "✓" : "○"}</span>
                              <span>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <FormInput label="Confirm Password *" type="password" placeholder="Re-enter password" value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)} required icon="🔒" />
                      {confirmPw && password !== confirmPw && (
                        <p className="text-xs text-red-500 px-1">Passwords do not match</p>
                      )}

                      {error && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                          <span>⚠</span> {error}
                        </div>
                      )}
                      <button type="submit" disabled={authLoading || !pwAllPass || password !== confirmPw}
                        className="mt-1 w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-bold
                          hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center justify-center gap-2 transition-colors duration-150">
                        {authLoading ? <Spinner size={18} /> : "Create Account →"}
                      </button>
                    </form>
                    <p className="mt-5 text-center text-xs text-zinc-400">
                      Already have an account?{" "}
                      <button onClick={() => switchMode("student")} className="text-zinc-700 font-semibold hover:underline">
                        Sign in
                      </button>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  const pageTitle = {
    library: "Library Collection",
    requests: user.role === "admin" ? "Book Requests" : "My Requests",
    manage: "Manage Books",
  }[activeView] || "Dashboard";

  return (
    <>
      <ToastContainer toasts={toasts} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <Sidebar
              user={user}
              activeView={activeView}
              setActiveView={v => { setActiveView(v); setSidebarOpen(false); }}
              onLogout={logout}
              mobile
            />
          </div>
        </div>
      )}

      <div className="page-shell">
        {/* Desktop sidebar */}
        <Sidebar
          user={user}
          activeView={activeView}
          setActiveView={setActiveView}
          onLogout={logout}
        />

        {/* Main content */}
        <div className="page-content">
          <Navbar
            user={user}
            title={pageTitle}
            onLogout={logout}
            onMenuOpen={() => setSidebarOpen(true)}
          />

          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">

            {/* ─── STUDENT: Library ─── */}
            {user.role === "student" && activeView === "library" && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Available Books</h2>
                  <p className="text-sm text-zinc-500 mt-1">Browse, filter and request books from the library</p>
                </div>

                <FilterBar filters={filters} setFilters={setFilters} onSearch={fetchBooks} isLoading={booksLoading} />

                {booksLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="text-center text-zinc-400">
                      <Spinner size={36} />
                      <p className="text-sm mt-4">Loading books…</p>
                    </div>
                  </div>
                ) : books.length === 0 ? (
                  <div className="empty-state">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-base font-semibold text-zinc-500 mb-1">No books found</p>
                    <p className="text-sm text-zinc-400">Try adjusting your search filters</p>
                  </div>
                ) : (
                  <div className="book-grid">
                    {books.map(book => <BookCard key={book.id} book={book} onRequest={requestBook} />)}
                  </div>
                )}
              </>
            )}

            {/* ─── STUDENT: My Requests ─── */}
            {user.role === "student" && activeView === "requests" && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">My Requests</h2>
                  <p className="text-sm text-zinc-500 mt-1">Track the status of your borrow requests</p>
                </div>

                {requests.length === 0 ? (
                  <div className="empty-state">
                    <div className="text-3xl mb-3">📋</div>
                    <p className="text-sm text-zinc-500">You haven&apos;t requested any books yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-w-2xl">
                    {requests.map(r => (
                      <div key={r.id} className="card flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{r.bookTitle || r.bookId}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Requested {new Date(r.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ─── ADMIN: Manage Books ─── */}
            {user.role === "admin" && activeView === "manage" && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Manage Books</h2>
                  <p className="text-sm text-zinc-500 mt-1">Add new books to the library catalogue</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Add Book Form */}
                  <div className="card p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <span className="text-base">➕</span>
                      <h3 className="text-base font-bold text-zinc-900">Add New Book</h3>
                    </div>

                    <form onSubmit={addBook} className="flex flex-col gap-4">
                      <FormInput
                        label="Book Title *"
                        placeholder="Enter book title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        icon="📖"
                      />
                      <FormInput
                        label="Authors"
                        placeholder="Authors (comma separated)"
                        value={authors}
                        onChange={e => setAuthors(e.target.value)}
                        icon="✍"
                      />
                      <FormInput
                        label="Subjects"
                        placeholder="Subjects (comma separated)"
                        value={subjects}
                        onChange={e => setSubjects(e.target.value)}
                        icon="🏷"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          label="ISBN"
                          placeholder="ISBN"
                          value={isbn}
                          onChange={e => setIsbn(e.target.value)}
                        />
                        <FormInput
                          label="Copies"
                          type="number"
                          placeholder="1"
                          value={copies}
                          min="1"
                          onChange={e => setCopies(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <FileUpload
                          label="Cover Image" accept="image/*"
                          apiBaseUrl={API} token={localStorage.getItem("token")}
                          onUploadComplete={url => setCoverImageUrl(url)}
                          onUploadStateChange={v => setIsUploadingCover(v)}
                        />
                        <FileUpload
                          label="PDF / eBook" accept="application/pdf"
                          apiBaseUrl={API} token={localStorage.getItem("token")}
                          onUploadComplete={url => setPdfUrl(url)}
                          onUploadStateChange={v => setIsUploadingPdf(v)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isUploadingCover || isUploadingPdf || addingBook}
                        className="mt-2 w-full py-3 rounded-xl bg-zinc-900 text-white text-sm font-bold
                          hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center justify-center gap-2 transition-colors duration-150"
                      >
                        {addingBook
                          ? <Spinner size={18} />
                          : (isUploadingCover || isUploadingPdf)
                            ? "Uploading…"
                            : "Add Book"}
                      </button>
                    </form>
                  </div>

                  {/* Book list preview */}
                  <div className="card p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <span className="text-base">📚</span>
                      <h3 className="text-base font-bold text-zinc-900">Catalogue Preview</h3>
                      <span className="ml-auto text-xs font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                        {books.length} {books.length === 1 ? "book" : "books"}
                      </span>
                    </div>

                    {books.length === 0 ? (
                      <div className="empty-state" style={{ padding: "32px 20px" }}>
                        <div className="text-3xl mb-3">📭</div>
                        <p className="text-sm text-zinc-400">No books in catalogue yet</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                        {books.map(book => (
                          <div key={book.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                            <div className="w-10 h-12 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                              <S3Thumbnail s3Url={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 truncate">{book.title}</p>
                              <p className="text-xs text-zinc-500 truncate">{book.authors?.join(", ") || "Unknown"}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StatusBadge status={book.copiesAvailable > 0 ? "available" : "unavailable"}>
                                {book.copiesAvailable > 0 ? `${book.copiesAvailable} left` : "Out"}
                              </StatusBadge>
                              <button
                                onClick={() => handleDeleteBook(book.id, book.title)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
                                title="Delete this book"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ─── ADMIN: Book Requests ─── */}
            {user.role === "admin" && activeView === "requests" && (
              <>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Book Requests</h2>
                    <p className="text-sm text-zinc-500 mt-1">Review and approve student borrow requests</p>
                  </div>
                  {requests.length > 0 && (
                    <button
                      onClick={handleClearRequests}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-semibold
                        hover:bg-red-100 transition-colors duration-150 flex items-center gap-2 max-w-fit"
                    >
                      <span>🗑️</span> Clear Logs
                    </button>
                  )}
                </div>

                {requests.length === 0 ? (
                  <div className="empty-state max-w-lg">
                    <div className="text-4xl mb-3">🎉</div>
                    <p className="text-base font-semibold text-zinc-500 mb-1">All clear!</p>
                    <p className="text-sm text-zinc-400">No pending requests at the moment.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-w-3xl">
                    {requests.map(r => (
                      <div key={r.id} className="card flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{r.bookTitle || r.bookId}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            By: <span className="font-medium text-zinc-700">{r.userName || r.userId}</span>
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {new Date(r.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <StatusBadge status={r.status} />
                          {r.status === "pending" && (
                            <button
                              onClick={() => approveRequest(r.id)}
                              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700
                                hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors duration-150"
                            >
                              ✓ Approve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </main>
        </div>
      </div>
    </>
  );
}
