import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Result() {
    const { id } = useParams();
    const navigate = useNavigate();
    const userRole = localStorage.getItem("role") || "user";
    const isAdmin = userRole === "admin";

    const [loading, setLoading] = useState(true);
    const [resultData, setResultData] = useState(null);
    const [interviewData, setInterviewData] = useState(null);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function fetchResult() {
            try {
                setLoading(true);
                setError("");

                // 1. First attempt to fetch the compiled ResultAnalysis
                let resData = null;
                let intData = null;

                try {
                    const res = await api.get(`/results/${id}`);
                    resData = res.data.result;
                    intData = res.data.result?.interviewId;
                } catch (resErr) {
                    // If not analyzed yet, trigger analyze endpoint
                    try {
                        const analyzeRes = await api.post(`/results/${id}/analyze`);
                        resData = analyzeRes.data.result;
                    } catch (anErr) {
                        console.warn("Could not auto-analyze:", anErr.message);
                    }
                }

                // If interview responses were not populated in result, fetch interview directly
                if (!intData || typeof intData === "string") {
                    try {
                        const intRes = await api.get(`/interviews/${id}`);
                        intData = intRes.data.interview;
                    } catch (e) {}
                }

                if (!isMounted) return;

                setResultData(resData);
                setInterviewData(intData);

            } catch (err) {
                console.error("Result fetch error:", err);
                if (isMounted) {
                    setError(err.response?.data?.message || "Could not load assessment results.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        if (id && id !== "sample") {
            fetchResult();
        } else {
            // Default sample demo view
            setLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "32px", marginBottom: "16px" }}>⚡</div>
                    <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 6px 0" }}>
                        Generating your assessment report...
                    </h2>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                        Synthesizing AI evaluation, skill scores, and strengths.
                    </p>
                </div>
            </div>
        );
    }

    // Determine values from real backend result or sample fallbacks
    const overallScoreRaw = resultData?.overallScore !== undefined
        ? Number(resultData.overallScore)
        : (interviewData?.overallScore !== undefined ? Number(interviewData.overallScore) : 0.0);
    const overallScorePercent = overallScoreRaw > 10 ? Math.round(overallScoreRaw) : Math.round(overallScoreRaw * 10);

    const roleTitle = resultData?.roleTitle || interviewData?.roleTitle || "Frontend developer";
    const assessmentType = interviewData?.assessmentType || resultData?.assessmentType || (resultData?.domain === "Coding" || interviewData?.domain === "Coding" ? "coding" : "mixed");
    const effectiveRole = (roleTitle.toLowerCase() === "coding" || roleTitle.toLowerCase() === "coding assessment")
        ? "Software Engineer"
        : roleTitle;
    const completedDate = resultData?.createdAt ? new Date(resultData.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "26 October 2026";

    // Skill breakdown map
    const skillBreakdown = resultData?.skillBreakdown && Object.keys(resultData.skillBreakdown).length > 0
        ? Object.entries(resultData.skillBreakdown).map(([skill, score]) => ({
            skill,
            score: Math.round(score > 10 ? score : score * 10)
        }))
        : [
            { skill: "JavaScript", score: 90 },
            { skill: "React", score: 82 },
            { skill: "Problem solving", score: 82 },
            { skill: "System design", score: 62 }
        ];

    const strongAreas = resultData?.strongAreas?.length
        ? resultData.strongAreas
        : [
            "Explained architectural boundaries and state encapsulation clearly.",
            "Demonstrated strong problem-solving skills breaking requirements into manageable steps."
        ];

    const weakAreas = resultData?.weakAreas?.length
        ? resultData.weakAreas
        : [
            "Caching answer covered TTLs, but missed stale-while-revalidate and retry strategies.",
            "Consider explicitly naming failure modes and explaining error handling."
        ];

    const summaryFeedback = resultData?.summaryFeedback || "Strong foundations. Make your system-design reasoning more explicit.";

    // Responses list for detailed review table
    const responsesList = interviewData?.responses?.length
        ? interviewData.responses.map((r, idx) => {
            const rawScore = typeof r.score === "object" ? Number(r.score?.overallScore ?? 0) : Number(r.score ?? 0);
            let evaluation = "Not attempted";
            let evalColor = "#94a3b8";

            if (rawScore >= 8.5) {
                evaluation = "Strong";
                evalColor = "#16a34a";
            } else if (rawScore >= 7.0) {
                evaluation = "Good";
                evalColor = "#2563eb";
            } else if (rawScore >= 4.0) {
                evaluation = "Needs detail";
                evalColor = "#d97706";
            } else if (rawScore > 0) {
                evaluation = "Weak";
                evalColor = "#dc2626";
            }

            const isCodingQ = r.questionType === "coding" || Boolean(r.code);
            const isUntouched = rawScore === 0 && (!r.userAnswer?.trim() && (!r.code?.trim() || r.unchanged));
            const answerDisplay = isUntouched
                ? (isCodingQ ? "No code submitted." : "No answer submitted.")
                : (r.userAnswer || r.code || (isCodingQ ? "No code submitted." : "No answer submitted."));

            return {
                num: String(idx + 1).padStart(2, "0"),
                title: r.questionText || `Question ${idx + 1}`,
                skill: isCodingQ ? "Coding" : "Technical",
                evaluation,
                evalColor,
                answer: answerDisplay,
                feedback: r.aiFeedback || "Evaluated by AI engine based on technical relevance, correctness, and completeness."
            };
        })
        : [
            {
                num: "01",
                title: "Explain a closure and a practical use case.",
                skill: "JavaScript",
                evaluation: "Strong",
                evalColor: "#10b981",
                answer: "A closure is the combination of a function bundled together with references to its lexical environment.",
                feedback: "Clear explanation of lexical scope retention and encapsulation patterns."
            },
            {
                num: "02",
                title: "When should state be local vs lifted?",
                skill: "React",
                evaluation: "Strong",
                evalColor: "#10b981",
                answer: "State should remain as local as possible to avoid unnecessary re-renders of unrelated components.",
                feedback: "Accurately identified component coupling and avoided premature global state."
            },
            {
                num: "03",
                title: "How would you keep cached product data consistent when the underlying data changes?",
                skill: "System design",
                evaluation: "Needs detail",
                evalColor: "#f59e0b",
                answer: "I would use a cache-aside pattern: check the cache first, fetch from the database on a miss, then populate the cache.",
                feedback: "Your caching answer covered TTLs, but missed stale-while-revalidate and retry strategy when invalidation fails."
            }
        ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1216px", margin: "0 auto" }}>
            {/* Breadcrumb for Admin */}
            {isAdmin && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#64748b", marginBottom: "-12px" }}>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "12px", padding: 0, fontWeight: "600" }}
                    >
                        ← Back
                    </button>
                    <span>/</span>
                    <button
                        type="button"
                        onClick={() => navigate("/admin-dashboard")}
                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "12px", padding: 0 }}
                    >
                        Admin Overview
                    </button>
                    <span>/</span>
                    <span style={{ color: "#0f172a", fontWeight: "600" }}>Assessment Audit</span>
                </div>
            )}

            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between"
            }}>
                <div>
                    <div style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        marginBottom: "6px"
                    }}>
                        {isAdmin ? "Admin Audit · Assessment Record" : "Assessment Results"}
                    </div>
                    <h1 style={{
                        fontSize: "28px",
                        fontWeight: "800",
                        color: "#0f172a",
                        letterSpacing: "-0.03em",
                        margin: "0 0 6px 0"
                    }}>
                        {isAdmin ? "Candidate Assessment Audit" : "A clear baseline. A useful next step."}
                    </h1>
                    <p style={{
                        fontSize: "14px",
                        color: "#64748b",
                        margin: 0
                    }}>
                        {roleTitle} · {responsesList.length} questions · Completed {completedDate}
                    </p>
                </div>

                {isAdmin ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={() => navigate("/admin-dashboard")}
                            style={{
                                backgroundColor: "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "8px 16px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            ← Back to Admin Dashboard
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/candidate-data")}
                            style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#334155",
                                cursor: "pointer"
                            }}
                        >
                            Candidates Roster
                        </button>
                    </div>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard", { replace: true })}
                            style={{
                                backgroundColor: "#1e3a8a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "8px 16px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Return to Dashboard
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/practice")}
                            style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#334155",
                                cursor: "pointer"
                            }}
                        >
                            Practice Hub
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/history")}
                            style={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#334155",
                                cursor: "pointer"
                            }}
                        >
                            My Progress
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 16px", borderRadius: "8px", fontSize: "14px" }}>
                    {error}
                </div>
            )}

            {/* Score Row Split */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.5fr",
                gap: "20px"
            }}>
                {/* Overall Score Card */}
                <div style={{
                    backgroundColor: "#1e293b",
                    borderRadius: "14px",
                    padding: "32px",
                    color: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                }}>
                    <div>
                        <div style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.08em",
                            color: "#38bdf8",
                            marginBottom: "12px",
                            textTransform: "uppercase"
                        }}>
                            OVERALL SCORE
                        </div>
                        <div style={{
                            fontSize: "56px",
                            fontWeight: "800",
                            color: "#ffffff",
                            lineHeight: "1",
                            marginBottom: "16px"
                        }}>
                            {overallScorePercent}%
                        </div>
                        <p style={{
                            fontSize: "14px",
                            color: "#e2e8f0",
                            lineHeight: "1.5",
                            margin: 0
                        }}>
                            {summaryFeedback}
                        </p>
                    </div>

                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "24px" }}>
                        AI-assisted evaluation · Real-time scoring based on response quality and integrity.
                    </div>
                </div>

                {/* Skill Breakdown Card */}
                <div style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "32px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                }}>
                    <div>
                        <h2 style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 20px 0"
                        }}>
                            Your skill breakdown
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {skillBreakdown.map((item) => (
                                <div key={item.skill}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                                        <span style={{ fontWeight: "600", color: "#334155" }}>{item.skill}</span>
                                        <span style={{ fontWeight: "700", color: "#0f172a" }}>{item.score}%</span>
                                    </div>
                                    <div style={{ height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                                        <div style={{
                                            width: `${Math.min(100, item.score)}%`,
                                            height: "100%",
                                            backgroundColor: item.score >= 80 ? "#1e3a8a" : item.score >= 70 ? "#3b82f6" : "#60a5fa",
                                            borderRadius: "3px"
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "20px" }}>
                        Aggregated from answer completeness, technical reasoning, and execution test cases.
                    </div>
                </div>
            </div>

            {/* Strengths and Weaknesses side by side */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px"
            }}>
                {/* What you did well */}
                <div style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "24px"
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "16px"
                    }}>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                            What you did well
                        </h3>
                        <span style={{
                            backgroundColor: "#ecfdf5",
                            color: "#059669",
                            border: "1px solid #a7f3d0",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "11px",
                            fontWeight: "700"
                        }}>
                            Strength
                        </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#334155", lineHeight: "1.5" }}>
                        {strongAreas.map((st, i) => (
                            <div key={i}>• {st}</div>
                        ))}
                    </div>
                </div>

                {/* What to work on */}
                <div style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "24px"
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "16px"
                    }}>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                            What to work on
                        </h3>
                        <span style={{
                            backgroundColor: "#fffbeb",
                            color: "#d97706",
                            border: "1px solid #fde68a",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "11px",
                            fontWeight: "700"
                        }}>
                            Improvement area
                        </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px", color: "#334155", lineHeight: "1.5" }}>
                        {weakAreas.map((wa, i) => (
                            <div key={i}>• {wa}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recommended Next Step Card */}
            <div style={{
                backgroundColor: "#f0f7ff",
                border: "1px solid #dbeafe",
                borderRadius: "14px",
                padding: "24px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <div>
                    <div style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.06em",
                        color: "#2563eb",
                        textTransform: "uppercase",
                        marginBottom: "4px"
                    }}>
                        ONE RECOMMENDED NEXT STEP
                    </div>
                    <div style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", marginBottom: "2px" }}>
                        Targeted Practice: {skillBreakdown[skillBreakdown.length - 1]?.skill || "System Design"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#475569" }}>
                        Focus questions to build on your lowest scored skill area.
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        const weakSkill = skillBreakdown[skillBreakdown.length - 1]?.skill || "System Design";
                        navigate(`/practice/mock-setup?role=${encodeURIComponent(effectiveRole)}&skill=${encodeURIComponent(weakSkill)}&type=${encodeURIComponent(assessmentType)}`);
                    }}
                    style={{
                        backgroundColor: "#1e3a8a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "10px 18px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                    }}
                >
                    Practise this skill →
                </button>
            </div>

            {/* Detailed Table: Go deeper into your answers */}
            <div style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "24px"
            }}>
                <h3 style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#0f172a",
                    margin: "0 0 16px 0"
                }}>
                    Go deeper into your answers
                </h3>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                            <th style={{ padding: "10px 0", color: "#64748b", fontWeight: "600" }}>Question</th>
                            <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: "600" }}>Skill</th>
                            <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: "600" }}>AI evaluation</th>
                            <th style={{ padding: "10px 0", color: "#64748b", fontWeight: "600", textAlign: "right" }}>Review</th>
                        </tr>
                    </thead>
                    <tbody>
                        {responsesList.map((q) => (
                            <tr key={q.num} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "14px 0", color: "#0f172a", fontWeight: "600" }}>
                                    <span style={{ color: "#94a3b8", marginRight: "8px" }}>{q.num}</span>
                                    {q.title}
                                </td>
                                <td style={{ padding: "14px 16px", color: "#475569" }}>
                                    {q.skill}
                                </td>
                                <td style={{ padding: "14px 16px" }}>
                                    <span style={{
                                        color: q.evalColor,
                                        fontWeight: "600",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}>
                                        ● {q.evaluation}
                                    </span>
                                </td>
                                <td style={{ padding: "14px 0", textAlign: "right" }}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedQuestion(selectedQuestion === q.num ? null : q.num)}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            color: "#2563eb",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            fontSize: "13px"
                                        }}
                                    >
                                        {selectedQuestion === q.num ? "Close answer ▲" : "View answer →"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Expanded Answer Modal/Card */}
                {selectedQuestion && (
                    <div style={{
                        marginTop: "20px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "16px",
                        fontSize: "13px"
                    }}>
                        {(() => {
                            const item = responsesList.find(q => q.num === selectedQuestion);
                            if (!item) return null;
                            return (
                                <div>
                                    <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
                                        Submitted Candidate Response:
                                    </div>
                                    <div style={{
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #cbd5e1",
                                        padding: "12px",
                                        borderRadius: "6px",
                                        color: "#334155",
                                        lineHeight: "1.5",
                                        marginBottom: "12px",
                                        whiteSpace: "pre-wrap",
                                        fontFamily: item.skill === "Coding" ? "monospace" : "inherit"
                                    }}>
                                        {item.answer}
                                    </div>
                                    <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                                        AI Evaluator Feedback:
                                    </div>
                                    <div style={{ color: "#475569", lineHeight: "1.5" }}>
                                        {item.feedback}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Bottom Navigation Row */}
            <div style={{
                marginTop: "32px",
                padding: "20px 24px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px"
            }}>
                {isAdmin ? (
                    <>
                        <div>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                                Done auditing this candidate assessment?
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                                All scores, responses, and evaluation telemetry remain securely archived in the administrative records.
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => navigate("/admin-dashboard")}
                                className="wf-btn-primary"
                                style={{ padding: "9px 20px" }}
                            >
                                ← Back to Admin Dashboard
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/candidate-data")}
                                className="wf-btn-outline"
                                style={{ padding: "9px 16px" }}
                            >
                                View All Candidates
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                                Done reviewing your assessment?
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                                All scores and AI feedback are securely saved to your progress profile.
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => navigate("/dashboard", { replace: true })}
                                className="wf-btn-primary"
                                style={{ padding: "9px 20px" }}
                            >
                                Back to Dashboard →
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/practice")}
                                className="wf-btn-outline"
                                style={{ padding: "9px 16px" }}
                            >
                                Practice Hub
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
