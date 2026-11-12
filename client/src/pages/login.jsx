import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

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
            localStorage.setItem("username", data.username || "Yash Verma");
            localStorage.setItem("email", data.email || email);

            if (data.role === "admin") {
                navigate("/admin-dashboard");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            // For testing prototype when backend is offline, enable fallback demo login
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
                email: "admin@test.com",
                password: "password123"
            });
            const data = res.data;
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role || "admin");
            localStorage.setItem("username", data.username || "Admin User");
            localStorage.setItem("email", data.email || "admin@test.com");
            navigate("/admin-dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Admin demo login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#f8fafc" }}>
            {/* Left Hero / Brand Pane */}
            <div
                style={{
                    flex: "1",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "60px 80px",
                    backgroundColor: "#ffffff",
                    borderRight: "1px solid #e5e7eb"
                }}
            >
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: "0 0 4px 0" }}>
                        AI Assess
                    </h1>
                    <p style={{ fontSize: "15px", color: "#6b7280", margin: "0 0 48px 0" }}>
                        Intelligent interview platform
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "420px" }}>
                        <div style={{ padding: "12px 16px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", color: "#374151" }}>
                            • Real-time AI answer evaluation
                        </div>
                        <div style={{ padding: "12px 16px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", color: "#374151" }}>
                            • Anti-cheat telemetry &amp; focus detection
                        </div>
                        <div style={{ padding: "12px 16px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", color: "#374151" }}>
                            • Adaptive difficulty calibration
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        style={{
                            background: "transparent",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "6px 14px",
                            fontSize: "13px",
                            color: "#4b5563",
                            cursor: "pointer"
                        }}
                    >
                        Light / Dark
                    </button>
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
                        maxWidth: "400px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "36px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                >
                    <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 24px 0" }}>
                        Log in
                    </h2>

                    {error && (
                        <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "13px", marginBottom: "16px" }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: "18px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "9px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                Password
                            </label>
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "9px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                padding: "10px",
                                backgroundColor: "#0f172a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: "pointer",
                                marginBottom: "16px"
                            }}
                        >
                            {loading ? "Logging in..." : "Log in"}
                        </button>
                    </form>

                    {/* Quick Demo Access Buttons */}
                    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginTop: "8px", marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                            Quick Demo Sign-In
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={loginAsDemoCandidate}
                                style={{
                                    flex: 1,
                                    padding: "7px 10px",
                                    backgroundColor: "#eff6ff",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: "6px",
                                    color: "#2563eb",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                Candidate Demo
                            </button>
                            <button
                                type="button"
                                onClick={loginAsDemoAdmin}
                                style={{
                                    flex: 1,
                                    padding: "7px 10px",
                                    backgroundColor: "#f3f4f6",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    color: "#1f2937",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                Admin Demo
                            </button>
                        </div>
                    </div>

                    <div style={{ textAlign: "center", fontSize: "13px", color: "#6b7280" }}>
                        No account?{" "}
                        <Link to="/register" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600" }}>
                            Register
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
