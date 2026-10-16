import { useEffect, useState, useMemo } from "react";
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
    ZapIcon,
    CodeIcon,
    FileTextIcon,
    CheckIcon
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
    const username = localStorage.getItem("username") || "Jordan";

    // Dynamic greeting based on time of day
    const greetingText = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return `Good morning, ${username}`;
        if (hour < 18) return `Good afternoon, ${username}`;
        return `Good evening, ${username}`;
    }, [username]);

    // Current formatted date
    const todayFormatted = useMemo(() => {
        return new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric"
        }).toUpperCase();
    }, []);

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
        { name: "React & Modern Frontend", percent: 85, color: "progress-bar-custom" },
        { name: "JavaScript / TypeScript", percent: 82, color: "progress-bar-emerald" },
        { name: "Node.js & Backend Architecture", percent: 74, color: "progress-bar-custom" },
        { name: "Database & Data Modeling", percent: 68, color: "progress-bar-amber" },
        { name: "System Design & Scalability", percent: 61, color: "progress-bar-rose" }
    ];

    const handleOpenLaunchModal = (role, defaultAssessment = "theory", defaultDomain = null) => {
        setStartingRole(role);
        if (defaultDomain) {
            setSelectedDomain(defaultDomain);
        } else if (
            role.title.toLowerCase().includes("node") ||
            role.title.toLowerCase().includes("backend")
        ) {
            setSelectedDomain("Node.js");
        } else {
            setSelectedDomain("React");
        }
        setAssessmentType(defaultAssessment);
        setQuestionCount(5);
    };

    const handleQuickPractice = () => {
        if (roles.length > 0) {
            handleOpenLaunchModal(roles[0], "theory");
        } else {
            navigate("/adaptive-exam");
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
                message: "Interview generated! Entering evaluation room...",
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
        <div className="pb-5">
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            {/* Header Greeting matching Figma design */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <div className="text-muted fw-bold small mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.08em" }}>
                        {todayFormatted}
                    </div>
                    <h1 className="fw-bold mb-1" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
                        {greetingText}
                    </h1>
                    <p className="text-secondary mb-0">
                        You're making great progress. Ready for your next challenge?
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        onClick={handleQuickPractice}
                        className="btn btn-primary-gradient px-4 py-2"
                        title="Start instant practice session"
                    >
                        <ZapIcon size={16} /> Quick practice
                    </button>
                </div>
            </div>

            {/* Two-Card Hero Row (Upcoming Interview + Progress Card) */}
            <div className="row g-4 mb-5">
                {/* Hero: Upcoming Interview Card */}
                <div className="col-lg-7">
                    <div className="hero-interview-card p-4 p-md-5 h-100 d-flex flex-column justify-content-between position-relative">
                        <div className="hero-radar-bg" />

                        <div className="position-relative z-1">
                            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-3" style={{ background: "rgba(255, 255, 255, 0.12)", backdropFilter: "blur(4px)" }}>
                                <span className="status-dot-pulse" style={{ width: "8px", height: "8px" }} />
                                <span className="fw-bold small text-uppercase" style={{ fontSize: "0.72rem", letterSpacing: "0.08em" }}>
                                    Upcoming Interview
                                </span>
                            </div>

                            <div className="text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: "0.06em", color: "#a5b4fc" }}>
                                {roles[0]?.title || "Full Stack Developer"} · Technical Round
                            </div>

                            <h2 className="fw-bold mb-3" style={{ fontSize: "2.2rem", letterSpacing: "-0.02em" }}>
                                Acme Inc.
                            </h2>

                            <div className="d-flex align-items-center gap-2 text-light small mb-4 opacity-75">
                                <ClockIcon size={16} />
                                <span>Tomorrow, 10:30 AM · 45 minutes</span>
                            </div>
                        </div>

                        <div className="position-relative z-1 pt-2">
                            <button
                                className="btn btn-light fw-bold px-4 py-2 text-dark rounded-3 d-inline-flex align-items-center gap-2 shadow-sm"
                                onClick={() => {
                                    if (roles.length > 0) {
                                        handleOpenLaunchModal(roles[0]);
                                    } else {
                                        navigate("/adaptive-exam");
                                    }
                                }}
                            >
                                Prepare now <ArrowRightIcon size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: This Week Progress Card */}
                <div className="col-lg-5">
                    <div className="glass-card p-4 p-md-5 h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <span className="text-muted small text-uppercase fw-bold letter-spacing-1" style={{ fontSize: "0.72rem" }}>
                                        This Week
                                    </span>
                                    <h4 className="fw-bold mb-0">Your progress</h4>
                                </div>
                                <span className="badge-tech badge-approved">
                                    +12%
                                </span>
                            </div>

                            <div className="d-flex align-items-center gap-4 mb-4">
                                <div className="score-circle-modern flex-shrink-0">
                                    <span className="display-6 fw-bold" style={{ lineHeight: 1 }}>
                                        {avgScore !== null ? Math.round(avgScore * 10) : 82}
                                    </span>
                                    <span className="text-muted small" style={{ fontSize: "0.68rem", textTransform: "uppercase" }}>
                                        Score
                                    </span>
                                </div>

                                <div className="d-flex flex-column gap-2 flex-grow-1">
                                    <div>
                                        <div className="text-muted small">Interviews</div>
                                        <div className="fw-bold fs-5">
                                            {totalInterviews > 0 ? `${totalInterviews} completed` : "4 completed"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted small">Practice time</div>
                                        <div className="fw-bold fs-5">
                                            {totalInterviews > 0 ? `${(totalInterviews * 0.7).toFixed(1)}h` : "2h 40m"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-top border-secondary border-opacity-25 d-flex align-items-center gap-2 text-success small fw-semibold">
                            <CheckIcon size={16} />
                            <span>Your clarity score improved this week</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Practice Library Section matching Figma */}
            <div className="mb-5">
                <div className="mb-3">
                    <span className="text-muted small text-uppercase fw-bold" style={{ fontSize: "0.72rem", letterSpacing: "0.08em" }}>
                        Practice Library
                    </span>
                    <h3 className="fw-bold mb-1">Choose your next challenge</h3>
                </div>

                <div className="row g-4">
                    {/* Behavioral Card */}
                    <div className="col-md-4">
                        <div
                            className="practice-card"
                            onClick={() => {
                                if (roles.length > 0) handleOpenLaunchModal(roles[0], "theory", "Behavioral & Leadership");
                                else navigate("/adaptive-exam");
                            }}
                        >
                            <div>
                                <div className="practice-icon-box" style={{ background: "rgba(91, 91, 255, 0.12)", color: "#5b5bff" }}>
                                    <FileTextIcon size={22} />
                                </div>
                                <h5 className="fw-bold mb-2">Behavioral</h5>
                                <p className="text-secondary small mb-0">
                                    Build confident, structured answers with the STAR framework.
                                </p>
                            </div>
                            <div className="practice-explore-link">
                                Explore scenarios <ArrowRightIcon size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Technical Card */}
                    <div className="col-md-4">
                        <div
                            className="practice-card"
                            onClick={() => {
                                if (roles.length > 0) handleOpenLaunchModal(roles[0], "mixed", "Algorithms & Architecture");
                                else navigate("/adaptive-exam");
                            }}
                        >
                            <div>
                                <div className="practice-icon-box" style={{ background: "rgba(0, 217, 255, 0.12)", color: "#00d9ff" }}>
                                    <CodeIcon size={22} />
                                </div>
                                <h5 className="fw-bold mb-2">Technical</h5>
                                <p className="text-secondary small mb-0">
                                    Explain your thinking under pressure with live code evaluation.
                                </p>
                            </div>
                            <div className="practice-explore-link">
                                Explore scenarios <ArrowRightIcon size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Case Study Card */}
                    <div className="col-md-4">
                        <div
                            className="practice-card"
                            onClick={() => {
                                if (roles.length > 0) handleOpenLaunchModal(roles[0], "theory", "System Architecture & Strategy");
                                else navigate("/adaptive-exam");
                            }}
                        >
                            <div>
                                <div className="practice-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
                                    <BarChartIcon size={22} />
                                </div>
                                <h5 className="fw-bold mb-2">Case study</h5>
                                <p className="text-secondary small mb-0">
                                    Solve ambiguous business problems and design scalable systems.
                                </p>
                            </div>
                            <div className="practice-explore-link">
                                Explore scenarios <ArrowRightIcon size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Analysis & AI Insights Grid */}
            <div className="row g-4 mb-5">
                <div className="col-lg-7">
                    <div className="glass-card p-4 h-100">
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <div>
                                <h4 className="fw-bold mb-1">Skill Performance Analysis</h4>
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
                                        <span className="fw-bold small">{skill.percent}%</span>
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
                            <h4 className="fw-bold mb-1">AI Competency Insights</h4>
                            <p className="text-muted small mb-3">Synthesized strengths and growth recommendations</p>

                            <div className="mb-4">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <CheckCircleIcon size={16} className="text-emerald-500" />
                                    <span className="fw-semibold small">Strong Areas</span>
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
                                    <span className="fw-semibold small">Areas to Improve</span>
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
                                <SparklesIcon size={14} className="text-indigo-500" />
                                <span className="small fw-semibold">Recent AI Evaluator Feedback</span>
                            </div>
                            <p className="text-secondary small mb-0 fst-italic">
                                "{latestResult?.summaryFeedback || "Solid understanding of foundational patterns. Focusing on distributed edge cases will boost your senior rating."}"
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Target Roles Section (100% features intact) */}
            <div id="roles-section" className="mb-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h3 className="fw-bold mb-1">Available Interview Roles</h3>
                        <p className="text-muted small mb-0">Select any position to configure a tailored technical evaluation</p>
                    </div>
                    <span className="badge-tech badge-indigo">
                        {roles.length} Roles Active
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading roles...</span>
                        </div>
                        <p className="text-muted mt-3">Loading available assessment tracks...</p>
                    </div>
                ) : roles.length === 0 ? (
                    <div className="glass-card p-5 text-center">
                        <BriefcaseIcon size={40} className="text-muted mb-3" />
                        <h4 className="fw-bold mb-2">No roles configured</h4>
                        <p className="text-muted small mb-4">
                            New roles can be configured from the Administration panel.
                        </p>
                        <button onClick={() => navigate("/roles")} className="btn btn-primary-gradient">
                            Open Roles Manager
                        </button>
                    </div>
                ) : (
                    <div className="row g-4">
                        {roles.map((role) => (
                            <div key={role._id} className="col-md-6 col-lg-4">
                                <div className="glass-card glass-card-interactive p-4 h-100 d-flex flex-column justify-content-between">
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <span className="badge-tech badge-cyan">Technical</span>
                                            <span className="text-muted small d-flex align-items-center gap-1">
                                                <SparklesIcon size={12} /> AI Evaluated
                                            </span>
                                        </div>
                                        <h4 className="fw-bold mb-2">{role.title}</h4>
                                        <p className="text-secondary small mb-4" style={{ minHeight: "44px" }}>
                                            {role.description || "Comprehensive technical assessment tailored for modern engineering practices."}
                                        </p>
                                    </div>

                                    <div>
                                        <hr style={{ borderColor: "var(--border-subtle)" }} />
                                        <button
                                            className="btn btn-primary-gradient w-100"
                                            onClick={() => handleOpenLaunchModal(role)}
                                        >
                                            Configure & Start <ArrowRightIcon size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Interactive Assessment Configuration Modal */}
            {startingRole && (
                <div className="modal-backdrop-custom">
                    <div className="modal-content-custom p-4 p-md-5">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                                <span className="badge-tech badge-indigo mb-2">Configure Assessment</span>
                                <h3 className="fw-bold mb-1">{startingRole.title}</h3>
                                <p className="text-muted small mb-0">Customize your interview parameters before beginning</p>
                            </div>
                            <button
                                className="btn-icon-ghost"
                                onClick={() => setStartingRole(null)}
                                disabled={launching}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Domain Selection */}
                        <div className="mb-4">
                            <label className="form-label text-secondary small fw-semibold">Target Domain / Topic</label>
                            <div className="row g-2 mb-2">
                                {["React", "Node.js", "MongoDB", "JavaScript", "System Design", "Algorithms"].map((dom) => (
                                    <div key={dom} className="col-4">
                                        <button
                                            type="button"
                                            className={`btn btn-sm w-100 ${
                                                selectedDomain === dom ? "btn-primary-gradient" : "btn-secondary-dark"
                                            }`}
                                            style={{ fontSize: "0.825rem" }}
                                            onClick={() => setSelectedDomain(dom)}
                                        >
                                            {dom}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                className="form-control form-control-custom mt-2"
                                placeholder="Or enter custom topic (e.g. Express, Docker)"
                                value={selectedDomain}
                                onChange={(e) => setSelectedDomain(e.target.value)}
                            />
                        </div>

                        {/* Question Count */}
                        <div className="mb-4">
                            <label className="form-label text-secondary small fw-semibold">Number of Questions</label>
                            <div className="d-flex gap-2">
                                {[3, 5, 8, 10].map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        className={`btn flex-grow-1 ${
                                            questionCount === count ? "btn-primary-gradient" : "btn-secondary-dark"
                                        }`}
                                        onClick={() => setQuestionCount(count)}
                                    >
                                        {count} Qs
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Assessment Type */}
                        <div className="mb-4">
                            <label className="form-label text-secondary small fw-semibold">Assessment Mode</label>
                            <div className="d-flex gap-2">
                                {["theory", "coding", "mixed"].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`btn flex-grow-1 ${
                                            assessmentType === type ? "btn-primary-gradient" : "btn-secondary-dark"
                                        }`}
                                        onClick={() => setAssessmentType(type)}
                                    >
                                        {type === "theory" ? "Theory" : type === "coding" ? "Coding" : "Mixed"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 rounded-3 mb-4" style={{ background: "var(--primary-subtle)", border: "1px solid var(--border-subtle)" }}>
                            <div className="d-flex gap-2 text-secondary small">
                                <SparklesIcon size={18} className="text-indigo-500 flex-shrink-0" />
                                <span>
                                    Questions will be drawn from the question bank matching <strong>{startingRole.title}</strong> in domain <strong>{selectedDomain}</strong>.
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
                                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                                        Preparing Room...
                                    </>
                                ) : (
                                    <>
                                        Begin Interview <ArrowRightIcon size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;