import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function History() {
    const navigate = useNavigate();
    const [formatFilter, setFormatFilter] = useState("All formats");
    const [loading, setLoading] = useState(true);
    const [attempts, setAttempts] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get("/results");
                const raw = res.data.results || [];
                const parsed = raw.map((item) => {
                    const rawScore = item.overallScore || 0;
                    const score = rawScore <= 10 ? Math.round(rawScore * 10) : Math.round(rawScore);
                    const dt = item.createdAt ? new Date(item.createdAt) : new Date();
                    const dateFormatted = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                    const chartDate = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                    const isAdaptive = item.roleTitle?.toLowerCase().includes("adaptive") || item.domain?.toLowerCase().includes("adaptive");
                    return {
                        id: item.interviewId || item._id,
                        assessment: item.roleTitle || item.domain || "Technical Interview",
                        format: isAdaptive ? "Adaptive" : "Standard",
                        completed: dateFormatted,
                        chartDate,
                        score,
                        timestamp: dt.getTime()
                    };
                });
                setAttempts(parsed);
            } catch (err) {
                console.error("Failed to load history:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const displayAttempts = attempts;
    const completedCount = displayAttempts.length;
    const standardCount = displayAttempts.filter((a) => a.format === "Standard").length;
    const adaptiveCount = displayAttempts.filter((a) => a.format === "Adaptive").length;
    const avgScore = completedCount > 0 ? Math.round(displayAttempts.reduce((s, a) => s + a.score, 0) / completedCount) : 0;
    const latestAttempt = displayAttempts[0] || null;
    const latestScore = latestAttempt ? latestAttempt.score : 0;
    const latestSubtitle = latestAttempt ? `${latestAttempt.assessment} · ${latestAttempt.chartDate}` : "No attempts yet";

    const filteredAttempts = formatFilter === "All formats"
        ? displayAttempts
        : displayAttempts.filter((a) => a.format === formatFilter);

    // Chart points: take up to 6 recent, reverse to chronological order (oldest -> newest)
    const chartData = [...displayAttempts].slice(0, 6).reverse();
    const cCount = chartData.length;
    const chartPoints = chartData.map((pt, i) => {
        const x = cCount > 1 ? Math.round(40 + (i / (cCount - 1)) * 500) : 290;
        const clampedScore = Math.max(0, Math.min(100, pt.score));
        const y = Math.round(155 - (clampedScore / 100) * 115);
        return {
            date: pt.chartDate,
            score: pt.score,
            x,
            y
        };
    });

    const pathD = chartPoints.length > 0
        ? chartPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "")
        : "";

    const trendText = chartPoints.length >= 2
        ? `${chartPoints[0].score} → ${chartPoints[chartPoints.length - 1].score}%`
        : chartPoints.length === 1
            ? `${chartPoints[0].score}%`
            : "No data";

    const dateRangeText = chartPoints.length >= 2
        ? `${completedCount} completed attempts · ${chartPoints[0].date} to ${chartPoints[chartPoints.length - 1].date}`
        : `${completedCount} completed attempt${completedCount === 1 ? "" : "s"}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
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
                        09 / MY PROGRESS
                    </div>
                    <h1 style={{
                        fontSize: "28px",
                        fontWeight: "800",
                        color: "#0f172a",
                        letterSpacing: "-0.03em",
                        margin: "0 0 6px 0"
                    }}>
                        See the shape of your progress.
                    </h1>
                    <p style={{
                        fontSize: "15px",
                        color: "#475569",
                        margin: 0
                    }}>
                        Look for patterns across attempts, not a verdict from a single score.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate("/practice")}
                    style={{
                        backgroundColor: "#1e3a8a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "10px 18px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                    }}
                >
                    Start a new interview →
                </button>
            </div>

            {/* 3 Metric Cards */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "16px"
            }}>
                <div style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px 24px"
                }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                        Completed attempts
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
                        {loading ? "..." : completedCount}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {standardCount} standard · {adaptiveCount} adaptive
                    </div>
                </div>

                <div style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px 24px"
                }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                        Average score
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
                        {loading ? "..." : `${avgScore}%`}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        All completed attempts
                    </div>
                </div>

                <div style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px 24px"
                }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                        Latest score
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
                        {loading ? "..." : `${latestScore}%`}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {latestSubtitle}
                    </div>
                </div>
            </div>

            {/* Chart: Assessment score over time */}
            <div style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "28px"
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px"
                }}>
                    <div>
                        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0" }}>
                            Assessment score over time
                        </h3>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {dateRangeText}
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "12px",
                        fontWeight: "700"
                    }}>
                        {trendText}
                    </div>
                </div>

                {/* SVG Line Chart */}
                <div style={{ width: "100%", overflowX: "auto" }}>
                    <svg viewBox="0 0 600 200" style={{ width: "100%", height: "200px" }}>
                        {/* Background Grid Lines */}
                        <line x1="40" y1="40" x2="560" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                        <text x="15" y="44" fontSize="10" fill="#94a3b8">100</text>

                        <line x1="40" y1="90" x2="560" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                        <text x="15" y="94" fontSize="10" fill="#94a3b8">75</text>

                        <line x1="40" y1="140" x2="560" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                        <text x="15" y="144" fontSize="10" fill="#94a3b8">50</text>

                        {/* Line Series */}
                        {pathD && (
                            <path
                                d={pathD}
                                fill="none"
                                stroke="#1e3a8a"
                                strokeWidth="2.5"
                            />
                        )}

                        {/* Data Points */}
                        {chartPoints.map((pt, idx) => (
                            <g key={`${pt.date}-${idx}`}>
                                <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r="4"
                                    fill="#1e3a8a"
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                />
                                <text
                                    x={pt.x}
                                    y={pt.y - 10}
                                    fontSize="11"
                                    fontWeight="700"
                                    fill="#0f172a"
                                    textAnchor="middle"
                                >
                                    {pt.score}%
                                </text>
                                <text
                                    x={pt.x}
                                    y="180"
                                    fontSize="11"
                                    fill="#64748b"
                                    textAnchor="middle"
                                >
                                    {pt.date}
                                </text>
                            </g>
                        ))}

                        {chartPoints.length === 0 && !loading && (
                            <text x="300" y="100" fontSize="13" fill="#94a3b8" textAnchor="middle">
                                No assessment scores recorded yet. Complete an interview to view trends!
                            </text>
                        )}
                    </svg>
                </div>

                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "12px" }}>
                    Scores are normalized to 0–100%. Different formats and question sets are not directly equivalent.
                </div>
            </div>

            {/* Assessment History Table */}
            <div style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "24px"
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                        Assessment history
                    </h3>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>Format:</span>
                        <select
                            value={formatFilter}
                            onChange={(e) => setFormatFilter(e.target.value)}
                            style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "12px",
                                backgroundColor: "#ffffff"
                            }}
                        >
                            <option>All formats</option>
                            <option>Standard</option>
                            <option>Adaptive</option>
                        </select>
                    </div>
                </div>

                {filteredAttempts.length === 0 ? (
                    <div style={{ padding: "32px 0", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                        {loading ? "Loading assessment history..." : "No assessments found for this filter."}
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                                <th style={{ padding: "10px 0", color: "#64748b", fontWeight: "600" }}>Assessment</th>
                                <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: "600" }}>Format</th>
                                <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: "600" }}>Completed</th>
                                <th style={{ padding: "10px 16px", color: "#64748b", fontWeight: "600" }}>Score</th>
                                <th style={{ padding: "10px 0", color: "#64748b", fontWeight: "600", textAlign: "right" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAttempts.map((item, idx) => (
                                <tr key={`${item.id}-${idx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "14px 0", color: "#0f172a", fontWeight: "600" }}>
                                        {item.assessment}
                                    </td>
                                    <td style={{ padding: "14px 16px", color: "#475569" }}>
                                        {item.format}
                                    </td>
                                    <td style={{ padding: "14px 16px", color: "#64748b" }}>
                                        {item.completed}
                                    </td>
                                    <td style={{ padding: "14px 16px", fontWeight: "700", color: "#0f172a" }}>
                                        {item.score}%
                                    </td>
                                    <td style={{ padding: "14px 0", textAlign: "right" }}>
                                        <Link
                                            to={`/results/${item.id}`}
                                            style={{
                                                color: "#2563eb",
                                                fontWeight: "600",
                                                textDecoration: "none"
                                            }}
                                        >
                                            View result →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Subdued Footer Note */}
            <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
                Proposed UX concept · Illustrative data · Exact scoring, limits and behavior require implementation verification.
            </div>
        </div>
    );
}
