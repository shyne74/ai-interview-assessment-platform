import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function CandidateData() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("attempts"); // "attempts" | "roster"
    
    // Attempts state
    const [candidates, setCandidates] = useState([]);
    const [loadingAttempts, setLoadingAttempts] = useState(true);
    
    // Candidate Accounts (Roster) state
    const [roster, setRoster] = useState([]);
    const [loadingRoster, setLoadingRoster] = useState(false);

    // Filter & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [riskFilter, setRiskFilter] = useState("all"); // "all" | "high" | "medium" | "low"

    // Assign Assessment Modal state
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [assignRole, setAssignRole] = useState("Frontend Developer");
    const [assignDomain, setAssignDomain] = useState("React & JavaScript");
    const [assignQuestions, setAssignQuestions] = useState("5");
    const [assignDuration, setAssignDuration] = useState("30");
    const [assigning, setAssigning] = useState(false);
    const [actionToast, setActionToast] = useState("");

    // Fetch assessment attempts
    const fetchCandidateAttempts = async () => {
        try {
            setLoadingAttempts(true);
            const res = await api.get("/results/admin");
            const raw = res.data.results || [];
            const mapped = raw.map((r) => {
                const dt = r.createdAt ? new Date(r.createdAt) : new Date();
                const dateStr = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                    ", " + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
                
                const name = r.candidateId?.username || r.candidateId?.email?.split("@")[0] || "Candidate";
                const email = r.candidateId?.email || "";
                const exam = `${r.roleTitle || "Technical"} · ${r.domain || "Screen"}`;
                const score = typeof r.overallScore === "number" ? r.overallScore : 0;
                const originalityScore = r.plagiarismReport?.overallOriginalityScore ?? 100;
                
                let risk = "Low";
                const pStatus = (r.plagiarismReport?.status || "").toLowerCase();
                const pRisk = (r.plagiarismReport?.riskLevel || "").toLowerCase();
                if (pRisk === "high" || pStatus.includes("high")) risk = "High";
                else if (pRisk === "medium" || pStatus.includes("moderate")) risk = "Medium";

                const flags = r.plagiarismReport?.flaggedCount || 0;
                const interviewId = r.interviewId?._id || r.interviewId || r._id;

                return {
                    id: interviewId,
                    date: dateStr,
                    name,
                    email,
                    exam,
                    score,
                    originality: `${originalityScore}%`,
                    risk,
                    anomalies: `${flags} flags open`
                };
            });
            setCandidates(mapped);
        } catch (err) {
            console.error("Failed to load candidate reports:", err);
        } finally {
            setLoadingAttempts(false);
        }
    };

    // Fetch registered candidate users
    const fetchCandidateRoster = async () => {
        try {
            setLoadingRoster(true);
            const res = await api.get("/auth/candidates");
            const users = res.data.candidates || [];
            setRoster(users);
        } catch (err) {
            console.error("Failed to load candidate roster:", err);
        } finally {
            setLoadingRoster(false);
        }
    };

    useEffect(() => {
        fetchCandidateAttempts();
        fetchCandidateRoster();
    }, []);

    const handleDeleteCandidate = async (cand) => {
        if (!window.confirm(`Are you sure you want to remove candidate account: ${cand.username} (${cand.email})?`)) {
            return;
        }

        try {
            await api.delete(`/auth/candidates/${cand._id}`);
            setActionToast(`Candidate ${cand.username} removed successfully.`);
            setRoster(prev => prev.filter(c => c._id !== cand._id));
        } catch (err) {
            console.error("Failed to delete candidate:", err);
            setActionToast(`Error: ${err.response?.data?.message || err.message}`);
        } finally {
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    const handleOpenAssignModal = (cand) => {
        setSelectedCandidate(cand);
        setAssignRole(cand.preferredRole || "Frontend Developer");
        setAssignDomain(cand.preferredRole || "General Technical");
        setAssignModalOpen(true);
    };

    const handleAssignAssessmentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCandidate) return;

        setAssigning(true);
        try {
            const payload = {
                candidateId: selectedCandidate._id,
                roleTitle: assignRole,
                domain: assignDomain,
                assessmentType: "theory",
                durationSeconds: parseInt(assignDuration, 10) * 60,
                limit: parseInt(assignQuestions, 10)
            };

            await api.post("/interviews/assign", payload);
            setActionToast(`Assessment "${assignRole}" assigned to ${selectedCandidate.username} successfully.`);
            setAssignModalOpen(false);
            fetchCandidateAttempts();
        } catch (err) {
            console.error("Failed to assign assessment:", err);
            setActionToast(`Error assigning assessment: ${err.response?.data?.message || err.message}`);
        } finally {
            setAssigning(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    const getRiskPill = (risk) => {
        if (risk === "Low") return "wf-pill wf-pill-green";
        if (risk === "Medium") return "wf-pill wf-pill-yellow";
        return "wf-pill wf-pill-red";
    };

    // Filter attempts
    const filteredAttempts = candidates.filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.exam.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRisk = riskFilter === "all" || c.risk.toLowerCase() === riskFilter.toLowerCase();
        return matchesSearch && matchesRisk;
    });

    // Filter roster
    const filteredRoster = roster.filter((c) => {
        const name = (c.username || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const role = (c.preferredRole || "").toLowerCase();
        const s = searchTerm.toLowerCase();
        return name.includes(s) || email.includes(s) || role.includes(s);
    });

    return (
        <div>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Candidates</span>
            </div>

            {/* Header + Add Candidate Action */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                    <h1 className="wf-page-title" style={{ margin: "0 0 6px 0" }}>
                        Candidates management
                    </h1>
                    <p className="wf-page-subtitle" style={{ margin: 0 }}>
                        Review candidate assessment attempts, integrity flags, and manage registered candidates.
                    </p>
                </div>
                <Link to="/admin/candidates/add" className="wf-btn-primary">
                    + Add candidates
                </Link>
            </div>

            {actionToast && (
                <div style={{ padding: "12px 18px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ✓ {actionToast}
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e5e7eb", marginBottom: "20px" }}>
                <button
                    type="button"
                    onClick={() => setActiveTab("attempts")}
                    style={{
                        padding: "10px 18px",
                        fontSize: "14px",
                        fontWeight: "600",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: activeTab === "attempts" ? "2.5px solid #111827" : "2.5px solid transparent",
                        color: activeTab === "attempts" ? "#111827" : "#6b7280",
                        cursor: "pointer"
                    }}
                >
                    Assessment attempts ({candidates.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("roster")}
                    style={{
                        padding: "10px 18px",
                        fontSize: "14px",
                        fontWeight: "600",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: activeTab === "roster" ? "2.5px solid #111827" : "2.5px solid transparent",
                        color: activeTab === "roster" ? "#111827" : "#6b7280",
                        cursor: "pointer"
                    }}
                >
                    Registered candidates roster ({roster.length})
                </button>
            </div>

            {/* Search & Filter Controls */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
                <input
                    type="text"
                    placeholder="Search candidate name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="wf-input"
                    style={{ maxWidth: "360px" }}
                />

                {activeTab === "attempts" && (
                    <select
                        value={riskFilter}
                        onChange={(e) => setRiskFilter(e.target.value)}
                        className="wf-input"
                        style={{ maxWidth: "180px", backgroundColor: "#ffffff" }}
                    >
                        <option value="all">All integrity risks</option>
                        <option value="high">High risk only</option>
                        <option value="medium">Medium risk only</option>
                        <option value="low">Low risk (clean)</option>
                    </select>
                )}
            </div>

            {/* Tab Content 1: Attempts Table */}
            {activeTab === "attempts" && (
                <div className="wf-card" style={{ padding: "0", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table className="wf-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Candidate</th>
                                    <th>Exam</th>
                                    <th>Score</th>
                                    <th>Originality</th>
                                    <th>Integrity risk</th>
                                    <th>Anomalies</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingAttempts ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                                            Loading candidates and integrity reviews...
                                        </td>
                                    </tr>
                                ) : filteredAttempts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                                            No assessment attempts match the selected filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAttempts.map((c, i) => (
                                        <tr key={`${c.id}-${i}`}>
                                            <td style={{ color: "#6b7280" }}>{c.date}</td>
                                            <td style={{ fontWeight: "600", color: "#111827" }}>
                                                <div>{c.name}</div>
                                                <div style={{ fontSize: "11px", color: "#6b7280" }}>{c.email}</div>
                                            </td>
                                            <td style={{ color: "#374151" }}>{c.exam}</td>
                                            <td style={{ fontWeight: "700", color: "#111827" }}>{c.score.toFixed(1)}</td>
                                            <td style={{ color: "#374151" }}>{c.originality}</td>
                                            <td>
                                                <span className={getRiskPill(c.risk)}>
                                                    {c.risk}
                                                </span>
                                            </td>
                                            <td style={{ color: c.anomalies.includes("0") ? "#10b981" : "#d97706", fontWeight: "500" }}>
                                                {c.anomalies}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/results/${c.id}`)}
                                                    className="wf-btn-outline"
                                                    style={{ padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}
                                                >
                                                    Full review
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab Content 2: Registered Roster Table */}
            {activeTab === "roster" && (
                <div className="wf-card" style={{ padding: "0", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table className="wf-table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Email</th>
                                    <th>Target track</th>
                                    <th>Registered on</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingRoster ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                                            Loading candidates roster...
                                        </td>
                                    </tr>
                                ) : filteredRoster.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
                                            No registered candidates found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRoster.map((cand) => (
                                        <tr key={cand._id}>
                                            <td style={{ fontWeight: "600", color: "#111827" }}>{cand.username}</td>
                                            <td style={{ color: "#374151" }}>{cand.email}</td>
                                            <td>
                                                <span className="wf-pill wf-pill-blue">
                                                    {cand.preferredRole || "Software Engineer"}
                                                </span>
                                            </td>
                                            <td style={{ color: "#6b7280" }}>
                                                {cand.createdAt ? new Date(cand.createdAt).toLocaleDateString() : "Active"}
                                            </td>
                                            <td style={{ display: "flex", gap: "8px" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenAssignModal(cand)}
                                                    className="wf-btn-outline"
                                                    style={{ padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "#2563eb", borderColor: "#bfdbfe" }}
                                                >
                                                    + Assign exam
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteCandidate(cand)}
                                                    className="wf-btn-outline"
                                                    style={{ padding: "4px 8px", fontSize: "12px", cursor: "pointer", color: "#dc2626", borderColor: "#fecaca" }}
                                                    title="Remove candidate"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Assign Assessment */}
            {assignModalOpen && selectedCandidate && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div className="wf-card" style={{ maxWidth: "480px", width: "100%", padding: "24px", position: "relative" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>
                            Assign Assessment
                        </h2>
                        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
                            Assign a pending assessment directly to <strong>{selectedCandidate.username}</strong> ({selectedCandidate.email}). It will appear immediately on their dashboard.
                        </p>

                        <form onSubmit={handleAssignAssessmentSubmit}>
                            <div style={{ marginBottom: "16px" }}>
                                <label className="wf-form-label">Role Track</label>
                                <select
                                    value={assignRole}
                                    onChange={(e) => setAssignRole(e.target.value)}
                                    className="wf-input"
                                    style={{ backgroundColor: "#ffffff" }}
                                >
                                    <option>Frontend Developer</option>
                                    <option>Backend Developer</option>
                                    <option>Full Stack Developer</option>
                                    <option>AI/ML Engineer</option>
                                    <option>System Architect</option>
                                    <option>Software Engineer</option>
                                    <option>DevOps Engineer</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label className="wf-form-label">Domain Focus</label>
                                <input
                                    type="text"
                                    value={assignDomain}
                                    onChange={(e) => setAssignDomain(e.target.value)}
                                    placeholder="e.g. React & State Management"
                                    required
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                                <div>
                                    <label className="wf-form-label">Questions</label>
                                    <select
                                        value={assignQuestions}
                                        onChange={(e) => setAssignQuestions(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="3">3 questions</option>
                                        <option value="5">5 questions</option>
                                        <option value="8">8 questions</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="wf-form-label">Duration (mins)</label>
                                    <select
                                        value={assignDuration}
                                        onChange={(e) => setAssignDuration(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="45">45 minutes</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setAssignModalOpen(false)}
                                    disabled={assigning}
                                    className="wf-btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigning}
                                    className="wf-btn-primary"
                                    style={{ cursor: assigning ? "not-allowed" : "pointer" }}
                                >
                                    {assigning ? "Assigning..." : "Confirm & Assign"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
