import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import api from "../utils/api";
import AssignTestModal from "../components/AssignTestModal";

export default function CandidateData() {
    const navigate = useNavigate();

    // Data states
    const [candidates, setCandidates] = useState([]);
    const [results, setResults] = useState([]);
    const [rolesList, setRolesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionToast, setActionToast] = useState("");

    // Filtering, Search, Sort, Pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [integrityFilter, setIntegrityFilter] = useState("all");
    const [sortBy, setSortBy] = useState("joined"); // "joined" | "name" | "score" | "attempts"
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 8;

    // Detail Drawer state
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Assign Assessment Modal state
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignRole, setAssignRole] = useState("Backend Developer");
    const [assignDomain, setAssignDomain] = useState("Node.js & Express");
    const [assignType, setAssignType] = useState("theory");
    const [assignDifficulty, setAssignDifficulty] = useState("medium");
    const [assignQuestions, setAssignQuestions] = useState("5");
    const [assignDuration, setAssignDuration] = useState("30");
    const [assigning, setAssigning] = useState(false);

    // Delete Confirmation Modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [candidateToDelete, setCandidateToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch all required data
    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const [candRes, resultsRes, rolesRes] = await Promise.allSettled([
                api.get("/auth/candidates"),
                api.get("/results/admin"),
                api.get("/roles")
            ]);

            const rawCandidates = candRes.status === "fulfilled" ? candRes.value.data.candidates || [] : [];
            const rawResults = resultsRes.status === "fulfilled" ? resultsRes.value.data.results || [] : [];
            const rawRoles = rolesRes.status === "fulfilled" ? rolesRes.value.data.roles || [] : [];

            setCandidates(rawCandidates);
            setResults(rawResults);
            setRolesList(rawRoles);

            if (rawRoles.length > 0) {
                setAssignRole(rawRoles[0].title);
                setAssignDomain(rawRoles[0].domains?.[0] || "General Technical");
            }
        } catch (err) {
            console.error("Failed to load candidate management data:", err);
            setError("Failed to synchronize candidate records from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Merge candidates with their attempt history
    const mergedCandidates = useMemo(() => {
        return candidates.map(cand => {
            const candEmail = (cand.email || "").toLowerCase();
            const candId = (cand._id || "").toString();

            // Find all matching results for this candidate
            const candAttempts = results.filter(r => {
                const rCandId = r.candidateId?._id?.toString() || r.candidateId?.toString();
                const rCandEmail = (r.candidateId?.email || "").toLowerCase();
                return (rCandId && rCandId === candId) || (candEmail && rCandEmail === candEmail);
            });

            // Calculate metrics
            const attemptCount = candAttempts.length;
            const latestAttempt = candAttempts[0] || null;
            const lastScore = latestAttempt ? (latestAttempt.overallScore ?? 0) : null;

            // Determine highest integrity risk
            let integrityStatus = "Clean";
            if (candAttempts.length === 0) {
                integrityStatus = "No attempts";
            } else {
                for (const att of candAttempts) {
                    const plag = att.plagiarismReport || att.interviewId?.plagiarismSummary || {};
                    const risk = (plag.riskLevel || plag.status || "").toLowerCase();
                    const violations = att.interviewId?.violations?.length || 0;
                    if (risk.includes("high") || violations >= 3) {
                        integrityStatus = "High";
                        break;
                    } else if (risk.includes("medium") || risk.includes("moderate") || violations >= 1) {
                        integrityStatus = "Medium";
                    }
                }
            }

            return {
                ...cand,
                attemptCount,
                lastScore,
                integrityStatus,
                attempts: candAttempts,
                joinedFormatted: cand.createdAt ? new Date(cand.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"
            };
        });
    }, [candidates, results]);

    // Filter, search, and sort
    const filteredCandidates = useMemo(() => {
        return mergedCandidates.filter(c => {
            const search = searchTerm.toLowerCase();
            const matchesSearch = !search ||
                (c.username || "").toLowerCase().includes(search) ||
                (c.email || "").toLowerCase().includes(search) ||
                (c.preferredRole || "").toLowerCase().includes(search);

            const matchesRole = roleFilter === "all" || (c.preferredRole || "").toLowerCase() === roleFilter.toLowerCase();
            const matchesIntegrity = integrityFilter === "all" || c.integrityStatus.toLowerCase() === integrityFilter.toLowerCase();

            return matchesSearch && matchesRole && matchesIntegrity;
        }).sort((a, b) => {
            if (sortBy === "name") return (a.username || "").localeCompare(b.username || "");
            if (sortBy === "score") return (b.lastScore ?? -1) - (a.lastScore ?? -1);
            if (sortBy === "attempts") return b.attemptCount - a.attemptCount;
            // Default "joined"
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [mergedCandidates, searchTerm, roleFilter, integrityFilter, sortBy]);

    // Pagination
    const totalPages = Math.ceil(filteredCandidates.length / pageSize) || 1;
    const paginatedCandidates = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredCandidates.slice(start, start + pageSize);
    }, [filteredCandidates, currentPage]);

    // Row click -> open drawer
    const handleRowClick = (cand) => {
        setSelectedCandidate(cand);
        setDrawerOpen(true);
    };

    // Open assign modal for candidate
    const handleOpenAssignModal = (cand, e) => {
        if (e) e.stopPropagation();
        setSelectedCandidate(cand);
        const preferred = cand.preferredRole || (rolesList[0]?.title || "Backend Developer");
        setAssignRole(preferred);
        const matchingRole = rolesList.find(r => r.title.toLowerCase() === preferred.toLowerCase());
        setAssignDomain(matchingRole?.domains?.[0] || "General Technical");
        setAssignModalOpen(true);
    };

    // Submit assign assessment
    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCandidate) return;

        setAssigning(true);
        try {
            const payload = {
                candidateId: selectedCandidate._id,
                roleTitle: assignRole,
                domain: assignDomain,
                assessmentType: assignType,
                difficulty: assignDifficulty,
                limit: parseInt(assignQuestions, 10),
                durationSeconds: parseInt(assignDuration, 10) * 60
            };

            await api.post("/interviews/assign", payload);
            setActionToast(`Assessment "${assignRole}" successfully assigned to ${selectedCandidate.username}.`);
            setAssignModalOpen(false);
            fetchData();
        } catch (err) {
            console.error("Assign error:", err);
            setActionToast(`Error: ${err.response?.data?.message || "Failed to assign assessment"}`);
        } finally {
            setAssigning(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    // Open delete confirmation modal
    const handleOpenDeleteModal = (cand, e) => {
        if (e) e.stopPropagation();
        setCandidateToDelete(cand);
        setDeleteModalOpen(true);
    };

    // Confirm delete candidate
    const handleConfirmDelete = async () => {
        if (!candidateToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/auth/candidates/${candidateToDelete._id}`);
            setActionToast(`Candidate account ${candidateToDelete.username} removed.`);
            setDeleteModalOpen(false);
            if (selectedCandidate?._id === candidateToDelete._id) {
                setDrawerOpen(false);
            }
            setCandidateToDelete(null);
            fetchData();
        } catch (err) {
            console.error("Delete candidate error:", err);
            setActionToast(`Error: ${err.response?.data?.message || "Could not remove candidate"}`);
        } finally {
            setDeleting(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Candidates</span>
            </div>

            {/* Header + Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                    <h1 className="wf-page-title" style={{ margin: "0 0 4px 0" }}>
                        Candidates directory
                    </h1>
                    <p className="wf-page-subtitle" style={{ margin: 0 }}>
                        Review candidate profiles, assessment attempt history, integrity compliance, and assign customized tests.
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCandidate(null);
                            setAssignModalOpen(true);
                        }}
                        className="wf-btn-outline"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                        <Mail size={15} /> Assign Test & Send Invite
                    </button>
                    <Link to="/admin/candidates/add" className="wf-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>+</span> Register Candidates
                    </Link>
                </div>
            </div>

            {actionToast && (
                <div style={{ padding: "12px 18px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ✓ {actionToast}
                </div>
            )}

            {error && (
                <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* Controls: Search, Role Filter, Integrity Filter, Sort */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search candidate name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="wf-input"
                    style={{ minWidth: "280px", flex: 1 }}
                />

                {/* Role Filter */}
                <select
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                    className="wf-input"
                    style={{ width: "auto", minWidth: "160px", backgroundColor: "#ffffff" }}
                >
                    <option value="all">All Roles</option>
                    {rolesList.map(r => (
                        <option key={r._id || r.title} value={r.title}>{r.title}</option>
                    ))}
                </select>

                {/* Integrity Filter */}
                <select
                    value={integrityFilter}
                    onChange={(e) => { setIntegrityFilter(e.target.value); setCurrentPage(1); }}
                    className="wf-input"
                    style={{ width: "auto", minWidth: "150px", backgroundColor: "#ffffff" }}
                >
                    <option value="all">All Integrity</option>
                    <option value="clean">Clean</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                    <option value="no attempts">No Attempts</option>
                </select>

                {/* Sort By */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="wf-input"
                    style={{ width: "auto", minWidth: "140px", backgroundColor: "#ffffff" }}
                >
                    <option value="joined">Sort: Joined Date</option>
                    <option value="name">Sort: Name (A-Z)</option>
                    <option value="score">Sort: Last Score</option>
                    <option value="attempts">Sort: Most Attempts</option>
                </select>
            </div>

            {/* Candidates Table */}
            <div className="wf-card" style={{ padding: 0, overflow: "hidden" }}>
                {loading ? (
                    <div style={{ padding: "48px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                        Loading candidate records and evaluation telemetry...
                    </div>
                ) : filteredCandidates.length === 0 ? (
                    <div style={{ padding: "48px 24px", textAlign: "center" }}>
                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>👥</div>
                        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: "0 0 6px 0" }}>
                            No candidates found
                        </h3>
                        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px 0" }}>
                            {searchTerm || roleFilter !== "all" || integrityFilter !== "all"
                                ? "No candidates matched your search criteria. Try resetting filters."
                                : "No candidates registered yet. Add a candidate to get started."}
                        </p>
                        <Link to="/admin/candidates/add" className="wf-btn-primary">
                            + Add Candidate
                        </Link>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ borderBottom: "1.5px solid #e5e7eb", backgroundColor: "#f9fafb", textAlign: "left", color: "#6b7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    <th style={{ padding: "12px 16px" }}>Candidate</th>
                                    <th style={{ padding: "12px 16px" }}>Preferred Role</th>
                                    <th style={{ padding: "12px 16px" }}>Attempts</th>
                                    <th style={{ padding: "12px 16px" }}>Last Score</th>
                                    <th style={{ padding: "12px 16px" }}>Integrity Status</th>
                                    <th style={{ padding: "12px 16px" }}>Joined Date</th>
                                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedCandidates.map(cand => (
                                    <tr
                                        key={cand._id}
                                        onClick={() => handleRowClick(cand)}
                                        style={{
                                            borderBottom: "1px solid #f3f4f6",
                                            cursor: "pointer",
                                            backgroundColor: selectedCandidate?._id === cand._id ? "#f0f7ff" : "transparent",
                                            transition: "background-color 0.1s ease"
                                        }}
                                        onMouseEnter={(e) => { if (selectedCandidate?._id !== cand._id) e.currentTarget.style.backgroundColor = "#fafafa"; }}
                                        onMouseLeave={(e) => { if (selectedCandidate?._id !== cand._id) e.currentTarget.style.backgroundColor = "transparent"; }}
                                    >
                                        <td style={{ padding: "12px 16px" }}>
                                            <div style={{ fontWeight: "700", color: "#111827" }}>{cand.username}</div>
                                            <div style={{ fontSize: "12px", color: "#6b7280" }}>{cand.email}</div>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#374151" }}>
                                            <span style={{ backgroundColor: "#f3f4f6", padding: "3px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "500" }}>
                                                {cand.preferredRole || "General"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", fontWeight: "600", color: "#111827" }}>
                                            {cand.attemptCount} {cand.attemptCount === 1 ? "attempt" : "attempts"}
                                        </td>
                                        <td style={{ padding: "12px 16px", fontWeight: "700", color: cand.lastScore !== null ? (cand.lastScore >= 7 ? "#059669" : "#d97706") : "#9ca3af" }}>
                                            {cand.lastScore !== null ? `${cand.lastScore} / 10` : "—"}
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{
                                                padding: "3px 8px",
                                                borderRadius: "4px",
                                                fontSize: "11px",
                                                fontWeight: "700",
                                                backgroundColor:
                                                    cand.integrityStatus === "High" ? "#fee2e2" :
                                                    cand.integrityStatus === "Medium" ? "#fef3c7" :
                                                    cand.integrityStatus === "Clean" ? "#ecfdf5" : "#f3f4f6",
                                                color:
                                                    cand.integrityStatus === "High" ? "#991b1b" :
                                                    cand.integrityStatus === "Medium" ? "#92400e" :
                                                    cand.integrityStatus === "Clean" ? "#065f46" : "#6b7280"
                                            }}>
                                                {cand.integrityStatus}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "12px" }}>
                                            {cand.joinedFormatted}
                                        </td>
                                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                            <div style={{ display: "inline-flex", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleOpenAssignModal(cand, e)}
                                                    className="wf-btn-outline"
                                                    style={{ padding: "4px 10px", fontSize: "11px", fontWeight: "600" }}
                                                    title="Assign custom assessment"
                                                >
                                                    + Assign
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleOpenDeleteModal(cand, e)}
                                                    style={{
                                                        padding: "4px 8px",
                                                        fontSize: "11px",
                                                        border: "1px solid #fecaca",
                                                        borderRadius: "6px",
                                                        backgroundColor: "#ffffff",
                                                        color: "#dc2626",
                                                        cursor: "pointer"
                                                    }}
                                                    title="Remove candidate account"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && filteredCandidates.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid #e5e7eb", fontSize: "13px", color: "#6b7280" }}>
                        <div>
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredCandidates.length)} of {filteredCandidates.length} candidates
                        </div>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="wf-btn-outline"
                                style={{ padding: "4px 10px", fontSize: "12px", opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                                Previous
                            </button>
                            <span style={{ padding: "0 6px", fontWeight: "600", color: "#111827" }}>
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className="wf-btn-outline"
                                style={{ padding: "4px 10px", fontSize: "12px", opacity: currentPage === totalPages ? 0.5 : 1 }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Slide-over Detail Drawer */}
            {drawerOpen && selectedCandidate && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    width: "420px",
                    maxWidth: "90vw",
                    height: "100vh",
                    backgroundColor: "#ffffff",
                    boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    animation: "fadeIn 0.2s ease"
                }}>
                    {/* Drawer Header */}
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>
                                CANDIDATE DETAILS
                            </div>
                            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#111827", margin: "0 0 4px 0" }}>
                                {selectedCandidate.username}
                            </h2>
                            <div style={{ fontSize: "13px", color: "#4b5563" }}>
                                {selectedCandidate.email}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(false)}
                            style={{ background: "none", border: "none", fontSize: "20px", color: "#9ca3af", cursor: "pointer", padding: "4px" }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Drawer Body */}
                    <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto" }}>
                        {/* Summary Badges */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                            <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
                                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Preferred Track</div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>
                                    {selectedCandidate.preferredRole || "General"}
                                </div>
                            </div>
                            <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
                                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Total Attempts</div>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>
                                    {selectedCandidate.attempts.length}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
                            <button
                                type="button"
                                onClick={() => handleOpenAssignModal(selectedCandidate)}
                                className="wf-btn-primary"
                                style={{ flex: 1, padding: "9px 12px", fontSize: "12px", textAlign: "center" }}
                            >
                                + Assign Assessment
                            </button>
                            <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(selectedCandidate)}
                                style={{
                                    padding: "9px 14px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    border: "1px solid #fecaca",
                                    borderRadius: "8px",
                                    backgroundColor: "#fef2f2",
                                    color: "#dc2626",
                                    cursor: "pointer"
                                }}
                            >
                                Remove
                            </button>
                        </div>

                        {/* Attempt History Section */}
                        <div>
                            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>
                                Evaluation Attempt History ({selectedCandidate.attempts.length})
                            </h3>

                            {selectedCandidate.attempts.length === 0 ? (
                                <div style={{ padding: "20px", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "8px", fontSize: "13px", color: "#6b7280" }}>
                                    No evaluations recorded for this candidate yet.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {selectedCandidate.attempts.map(att => {
                                        const score = att.overallScore ?? 0;
                                        const date = att.createdAt ? new Date(att.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent";
                                        const plag = att.plagiarismReport || att.interviewId?.plagiarismSummary || {};
                                        const risk = (plag.riskLevel || plag.status || "Low").toUpperCase();
                                        const flags = plag.flaggedCount || 0;
                                        const resultId = att._id;

                                        return (
                                            <div
                                                key={att._id}
                                                style={{
                                                    padding: "14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid #e5e7eb",
                                                    backgroundColor: "#ffffff"
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                                    <div>
                                                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>
                                                            {att.roleTitle || "Technical Assessment"}
                                                        </div>
                                                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                                                            {att.domain} · {date}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: "14px", fontWeight: "800", color: score >= 7 ? "#059669" : "#d97706" }}>
                                                        {score} / 10
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                                                    <span style={{
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        fontSize: "10px",
                                                        fontWeight: "700",
                                                        backgroundColor: risk.includes("HIGH") ? "#fee2e2" : risk.includes("MED") ? "#fef3c7" : "#ecfdf5",
                                                        color: risk.includes("HIGH") ? "#991b1b" : risk.includes("MED") ? "#92400e" : "#065f46"
                                                    }}>
                                                        {risk} RISK ({flags} flags)
                                                    </span>

                                                    <Link
                                                        to={`/results/${resultId}`}
                                                        style={{
                                                            fontSize: "12px",
                                                            color: "#2563eb",
                                                            fontWeight: "600",
                                                            textDecoration: "none"
                                                        }}
                                                    >
                                                        Diagnostic report →
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 1: Assign Assessment & Email Invite */}
            <AssignTestModal
                isOpen={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                initialCandidate={selectedCandidate}
                candidatesList={candidates}
                onAssigned={(res) => {
                    setActionToast(`Assessment assigned and invitation email dispatched to ${res.candidate?.email}.`);
                    fetchData();
                }}
            />

            {/* Modal 2: Confirm Delete Candidate */}
            {deleteModalOpen && candidateToDelete && (
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
                    zIndex: 1100,
                    padding: "16px"
                }}>
                    <div className="wf-card" style={{ width: "420px", maxWidth: "100%", padding: "28px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>
                            Remove Candidate Account?
                        </h2>
                        <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                            Are you sure you want to delete <strong>{candidateToDelete.username}</strong> ({candidateToDelete.email})? This action cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={() => setDeleteModalOpen(false)}
                                className="wf-btn-outline"
                                style={{ padding: "8px 16px" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={handleConfirmDelete}
                                style={{
                                    padding: "8px 18px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    border: "none",
                                    borderRadius: "8px",
                                    backgroundColor: "#dc2626",
                                    color: "#ffffff",
                                    cursor: "pointer"
                                }}
                            >
                                {deleting ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
