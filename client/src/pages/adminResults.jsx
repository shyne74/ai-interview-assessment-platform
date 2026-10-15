import { useEffect, useState } from "react";
import api from "../services/api";
import {
    FileTextIcon,
    SearchIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    AwardIcon,
    UserIcon,
    SparklesIcon,
    BarChartIcon
} from "../components/icons";

function AdminResults() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSubmission, setSelectedSubmission] = useState(null);

    const fetchResults = async () => {
        try {
            setLoading(true);
            const response = await api.get("/results/admin");
            setResults(response.data.results || []);
        } catch (err) {
            console.log(err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
    }, []);

    const filteredResults = results.filter((r) => {
        const candidateName = r.candidateId?.username || "";
        const candidateEmail = r.candidateId?.email || "";
        const role = r.roleTitle || "";
        const domain = r.domain || "";

        return (
            candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            candidateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.toLowerCase().includes(searchTerm.toLowerCase()) ||
            domain.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            <div className="container">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge-tech badge-rose" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" }}>
                                <FileTextIcon size={14} /> Submissions Log
                            </span>
                            <span className="text-muted small">{results.length} Completed Assessments</span>
                        </div>
                        <h2 className="fw-bold text-white mb-0" style={{ letterSpacing: "-0.02em" }}>
                            Interview Results & Evaluations
                        </h2>
                        <p className="text-muted small mb-0">
                            Review AI-generated assessment results, answer evaluations, and candidate benchmarks
                        </p>
                    </div>

                    <div className="glass-card p-2 px-3">
                        <span className="text-muted small">Total Submissions: </span>
                        <span className="text-white fw-bold">{results.length}</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="glass-card p-3 mb-4">
                    <div className="input-group">
                        <span className="input-group-text bg-transparent border-0 text-muted ps-2">
                            <SearchIcon size={18} />
                        </span>
                        <input
                            type="text"
                            className="form-control form-control-custom border-0 bg-transparent"
                            placeholder="Filter by candidate name, email, role, or domain..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Submissions List */}
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading results...</span>
                        </div>
                        <p className="text-muted mt-3 small">Loading assessment evaluations...</p>
                    </div>
                ) : filteredResults.length === 0 ? (
                    <div className="glass-card p-5 text-center">
                        <FileTextIcon size={44} className="text-muted mb-3" />
                        <h4 className="fw-bold text-white mb-2">No Submissions Found</h4>
                        <p className="text-muted small mb-0">
                            {searchTerm
                                ? "No submissions matched your search query."
                                : "Candidate assessment submissions will appear here after completion."}
                        </p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {filteredResults.map((result) => {
                            const score = result.overallScore || 0;
                            const scoreBadge =
                                score >= 8
                                    ? "badge-approved"
                                    : score >= 6
                                    ? "badge-indigo"
                                    : "badge-pending";

                            return (
                                <div key={result._id} className="col-lg-6">
                                    <div className="glass-card glass-card-interactive p-4 h-100 d-flex flex-column justify-content-between">
                                        <div>
                                            {/* Candidate & Date Header */}
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div
                                                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                                        style={{ width: "42px", height: "42px", background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}
                                                    >
                                                        {(result.candidateId?.username || "C").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h5 className="fw-bold text-white mb-0">
                                                            {result.candidateId?.username || "Candidate"}
                                                        </h5>
                                                        <span className="text-muted small">
                                                            {result.candidateId?.email || "No email available"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className={`badge-tech ${scoreBadge} fs-6 px-3 py-1`}>
                                                    {score} / 10
                                                </span>
                                            </div>

                                            {/* Role & Domain */}
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <span className="badge-tech badge-cyan">
                                                    {result.domain}
                                                </span>
                                                <span className="text-white fw-semibold small">
                                                    {result.roleTitle}
                                                </span>
                                                <span className="text-muted small ms-auto">
                                                    {new Date(result.createdAt || Date.now()).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {/* AI Summary Feedback Snippet */}
                                            <div
                                                className="p-3 rounded-3 mb-3 text-secondary small"
                                                style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border-subtle)", fontSize: "0.85rem" }}
                                            >
                                                <div className="d-flex align-items-center gap-1 text-muted small fw-semibold mb-1">
                                                    <SparklesIcon size={13} className="text-indigo-400" />
                                                    <span>AI Synthesis:</span>
                                                </div>
                                                {result.summaryFeedback ? (
                                                    result.summaryFeedback.length > 150
                                                        ? `${result.summaryFeedback.substring(0, 150)}...`
                                                        : result.summaryFeedback
                                                ) : (
                                                    "Assessment evaluated successfully with multi-factor scoring."
                                                )}
                                            </div>

                                            {/* Strengths / Weaknesses preview */}
                                            <div className="row g-2 mb-3">
                                                <div className="col-6">
                                                    <span className="text-muted small d-block mb-1">Strong Areas:</span>
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {(result.strongAreas || []).slice(0, 2).map((s, idx) => (
                                                            <span key={idx} className="badge-tech badge-approved" style={{ fontSize: "0.68rem" }}>
                                                                {s}
                                                            </span>
                                                        ))}
                                                        {(!result.strongAreas || result.strongAreas.length === 0) && (
                                                            <span className="text-muted small">Standard concepts</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="col-6">
                                                    <span className="text-muted small d-block mb-1">Growth Areas:</span>
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {(result.weakAreas || []).slice(0, 2).map((w, idx) => (
                                                            <span key={idx} className="badge-tech badge-pending" style={{ fontSize: "0.68rem" }}>
                                                                {w}
                                                            </span>
                                                        ))}
                                                        {(!result.weakAreas || result.weakAreas.length === 0) && (
                                                            <span className="text-muted small">Edge cases</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <hr style={{ borderColor: "var(--border-subtle)" }} className="my-2" />
                                            <button
                                                className="btn btn-secondary-dark w-100"
                                                onClick={() => setSelectedSubmission(result)}
                                            >
                                                Inspect Detailed Analysis
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Inspect Submission Modal */}
                {selectedSubmission && (
                    <div className="modal-backdrop-custom">
                        <div className="modal-content-custom p-4 p-md-5" style={{ maxWidth: "720px" }}>
                            <div className="d-flex justify-content-between align-items-start mb-4">
                                <div>
                                    <span className="badge-tech badge-indigo mb-2">Detailed Submission Report</span>
                                    <h3 className="fw-bold text-white mb-0">
                                        {selectedSubmission.candidateId?.username || "Candidate"}
                                    </h3>
                                    <span className="text-muted small">
                                        {selectedSubmission.roleTitle} • {selectedSubmission.domain}
                                    </span>
                                </div>
                                <button className="btn-close btn-close-white" onClick={() => setSelectedSubmission(null)} />
                            </div>

                            {/* Overall Score Banner */}
                            <div className="p-4 rounded-3 text-center mb-4" style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                                <span className="text-muted small text-uppercase fw-semibold d-block mb-1">Overall AI Score</span>
                                <h1 className="fw-bold text-white mb-0 display-4">{selectedSubmission.overallScore} / 10</h1>
                            </div>

                            {/* AI Feedback */}
                            <div className="mb-4">
                                <h5 className="fw-bold text-white mb-2">Summary AI Feedback</h5>
                                <div className="p-3 rounded-3 text-secondary small lh-lg" style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border-subtle)" }}>
                                    {selectedSubmission.summaryFeedback || "Detailed feedback synthesized."}
                                </div>
                            </div>

                            {/* Performance Trend */}
                            {selectedSubmission.performanceTrend && (
                                <div className="mb-4">
                                    <h5 className="fw-bold text-white mb-2">Performance Trend</h5>
                                    <div className="p-3 rounded-3 text-secondary small" style={{ background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
                                        {selectedSubmission.performanceTrend}
                                    </div>
                                </div>
                            )}

                            {/* Strengths & Weaknesses */}
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <h6 className="fw-bold text-white mb-2">Strong Areas</h6>
                                    <div className="d-flex flex-column gap-1">
                                        {(selectedSubmission.strongAreas || []).map((s, idx) => (
                                            <div key={idx} className="badge-tech badge-approved text-start">
                                                ✓ {s}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="fw-bold text-white mb-2">Areas for Growth</h6>
                                    <div className="d-flex flex-column gap-1">
                                        {(selectedSubmission.weakAreas || []).map((w, idx) => (
                                            <div key={idx} className="badge-tech badge-pending text-start">
                                                ⚠️ {w}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button className="btn btn-secondary-dark w-100" onClick={() => setSelectedSubmission(null)}>
                                Close Inspection
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminResults;