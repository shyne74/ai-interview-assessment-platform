import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
    BarChartIcon,
    TrophyIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    ClockIcon,
    BrainIcon,
    SparklesIcon,
    ZapIcon
} from "../components/icons";

function Analytics() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await api.get("/results");
                setResults(response.data.results || []);
            } catch (err) {
                console.log(err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const totalResults = results.length;
    const averageScore = totalResults
        ? Number(
            (
                results.reduce(
                    (sum, result) => sum + (result.overallScore || 0),
                    0
                ) / totalResults
            ).toFixed(1)
        )
        : 0;

    const highestScore = totalResults
        ? Math.max(...results.map((r) => r.overallScore || 0)).toFixed(1)
        : 0;

    // Calculate domain-wise statistics
    const domainStats = {};
    results.forEach((r) => {
        const domain = r.domain || "General";
        if (!domainStats[domain]) {
            domainStats[domain] = { count: 0, totalScore: 0 };
        }
        domainStats[domain].count += 1;
        domainStats[domain].totalScore += r.overallScore || 0;
    });

    const domainList = Object.entries(domainStats).map(([domain, data]) => ({
        domain,
        avg: (data.totalScore / data.count).toFixed(1),
        count: data.count
    }));

    // Strong & weak concepts aggregated
    const allStrong = Array.from(new Set(results.flatMap((r) => r.strongAreas || [])));
    const allWeak = Array.from(new Set(results.flatMap((r) => r.weakAreas || [])));

    if (loading) {
        return (
            <div className="min-vh-100 tech-grid-bg d-flex align-items-center justify-content-center">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                        <span className="visually-hidden">Loading analytics...</span>
                    </div>
                    <h4 className="text-white fw-bold">Analyzing Skill Metrics...</h4>
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            <div className="container">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-5">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge-tech badge-cyan">
                                <BarChartIcon size={14} /> Performance Intelligence
                            </span>
                        </div>
                        <h2 className="fw-bold text-white mb-0" style={{ letterSpacing: "-0.02em" }}>
                            Candidate Skill Analytics
                        </h2>
                        <p className="text-muted small mb-0">
                            Deep dive into your domain competencies, progress velocity, and AI evaluation trends
                        </p>
                    </div>

                    <Link to="/dashboard" className="btn btn-primary-gradient">
                        <BrainIcon size={16} /> Take New Interview
                    </Link>
                </div>

                {/* Top Metrics Row */}
                <div className="row g-4 mb-5">
                    <div className="col-md-4">
                        <div className="glass-card p-4 h-100">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="text-muted small fw-semibold text-uppercase">Total Interviews</span>
                                <div className="p-2 rounded-circle" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                                    <ClockIcon size={18} />
                                </div>
                            </div>
                            <h2 className="fw-bold text-white mb-1">{totalResults}</h2>
                            <span className="text-muted small">Completed technical evaluations</span>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="glass-card p-4 h-100">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="text-muted small fw-semibold text-uppercase">Average Overall Score</span>
                                <div className="p-2 rounded-circle" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }}>
                                    <BarChartIcon size={18} />
                                </div>
                            </div>
                            <h2 className="fw-bold text-white mb-1">
                                {averageScore} <small className="text-muted fs-6">/ 10</small>
                            </h2>
                            <span className="text-muted small">Based on AI multi-factor scoring</span>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="glass-card p-4 h-100">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="text-muted small fw-semibold text-uppercase">Peak Performance</span>
                                <div className="p-2 rounded-circle" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                                    <TrophyIcon size={18} />
                                </div>
                            </div>
                            <h2 className="fw-bold text-white mb-1">
                                {highestScore} <small className="text-muted fs-6">/ 10</small>
                            </h2>
                            <span className="text-muted small">Highest assessment result</span>
                        </div>
                    </div>
                </div>

                {/* Domain Competency Breakdown & Strengths */}
                <div className="row g-4 mb-5">
                    {/* Domain Competency Bars */}
                    <div className="col-lg-7">
                        <div className="glass-card p-4 h-100">
                            <div className="d-flex align-items-center justify-content-between mb-4">
                                <div>
                                    <h4 className="fw-bold text-white mb-1">Domain Competency</h4>
                                    <p className="text-muted small mb-0">Average scores categorized by technical topic</p>
                                </div>
                                <span className="badge-tech badge-indigo">
                                    {domainList.length > 0 ? `${domainList.length} Domains Evaluated` : "Default Benchmarks"}
                                </span>
                            </div>

                            {domainList.length > 0 ? (
                                <div className="d-flex flex-column gap-3">
                                    {domainList.map((item) => (
                                        <div key={item.domain}>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="text-secondary fw-semibold small">
                                                    {item.domain} ({item.count} test{item.count > 1 ? "s" : ""})
                                                </span>
                                                <span className="text-white fw-bold small">
                                                    {item.avg} / 10
                                                </span>
                                            </div>
                                            <div className="progress-container">
                                                <div
                                                    className="progress-bar-custom"
                                                    style={{ width: `${item.avg * 10}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {[
                                        { domain: "React", score: 8.5 },
                                        { domain: "JavaScript", score: 8.2 },
                                        { domain: "Node.js", score: 7.4 },
                                        { domain: "Database (MongoDB / SQL)", score: 6.8 },
                                        { domain: "System Design", score: 6.1 }
                                    ].map((item) => (
                                        <div key={item.domain}>
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="text-secondary fw-semibold small">
                                                    {item.domain}
                                                </span>
                                                <span className="text-white fw-bold small">
                                                    {item.score} / 10
                                                </span>
                                            </div>
                                            <div className="progress-container">
                                                <div
                                                    className="progress-bar-custom"
                                                    style={{ width: `${item.score * 10}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Strengths & Growth Areas */}
                    <div className="col-lg-5">
                        <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between">
                            <div>
                                <h4 className="fw-bold text-white mb-1">Concept Matrix</h4>
                                <p className="text-muted small mb-4">Recurring strengths and concepts needing revision</p>

                                <div className="mb-4">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <CheckCircleIcon size={16} className="text-emerald-400" />
                                        <span className="text-white small fw-semibold">Strong Concepts</span>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {allStrong.length > 0 ? (
                                            allStrong.map((s, idx) => (
                                                <span key={idx} className="badge-tech badge-approved">
                                                    {s}
                                                </span>
                                            ))
                                        ) : (
                                            <>
                                                <span className="badge-tech badge-approved">React Hooks</span>
                                                <span className="badge-tech badge-approved">State Management</span>
                                                <span className="badge-tech badge-approved">REST APIs</span>
                                                <span className="badge-tech badge-approved">Component Lifecycle</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <AlertTriangleIcon size={16} className="text-amber-400" />
                                        <span className="text-white small fw-semibold">Needs Attention</span>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {allWeak.length > 0 ? (
                                            allWeak.map((w, idx) => (
                                                <span key={idx} className="badge-tech badge-pending">
                                                    {w}
                                                </span>
                                            ))
                                        ) : (
                                            <>
                                                <span className="badge-tech badge-pending">Index Optimization</span>
                                                <span className="badge-tech badge-pending">Rate Limiting</span>
                                                <span className="badge-tech badge-pending">Concurrency Patterns</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 text-center">
                                <span className="text-muted small">
                                    Complete more interviews to refine your AI skill profile.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Analytics;
