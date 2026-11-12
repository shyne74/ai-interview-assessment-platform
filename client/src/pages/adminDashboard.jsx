import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalQuestions: 0,
        pendingApproval: 0,
        candidatesCount: 0,
        examsEvaluated: 0,
        avgScore: 0,
        flaggedIntegrityCount: 0,
        weeklyVolume: [],
        lowInventoryRoles: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError("");

                const [analyticsRes, summaryRes, candidatesRes] = await Promise.allSettled([
                    api.get("/results/analytics"),
                    api.get("/question/folders/summary"),
                    api.get("/auth/candidates")
                ]);

                let totalQuestions = 0;
                let pendingApproval = 0;
                if (summaryRes.status === "fulfilled" && summaryRes.value?.data) {
                    const data = summaryRes.value.data;
                    totalQuestions = data.totalGlobalQuestions || 0;
                    if (Array.isArray(data.folders)) {
                        pendingApproval = data.folders.reduce((acc, f) => acc + (f.pendingCount || 0), 0);
                    }
                }

                let candidatesCount = 0;
                if (candidatesRes.status === "fulfilled" && candidatesRes.value?.data) {
                    candidatesCount = candidatesRes.value.data.candidates?.length || 0;
                }

                let examsEvaluated = 0;
                let avgScore = 0;
                let flaggedIntegrityCount = 0;
                let weeklyVolume = [];
                let lowInventoryRoles = [];

                if (analyticsRes.status === "fulfilled" && analyticsRes.value?.data) {
                    const aData = analyticsRes.value.data;
                    examsEvaluated = aData.totalResults || 0;
                    avgScore = aData.averageScore || 0;
                    flaggedIntegrityCount = aData.flaggedIntegrityCount || 0;
                    weeklyVolume = aData.weeklyVolume || [];
                    lowInventoryRoles = aData.lowInventoryRoles || [];
                }

                setStats({
                    totalQuestions,
                    pendingApproval,
                    candidatesCount,
                    examsEvaluated,
                    avgScore,
                    flaggedIntegrityCount,
                    weeklyVolume,
                    lowInventoryRoles
                });
            } catch (err) {
                console.error("Failed to load admin overview stats:", err);
                setError("Failed to synchronize dashboard metrics from server.");
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const totalWeeklyAttempts = stats.weeklyVolume.reduce((acc, v) => acc + (v.count || 0), 0);

    return (
        <div>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Overview</span>
            </div>

            {/* Header */}
            <div style={{ marginBottom: "28px" }}>
                <h1 className="wf-page-title">Platform overview</h1>
                <p className="wf-page-subtitle">
                    Live platform health, question bank readiness, and candidate evaluation throughput.
                </p>
            </div>

            {error && (
                <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* 4 KPI Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "20px",
                    marginBottom: "28px"
                }}
            >
                {/* KPI 1: Questions */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        Total questions
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#111827", lineHeight: 1, marginBottom: "8px" }}>
                        {loading ? "..." : stats.totalQuestions}
                    </div>
                    <div style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>
                        Active in Question Bank
                    </div>
                </div>

                {/* KPI 2: Pending Approval */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        Pending approval
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: stats.pendingApproval > 0 ? "#d97706" : "#111827", lineHeight: 1, marginBottom: "8px" }}>
                        {loading ? "..." : stats.pendingApproval}
                    </div>
                    {stats.pendingApproval > 0 ? (
                        <Link
                            to="/questionbank"
                            style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: "600" }}
                        >
                            Review now →
                        </Link>
                    ) : (
                        <div style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}>
                            All questions validated
                        </div>
                    )}
                </div>

                {/* KPI 3: Candidates */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        Active candidates
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#111827", lineHeight: 1, marginBottom: "8px" }}>
                        {loading ? "..." : stats.candidatesCount}
                    </div>
                    <Link
                        to="/candidate-data"
                        style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: "600" }}
                    >
                        View candidates roster →
                    </Link>
                </div>

                {/* KPI 4: Exams Evaluated */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        Exams evaluated
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#111827", lineHeight: 1, marginBottom: "8px" }}>
                        {loading ? "..." : stats.examsEvaluated}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        Avg score: <strong style={{ color: "#111827" }}>{loading ? "..." : stats.avgScore}</strong> / 10
                    </div>
                </div>
            </div>

            {/* Split Section: Weekly volume + Needs attention */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
                {/* Left Card: Weekly volume bar chart */}
                <div className="wf-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
                            Weekly evaluation volume
                        </h2>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            {loading ? "Loading..." : `${totalWeeklyAttempts} completions in 8 weeks`}
                        </span>
                    </div>

                    {/* Bar visualization */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-end",
                            gap: "12px",
                            height: "170px",
                            padding: "10px 0 20px 0",
                            borderBottom: "1px solid #f3f4f6",
                            marginBottom: "12px"
                        }}
                    >
                        {loading ? (
                            <div style={{ width: "100%", textAlign: "center", color: "#6b7280", fontSize: "13px", alignSelf: "center" }}>
                                Loading historical throughput...
                            </div>
                        ) : stats.weeklyVolume.length === 0 ? (
                            <div style={{ width: "100%", textAlign: "center", color: "#6b7280", fontSize: "13px", alignSelf: "center" }}>
                                No completed evaluations recorded yet.
                            </div>
                        ) : (
                            stats.weeklyVolume.map((bar, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: "6px"
                                    }}
                                    title={`${bar.week}: ${bar.count} attempts completed`}
                                >
                                    <div
                                        style={{
                                            width: "100%",
                                            height: `${bar.height}px`,
                                            backgroundColor: bar.count > 0 ? "#16a34a" : "#e5e7eb",
                                            borderRadius: "4px",
                                            transition: "height 0.3s ease"
                                        }}
                                    />
                                    <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "500" }}>
                                        {bar.week}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280" }}>
                        <span>8-week longitudinal trend</span>
                        <span>Height proportional to volume</span>
                    </div>
                </div>

                {/* Right Card: Needs attention */}
                <div className="wf-card">
                    <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: "0 0 20px 0" }}>
                        Needs attention
                    </h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Item 1: Pending questions */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingBottom: "14px",
                                borderBottom: "1px solid #f3f4f6"
                            }}
                        >
                            <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
                                {stats.pendingApproval > 0
                                    ? `${stats.pendingApproval} questions waiting for approval`
                                    : "All questions in bank validated"}
                            </span>
                            <button
                                type="button"
                                onClick={() => navigate("/questionbank")}
                                className="wf-btn-outline"
                                style={{ padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}
                            >
                                {stats.pendingApproval > 0 ? "Review" : "Open Bank"}
                            </button>
                        </div>

                        {/* Item 2: Flagged integrity */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingBottom: "14px",
                                borderBottom: "1px solid #f3f4f6"
                            }}
                        >
                            <span style={{ fontSize: "13px", color: stats.flaggedIntegrityCount > 0 ? "#dc2626" : "#374151", fontWeight: "500" }}>
                                {stats.flaggedIntegrityCount > 0
                                    ? `${stats.flaggedIntegrityCount} attempts flagged high integrity risk`
                                    : "Zero anomalous integrity flags"}
                            </span>
                            <button
                                type="button"
                                onClick={() => navigate("/candidate-data")}
                                className="wf-btn-outline"
                                style={{ padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}
                            >
                                Inspect
                            </button>
                        </div>

                        {/* Item 3: Role inventory */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }}
                        >
                            <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
                                {stats.lowInventoryRoles.length > 0
                                    ? `${stats.lowInventoryRoles[0].role} has only ${stats.lowInventoryRoles[0].count} approved questions`
                                    : "All roles have adequate approved questions"}
                            </span>
                            <button
                                type="button"
                                onClick={() => navigate("/aigenerator")}
                                className="wf-btn-outline"
                                style={{ padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
