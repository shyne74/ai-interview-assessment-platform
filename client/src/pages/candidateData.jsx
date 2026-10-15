import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
    UserIcon,
    SearchIcon,
    ClockIcon,
    TrophyIcon,
    ArrowRightIcon,
    FileTextIcon,
    CheckCircleIcon
} from "../components/icons";

function CandidateData() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    const fetchCandidates = async () => {
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
        fetchCandidates();
    }, []);

    // Group results by candidate
    const candidatesMap = {};

    results.forEach((result) => {
        const candidate = result.candidateId;
        if (!candidate) return;

        const id = candidate._id;

        if (!candidatesMap[id]) {
            candidatesMap[id] = {
                id,
                username: candidate.username || "Candidate",
                email: candidate.email || "No email",
                interviews: [],
                totalScore: 0
            };
        }

        candidatesMap[id].interviews.push(result);
        candidatesMap[id].totalScore += result.overallScore || 0;
    });

    const candidateList = Object.values(candidatesMap);

    const filteredCandidates = candidateList.filter((c) =>
        c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            <div className="container">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge-tech badge-amber" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
                                <UserIcon size={14} /> Directory
                            </span>
                            <span className="text-muted small">{candidateList.length} Registered Candidates</span>
                        </div>
                        <h2 className="fw-bold text-white mb-0" style={{ letterSpacing: "-0.02em" }}>
                            Candidate Directory
                        </h2>
                        <p className="text-muted small mb-0">
                            Monitor candidate participation, interview completion volume, and cumulative benchmarks
                        </p>
                    </div>

                    <div className="glass-card p-2 px-3 d-flex align-items-center gap-2">
                        <span className="text-muted small">Active Candidates:</span>
                        <span className="text-white fw-bold">{candidateList.length}</span>
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
                            placeholder="Search candidates by name or email address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Candidates List */}
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading candidates...</span>
                        </div>
                        <p className="text-muted mt-3 small">Loading candidate profiles...</p>
                    </div>
                ) : filteredCandidates.length === 0 ? (
                    <div className="glass-card p-5 text-center">
                        <UserIcon size={44} className="text-muted mb-3" />
                        <h4 className="fw-bold text-white mb-2">No Candidates Found</h4>
                        <p className="text-muted small mb-0">
                            {searchTerm
                                ? "No candidates matched your search query."
                                : "Candidate profiles will appear here once candidates complete technical assessments."}
                        </p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {filteredCandidates.map((candidate) => {
                            const interviewCount = candidate.interviews.length;
                            const avgScore = interviewCount > 0
                                ? (candidate.totalScore / interviewCount).toFixed(1)
                                : "0.0";

                            const scoreStyle =
                                Number(avgScore) >= 8
                                    ? "badge-approved"
                                    : Number(avgScore) >= 6
                                    ? "badge-indigo"
                                    : "badge-pending";

                            return (
                                <div key={candidate.id} className="col-md-6 col-lg-4">
                                    <div className="glass-card glass-card-interactive p-4 h-100 d-flex flex-column justify-content-between">
                                        <div>
                                            <div className="d-flex align-items-center gap-3 mb-3">
                                                <div
                                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow"
                                                    style={{
                                                        width: "48px",
                                                        height: "48px",
                                                        background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                                                        fontSize: "1.1rem"
                                                    }}
                                                >
                                                    {candidate.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h5 className="fw-bold text-white mb-0">{candidate.username}</h5>
                                                    <span className="text-muted small">{candidate.email}</span>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-3 mb-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-muted small">Interviews Completed:</span>
                                                    <span className="text-white fw-bold small">{interviewCount}</span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-muted small">Average Performance:</span>
                                                    <span className={`badge-tech ${scoreStyle}`}>
                                                        {avgScore} / 10
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <button
                                                className="btn btn-secondary-dark w-100 d-flex align-items-center justify-content-center gap-2"
                                                onClick={() => setSelectedCandidate(candidate)}
                                            >
                                                <FileTextIcon size={16} /> View Assessment History
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Candidate Detail Modal */}
                {selectedCandidate && (
                    <div className="modal-backdrop-custom">
                        <div className="modal-content-custom p-4 p-md-5" style={{ maxWidth: "680px" }}>
                            <div className="d-flex justify-content-between align-items-start mb-4">
                                <div className="d-flex align-items-center gap-3">
                                    <div
                                        className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow"
                                        style={{ width: "48px", height: "48px", background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}
                                    >
                                        {selectedCandidate.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="fw-bold text-white mb-0">{selectedCandidate.username}</h4>
                                        <span className="text-muted small">{selectedCandidate.email}</span>
                                    </div>
                                </div>
                                <button className="btn-close btn-close-white" onClick={() => setSelectedCandidate(null)} />
                            </div>

                            <h5 className="fw-bold text-white mb-3">Interview History Records</h5>

                            <div className="d-flex flex-column gap-3 mb-4" style={{ maxHeight: "380px", overflowY: "auto" }}>
                                {selectedCandidate.interviews.map((item) => (
                                    <div
                                        key={item._id}
                                        className="p-3 rounded-3"
                                        style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border-subtle)" }}
                                    >
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="text-white fw-bold">{item.roleTitle}</span>
                                            <span className="badge-tech badge-indigo">
                                                {item.overallScore} / 10
                                            </span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center text-muted small">
                                            <span>Domain: {item.domain}</span>
                                            <span>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                                        </div>
                                        {item.summaryFeedback && (
                                            <p className="text-secondary small mt-2 mb-0 fst-italic">
                                                "{item.summaryFeedback}"
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button className="btn btn-secondary-dark w-100" onClick={() => setSelectedCandidate(null)}>
                                Close Record
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CandidateData;