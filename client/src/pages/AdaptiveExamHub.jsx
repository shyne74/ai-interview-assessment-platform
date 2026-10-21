import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
    ZapIcon,
    BrainIcon,
    SparklesIcon,
    ArrowRightIcon,
    LayersIcon,
    CheckCircleIcon,
    ClockIcon,
    BarChartIcon
} from "../components/icons";
import Toast from "../components/Toast";

const PRESET_ROLES = [
    {
        title: "Backend Developer",
        icon: "⚙️",
        domains: ["Node.js & MongoDB", "Express.js", "Algorithms", "System Design & Microservices", "Database"],
        description: "Evaluates API design, async pipelines, databases, and backend scalability."
    },
    {
        title: "Full Stack Developer",
        icon: "⚡",
        domains: ["React", "Express.js", "React & Node.js", "Database", "Algorithms"],
        description: "Tests frontend state management, REST/GraphQL APIs, and full stack orchestration."
    },
    {
        title: "Software Engineer",
        icon: "💻",
        domains: ["Algorithms", "Data Structures", "Document Analysis", "Python"],
        description: "Deep dive into problem solving, time complexity, and robust code logic."
    },
    {
        title: "AI/ML Engineer",
        icon: "🤖",
        domains: ["Generative AI", "Machine Learning", "Deep Learning", "Python"],
        description: "Assesses LLM architectures, neural embeddings, model fine-tuning, and deployment."
    },
    {
        title: "System Architect",
        icon: "🏛️",
        domains: ["System Design & Microservices", "Distributed Systems", "Database"],
        description: "Focuses on high-availability, fault tolerance, caching, and infrastructure patterns."
    },
    {
        title: "DevOps Engineer",
        icon: "🚀",
        domains: ["CI/CD Pipelines", "Docker & Kubernetes", "Cloud Architecture"],
        description: "Tests containerization, deployment pipelines, infrastructure as code, and observability."
    },
    {
        title: "Philosophy",
        icon: "🧠",
        domains: ["Philosophy of Language & Semantics", "Ancient Greek Philosophy", "Metaphysics & Theology", "Political Philosophy & Natural Rights"],
        description: "Deep conceptual assessment across epistemology, metaphysics, language, and ethics."
    }
];

const DIFFICULTY_LEVELS = [
    {
        level: 1,
        title: "Level 1: Beginner",
        badge: "badge-approved",
        icon: "🌱",
        description: "Foundational definitions, core syntax, and basic principles.",
        startingMultiplier: "1.0x"
    },
    {
        level: 2,
        title: "Level 2: Intermediate",
        badge: "badge-cyan",
        icon: "✨",
        description: "Practical implementations, architectural tradeoffs, and typical workflows.",
        startingMultiplier: "1.5x"
    },
    {
        level: 3,
        title: "Level 3: Advanced",
        badge: "badge-pending",
        icon: "🔥",
        description: "Complex optimizations, concurrency, failure modes, and distributed patterns.",
        startingMultiplier: "2.0x"
    },
    {
        level: 4,
        title: "Level 4: Principal Expert",
        badge: "badge-rejected",
        icon: "⚡",
        description: "Deep architectural edge cases, memory internals, and cross-paradigm depth.",
        startingMultiplier: "3.0x"
    }
];

