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
    ZapIcon,
    HomeIcon,
    PlayIcon,
    CodeIcon,
    UsersIcon,
    XIcon
} from "./icons";

export default function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const navigate = useNavigate();

    const role = localStorage.getItem("role") || "user";
    const username = localStorage.getItem("username") || (role === "admin" ? "Admin User" : "Candidate");
    const isAdmin = role === "admin";

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
        navigate("/login");
    };

    const getInitials = (name) => {
        if (!name) return "AI";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const candidateLinks = [
        { path: "/dashboard", label: "Dashboard", icon: <HomeIcon size={18} /> },
        { path: "/adaptive-exam", label: "Exam hub", icon: <ZapIcon size={18} className="text-amber-400" /> },
        { path: "/interview/latest", label: "Live interview", icon: <PlayIcon size={18} />, action: () => navigate("/adaptive-exam") },
        { path: "/analytics", label: "My analytics", icon: <BarChartIcon size={18} /> },
        { path: "/history", label: "History", icon: <ClockIcon size={18} /> },
        { path: "/profile", label: "Profile", icon: <UserIcon size={18} /> }
    ];

    const adminLinks = [
        { path: "/admin-dashboard", label: "Overview", icon: <ShieldIcon size={18} /> },
        { path: "/aigenerator", label: "AI generator", icon: <SparklesIcon size={18} /> },
        { path: "/questionbank", label: "Question Bank", icon: <BookOpenIcon size={18} /> },
        { path: "/codeforces", label: "Codeforces", icon: <CodeIcon size={18} /> },
        { path: "/candidate-data", label: "Candidates", icon: <UsersIcon size={18} /> },
        { path: "/admin-results", label: "Results", icon: <FileTextIcon size={18} /> },
        { path: "/admin-analytics", label: "Analytics", icon: <BarChartIcon size={18} /> },
        { path: "/roles", label: "Roles", icon: <BriefcaseIcon size={18} /> }
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={onClose}
                    aria-label="Close Sidebar"
                />
            )}

            <aside className={`app-sidebar ${isOpen ? "sidebar-mobile-open" : ""}`}>
                {/* Brand / Logo Header */}
                <div className="sidebar-header">
                    <Link
                        to={isAdmin ? "/admin-dashboard" : "/dashboard"}
                        className="sidebar-brand text-decoration-none"
                        onClick={onClose}
                    >
                        <div className="sidebar-logo-icon">
                            <BrainIcon size={20} />
                        </div>
                        <div className="sidebar-brand-text">
                            <span className="brand-title">AI Assess</span>
                            <span className="brand-subtitle">Smart Evaluation</span>
                        </div>
                    </Link>

                    {/* Mobile Close Button */}
                    <button
                        className="btn-icon-ghost d-lg-none"
                        onClick={onClose}
                        title="Close navigation"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Navigation Sections */}
                <div className="sidebar-content">
                    {/* CANDIDATE SECTION */}
                    <div className="nav-section">
                        <div className="nav-section-title">CANDIDATE</div>
                        <div className="nav-list">
                            {candidateLinks.map((item) => {
                                const isActive = location.pathname === item.path || (item.path === "/adaptive-exam" && location.pathname.startsWith("/adaptive-interview"));
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.action ? "#" : item.path}
                                        onClick={(e) => {
                                            if (item.action) {
                                                e.preventDefault();
                                                item.action();
                                            }
                                            if (onClose) onClose();
                                        }}
                                        className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                                        title={item.label}
                                    >
                                        <span className="nav-item-icon">{item.icon}</span>
                                        <span className="nav-item-label">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* ADMINISTRATION SECTION */}
                    <div className="nav-section">
                        <div className="nav-section-title">ADMINISTRATION</div>
                        <div className="nav-list">
                            {adminLinks.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={onClose}
                                        className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                                        title={item.label}
                                    >
                                        <span className="nav-item-icon">{item.icon}</span>
                                        <span className="nav-item-label">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* User Profile Card at Bottom */}
                <div className="sidebar-footer">
                    <div className="sidebar-user-card">
                        <div className="user-avatar" title={username}>
                            {getInitials(username)}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{username}</span>
                            <span className="user-role">{isAdmin ? "Administrator" : "Candidate"}</span>
                        </div>
                        <button
                            className="btn-icon-ghost user-logout-btn"
                            onClick={logout}
                            title="Sign out"
                            aria-label="Sign out"
                        >
                            <LogOutIcon size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
