import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import {
    BrainIcon,
    ClockIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    AlertTriangleIcon,
    FileTextIcon,
    SparklesIcon,
    CodeIcon,
    ShieldIcon
} from "../components/icons";
import Toast from "../components/Toast";
import { cleanStatement } from "../utils/formatters";
import { useExamIntegrity } from "../hooks/useExamIntegrity";

function Interview() {
    const { id } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState(state?.questions || []);
    const [loadingSession, setLoadingSession] = useState(questions.length === 0);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [answers, setAnswers] = useState(
        (state?.questions || []).map((q) => ({
            questionId: q._id,
            userAnswer: "",
            code: (q.assessmentType === "coding" || q.type === "coding") ? "" : undefined,
            language: "javascript",
            telemetry: {}
        }))
    );

    const [remainingSeconds, setRemainingSeconds] = useState(1800);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [evalStep, setEvalStep] = useState(1);
    const [toast, setToast] = useState({ show: false, message: "", type: "info" });
    const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [activeWorkspaceMode, setActiveWorkspaceMode] = useState(null); // null (auto) | "text" | "code"

    const answersRef = useRef(answers);
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    const isSubmittedRef = useRef(isSubmitted);
    useEffect(() => {
        isSubmittedRef.current = isSubmitted;
    }, [isSubmitted]);

    // Auto-submit callback triggered by integrity violation or server expiry
    const handleAutoSubmit = useCallback(async (reason) => {
        if (isSubmittedRef.current) return;
        setIsSubmitted(true);
        setEvaluating(true);
        try {
            await api.post(`/interviews/${id}/submit`, {
                answers: answersRef.current,
                reason: reason === "integrity_violation" ? "auto-submitted: integrity violation" : "auto-submitted: time expired"
            });
            await api.post(`/results/${id}/analyze`);
            localStorage.removeItem("activeInterview");
            navigate(`/results/${id}`, { replace: true });
        } catch (err) {
            localStorage.removeItem("activeInterview");
            navigate(`/results/${id}`, { replace: true });
        }
    }, [id, navigate]);

    // Exam integrity hook
    const integrity = useExamIntegrity({
        examId: id,
        examType: "interview",
        currentQuestionIndex: currentIndex,
        maxViolations: 2,
        isCompleted: isSubmitted || isReadOnly,
        isStarted: hasStartedFullscreen,
        onAutoSubmit: handleAutoSubmit
    });

    // History guard to lock navigation after submission
    useEffect(() => {
        if (isSubmitted || isReadOnly) {
            window.history.replaceState(null, "", `/results/${id}`);
            const handlePopState = (e) => {
                e.preventDefault();
                navigate(`/results/${id}`, { replace: true });
            };
            window.addEventListener("popstate", handlePopState);
            return () => window.removeEventListener("popstate", handlePopState);
        }
    }, [isSubmitted, isReadOnly, id, navigate]);

    // Fetch interview session and enforce state
    useEffect(() => {
        if (id) {
            setLoadingSession(true);
            api.get(`/interviews/${id}`)
                .then((res) => {
                    const sessionStatus = res.data?.status || res.data?.interview?.status;
                    if (sessionStatus === "evaluated" || sessionStatus === "completed" || sessionStatus === "submitted") {
                        setIsReadOnly(true);
                        setIsSubmitted(true);
                        localStorage.removeItem("activeInterview");
                        navigate(`/results/${id}`, { replace: true });
                        return;
                    }

                    // Store active session in localStorage
                    try {
                        localStorage.setItem("activeInterview", JSON.stringify({
                            id,
                            type: "standard",
                            roleTitle: res.data?.roleTitle || "Technical Round",
                            domain: res.data?.domain || "General",
                            timestamp: Date.now()
                        }));
                    } catch (e) {}

                    const loadedQuestions = res.data?.questions || [];
                    if (loadedQuestions.length > 0) {
                        setQuestions(loadedQuestions);
                        setAnswers(
                            loadedQuestions.map((q) => ({
                                questionId: q._id,
                                userAnswer: "",
                                code: (q.assessmentType === "coding" || q.type === "coding") ? "" : undefined,
                                language: "javascript",
                                telemetry: {}
                            }))
                        );
                    }

                    // Server authoritative duration and startedAt
                    const interviewDoc = res.data?.interview;
                    if (interviewDoc && interviewDoc.startedAt && interviewDoc.durationSeconds) {
                        const deadline = new Date(interviewDoc.startedAt).getTime() + (interviewDoc.durationSeconds * 1000);
                        const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
                        setRemainingSeconds(left);
                        if (left === 0) {
                            handleAutoSubmit("time_expired");
                        }
                    }
                })
                .catch((err) => {
                    console.error("Failed to load interview session:", err);
                })
                .finally(() => {
                    setLoadingSession(false);
                });
        }
    }, [id, navigate]);

    // Server-authoritative timer countdown effect
    useEffect(() => {
        if (isSubmitted || isReadOnly || !hasStartedFullscreen) return;

        const timer = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleAutoSubmit("time_expired");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isSubmitted, isReadOnly, hasStartedFullscreen, handleAutoSubmit]);

    // Format timer MM:SS
    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const remaining = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
    };

    const handleAnswerChange = (text, e) => {
        if (integrity.handleInputKeystroke && e) {
            integrity.handleInputKeystroke(e);
        }
        setAnswers((prev) =>
            prev.map((item, idx) =>
                idx === currentIndex ? { ...item, userAnswer: text, telemetry: integrity.getTelemetry() } : item
            )
        );
    };

    const currentQuestion = questions[currentIndex];
    
    // Accurately determine question type: theory is strictly written text by default
    const isCodingQuestion = (currentQuestion?.assessmentType === "coding" || Boolean(currentQuestion?.codingData?.samples?.length) || currentQuestion?.type === "coding") && currentQuestion?.assessmentType !== "theory";
    const effectiveIsCoding = activeWorkspaceMode !== null ? activeWorkspaceMode === "code" : isCodingQuestion;

    const currentAnswer = answers[currentIndex]?.userAnswer || "";
    const currentCode = answers[currentIndex]?.code || "";
    const currentLanguage = answers[currentIndex]?.language || "javascript";

    const handleCodeChange = (codeText, e) => {
        if (integrity.handleInputKeystroke && e) {
            integrity.handleInputKeystroke(e);
        }
        setAnswers((prev) =>
            prev.map((item, idx) =>
                idx === currentIndex ? { ...item, code: codeText, userAnswer: item.userAnswer || codeText, telemetry: integrity.getTelemetry() } : item
            )
        );
    };

    const handleLanguageChange = (lang) => {
        setAnswers((prev) =>
            prev.map((item, idx) =>
                idx === currentIndex ? { ...item, language: lang } : item
            )
        );
    };

    const isQuestionAnswered = (idx) => {
        const item = answers[idx];
        if (!item) return false;
        return (item.userAnswer && item.userAnswer.trim().length > 0) || (item.code && item.code.trim().length > 0);
    };

    const answeredCount = answers.filter((_, idx) => isQuestionAnswered(idx)).length;
    const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

    const handleSubmitInterview = async () => {
        setShowConfirmModal(false);
        setEvaluating(true);
        setIsSubmitted(true);

        const stepTimer = setInterval(() => {
            setEvalStep((prev) => (prev < 4 ? prev + 1 : prev));
        }, 900);

        try {
            await api.post(`/interviews/${id}/submit`, {
                answers
            });

            await api.post(`/results/${id}/analyze`);

            localStorage.removeItem("activeInterview");
            clearInterval(stepTimer);
            navigate(`/results/${id}`);
        } catch (err) {
            clearInterval(stepTimer);
            setEvaluating(false);
            const msg = err.response?.data?.message || err.message || "Evaluation failed. Please try submitting again.";
            setToast({
                show: true,
                message: msg,
                type: "error"
            });
        }
    };

    if (loadingSession) {
        return (
            <div className="min-vh-100 tech-grid-bg d-flex align-items-center justify-content-center p-4">
                <div className="glass-card p-5 text-center" style={{ maxWidth: "520px" }}>
                    <div className="spinner-border text-indigo-400 mb-3" style={{ width: "3rem", height: "3rem" }} role="status" />
                    <h4 className="fw-bold text-white mb-2">Preparing Interview Environment...</h4>
                    <p className="text-muted small mb-0">Loading calibrated questions and initializing code compiler.</p>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-vh-100 tech-grid-bg d-flex align-items-center justify-content-center p-4">
                <div className="glass-card p-5 text-center" style={{ maxWidth: "520px" }}>
                    <AlertTriangleIcon size={44} className="text-amber-400 mb-3" />
                    <h3 className="fw-bold text-white mb-2">No Active Session Found</h3>
                    <p className="text-muted small mb-4">
                        We could not find active questions for this session. Please initiate a new interview from the Candidate Dashboard.
                    </p>
                    <button
                        className="btn btn-primary-gradient"
                        onClick={() => navigate("/dashboard")}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Gate: Must click button to enter proctored fullscreen environment
    if (!hasStartedFullscreen) {
        return (
            <div className="min-vh-100 tech-grid-bg d-flex align-items-center justify-content-center p-4">
                <div className="glass-card p-5 text-center" style={{ maxWidth: "560px", background: "rgba(15, 23, 42, 0.95)" }}>
                    <div
                        className="pulse-glow d-inline-flex align-items-center justify-content-center rounded-circle mb-4"
                        style={{ width: "80px", height: "80px", background: "linear-gradient(135deg, #6366f1, #06b6d4)", color: "#fff" }}
                    >
                        <ShieldIcon size={40} />
                    </div>
                    <h3 className="fw-bold text-white mb-2">Proctored Assessment Environment</h3>
                    <p className="text-secondary small mb-4">
                        This exam requires a secure, fullscreen browser environment. Tab switches, exiting fullscreen, window unfocusing, and copy-paste are actively monitored and logged to ensure assessment integrity.
                    </p>

                    <div className="p-3 rounded-3 text-start mb-4" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                        <div className="text-white small fw-semibold mb-2">⚠️ Integrity Policy:</div>
                        <ul className="text-muted small mb-0 ps-3">
                            <li>Keep this window in fullscreen throughout the test.</li>
                            <li>Do not switch tabs or open other applications.</li>
                            <li>Exceeding 2 integrity violations will automatically submit your exam.</li>
                        </ul>
                    </div>

                    <button
                        className="btn btn-primary-gradient w-100 py-3 fw-bold"
                        onClick={async () => {
                            await integrity.enterFullscreen();
                            setHasStartedFullscreen(true);
                        }}
                    >
                        Start Exam in Fullscreen
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 tech-grid-bg pb-5">
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            {/* Violation Warning Modal */}
            {integrity.showWarningModal && (
                <div className="modal-backdrop-custom" style={{ zIndex: 10000 }}>
                    <div className="glass-card p-4 p-md-5 text-center" style={{ maxWidth: "520px", background: "rgba(30, 10, 15, 0.98)", border: "2px solid #ef4444" }}>
                        <AlertTriangleIcon size={48} className="text-rose-400 mb-3" />
                        <h4 className="fw-bold text-white mb-2">Integrity Warning Recorded</h4>
                        <p className="text-white small mb-3">
                            {integrity.lastViolationMsg}
                        </p>
                        <div className="badge-tech badge-rejected mb-4">
                            Violation {integrity.violationCount} of {integrity.maxViolations} Max Allowed
                        </div>
                        <button
                            className="btn btn-primary-gradient w-100"
                            onClick={integrity.enterFullscreen}
                        >
                            Return to Fullscreen & Resume Exam
                        </button>
                    </div>
                </div>
            )}


            {/* AI Evaluation Loading Overlay */}
            {evaluating && (
                <div className="modal-backdrop-custom">
                    <div className="glass-card p-5 text-center" style={{ maxWidth: "560px", background: "rgba(15, 23, 42, 0.96)" }}>
                        <div
                            className="pulse-glow d-inline-flex align-items-center justify-content-center rounded-circle mb-4"
                            style={{ width: "80px", height: "80px", background: "linear-gradient(135deg, #6366f1, #06b6d4)", color: "#fff" }}
                        >
                            <BrainIcon size={40} />
                        </div>

                        <h3 className="fw-bold text-white mb-2">AI Engine Evaluating</h3>
                        <p className="text-muted small mb-4">
                            Analyzing technical depth, completeness, syntax concepts, and clarity...
                        </p>

                        {/* Step list */}
                        <div className="d-flex flex-column gap-3 text-start mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle p-1" style={{ background: evalStep >= 1 ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)" }}>
                                    <CheckCircleIcon size={16} className={evalStep >= 1 ? "text-emerald-400" : "text-muted"} />
                                </div>
                                <span className={`small ${evalStep >= 1 ? "text-white fw-semibold" : "text-muted"}`}>
                                    Submitting candidate response payload
                                </span>
                            </div>

                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle p-1" style={{ background: evalStep >= 2 ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)" }}>
                                    <CheckCircleIcon size={16} className={evalStep >= 2 ? "text-emerald-400" : "text-muted"} />
                                </div>
                                <span className={`small ${evalStep >= 2 ? "text-white fw-semibold" : "text-muted"}`}>
                                    Evaluating technical accuracy & relevance
                                </span>
                            </div>

                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle p-1" style={{ background: evalStep >= 3 ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)" }}>
                                    <CheckCircleIcon size={16} className={evalStep >= 3 ? "text-emerald-400" : "text-muted"} />
                                </div>
                                <span className={`small ${evalStep >= 3 ? "text-white fw-semibold" : "text-muted"}`}>
                                    Generating feedback & identifying skill gaps
                                </span>
                            </div>

                            <div className="d-flex align-items-center gap-3">
                                <div className="rounded-circle p-1" style={{ background: evalStep >= 4 ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)" }}>
                                    <CheckCircleIcon size={16} className={evalStep >= 4 ? "text-emerald-400" : "text-muted"} />
                                </div>
                                <span className={`small ${evalStep >= 4 ? "text-white fw-semibold" : "text-muted"}`}>
                                    Synthesizing comprehensive scorecard
                                </span>
                            </div>
                        </div>

                        <div className="progress-container mb-2">
                            <div
                                className="progress-bar-custom"
                                style={{ width: `${(evalStep / 4) * 100}%` }}
                            />
                        </div>
                        <span className="text-muted small">Please do not refresh the page</span>
                    </div>
                </div>
            )}

            {/* Sticky Assessment Sub-Header */}
            <div
                className="py-3 px-4 mb-4 border-bottom"
                style={{ background: "rgba(17, 24, 39, 0.8)", backdropFilter: "blur(12px)", borderColor: "var(--border-subtle)" }}
            >
                <div className="container-fluid px-lg-5">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <span className="badge-tech badge-indigo">
                                Technical Assessment
                            </span>
                            <span className="text-white fw-semibold small">
                                {currentQuestion?.role || "Software Engineer"} • {currentQuestion?.domain || "Technical"}
                            </span>
                        </div>

                        <div className="d-flex align-items-center gap-4">
                            {/* Countdown Timer */}
                            <div className={`d-flex align-items-center gap-2 px-3 py-1 rounded-pill ${remainingSeconds < 300 ? "text-danger border-danger" : "text-secondary"}`} style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-subtle)" }}>
                                <ClockIcon size={15} className={remainingSeconds < 300 ? "text-rose-400" : "text-indigo-400"} />
                                <span className="font-monospace text-white fw-bold small">
                                    {formatTime(remainingSeconds)} left
                                </span>
                            </div>

                            {/* Progress Indicator */}
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted small">Progress:</span>
                                <span className="text-white fw-semibold small">
                                    {answeredCount} / {questions.length} answered
                                </span>
                                <div style={{ width: "90px" }} className="progress-container d-none d-sm-block">
                                    <div
                                        className="progress-bar-custom"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="container py-2">
                <div className="row g-4">
                    {/* Left Question & Answer Area */}
                    <div className="col-lg-8">
                        <div className="glass-card p-4 p-md-5 mb-4">
                            {/* Question Header */}
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <span className="text-muted small fw-semibold text-uppercase">
                                            Question {currentIndex + 1} of {questions.length}
                                        </span>
                                        <span className={`badge-tech ${effectiveIsCoding ? "badge-indigo" : "badge-emerald"}`} style={{ fontSize: "0.72rem" }}>
                                            {effectiveIsCoding ? "💻 Coding Challenge" : "📖 Theory Question"}
                                        </span>
                                    </div>
                                    <h4 className="fw-bold text-white mt-2 mb-0" style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                        {cleanStatement(currentQuestion?.questionText)}
                                    </h4>

                                    {/* Input / Output specifications if available */}
                                    {effectiveIsCoding && currentQuestion?.codingData?.inputSpecification && (
                                        <div className="mt-3 p-3 rounded-3 bg-dark bg-opacity-40 border border-secondary border-opacity-25 small">
                                            <strong className="text-cyan-300 d-block mb-1">Input Format:</strong>
                                            <div className="text-muted" style={{ whiteSpace: "pre-wrap" }}>
                                                {cleanStatement(currentQuestion.codingData.inputSpecification)}
                                            </div>
                                        </div>
                                    )}
                                    {effectiveIsCoding && currentQuestion?.codingData?.outputSpecification && (
                                        <div className="mt-2 p-3 rounded-3 bg-dark bg-opacity-40 border border-secondary border-opacity-25 small">
                                            <strong className="text-emerald-300 d-block mb-1">Output Format:</strong>
                                            <div className="text-muted" style={{ whiteSpace: "pre-wrap" }}>
                                                {cleanStatement(currentQuestion.codingData.outputSpecification)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="d-flex gap-2 flex-shrink-0">
                                    <span className={`badge-tech ${currentQuestion?.difficulty === "hard" ? "badge-rejected" : currentQuestion?.difficulty === "medium" ? "badge-pending" : "badge-approved"}`}>
                                        {currentQuestion?.difficulty || "Medium"}
                                    </span>
                                    <span className="badge-tech badge-cyan">
                                        {currentQuestion?.maxscore || 10} pts
                                    </span>
                                </div>
                            </div>

                            {/* Coding Samples if available */}
                            {effectiveIsCoding && currentQuestion?.codingData?.samples && currentQuestion.codingData.samples.length > 0 && (
                                <div className="p-3 rounded-3 mb-3" style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                                    <span className="text-secondary small fw-semibold d-block mb-2">Example Cases:</span>
                                    <div className="row g-2">
                                        {currentQuestion.codingData.samples.slice(0, 2).map((s, idx) => (
                                            <div key={idx} className="col-md-6">
                                                <div className="p-2 rounded bg-black bg-opacity-40 font-monospace small">
                                                    <span className="text-indigo-300 d-block">Input: {cleanStatement(s.input)}</span>
                                                    <span className="text-emerald-300 d-block">Output: {cleanStatement(s.output)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <hr style={{ borderColor: "var(--border-subtle)" }} className="my-4" />

                            {/* Response Input: Coding vs Theory */}
                            {effectiveIsCoding ? (
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="d-flex align-items-center gap-2">
                                            <label className="form-label text-secondary small fw-semibold mb-0">
                                                Coding Workspace
                                            </label>
                                            <select
                                                className="form-select form-select-sm bg-dark text-white border-secondary border-opacity-25"
                                                style={{ width: "130px", fontSize: "0.8rem" }}
                                                value={currentLanguage}
                                                onChange={(e) => handleLanguageChange(e.target.value)}
                                            >
                                                <option value="javascript">JavaScript</option>
                                                <option value="python">Python</option>
                                                <option value="cpp">C++</option>
                                                <option value="java">Java</option>
                                                <option value="typescript">TypeScript</option>
                                            </select>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link text-indigo-400 p-0 text-decoration-none small"
                                                onClick={() => setActiveWorkspaceMode("text")}
                                            >
                                                Switch to Text Area
                                            </button>
                                            <span className="text-muted small">
                                                • {currentCode.length} chars
                                            </span>
                                        </div>
                                    </div>
                                    <textarea
                                        className="form-control form-control-custom font-monospace"
                                        rows="12"
                                        placeholder={`// Write your ${currentLanguage} solution here...\nfunction solve(input) {\n    // Implement optimal approach\n    return result;\n}`}
                                        value={currentCode || currentAnswer}
                                        onChange={(e) => handleCodeChange(e.target.value, e)}
                                        onPaste={integrity.handlePaste}
                                        onCopy={integrity.handleCopyCut}
                                        onCut={integrity.handleCopyCut}
                                        style={{ lineHeight: 1.5, fontSize: "0.9rem", background: "rgba(10, 15, 30, 0.9)", color: "#38bdf8" }}
                                    />
                                    <div className="d-flex justify-content-between align-items-center mt-2 text-muted small">
                                        <span>💡 AI evaluates time complexity, edge cases, and algorithmic correctness.</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label text-secondary small fw-semibold mb-0">
                                            Your Conceptual & Technical Answer
                                        </label>
                                        <div className="d-flex align-items-center gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-link text-cyan-400 p-0 text-decoration-none small"
                                                onClick={() => setActiveWorkspaceMode("code")}
                                            >
                                                Switch to Code Editor
                                            </button>
                                            <span className="text-muted small">
                                                • {currentAnswer.trim() ? `${currentAnswer.trim().split(/\s+/).length} words` : "0 words"} ({currentAnswer.length} chars)
                                            </span>
                                        </div>
                                    </div>
                                    <textarea
                                        className="form-control form-control-custom font-monospace"
                                        rows="10"
                                        placeholder="Type your structured explanation here. Detail underlying principles, core definitions, logical arguments, and nuanced trade-offs..."
                                        value={currentAnswer}
                                        onChange={(e) => handleAnswerChange(e.target.value, e)}
                                        onPaste={integrity.handlePaste}
                                        onCopy={integrity.handleCopyCut}
                                        onCut={integrity.handleCopyCut}
                                        style={{ lineHeight: 1.6, fontSize: "0.925rem" }}
                                    />
                                </div>
                            )}

                            {/* Question Navigation Controls */}
                            <div className="d-flex justify-content-between align-items-center">
                                <button
                                    className="btn btn-secondary-dark"
                                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                                    disabled={currentIndex === 0}
                                >
                                    <ArrowLeftIcon size={16} /> Previous
                                </button>

                                {currentIndex < questions.length - 1 ? (
                                    <button
                                        className="btn btn-primary-gradient"
                                        onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                                    >
                                        Next Question <ArrowRightIcon size={16} />
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary-gradient"
                                        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 14px 0 rgba(16, 185, 129, 0.4)" }}
                                        onClick={() => setShowConfirmModal(true)}
                                    >
                                        <CheckCircleIcon size={16} /> Review & Submit
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Question Selector & Tips Panel */}
                    <div className="col-lg-4">
                        {/* Question Navigator Card */}
                        <div className="glass-card p-4 mb-4">
                            <h5 className="fw-bold text-white mb-3">
                                Question Navigation
                            </h5>
                            <div className="d-flex flex-wrap gap-2 mb-4">
                                {questions.map((q, idx) => {
                                    const isAnswered = answers[idx]?.userAnswer && answers[idx].userAnswer.trim().length > 0;
                                    const isCurrent = idx === currentIndex;

                                    return (
                                        <button
                                            key={q._id || idx}
                                            className={`btn rounded-3 fw-semibold ${
                                                isCurrent
                                                    ? "btn-primary-gradient"
                                                    : isAnswered
                                                    ? "btn-secondary-dark text-emerald-400 border-emerald-500"
                                                    : "btn-secondary-dark"
                                            }`}
                                            style={{
                                                width: "44px",
                                                height: "44px",
                                                padding: 0,
                                                borderColor: !isCurrent && isAnswered ? "rgba(16, 185, 129, 0.4)" : undefined
                                            }}
                                            onClick={() => setCurrentIndex(idx)}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="d-flex flex-column gap-2 text-muted small pt-2 border-top border-secondary border-opacity-25">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="rounded-circle" style={{ width: "10px", height: "10px", background: "#6366f1" }} />
                                    <span>Current Active Question</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="rounded-circle" style={{ width: "10px", height: "10px", background: "#10b981" }} />
                                    <span>Answer Provided</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="rounded-circle" style={{ width: "10px", height: "10px", background: "#334155" }} />
                                    <span>Pending Answer</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Scoring Criteria Card */}
                        <div className="glass-card p-4">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <SparklesIcon size={18} className="text-indigo-400" />
                                <h5 className="fw-bold text-white mb-0">
                                    AI Evaluation Criteria
                                </h5>
                            </div>
                            <p className="text-muted small mb-3">
                                Your answers will be automatically evaluated across 4 core benchmarks:
                            </p>

                            <div className="d-flex flex-column gap-3">
                                <div className="p-2 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                    <span className="text-white fw-semibold small d-block">1. Technical Knowledge</span>
                                    <span className="text-muted" style={{ fontSize: "0.78rem" }}>Accuracy of concepts, frameworks, and syntax</span>
                                </div>
                                <div className="p-2 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                    <span className="text-white fw-semibold small d-block">2. Completeness</span>
                                    <span className="text-muted" style={{ fontSize: "0.78rem" }}>Covers edge cases, trade-offs, and practical examples</span>
                                </div>
                                <div className="p-2 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                    <span className="text-white fw-semibold small d-block">3. Relevance & Clarity</span>
                                    <span className="text-muted" style={{ fontSize: "0.78rem" }}>Directly addresses the prompt with clear reasoning</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Submission Confirmation Modal */}
            {showConfirmModal && (
                <div className="modal-backdrop-custom">
                    <div className="modal-content-custom p-4 p-md-5">
                        <div className="text-center mb-4">
                            <div
                                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                                style={{ width: "56px", height: "56px", background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}
                            >
                                <CheckCircleIcon size={32} />
                            </div>
                            <h3 className="fw-bold text-white mb-2">Ready to Submit?</h3>
                            <p className="text-muted small mb-0">
                                You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.
                                {answeredCount < questions.length && (
                                    <span className="text-amber-400 d-block mt-2">
                                        ⚠️ You have {questions.length - answeredCount} unanswered questions remaining.
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="d-flex gap-3">
                            <button
                                className="btn btn-secondary-dark flex-grow-1"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Back to Review
                            </button>
                            <button
                                className="btn btn-primary-gradient flex-grow-1"
                                onClick={handleSubmitInterview}
                            >
                                Submit & Evaluate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Interview;