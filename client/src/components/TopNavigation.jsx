import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";
import {
    Search,
    ChevronDown,
    User,
    Clock,
    Settings,
    Shield,
    LogOut,
    Sparkles,
    Briefcase,
    Layers,
    BookOpen,
    Code,
    FileText,
    Plus,
    X,
    Loader2
} from "lucide-react";

export default function TopNavigation() {
    const location = useLocation();
    const navigate = useNavigate();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);

    // Live search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const userMenuRef = useRef(null);
    const moreMenuRef = useRef(null);
    const searchRef = useRef(null);
    const searchInputRef = useRef(null);

    const path = location.pathname;
    const storedRole = localStorage.getItem("role") || "user";
    const isRealAdmin = storedRole === "admin";

    const isAdminPath = (
        path.startsWith("/admin") ||
        path === "/questionbank" ||
        path === "/roles" ||
        path === "/candidate-data" ||
        path === "/codeforces" ||
        path.startsWith("/aigenerator") ||
        (isRealAdmin && (path.startsWith("/results/") || path === "/profile" || path === "/settings"))
    );

    // Strictly enforce admin mode only if the logged-in user is genuinely an admin
    const isAdminMode = isRealAdmin && isAdminPath;

    // Close menus and search on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
                setMoreMenuOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced search query
    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length < 2) {
            setSearchResults(null);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        setSearchOpen(true);

        const timer = setTimeout(async () => {
            try {
                const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
                setSearchResults(res.data);
            } catch (err) {
                console.warn("Search error:", err);
                setSearchResults({ roles: [], topics: [], codingProblems: [], pastAssessments: [] });
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Ctrl+K / Cmd+K listener to focus search input
    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const rawUsername = localStorage.getItem("username") || (isAdminMode ? "Admin" : "Alex Morgan");
    const username = rawUsername.replace(/^\[+|\]+$/g, "").trim();

    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };
    const userInitials = getInitials(username);

    const toggleRole = () => {
        if (!isRealAdmin) return;
        if (isAdminMode) {
            setUserMenuOpen(false);
            navigate("/dashboard");
        } else {
            setUserMenuOpen(false);
            navigate("/admin-dashboard");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    const handleSelectSearchResult = (url) => {
        setSearchOpen(false);
        setSearchQuery("");
        navigate(url);
    };

    const hasSearchResults = searchResults && (
        (searchResults.roles && searchResults.roles.length > 0) ||
        (searchResults.skills && searchResults.skills.length > 0) ||
        (searchResults.topics && searchResults.topics.length > 0) ||
        (searchResults.codingProblems && searchResults.codingProblems.length > 0) ||
        (searchResults.pastAssessments && searchResults.pastAssessments.length > 0)
    );

    return (
        <header className="wf-topbar">
            <div className="wf-topbar-inner">
                {/* Left: Brand + Role Badge + Nav Links */}
                <div className="wf-nav-left">
                    <Link
                        to={isRealAdmin ? "/admin-dashboard" : "/dashboard"}
                        className="wf-brand-link"
                    >
                        <span className="wf-brand-title">AI Assess</span>
                    </Link>

                    {isAdminMode && (
                        <span className="wf-admin-badge">ADMIN</span>
                    )}

                    <nav className="wf-nav-links">
                        {isAdminMode ? (
                            <>
                                <Link
                                    to="/admin-dashboard"
                                    className={`wf-nav-item ${path === "/admin-dashboard" || path === "/admin" ? "active" : ""}`}
                                >
                                    Overview
                                </Link>
                                <Link
                                    to="/questionbank"
                                    className={`wf-nav-item ${path === "/questionbank" ? "active" : ""}`}
                                >
                                    Question bank
                                </Link>
                                <Link
                                    to="/admin/ai-tools"
                                    className={`wf-nav-item ${path.startsWith("/admin/ai-tools") || path.startsWith("/aigenerator") ? "active" : ""}`}
                                >
                                    AI tools
                                </Link>
                                <Link
                                    to="/roles"
                                    className={`wf-nav-item ${path === "/roles" ? "active" : ""}`}
                                >
                                    Roles & taxonomy
                                </Link>
                                <Link
                                    to="/candidate-data"
                                    className={`wf-nav-item ${path === "/candidate-data" || path === "/admin/candidates" ? "active" : ""}`}
                                >
                                    Candidates
                                </Link>
                                <Link
                                    to="/admin/batches"
                                    className={`wf-nav-item ${path.startsWith("/admin/batches") ? "active" : ""}`}
                                >
                                    Exam batches
                                </Link>

                                {/* More Dropdown */}
                                <div className="position-relative" ref={moreMenuRef}>
                                    <button
                                        type="button"
                                        className={`wf-nav-item wf-dropdown-toggle ${moreMenuOpen ? "active" : ""}`}
                                        onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                                    >
                                        More ▾
                                    </button>
                                    {moreMenuOpen && (
                                        <div className="wf-menu-dropdown">
                                            <Link
                                                to="/admin/batches/new"
                                                className="wf-menu-item"
                                                onClick={() => setMoreMenuOpen(false)}
                                            >
                                                + New Exam Batch
                                            </Link>
                                            <Link
                                                to="/admin/candidates/add"
                                                className="wf-menu-item"
                                                onClick={() => setMoreMenuOpen(false)}
                                            >
                                                Register candidates
                                            </Link>
                                            <Link
                                                to="/admin-analytics"
                                                className="wf-menu-item"
                                                onClick={() => setMoreMenuOpen(false)}
                                            >
                                                System Analytics
                                            </Link>
                                            <Link
                                                to="/admin-results"
                                                className="wf-menu-item"
                                                onClick={() => setMoreMenuOpen(false)}
                                            >
                                                All Exam Results
                                            </Link>
                                            <Link
                                                to="/codeforces"
                                                className="wf-menu-item"
                                                onClick={() => setMoreMenuOpen(false)}
                                            >
                                                Codeforces Importer
                                            </Link>
                                            <Link
                                                to="/settings"
                                                className="wf-menu-item"
                                                onClick={() => setMoreMenuOpen(false)}
                                            >
                                                Settings
                                            </Link>
                                            <button
                                                type="button"
                                                className="wf-menu-item"
                                                style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}
                                                onClick={() => {
                                                    setMoreMenuOpen(false);
                                                    localStorage.clear();
                                                    navigate("/login");
                                                }}
                                            >
                                                Log out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/dashboard"
                                    className={`wf-nav-item ${path === "/dashboard" ? "active" : ""}`}
                                >
                                    Home
                                </Link>
                                <Link
                                    to="/practice"
                                    className={`wf-nav-item ${path.startsWith("/practice") || path === "/adaptive-exam" || path === "/adaptive" ? "active" : ""}`}
                                >
                                    Practice
                                </Link>
                                <Link
                                    to="/prepare"
                                    className={`wf-nav-item ${path.startsWith("/prepare") ? "active" : ""}`}
                                >
                                    Prepare with AI
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                {/* Right: Search Box + User Profile Menu */}
                <div className="wf-nav-right">
                    {/* Live Search Input Box */}
                    <div className="wf-search-box position-relative" ref={searchRef}>
                        <Search size={14} style={{ color: "#64748b", flexShrink: 0 }} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search roles, topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => { if (searchQuery.trim().length >= 2) setSearchOpen(true); }}
                            className="wf-search-input"
                        />
                        <span style={{
                            fontSize: "10.5px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            backgroundColor: "#f1f5f9",
                            color: "#64748b",
                            border: "1px solid #e2e8f0",
                            fontWeight: "500",
                            userSelect: "none",
                            lineHeight: "1.4",
                            flexShrink: 0
                        }}>
                            Ctrl K
                        </span>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(""); setSearchResults(null); setSearchOpen(false); }}
                                style={{
                                    border: "none",
                                    background: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    padding: "0 4px",
                                    display: "flex",
                                    alignItems: "center"
                                }}
                            >
                                <X size={13} />
                            </button>
                        )}

                        {/* Search Dropdown Results Modal */}
                        {searchOpen && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                minWidth: "340px",
                                marginTop: "6px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                                maxHeight: "420px",
                                overflowY: "auto",
                                zIndex: 60,
                                padding: "8px 0"
                            }}>
                                {searchLoading ? (
                                    <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                        <Loader2 size={16} className="animate-spin" style={{ color: "#16a34a" }} />
                                        <span>Searching platform resources...</span>
                                    </div>
                                ) : !hasSearchResults ? (
                                    <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                        No matching roles, skills, or coding problems found for <strong>"{searchQuery}"</strong>.
                                    </div>
                                ) : (
                                    <div>
                                        {/* 1. Roles & Domains */}
                                        {searchResults.roles && searchResults.roles.length > 0 && (
                                            <div>
                                                <div style={{ padding: "6px 14px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <Briefcase size={12} />
                                                    <span>Engineering Domains & Roles</span>
                                                </div>
                                                {searchResults.roles.map((r, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleSelectSearchResult(r.url)}
                                                        style={{ padding: "8px 14px", cursor: "pointer", fontSize: "13px", color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0fdf4"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: "600", color: "#0f172a" }}>{r.title}</div>
                                                            {r.description && <div style={{ fontSize: "11px", color: "#64748b" }}>{r.description}</div>}
                                                        </div>
                                                        <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>Choose Domain →</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 2. Technical Skills & Technologies */}
                                        {searchResults.skills && searchResults.skills.length > 0 && (
                                            <div>
                                                <div style={{ padding: "6px 14px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <Layers size={12} />
                                                    <span>Skills & Technologies</span>
                                                </div>
                                                {searchResults.skills.map((s, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleSelectSearchResult(s.url)}
                                                        style={{ padding: "8px 14px", cursor: "pointer", fontSize: "13px", color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0fdf4"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: "600", color: "#0f172a" }}>{s.skill}</div>
                                                            <div style={{ fontSize: "11px", color: "#64748b" }}>Domain: {s.role}</div>
                                                        </div>
                                                        <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>Practice Skill →</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 3. Topics & Concepts */}
                                        {searchResults.topics && searchResults.topics.length > 0 && (
                                            <div>
                                                <div style={{ padding: "6px 14px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <BookOpen size={12} />
                                                    <span>Topics & Concepts</span>
                                                </div>
                                                {searchResults.topics.map((t, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleSelectSearchResult(t.url)}
                                                        style={{ padding: "8px 14px", cursor: "pointer", fontSize: "13px", color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0fdf4"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: "600", color: "#0f172a" }}>{t.topic}</div>
                                                            <div style={{ fontSize: "11px", color: "#64748b" }}>Domain: {t.role}</div>
                                                        </div>
                                                        <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>Target Topic →</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 4. Coding Problems */}
                                        {searchResults.codingProblems && searchResults.codingProblems.length > 0 && (
                                            <div>
                                                <div style={{ padding: "6px 14px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <Code size={12} />
                                                    <span>Coding Problems</span>
                                                </div>
                                                {searchResults.codingProblems.map((cp, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleSelectSearchResult(cp.url)}
                                                        style={{ padding: "8px 14px", cursor: "pointer", fontSize: "13px", color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0fdf4"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: "600", fontSize: "12.5px" }}>{cp.title}</div>
                                                            <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                                                                 Difficulty: {cp.difficulty} · {(cp.tags || []).slice(0, 2).join(", ")}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "500" }}>Challenge →</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* 5. Past Assessments */}
                                        {searchResults.pastAssessments && searchResults.pastAssessments.length > 0 && (
                                            <div>
                                                <div style={{ padding: "6px 14px", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <FileText size={12} />
                                                    <span>Past Assessments</span>
                                                </div>
                                                {searchResults.pastAssessments.map((pa, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => handleSelectSearchResult(pa.url)}
                                                        style={{ padding: "8px 14px", cursor: "pointer", fontSize: "13px", color: "#0f172a", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                    >
                                                        <div>
                                                            <div style={{ fontWeight: "600" }}>{pa.title}</div>
                                                            <div style={{ fontSize: "11px", color: "#64748b" }}>{pa.subtitle}</div>
                                                        </div>
                                                        <span style={{ fontSize: "11px", color: "#475569", fontWeight: "500" }}>View Result →</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User Profile Dropdown Button */}
                    <div className="position-relative" ref={userMenuRef}>
                        <button
                            type="button"
                            className="wf-user-button"
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            aria-expanded={userMenuOpen}
                        >
                            <div style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                backgroundColor: "#ecfdf5",
                                color: "#16a34a",
                                border: "1px solid #bbf7d0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: "600",
                                flexShrink: 0
                            }}>
                                {userInitials}
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: "500", color: "#1e293b" }}>{username}</span>
                            <ChevronDown
                                size={14}
                                style={{
                                    color: "#64748b",
                                    transition: "transform 0.2s ease",
                                    transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)"
                                }}
                            />
                        </button>

                        {userMenuOpen && (
                            <div className="wf-menu-dropdown wf-menu-right">
                                <div className="wf-menu-header">
                                    <div className="fw-semibold text-dark">{username}</div>
                                    <div className="text-muted small">
                                        {isAdminMode ? "Platform Administrator" : "Active Candidate"}
                                    </div>
                                </div>

                                <div className="wf-menu-divider" />

                                {!isAdminMode && (
                                    <>
                                        <Link
                                            to="/profile"
                                            className="wf-menu-item"
                                            onClick={() => setUserMenuOpen(false)}
                                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                        >
                                            <User size={14} style={{ color: "#64748b" }} />
                                            <span>Profile & Settings</span>
                                        </Link>
                                        <Link
                                            to="/history"
                                            className="wf-menu-item"
                                            onClick={() => setUserMenuOpen(false)}
                                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                        >
                                            <Clock size={14} style={{ color: "#64748b" }} />
                                            <span>My progress & history</span>
                                        </Link>
                                    </>
                                )}

                                {isAdminMode && (
                                    <>
                                        <Link
                                            to="/admin/candidates/add"
                                            className="wf-menu-item"
                                            onClick={() => setUserMenuOpen(false)}
                                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                        >
                                            <Plus size={14} style={{ color: "#64748b" }} />
                                            <span>Add candidates</span>
                                        </Link>
                                        <Link
                                            to="/profile"
                                            className="wf-menu-item"
                                            onClick={() => setUserMenuOpen(false)}
                                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                        >
                                            <User size={14} style={{ color: "#64748b" }} />
                                            <span>Admin Profile & Settings</span>
                                        </Link>
                                        <div className="wf-menu-divider" />
                                        <button
                                            type="button"
                                            className="wf-menu-item text-primary fw-medium text-start w-100 border-0 bg-transparent"
                                            onClick={toggleRole}
                                        >
                                            Switch to Candidate Portal →
                                        </button>
                                    </>
                                )}

                                {/* If real admin in candidate view, allow switching to admin */}
                                {!isAdminMode && isRealAdmin && (
                                    <>
                                        <div className="wf-menu-divider" />
                                        <button
                                            type="button"
                                            className="wf-menu-item text-primary fw-medium text-start w-100 border-0 bg-transparent"
                                            onClick={toggleRole}
                                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                        >
                                            <Shield size={14} style={{ color: "#16a34a" }} />
                                            <span>Switch to Admin Console →</span>
                                        </button>
                                    </>
                                )}

                                <div className="wf-menu-divider" />

                                <button
                                    type="button"
                                    className="wf-menu-item text-danger text-start w-100 border-0 bg-transparent"
                                    onClick={handleLogout}
                                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                                >
                                    <LogOut size={14} style={{ color: "#dc2626" }} />
                                    <span>Log out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
