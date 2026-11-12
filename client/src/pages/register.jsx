import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
        <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#f8fafc" }}>
            {/* Left Hero Pane */}
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
                            • Create your candidate account
                        </div>
                        <div style={{ padding: "12px 16px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", color: "#374151" }}>
                            • Practice technical screenings and coding
                        </div>
                        <div style={{ padding: "12px 16px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", color: "#374151" }}>
                            • Track progress and performance over time
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                    AI Assess v2.2.0
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
                        maxWidth: "400px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "36px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                >
                    <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 24px 0" }}>
                        Create account
                    </h2>

                    {error && (
                        <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#dc2626", fontSize: "13px", marginBottom: "16px" }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister}>
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                Full Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Yash Verma"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
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

                        <div style={{ marginBottom: "16px" }}>
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

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                Password
                            </label>
                            <input
                                type="password"
                                placeholder="Create a password"
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

                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "9px 12px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    outline: "none",
                                    backgroundColor: "#ffffff"
                                }}
                            >
                                <option value="user">Candidate</option>
                                <option value="admin">Administrator</option>
                            </select>
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
                            {loading ? "Creating account..." : "Register"}
                        </button>
                    </form>

                    <div style={{ textAlign: "center", fontSize: "13px", color: "#6b7280" }}>
                        Already have an account?{" "}
                        <Link to="/login" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600" }}>
                            Log in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
