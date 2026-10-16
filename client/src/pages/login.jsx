import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
    BrainIcon,
    SparklesIcon,
    CheckCircleIcon,
    ShieldIcon,
    UserIcon,
    ArrowRightIcon,
    ZapIcon,
    BarChartIcon,
    SunIcon,
    MoonIcon
} from "../components/icons";
import { useTheme } from "../context/ThemeContext";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const { theme, toggleTheme, isDark } = useTheme();

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
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role || "user");
            localStorage.setItem("username", data.username || "Candidate");
            localStorage.setItem("email", data.email || email);

            if (data.role === "admin") {
                navigate("/admin-dashboard");
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to log in. Please verify your credentials.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (demoEmail, demoRole) => {
        setEmail(demoEmail);
        setPassword("password123");
        setError("");
    };

    return (
        <div className="min-vh-100 tech-grid-bg d-flex align-items-center justify-content-center p-3 p-md-4">
            <div className="container" style={{ maxWidth: "1080px" }}>
                <div className="glass-card overflow-hidden">
                    <div className="row g-0">
                        {/* Left Column: Branding & Feature Showcase */}
                        <div
                            className="col-lg-6 p-4 p-md-5 d-flex flex-column justify-content-between position-relative"
                            style={{
                                background: "linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
                                borderRight: "1px solid var(--border-subtle)"
                            }}
                        >
                            {/* Brand Header */}
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <div
                                        className="d-flex align-items-center justify-content-center rounded-3 shadow"
                                        style={{
                                            width: "44px",
                                            height: "44px",
                                            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                                            color: "#fff"
                                        }}
                                    >
                                        <BrainIcon size={26} />
                                    </div>
                                    <div>
                                        <h3 className="fw-bold mb-0 text-white" style={{ letterSpacing: "-0.02em" }}>
                                            AI Assess
                                        </h3>
                                        <span className="text-muted small">Intelligent Interview Platform</span>
                                    </div>
                                </div>

                                <h2 className="fw-bold text-white mb-3" style={{ lineHeight: 1.25 }}>
                                    Ace technical interviews with real-time{" "}
                                    <span style={{ color: "#818cf8" }}>AI evaluation</span>.
                                </h2>
                                <p className="text-muted mb-4" style={{ fontSize: "0.95rem" }}>
                                    Conduct dynamic coding and system design assessments with automated scoring across technical knowledge, completeness, relevance, and clarity.
                                </p>

                                {/* Feature Highlights */}
                                <div className="d-flex flex-column gap-3 mb-4">
                                    <div className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                        <div className="p-2 rounded-circle text-indigo-400" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                                            <SparklesIcon size={18} />
                                        </div>
                                        <div>
                                            <div className="fw-semibold text-white small">AI-Generated Question Bank</div>
                                            <div className="text-muted" style={{ fontSize: "0.78rem" }}>Dynamic questions generated by LLMs with approval workflows</div>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                        <div className="p-2 rounded-circle" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                                            <ZapIcon size={18} />
                                        </div>
                                        <div>
                                            <div className="fw-semibold text-white small">Multi-Factor Answer Scoring</div>
                                            <div className="text-muted" style={{ fontSize: "0.78rem" }}>Instant feedback on concepts, edge cases, and clarity</div>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                        <div className="p-2 rounded-circle" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }}>
                                            <BarChartIcon size={18} />
                                        </div>
                                        <div>
                                            <div className="fw-semibold text-white small">Granular Skill Breakdown</div>
                                            <div className="text-muted" style={{ fontSize: "0.78rem" }}>Visual performance trends, strong areas, and weak spots</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Demo Fill Helper */}
                            <div className="p-3 rounded-3 mt-3" style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px dashed rgba(99, 102, 241, 0.3)" }}>
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <span className="small text-white fw-semibold">Quick Demo Login:</span>
                                    <span className="badge-tech badge-indigo" style={{ fontSize: "0.65rem" }}>1-Click Fill</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-secondary-dark flex-grow-1"
                                        style={{ fontSize: "0.8rem" }}
                                        onClick={() => fillDemo("candidate@demo.com", "user")}
                                    >
                                        <UserIcon size={14} /> Candidate
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-secondary-dark flex-grow-1"
                                        style={{ fontSize: "0.8rem" }}
                                        onClick={() => fillDemo("admin@demo.com", "admin")}
                                    >
                                        <ShieldIcon size={14} /> Admin
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Login Form */}
                        <div className="col-lg-6 p-4 p-md-5 d-flex flex-column justify-content-center position-relative">
                            <div className="d-flex justify-content-between align-items-start mb-4">
                                <div>
                                    <h3 className="fw-bold mb-1">Welcome back</h3>
                                    <p className="text-muted small mb-0">Enter your credentials to access your interview workspace.</p>
                                </div>
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

                            {error && (
                                <div className="alert alert-danger py-2 px-3 mb-4 rounded-3 d-flex align-items-center gap-2" style={{ backgroundColor: "rgba(244, 63, 94, 0.12)", borderColor: "rgba(244, 63, 94, 0.3)", color: "#fb7185", fontSize: "0.875rem" }}>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleLogin}>
                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        className="form-control form-control-custom"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className="form-label text-secondary small fw-semibold mb-0">
                                            Password
                                        </label>
                                        <button
                                            type="button"
                                            className="btn btn-link p-0 text-muted small text-decoration-none"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control form-control-custom"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary-gradient w-100 py-2 mb-3"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Sign In <ArrowRightIcon size={16} />
                                        </>
                                    )}
                                </button>

                                <div className="text-center mt-3">
                                    <span className="text-muted small">
                                        Don't have an account?{" "}
                                        <Link to="/register" className="text-indigo-400 fw-semibold text-decoration-none" style={{ color: "#818cf8" }}>
                                            Create Account
                                        </Link>
                                    </span>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;