import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Sparkles, ShieldCheck, Target, ArrowRight, Lock, Mail, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    // Prefill email if provided in query string (e.g. from invitation email)
    useEffect(() => {
        const queryEmail = searchParams.get("email");
        if (queryEmail) {
            setEmail(queryEmail.trim());
        }
    }, [searchParams]);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/login", {
                email: email.trim(),
                password: password.trim()
            });

            const data = response.data;
            localStorage.setItem("token", data.token || "demo-token");
            localStorage.setItem("role", data.role || "user");
            localStorage.setItem("username", data.username || "Candidate");
            localStorage.setItem("email", data.email || email);
            localStorage.setItem("mustChangePassword", data.mustChangePassword ? "true" : "false");

            if (data.role === "admin") {
                navigate("/admin-dashboard");
            } else if (data.mustChangePassword) {
                navigate("/change-password");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            const serverMessage = err.response?.data?.message;
            if (serverMessage) {
                setError(serverMessage);
                return;
            }

            // Fallback demo login for prototype testing
            const isDemoCandidate = email.includes("candidate") || email.includes("yash");
            const isDemoAdmin = email.includes("admin");

            if (isDemoAdmin) {
                localStorage.setItem("token", "demo-admin-token");
                localStorage.setItem("role", "admin");
                localStorage.setItem("username", "Admin");
                localStorage.setItem("email", email || "admin@aiassess.com");
                navigate("/admin-dashboard");
            } else if (email) {
                localStorage.setItem("token", "demo-token");
                localStorage.setItem("role", "user");
                localStorage.setItem("username", "Yash Verma");
                localStorage.setItem("email", email || "you@example.com");
                navigate("/dashboard");
            } else {
                setError("Please enter your email and password.");
            }
        } finally {
            setLoading(false);
        }
    };

    const loginAsDemoCandidate = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/auth/login", {
                email: "candidate@test.com",
                password: "password123"
            });
            const data = res.data;
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role || "user");
            localStorage.setItem("username", data.username || "Alex Morgan");
            localStorage.setItem("email", data.email || "candidate@test.com");
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Demo login failed");
        } finally {
            setLoading(false);
        }
    };

    const loginAsDemoAdmin = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/auth/login", {
                email: "admin@aiassess.com",
                password: "adminpassword"
            });
            const data = res.data;
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", "admin");
            localStorage.setItem("username", data.username || "System Admin");
            localStorage.setItem("email", data.email || "admin@aiassess.com");
            navigate("/admin-dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Demo admin login failed");
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
            {/* Left Hero / Brand Pane */}
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
                        Intelligent, calibrated technical assessment platform for engineering teams and candidates.
                    </p>

                    {/* Feature Cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "460px" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "14px",
                            padding: "16px 18px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.02)"
                        }}>
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    Context-Aware AI Evaluation
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                    Multi-criteria rubric analysis evaluating logic, optimization, and real-world trade-offs.
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
                            borderRadius: "12px",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.02)"
                        }}>
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#f0fdf4",
                                color: "#16a34a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <ShieldCheck size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    Proctoring & Focus Telemetry
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                    Continuous tab-switch detection, fullscreen compliance, and verified exam conditions.
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
                            borderRadius: "12px",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.02)"
                        }}>
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#fef3c7",
                                color: "#d97706",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <Target size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                                    Targeted Skill Pathways
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                    Adaptive difficulty calibration and weak-skill recommendations to accelerate growth.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer status */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#64748b" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#16a34a", display: "inline-block" }} />
                        <span>Systems operational</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        © 2026 AI Assess Inc.
                    </span>
                </div>
            </div>

            {/* Right Login Card Pane */}
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
                            Welcome back
                        </h2>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                            Sign in to your candidate or examiner account.
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
                            marginBottom: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}>
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: "18px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                Email address
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="email"
                                    placeholder="you@company.com"
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
                                        boxSizing: "border-box",
                                        transition: "border-color 0.15s ease, box-shadow 0.15s ease"
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#3b82f6";
                                        e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.15)";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "#cbd5e1";
                                        e.target.style.boxShadow = "none";
                                    }}
                                />
                                <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                    Password
                                </label>
                            </div>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="password"
                                    placeholder="••••••••"
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
                                        boxSizing: "border-box",
                                        transition: "border-color 0.15s ease, box-shadow 0.15s ease"
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#3b82f6";
                                        e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.15)";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "#cbd5e1";
                                        e.target.style.boxShadow = "none";
                                    }}
                                />
                                <Lock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            </div>
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
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                boxShadow: "0 2px 4px rgba(30, 58, 138, 0.15)",
                                transition: "background-color 0.15s ease"
                            }}
                            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#1d4ed8"; }}
                            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#1e3a8a"; }}
                        >
                            {loading ? "Authenticating..." : "Sign in →"}
                        </button>
                    </form>

                    {/* Quick Demo Access Buttons */}
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "20px", marginTop: "20px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                            Quick Demo Sign-In
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={loginAsDemoCandidate}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    color: "#1e3a8a",
                                    fontSize: "12.5px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#eff6ff";
                                    e.currentTarget.style.borderColor = "#3b82f6";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f8fafc";
                                    e.currentTarget.style.borderColor = "#cbd5e1";
                                }}
                            >
                                Candidate Demo
                            </button>
                            <button
                                type="button"
                                onClick={loginAsDemoAdmin}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    color: "#0f172a",
                                    fontSize: "12.5px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                                    e.currentTarget.style.borderColor = "#94a3b8";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f8fafc";
                                    e.currentTarget.style.borderColor = "#cbd5e1";
                                }}
                            >
                                Admin Demo
                            </button>
                        </div>
                    </div>

                    <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#64748b" }}>
                        Don't have an account?{" "}
                        <Link to="/register" style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                            Register now
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
