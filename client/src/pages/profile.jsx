import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
    UserIcon,
    ShieldIcon,
    TrophyIcon,
    ClockIcon,
    BarChartIcon,
    CheckCircleIcon,
    LogOutIcon,
    BrainIcon,
    ArrowRightIcon
} from "../components/icons";

function Profile() {
    const navigate = useNavigate();
    const username = localStorage.getItem("username") || "Candidate User";
    const email = localStorage.getItem("email") || "candidate@example.com";
    const role = localStorage.getItem("role") || "user";

    const [stats, setStats] = useState({
        totalInterviews: 0,
        averageScore: 0,
        bestScore: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.get("/results");
                const results = response.data.results || [];
                const total = results.length;
                const avg = total > 0
                    ? (results.reduce((acc, r) => acc + (r.overallScore || 0), 0) / total).toFixed(1)
                    : 0;
                const best = total > 0
                    ? Math.max(...results.map((r) => r.overallScore || 0)).toFixed(1)
                    : 0;

                setStats({
                    totalInterviews: total,
                    averageScore: avg,
                    bestScore: best
                });
            } catch (err) {
                console.log(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
        navigate("/login");
    };

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            <div className="container" style={{ maxWidth: "880px" }}>
                {/* Header */}
                <div className="mb-4">
                    <span className="badge-tech badge-indigo mb-2">Account Center</span>
                    <h2 className="fw-bold text-white mb-1" style={{ letterSpacing: "-0.02em" }}>
                        Candidate Profile
                    </h2>
                    <p className="text-muted small">
                        Manage your platform credentials, role privileges, and evaluation summary
                    </p>
                </div>

                {/* Profile Card */}
                <div className="glass-card p-4 p-md-5 mb-4">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-4">
                        <div className="d-flex align-items-center gap-4">
                            <div
                                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-lg"
                                style={{
                                    width: "72px",
                                    height: "72px",
                                    fontSize: "1.8rem",
                                    background: role === "admin"
                                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
                                        : "linear-gradient(135deg, #6366f1, #06b6d4)"
                                }}
                            >
                                {username.charAt(0).toUpperCase()}
                            </div>

                            <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <h3 className="fw-bold text-white mb-0">{username}</h3>
                                    <span className={`badge-tech ${role === "admin" ? "badge-pending" : "badge-indigo"}`}>
                                        {role === "admin" ? "Administrator" : "Candidate"}
                                    </span>
                                </div>
                                <p className="text-muted small mb-0">{email}</p>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            className="btn btn-secondary-dark d-flex align-items-center gap-2"
                        >
                            <LogOutIcon size={16} /> Sign Out
                        </button>
                    </div>

                    <hr style={{ borderColor: "var(--border-subtle)" }} className="my-4" />

                    {/* Quick Stats Grid */}
                    <div className="row g-3">
                        <div className="col-sm-4">
                            <div className="p-3 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                                <span className="text-muted small d-block mb-1">Interviews Taken</span>
                                <h4 className="fw-bold text-white mb-0">{stats.totalInterviews}</h4>
                            </div>
                        </div>

                        <div className="col-sm-4">
                            <div className="p-3 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                                <span className="text-muted small d-block mb-1">Mean Score</span>
                                <h4 className="fw-bold text-white mb-0">{stats.averageScore} / 10</h4>
                            </div>
                        </div>

                        <div className="col-sm-4">
                            <div className="p-3 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                                <span className="text-muted small d-block mb-1">Peak Score</span>
                                <h4 className="fw-bold text-white mb-0">{stats.bestScore} / 10</h4>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Candidate Preferences & Security Info */}
                <div className="row g-4">
                    <div className="col-md-6">
                        <div className="glass-card p-4 h-100">
                            <h5 className="fw-bold text-white mb-3">Interview Specialization</h5>
                            <div className="d-flex flex-column gap-2 text-muted small">
                                <div className="d-flex justify-content-between p-2 rounded-2" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                                    <span className="text-secondary">Primary Focus:</span>
                                    <span className="text-white fw-semibold">Full Stack Engineering</span>
                                </div>
                                <div className="d-flex justify-content-between p-2 rounded-2" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                                    <span className="text-secondary">Key Tech:</span>
                                    <span className="text-white fw-semibold">React, Node.js, MongoDB</span>
                                </div>
                                <div className="d-flex justify-content-between p-2 rounded-2" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                                    <span className="text-secondary">Evaluation Status:</span>
                                    <span className="badge-tech badge-approved">Active & Ready</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between">
                            <div>
                                <h5 className="fw-bold text-white mb-2">Continue Assessment</h5>
                                <p className="text-muted small mb-4">
                                    Take another challenge to continue building your verified skill profile and report.
                                </p>
                            </div>
                            <Link to="/dashboard" className="btn btn-primary-gradient w-100">
                                <BrainIcon size={16} /> Open Candidate Dashboard <ArrowRightIcon size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
