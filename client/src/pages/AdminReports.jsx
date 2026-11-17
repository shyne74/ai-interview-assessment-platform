import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, ChevronDown, Sparkles, CheckCircle2, Shield, ArrowRight } from "lucide-react";
import api from "../utils/api";

export default function AdminReports({ defaultTab = "overview" }) {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine initial tab from prop or URL route
    const initialTab = location.pathname === "/admin-results" ? "submissions" : defaultTab;
    const [activeTab, setActiveTab] = useState(initialTab);

    // Sync active tab when URL changes
    useEffect(() => {
        if (location.pathname === "/admin-results") {
            setActiveTab("submissions");
        } else if (location.pathname === "/admin-analytics") {
            setActiveTab("overview");
        }
    }, [location.pathname]);

    // Analytics data state
    const [analytics, setAnalytics] = useState({
        totalResults: 0,
        averageScore: 0
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Submissions filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedSummaries, setExpandedSummaries] = useState(new Set());

    const toggleSummary = (id) => {
        setExpandedSummaries(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");
            const [analyticsRes, resultsRes] = await Promise.allSettled([
                api.get("/results/analytics"),
                api.get("/results/admin")
            ]);

            if (analyticsRes.status === "fulfilled" && analyticsRes.value?.data) {
                const data = analyticsRes.value.data;
                setAnalytics({
                    totalResults: data.totalResults ?? data.totalInterviews ?? 0,
                    averageScore: data.averageScore ?? 0
                });
            }

            if (resultsRes.status === "fulfilled" && resultsRes.value?.data) {
                setResults(resultsRes.value.data.results || []);
            }
        } catch (err) {
            console.error("Failed to load reports telemetry:", err);
            setError("Could not synchronize report records from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Domain distributions and averages
    const domainStats = useMemo(() => {
        const counts = {};
        const scoreSums = {};

        results.forEach((r) => {
            const d = (r.domain || r.roleTitle || "General").trim();
            if (d && !d.includes(",")) {
                counts[d] = (counts[d] || 0) + 1;
                scoreSums[d] = (scoreSums[d] || 0) + (r.overallScore || 0);
            }
        });

        return Object.entries(counts).map(([domain, count]) => ({
            domain,
            count,
            avgScore: Number((scoreSums[domain] / count).toFixed(1))
        })).sort((a, b) => b.count - a.count);
    }, [results]);

    // Score tier distribution
    const tiers = useMemo(() => {
        return {
            exceptional: results.filter((r) => (r.overallScore || 0) >= 8.5).length,
            proficient: results.filter((r) => (r.overallScore || 0) >= 7.0 && (r.overallScore || 0) < 8.5).length,
            competent: results.filter((r) => (r.overallScore || 0) >= 5.0 && (r.overallScore || 0) < 7.0).length,
            needsWork: results.filter((r) => (r.overallScore || 0) < 5.0).length
        };
    }, [results]);

    const totalEvals = results.length || analytics.totalResults;
    const proficientCount = tiers.exceptional + tiers.proficient;
    const passRate = totalEvals > 0 ? Math.round((proficientCount / totalEvals) * 100) : 0;

    // Filtered submissions list
    const filteredResults = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return results;

        return results.filter((r) => {
            const candidateName = (r.candidateId?.username || "").toLowerCase();
            const candidateEmail = (r.candidateId?.email || "").toLowerCase();
            const role = (r.roleTitle || "").toLowerCase();
            const domain = (r.domain || "").toLowerCase();

            return (
                candidateName.includes(query) ||
                candidateEmail.includes(query) ||
                role.includes(query) ||
                domain.includes(query)
            );
        });
    }, [results, searchTerm]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "overview" && location.pathname !== "/admin-analytics") {
            navigate("/admin-analytics", { replace: true });
        } else if (tab === "submissions" && location.pathname !== "/admin-results") {
            navigate("/admin-results", { replace: true });
        }
    };

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#0f172a", fontWeight: "600" }}>Reports</span>
            </div>

            {/* Header: Clean dark text, standard light styling */}
            <div style={{ marginBottom: "24px" }}>
                <h1 className="wf-page-title" style={{ color: "#0f172a", margin: "0 0 4px 0" }}>
                    Reports & evaluations
                </h1>
                <p className="wf-page-subtitle" style={{ color: "#64748b", margin: 0 }}>
                    Platform assessment metrics, score distribution, and detailed candidate submission logs.
                </p>
            </div>

            {error && (
                <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* Tabs Bar: Overview vs Submissions */}
            <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #e2e8f0", marginBottom: "28px" }}>
                <button
                    type="button"
                    onClick={() => handleTabChange("overview")}
                    style={{
                        padding: "10px 4px",
                        border: "none",
                        background: "none",
                        fontSize: "14px",
                        fontWeight: activeTab === "overview" ? "700" : "500",
                        color: activeTab === "overview" ? "#0f172a" : "#64748b",
                        borderBottom: activeTab === "overview" ? "2.5px solid #16a34a" : "2.5px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                    }}
                >
                    Overview
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange("submissions")}
                    style={{
                        padding: "10px 4px",
                        border: "none",
                        background: "none",
                        fontSize: "14px",
                        fontWeight: activeTab === "submissions" ? "700" : "500",
                        color: activeTab === "submissions" ? "#0f172a" : "#64748b",
                        borderBottom: activeTab === "submissions" ? "2.5px solid #16a34a" : "2.5px solid transparent",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease"
                    }}
                >
                    <span>Submissions</span>
                    <span style={{ fontSize: "11px", backgroundColor: activeTab === "submissions" ? "#f0fdf4" : "#f1f5f9", color: activeTab === "submissions" ? "#166534" : "#64748b", padding: "1px 7px", borderRadius: "10px", fontWeight: "600" }}>
                        {results.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
                <div>
                    {/* Top KPI Metrics Row */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                            gap: "20px",
                            marginBottom: "28px"
                        }}
                    >
                        <div className="wf-card" style={{ padding: "20px 24px" }}>
                            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                                Total evaluations
                            </div>
                            <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", lineHeight: 1, marginBottom: "8px" }}>
                                {loading ? "..." : totalEvals}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                                Completed interviews processed
                            </div>
                        </div>

                        <div className="wf-card" style={{ padding: "20px 24px" }}>
                            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                                Average candidate score
                            </div>
                            <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", lineHeight: 1, marginBottom: "8px" }}>
                                {loading ? "..." : analytics.averageScore} <span style={{ fontSize: "16px", color: "#94a3b8", fontWeight: "500" }}>/ 10</span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                                Mean across all evaluated questions
                            </div>
                        </div>

                        <div className="wf-card" style={{ padding: "20px 24px" }}>
                            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                                Proficient pass rate
                            </div>
                            <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", lineHeight: 1, marginBottom: "8px" }}>
                                {loading ? "..." : `${passRate}%`}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                                Candidates scoring 7.0 / 10 or higher
                            </div>
                        </div>
                    </div>

                    {/* Split Section: Score Distribution & Domain Performance */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
                        {/* Score Distribution Card */}
                        <div className="wf-card" style={{ padding: "24px" }}>
                            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 18px 0" }}>
                                Score distribution
                            </h2>

                            {loading ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                    Calculating distribution...
                                </div>
                            ) : totalEvals === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                    No evaluations recorded yet.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {[
                                        { label: "Exceptional (8.5 – 10)", count: tiers.exceptional, color: "#16a34a" },
                                        { label: "Proficient (7.0 – 8.4)", count: tiers.proficient, color: "#2563eb" },
                                        { label: "Competent (5.0 – 6.9)", count: tiers.competent, color: "#d97706" },
                                        { label: "Needs work (< 5.0)", count: tiers.needsWork, color: "#dc2626" }
                                    ].map((tier, idx) => {
                                        const pct = totalEvals > 0 ? Math.round((tier.count / totalEvals) * 100) : 0;
                                        return (
                                            <div key={idx}>
                                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#334155", marginBottom: "6px" }}>
                                                    <span style={{ fontWeight: "500" }}>{tier.label}</span>
                                                    <span style={{ color: "#64748b" }}>
                                                        <strong>{tier.count}</strong> {tier.count === 1 ? "candidate" : "candidates"} ({pct}%)
                                                    </span>
                                                </div>
                                                <div style={{ width: "100%", height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                                                    <div
                                                        style={{
                                                            width: `${pct}%`,
                                                            height: "100%",
                                                            backgroundColor: tier.color,
                                                            borderRadius: "4px",
                                                            transition: "width 0.3s ease"
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Domain Volume & Averages Card */}
                        <div className="wf-card" style={{ padding: "24px" }}>
                            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 18px 0" }}>
                                Domain volume & averages
                            </h2>

                            {loading ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                    Loading domain performance...
                                </div>
                            ) : domainStats.length === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                    No domain data recorded yet.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {domainStats.slice(0, 6).map((item) => (
                                        <div key={item.domain} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" }}>
                                            <div>
                                                <span style={{
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#0f172a",
                                                    backgroundColor: "#f1f5f9",
                                                    border: "1px solid #e2e8f0",
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    display: "inline-block",
                                                    marginBottom: "3px"
                                                }}>
                                                    {item.domain}
                                                </span>
                                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                    {item.count} {item.count === 1 ? "evaluation" : "evaluations"}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: item.avgScore >= 7.0 ? "#059669" : "#d97706" }}>
                                                {item.avgScore} / 10
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SUBMISSIONS */}
            {activeTab === "submissions" && (
                <div>
                    {/* Filter Bar (One single line) */}
                    <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ position: "relative", minWidth: "320px", flex: "1 1 320px" }}>
                            <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
                            <input
                                type="text"
                                placeholder="Filter by candidate name, email, role, or domain..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="wf-input"
                                style={{ width: "100%", padding: "7px 12px 7px 32px", fontSize: "13px" }}
                            />
                        </div>

                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                            Showing {filteredResults.length} of {results.length} submission(s)
                        </div>
                    </div>

                    {/* Submissions List Grid */}
                    {loading ? (
                        <div style={{ padding: "60px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                            Loading assessment evaluations...
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className="wf-card" style={{ padding: "48px 24px", textAlign: "center" }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>
                                No submissions found
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                                {searchTerm
                                    ? "No submissions matched your search query. Try clearing the filter."
                                    : "Candidate assessment submissions will appear here after completion."}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
                            {filteredResults.map((result) => {
                                const score = result.overallScore ?? 0;
                                const plag = result.plagiarismReport || result.interviewId?.plagiarismSummary || {};
                                const riskLevel = (plag.riskLevel || plag.status || "clean").toLowerCase();
                                const isExpanded = expandedSummaries.has(result._id);

                                return (
                                    <div
                                        key={result._id}
                                        className="wf-card"
                                        style={{
                                            padding: "20px",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            gap: "14px"
                                        }}
                                    >
                                        <div>
                                            {/* Candidate & Score Header */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                                <div>
                                                    <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                                                        {result.candidateId?.username || "Candidate"}
                                                    </div>
                                                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                                                        {result.candidateId?.email || "No email available"}
                                                    </div>
                                                </div>

                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: "16px", fontWeight: "800", color: score >= 7 ? "#059669" : "#d97706" }}>
                                                        {score} <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>/ 10</span>
                                                    </div>
                                                    <span style={{
                                                        padding: "2px 7px",
                                                        borderRadius: "4px",
                                                        fontSize: "10.5px",
                                                        fontWeight: "700",
                                                        backgroundColor:
                                                            riskLevel.includes("high") ? "#fee2e2" :
                                                            riskLevel.includes("medium") ? "#fef3c7" : "#ecfdf5",
                                                        color:
                                                            riskLevel.includes("high") ? "#991b1b" :
                                                            riskLevel.includes("medium") ? "#92400e" : "#065f46"
                                                    }}>
                                                        {riskLevel.includes("high") ? "HIGH RISK" : riskLevel.includes("medium") ? "MEDIUM RISK" : "CLEAN"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Role & Date Subtitle */}
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                                                <span style={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", color: "#0f172a", padding: "1px 6px", borderRadius: "4px", fontWeight: "500" }}>
                                                    {result.domain || "General"}
                                                </span>
                                                <span>{result.roleTitle || "Technical Exam"}</span>
                                                <span>•</span>
                                                <span>{new Date(result.createdAt || Date.now()).toLocaleDateString()}</span>
                                            </div>

                                            {/* AI Summary: Collapsed by Default */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSummary(result._id)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        padding: 0,
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        color: "#2563eb",
                                                        cursor: "pointer",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px"
                                                    }}
                                                >
                                                    <span>{isExpanded ? "Hide summary" : "Show summary"}</span>
                                                    <ChevronDown size={13} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                                                </button>

                                                {isExpanded && (
                                                    <div style={{
                                                        marginTop: "8px",
                                                        padding: "10px 12px",
                                                        backgroundColor: "#f8fafc",
                                                        border: "1px solid #e2e8f0",
                                                        borderRadius: "6px",
                                                        fontSize: "12.5px",
                                                        lineHeight: "1.5",
                                                        color: "#334155"
                                                    }}>
                                                        {result.summaryFeedback || "Assessment evaluated with automated multi-factor scoring."}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* View Full Report Link */}
                                        <div style={{ paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                                            <Link
                                                to={`/results/${result._id}`}
                                                className="wf-btn-outline"
                                                style={{ fontSize: "11.5px", padding: "5px 12px", textDecoration: "none" }}
                                            >
                                                View full report →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
