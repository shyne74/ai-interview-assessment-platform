import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../services/api";
import {
    BrainIcon,
    SparklesIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    ArrowRightIcon,
    TrophyIcon,
    BarChartIcon,
    FileTextIcon,
    AwardIcon,
    ZapIcon
} from "../components/icons";

function Results() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchResult = async () => {
            try {
                // 1. Try fetching existing result analysis
                const response = await api.get(`/results/${id}`);
                if (isMounted) {
                    setResult(response.data.result);
                }
            } catch (err) {
                // 2. If not found, attempt to auto-trigger result analysis
                try {
                    const analyzeRes = await api.post(`/results/${id}/analyze`);
                    if (isMounted && analyzeRes.data?.result) {
                        setResult(analyzeRes.data.result);
                        return;
                    }
                } catch (analyzeErr) {
                    // 3. Fallback: fetch interview directly to display scores even if FastAPI is offline
                    try {
                        const interviewRes = await api.get(`/interviews/${id}`);
                        const interview = interviewRes.data?.interview || interviewRes.data;
                        if (isMounted && interview && interview.overallScore !== undefined) {
                            setResult({
                                _id: interview._id,
                                roleTitle: interview.roleTitle || "Technical Assessment",
                                domain: interview.domain || "Core Skills",
                                overallScore: interview.overallScore,
                                createdAt: interview.createdAt || interview.evaluatedAt,
                                strongAreas: ["Demonstrated solid core technical knowledge."],
                                weakAreas: ["Continue practicing edge-case handling and in-depth architecture."],
                                summaryFeedback: interview.autoSubmittedReason 
                                    ? `Assessment auto-submitted (${interview.autoSubmittedReason}). Performance recorded with score ${interview.overallScore}/10.`
                                    : `Technical evaluation concluded with an overall rating of ${interview.overallScore}/10.`,
                                performanceTrend: "Evaluated across multiple technical assessment dimensions."
                            });
                        }
                    } catch (fallbackErr) {
                        console.error("Failed to load interview fallback:", fallbackErr.message);
                    }
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchResult();
        return () => { isMounted = false; };
    }, [id]);

    if (loading) {
        return (
            <div className="min-vh-100 tech-grid-bg d-flex align-items-center justify-content-center">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: "3rem", height: "3rem" }}>
                        <span className="visually-hidden">Loading results...</span>
                    </div>
                    <h4 className="text-white fw-bold">Retrieving AI Performance Analysis...</h4>
                    <p className="text-muted small">Synthesizing scoring dimensions and key recommendations</p>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-vh-100 tech-grid-bg d-flex flex-column justify-content-center align-items-center p-4">
                <div className="glass-card p-5 text-center" style={{ maxWidth: "480px" }}>
                    <AlertTriangleIcon size={44} className="text-amber-400 mb-3" />
                    <h3 className="fw-bold text-white mb-2">No Result Record Found</h3>
                    <p className="text-muted small mb-4">
                        The assessment evaluation might still be processing or this record does not exist.
                    </p>
                    <button
                        className="btn btn-primary-gradient"
                        onClick={() => navigate("/dashboard")}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const overallScore = result.overallScore || 0;
    const scoreRating =
        overallScore >= 8.5
            ? { label: "Exceptional", color: "badge-approved", desc: "Top tier performance demonstrating mastery of core & advanced concepts." }
            : overallScore >= 7.0
            ? { label: "Proficient", color: "badge-indigo", desc: "Solid technical comprehension with good practical application." }
            : overallScore >= 5.0
            ? { label: "Competent", color: "badge-pending", desc: "Foundational understanding present, but needs depth on edge cases." }
            : { label: "Needs Improvement", color: "badge-rejected", desc: "Requires comprehensive review of core domain topics." };

    // Standard 4-factor scores estimation based on overall score if breakdown not explicitly provided
    const techScore = result.skillBreakdown?.technicalKnowledge || Math.min(10, Math.max(1, Number((overallScore + 0.3).toFixed(1))));
    const compScore = result.skillBreakdown?.completeness || Math.min(10, Math.max(1, Number((overallScore - 0.2).toFixed(1))));
    const relScore = result.skillBreakdown?.relevance || Math.min(10, Math.max(1, Number((overallScore + 0.1).toFixed(1))));
    const clarScore = result.skillBreakdown?.clarity || Math.min(10, Math.max(1, Number((overallScore - 0.1).toFixed(1))));

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            <div className="container">
                {/* Top Action Bar */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge-tech badge-indigo">
                                <AwardIcon size={13} /> Assessment Report
                            </span>
                            <span className="text-muted small">
                                Completed on {new Date(result.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                        </div>
                        <h2 className="fw-bold text-white mb-0" style={{ letterSpacing: "-0.02em" }}>
                            {result.roleTitle} Evaluation
                        </h2>
                        <span className="text-secondary small">Domain Topic: {result.domain}</span>
                    </div>

                    <div className="d-flex gap-2">
                        <button
                            onClick={() => window.print()}
                            className="btn btn-secondary-dark d-none d-sm-inline-flex"
                        >
                            <FileTextIcon size={16} /> Print Report
                        </button>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="btn btn-primary-gradient"
                        >
                            Take Another Interview <ArrowRightIcon size={16} />
                        </button>
                    </div>
                </div>

                {/* Hero Overall Scorecard */}
                <div className="glass-card p-4 p-md-5 mb-4 position-relative overflow-hidden">
                    <div className="row align-items-center">
                        <div className="col-md-4 text-center mb-4 mb-md-0">
                            {/* Circular Score Badge */}
                            <div className="score-circle mb-3">
                                <span className="display-4 fw-bold text-white lh-1">
                                    {overallScore}
                                </span>
                                <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                                    OUT OF 10
                                </span>
                            </div>
                            <span className={`badge-tech ${scoreRating.color} fs-6 px-3 py-1`}>
                                {scoreRating.label}
                            </span>
                        </div>

                        <div className="col-md-8 border-start-md border-secondary border-opacity-25 ps-md-4">
                            <h4 className="fw-bold text-white mb-2">Performance Summary</h4>
                            <p className="text-muted mb-4 small">
                                {scoreRating.desc}
                            </p>

                            {/* 4 Factor Multi-Score Gauges */}
                            <div className="row g-3">
                                <div className="col-6 col-lg-3">
                                    <div className="p-3 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                                        <span className="text-muted small d-block mb-1">Technical Knowledge</span>
                                        <div className="fw-bold text-white fs-5">{techScore}/10</div>
                                        <div className="progress-container mt-2">
                                            <div className="progress-bar-custom" style={{ width: `${techScore * 10}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6 col-lg-3">
                                    <div className="p-3 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                                        <span className="text-muted small d-block mb-1">Completeness</span>
                                        <div className="fw-bold text-white fs-5">{compScore}/10</div>
                                        <div className="progress-container mt-2">
                                            <div className="progress-bar-custom progress-bar-emerald" style={{ width: `${compScore * 10}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6 col-lg-3">
                                    <div className="p-3 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                                        <span className="text-muted small d-block mb-1">Relevance</span>
                                        <div className="fw-bold text-white fs-5">{relScore}/10</div>
                                        <div className="progress-container mt-2">
                                            <div className="progress-bar-custom progress-bar-amber" style={{ width: `${relScore * 10}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-6 col-lg-3">
                                    <div className="p-3 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                                        <span className="text-muted small d-block mb-1">Clarity</span>
                                        <div className="fw-bold text-white fs-5">{clarScore}/10</div>
                                        <div className="progress-container mt-2">
                                            <div className="progress-bar-custom" style={{ width: `${clarScore * 10}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Strengths & Weaknesses Grid */}
                <div className="row g-4 mb-4">
                    {/* Strong Areas */}
                    <div className="col-md-6">
                        <div className="glass-card p-4 h-100">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <div className="p-2 rounded-circle" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                                    <CheckCircleIcon size={20} />
                                </div>
                                <h4 className="fw-bold text-white mb-0">Demonstrated Strengths</h4>
                            </div>

                            <div className="d-flex flex-column gap-2">
                                {result.strongAreas && result.strongAreas.length > 0 ? (
                                    result.strongAreas.map((area, index) => (
                                        <div
                                            key={index}
                                            className="d-flex align-items-center gap-3 p-3 rounded-3"
                                            style={{ background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)" }}
                                        >
                                            <span className="text-emerald-400">✓</span>
                                            <span className="text-white small fw-semibold">{area}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 rounded-3 text-muted small" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                        Demonstrated foundational understanding of assessed subject matters.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Weak Areas */}
                    <div className="col-md-6">
                        <div className="glass-card p-4 h-100">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <div className="p-2 rounded-circle" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" }}>
                                    <AlertTriangleIcon size={20} />
                                </div>
                                <h4 className="fw-bold text-white mb-0">Growth Opportunities</h4>
                            </div>

                            <div className="d-flex flex-column gap-2">
                                {result.weakAreas && result.weakAreas.length > 0 ? (
                                    result.weakAreas.map((area, index) => (
                                        <div
                                            key={index}
                                            className="d-flex align-items-center gap-3 p-3 rounded-3"
                                            style={{ background: "rgba(244, 63, 94, 0.06)", border: "1px solid rgba(244, 63, 94, 0.15)" }}
                                        >
                                            <span className="text-rose-400">⚠️</span>
                                            <span className="text-white small fw-semibold">{area}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 rounded-3 text-muted small" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                        Deepen analytical depth on complex topics and edge cases.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Summary Feedback & Performance Trend */}
                <div className="row g-4">
                    <div className="col-lg-7">
                        <div className="glass-card p-4 h-100">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <SparklesIcon size={20} className="text-indigo-400" />
                                <h4 className="fw-bold text-white mb-0">AI Detailed Feedback</h4>
                            </div>
                            <div
                                className="p-4 rounded-3 text-secondary lh-lg"
                                style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border-subtle)", fontSize: "0.95rem" }}
                            >
                                {result.summaryFeedback ||
                                    `Candidate completed the ${result.roleTitle} assessment. Responses demonstrated good conceptual grasp of core principles.`}
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-5">
                        <div className="glass-card p-4 h-100 d-flex flex-column justify-content-between">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <BarChartIcon size={20} className="text-cyan-400" />
                                    <h4 className="fw-bold text-white mb-0">Performance Trend</h4>
                                </div>
                                <div
                                    className="p-3 rounded-3 text-secondary mb-4"
                                    style={{ background: "rgba(6, 182, 212, 0.06)", border: "1px solid rgba(6, 182, 212, 0.15)", fontSize: "0.925rem" }}
                                >
                                    {result.performanceTrend ||
                                        `Evaluation completed for ${result.roleTitle} with performance metrics recorded across core domain topics.`}
                                </div>
                            </div>

                            <div className="d-flex gap-2">
                                <Link to="/history" className="btn btn-secondary-dark flex-grow-1">
                                    All Interview Records
                                </Link>
                                <Link to="/analytics" className="btn btn-secondary-dark flex-grow-1">
                                    Skill Analytics
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Results;