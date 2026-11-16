import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail } from "lucide-react";
import api from "../utils/api";
import AssignTestModal from "../components/AssignTestModal";

export default function AdminDashboard() {
    const navigate = useNavigate();

    // KPI & Analytics State
    const [analytics, setAnalytics] = useState({
        totalInterviews: 0,
        averageScore: 0,
        integrityFlags: 0,
        passRate: 0,
        weeklyVolume: [],
        domainAverages: {}
    });
    const [loadingAnalytics, setLoadingAnalytics] = useState(true);
    const [errorAnalytics, setErrorAnalytics] = useState("");

    // Pending Questions State
    const [pendingQuestionsCount, setPendingQuestionsCount] = useState(0);
    const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
    const [loadingQuestions, setLoadingQuestions] = useState(true);

    // Candidates State
    const [candidateStats, setCandidateStats] = useState({
        count: 0,
        recentSignups: []
    });
    const [loadingCandidates, setLoadingCandidates] = useState(true);

    // Integrity Alerts State (from GET /api/results/admin)
    const [integrityAlerts, setIntegrityAlerts] = useState([]);
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [showAllDomains, setShowAllDomains] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);

    const loadDashboardData = async () => {
        // 1. Fetch Analytics
        setLoadingAnalytics(true);
        setErrorAnalytics("");
        try {
            const res = await api.get("/results/analytics");
            const data = res.data || {};
            setAnalytics({
                totalInterviews: data.totalInterviews ?? data.totalResults ?? 0,
                averageScore: data.averageScore ?? 0,
                integrityFlags: data.integrityFlags ?? data.flaggedIntegrityCount ?? 0,
                passRate: data.passRate ?? 0,
                weeklyVolume: Array.isArray(data.weeklyVolume) ? data.weeklyVolume : [],
                domainAverages: data.domainAverages || {}
            });
        } catch (err) {
            console.error("Failed to load analytics:", err);
            setErrorAnalytics("Could not synchronize analytics metrics from server.");
        } finally {
            setLoadingAnalytics(false);
        }

        // 2. Fetch Questions Bank Status
        setLoadingQuestions(true);
        try {
            const [pendingRes, allRes] = await Promise.allSettled([
                api.get("/question?status=pending&limit=1"),
                api.get("/question/folders/summary")
            ]);

            if (pendingRes.status === "fulfilled" && pendingRes.value?.data) {
                setPendingQuestionsCount(pendingRes.value.data.total ?? 0);
            }
            if (allRes.status === "fulfilled" && allRes.value?.data) {
                setTotalQuestionsCount(allRes.value.data.totalGlobalQuestions ?? 0);
            }
        } catch (err) {
            console.error("Failed to load questions status:", err);
        } finally {
            setLoadingQuestions(false);
        }

        // 3. Fetch Candidates Roster
        setLoadingCandidates(true);
        try {
            const res = await api.get("/auth/candidates");
            const list = res.data.candidates || [];
            setCandidateStats({
                count: list.length,
                recentSignups: list.slice(0, 4)
            });
        } catch (err) {
            console.error("Failed to load candidates count:", err);
        } finally {
            setLoadingCandidates(false);
        }

        // 4. Fetch Recent Integrity Alerts from All Results
        setLoadingAlerts(true);
        try {
            const res = await api.get("/results/admin");
            const rawResults = res.data.results || [];
            
            // Filter attempts with risk medium or high, or flagged anomalies
            const alerts = rawResults.filter(r => {
                const plag = r.plagiarismReport || r.interviewId?.plagiarismSummary || {};
                const risk = (plag.riskLevel || plag.status || "").toLowerCase();
                const violations = r.interviewId?.violations?.length || 0;
                return risk.includes("high") || risk.includes("medium") || risk.includes("suspicious") || (plag.flaggedCount > 0) || violations >= 2;
            }).slice(0, 5).map(r => {
                const candName = r.candidateId?.username || r.candidateId?.email?.split("@")[0] || "Candidate";
                const candEmail = r.candidateId?.email || "";
                const role = r.roleTitle || "Technical Exam";
                const score = r.overallScore ?? 0;
                const plag = r.plagiarismReport || r.interviewId?.plagiarismSummary || {};
                const risk = (plag.riskLevel || plag.status || "Medium").toUpperCase();
                const violations = r.interviewId?.violations?.length || 0;
                const resultId = r._id;
                const interviewId = r.interviewId?._id || r.interviewId;

                return {
                    id: resultId,
                    interviewId: interviewId || resultId,
                    candName,
                    candEmail,
                    role,
                    score,
                    risk,
                    violations,
                    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"
                };
            });

            setIntegrityAlerts(alerts);
        } catch (err) {
            console.error("Failed to load integrity alerts:", err);
        } finally {
            setLoadingAlerts(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const totalWeeklyCompletions = analytics.weeklyVolume.reduce((acc, v) => acc + (v.count || 0), 0);

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Overview</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 className="wf-page-title">Platform overview</h1>
                    <p className="wf-page-subtitle">
                        Live platform health, candidate throughput, questions awaiting validation, and integrity monitoring.
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                        type="button"
                        onClick={() => setAssignModalOpen(true)}
                        className="wf-btn-primary"
                        style={{ fontSize: "12px", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                        <Mail size={14} /> Assign Test & Send Invite
                    </button>
                    <button
                        type="button"
                        onClick={loadDashboardData}
                        className="wf-btn-outline"
                        style={{ fontSize: "12px", padding: "8px 14px" }}
                    >
                        🔄 Refresh Data
                    </button>
                </div>
            </div>

            {errorAnalytics && (
                <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>⚠ {errorAnalytics}</span>
                    <button onClick={loadDashboardData} style={{ background: "none", border: "none", color: "#991b1b", textDecoration: "underline", cursor: "pointer", fontWeight: "700" }}>
                        Retry
                    </button>
                </div>
            )}

            {/* 4 Primary KPI Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "20px",
                    marginBottom: "28px"
                }}
            >
                {/* KPI 1: Total Interviews */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        Total evaluations
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#111827", lineHeight: 1, marginBottom: "8px" }}>
                        {loadingAnalytics ? "..." : analytics.totalInterviews}
                    </div>
                    <div style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}>
                        Pass rate: {loadingAnalytics ? "..." : `${analytics.passRate}%`}
                    </div>
                </div>

                {/* KPI 2: Average Score */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        Average candidate score
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#111827", lineHeight: 1, marginBottom: "8px" }}>
                        {loadingAnalytics ? "..." : `${analytics.averageScore}`} <span style={{ fontSize: "16px", color: "#9ca3af", fontWeight: "500" }}>/ 10</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        Across all evaluated attempts
                    </div>
                </div>

                {/* KPI 3: Integrity Flags */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        Integrity alerts
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: analytics.integrityFlags > 0 ? "#dc2626" : "#111827", lineHeight: 1, marginBottom: "8px" }}>
                        {loadingAnalytics ? "..." : analytics.integrityFlags}
                    </div>
                    <div style={{ fontSize: "12px", color: analytics.integrityFlags > 0 ? "#dc2626" : "#059669", fontWeight: "600" }}>
                        {analytics.integrityFlags > 0 ? "Requires review" : "Zero active risk alerts"}
                    </div>
                </div>

                {/* KPI 4: Questions Awaiting Review */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        Questions awaiting review
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: pendingQuestionsCount > 0 ? "#d97706" : "#111827", lineHeight: 1, marginBottom: "8px" }}>
                        {loadingQuestions ? "..." : pendingQuestionsCount}
                    </div>
                    <Link
                        to="/questionbank?status=pending"
                        style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none", fontWeight: "600" }}
                    >
                        {pendingQuestionsCount > 0 ? "Open review queue →" : "All questions verified →"}
                    </Link>
                </div>
            </div>

            {/* Split Section: Weekly Volume Chart + Needs Attention / Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px", marginBottom: "28px" }}>
                {/* Left: 8-Week Evaluation Volume Chart */}
                <div className="wf-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
                            Weekly evaluation volume
                        </h2>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            {loadingAnalytics ? "Loading..." : `${totalWeeklyCompletions} attempts in past 8 weeks`}
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
                        {loadingAnalytics ? (
                            <div style={{ width: "100%", textAlign: "center", color: "#6b7280", fontSize: "13px", alignSelf: "center" }}>
                                Loading volume trends...
                            </div>
                        ) : analytics.weeklyVolume.length === 0 ? (
                            <div style={{ width: "100%", textAlign: "center", color: "#6b7280", fontSize: "13px", alignSelf: "center" }}>
                                No completed evaluations recorded yet.
                            </div>
                        ) : (
                            analytics.weeklyVolume.map((bar, idx) => (
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
                                            height: `${bar.height || Math.max(16, bar.count * 15)}px`,
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

                {/* Right: Needs Attention & Action Hub */}
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
                            <div>
                                <div style={{ fontSize: "13px", color: "#111827", fontWeight: "600" }}>
                                    {pendingQuestionsCount > 0
                                        ? `${pendingQuestionsCount} questions waiting for approval`
                                        : "All questions in bank validated"}
                                </div>
                                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                    {totalQuestionsCount} total questions in catalog
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate("/questionbank?status=pending")}
                                className="wf-btn-outline"
                                style={{ padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}
                            >
                                {pendingQuestionsCount > 0 ? "Review" : "Open Bank"}
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
                            <div>
                                <div style={{ fontSize: "13px", color: analytics.integrityFlags > 0 ? "#dc2626" : "#111827", fontWeight: "600" }}>
                                    {analytics.integrityFlags > 0
                                        ? `${analytics.integrityFlags} attempts flagged for review`
                                        : "Zero high integrity risks"}
                                </div>
                                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                    Tab switches & copy-paste alerts
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate("/candidate-data")}
                                className="wf-btn-outline"
                                style={{ padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}
                            >
                                Inspect
                            </button>
                        </div>

                        {/* Item 3: Candidate registration */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }}
                        >
                            <div>
                                <div style={{ fontSize: "13px", color: "#111827", fontWeight: "600" }}>
                                    {candidateStats.count} registered candidates
                                </div>
                                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                    Add new test-takers or bulk import CSV
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate("/admin/candidates/add")}
                                className="wf-btn-outline"
                                style={{ padding: "5px 14px", fontSize: "12px", cursor: "pointer" }}
                            >
                                + Register
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Recent Integrity Alerts Table + Domain Averages Card */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
                {/* Recent Integrity Alerts */}
                <div className="wf-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
                            Recent integrity alerts
                        </h2>
                        <Link to="/candidate-data" style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                            View all attempts →
                        </Link>
                    </div>

                    {loadingAlerts ? (
                        <div style={{ padding: "24px 0", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                            Checking integrity telemetry...
                        </div>
                    ) : integrityAlerts.length === 0 ? (
                        <div style={{ padding: "24px 0", textAlign: "center", color: "#059669", fontSize: "13px", fontWeight: "600" }}>
                            ✓ No suspicious attempts flagged. All evaluations meet integrity thresholds.
                        </div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ borderBottom: "1.5px solid #e5e7eb", textAlign: "left", color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>
                                    <th style={{ padding: "8px 10px" }}>Candidate</th>
                                    <th style={{ padding: "8px 10px" }}>Role</th>
                                    <th style={{ padding: "8px 10px" }}>Score</th>
                                    <th style={{ padding: "8px 10px" }}>Risk Level</th>
                                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {integrityAlerts.map(alert => (
                                    <tr key={alert.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                        <td style={{ padding: "10px" }}>
                                            <div style={{ fontWeight: "600", color: "#111827" }}>{alert.candName}</div>
                                            <div style={{ fontSize: "11px", color: "#6b7280" }}>{alert.candEmail}</div>
                                        </td>
                                        <td style={{ padding: "10px", color: "#374151" }}>{alert.role}</td>
                                        <td style={{ padding: "10px", fontWeight: "700", color: "#111827" }}>{alert.score} / 10</td>
                                        <td style={{ padding: "10px" }}>
                                            <span style={{
                                                padding: "3px 8px",
                                                borderRadius: "4px",
                                                fontSize: "11px",
                                                fontWeight: "700",
                                                backgroundColor: alert.risk.includes("HIGH") ? "#fee2e2" : "#fef3c7",
                                                color: alert.risk.includes("HIGH") ? "#991b1b" : "#92400e"
                                            }}>
                                                {alert.risk}
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px", textAlign: "right" }}>
                                            <Link
                                                to={`/results/${alert.id}`}
                                                className="wf-btn-outline"
                                                style={{ fontSize: "11px", padding: "4px 10px", textDecoration: "none" }}
                                            >
                                                Audit →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Domain Performance Averages */}
                <div className="wf-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
                            Domain performance averages
                        </h2>
                    </div>

                    {loadingAnalytics ? (
                        <div style={{ padding: "24px 0", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                            Calculating domain averages...
                        </div>
                    ) : (() => {
                        // Defensive filtering: ignore keys > 40 chars, containing commas, or generic placeholders
                        const validDomainEntries = Object.entries(analytics.domainAverages || {}).filter(([dom]) => {
                            if (!dom || typeof dom !== "string") return false;
                            const trimmed = dom.trim();
                            if (trimmed.length > 40 || trimmed.includes(",")) return false;
                            const lower = trimmed.toLowerCase();
                            if (lower === "technical assessment" || lower === "general" || lower === "support engineering" || lower === "missing antimatter problem") return false;
                            return true;
                        });

                        if (validDomainEntries.length === 0) {
                            return (
                                <div style={{ padding: "24px 0", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                    No domain data yet
                                </div>
                            );
                        }

                        const displayedEntries = showAllDomains ? validDomainEntries : validDomainEntries.slice(0, 8);

                        return (
                            <div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {displayedEntries.map(([dom, avgScore]) => (
                                        <div key={dom} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid #f3f4f6" }}>
                                            <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>{dom}</span>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: avgScore >= 7.0 ? "#059669" : "#d97706" }}>
                                                {avgScore} / 10
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {validDomainEntries.length > 8 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllDomains(!showAllDomains)}
                                        style={{
                                            marginTop: "14px",
                                            background: "none",
                                            border: "none",
                                            color: "#2563eb",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            padding: 0,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}
                                    >
                                        {showAllDomains ? "Show top 8" : `View all (${validDomainEntries.length}) →`}
                                    </button>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Modal: Assign Test & Send Invite */}
            <AssignTestModal
                isOpen={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                onAssigned={loadDashboardData}
            />
        </div>
    );
}
