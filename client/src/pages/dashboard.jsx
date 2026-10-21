import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
    BrainIcon,
    SparklesIcon,
    BriefcaseIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    ClockIcon,
    TrophyIcon,
    BarChartIcon,
    ZapIcon,
    CodeIcon,
    FileTextIcon,
    CheckIcon,
    PlayIcon,
    ShieldIcon,
    LayersIcon
} from "../components/icons";
import Toast from "../components/Toast";

const QUICK_PRESETS = [
    {
        role: "Coding",
        domains: ["Algorithms", "Data Structures", "Dynamic Programming", "Graph Theory"],
        description: "Codeforces algorithmic challenges with input/output specs, edge cases, and test suites."
    },
    {
        role: "Full Stack Developer",
        domains: ["React & Node.js", "Full Stack Architecture", "REST & GraphQL APIs", "Database"],
        description: "Frontend state, RESTful/GraphQL APIs, database models, and end-to-end architecture."
    },
    {
        role: "Frontend Engineer",
        domains: ["React", "JavaScript & HTML/CSS", "UI State & Performance", "Web Accessibility", "Next.js"],
        description: "Component lifecycle, modern reactive patterns, UI optimization, and accessibility."
    },
    {
        role: "Backend Developer",
        domains: ["Node.js & Express", "Databases & Storage", "API Design & Microservices", "Backend Architecture"],
        description: "Async pipelines, microservices, database schemas, and high-throughput systems."
    },
    {
        role: "DevOps Engineer",
        domains: ["Docker & Kubernetes", "CI/CD Pipelines", "Cloud Architecture", "Monitoring & Observability"],
        description: "Containerization, infrastructure as code, CI/CD automation, and observability."
    },
    {
        role: "Software Engineer",
        domains: ["Algorithms", "Data Structures", "Python", "Object-Oriented Design"],
        description: "Algorithmic problem-solving, time/space complexity, and clean software design."
    },
    {
        role: "System Architect",
        domains: ["System Design & Microservices", "Distributed Systems", "Caching & Scalability", "Database Partitioning"],
        description: "High-availability, fault tolerance, caching topologies, and cloud infrastructure."
    },
    {
        role: "AI/ML Engineer",
        domains: ["Generative AI & LLMs", "Machine Learning", "Deep Learning & PyTorch", "Python"],
        description: "Neural architectures, embeddings, transformers, and model inference pipelines."
    }
];

