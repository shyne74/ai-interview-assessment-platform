import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
    ClockIcon,
    TrophyIcon,
    BarChartIcon,
    SearchIcon,
    ArrowRightIcon,
    AwardIcon,
    BrainIcon
} from "../components/icons";

function History() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get("/results");
                setResults(response.data.results || []);
            } catch (err) {
                console.log(err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const filteredResults = results.filter((r) =>
        (r.roleTitle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.domain || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalTests = results.length;
    const avgScore = totalTests > 0
        ? (results.reduce((acc, r) => acc + (r.overallScore || 0), 0) / totalTests).toFixed(1)
        : "0.0";
    const bestScore = totalTests > 0
        ? Math.max(...results.map((r) => r.overallScore || 0)).toFixed(1)
        : "0.0";

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            <div className="container">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge-tech badge-indigo">
                                <ClockIcon size={14} /> Submission Log
                            </span>
                        </div>
                        <h2 className="fw-bold text-white mb-0" style={{ letterSpacing: "-0.02em" }}>
                            Interview History
                        </h2>
                        <p className="text-muted small mb-0">
                            Track your past technical interview performances and AI evaluations
                        </p>
                    </div>

                    <button
                        onClick={() => navigate("/dashboard")}
                        className="btn btn-primary-gradient"
                    >
                        <BrainIcon size={16} /> Take New Interview
                    </button>
                </div>

                {/* Metric Summary Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="glass-card p-3 p-md-4 d-flex align-items-center gap-3">
                            <div className="p-3 rounded-3" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                                <ClockIcon size={24} />
                            </div>
                            <div>
                                <span className="text-muted small fw-semibold text-uppercase">Total Interviews</span>
                                <h3 className="fw-bold text-white mb-0">{totalTests}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="glass-card p-3 p-md-4 d-flex align-items-center gap-3">
                            <div className="p-3 rounded-3" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }}>
                                <BarChartIcon size={24} />
                            </div>
                            <div>
                                <span className="text-muted small fw-semibold text-uppercase">Average Score</span>
                                <h3 className="fw-bold text-white mb-0">{avgScore} <small className="text-muted fs-6">/ 10</small></h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="glass-card p-3 p-md-4 d-flex align-items-center gap-3">
                            <div className="p-3 rounded-3" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                                <TrophyIcon size={24} />
                            </div>
                            <div>
                                <span className="text-muted small fw-semibold text-uppercase">Best Score</span>
                                <h3 className="fw-bold text-white mb-0">{bestScore} <small className="text-muted fs-6">/ 10</small></h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search / Filter Bar */}
                <div className="glass-card p-3 mb-4">
                    <div className="input-group">
                        <span className="input-group-text bg-transparent border-0 text-muted ps-3">
                            <SearchIcon size={18} />
                        </span>
                        <input
                            type="text"
                            className="form-control form-control-custom border-0 bg-transparent"
                            placeholder="Filter by role title or domain (e.g. Full Stack, React, Node.js)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Results List */}
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading history...</span>
                        </div>
                        <p className="text-muted mt-3 small">Loading past interviews...</p>
                    </div>
                ) : filteredResults.length === 0 ? (
                    <div className="glass-card p-5 text-center">
                        <AwardIcon size={44} className="text-muted mb-3" />
                        <h4 className="fw-bold text-white mb-2">No Interviews Found</h4>
                        <p className="text-muted small mb-4">
                            {searchTerm
                                ? "No interview records matched your filter criteria."
                                : "You haven't completed any technical interviews yet. Take your first one today!"}
                        </p>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="btn btn-primary-gradient"
                        >
                            Explore Available Roles
                        </button>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {filteredResults.map((result) => {
                            const score = result.overallScore || 0;
                            const badgeStyle =
                                score >= 8
                                    ? "badge-approved"
                                    : score >= 6
                                    ? "badge-indigo"
                                    : "badge-pending";

                            return (
                                <div
                                    key={result._id}
                                    className="glass-card glass-card-interactive p-4"
                                >
                                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <span className="badge-tech badge-cyan">
                                                    {result.domain || "General"}
                                                </span>
                                                <span className="text-muted small">
                                                    {new Date(result.createdAt || Date.now()).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric"
                                                    })}
                                                </span>
                                            </div>

                                            <h4 className="fw-bold text-white mb-1">
                                                {result.roleTitle}
                                            </h4>

                                            <p className="text-muted small mb-0" style={{ maxWidth: "600px" }}>
                                                {result.summaryFeedback ? (
                                                    result.summaryFeedback.length > 140
                                                        ? `${result.summaryFeedback.substring(0, 140)}...`
                                                        : result.summaryFeedback
                                                ) : (
                                                    "AI evaluation completed with structured concept feedback."
                                                )}
                                            </p>
                                        </div>

                                        <div className="d-flex align-items-center gap-4">
                                            <div className="text-end">
                                                <span className="text-muted small d-block mb-1">Overall Score</span>
                                                <span className={`badge-tech ${badgeStyle} fs-6 px-3 py-1`}>
                                                    {score} / 10
                                                </span>
                                            </div>

                                            <button
                                                className="btn btn-secondary-dark d-flex align-items-center gap-1"
                                                onClick={() => navigate(`/results/${result.interviewId}`)}
                                            >
                                                <span>View Report</span>
                                                <ArrowRightIcon size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default History;