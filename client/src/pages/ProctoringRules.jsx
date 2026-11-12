import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../services/api";

export default function ProctoringRules() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const role = searchParams.get("role") || "Frontend developer";
    const testType = searchParams.get("type") || "Standard interview";
    const difficulty = searchParams.get("difficulty") || "Medium";
    const questions = searchParams.get("questions") || "5";
    const assessmentType = searchParams.get("assessmentType") || "theory";
    const duration = searchParams.get("duration") || "30";
    const domain = searchParams.get("domain") || searchParams.get("topics") || "General";
    const topicsParam = searchParams.get("topics") || "";
    const questionIdsParam = searchParams.get("questionIds") || "";
    const generateWithAI = searchParams.get("generateWithAI") === "true";

    const existingInterviewId = searchParams.get("interviewId");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleStartExam = async () => {
        setLoading(true);
        setError("");

        try {
            // Request browser fullscreen mode if available
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }

            if (existingInterviewId) {
                localStorage.setItem("activeInterviewId", existingInterviewId);
                navigate(`/interview/${existingInterviewId}`);
                return;
            }

            // Call backend API to initiate real interview session in MongoDB
            const durationSeconds = (parseInt(duration, 10) || 30) * 60;
            const limit = parseInt(questions, 10) || 5;

            const payload = {
                roleTitle: role,
                domain: domain,
                limit: limit,
                difficulty: difficulty.toLowerCase(),
                assessmentType: assessmentType,
                durationSeconds: durationSeconds,
                generateWithAI: generateWithAI
            };

            if (topicsParam) {
                payload.selectedTopics = topicsParam.split(",").map(t => t.trim());
            }

            if (questionIdsParam) {
                payload.questionIds = questionIdsParam.split(",").filter(Boolean);
            }

            const res = await api.post("/interviews", payload);

            const interviewId = res.data.interviewId;
            localStorage.setItem("activeInterviewId", interviewId);

            // Navigate directly to the live exam
            navigate(`/interview/${interviewId}`);
        } catch (err) {
            console.error("Failed to start interview:", err);
            setError(err.response?.data?.message || "Could not initialize interview session. Please check your connection.");
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "16px 0 48px 0" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb" style={{ marginBottom: "20px" }}>
                <Link to="/dashboard" style={{ color: "#2563eb", textDecoration: "none" }}>Dashboard</Link>
                <span style={{ margin: "0 8px", color: "#cbd5e1" }}>›</span>
                <Link to={`/practice/mock-setup?type=${encodeURIComponent(testType)}&role=${encodeURIComponent(role)}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    Setup
                </Link>
                <span style={{ margin: "0 8px", color: "#cbd5e1" }}>›</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Before you start</span>
            </div>

            {/* Header */}
            <div style={{ marginBottom: "28px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b", marginBottom: "6px" }}>
                    EXAM INSTRUCTIONS & PROCTORING RULES
                </div>
                <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                    Before you start
                </h1>
                <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>
                    This exam is proctored to ensure assessment integrity. Read the rules, then start in fullscreen.
                </p>
            </div>

            {error && (
                <div style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px"
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
                {/* 5 Proctoring Rules Container */}
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "32px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px"
                    }}
                >
                    {/* Rule 1 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                        <div style={{ fontSize: "20px", color: "#10b981", marginTop: "2px" }}>⛶</div>
                        <div>
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 4px 0" }}>
                                Stay in fullscreen
                            </h3>
                            <p style={{ fontSize: "13px", color: "#4b5563", margin: 0, lineHeight: 1.5 }}>
                                The exam runs in fullscreen. Leaving fullscreen or minimizing the window is recorded as a focus-loss violation.
                            </p>
                        </div>
                    </div>

                    {/* Rule 2 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                        <div style={{ fontSize: "20px", color: "#10b981", marginTop: "2px" }}>⧉</div>
                        <div>
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 4px 0" }}>
                                No tab switching
                            </h3>
                            <p style={{ fontSize: "13px", color: "#4b5563", margin: 0, lineHeight: 1.5 }}>
                                Switching tabs, opening other apps, or shifting focus away from the assessment is logged automatically.
                            </p>
                        </div>
                    </div>

                    {/* Rule 3 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                        <div style={{ fontSize: "20px", color: "#10b981", marginTop: "2px" }}>🖥</div>
                        <div>
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 4px 0" }}>
                                Single display only
                            </h3>
                            <p style={{ fontSize: "13px", color: "#4b5563", margin: 0, lineHeight: 1.5 }}>
                                Disconnect external monitors. Secondary displays are flagged during session heartbeats.
                            </p>
                        </div>
                    </div>

                    {/* Rule 4 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                        <div style={{ fontSize: "20px", color: "#10b981", marginTop: "2px" }}>📋</div>
                        <div>
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 4px 0" }}>
                                Clipboard monitoring
                            </h3>
                            <p style={{ fontSize: "13px", color: "#4b5563", margin: 0, lineHeight: 1.5 }}>
                                Pasting external text is restricted and monitored to ensure authentic candidate responses.
                            </p>
                        </div>
                    </div>

                    {/* Rule 5 */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                        <div style={{ fontSize: "20px", color: "#10b981", marginTop: "2px" }}>⏱</div>
                        <div>
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 4px 0" }}>
                                Timed submission
                            </h3>
                            <p style={{ fontSize: "13px", color: "#4b5563", margin: 0, lineHeight: 1.5 }}>
                                The session auto-submits when the timer reaches zero. Manage your pacing per question.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Card: Configured Summary */}
                <div>
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "14px",
                            padding: "28px",
                            position: "sticky",
                            top: "24px"
                        }}
                    >
                        <div style={{
                            display: "inline-block",
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.06em",
                            color: "#16a34a",
                            backgroundColor: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            marginBottom: "16px"
                        }}>
                            READY FOR LAUNCH
                        </div>

                        <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", margin: "0 0 16px 0" }}>
                            {role}
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", borderBottom: "1px solid #f1f5f9", paddingBottom: "20px", marginBottom: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#6b7280" }}>Assessment Type</span>
                                <span style={{ fontWeight: "600", color: "#111827" }}>{testType}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#6b7280" }}>Questions</span>
                                <span style={{ fontWeight: "600", color: "#111827" }}>{questions} questions</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#6b7280" }}>Difficulty</span>
                                <span style={{ fontWeight: "600", color: "#111827" }}>{difficulty}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#6b7280" }}>Time Limit</span>
                                <span style={{ fontWeight: "600", color: "#111827" }}>{duration} mins</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#6b7280" }}>Format</span>
                                <span style={{ fontWeight: "600", color: "#111827" }}>
                                    {assessmentType === "coding" ? "Algorithmic Code" : assessmentType === "mixed" ? "Mixed Theory & Code" : "Technical Reasoning"}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleStartExam}
                            disabled={loading}
                            style={{
                                width: "100%",
                                backgroundColor: loading ? "#94a3b8" : "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "14px",
                                fontSize: "15px",
                                fontWeight: "700",
                                cursor: loading ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                marginBottom: "14px",
                                transition: "background-color 0.15s ease"
                            }}
                        >
                            {loading ? (
                                <>
                                    <span>⏳</span> Initializing session...
                                </>
                            ) : (
                                <>
                                    <span>▶</span> Start exam in fullscreen
                                </>
                            )}
                        </button>

                        <div style={{ textAlign: "center" }}>
                            <Link
                                to={`/practice/mock-setup?type=${encodeURIComponent(testType)}&role=${encodeURIComponent(role)}`}
                                style={{ fontSize: "13px", color: "#6b7280", textDecoration: "none" }}
                            >
                                ← Adjust test configuration
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
