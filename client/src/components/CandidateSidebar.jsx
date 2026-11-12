import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    HomeIcon,
    FileTextIcon,
    BarChartIcon,
    UserIcon,
    ShieldIcon,
    LogOutIcon,
    ChevronDownIcon
} from "./icons";

export default function CandidateSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const path = location.pathname;
    const username = localStorage.getItem("username") || "Alex Morgan";
    const isRealAdmin = localStorage.getItem("role") === "admin";

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        {
            path: "/dashboard",
            label: "Home",
            icon: <HomeIcon size={18} />,
            isActive: path === "/dashboard"
        },
        {
            path: "/practice",
            label: "Practice",
            icon: <FileTextIcon size={18} />,
            isActive: path.startsWith("/practice") || path === "/adaptive-exam" || path.startsWith("/prepare")
        },
        {
            path: "/history",
            label: "My Progress",
            icon: <BarChartIcon size={18} />,
            isActive: path === "/history" || path.startsWith("/results")
        }
    ];

    const switchToAdmin = () => {
        localStorage.setItem("role", "admin");
        navigate("/admin-dashboard");
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <aside className="wf-candidate-sidebar" style={{
            width: "240px",
            minWidth: "240px",
            height: "100vh",
            position: "sticky",
            top: 0,
            backgroundColor: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "24px 16px",
            boxSizing: "border-box",
            zIndex: 40
        }}>
            {/* Top section: Brand & Navigation */}
            <div>
                {/* Brand Logo */}
                <Link
                    to="/dashboard"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        textDecoration: "none",
                        marginBottom: "32px",
                        padding: "0 8px"
                    }}
                >
                    <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "800",
                        fontSize: "15px"
                    }}>
                        A
                    </div>
                    <span style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        color: "#0f172a",
                        letterSpacing: "-0.02em"
                    }}>
                        AI Assess
                    </span>
                </Link>

                {/* Section Title */}
                <div style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "12px",
                    padding: "0 8px"
                }}>
                    Your Workspace
                </div>

                {/* Navigation Links */}
                <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "14px",
                                fontWeight: item.isActive ? "600" : "500",
                                color: item.isActive ? "#2563eb" : "#475569",
                                backgroundColor: item.isActive ? "#eff6ff" : "transparent",
                                transition: "all 0.15s ease"
                            }}
                        >
                            <span style={{ color: item.isActive ? "#2563eb" : "#64748b" }}>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Bottom Section: Tagline & User Profile */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                {/* Micro Tagline */}
                <div style={{ padding: "0 8px", marginBottom: "20px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "3px" }}>
                        A little practice. More clarity.
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
                        Know where you stand. Practise what matters.
                    </div>
                </div>

                {/* User Profile / Account Menu trigger */}
                <div style={{ position: "relative" }} ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setMenuOpen(!menuOpen)}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: menuOpen ? "#f8fafc" : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background 0.15s"
                        }}
                    >
                        <div style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            backgroundColor: "#e2e8f0",
                            color: "#334155",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "12px"
                        }}>
                            AM
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#0f172a",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}>
                                {username}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                                Account & settings ▾
                            </div>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {menuOpen && (
                        <div style={{
                            position: "absolute",
                            bottom: "52px",
                            left: 0,
                            right: 0,
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                            padding: "6px",
                            zIndex: 50
                        }}>
                            <Link
                                to="/profile"
                                onClick={() => setMenuOpen(false)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 10px",
                                    fontSize: "13px",
                                    color: "#334155",
                                    textDecoration: "none",
                                    borderRadius: "6px"
                                }}
                            >
                                <UserIcon size={15} />
                                Profile & Settings
                            </Link>

                            {isRealAdmin && (
                                <button
                                    type="button"
                                    onClick={switchToAdmin}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 10px",
                                        fontSize: "13px",
                                        color: "#0f172a",
                                        background: "#f1f5f9",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        margin: "4px 0",
                                        fontWeight: "600"
                                    }}
                                >
                                    <ShieldIcon size={15} />
                                    Switch to Admin View
                                </button>
                            )}

                            <div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "4px 0" }} />

                            <button
                                type="button"
                                onClick={handleLogout}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 10px",
                                    fontSize: "13px",
                                    color: "#ef4444",
                                    background: "none",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer"
                                }}
                            >
                                <LogOutIcon size={15} />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
