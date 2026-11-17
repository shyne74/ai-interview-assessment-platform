import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
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

        // 4. Fetch Real Integrity Alerts
        setLoadingAlerts(true);
        try {
            const res = await api.get("/results/admin");
            const rawResults = res.data.results || [];

            // Filter real alerts: only medium or high risk, or flagged anomalies (exclude low-risk with 0 score)
            const alerts = rawResults.filter(r => {
                const plag = r.plagiarismReport || r.interviewId?.plagiarismSummary || {};
                const risk = (plag.riskLevel || plag.status || "").toLowerCase();
                const violations = r.interviewId?.violations?.length || 0;
                const flaggedCount = plag.flaggedCount || 0;

                // Never display LOW-risk attempts as alerts
                if (risk.includes("low") && violations === 0 && flaggedCount === 0) {
                    return false;
                }

                return risk.includes("high") || risk.includes("medium") || risk.includes("suspicious") || flaggedCount > 0 || violations >= 2;
            }).slice(0, 5).map(r => {
                const candName = r.candidateId?.username || r.candidateId?.email?.split("@")[0] || "Candidate";
                const candEmail = r.candidateId?.email || "";
                const role = r.roleTitle || "Technical Exam";
                const score = r.overallScore ?? 0;
                const plag = r.plagiarismReport || r.interviewId?.plagiarismSummary || {};
                const risk = (plag.riskLevel || plag.status || "Medium").toUpperCase();
                const violations = r.interviewId?.violations?.length || 0;
                const flaggedCount = plag.flaggedCount || 0;
                const resultId = r._id;
                const interviewId = r.interviewId?._id || r.interviewId;

                let reason = "Integrity anomaly flagged";
                if (violations >= 2) {
                    reason = `${violations} tab switch / window blur violations`;
                } else if (flaggedCount > 0) {
                    reason = `${flaggedCount} copy-paste or AI syntax anomalies`;
                } else if (risk.includes("HIGH")) {
                    reason = "High telemetry risk score";
                } else if (risk.includes("MEDIUM")) {
                    reason = "Unusual timing pattern";
                }

                return {
                    id: resultId,
                    interviewId: interviewId || resultId,
                    candName,
                    candEmail,
                    role,
                    score,
                    risk,
                    reason,
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
    const totalNeedingAttention = pendingQuestionsCount + integrityAlerts.length;

    // Defensive domain list filtering: remove keys > 40 chars, commas, or empty
    const validDomainEntries = Object.entries(analytics.domainAverages || {}).filter(([dom, score]) => {
        if (!dom || typeof dom !== "string") return false;
        const trimmed = dom.trim();
        if (trimmed.length > 40 || trimmed.includes(",")) return false;
        const lower = trimmed.toLowerCase();
        if (lower === "technical assessment" || lower === "general" || lower === "support engineering" || lower === "missing antimatter problem") return false;
        return typeof score === "number" && score > 0;
    });

    const displayedDomains = showAllDomains ? validDomainEntries : validDomainEntries.slice(0, 5);

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Overview</span>
            </div>

            {/* Header: title, 1-line text, 1 primary action + small refresh icon button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 className="wf-page-title">Overview</h1>
                    <p className="wf-page-subtitle">
                        Live platform activity, candidate submissions, and items requiring administrative review.
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                        type="button"
                        onClick={() => navigate("/admin/batches/new")}
                        className="wf-btn-primary"
                        style={{ fontSize: "13px", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                        <Mail size={14} /> Send exam invites
                    </button>
                    <button
                        type="button"
                        onClick={loadDashboardData}
                        className="wf-btn-outline"
                        title="Refresh data"
                        style={{ padding: "8px 10px", display: "inline-flex", alignItems: "center" }}
                    >
                        <RefreshCw size={14} className={loadingAnalytics ? "animate-spin" : ""} />
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

            {/* Top Row: Exactly 3 KPI Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "20px",
                    marginBottom: "28px"
                }}
            >
                {/* 1. Completed evaluations */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                        Completed evaluations
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", lineHeight: 1, marginBottom: "8px" }}>
                        {loadingAnalytics ? "..." : analytics.totalInterviews}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Total evaluations across all roles
                    </div>
                </div>

                {/* 2. Average score */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                        Average candidate score
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", lineHeight: 1, marginBottom: "8px" }}>
                        {loadingAnalytics ? "..." : analytics.averageScore} <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: "500" }}>/ 10</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Across {analytics.totalInterviews} evaluations{analytics.passRate > 0 ? ` · ${analytics.passRate}% scored 7 or higher` : ""}
                    </div>
                </div>

                {/* 3. Items needing review */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                        Items needing review
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: totalNeedingAttention > 0 ? "#d97706" : "#0f172a", lineHeight: 1, marginBottom: "8px" }}>
                        {loadingQuestions || loadingAlerts ? "..." : totalNeedingAttention}
                    </div>
                    <div style={{ fontSize: "12px" }}>
                        {totalNeedingAttention > 0 ? (
                            <Link
                                to={pendingQuestionsCount > 0 ? "/questionbank?status=pending" : "/candidate-data"}
                                style={{ color: "#2563eb", fontWeight: "600", textDecoration: "none" }}
                            >
                                {pendingQuestionsCount} questions · {integrityAlerts.length} flagged attempts →
                            </Link>
                        ) : (
                            <span style={{ color: "#059669", fontWeight: "500" }}>
                                All submissions and questions verified
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Panel: Needs Attention */}
            <div className="wf-card" style={{ marginBottom: "28px", padding: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                        Needs attention
                    </h2>
                    {totalNeedingAttention > 0 && (
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                            {totalNeedingAttention} action {totalNeedingAttention === 1 ? "item" : "items"}
                        </span>
                    )}
                </div>

                {totalNeedingAttention === 0 ? (
                    <div style={{ padding: "36px 20px", textAlign: "center" }}>
                        <div style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            backgroundColor: "#f0fdf4",
                            color: "#16a34a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 12px auto"
                        }}>
                            <CheckCircle2 size={22} />
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>
                            Nothing needs your attention right now.
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                            Zero flagged candidate attempts and all question catalog items are verified.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Questions awaiting review row */}
                        {pendingQuestionsCount > 0 && (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "14px 16px",
                                backgroundColor: "#fffbeb",
                                border: "1px solid #fef3c7",
                                borderRadius: "8px",
                                flexWrap: "wrap",
                                gap: "12px"
                            }}>
                                <div>
                                    <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#92400e" }}>
                                        {pendingQuestionsCount} {pendingQuestionsCount === 1 ? "question waiting for approval" : "questions waiting for approval"}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#78350f" }}>
                                        Catalog contributions waiting for review in question bank
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate("/questionbank?status=pending")}
                                    className="wf-btn-outline"
                                    style={{ padding: "6px 14px", fontSize: "12px", backgroundColor: "#ffffff" }}
                                >
                                    Review questions
                                </button>
                            </div>
                        )}

                        {/* Flagged Integrity Alerts Table */}
                        {integrityAlerts.length > 0 && (
                            <div>
                                <div style={{ fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "10px" }}>
                                    Flagged exam attempts ({integrityAlerts.length})
                                </div>
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1.5px solid #e2e8f0", textAlign: "left", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>
                                                <th style={{ padding: "8px 10px" }}>Candidate</th>
                                                <th style={{ padding: "8px 10px" }}>Role</th>
                                                <th style={{ padding: "8px 10px" }}>Score</th>
                                                <th style={{ padding: "8px 10px" }}>Flag reason</th>
                                                <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {integrityAlerts.map(alert => (
                                                <tr key={alert.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "10px" }}>
                                                        <div style={{ fontWeight: "600", color: "#0f172a" }}>{alert.candName}</div>
                                                        <div style={{ fontSize: "11px", color: "#64748b" }}>{alert.candEmail}</div>
                                                    </td>
                                                    <td style={{ padding: "10px", color: "#334155" }}>{alert.role}</td>
                                                    <td style={{ padding: "10px", fontWeight: "700", color: "#0f172a" }}>{alert.score} / 10</td>
                                                    <td style={{ padding: "10px" }}>
                                                        <span style={{
                                                            padding: "2px 8px",
                                                            borderRadius: "4px",
                                                            fontSize: "11px",
                                                            fontWeight: "700",
                                                            backgroundColor: alert.risk.includes("HIGH") ? "#fee2e2" : "#fef3c7",
                                                            color: alert.risk.includes("HIGH") ? "#991b1b" : "#92400e",
                                                            marginRight: "8px"
                                                        }}>
                                                            {alert.risk}
                                                        </span>
                                                        <span style={{ fontSize: "12px", color: "#64748b" }}>{alert.reason}</span>
                                                    </td>
                                                    <td style={{ padding: "10px", textAlign: "right" }}>
                                                        <Link
                                                            to={`/results/${alert.id}`}
                                                            className="wf-btn-outline"
                                                            style={{ fontSize: "11px", padding: "4px 12px", textDecoration: "none" }}
                                                        >
                                                            Audit
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Secondary Row: Weekly Volume + Domain Performance */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Secondary 1: Weekly Volume */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
                        <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                            Weekly evaluation volume
                        </h2>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                            {loadingAnalytics ? "Loading..." : `${totalWeeklyCompletions} attempts`}
                        </span>
                    </div>

                    {loadingAnalytics ? (
                        <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                            Loading volume data...
                        </div>
                    ) : totalWeeklyCompletions === 0 || analytics.weeklyVolume.length === 0 ? (
                        <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                            No evaluations in the last 8 weeks.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-end",
                                gap: "10px",
                                height: "140px",
                                padding: "10px 0 10px 0"
                            }}
                        >
                            {analytics.weeklyVolume.map((bar, idx) => (
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
                                            height: `${bar.height || Math.max(12, bar.count * 12)}px`,
                                            backgroundColor: bar.count > 0 ? "#16a34a" : "#e2e8f0",
                                            borderRadius: "4px",
                                            transition: "height 0.3s ease"
                                        }}
                                    />
                                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>
                                        {bar.week}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Secondary 2: Domain Averages */}
                <div className="wf-card" style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                            Domain performance averages
                        </h2>
                        {validDomainEntries.length > 5 && (
                            <button
                                type="button"
                                onClick={() => setShowAllDomains(!showAllDomains)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#2563eb",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    padding: 0
                                }}
                            >
                                {showAllDomains ? "Show top 5" : `View all (${validDomainEntries.length})`}
                            </button>
                        )}
                    </div>

                    {loadingAnalytics ? (
                        <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                            Calculating domain averages...
                        </div>
                    ) : validDomainEntries.length === 0 ? (
                        <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                            No domain data recorded yet.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {displayedDomains.map(([dom, avgScore]) => (
                                <div key={dom} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>{dom}</span>
                                    <span style={{ fontSize: "13px", fontWeight: "700", color: avgScore >= 7.0 ? "#059669" : "#d97706" }}>
                                        {avgScore} / 10
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
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
