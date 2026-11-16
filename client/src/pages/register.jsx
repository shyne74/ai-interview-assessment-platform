import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sparkles, ShieldCheck, Target, Lock, Mail, User, CheckCircle2 } from "lucide-react";
import api from "../services/api";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/register", {
                username: name.trim(),
                email: email.trim(),
                password: password.trim(),
                role
            });

            localStorage.setItem("token", response.data?.token || "demo-token");
            localStorage.setItem("role", role);
            localStorage.setItem("username", name || "Candidate");
            localStorage.setItem("email", email);

            if (role === "admin") {
                navigate("/admin-dashboard");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            // Fallback for prototype testing
            localStorage.setItem("token", "demo-token");
            localStorage.setItem("role", role);
            localStorage.setItem("username", name || "Candidate");
            localStorage.setItem("email", email);
            if (role === "admin") {
                navigate("/admin-dashboard");
            } else {
                navigate("/dashboard");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            backgroundColor: "#f8fafc",
            backgroundImage: "radial-gradient(circle at 0% 0%, rgba(224, 231, 255, 0.5) 0%, rgba(248, 250, 252, 0) 50%)"
        }}>
            {/* Left Hero Pane */}
            <div
                style={{
                    flex: "1.1",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "60px 80px",
                    backgroundColor: "#ffffff",
                    borderRight: "1px solid #e2e8f0",
                    boxShadow: "4px 0 24px rgba(15, 23, 42, 0.02)"
                }}
            >
                <div>
                    {/* Brand */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                        <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "#1e3a8a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff"
                        }}>
                            <Sparkles size={18} />
                        </div>
                        <span style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.03em" }}>
                            AI Assess
                        </span>
                        <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            backgroundColor: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #bfdbfe",
                            padding: "2px 8px",
                            borderRadius: "12px"
                        }}>
                            v2.2
                        </span>
                    </div>

                    <p style={{ fontSize: "15px", color: "#64748b", margin: "0 0 48px 0", lineHeight: "1.5" }}>
                        Create an account to begin realistic technical practice or evaluate engineering talent.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "460px" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "14px",
                            padding: "16px 18px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px"
                        }}>
                            <CheckCircle2 size={18} style={{ color: "#16a34a", marginTop: "2px", flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    Role-Calibrated Screenings
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                    Comprehensive tracks for Frontend, Backend, Full Stack, Software Engineer, and DevOps.
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "14px",
                            padding: "16px 18px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px"
                        }}>
                            <CheckCircle2 size={18} style={{ color: "#2563eb", marginTop: "2px", flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    Interactive Coding Sandbox
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                    Split-screen code editor with multi-language execution, test cases, and real-time outputs.
                                </div>
                            </div>
                        </div>

                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "14px",
                            padding: "16px 18px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px"
                        }}>
                            <CheckCircle2 size={18} style={{ color: "#7c3aed", marginTop: "2px", flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    Historical Skill Insights
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                    Identify weak points with automated targeted practice recommendations after every attempt.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: "12.5px", color: "#94a3b8" }}>
                    © 2026 AI Assess Inc. All rights reserved.
                </div>
            </div>

            {/* Right Form Card */}
            <div
                style={{
                    flex: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px"
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "420px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "16px",
                        padding: "40px",
                        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)"
                    }}
                >
                    <div style={{ marginBottom: "28px" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.02em", margin: "0 0 6px 0" }}>
                            Create your account
                        </h2>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                            Get started with AI-driven interview assessments.
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            padding: "11px 14px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            color: "#b91c1c",
                            fontSize: "13px",
                            marginBottom: "20px"
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister}>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                Full Name
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="text"
                                    placeholder="Alex Morgan"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px 10px 38px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        fontSize: "13.5px",
                                        color: "#0f172a",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        boxSizing: "border-box"
                                    }}
                                />
                                <User size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                Email Address
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="email"
                                    placeholder="alex@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px 10px 38px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        fontSize: "13.5px",
                                        color: "#0f172a",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        boxSizing: "border-box"
                                    }}
                                />
                                <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: "18px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                Password
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="password"
                                    placeholder="Create a strong password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px 10px 38px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        fontSize: "13.5px",
                                        color: "#0f172a",
                                        backgroundColor: "#ffffff",
                                        outline: "none",
                                        boxSizing: "border-box"
                                    }}
                                />
                                <Lock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                Primary Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    fontSize: "13.5px",
                                    color: "#0f172a",
                                    backgroundColor: "#ffffff",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                            >
                                <option value="user">Candidate / Student</option>
                                <option value="admin">Interviewer / Examiner</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "11px",
                                backgroundColor: loading ? "#94a3b8" : "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: loading ? "not-allowed" : "pointer",
                                boxShadow: "0 2px 4px rgba(30, 58, 138, 0.15)",
                                transition: "background-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#1d4ed8"; }}
                            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#1e3a8a"; }}
                        >
                            {loading ? "Creating account..." : "Complete Registration →"}
                        </button>
                    </form>

                    <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#64748b" }}>
                        Already have an account?{" "}
                        <Link to="/login" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