function Dashboard() {
    const navigate = useNavigate();
    const username = localStorage.getItem("username") || "Candidate";

    // Data states
    const [roles, setRoles] = useState([]);
    const [pastResults, setPastResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [launching, setLaunching] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "info" });

    // Ongoing active interview detection
    const [activeInterview, setActiveInterview] = useState(() => {
        try {
            const raw = localStorage.getItem("activeInterview");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    });

    // Practice Interview Setup parameters (Standard Proctored Only - Clean & Simple)
    const [selectedRole, setSelectedRole] = useState(QUICK_PRESETS[0].role);
    const [selectedDomain, setSelectedDomain] = useState(QUICK_PRESETS[0].domains[0]);
    const [customDomainInput, setCustomDomainInput] = useState("");
    const [questionCount, setQuestionCount] = useState(5);
    const [assessmentFormat, setAssessmentFormat] = useState("theory"); // "theory" | "coding" | "mixed"

    // Time-based greeting
    const greetingText = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return `Good morning, ${username}`;
        if (hour < 18) return `Good afternoon, ${username}`;
        return `Good evening, ${username}`;
    }, [username]);

    const todayFormatted = useMemo(() => {
        return new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric"
        }).toUpperCase();
    }, []);

    // Fetch roles & past history
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const rolesRes = await api.get("/roles");
                setRoles(rolesRes.data.roles || rolesRes.data || []);

                try {
                    const resultsRes = await api.get("/results");
                    setPastResults(resultsRes.data.results || []);
                } catch (e) {
                    console.log("No previous results yet", e);
                }
            } catch (err) {
                console.log("Error loading dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();

        // Listen for storage changes
        const handleStorage = () => {
            try {
                const raw = localStorage.getItem("activeInterview");
                setActiveInterview(raw ? JSON.parse(raw) : null);
            } catch (e) {
                setActiveInterview(null);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    // Current preset object
    const currentPreset = useMemo(() => {
        return QUICK_PRESETS.find(p => p.role.toLowerCase() === selectedRole.toLowerCase()) || QUICK_PRESETS[0];
    }, [selectedRole]);

    // Apply quick preset
    const handleApplyPreset = (preset) => {
        setSelectedRole(preset.role);
        setSelectedDomain(preset.domains[0] || "General");
        setCustomDomainInput("");
        if (preset.role.toLowerCase() === "coding") {
            setAssessmentFormat("coding");
        }
    };

    // Calculate aggregated metrics
    const totalInterviews = pastResults.length;
    const avgScore = totalInterviews > 0
        ? (pastResults.reduce((acc, r) => acc + (r.overallScore || 0), 0) / totalInterviews).toFixed(1)
        : null;

    const aggregatedStrong = Array.from(
        new Set(pastResults.flatMap(r => r.strongAreas || []))
    ).slice(0, 6);

    const aggregatedWeak = Array.from(
        new Set(pastResults.flatMap(r => r.weakAreas || []))
    ).slice(0, 6);

    const latestResult = pastResults[0];

    const skillsList = [
        { name: "React & Modern Frontend", percent: 85, color: "progress-bar-custom" },
        { name: "JavaScript / TypeScript", percent: 82, color: "progress-bar-emerald" },
        { name: "Node.js & Backend Architecture", percent: 74, color: "progress-bar-custom" },
        { name: "Database & Data Modeling", percent: 68, color: "progress-bar-amber" },
        { name: "System Design & Scalability", percent: 61, color: "progress-bar-rose" }
    ];

    // Launch practice interview
    const handleLaunchAssessment = async () => {
        const finalDomain = customDomainInput.trim() || selectedDomain || "General";
        setLaunching(true);

        try {
            const response = await api.post("/interviews", {
                roleTitle: selectedRole,
                domain: finalDomain,
                limit: Number(questionCount),
                assessmentType: assessmentFormat
            });

            const interviewId = response.data.interviewId;
            if (!interviewId) throw new Error("Could not initialize interview session.");

            localStorage.setItem("activeInterview", JSON.stringify({
                id: interviewId,
                type: "standard",
                roleTitle: selectedRole,
                domain: finalDomain,
                timestamp: Date.now()
            }));

            setToast({
                show: true,
                message: "Interview ready! Entering evaluation room...",
                type: "success"
            });

            setTimeout(() => {
                navigate(`/interview/${interviewId}`, {
                    state: { questions: response.data.questions }
                });
            }, 300);

        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to start interview. Try a different topic or generate questions in question bank.";
            setToast({
                show: true,
                message: msg,
                type: "error"
            });
            setLaunching(false);
        }
    };

    // Scroll to launchpad and pre-configure
    const handleFocusLaunchpad = (presetRole, domain, format = "theory") => {
        if (presetRole) setSelectedRole(presetRole);
        if (domain) {
            setSelectedDomain(domain);
            setCustomDomainInput("");
        }
        if (format) setAssessmentFormat(format);

        const el = document.getElementById("assessment-launchpad");
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // Resume ongoing session
    const handleResumeActiveSession = () => {
        if (!activeInterview?.id) return;
        if (activeInterview.type === "adaptive") {
            navigate(`/adaptive-interview/${activeInterview.id}`);
        } else {
            navigate(`/interview/${activeInterview.id}`);
        }
    };

    // Discard active session
    const handleDiscardActiveSession = () => {
        localStorage.removeItem("activeInterview");
        setActiveInterview(null);
        setToast({
            show: true,
            message: "Active session cleared. You can now start a new interview.",
            type: "info"
        });
    };

    return (
        <div className="pb-5">
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            {/* Header Greeting */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <div className="text-muted fw-bold small mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.08em" }}>
                        {todayFormatted}
                    </div>
                    <h1 className="fw-bold mb-1" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
                        {greetingText}
                    </h1>
                    <p className="text-secondary mb-0">
                        Practice role-specific technical interviews, write code, and receive actionable AI grading.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                    {activeInterview?.id ? (
                        <button
                            onClick={handleResumeActiveSession}
                            className="btn btn-primary-gradient px-4 py-2 d-inline-flex align-items-center gap-2 shadow"
                        >
                            <span className="status-dot-pulse" style={{ width: "8px", height: "8px" }} />
                            Resume In-Progress Interview
                        </button>
                    ) : (
                        <button
                            onClick={() => handleFocusLaunchpad("Full Stack Developer", "React & Node.js")}
                            className="btn btn-primary-gradient px-4 py-2"
                        >
                            <PlayIcon size={16} /> Start Practice Session
                        </button>
                    )}
                </div>
            </div>

            {/* Active Session Notification Banner (if any ongoing exam detected) */}
            {activeInterview?.id && (
                <div className="glass-card p-3 p-md-4 mb-4 border-emerald-500 border-opacity-50" style={{ background: "rgba(6, 78, 59, 0.25)" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="p-2 rounded-circle bg-emerald-500 bg-opacity-20 text-emerald-400">
                                <PlayIcon size={24} />
                            </div>
                            <div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-emerald-500 text-dark fw-bold px-2 py-0" style={{ fontSize: "0.7rem" }}>
                                        ACTIVE SESSION IN PROGRESS
                                    </span>
                                    <span className="text-light small fw-bold">
                                        {activeInterview.roleTitle || "Technical Assessment"}
                                    </span>
                                </div>
                                <p className="text-muted small mb-0 mt-1">
                                    You have an active interview session ({activeInterview.domain || "Technical Round"}). Click below to resume where you left off.
                                </p>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <button
                                onClick={handleDiscardActiveSession}
                                className="btn btn-sm btn-secondary-dark"
                                title="Discard this session"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleResumeActiveSession}
                                className="btn btn-sm btn-primary-gradient px-3 fw-bold d-inline-flex align-items-center gap-2"
                            >
                                Continue Interview <ArrowRightIcon size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Beginner-Friendly 3-Step Guide for First-Time Users */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="step-guide-card">
                        <div className="step-badge-number">1</div>
                        <h6 className="fw-bold text-white mb-1">Pick Your Role & Tech Stack</h6>
                        <p className="text-secondary small mb-0">
                            Select from standard roles (Backend, DevOps, Full Stack) or type any custom technology you want to practice.
                        </p>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="step-guide-card">
                        <div className="step-badge-number">2</div>
                        <h6 className="fw-bold text-white mb-1">Answer & Code Live</h6>
                        <p className="text-secondary small mb-0">
                            Solve realistic technical questions or write solutions in our integrated code editor with test cases.
                        </p>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="step-guide-card">
                        <div className="step-badge-number">3</div>
                        <h6 className="fw-bold text-white mb-1">Get Instant AI Grading</h6>
                        <p className="text-secondary small mb-0">
                            Receive rubric scores, comprehensive model answers, strengths, and actionable areas to improve.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Practice Interview Setup Station */}
            <div id="assessment-launchpad" className="row g-4 mb-4">
                {/* Left: Clean, Intuitive Setup Console */}
                <div className="col-lg-8">
                    <div className="unified-launcher-card p-4 p-md-5 h-100 position-relative">
                        <div className="hero-radar-bg" />

                        <div className="position-relative z-1">
                            {/* Badges & Title */}
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                                <span className="badge-tech badge-indigo d-inline-flex align-items-center gap-1">
                                    <SparklesIcon size={12} /> AI Technical Interview
                                </span>
                                <span className="badge-tech badge-approved">
                                    Instant Evaluation
                                </span>
                            </div>

                            <h2 className="fw-bold text-white mb-2" style={{ fontSize: "1.9rem", letterSpacing: "-0.02em" }}>
                                Start a Practice Technical Interview
                            </h2>
                            <p className="text-muted small mb-4" style={{ maxWidth: "620px" }}>
                                Configure your technical round below. The AI will formulate targeted questions matching your exact role and tech stack.
                            </p>

                            {/* Step 1: Quick Role Presets */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="form-label text-secondary small fw-semibold mb-0">
                                        Step 1: Choose Your Target Role
                                    </label>
                                    <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                                        Click a role to load topics
                                    </span>
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {QUICK_PRESETS.map((p) => {
                                        const isSelected = selectedRole.toLowerCase() === p.role.toLowerCase();
                                        return (
                                            <button
                                                key={p.role}
                                                type="button"
                                                className={`preset-chip ${isSelected ? "active" : ""}`}
                                                onClick={() => handleApplyPreset(p)}
                                            >
                                                {p.role}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step 2: Role Input & Domain Selection */}
                            <div className="row g-3 mb-4">
                                <div className="col-md-5">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Role Title
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-custom text-white"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        placeholder="e.g. Backend Developer"
                                    />
                                </div>

                                <div className="col-md-7">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className="form-label text-secondary small fw-semibold mb-0">
                                            Step 2: Tech Stack / Topic
                                        </label>
                                        {customDomainInput.trim() ? (
                                            <span className="badge-tech badge-cyan" style={{ fontSize: "0.68rem" }}>
                                                ✨ Custom Stack Active
                                            </span>
                                        ) : (
                                            <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                                                Pick or type custom below
                                            </span>
                                        )}
                                    </div>
                                    <div className="d-flex flex-wrap gap-1 mb-2">
                                        {currentPreset.domains.map((dom) => {
                                            const isActive = !customDomainInput.trim() && selectedDomain === dom;
                                            return (
                                                <button
                                                    key={dom}
                                                    type="button"
                                                    className={`domain-pill ${isActive ? "active" : ""}`}
                                                    onClick={() => {
                                                        setSelectedDomain(dom);
                                                        setCustomDomainInput("");
                                                    }}
                                                >
                                                    {dom}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-custom text-white"
                                            placeholder="Or enter custom technology (e.g. Docker & Kubernetes, Kafka, Redis, Rust)..."
                                            value={customDomainInput}
                                            onChange={(e) => setCustomDomainInput(e.target.value)}
                                        />
                                        {customDomainInput && (
                                            <button
                                                type="button"
                                                className="btn-icon-ghost position-absolute top-50 end-0 translate-middle-y me-2"
                                                onClick={() => setCustomDomainInput("")}
                                                title="Clear custom stack"
                                                style={{ color: "#94a3b8" }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    {customDomainInput.trim() && (
                                        <div className="text-cyan-400 small mt-1 d-flex align-items-center gap-1" style={{ fontSize: "0.78rem" }}>
                                            <SparklesIcon size={13} />
                                            <span>AI will dynamically craft interview questions specifically for <strong>{customDomainInput.trim()}</strong>.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 3: Format & Number of Questions */}
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Step 3: Question Format
                                    </label>
                                    <div className="d-flex gap-2">
                                        {[
                                            { id: "theory", label: "Theory & Concepts" },
                                            { id: "coding", label: "Live Code Editor" },
                                            { id: "mixed", label: "Mixed (Both)" }
                                        ].map((fmt) => (
                                            <button
                                                key={fmt.id}
                                                type="button"
                                                className={`option-pill-btn ${assessmentFormat === fmt.id ? "active" : ""}`}
                                                onClick={() => setAssessmentFormat(fmt.id)}
                                            >
                                                {fmt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Interview Length
                                    </label>
                                    <div className="d-flex gap-2">
                                        {[3, 5, 8].map((count) => (
                                            <button
                                                key={count}
                                                type="button"
                                                className={`option-pill-btn ${questionCount === count ? "active" : ""}`}
                                                onClick={() => setQuestionCount(count)}
                                            >
                                                <div>{count} Questions</div>
                                                <div style={{ fontSize: "0.68rem", opacity: 0.85 }}>
                                                    {count === 3 ? "~10 mins" : count === 5 ? "~18 mins" : "~30 mins"}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Summary & Start Button */}
                            <div className="pt-3 border-top border-secondary border-opacity-25 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                                <div className="text-muted small">
                                    <span className="fw-semibold text-light">Selected Track: </span>
                                    <span>{selectedRole} · </span>
                                    <span className="text-cyan-400 fw-bold">{customDomainInput.trim() || selectedDomain}</span>
                                    {customDomainInput.trim() && (
                                        <span className="badge bg-indigo-500 text-white ms-2" style={{ fontSize: "0.68rem" }}>
                                            ✨ Custom Stack
                                        </span>
                                    )}
                                    <span className="d-block text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                                        {questionCount} questions · {assessmentFormat === "theory" ? "Theory & Concepts" : assessmentFormat === "coding" ? "Live Code Sandbox" : "Mixed Format"}
                                    </span>
                                </div>

                                <button
                                    className="btn btn-primary-gradient px-4 py-3 fw-bold fs-6 d-inline-flex align-items-center justify-content-center gap-2 shadow-lg"
                                    onClick={handleLaunchAssessment}
                                    disabled={launching}
                                >
                                    {launching ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" />
                                            <span>
                                                {customDomainInput.trim()
                                                    ? `Crafting Questions for ${customDomainInput.trim()}...`
                                                    : "Preparing Assessment Room..."}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <PlayIcon size={18} />
                                            <span>Start Practice Interview</span>
                                            <ArrowRightIcon size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Candidate Readiness & Quick Progress HUD */}
                <div className="col-lg-4">
                    <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between">
                        <div>
                            {/* Readiness Header */}
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <span className="text-muted small text-uppercase fw-bold letter-spacing-1" style={{ fontSize: "0.72rem" }}>
                                        CANDIDATE DASHBOARD
                                    </span>
                                    <h4 className="fw-bold mb-0 text-white">Your Readiness HUD</h4>
                                </div>
                                <span className="badge-tech badge-approved">
                                    {totalInterviews > 0 ? "Active" : "New"}
                                </span>
                            </div>

                            {/* Readiness Gauge or First-Time Welcome */}
                            {totalInterviews > 0 ? (
                                <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-4" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                    <div className="score-circle-modern flex-shrink-0" style={{ width: "72px", height: "72px" }}>
                                        <span className="fw-bold fs-3 text-white" style={{ lineHeight: 1 }}>
                                            {avgScore !== null ? Math.round(avgScore * 10) : 82}
                                        </span>
                                        <span className="text-muted small" style={{ fontSize: "0.62rem", textTransform: "uppercase" }}>
                                            Readiness
                                        </span>
                                    </div>

                                    <div className="flex-grow-1">
                                        <div className="fw-bold text-white mb-1">
                                            {avgScore !== null && avgScore >= 7 ? "High Technical Competency" : "Good Readiness"}
                                        </div>
                                        <p className="text-secondary small mb-0" style={{ fontSize: "0.78rem" }}>
                                            Calculated from your past interview scores and domain clarity.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 rounded-3 mb-4" style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <SparklesIcon size={16} className="text-indigo-400" />
                                        <span className="fw-bold text-white small">First time here?</span>
                                    </div>
                                    <p className="text-secondary small mb-0" style={{ fontSize: "0.78rem" }}>
                                        Complete your first practice session on the left to unlock your personalized readiness score, skill analysis, and AI evaluator feedback.
                                    </p>
                                </div>
                            )}

                            {/* Stats Counter */}
                            <div className="row g-2 mb-4">
                                <div className="col-6">
                                    <div className="p-3 rounded-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                                        <div className="text-muted small mb-1" style={{ fontSize: "0.75rem" }}>Interviews Completed</div>
                                        <div className="fw-bold fs-4 text-white">
                                            {totalInterviews}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 rounded-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                                        <div className="text-muted small mb-1" style={{ fontSize: "0.75rem" }}>Practice Time</div>
                                        <div className="fw-bold fs-4 text-white">
                                            {totalInterviews > 0 ? `${(totalInterviews * 0.6).toFixed(1)}h` : "0h"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Direct Navigation Links */}
                            <div className="d-flex flex-column gap-2 mb-3">
                                <Link
                                    to="/adaptive-exam"
                                    className="p-2 px-3 rounded-3 text-decoration-none d-flex align-items-center justify-content-between transition-all"
                                    style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", color: "#fcd34d" }}
                                >
                                    <span className="small fw-semibold d-flex align-items-center gap-2">
                                        <ZapIcon size={15} className="text-amber-400" /> Adaptive Exam Hub
                                    </span>
                                    <ArrowRightIcon size={14} />
                                </Link>

                                <Link
                                    to="/analytics"
                                    className="p-2 px-3 rounded-3 text-decoration-none d-flex align-items-center justify-content-between transition-all"
                                    style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#cbd5e1" }}
                                >
                                    <span className="small fw-semibold d-flex align-items-center gap-2">
                                        <BarChartIcon size={15} className="text-cyan-400" /> Performance Analytics
                                    </span>
                                    <ArrowRightIcon size={14} />
                                </Link>

                                <Link
                                    to="/history"
                                    className="p-2 px-3 rounded-3 text-decoration-none d-flex align-items-center justify-content-between transition-all"
                                    style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#cbd5e1" }}
                                >
                                    <span className="small fw-semibold d-flex align-items-center gap-2">
                                        <ClockIcon size={15} className="text-indigo-400" /> Attempt History
                                    </span>
                                    <ArrowRightIcon size={14} />
                                </Link>
                            </div>
                        </div>

                        <div className="pt-3 border-top border-secondary border-opacity-25 d-flex align-items-center gap-2 text-success small fw-semibold">
                            <CheckIcon size={16} />
                            <span>AI Evaluator active & ready</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dedicated Callout Banner to Adaptive Exam Hub (Separated from Landing Page) */}
            <div className="adaptive-promo-banner mb-5">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div className="d-flex align-items-start gap-3">
                        <div className="p-2 rounded-3 bg-amber-500 bg-opacity-20 text-amber-400 mt-1 flex-shrink-0">
                            <ZapIcon size={24} />
                        </div>
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <span className="badge-tech badge-pending" style={{ fontSize: "0.68rem" }}>
                                    Dynamic Difficulty Scaling
                                </span>
                                <h5 className="fw-bold text-white mb-0">Looking for the Adaptive AI Exam?</h5>
                            </div>
                            <p className="text-secondary small mb-0" style={{ maxWidth: "700px" }}>
                                Experience an exam engine that adjusts question difficulty in real-time based on your answers. Earn score multipliers on harder tiers and receive diagnostic hints when questions are tough.
                            </p>
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <Link
                            to="/adaptive-exam"
                            className="btn btn-warning fw-bold text-dark px-4 py-2 d-inline-flex align-items-center gap-2 shadow-sm"
                            style={{ background: "#f59e0b", border: "none" }}
                        >
                            <span>Open Adaptive Exam Hub</span>
                            <ArrowRightIcon size={16} />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Section: Practice Categories */}
            <div className="mb-5">
                <div className="d-flex justify-content-between align-items-end mb-3">
                    <div>
                        <span className="text-muted small text-uppercase fw-bold" style={{ fontSize: "0.72rem", letterSpacing: "0.08em" }}>
                            PRACTICE LIBRARY
                        </span>
                        <h3 className="fw-bold mb-1 text-white">Choose Your Assessment Format</h3>
                    </div>
                    <span className="text-muted small d-none d-sm-block">
                        Instant 1-click launcher configuration
                    </span>
                </div>

                <div className="row g-4">
                    {/* Technical Theory */}
                    <div className="col-md-4">
                        <div
                            className="practice-card"
                            onClick={() => handleFocusLaunchpad("Full Stack Developer", "React & Node.js", "theory")}
                        >
                            <div>
                                <div className="practice-icon-box" style={{ background: "rgba(99, 102, 241, 0.12)", color: "#6366f1" }}>
                                    <FileTextIcon size={22} />
                                </div>
                                <div className="badge-tech badge-indigo py-0 px-2 mb-2" style={{ fontSize: "0.68rem" }}>
                                    Concepts & Trade-offs
                                </div>
                                <h5 className="fw-bold mb-2 text-white">Conceptual Theory</h5>
                                <p className="text-secondary small mb-0">
                                    Deep dive into architectural patterns, API design, lifecycle hooks, and database design.
                                </p>
                            </div>
                            <div className="practice-explore-link text-indigo-400">
                                Configure Session <ArrowRightIcon size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Live Coding Sandbox */}
                    <div className="col-md-4">
                        <div
                            className="practice-card"
                            onClick={() => handleFocusLaunchpad("Coding", "Algorithms", "coding")}
                        >
                            <div>
                                <div className="practice-icon-box" style={{ background: "rgba(0, 217, 255, 0.12)", color: "#00d9ff" }}>
                                    <CodeIcon size={22} />
                                </div>
                                <div className="badge-tech badge-cyan py-0 px-2 mb-2" style={{ fontSize: "0.68rem" }}>
                                    Codeforces Problem Bank
                                </div>
                                <h5 className="fw-bold mb-2 text-white">Coding Sandbox</h5>
                                <p className="text-secondary small mb-0">
                                    Solve real Codeforces algorithmic challenges with sample test cases, input/output specifications, and live Monaco code editor.
                                </p>
                            </div>
                            <div className="practice-explore-link text-cyan-400">
                                Configure Session <ArrowRightIcon size={14} />
                            </div>
                        </div>
                    </div>

                    {/* System Design & Architecture */}
                    <div className="col-md-4">
                        <div
                            className="practice-card"
                            onClick={() => handleFocusLaunchpad("System Architect", "System Design & Microservices", "theory")}
                        >
                            <div>
                                <div className="practice-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
                                    <LayersIcon size={22} />
                                </div>
                                <div className="badge-tech badge-approved py-0 px-2 mb-2" style={{ fontSize: "0.68rem" }}>
                                    Scalability & High Availability
                                </div>
                                <h5 className="fw-bold mb-2 text-white">System Architecture</h5>
                                <p className="text-secondary small mb-0">
                                    Design scalable distributed services, caching strategies, load balancers, and fault-tolerant architectures.
                                </p>
                            </div>
                            <div className="practice-explore-link text-emerald-400">
                                Configure Session <ArrowRightIcon size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section: Performance Analysis & AI Insights Grid */}
            <div className="row g-4 mb-5">
                <div className="col-lg-7">
                    <div className="glass-card p-4 h-100">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h4 className="fw-bold mb-1 text-white">Skill Performance Analysis</h4>
                                <p className="text-muted small mb-0">
                                    Evaluated across technical correctness, domain depth, and architecture
                                </p>
                            </div>
                            <span className="badge-tech badge-indigo">
                                Overall: {avgScore !== null ? `${Math.round(avgScore * 10)}%` : "78%"}
                            </span>
                        </div>

                        <div className="d-flex flex-column gap-3">
                            {skillsList.map((skill) => (
                                <div key={skill.name}>
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="text-secondary fw-semibold small">{skill.name}</span>
                                        <span className="fw-bold small text-light">{skill.percent}%</span>
                                    </div>
                                    <div className="progress-container" title={`${skill.name}: ${skill.percent}% proficiency`}>
                                        <div
                                            className={`progress-bar-custom ${skill.color}`}
                                            style={{ width: `${skill.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-lg-5">
                    <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between">
                        <div>
                            <h4 className="fw-bold mb-1 text-white">AI Competency Insights</h4>
                            <p className="text-muted small mb-3">Synthesized strengths and growth recommendations</p>

                            <div className="mb-4">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <CheckCircleIcon size={16} className="text-emerald-500" />
                                    <span className="fw-semibold small text-light">Strong Areas</span>
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {aggregatedStrong.length > 0 ? (
                                        aggregatedStrong.map((area, idx) => (
                                            <span key={idx} className="badge-tech badge-approved">
                                                {area}
                                            </span>
                                        ))
                                    ) : (
                                        <>
                                            <span className="badge-tech badge-approved">React Hooks & State</span>
                                            <span className="badge-tech badge-approved">RESTful Architecture</span>
                                            <span className="badge-tech badge-approved">Algorithmic Complexity</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <AlertTriangleIcon size={16} className="text-amber-500" />
                                    <span className="fw-semibold small text-light">Areas to Improve</span>
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {aggregatedWeak.length > 0 ? (
                                        aggregatedWeak.map((area, idx) => (
                                            <span key={idx} className="badge-tech badge-pending">
                                                {area}
                                            </span>
                                        ))
                                    ) : (
                                        <>
                                            <span className="badge-tech badge-pending">Database Indexing & Locks</span>
                                            <span className="badge-tech badge-pending">Distributed Concurrency</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-3 rounded-3" style={{ background: "var(--primary-subtle)", border: "1px solid var(--border-subtle)" }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <SparklesIcon size={14} className="text-indigo-400" />
                                <span className="small fw-semibold text-light">Recent AI Evaluator Feedback</span>
                            </div>
                            <p className="text-secondary small mb-0 fst-italic">
                                "{latestResult?.summaryFeedback || "Solid understanding of foundational patterns. Focusing on distributed edge cases will boost your senior rating."}"
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section: Configured Role Tracks */}
            <div id="roles-section" className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h3 className="fw-bold mb-1 text-white">Available Career Tracks</h3>
                        <p className="text-muted small mb-0">Select any track to automatically configure your practice interview</p>
                    </div>
                    <span className="badge-tech badge-indigo">
                        {roles.length > 0 ? `${roles.length} Tracks Configured` : "Preset Tracks Active"}
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading roles...</span>
                        </div>
                        <p className="text-muted mt-3">Loading available assessment tracks...</p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {(roles.length > 0 ? roles : QUICK_PRESETS.map((p, idx) => ({ _id: `preset-${idx}`, title: p.role, description: p.description }))).map((role) => (
                            <div key={role._id} className="col-md-6 col-lg-4">
                                <div className="glass-card glass-card-interactive p-4 h-100 d-flex flex-column justify-content-between">
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <span className="badge-tech badge-cyan">Technical Track</span>
                                            <span className="text-muted small d-flex align-items-center gap-1">
                                                <SparklesIcon size={12} /> AI Evaluated
                                            </span>
                                        </div>
                                        <h5 className="fw-bold mb-2 text-white">{role.title}</h5>
                                        <p className="text-secondary small mb-4" style={{ minHeight: "44px" }}>
                                            {role.description || "Comprehensive technical assessment tailored for modern engineering practices."}
                                        </p>
                                    </div>

                                    <div>
                                        <hr style={{ borderColor: "var(--border-subtle)" }} />
                                        <button
                                            className="btn btn-secondary-dark w-100 d-flex align-items-center justify-content-center gap-2"
                                            onClick={() => handleFocusLaunchpad(role.title, null, "theory")}
                                        >
                                            <span>Practice This Track</span>
                                            <ArrowRightIcon size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
