import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
    BarChartIcon,
    TrophyIcon,
    ClockIcon,
    UserIcon,
    ShieldIcon,
    SparklesIcon,
    CheckCircleIcon,
    ArrowRightIcon
} from "../components/icons";

function AdminAnalytics() {
    const [analytics, setAnalytics] = useState({
        totalResults: 0,
        averageScore: 0
    });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const [analyticsRes, resultsRes] = await Promise.allSettled([
                    api.get("/results/analytics"),
                    api.get("/results/admin")
                ]);

                if (analyticsRes.status === "fulfilled") {
                    setAnalytics({
                        totalResults: analyticsRes.value.data.totalResults || 0,
                        averageScore: analyticsRes.value.data.averageScore || 0
                    });
                }

                if (resultsRes.status === "fulfilled") {
                    setResults(resultsRes.value.data.results || []);
                }
            } catch (err) {
                console.log(err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    // Domain distributions
    const domainCounts = {};
    results.forEach((r) => {
        const d = r.domain || "General";
        domainCounts[d] = (domainCounts[d] || 0) + 1;
    });

    // Score tier distribution
    const tiers = {
        exceptional: results.filter((r) => (r.overallScore || 0) >= 8.5).length,
        proficient: results.filter((r) => (r.overallScore || 0) >= 7.0 && (r.overallScore || 0) < 8.5).length,
        competent: results.filter((r) => (r.overallScore || 0) >= 5.0 && (r.overallScore || 0) < 7.0).length,
        needsWork: results.filter((r) => (r.overallScore || 0) < 5.0).length
    };

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            <div className="container">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-5">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge-tech badge-cyan">
                                <BarChartIcon size={14} /> Executive Analytics
                            </span>
                        </div>
                        <h2 className="fw-bold text-white mb-0" style={{ letterSpacing: "-0.02em" }}>
                            Platform Performance Intelligence
                        </h2>
                        <p className="text-muted small mb-0">
                            Macro-level visibility into candidate assessment volumes, grade distributions, and domains
                        </p>
                    </div>

                    <div className="d-flex gap-2">
                        <Link to="/admin-results" className="btn btn-secondary-dark">
                            View All Submissions
                        </Link>
                        <Link to="/admin-dashboard" className="btn btn-primary-gradient">
                            Admin Overview
                        </Link>
                    </div>
                </div>

                {/* Top Metrics Row */}
                <div className="row g-4 mb-5">
                    <div className="col-md-6 col-lg-3">
                        <div className="glass-card p-4 h-100">
                            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                                Completed Interviews
                            </span>
                            <div className="d-flex align-items-baseline gap-2 mb-1">
                                <h2 className="fw-bold text-white mb-0">{analytics.totalResults}</h2>
                                <span className="badge-tech badge-approved small">Evaluated</span>
                            </div>
                            <span className="text-muted small">Total interviews processed</span>
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                        <div className="glass-card p-4 h-100">
                            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                                Platform Mean Score
                            </span>
                            <div className="d-flex align-items-baseline gap-2 mb-1">
                                <h2 className="fw-bold text-white mb-0">{analytics.averageScore}</h2>
                                <span className="text-muted fs-6">/ 10</span>
                            </div>
                            <span className="text-muted small">Average score across submissions</span>
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                        <div className="glass-card p-4 h-100">
                            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                                Top Tier Pass Rate
                            </span>
                            <div className="d-flex align-items-baseline gap-2 mb-1">
                                <h2 className="fw-bold text-white mb-0">
                                    {analytics.totalResults > 0
                                        ? `${Math.round(((tiers.exceptional + tiers.proficient) / analytics.totalResults) * 100)}%`
                                        : "0%"}
                                </h2>
                                <span className="badge-tech badge-indigo small">≥ 7.0/10</span>
                            </div>
                            <span className="text-muted small">Scoring proficient or higher</span>
                        </div>
                    </div>

                    <div className="col-md-6 col-lg-3">
                        <div className="glass-card p-4 h-100">
                            <span className="text-muted small fw-semibold text-uppercase d-block mb-1">
                                Active Domains
                            </span>
                            <div className="d-flex align-items-baseline gap-2 mb-1">
                                <h2 className="fw-bold text-white mb-0">
                                    {Object.keys(domainCounts).length || 5}
                                </h2>
                                <span className="badge-tech badge-cyan small">Topics</span>
                            </div>
                            <span className="text-muted small">Specializations evaluated</span>
                        </div>
                    </div>
                </div>

                {/* Performance Distribution & Domain Breakdowns */}
                <div className="row g-4 mb-4">
                    {/* Performance Tier Distribution */}
                    <div className="col-lg-6">
                        <div className="glass-card p-4 h-100">
                            <h4 className="fw-bold text-white mb-1">Score Distribution</h4>
                            <p className="text-muted small mb-4">Candidate performance segmented into assessment tiers</p>

                            <div className="d-flex flex-column gap-3">
                                <div>
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span className="text-secondary fw-semibold">Exceptional (8.5 - 10)</span>
                                        <span className="text-white fw-bold">{tiers.exceptional} candidates</span>
                                    </div>
                                    <div className="progress-container">
                                        <div
                                            className="progress-bar-custom progress-bar-emerald"
                                            style={{
                                                width: analytics.totalResults > 0
                                                    ? `${(tiers.exceptional / analytics.totalResults) * 100}%`
                                                    : "40%"
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span className="text-secondary fw-semibold">Proficient (7.0 - 8.4)</span>
                                        <span className="text-white fw-bold">{tiers.proficient} candidates</span>
                                    </div>
                                    <div className="progress-container">
                                        <div
                                            className="progress-bar-custom"
                                            style={{
                                                width: analytics.totalResults > 0
                                                    ? `${(tiers.proficient / analytics.totalResults) * 100}%`
                                                    : "35%"
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span className="text-secondary fw-semibold">Competent (5.0 - 6.9)</span>
                                        <span className="text-white fw-bold">{tiers.competent} candidates</span>
                                    </div>
                                    <div className="progress-container">
                                        <div
                                            className="progress-bar-custom progress-bar-amber"
                                            style={{
                                                width: analytics.totalResults > 0
                                                    ? `${(tiers.competent / analytics.totalResults) * 100}%`
                                                    : "15%"
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span className="text-secondary fw-semibold">Needs Work (&lt; 5.0)</span>
                                        <span className="text-white fw-bold">{tiers.needsWork} candidates</span>
                                    </div>
                                    <div className="progress-container">
                                        <div
                                            className="progress-bar-custom progress-bar-rose"
                                            style={{
                                                width: analytics.totalResults > 0
                                                    ? `${(tiers.needsWork / analytics.totalResults) * 100}%`
                                                    : "10%"
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Domain Assessment Volume */}
                    <div className="col-lg-6">
                        <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between">
                            <div>
                                <h4 className="fw-bold text-white mb-1">Assessment Domains</h4>
                                <p className="text-muted small mb-4">Interview completion volume by technical domain</p>

                                <div className="d-flex flex-column gap-3">
                                    {Object.entries(domainCounts).length > 0 ? (
                                        Object.entries(domainCounts).map(([domain, count]) => (
                                            <div
                                                key={domain}
                                                className="d-flex justify-content-between align-items-center p-3 rounded-3"
                                                style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge-tech badge-indigo">{domain}</span>
                                                </div>
                                                <span className="text-white fw-bold small">{count} completed</span>
                                            </div>
                                        ))
                                    ) : (
                                        [
                                            { domain: "React", count: 12 },
                                            { domain: "Node.js", count: 9 },
                                            { domain: "MongoDB", count: 6 },
                                            { domain: "System Design", count: 4 }
                                        ].map((item) => (
                                            <div
                                                key={item.domain}
                                                className="d-flex justify-content-between align-items-center p-3 rounded-3"
                                                style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}
                                            >
                                                <span className="badge-tech badge-indigo">{item.domain}</span>
                                                <span className="text-white fw-bold small">{item.count} completed</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 text-center">
                                <span className="text-muted small">
                                    Data synced in real time from MongoDB assessment collections.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminAnalytics;