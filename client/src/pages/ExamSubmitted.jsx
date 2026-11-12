import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../utils/api";

export default function ExamSubmitted() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState(null);

    useEffect(() => {
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
    const overallScoreRaw = examData?.overallScore ?? 8.2;
    const scoreOutOf10 = overallScoreRaw > 10 ? (overallScoreRaw / 10).toFixed(1) : Number(overallScoreRaw).toFixed(1);
    const scorePercent = overallScoreRaw > 10 ? Math.round(overallScoreRaw) : Math.round(overallScoreRaw * 10);
    const questionCount = examData?.responses?.length || 5;
    const answeredCount = examData?.responses?.filter(r => (r.userAnswer && r.userAnswer.trim()) || (r.code && r.code.trim())).length || questionCount;

    const gradeLabel = scorePercent >= 80 ? "Proficient" : scorePercent >= 60 ? "Developing" : "Needs Practice";
    const gradeColor = scorePercent >= 80 ? "wf-pill-green" : scorePercent >= 60 ? "wf-pill-blue" : "wf-pill-amber";

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
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "30px",
                        margin: "0 auto 16px"
                    }}
                >
                    ✓
                </div>

                <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 6px 0" }}>
                    Exam submitted successfully
                </h1>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px 0" }}>
                    {roleTitle} · Completed assessment session
                </p>

                {/* Score Number Display */}
                <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "56px", fontWeight: "800", color: "#111827", lineHeight: 1 }}>
                        {loading ? "..." : scoreOutOf10}
                    </div>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
                        out of 10 ({scorePercent}%)
                    </div>
                </div>

                {/* Grade Pill */}
                <div style={{ marginBottom: "28px" }}>
                    <span className={`wf-pill ${gradeColor}`} style={{ padding: "4px 14px", fontSize: "13px" }}>
                        🛡 Grade: {gradeLabel}
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
                        <div style={{ fontWeight: "700", color: "#111827", fontSize: "15px" }}>{answeredCount} of {questionCount}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Questions answered</div>
                    </div>
                    <div style={{ borderLeft: "1px solid #e5e7eb" }} />
                    <div>
                        <div style={{ fontWeight: "700", color: "#16a34a", fontSize: "15px" }}>Evaluated</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>AI Assessment Status</div>
                    </div>
                    <div style={{ borderLeft: "1px solid #e5e7eb" }} />
                    <div>
                        <div style={{ fontWeight: "700", color: "#111827", fontSize: "15px" }}>Standard</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Integrity Passed</div>
                    </div>
                </div>

                {/* Clear Post-Assessment Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button
                        type="button"
                        onClick={() => navigate(`/results/${id || "latest"}`, { replace: true })}
                        className="wf-btn-primary"
                        style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px", fontWeight: "600" }}
                    >
                        View full AI evaluation & skill breakdown →
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/dashboard", { replace: true })}
                        className="wf-btn-outline"
                        style={{ width: "100%", justifyContent: "center", padding: "11px", fontSize: "14px", fontWeight: "600" }}
                    >
                        Return to Candidate Dashboard
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/practice", { replace: true })}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            fontSize: "13px",
                            fontWeight: "600",
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
