import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    ZapIcon
} from "../components/icons";
import Toast from "../components/Toast";

function Dashboard() {
    const [roles, setRoles] = useState([]);
    const [pastResults, setPastResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startingRole, setStartingRole] = useState(null);
    const [selectedDomain, setSelectedDomain] = useState("React");
    const [questionCount, setQuestionCount] = useState(5);
    const [assessmentType, setAssessmentType] = useState("theory");
    const [launching, setLaunching] = useState(false);
    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "info"
    });

    const navigate = useNavigate();
    const username = localStorage.getItem("username") || "Candidate";

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
                console.log(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const totalInterviews = pastResults.length;

    const avgScore = totalInterviews > 0
        ? (
            pastResults.reduce(
                (acc, r) => acc + (r.overallScore || 0),
                0
            ) / totalInterviews
        ).toFixed(1)
        : null;

    const aggregatedStrong = Array.from(
        new Set(pastResults.flatMap(r => r.strongAreas || []))
    ).slice(0, 6);

    const aggregatedWeak = Array.from(
        new Set(pastResults.flatMap(r => r.weakAreas || []))
    ).slice(0, 6);

    const latestResult = pastResults[0];

    const skillsList = [
        { name: "React", percent: 85, color: "progress-bar-custom" },
        { name: "JavaScript", percent: 82, color: "progress-bar-emerald" },
        { name: "Node.js", percent: 74, color: "progress-bar-custom" },
        { name: "Database (SQL / Mongo)", percent: 68, color: "progress-bar-amber" },
        { name: "System Design", percent: 61, color: "progress-bar-rose" }
    ];

    const handleOpenLaunchModal = (role) => {
        setStartingRole(role);

        if (
            role.title.toLowerCase().includes("node") ||
            role.title.toLowerCase().includes("backend")
        ) {
            setSelectedDomain("Node.js");
        } else {
            setSelectedDomain("React");
        }

        setAssessmentType("theory");
        setQuestionCount(5);
    };

    const [adaptiveLoading, setAdaptiveLoading] = useState(false);

    const handleStartAdaptive = async () => {
        if (!startingRole || !selectedDomain) {
            setToast({
                show: true,
                message: "Please select a role and domain first",
                type: "warning"
            });
            return;
        }

        try {
            setAdaptiveLoading(true);

            const response = await api.post("/adaptive/start", {
                roleTitle: startingRole.title,
                domain: selectedDomain,
                difficulty: "medium",
                questionCount: 5
            });

            navigate(`/adaptive-interview/${response.data.interviewId}`);
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message,
                type: "error"
            });

            setAdaptiveLoading(false);
        }
    };

    const handleStartInterview = async () => {
        if (!startingRole) return;

        setLaunching(true);

        try {
            const response = await api.post("/interviews", {
                roleTitle: startingRole.title,
                domain: selectedDomain,
                limit: Number(questionCount),
                assessmentType: assessmentType
            });

            setToast({
                show: true,
                message: "Interview created! Redirecting to test room...",
                type: "success"
            });

            setTimeout(() => {
                navigate(`/interview/${response.data.interviewId}`, {
                    state: {
                        questions: response.data.questions
                    }
                });
            }, 600);

        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.message ||
                "Failed to start interview. Try a different topic or generate questions in question bank.";

            setToast({
                show: true,
                message: msg,
                type: "error"
            });

            setLaunching(false);
        }
    };

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

                <div className="glass-card p-4 p-md-5 mb-5 position-relative overflow-hidden">

                    <div
                        style={{
                            position: "absolute",
                            top: "-40px",
                            right: "-40px",
                            width: "240px",
                            height: "240px",
                            borderRadius: "50%",
                            background:
                                "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)",
                            pointerEvents: "none"
                        }}
                    />

                    <div className="row align-items-center">

                        <div className="col-lg-8">

                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="badge-tech badge-indigo">
                                    <SparklesIcon size={14} /> AI Assessment Room
                                </span>
                            </div>

                            <h1
                                className="fw-bold text-white mb-2"
                                style={{ letterSpacing: "-0.02em" }}
                            >
                                Welcome back, {username}! 👋
                            </h1>

                            <p
                                className="text-muted mb-4 fs-6"
                                style={{ maxWidth: "620px" }}
                            >
                                Ready for your next technical challenge? Select a job role below to take a structured technical interview evaluated by our AI engine.
                            </p>

                            <div className="d-flex flex-wrap gap-3">

                                <a
                                    href="#roles-section"
                                    className="btn btn-primary-gradient"
                                >
                                    <BrainIcon size={18} /> Start New Interview
                                </a>

                                <button
                                    onClick={() => navigate("/history")}
                                    className="btn btn-secondary-dark"
                                >
                                    <ClockIcon size={18} /> View Past Submissions
                                </button>

                            </div>

                        </div>

                        <div className="col-lg-4 mt-4 mt-lg-0 text-center">

                            <div
                                className="p-4 rounded-4 d-inline-block text-center"
                                style={{
                                    background: "rgba(15, 23, 42, 0.6)",
                                    border: "1px solid var(--border-subtle)",
                                    minWidth: "200px"
                                }}
                            >

                                <span className="text-muted small text-uppercase fw-semibold letter-spacing-1">
                                    Performance Index
                                </span>

                                <div className="display-4 fw-bold text-white my-1">
                                    {avgScore !== null ? `${avgScore}/10` : "78%"}
                                </div>

                                <span className="badge-tech badge-approved">
                                    <TrophyIcon size={12} />
                                    {avgScore !== null ? "Evaluated" : "Benchmark Level"}
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

                <div className="row g-4 mb-5">

                    <div className="col-lg-7">

                        <div className="glass-card p-4 h-100">

                            <div className="d-flex align-items-center justify-content-between mb-4">

                                <div>
                                    <h4 className="fw-bold text-white mb-1">
                                        Skill Performance Analysis
                                    </h4>

                                    <p className="text-muted small mb-0">
                                        Evaluated across technical correctness, domain depth, and architecture
                                    </p>
                                </div>

                                <div className="text-end">
                                    <span className="badge-tech badge-indigo">
                                        Overall: 78%
                                    </span>
                                </div>

                            </div>

                            <div className="d-flex flex-column gap-3">

                                {skillsList.map((skill) => (

                                    <div key={skill.name}>

                                        <div className="d-flex justify-content-between align-items-center mb-1">

                                            <span className="text-secondary fw-semibold small">
                                                {skill.name}
                                            </span>

                                            <span className="text-white fw-bold small">
                                                {skill.percent}%
                                            </span>

                                        </div>

                                        <div className="progress-container">

                                            <div
                                                className={`progress-bar-custom ${skill.color}`}
                                                style={{
                                                    width: `${skill.percent}%`
                                                }}
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

                                <h4 className="fw-bold text-white mb-1">
                                    AI Competency Insights
                                </h4>

                                <p className="text-muted small mb-3">
                                    Synthesized strengths and growth recommendations
                                </p>

                                <div className="mb-4">

                                    <div className="d-flex align-items-center gap-2 mb-2">

                                        <span className="text-emerald-400">
                                            <CheckCircleIcon
                                                size={16}
                                                className="text-emerald-400"
                                            />
                                        </span>

                                        <span className="text-white fw-semibold small">
                                            Strong Areas
                                        </span>

                                    </div>

                                    <div className="d-flex flex-wrap gap-2">

                                        {aggregatedStrong.length > 0 ? (

                                            aggregatedStrong.map((area, idx) => (
                                                <span
                                                    key={idx}
                                                    className="badge-tech badge-approved"
                                                >
                                                    {area}
                                                </span>
                                            ))

                                        ) : (

                                            <>
                                                <span className="badge-tech badge-approved">
                                                    React Hooks & Lifecycle
                                                </span>

                                                <span className="badge-tech badge-approved">
                                                    RESTful API Design
                                                </span>

                                                <span className="badge-tech badge-approved">
                                                    Component Architecture
                                                </span>
                                            </>

                                        )}

                                    </div>

                                </div>

                                <div className="mb-3">

                                    <div className="d-flex align-items-center gap-2 mb-2">

                                        <span className="text-amber-400">
                                            <AlertTriangleIcon
                                                size={16}
                                                className="text-amber-400"
                                            />
                                        </span>

                                        <span className="text-white fw-semibold small">
                                            Areas to Improve
                                        </span>

                                    </div>

                                    <div className="d-flex flex-wrap gap-2">

                                        {aggregatedWeak.length > 0 ? (

                                            aggregatedWeak.map((area, idx) => (
                                                <span
                                                    key={idx}
                                                    className="badge-tech badge-pending"
                                                >
                                                    {area}
                                                </span>
                                            ))

                                        ) : (

                                            <>
                                                <span className="badge-tech badge-pending">
                                                    Database Indexing
                                                </span>

                                                <span className="badge-tech badge-pending">
                                                    Edge Case Handling
                                                </span>

                                                <span className="badge-tech badge-pending">
                                                    System Concurrency
                                                </span>
                                            </>

                                        )}

                                    </div>

                                </div>

                            </div>

                            <div
                                className="p-3 rounded-3"
                                style={{
                                    background: "rgba(15, 23, 42, 0.7)",
                                    border: "1px solid var(--border-subtle)"
                                }}
                            >

                                <div className="d-flex align-items-center gap-2 mb-1">

                                    <SparklesIcon
                                        size={14}
                                        className="text-indigo-400"
                                    />

                                    <span className="text-muted small fw-semibold">
                                        Recent AI Feedback
                                    </span>

                                </div>

                                <p className="text-secondary small mb-0 fst-italic">
                                    "{latestResult?.summaryFeedback || "Solid understanding of core concepts. Providing more practical edge-case solutions will elevate your rating to senior level."}"
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

                <div id="roles-section">

                    <div className="d-flex justify-content-between align-items-center mb-4">

                        <div>
                            <h3 className="fw-bold text-white mb-1">
                                Select an Interview Role
                            </h3>

                            <p className="text-muted small mb-0">
                                Choose a position to generate your custom interview challenge
                            </p>
                        </div>

                        <span className="badge-tech badge-indigo">
                            {roles.length} Available Roles
                        </span>

                    </div>

                    {loading ? (

                        <div className="text-center py-5">

                            <div
                                className="spinner-border text-primary"
                                role="status"
                            >
                                <span className="visually-hidden">
                                    Loading roles...
                                </span>
                            </div>

                            <p className="text-muted mt-3">
                                Loading available interview roles...
                            </p>

                        </div>

                    ) : roles.length === 0 ? (

                        <div className="glass-card p-5 text-center">

                            <BriefcaseIcon
                                size={40}
                                className="text-muted mb-3"
                            />

                            <h4 className="text-white fw-bold mb-2">
                                No roles available yet
                            </h4>

                            <p className="text-muted small mb-4">
                                Roles will appear here once created by an administrator in the Admin Dashboard.
                            </p>

                            <button
                                onClick={() => navigate("/admin-dashboard")}
                                className="btn btn-primary-gradient"
                            >
                                Open Admin Roles Panel
                            </button>

                        </div>

                    ) : (

                        <div className="row g-4">

                            {roles.map((role) => (

                                <div
                                    key={role._id}
                                    className="col-md-6 col-lg-4"
                                >

                                    <div className="glass-card glass-card-interactive p-4 h-100 d-flex flex-column justify-content-between">

                                        <div>

                                            <div className="d-flex justify-content-between align-items-center mb-3">

                                                <span className="badge-tech badge-cyan">
                                                    Technical
                                                </span>

                                                <span className="text-muted small d-flex align-items-center gap-1">
                                                    <SparklesIcon size={12} />
                                                    AI Evaluated
                                                </span>

                                            </div>

                                            <h4 className="fw-bold text-white mb-2">
                                                {role.title}
                                            </h4>

                                            <p
                                                className="text-muted small mb-4"
                                                style={{ minHeight: "44px" }}
                                            >
                                                {role.description ||
                                                    "Comprehensive technical assessment tailored for modern engineering practices."}
                                            </p>

                                        </div>

                                        <div>

                                            <hr
                                                style={{
                                                    borderColor:
                                                        "var(--border-subtle)"
                                                }}
                                            />

                                            <button
                                                className="btn btn-primary-gradient w-100"
                                                onClick={() =>
                                                    handleOpenLaunchModal(role)
                                                }
                                            >
                                                Configure & Start
                                                <ArrowRightIcon size={16} />
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>

                    )}

                </div>

                {startingRole && (

                    <div className="modal-backdrop-custom">

                        <div className="modal-content-custom p-4 p-md-5">

                            <div className="d-flex justify-content-between align-items-start mb-4">

                                <div>

                                    <span className="badge-tech badge-indigo mb-2">
                                        Configure Assessment
                                    </span>

                                    <h3 className="fw-bold text-white mb-1">
                                        {startingRole.title}
                                    </h3>

                                    <p className="text-muted small mb-0">
                                        Customize your interview parameters before beginning
                                    </p>

                                </div>

                                <button
                                    className="btn-close btn-close-white"
                                    onClick={() => setStartingRole(null)}
                                    disabled={launching}
                                />

                            </div>

                            <div className="mb-4">

                                <label className="form-label text-secondary small fw-semibold">
                                    Target Domain / Topic
                                </label>

                                <div className="row g-2 mb-2">

                                    {[
                                        "React",
                                        "Node.js",
                                        "MongoDB",
                                        "JavaScript",
                                        "System Design",
                                        "Algorithms"
                                    ].map((dom) => (

                                        <div
                                            key={dom}
                                            className="col-4"
                                        >

                                            <button
                                                type="button"
                                                className={`btn btn-sm w-100 ${
                                                    selectedDomain === dom
                                                        ? "btn-primary-gradient"
                                                        : "btn-secondary-dark"
                                                }`}
                                                style={{
                                                    fontSize: "0.825rem"
                                                }}
                                                onClick={() =>
                                                    setSelectedDomain(dom)
                                                }
                                            >
                                                {dom}
                                            </button>

                                        </div>

                                    ))}

                                </div>

                                <input
                                    type="text"
                                    className="form-control form-control-custom mt-2"
                                    placeholder="Or type custom topic (e.g. React, Express)"
                                    value={selectedDomain}
                                    onChange={(e) =>
                                        setSelectedDomain(e.target.value)
                                    }
                                />

                            </div>

                            <div className="mb-4">

                                <label className="form-label text-secondary small fw-semibold">
                                    Number of Questions
                                </label>

                                <div className="d-flex gap-3">

                                    {[3, 5, 10].map((count) => (

                                        <button
                                            key={count}
                                            type="button"
                                            className={`btn flex-grow-1 ${
                                                questionCount === count
                                                    ? "btn-primary-gradient"
                                                    : "btn-secondary-dark"
                                            }`}
                                            onClick={() =>
                                                setQuestionCount(count)
                                            }
                                        >
                                            {count} Questions
                                        </button>

                                    ))}

                                </div>

                            </div>

                            <div className="mb-4">

                                <label className="form-label text-secondary small fw-semibold">
                                    Assessment Type
                                </label>

                                <div className="d-flex gap-3">

                                    {["theory", "coding", "mixed"].map((type) => (

                                        <button
                                            key={type}
                                            type="button"
                                            className={`btn flex-grow-1 ${
                                                assessmentType === type
                                                    ? "btn-primary-gradient"
                                                    : "btn-secondary-dark"
                                            }`}
                                            onClick={() =>
                                                setAssessmentType(type)
                                            }
                                        >
                                            {type === "theory"
                                                ? "Theory"
                                                : type === "coding"
                                                ? "Coding"
                                                : "Mixed (Coding + Theory)"}
                                        </button>

                                    ))}

                                </div>

                            </div>

                            <div
                                className="p-3 rounded-3 mb-4"
                                style={{
                                    background:
                                        "rgba(99, 102, 241, 0.08)",
                                    border:
                                        "1px solid rgba(99, 102, 241, 0.2)"
                                }}
                            >

                                <div className="d-flex gap-2 text-muted small">

                                    <SparklesIcon
                                        size={18}
                                        className="text-indigo-400 flex-shrink-0"
                                    />

                                    <span>
                                        Questions are drawn from the question
                                        bank matching{" "}
                                        <strong>{startingRole.title}</strong>{" "}
                                        and domain{" "}
                                        <strong>{selectedDomain}</strong>.
                                    </span>

                                </div>

                            </div>

                            <div className="d-flex gap-3">

                                <button
                                    className="btn btn-secondary-dark flex-grow-1"
                                    onClick={() => setStartingRole(null)}
                                    disabled={launching}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="btn btn-primary-gradient flex-grow-1"
                                    onClick={handleStartInterview}
                                    disabled={launching}
                                >

                                    {launching ? (

                                        <>
                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                            />
                                            Initializing...
                                        </>

                                    ) : (

                                        <>
                                            Begin Interview
                                            <ArrowRightIcon size={16} />
                                        </>

                                    )}

                                </button>

                            </div>

                        </div>

                    </div>

                )}

            </div>

        </div>
    );
}

export default Dashboard;