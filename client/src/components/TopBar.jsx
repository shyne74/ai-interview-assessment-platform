import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
    SunIcon,
    MoonIcon,
    BellIcon,
    MenuIcon,
    CheckCircleIcon,
    SparklesIcon
} from "./icons";

export default function TopBar({ onToggleSidebar }) {
    const location = useLocation();
    const { theme, toggleTheme, isDark } = useTheme();
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, title: "Adaptive Assessment Ready", desc: "Computer Science & Algorithms questions are loaded.", time: "10m ago", read: false },
        { id: 2, title: "System Operational", desc: "All AI evaluator services running with low latency.", time: "1h ago", read: true },
        { id: 3, title: "Practice Feedback", desc: "Your React interview score was recorded successfully.", time: "Yesterday", read: true }
    ]);

    const notifRef = useRef(null);

    // Close notifications on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotificationsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    // Calculate breadcrumb from path
    const getBreadcrumbTitle = () => {
        const path = location.pathname;
        if (path === "/dashboard") return "Dashboard";
        if (path === "/adaptive-exam") return "Adaptive Exam Hub";
        if (path.startsWith("/adaptive-interview")) return "Live Adaptive Interview";
        if (path.startsWith("/interview")) return "Live Interview";
        if (path.startsWith("/results")) return "Interview Results";
        if (path === "/analytics") return "My Analytics";
        if (path === "/history") return "Attempt History";
        if (path === "/profile") return "Profile Settings";
        if (path === "/admin-dashboard") return "Admin Overview";
        if (path === "/aigenerator") return "AI Question Generator";
        if (path === "/questionbank") return "Question Bank";
        if (path === "/codeforces") return "Codeforces Problem Importer";
        if (path === "/candidate-data") return "Candidate Records";
        if (path === "/admin-results") return "Candidate Results";
        if (path === "/admin-analytics") return "Admin Analytics";
        if (path === "/roles") return "Assessment Roles";
        return "Workspace";
    };

    return (
        <header className="app-topbar">
            {/* Left: Mobile Toggle & Breadcrumbs */}
            <div className="d-flex align-items-center gap-2 gap-md-3">
                <button
                    className="btn-icon-ghost d-lg-none"
                    onClick={onToggleSidebar}
                    aria-label="Toggle navigation"
                >
                    <MenuIcon size={20} />
                </button>

                <nav className="breadcrumb-nav d-flex align-items-center gap-2">
                    <span className="breadcrumb-root text-muted">AI Assess</span>
                    <span className="breadcrumb-separator text-muted">/</span>
                    <span className="breadcrumb-current fw-semibold">{getBreadcrumbTitle()}</span>
                </nav>
            </div>

            {/* Right: Status, Notifications & Theme Toggle */}
            <div className="d-flex align-items-center gap-2 gap-sm-3">
                {/* System Status Pill */}
                <div className="system-status-indicator d-none d-sm-flex align-items-center gap-2">
                    <span className="status-dot-pulse" />
                    <span className="status-text">All systems operational</span>
                </div>

                {/* Notifications Dropdown */}
                <div className="position-relative" ref={notifRef}>
                    <button
                        className="topbar-action-btn position-relative"
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        title="Notifications"
                        aria-label="Notifications"
                    >
                        <BellIcon size={18} />
                        {unreadCount > 0 && (
                            <span className="notif-badge-dot" />
                        )}
                    </button>

                    {notificationsOpen && (
                        <div className="notifications-dropdown shadow-lg">
                            <div className="notif-header d-flex justify-content-between align-items-center">
                                <span className="fw-bold">Notifications</span>
                                {unreadCount > 0 && (
                                    <button className="btn-text-action" onClick={markAllRead}>
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                            <div className="notif-list">
                                {notifications.map(n => (
                                    <div key={n.id} className={`notif-item ${!n.read ? "unread" : ""}`}>
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <span className="notif-item-title fw-semibold">{n.title}</span>
                                            <span className="notif-time text-muted">{n.time}</span>
                                        </div>
                                        <p className="notif-desc mb-0">{n.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Light Mode / Dark Mode Toggle */}
                <button
                    className="theme-toggle-btn"
                    onClick={toggleTheme}
                    title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    aria-label="Toggle theme mode"
                >
                    <div className="theme-toggle-track">
                        <div className={`theme-toggle-thumb ${isDark ? "dark" : "light"}`}>
                            {isDark ? (
                                <MoonIcon size={14} className="text-indigo-400" />
                            ) : (
                                <SunIcon size={14} className="text-amber-500" />
                            )}
                        </div>
                    </div>
                </button>
            </div>
        </header>
    );
}
