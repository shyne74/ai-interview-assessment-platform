import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function Profile() {
    const navigate = useNavigate();
    const storedRole = localStorage.getItem("role") || "user";
    const isAdmin = storedRole === "admin";
    const [fullName, setFullName] = useState(() => localStorage.getItem("username") || (isAdmin ? "Lead Examiner Admin" : "Candidate"));
    const [email, setEmail] = useState(() => localStorage.getItem("email") || "candidate@test.com");
    const [preferredRole, setPreferredRole] = useState(() => localStorage.getItem("preferredRole") || "Frontend developer");
    const [savedMessage, setSavedMessage] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const storedName = localStorage.getItem("username");
        const storedEmail = localStorage.getItem("email");
        const storedRole = localStorage.getItem("preferredRole");
        if (storedName) setFullName(storedName);
        if (storedEmail) setEmail(storedEmail);
        if (storedRole) setPreferredRole(storedRole);
    }, []);

    const getInitials = (name, mail) => {
        if (name && name.trim()) {
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
            return parts[0].slice(0, 2).toUpperCase();
        }
        if (mail) return mail.slice(0, 2).toUpperCase();
        return "AM";
    };

    const handleSavePersonal = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put("/auth/profile", { username: fullName });
            localStorage.setItem("username", fullName);
            setSavedMessage("Personal details saved successfully.");
        } catch (err) {
            localStorage.setItem("username", fullName);
            setSavedMessage("Personal details saved locally.");
        } finally {
            setSaving(false);
            setTimeout(() => setSavedMessage(""), 3000);
        }
    };

    const handleSavePreference = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put("/auth/profile", { preferredRole });
            localStorage.setItem("preferredRole", preferredRole);
            setSavedMessage("Practice preference updated.");
        } catch (err) {
            localStorage.setItem("preferredRole", preferredRole);
            setSavedMessage("Practice preference saved locally.");
        } finally {
            setSaving(false);
            setTimeout(() => setSavedMessage(""), 3000);
        }
    };

    const handleSignOut = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Header */}
            <div>
                {isAdmin && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                        <button
                            type="button"
                            onClick={() => navigate("/admin-dashboard")}
                            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "12px", padding: 0, fontWeight: "600" }}
                        >
                            ← Back to Admin Dashboard
                        </button>
                    </div>
                )}
                <div style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#64748b",
                    marginBottom: "6px"
                }}>
                    {isAdmin ? "ADMIN / ACCOUNT SETTINGS" : "10 / ACCOUNT"}
                </div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    {isAdmin ? "Admin account & settings." : "Your profile, kept simple."}
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: "#475569",
                    margin: 0
                }}>
                    {isAdmin ? "Manage administrator identity, credentials, and console preferences." : "Keep your account details and preferred practice focus in one place."}
                </p>
            </div>

            {savedMessage && (
                <div style={{
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600"
                }}>
                    ✓ {savedMessage}
                </div>
            )}

            {/* Split Layout */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr",
                gap: "24px"
            }}>
                {/* Left Column: Personal details & Preferences */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Personal Details Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px"
                    }}>
                        <h2 style={{
                            fontSize: "17px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 20px 0"
                        }}>
                            Personal details
                        </h2>

                        {/* Avatar & Name Header */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            marginBottom: "24px",
                            paddingBottom: "20px",
                            borderBottom: "1px solid #f1f5f9"
                        }}>
                            <div style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                backgroundColor: "#e2e8f0",
                                color: "#334155",
                                display: "flex",
                                alignItems: "center",
                                justifyCenter: "center",
                                justifyContent: "center",
                                fontWeight: "700",
                                fontSize: "16px"
                            }}>
                                {getInitials(fullName, email)}
                            </div>
                            <div>
                                <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                                    {fullName}
                                </div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                    {isAdmin ? "Admin account" : "Candidate account"}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSavePersonal}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Full name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                />
                                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                                    Email changes depend on the existing account verification flow.
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                    type="submit"
                                    style={{
                                        backgroundColor: "#1e3a8a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "10px 18px",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                    }}
                                >
                                    Save changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFullName("Alex Morgan")}
                                    style={{
                                        backgroundColor: "#ffffff",
                                        color: "#334155",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        padding: "10px 18px",
                                        fontSize: "13px",
                                        fontWeight: "500",
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Practice Preferences Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px"
                    }}>
                        <h2 style={{
                            fontSize: "17px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 16px 0"
                        }}>
                            Practice preferences
                        </h2>

                        <form onSubmit={handleSavePreference}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                    Preferred interview role
                                </label>
                                <select
                                    value={preferredRole}
                                    onChange={(e) => setPreferredRole(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        backgroundColor: "#ffffff",
                                        boxSizing: "border-box"
                                    }}
                                >
                                    <option>Frontend developer</option>
                                    <option>Backend developer</option>
                                    <option>Fullstack engineer</option>
                                    <option>Data engineer</option>
                                </select>
                                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                                    Used as the starting point on Home. You can change it for any attempt.
                                </div>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    backgroundColor: "#ffffff",
                                    color: "#0f172a",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    padding: "9px 16px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                Save preference
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Account Menu & Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Account Menu Card */}
                    <div style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "20px"
                    }}>
                        <div style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#64748b",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: "12px"
                        }}>
                            Account menu
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                fontSize: "13px",
                                fontWeight: "600"
                            }}>
                                <span>Profile & preferences</span>
                                <span>✓</span>
                            </div>

                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => navigate("/admin-dashboard")}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "none",
                                        color: "#2563eb",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        textAlign: "left"
                                    }}
                                >
                                    <span>Admin Dashboard</span>
                                    <span>→</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleSignOut}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: "none",
                                    color: "#64748b",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    textAlign: "left"
                                }}
                            >
                                Sign out
                            </button>
                        </div>
                    </div>

                    {/* Account Security & Privacy Notice */}
                    <div style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "20px",
                        fontSize: "12.5px",
                        lineHeight: "1.5",
                        color: "#475569"
                    }}>
                        <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>🛡️</span> Account Security & Privacy
                        </div>
                        <p style={{ margin: "0 0 10px 0" }}>
                            Your assessment history, telemetry logs, and AI evaluation reports are encrypted and tied strictly to your verified candidate profile.
                        </p>
                        <p style={{ margin: 0, fontSize: "11.5px", color: "#64748b" }}>
                            Use the Change Password section to rotate credentials or update your login password.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
