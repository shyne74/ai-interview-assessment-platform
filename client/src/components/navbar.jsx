import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    BrainIcon,
    SparklesIcon,
    BarChartIcon,
    ClockIcon,
    UserIcon,
    LogOutIcon,
    BookOpenIcon,
    BriefcaseIcon,
    FileTextIcon,
    ShieldIcon,
    LayersIcon,
    ZapIcon
} from "./icons";

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") || "user";
    const username = localStorage.getItem("username") || (role === "admin" ? "Admin" : "Candidate");

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
        navigate("/login");
    };

    if (!token) {
        return null;
    }

    const isAdmin = role === "admin";

    const candidateNavItems = [
        { path: "/dashboard", label: "Dashboard", icon: <LayersIcon size={16} /> },
        { path: "/adaptive-exam", label: "Adaptive Exam", icon: <ZapIcon size={16} className="text-amber-400" /> },
        { path: "/history", label: "History", icon: <ClockIcon size={16} /> },
        { path: "/analytics", label: "Analytics", icon: <BarChartIcon size={16} /> },
        { path: "/profile", label: "Profile", icon: <UserIcon size={16} /> }
    ];

    const adminNavItems = [
        { path: "/admin-dashboard", label: "Overview", icon: <LayersIcon size={16} /> },
        { path: "/adaptive-exam", label: "Adaptive Exam", icon: <ZapIcon size={16} className="text-amber-400" /> },
        { path: "/questionbank", label: "Question Bank", icon: <BookOpenIcon size={16} /> },
        { path: "/codeforces", label: "Codeforces", icon: <BookOpenIcon size={16} /> },
        { path: "/aigenerator", label: "AI Generator", icon: <SparklesIcon size={16} /> },
        { path: "/roles", label: "Roles", icon: <BriefcaseIcon size={16} /> },
        { path: "/candidate-data", label: "Candidates", icon: <UserIcon size={16} /> },
        { path: "/admin-results", label: "Results", icon: <FileTextIcon size={16} /> },
        { path: "/admin-analytics", label: "Analytics", icon: <BarChartIcon size={16} /> }
    ];

    const navItems = isAdmin ? adminNavItems : candidateNavItems;

    return (
        <nav className="navbar-custom">
            <div className="container-fluid px-lg-5 py-2">
                <div className="d-flex align-items-center justify-content-between w-100">
                    {/* Brand */}
                    <Link
                        to={isAdmin ? "/admin-dashboard" : "/dashboard"}
                        className="text-decoration-none d-flex align-items-center gap-2"
                    >
                        <div
                            className="d-flex align-items-center justify-content-center rounded-3 shadow-sm"
                            style={{
                                width: "38px",
                                height: "38px",
                                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                                color: "#fff"
                            }}
                        >
                            <BrainIcon size={22} />
                        </div>
                        <div className="d-flex flex-column">
                            <span className="fw-bold text-white fs-5 lh-1" style={{ letterSpacing: "-0.02em" }}>
                                AI Assess
                            </span>
                            <span
                                className="text-muted"
                                style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em" }}
                            >
                                Interview Platform
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <div className="d-none d-lg-flex align-items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`nav-link-custom ${isActive ? "active" : ""}`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right User Bar */}
                    <div className="d-flex align-items-center gap-3">
                        {/* User Identity Pill */}
                        <div className="d-none d-sm-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-subtle)" }}>
                            <div
                                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                style={{
                                    width: "28px",
                                    height: "28px",
                                    fontSize: "0.8rem",
                                    background: isAdmin ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #6366f1, #06b6d4)"
                                }}
                            >
                                {username.charAt(0).toUpperCase()}
                            </div>
                            <div className="d-flex flex-column text-start">
                                <span className="text-white fw-semibold" style={{ fontSize: "0.825rem", lineHeight: 1.1 }}>
                                    {username}
                                </span>
                                <span className={`badge-tech ${isAdmin ? "badge-pending" : "badge-indigo"}`} style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem" }}>
                                    {isAdmin ? "Admin" : "Candidate"}
                                </span>
                            </div>
                        </div>

                        {/* Switch Role Quick Link for Demo */}
                        {isAdmin ? (
                            <Link
                                to="/dashboard"
                                className="btn btn-sm btn-secondary-dark d-none d-xl-flex"
                                style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                                title="Preview Candidate View"
                            >
                                Candidate View
                            </Link>
                        ) : (
                            <Link
                                to="/admin-dashboard"
                                className="btn btn-sm btn-secondary-dark d-none d-xl-flex"
                                style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                                title="Switch to Admin Dashboard"
                            >
                                Admin View
                            </Link>
                        )}

                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            className="btn btn-sm btn-secondary-dark d-flex align-items-center gap-1"
                            style={{ padding: "0.45rem 0.85rem" }}
                            title="Sign out"
                        >
                            <LogOutIcon size={16} />
                            <span className="d-none d-md-inline">Logout</span>
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="btn btn-secondary-dark d-lg-none p-2"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label="Toggle navigation"
                        >
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                {mobileOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileOpen && (
                    <div className="d-lg-none mt-3 pt-3 border-top border-secondary border-opacity-25 pb-2">
                        <div className="d-flex flex-column gap-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={`nav-link-custom ${isActive ? "active" : ""}`}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                            <div className="mt-2 pt-2 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center px-2">
                                <span className="text-muted small">Logged in as {username} ({role})</span>
                                {isAdmin ? (
                                    <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="btn btn-sm btn-secondary-dark">
                                        Candidate View
                                    </Link>
                                ) : (
                                    <Link to="/admin-dashboard" onClick={() => setMobileOpen(false)} className="btn btn-sm btn-secondary-dark">
                                        Admin View
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;