function AdaptiveExamHub() {
    const navigate = useNavigate();

    const [selectedRole, setSelectedRole] = useState(PRESET_ROLES[0].title);
    const [selectedDomain, setSelectedDomain] = useState(PRESET_ROLES[0].domains[0]);
    const [customDomain, setCustomDomain] = useState("");
    const [startingLevel, setStartingLevel] = useState(2);
    const [targetCount, setTargetCount] = useState(5);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "info" });

    // Update domain when role changes
    useEffect(() => {
        const matched = PRESET_ROLES.find((r) => r.title === selectedRole);
        if (matched && matched.domains.length > 0) {
            setSelectedDomain(matched.domains[0]);
            setCustomDomain("");
        }
    }, [selectedRole]);

    const handleStartExam = async () => {
        const effectiveDomain = customDomain.trim() || selectedDomain;
        try {
            setLoading(true);
            const response = await api.post("/adaptive/start", {
                roleTitle: selectedRole,
                role: selectedRole,
                domain: effectiveDomain,
                startingLevel: Number(startingLevel),
                questionCount: Number(targetCount),
                targetCount: Number(targetCount)
            });

            const interviewId = response.data?.interview?._id || response.data?.interviewId;
            if (!interviewId) {
                throw new Error("Interview session could not be created.");
            }

            try {
                localStorage.setItem("activeInterview", JSON.stringify({
                    id: interviewId,
                    type: "adaptive",
                    roleTitle: selectedRole,
                    domain: effectiveDomain,
                    timestamp: Date.now()
                }));
            } catch (e) {}

            navigate(`/adaptive-interview/${interviewId}`);
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message || "Failed to initialize Adaptive Exam session.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    const currentRoleObj = PRESET_ROLES.find((r) => r.title === selectedRole) || PRESET_ROLES[0];

    return (
        <div className="min-vh-100 tech-grid-bg pb-5">
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            <div className="container py-4 py-md-5">
                {/* Hero Card */}
                <div className="glass-card p-4 p-md-5 mb-4 position-relative overflow-hidden">
                    <div
                        style={{
                            position: "absolute",
                            top: "-60px",
                            right: "-60px",
                            width: "260px",
                            height: "260px",
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, transparent 70%)",
                            pointerEvents: "none"
                        }}
                    />

                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="badge-tech badge-indigo d-inline-flex align-items-center gap-1">
                                    <ZapIcon size={14} className="text-amber-400" /> Dynamic AI Assessment
                                </span>
                                <span className="badge-tech badge-cyan">
                                    Real-time Difficulty Scaling
                                </span>
                            </div>
                            <h1 className="fw-bold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
                                Adaptive AI Interview Assessment
                            </h1>
                            <p className="text-muted mb-0" style={{ maxWidth: "680px" }}>
                                Experience an interview engine that actively scales in real-time. High-scoring answers unlock higher difficulty tiers and bonus multipliers, while constructive diagnostic hints guide you when questions challenge your understanding.
                            </p>
                        </div>

                        <div className="d-flex flex-column gap-2">
                            <button
                                className="btn btn-primary-gradient px-4 py-3 fw-bold fs-6 d-flex align-items-center gap-2 shadow-lg hover-scale"
                                onClick={handleStartExam}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" /> Initializing HUD...
                                    </>
                                ) : (
                                    <>
                                        <ZapIcon size={18} /> Start Adaptive Exam Now <ArrowRightIcon size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    {/* Left Setup Column */}
                    <div className="col-lg-8">
                        {/* 1. Role Selection */}
                        <div className="glass-card p-4 mb-4">
                            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                                <span>1.</span> Select Your Target Role
                            </h5>
                            <div className="row g-2">
                                {PRESET_ROLES.map((r) => {
                                    const isSelected = selectedRole === r.title;
                                    return (
                                        <div key={r.title} className="col-md-6">
                                            <div
                                                className={`p-3 rounded-3 cursor-pointer transition-all ${
                                                    isSelected ? "border-indigo-400 bg-indigo-950 bg-opacity-40" : "bg-dark bg-opacity-50 border-secondary border-opacity-25"
                                                }`}
                                                style={{
                                                    border: isSelected ? "1.5px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.08)",
                                                    cursor: "pointer"
                                                }}
                                                onClick={() => setSelectedRole(r.title)}
                                            >
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span className="fw-bold text-white small fs-6">
                                                        {r.icon} {r.title}
                                                    </span>
                                                    {isSelected && <span className="text-cyan-400 small fw-bold">✓ Active</span>}
                                                </div>
                                                <p className="text-muted small mb-0" style={{ fontSize: "0.78rem" }}>
                                                    {r.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Domain & Starting Difficulty */}
                        <div className="glass-card p-4 mb-4">
                            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                                <span>2.</span> Focus Domain & Question Budget
                            </h5>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className="form-label text-secondary small fw-semibold mb-0">Target Domain</label>
                                        {customDomain.trim() && (
                                            <span className="badge-tech badge-cyan" style={{ fontSize: "0.68rem" }}>
                                                ✨ Custom Active
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        className="form-select form-control-custom mb-2"
                                        value={customDomain.trim() ? "" : selectedDomain}
                                        onChange={(e) => {
                                            setSelectedDomain(e.target.value);
                                            setCustomDomain("");
                                        }}
                                    >
                                        {currentRoleObj.domains.map((dom) => (
                                            <option key={dom} value={dom}>
                                                📂 {dom}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-custom text-white"
                                            placeholder="Or enter custom technology (e.g. Docker, Kafka, Terraform)..."
                                            value={customDomain}
                                            onChange={(e) => setCustomDomain(e.target.value)}
                                        />
                                        {customDomain && (
                                            <button
                                                type="button"
                                                className="btn-icon-ghost position-absolute top-50 end-0 translate-middle-y me-2"
                                                onClick={() => setCustomDomain("")}
                                                style={{ color: "#94a3b8" }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    {customDomain.trim() && (
                                        <div className="text-cyan-400 small mt-1" style={{ fontSize: "0.75rem" }}>
                                            ✨ AI will dynamically generate questions for <strong>{customDomain.trim()}</strong>.
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-secondary small fw-semibold">Question Count</label>
                                    <select
                                        className="form-select form-control-custom"
                                        value={targetCount}
                                        onChange={(e) => setTargetCount(Number(e.target.value))}
                                    >
                                        <option value={3}>3 Questions (Quick Sprint - 5 mins)</option>
                                        <option value={5}>5 Questions (Standard Assessment - 10 mins)</option>
                                        <option value={8}>8 Questions (In-depth Evaluation - 18 mins)</option>
                                        <option value={10}>10 Questions (Comprehensive Exam - 25 mins)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Starting Tier Selection */}
                        <div className="glass-card p-4">
                            <h5 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                                <span>3.</span> Starting Difficulty Tier
                            </h5>
                            <div className="row g-3">
                                {DIFFICULTY_LEVELS.map((lvl) => {
                                    const isSelected = startingLevel === lvl.level;
                                    return (
                                        <div key={lvl.level} className="col-md-6">
                                            <div
                                                className={`p-3 rounded-3 h-100 transition-all ${
                                                    isSelected ? "bg-indigo-950 bg-opacity-40" : "bg-dark bg-opacity-50"
                                                }`}
                                                style={{
                                                    border: isSelected ? "1.5px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.08)",
                                                    cursor: "pointer"
                                                }}
                                                onClick={() => setStartingLevel(lvl.level)}
                                            >
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-white small">
                                                        {lvl.icon} {lvl.title}
                                                    </span>
                                                    <span className={`badge-tech ${lvl.badge}`} style={{ fontSize: "0.68rem" }}>
                                                        {lvl.startingMultiplier} Multiplier
                                                    </span>
                                                </div>
                                                <p className="text-muted small mb-0" style={{ fontSize: "0.8rem" }}>
                                                    {lvl.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Summary & Rules HUD Column */}
                    <div className="col-lg-4">
                        <div className="glass-card p-4 mb-4">
                            <h6 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                                <BrainIcon size={18} className="text-cyan-400" /> Adaptive Rules Engine
                            </h6>

                            <div className="d-flex flex-column gap-3 mb-4">
                                <div className="d-flex gap-3 align-items-start">
                                    <div className="p-2 rounded-circle bg-indigo-500 bg-opacity-20 text-indigo-300">
                                        <ZapIcon size={16} />
                                    </div>
                                    <div>
                                        <span className="text-white fw-semibold small d-block">Real-time Level Scaling</span>
                                        <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                                            Scores ≥ 7.0 automatically level up the next challenge; scores &lt; 5.0 step down to reinforce core fundamentals.
                                        </span>
                                    </div>
                                </div>

                                <div className="d-flex gap-3 align-items-start">
                                    <div className="p-2 rounded-circle bg-emerald-500 bg-opacity-20 text-emerald-300">
                                        <SparklesIcon size={16} />
                                    </div>
                                    <div>
                                        <span className="text-white fw-semibold small d-block">Streak Bonus Multipliers</span>
                                        <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                                            Maintain consecutive high-scoring submissions to trigger up to a 3.0x bonus score multiplier.
                                        </span>
                                    </div>
                                </div>

                                <div className="d-flex gap-3 align-items-start">
                                    <div className="p-2 rounded-circle bg-cyan-500 bg-opacity-20 text-cyan-300">
                                        <BarChartIcon size={16} />
                                    </div>
                                    <div>
                                        <span className="text-white fw-semibold small d-block">AI Diagnostic Breakdown</span>
                                        <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                                            Receive immediate actionable feedback, identified strengths, and recommended targeted study concepts.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <hr style={{ borderColor: "var(--border-subtle)" }} className="my-3" />

                            {/* Launch CTA */}
                            <button
                                className="btn btn-primary-gradient w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                                onClick={handleStartExam}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" /> Starting Session...
                                    </>
                                ) : (
                                    <>
                                        <ZapIcon size={18} /> Launch Adaptive Exam
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdaptiveExamHub;
