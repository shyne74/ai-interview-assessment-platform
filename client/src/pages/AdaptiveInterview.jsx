import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
    BrainIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    SparklesIcon,
    AlertTriangleIcon,
    ZapIcon,
    ClockIcon,
    ShieldIcon
} from "../components/icons";
import Toast from "../components/Toast";
import { cleanStatement } from "../utils/formatters";
import { useExamIntegrity } from "../hooks/useExamIntegrity";

const LEVEL_MAP = {
    1: { name: "Level 1 - Beginner", badge: "badge-approved", color: "#10b981", icon: "🌱", difficulty: "Easy" },
    2: { name: "Level 2 - Intermediate", badge: "badge-cyan", color: "#06b6d4", icon: "✨", difficulty: "Medium" },
    3: { name: "Level 3 - Advanced", badge: "badge-pending", color: "#f59e0b", icon: "🔥", difficulty: "Hard" },
    4: { name: "Level 4 - Principal Expert", badge: "badge-rejected", color: "#ef4444", icon: "⚡", difficulty: "Expert" }
};

function AdaptiveInterview() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [finished, setFinished] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [interviewData, setInterviewData] = useState(null);

    // Gamified Live HUD State
    const [currentLevel, setCurrentLevel] = useState(2);
    const [totalPoints, setTotalPoints] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [questionIndex, setQuestionIndex] = useState(1);
    const [targetCount, setTargetCount] = useState(5);
    const [remainingSeconds, setRemainingSeconds] = useState(1800);
    const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);

    const [toast, setToast] = useState({ show: false, message: "", type: "info" });

    // Auto-submit callback
    const handleAutoSubmit = useCallback(async (reason) => {
        setFinished(true);
        localStorage.removeItem("activeInterview");
        try {
            const sessionRes = await api.get(`/adaptive/${id}`);
            if (sessionRes.data?.interview) {
                setInterviewData(sessionRes.data.interview);
            }
        } catch (e) {
            console.error("Error refreshing session upon auto-submit", e);
        }
    }, [id]);

    // Exam integrity hook
    const integrity = useExamIntegrity({
        examId: id,
        examType: "adaptive",
        currentQuestionIndex: questionIndex,
        maxViolations: 2,
        isCompleted: finished,
        isStarted: hasStartedFullscreen,
        onAutoSubmit: handleAutoSubmit
    });

    // History lock: once finished, lock back button
    useEffect(() => {
        if (finished) {
            window.history.replaceState(null, "", `/adaptive-interview/${id}`);
            const handlePopState = (e) => {
                e.preventDefault();
                navigate("/dashboard", { replace: true });
            };
            window.addEventListener("popstate", handlePopState);
            return () => window.removeEventListener("popstate", handlePopState);
        }
    }, [finished, id, navigate]);

    const fetchNextQuestion = async () => {
        try {
            setLoading(true);
            setEvaluation(null);
            setUserAnswer("");
            integrity.resetTelemetry();

            const response = await api.get(`/adaptive/${id}/next`);

            if (response.data.isFinished) {
                setFinished(true);
                localStorage.removeItem("activeInterview");
                if (response.data.interview) {
                    setInterviewData(response.data.interview);
                } else {
                    const sessionRes = await api.get(`/adaptive/${id}`);
                    setInterviewData(sessionRes.data.interview);
                }
            } else {
                try {
                    localStorage.setItem("activeInterview", JSON.stringify({
                        id,
                        type: "adaptive",
                        roleTitle: response.data.roleTitle || "Adaptive Assessment",
                        domain: response.data.domain || "Adaptive Track",
                        timestamp: Date.now()
                    }));
                } catch (e) {}
                setCurrentQuestion(response.data.question);
                setCurrentLevel(response.data.currentLevel || 2);
                setTotalPoints(response.data.totalPoints || 0);
                setCurrentStreak(response.data.currentStreak || 0);
                setQuestionIndex(response.data.questionIndex || 1);
                setTargetCount(response.data.targetCount || 5);

                // Fetch session for timer
                const sessionRes = await api.get(`/adaptive/${id}`);
                const sess = sessionRes.data?.interview;
                if (sess && sess.startedAt && sess.durationSeconds) {
                    const deadline = new Date(sess.startedAt).getTime() + (sess.durationSeconds * 1000);
                    const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
                    setRemainingSeconds(left);
                    if (left === 0) {
                        handleAutoSubmit("time_expired");
                    }
                }
            }
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message,
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNextQuestion();
        // eslint-disable-next-line
    }, [id]);

    // Timer countdown
    useEffect(() => {
        if (finished || !hasStartedFullscreen) return;

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
    }, [finished, hasStartedFullscreen, handleAutoSubmit]);

    // Format timer MM:SS
    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const remaining = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
    };

    const submitAnswer = async () => {
        if (!userAnswer.trim()) {
            setToast({
                show: true,
                message: "Please enter an answer before submitting for evaluation.",
                type: "warning"
            });
            return;
        }

        try {
            setSubmitting(true);
            const response = await api.post(`/adaptive/${id}/submit`, {
                questionId: currentQuestion._id,
                userAnswer: userAnswer,
                telemetry: integrity.getTelemetry()
            });

            const evalResult = response.data.evaluation;
            setEvaluation(evalResult);

            if (evalResult.newTotalPoints !== undefined) {
                setTotalPoints(evalResult.newTotalPoints);
            }
            if (evalResult.currentStreak !== undefined) {
                setCurrentStreak(evalResult.currentStreak);
            }
            if (evalResult.newLevel !== undefined) {
                setCurrentLevel(evalResult.newLevel);
            }

            if (response.data.interview) {
                setInterviewData(response.data.interview);
            }

            if (response.data.isFinished) {
                setFinished(true);
            }

            setToast({
                show: true,
                message: `Answer Evaluated! Score: ${evalResult.score}/10 (${evalResult.pointsAwarded > 0 ? `+${evalResult.pointsAwarded} PTS` : `0 PTS`})`,
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to submit answer.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const levelInfo = LEVEL_MAP[currentLevel] || LEVEL_MAP[2];

    // Completion Summary Screen
    if (finished) {
        const finalHistory = interviewData?.questionHistory || [];
        const finalScore = interviewData?.overallScore || 0;
        const finalPoints = interviewData?.totalPoints || totalPoints;
        const badge = interviewData?.masteryBadge || "Intermediate Practitioner";

        return (
            <div className="min-vh-100 tech-grid-bg py-5">
                <div className="container" style={{ maxWidth: "800px" }}>
                    <div className="glass-card p-5 text-center mb-4">
                        <div
                            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 pulse-glow"
                            style={{ width: "80px", height: "80px", background: "linear-gradient(135deg, #6366f1, #06b6d4)", color: "#fff" }}
                        >
                            <CheckCircleIcon size={44} />
                        </div>

                        <h2 className="fw-bold text-white mb-2">Adaptive Exam Complete!</h2>
                        <p className="text-muted mb-4">
                            You have successfully completed the real-time dynamic difficulty assessment.
                        </p>

                        {/* Badges and Score Highlights */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-4">
                                <div className="p-3 rounded-3" style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                                    <span className="text-secondary small d-block mb-1">Total Points</span>
                                    <h3 className="fw-bold text-indigo-400 mb-0">{finalPoints} PTS</h3>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="p-3 rounded-3" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                                    <span className="text-secondary small d-block mb-1">Average Score</span>
                                    <h3 className="fw-bold text-emerald-400 mb-0">{finalScore} / 10</h3>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="p-3 rounded-3" style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                                    <span className="text-secondary small d-block mb-1">Mastery Award</span>
                                    <h5 className="fw-bold text-amber-400 mb-0">{badge}</h5>
                                </div>
                            </div>
                        </div>

                        {/* Trajectory Timeline */}
                        <div className="p-4 rounded-3 text-start mb-4" style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                            <h5 className="fw-bold text-white mb-3">Difficulty Trajectory & Score Flow</h5>
                            <div className="d-flex flex-column gap-3">
                                {finalHistory.map((item, idx) => {
                                    const lvl = LEVEL_MAP[item.level] || LEVEL_MAP[2];
                                    return (
                                        <div key={idx} className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ background: "rgba(0, 0, 0, 0.2)" }}>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge-tech badge-cyan">Q{idx + 1}</span>
                                                    <span className="badge-tech" style={{ background: "rgba(255,255,255,0.05)", color: lvl.color }}>
                                                        {lvl.icon} {lvl.name}
                                                    </span>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <strong className="text-emerald-400">{item.score}/10</strong>
                                                    <span className="badge-tech badge-indigo">+{item.pointsAwarded || 0} pts</span>
                                                    {item.penaltyApplied > 0 && (
                                                        <span className="badge-tech badge-rejected">-{item.penaltyApplied} pts</span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-white small fw-semibold mb-1" style={{ whiteSpace: "pre-wrap" }}>
                                                {cleanStatement(item.questionText)}
                                            </p>
                                            <div className="d-flex gap-3 text-muted small mt-2">
                                                <span>✓ <strong>Strength:</strong> {item.strength}</span>
                                                <span>⚠️ <strong>Gap:</strong> {item.weakness}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="d-flex justify-content-center gap-3">
                            <Link to="/dashboard" className="btn btn-secondary-dark px-4 py-2">
                                Back to Dashboard
                            </Link>
                            <Link to="/history" className="btn btn-primary-gradient px-4 py-2">
                                View Full Analytics History
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Fullscreen gate
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
                    <h3 className="fw-bold text-white mb-2">Proctored Adaptive Exam</h3>
                    <p className="text-secondary small mb-4">
                        This dynamic adaptive assessment requires an undisturbed fullscreen environment. Tab switching, window blur, and copy-paste are actively monitored and logged to protect assessment integrity.
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
        <div className="min-vh-100 tech-grid-bg py-4 py-md-5">
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

            <div className="container" style={{ maxWidth: "900px" }}>
                {/* Gamified Live HUD */}
                <div className="glass-card p-3 p-md-4 mb-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div
                                className="d-flex align-items-center justify-content-center rounded-3 p-2"
                                style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}
                            >
                                <BrainIcon size={24} />
                            </div>
                            <div>
                                <h4 className="fw-bold text-white mb-0">Adaptive Exam Session</h4>
                                <span className="text-muted small">
                                    Question {questionIndex} of {targetCount} • Dynamic Scaling Active
                                </span>
                            </div>
                        </div>

                        {/* HUD Stats Counters */}
                        <div className="d-flex align-items-center gap-3">
                            {/* Remaining Timer */}
                            <div className={`d-flex align-items-center gap-2 px-3 py-1 rounded-3 ${remainingSeconds < 300 ? "text-danger border border-danger" : "text-secondary"}`} style={{ background: "rgba(255, 255, 255, 0.05)" }}>
                                <ClockIcon size={14} className={remainingSeconds < 300 ? "text-rose-400" : "text-indigo-400"} />
                                <span className="font-monospace text-white fw-bold small">
                                    {formatTime(remainingSeconds)} left
                                </span>
                            </div>

                            {/* Current Level Badge */}
                            <div className="text-end">
                                <span className="text-muted small d-block">Difficulty Tier</span>
                                <span
                                    className="badge-tech fw-bold"
                                    style={{
                                        background: "rgba(255, 255, 255, 0.08)",
                                        color: levelInfo.color,
                                        borderColor: levelInfo.color,
                                        fontSize: "0.825rem"
                                    }}
                                >
                                    {levelInfo.icon} {levelInfo.name}
                                </span>
                            </div>

                            {/* Total Points */}
                            <div className="text-end px-3 py-1 rounded-3" style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
                                <span className="text-secondary small d-block">Score</span>
                                <strong className="text-indigo-400 fs-6">{totalPoints} PTS</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Question and Real-Time Evaluation Area */}
                {loading ? (
                    <div className="glass-card p-5 text-center">
                        <div className="spinner-border text-indigo-400 mb-3" role="status" />
                        <h5 className="fw-bold text-white mb-1">Adapting Difficulty & Selecting Next Question...</h5>
                        <p className="text-muted small mb-0">The AI engine is analyzing your previous response to target the optimal difficulty tier.</p>
                    </div>
                ) : (
                    currentQuestion && (
                        <div className="glass-card p-4 p-md-5">
                            {/* Question Header */}
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <span className="text-muted small fw-semibold text-uppercase">
                                        Question #{questionIndex}
                                    </span>
                                    <h4 className="fw-bold text-white mt-1 mb-0" style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                        {cleanStatement(currentQuestion.questionText)}
                                    </h4>
                                </div>
                                <span
                                    className="badge-tech flex-shrink-0"
                                    style={{ color: levelInfo.color, borderColor: levelInfo.color }}
                                >
                                    {levelInfo.icon} {levelInfo.difficulty}
                                </span>
                            </div>

                            <hr style={{ borderColor: "var(--border-subtle)" }} className="my-4" />

                            {/* Answer Input */}
                            <div className="mb-4">
                                <label className="form-label text-secondary small fw-semibold">
                                    Your Technical Answer
                                </label>
                                <textarea
                                    className="form-control form-control-custom font-monospace"
                                    rows="7"
                                    placeholder="Type your structured answer here. Include architectural considerations, code patterns, performance trade-offs, and edge cases..."
                                    value={userAnswer}
                                    onChange={(e) => {
                                        if (integrity.handleInputKeystroke) integrity.handleInputKeystroke(e);
                                        setUserAnswer(e.target.value);
                                    }}
                                    onPaste={integrity.handlePaste}
                                    onCopy={integrity.handleCopyCut}
                                    onCut={integrity.handleCopyCut}
                                    disabled={submitting || evaluation}
                                    style={{ lineHeight: 1.6, fontSize: "0.925rem" }}
                                />
                            </div>

                            {/* Actions & Real-Time Feedback Card */}
                            {!evaluation ? (
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted small">
                                        💡 Submitting will evaluate your answer instantly and dynamically scale question #{questionIndex + 1}.
                                    </span>
                                    <button
                                        className="btn btn-primary-gradient px-4 py-2"
                                        onClick={submitAnswer}
                                        disabled={submitting || !userAnswer.trim()}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" />
                                                Evaluating Answer...
                                            </>
                                        ) : (
                                            <>
                                                Submit & Evaluate <ArrowRightIcon size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 rounded-3 border border-indigo-500 border-opacity-30 mb-2" style={{ background: "rgba(15, 23, 42, 0.7)" }}>
                                    {/* Evaluation Header */}
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <SparklesIcon size={18} className="text-emerald-400" />
                                            <h6 className="fw-bold text-white mb-0">AI Performance Evaluation</h6>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <span className="badge-tech badge-emerald fs-6">
                                                Score: {evaluation.score} / 10
                                            </span>
                                            {evaluation.pointsAwarded > 0 && (
                                                <span className="badge-tech badge-indigo fs-6">
                                                    +{evaluation.pointsAwarded} PTS
                                                </span>
                                            )}
                                            {evaluation.streakBonus > 0 && (
                                                <span className="badge-tech badge-cyan fs-6">
                                                    +{evaluation.streakBonus} Streak Bonus!
                                                </span>
                                            )}
                                            {evaluation.penaltyApplied > 0 && (
                                                <span className="badge-tech badge-rejected fs-6">
                                                    -{evaluation.penaltyApplied} PTS Penalty
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Level Progression Alert */}
                                    {evaluation.levelShift > 0 && (
                                        <div className="p-2 px-3 rounded-3 mb-3 text-emerald-300 small fw-semibold" style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                                            ⚡ EXCELLENT PERFORMANCE! Level Escalated to Level {evaluation.newLevel} ({evaluation.newDifficulty.toUpperCase()})
                                        </div>
                                    )}
                                    {evaluation.levelShift < 0 && (
                                        <div className="p-2 px-3 rounded-3 mb-3 text-amber-300 small fw-semibold" style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                                            ⚠️ Gap Detected: Difficulty Adjusted to Level {evaluation.newLevel} to solidify fundamentals.
                                        </div>
                                    )}

                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <div className="p-3 rounded-3 bg-dark bg-opacity-40">
                                                <span className="text-secondary small d-block mb-1">Demonstrated Strength</span>
                                                <strong className="text-emerald-400 small">{evaluation.strength || "Solid technical knowledge"}</strong>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-3 rounded-3 bg-dark bg-opacity-40">
                                                <span className="text-secondary small d-block mb-1">Knowledge Gap</span>
                                                <strong className="text-rose-400 small">{evaluation.weakness || "Minor nuance omitted"}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {evaluation.feedback && (
                                        <p className="text-muted small mb-3">
                                            <strong>Constructive Feedback:</strong> {evaluation.feedback}
                                        </p>
                                    )}

                                    <div className="d-flex justify-content-end">
                                        <button
                                            className="btn btn-primary-gradient px-4 py-2"
                                            onClick={fetchNextQuestion}
                                        >
                                            Next Question <ArrowRightIcon size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default AdaptiveInterview;
