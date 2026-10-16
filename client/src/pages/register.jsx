import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { BrainIcon, ArrowRightIcon, UserIcon, ShieldIcon, SunIcon, MoonIcon } from "../components/icons";
import { useTheme } from "../context/ThemeContext";

function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();
    const { theme, toggleTheme, isDark } = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/register", {
                username: username.trim(),
                email: email.trim(),
                password: password.trim(),
                role: role
            });

            // If backend returned token directly, store it
            if (response.data?.token) {
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("role", response.data.role || role);
                localStorage.setItem("username", response.data.username || username);
                localStorage.setItem("email", response.data.email || email);

                if (response.data.role === "admin") {
                    navigate("/admin-dashboard");
                } else {
                    navigate("/dashboard");
                }
            } else {
                navigate("/login");
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to create account. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 tech-grid-bg d-flex align-items-center justify-content-center p-3 p-md-4">
            <div className="container" style={{ maxWidth: "540px" }}>
                <div className="glass-card p-4 p-md-5 position-relative">
                    <div className="position-absolute" style={{ top: "1.5rem", right: "1.5rem" }}>
                        <button
                            type="button"
                            className="theme-toggle-btn"
                            onClick={toggleTheme}
                            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            aria-label="Toggle theme"
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

                    {/* Header */}
                    <div className="text-center mb-4">
                        <div
                            className="d-inline-flex align-items-center justify-content-center rounded-3 shadow mb-3"
                            style={{
                                width: "48px",
                                height: "48px",
                                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                                color: "#fff"
                            }}
                        >
                            <BrainIcon size={26} />
                        </div>
                        <h3 className="fw-bold text-white mb-1">Create an Account</h3>
                        <p className="text-muted small">
                            Join AI Assess to test skills and get automated AI evaluation
                        </p>
                    </div>

                    {error && (
                        <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 d-flex align-items-center gap-2" style={{ backgroundColor: "rgba(244, 63, 94, 0.12)", borderColor: "rgba(244, 63, 94, 0.3)", color: "#fb7185", fontSize: "0.875rem" }}>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Account Type Selector */}
                        <div className="mb-3">
                            <label className="form-label text-secondary small fw-semibold">
                                I am registering as:
                            </label>
                            <div className="row g-2">
                                <div className="col-6">
                                    <button
                                        type="button"
                                        className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-2 ${role === "user" ? "btn-primary-gradient" : "btn-secondary-dark"}`}
                                        style={{ fontSize: "0.875rem" }}
                                        onClick={() => setRole("user")}
                                    >
                                        <UserIcon size={16} /> Candidate
                                    </button>
                                </div>
                                <div className="col-6">
                                    <button
                                        type="button"
                                        className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-2 ${role === "admin" ? "btn-primary-gradient" : "btn-secondary-dark"}`}
                                        style={{ fontSize: "0.875rem" }}
                                        onClick={() => setRole("admin")}
                                    >
                                        <ShieldIcon size={16} /> Admin / Recruiter
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Username */}
                        <div className="mb-3">
                            <label className="form-label text-secondary small fw-semibold">
                                Full Name or Username
                            </label>
                            <input
                                type="text"
                                className="form-control form-control-custom"
                                placeholder="e.g. Alex Rivera"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="mb-3">
                            <label className="form-label text-secondary small fw-semibold">
                                Email Address
                            </label>
                            <input
                                type="email"
                                className="form-control form-control-custom"
                                placeholder="alex@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="mb-4">
                            <label className="form-label text-secondary small fw-semibold">
                                Password
                            </label>
                            <input
                                type="password"
                                className="form-control form-control-custom"
                                placeholder="Create a secure password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <div className="text-muted small mt-1" style={{ fontSize: "0.75rem" }}>
                                Minimum 6 characters
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary-gradient w-100 py-2 mb-3"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Registering...
                                </>
                            ) : (
                                <>
                                    Create Account <ArrowRightIcon size={16} />
                                </>
                            )}
                        </button>

                        <div className="text-center mt-3">
                            <span className="text-muted small">
                                Already registered?{" "}
                                <Link to="/login" className="text-indigo-400 fw-semibold text-decoration-none" style={{ color: "#818cf8" }}>
                                    Sign In
                                </Link>
                            </span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Register;