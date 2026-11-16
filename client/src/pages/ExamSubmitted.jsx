import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

export default function ExamSubmitted() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        let isMounted = true;
        async function fetchExamDetails() {
            if (!id || id === "sample") {
                setLoading(false);
                return;
            }
            try {
                // Try fetching from results first
                const res = await api.get(`/results/${id}`);
                if (isMounted && res.data) {
                    setExamData(res.data.result || res.data.interview || res.data);
                }
            } catch (err) {
                // Fallback to interview endpoint
                try {
                    const fallbackRes = await api.get(`/interviews/${id}`);
                    if (isMounted && fallbackRes.data) {
                        setExamData(fallbackRes.data.interview || fallbackRes.data);
                    }
                } catch (e) {
                    console.warn("Could not retrieve specific exam summary, using fallback.", e);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchExamDetails();
        return () => { isMounted = false; };
    }, [id]);

    const roleTitle = examData?.roleTitle || "Technical Assessment";
    const overallScoreRaw = examData?.overallScore !== undefined && examData?.overallScore !== null ? Number(examData.overallScore) : 0.0;
    const scoreOutOf10 = overallScoreRaw > 10 ? (overallScoreRaw / 10).toFixed(1) : overallScoreRaw.toFixed(1);
    const scorePercent = overallScoreRaw > 10 ? Math.round(overallScoreRaw) : Math.round(overallScoreRaw * 10);
    const questionCount = examData?.responses?.length || 5;

    const answeredCount = examData?.responses?.filter(r => {
        const hasText = Boolean(r.userAnswer && r.userAnswer.trim().length > 0);
        const hasCode = Boolean(r.code && r.code.trim().length > 0 && r.score?.overallScore > 0);
        return hasText || hasCode;
    }).length || 0;

    let gradeLabel = "Not Attempted";
    let gradeColor = "wf-pill-amber";

    if (overallScoreRaw >= 8.5) {
        gradeLabel = "Strong";
        gradeColor = "wf-pill-green";
    } else if (overallScoreRaw >= 7.0) {
        gradeLabel = "Good";
        gradeColor = "wf-pill-green";
    } else if (overallScoreRaw >= 4.0) {
        gradeLabel = "Needs Detail";
        gradeColor = "wf-pill-blue";
    } else if (overallScoreRaw > 0) {
        gradeLabel = "Weak";
        gradeColor = "wf-pill-amber";
    }

    const hasViolations = Boolean(examData?.violations && examData.violations.length > 0);

    return (
        <div style={{ maxWidth: "680px", margin: "40px auto 0", padding: "0 16px" }}>
            <div
                style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "16px",
                    padding: "44px 40px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}
            >
                {/* Green Check Circle */}
                <div
                    style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        backgroundColor: "#ecfdf5",
                        color: "#16a34a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px auto"
                    }}
                >
                    <CheckCircle2 size={32} strokeWidth={2} />
                </div>

                <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111827", margin: "0 0 6px 0" }}>
                    Exam submitted successfully
                </h1>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px 0" }}>
                    {roleTitle} · Completed assessment session
                </p>

                {/* Score Number Display */}
                <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "52px", fontWeight: "600", color: "#111827", lineHeight: 1 }}>
                        {loading ? "..." : scoreOutOf10}
                    </div>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "6px" }}>
                        out of 10 ({scorePercent}%)
                    </div>
                </div>

                {/* Grade Pill */}
                <div style={{ marginBottom: "28px" }}>
                    <span className={`wf-pill ${gradeColor}`} style={{ padding: "4px 14px", fontSize: "13px", fontWeight: "500" }}>
                        Grade: {gradeLabel}
                    </span>
                </div>

                {/* Meta stats */}
                <div
                    style={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "16px 20px",
                        fontSize: "13px",
                        color: "#4b5563",
                        marginBottom: "32px",
                        display: "flex",
                        justifyContent: "space-around"
                    }}
                >
                    <div>
                        <div style={{ fontWeight: "600", color: "#111827", fontSize: "15px" }}>{answeredCount} of {questionCount}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Questions answered</div>
                    </div>
                    <div style={{ borderLeft: "1px solid #e5e7eb" }} />
                    <div>
                        <div style={{ fontWeight: "600", color: "#16a34a", fontSize: "15px" }}>Complete</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Evaluation status</div>
                    </div>
                    <div style={{ borderLeft: "1px solid #e5e7eb" }} />
                    <div>
                        <div style={{ fontWeight: "600", color: hasViolations ? "#b45309" : "#16a34a", fontSize: "15px" }}>
                            {hasViolations ? "Flagged" : "Passed"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Integrity check</div>
                    </div>
                </div>

                {/* Clear Post-Assessment Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button
                        type="button"
                        onClick={() => navigate(`/results/${id || "latest"}`, { replace: true })}
                        className="wf-btn-primary"
                        style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px", fontWeight: "500" }}
                    >
                        <span>View full AI evaluation & skill breakdown</span>
                        <ArrowRight size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/dashboard", { replace: true })}
                        className="wf-btn-outline"
                        style={{ width: "100%", justifyContent: "center", padding: "11px", fontSize: "14px", fontWeight: "500" }}
                    >
                        Return to candidate dashboard
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/practice", { replace: true })}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#16a34a",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            padding: "8px"
                        }}
                    >
                        Start another assessment →
                    </button>
                </div>
            </div>
        </div>
    );
}
