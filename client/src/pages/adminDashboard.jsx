import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
    BrainIcon,
    SparklesIcon,
    BookOpenIcon,
    BriefcaseIcon,
    UserIcon,
    FileTextIcon,
    BarChartIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    PlusIcon,
    ClockIcon,
    ShieldIcon
} from "../components/icons";

function AdminDashboard() {
    const [stats, setStats] = useState({
        totalQuestions: 0,
        pendingQuestions: 0,
        totalCandidates: 0,
        totalInterviews: 0,
        averageScore: 0,
        totalRoles: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAdminStats = async () => {
            try {
                setLoading(true);
                // Fetch questions
                let questions = [];
                try {
                    const qRes = await api.get("/question");
                    questions = qRes.data || [];
                } catch (e) {
                    console.log("Error loading questions", e);
                }

                // Fetch results analytics
                let totalInterviews = 0;
                let averageScore = 0;
                try {
                    const aRes = await api.get("/results/analytics");
                    totalInterviews = aRes.data.totalResults || 0;
                    averageScore = aRes.data.averageScore || 0;
                } catch (e) {
                    console.log("Error loading analytics", e);
                }

                // Fetch roles
                let roles = [];
                try {
                    const rRes = await api.get("/roles");
                    roles = rRes.data.roles || rRes.data || [];
                } catch (e) {
                    console.log("Error loading roles", e);
                }

                // Fetch candidates
                let candidatesCount = 0;
                try {
                    const cRes = await api.get("/results/admin");
                    const uniqueCandidates = new Set(
                        (cRes.data.results || [])
                            .filter((r) => r.candidateId)
                            .map((r) => r.candidateId._id || r.candidateId)
                    );
                    candidatesCount = uniqueCandidates.size;
                } catch (e) {
                    console.log("Error loading candidates", e);
                }

                const pending = questions.filter((q) => q.status === "pending").length;

                setStats({
                    totalQuestions: questions.length,
                    pendingQuestions: pending,
                    totalCandidates: candidatesCount,
                    totalInterviews,
                    averageScore,
                    totalRoles: roles.length
                });
            } catch (err) {
                console.log(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminStats();
    }, []);

    const adminModules = [
        {
            title: "Question Bank",
            desc: "Create, edit, approve, reject and manage technical interview questions.",
            path: "/questionbank",
            icon: <BookOpenIcon size={24} className="text-indigo-400" />,
            count: `${stats.totalQuestions} Questions`,
            badge: stats.pendingQuestions > 0 ? `${stats.pendingQuestions} Pending Review` : null,
            badgeType: "badge-pending"
        },
        {
            title: "AI Question Generator",
            desc: "Generate tailored interview questions with external AI by role, topic, and difficulty.",
            path: "/aigenerator",
            icon: <SparklesIcon size={24} className="text-cyan-400" />,
            count: "FastAPI AI Engine",
            badge: "Instant Generation",
            badgeType: "badge-cyan"
        },
        {
            title: "Manage Roles",
            desc: "Configure target engineering roles, domain specializations, and assessment parameters.",
            path: "/roles",
            icon: <BriefcaseIcon size={24} className="text-emerald-400" />,
            count: `${stats.totalRoles} Active Roles`,
            badge: null
        },
        {
            title: "Candidates Directory",
            desc: "Inspect candidate profiles, total assessments taken, and historical scores.",
            path: "/candidate-data",
            icon: <UserIcon size={24} className="text-amber-400" />,
            count: `${stats.totalCandidates} Candidates`,
            badge: null
        },
        {
            title: "Interview Submissions",
            desc: "View completed interviews with granular answers, AI scores, and feedback logs.",
            path: "/admin-results",
            icon: <FileTextIcon size={24} className="text-rose-400" />,
            count: `${stats.totalInterviews} Submissions`,
            badge: null
        },
        {
            title: "Platform Analytics",
            desc: "Platform-wide performance statistics, candidate score distributions, and domain metrics.",
            path: "/admin-analytics",
            icon: <BarChartIcon size={24} className="text-indigo-400" />,
            count: `Avg: ${stats.averageScore}/10`,
            badge: null
        }
    ];

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            <div className="container">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-5">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge-tech badge-pending">
                                <ShieldIcon size={14} /> Administration Suite
                            </span>
                        </div>
                        <h2 className="fw-bold text-white mb-0" style={{ letterSpacing: "-0.02em" }}>
                            Admin Operations Control
                        </h2>
                        <p className="text-muted small mb-0">
                            Orchestrate question generation, candidate evaluations, role definitions, and analytics
                        </p>
                    </div>

                    <div className="d-flex gap-2">
                        <Link to="/aigenerator" className="btn btn-primary-gradient">
                            <SparklesIcon size={16} /> Generate Questions
                        </Link>
                        <Link to="/dashboard" className="btn btn-secondary-dark">
                            <BrainIcon size={16} /> Test Candidate Flow
                        </Link>
                    </div>
                </div>

                {/* KPI Metrics Row */}
                <div className="row g-3 mb-5">
                    <div className="col-sm-6 col-lg-3">
                        <div className="glass-card p-3 p-md-4 h-100">
                            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                                Question Bank
                            </span>
                            <div className="d-flex align-items-baseline gap-2">
                                <h2 className="fw-bold text-white mb-0">{stats.totalQuestions}</h2>
                                {stats.pendingQuestions > 0 && (
                                    <span className="badge-tech badge-pending small">
                                        {stats.pendingQuestions} pending
                                    </span>
                                )}
                            </div>
                            <span className="text-muted small">Approved & pending items</span>
                        </div>
                    </div>

                    <div className="col-sm-6 col-lg-3">
                        <div className="glass-card p-3 p-md-4 h-100">
                            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                                Total Candidates
                            </span>
                            <h2 className="fw-bold text-white mb-0">{stats.totalCandidates}</h2>
                            <span className="text-muted small">Registered assessment takers</span>
                        </div>
                    </div>

                    <div className="col-sm-6 col-lg-3">
                        <div className="glass-card p-3 p-md-4 h-100">
                            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                                Interviews Completed
                            </span>
                            <h2 className="fw-bold text-white mb-0">{stats.totalInterviews}</h2>
                            <span className="text-muted small">Submitted and AI scored</span>
                        </div>
                    </div>

                    <div className="col-sm-6 col-lg-3">
                        <div className="glass-card p-3 p-md-4 h-100">
                            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                                Platform Avg Score
                            </span>
                            <h2 className="fw-bold text-white mb-0">
                                {stats.averageScore} <small className="text-muted fs-6">/ 10</small>
                            </h2>
                            <span className="text-muted small">Multi-factor benchmark</span>
                        </div>
                    </div>
                </div>

                {/* Management Modules Grid */}
                <div className="mb-4">
                    <h4 className="fw-bold text-white mb-3">Management Modules</h4>
                    <div className="row g-4">
                        {adminModules.map((mod) => (
                            <div key={mod.title} className="col-md-6 col-lg-4">
                                <div className="glass-card glass-card-interactive p-4 h-100 d-flex flex-column justify-content-between">
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div
                                                className="p-3 rounded-3"
                                                style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-subtle)" }}
                                            >
                                                {mod.icon}
                                            </div>
                                            {mod.badge && (
                                                <span className={`badge-tech ${mod.badgeType}`}>
                                                    {mod.badge}
                                                </span>
                                            )}
                                        </div>

                                        <h5 className="fw-bold text-white mb-2">{mod.title}</h5>
                                        <p className="text-muted small mb-4" style={{ minHeight: "42px" }}>
                                            {mod.desc}
                                        </p>
                                    </div>

                                    <div>
                                        <hr style={{ borderColor: "var(--border-subtle)" }} className="my-3" />
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-secondary small fw-semibold">
                                                {mod.count}
                                            </span>
                                            <Link to={mod.path} className="btn btn-sm btn-secondary-dark d-flex align-items-center gap-1">
                                                <span>Open</span>
                                                <ArrowRightIcon size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;