import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../components/ui/ToastContext";
import EmailStatusBanner from "../components/EmailStatusBanner";
import {
    ArrowLeft,
    RefreshCw,
    Download,
    Mail,
    Key,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Search,
    Filter,
    Shield,
    ExternalLink,
    Loader2,
    Settings,
    UserCheck,
    Calendar,
    ChevronDown,
    MoreHorizontal,
    Copy,
    Send,
    UserX,
    History,
    Check,
    Lock
} from "lucide-react";

export default function AdminBatchTracking() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [batch, setBatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Action modals
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [extendDeadlineModal, setExtendDeadlineModal] = useState(false);
    const [newClosesAt, setNewClosesAt] = useState("");
    const [editSettingsModal, setEditSettingsModal] = useState(false);
    const [editBatchName, setEditBatchName] = useState("");
    const [editOpensAt, setEditOpensAt] = useState("");
    const [editClosesAt, setEditClosesAt] = useState("");

    // Fallback: Copy Invite Modal
    const [copyInviteModal, setCopyInviteModal] = useState(false);
    const [copyInviteData, setCopyInviteData] = useState(null);
    const [copied, setCopied] = useState(false);

    // Candidate Timeline Modal
    const [timelineModal, setTimelineModal] = useState(false);
    const [timelineData, setTimelineData] = useState(null);

    // Bulk Remind Loading
    const [remindingAll, setRemindingAll] = useState(false);

    // Fetch batch data
    const fetchBatchData = async (isManual = false) => {
        try {
            if (isManual) setRefreshing(true);
            const res = await api.get(`/batches/${id}`);
            setBatch(res.data.batch);
            if (res.data.batch) {
                setEditBatchName(res.data.batch.name);
                setEditOpensAt(res.data.batch.opensAt ? new Date(res.data.batch.opensAt).toISOString().slice(0, 16) : "");
                setEditClosesAt(res.data.batch.closesAt ? new Date(res.data.batch.closesAt).toISOString().slice(0, 16) : "");
            }
        } catch (err) {
            console.error("Failed to load batch:", err);
            addToast("Failed to load batch tracking data.", "error");
        } finally {
            setLoading(false);
            if (isManual) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBatchData();
    }, [id]);

    // Auto-refresh poll every 30s
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchBatchData(false);
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, id]);

    // Resend Invite
    const handleResendInvite = async (candidateEmail) => {
        try {
            setActionLoading(candidateEmail);
            const res = await api.post(`/batches/${id}/candidates/${encodeURIComponent(candidateEmail)}/resend`);
            addToast(`Invitation resent to ${candidateEmail}`, "success");
            fetchBatchData(false);
        } catch (err) {
            addToast(`Failed to resend invite: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setActionLoading(null);
        }
    };

    // Reset Access & Copy Invite (Part 4 Fallback)
    const handleResetAndCopyInvite = async (candidateEmail) => {
        try {
            setActionLoading(candidateEmail);
            setCopied(false);
            const res = await api.post(`/batches/${id}/candidates/${encodeURIComponent(candidateEmail)}/copy-invite`);
            setCopyInviteData(res.data);
            setCopyInviteModal(true);
            fetchBatchData(false);
        } catch (err) {
            addToast(`Failed to generate credentials: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleCopyText = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        addToast("Copied invite message to clipboard!", "success");
        setTimeout(() => setCopied(false), 3000);
    };

    // Bulk Remind Unstarted
    const handleRemindUnstarted = async () => {
        if (!window.confirm("Send reminder emails to all candidates who haven't started their assessment yet? (Throttled to max 1 per hour per candidate)")) {
            return;
        }

        try {
            setRemindingAll(true);
            const res = await api.post(`/batches/${id}/remind-unstarted`);
            addToast(res.data.message || "Reminders dispatched.", "success");
            fetchBatchData(false);
        } catch (err) {
            addToast(`Bulk reminder failed: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setRemindingAll(false);
        }
    };

    // Unassign candidate
    const handleUnassignCandidate = async (candidateEmail) => {
        if (!window.confirm(`Unassign ${candidateEmail} from this batch? This will cancel their unstarted assessment.`)) {
            return;
        }

        try {
            setActionLoading(candidateEmail);
            await api.delete(`/batches/${id}/candidates/${encodeURIComponent(candidateEmail)}`);
            addToast(`Candidate ${candidateEmail} unassigned.`, "success");
            fetchBatchData(false);
        } catch (err) {
            addToast(`Failed to unassign: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setActionLoading(null);
        }
    };

    // View Candidate Timeline
    const handleViewTimeline = async (candidate) => {
        setSelectedCandidate(candidate);
        try {
            const res = await api.get(`/batches/${id}/candidates/${encodeURIComponent(candidate.email)}/timeline`);
            setTimelineData(res.data);
            setTimelineModal(true);
        } catch (err) {
            // Fallback to in-memory timeline on candidate object
            setTimelineData({ name: candidate.name, email: candidate.email, timeline: candidate.timeline || [] });
            setTimelineModal(true);
        }
    };

    // Extend Candidate Deadline
    const handleExtendDeadline = async () => {
        if (!selectedCandidate || !selectedCandidate.interviewId) {
            addToast("Candidate does not have an active interview ID.", "error");
            return;
        }

        try {
            await api.patch(`/batches/${id}/candidates/${selectedCandidate.interviewId}`, {
                closesAt: newClosesAt ? new Date(newClosesAt) : null
            });
            addToast(`Deadline updated for ${selectedCandidate.name}.`, "success");
            setExtendDeadlineModal(false);
            fetchBatchData(false);
        } catch (err) {
            addToast(`Failed to update deadline: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    // Update Batch Settings
    const handleUpdateBatchSettings = async () => {
        try {
            await api.put(`/batches/${id}`, {
                name: editBatchName.trim(),
                opensAt: editOpensAt ? new Date(editOpensAt) : null,
                closesAt: editClosesAt ? new Date(editClosesAt) : null
            });
            addToast("Batch settings updated successfully.", "success");
            setEditSettingsModal(false);
            fetchBatchData(false);
        } catch (err) {
            addToast(`Failed to update settings: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    // Close Batch
    const handleCloseBatch = async () => {
        if (!window.confirm("Close this batch? No further submissions will be allowed.")) return;
        try {
            await api.patch(`/batches/${id}/close`);
            addToast("Batch marked as closed.", "success");
            fetchBatchData(false);
        } catch (err) {
            addToast(`Failed to close batch: ${err.response?.data?.message || err.message}`, "error");
        }
    };

    // Export CSV
    const handleExportCsv = () => {
        const token = localStorage.getItem("token");
        const exportUrl = `${api.defaults.baseURL}/batches/${id}/export`;
        const a = document.createElement("a");
        a.href = exportUrl;
        a.setAttribute("download", `${batch?.name || "batch"}_results.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast("Downloading CSV export...", "info");
    };

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <Loader2 size={32} className="animate-spin" style={{ color: "#16a34a" }} />
            </div>
        );
    }

    if (!batch) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <h2>Batch not found</h2>
                <Link to="/admin/batches" style={{ color: "#16a34a", textDecoration: "underline" }}>
                    Return to Batches list
                </Link>
            </div>
        );
    }

    // Filter candidates
    const filteredCandidates = (batch.candidates || []).filter(c => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.role.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (statusFilter === "all") return true;
        if (statusFilter === "in_progress") return c.interviewStatus === "in-progress";
        if (statusFilter === "completed") return c.interviewStatus === "completed" || c.interviewStatus === "submitted" || c.interviewStatus === "evaluated";
        if (statusFilter === "invited") return c.interviewStatus === "pending";
        if (statusFilter === "email_failed") return c.inviteStatus === "email_failed" || c.inviteStatus === "failed";
        return true;
    });

    // Counts
    const total = batch.candidates.length;
    const completed = batch.candidates.filter(c => c.interviewStatus === "completed" || c.interviewStatus === "submitted" || c.interviewStatus === "evaluated").length;
    const inProgress = batch.candidates.filter(c => c.interviewStatus === "in-progress").length;
    const pending = batch.candidates.filter(c => c.interviewStatus === "pending" || c.interviewStatus === "unassigned").length;
    const failedEmails = batch.candidates.filter(c => c.inviteStatus === "email_failed" || c.inviteStatus === "failed").length;

    const evaluatedScores = batch.candidates
        .filter(c => c.isEvaluated && typeof c.score === "number")
        .map(c => (c.totalScore > 0 ? (c.score / c.totalScore) * 100 : c.score));

    const avgScore = evaluatedScores.length
        ? Math.round(evaluatedScores.reduce((a, b) => a + b, 0) / evaluatedScores.length)
        : null;

    return (
        <div className="wf-page-container" style={{ maxWidth: "1300px", margin: "0 auto", padding: "28px 24px" }}>
            {/* Top Navigation */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Link
                        to="/admin/batches"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            color: "#64748b",
                            textDecoration: "none",
                            padding: "6px 10px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px"
                        }}
                    >
                        <ArrowLeft size={14} /> Back to Batches
                    </Link>
                    <span style={{ fontSize: "14px", color: "#94a3b8" }}>/</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{batch.name}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                        type="button"
                        onClick={() => fetchBatchData(true)}
                        disabled={refreshing}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 12px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "#475569",
                            cursor: "pointer"
                        }}
                    >
                        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={handleRemindUnstarted}
                        disabled={remindingAll || pending === 0}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 14px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#0f172a",
                            cursor: "pointer"
                        }}
                        title="Send email reminder to all un-started candidates (1-hr throttle)"
                    >
                        {remindingAll ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                        Remind Unstarted ({pending})
                    </button>

                    <button
                        type="button"
                        onClick={() => setEditSettingsModal(true)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 12px",
                            backgroundColor: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "#475569",
                            cursor: "pointer"
                        }}
                    >
                        <Settings size={13} /> Edit Window
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCsv}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 14px",
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 500,
                            cursor: "pointer"
                        }}
                    >
                        <Download size={13} /> Export CSV
                    </button>

                    {batch.status !== "closed" && (
                        <button
                            type="button"
                            onClick={handleCloseBatch}
                            style={{
                                padding: "7px 12px",
                                backgroundColor: "#fef2f2",
                                color: "#991b1b",
                                border: "1px solid #fecaca",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer"
                            }}
                        >
                            Close Batch
                        </button>
                    )}
                </div>
            </div>

            {/* Part 3: Top Email Status Banner */}
            <EmailStatusBanner />

            {/* Batch Info Header Card */}
            <div
                style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    marginBottom: "20px"
                }}
            >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                                {batch.name}
                            </h1>
                            <span
                                style={{
                                    padding: "3px 8px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    backgroundColor: batch.status === "closed" ? "#f1f5f9" : "#dcfce7",
                                    color: batch.status === "closed" ? "#475569" : "#166534"
                                }}
                            >
                                {batch.status}
                            </span>
                        </div>
                        <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
                            Organization: <strong>{batch.organizationName}</strong> • Created {new Date(batch.createdAt).toLocaleDateString()}
                        </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "24px", fontSize: "13px", color: "#475569" }}>
                        <div>
                            <span style={{ color: "#94a3b8" }}>Opens: </span>
                            <strong>{batch.opensAt ? new Date(batch.opensAt).toLocaleString() : "Immediately"}</strong>
                        </div>
                        <div>
                            <span style={{ color: "#94a3b8" }}>Deadline: </span>
                            <strong style={{ color: batch.closesAt ? "#b91c1c" : "#475569" }}>
                                {batch.closesAt ? new Date(batch.closesAt).toLocaleString() : "No Expiration"}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px", marginBottom: "20px" }}>
                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Total Candidates</div>
                    <div style={{ fontSize: "22px", fontWeight: 600, color: "#0f172a" }}>{total}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Invited to round</div>
                </div>

                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Pending Start</div>
                    <div style={{ fontSize: "22px", fontWeight: 600, color: "#2563eb" }}>{pending}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Not yet begun</div>
                </div>

                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>In Progress</div>
                    <div style={{ fontSize: "22px", fontWeight: 600, color: "#d97706" }}>{inProgress}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Active live sessions</div>
                </div>

                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Submitted</div>
                    <div style={{ fontSize: "22px", fontWeight: 600, color: "#16a34a" }}>{completed}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Completed exams</div>
                </div>

                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Average Score</div>
                    <div style={{ fontSize: "22px", fontWeight: 600, color: avgScore !== null ? "#0f172a" : "#94a3b8" }}>
                        {avgScore !== null ? `${avgScore}%` : "—"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>Across evaluated tests</div>
                </div>
            </div>

            {/* Candidate Live Table */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                {/* Search & Filter Bar */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative", width: "320px" }}>
                        <Search size={15} style={{ position: "absolute", left: "10px", color: "#94a3b8" }} />
                        <input
                            type="text"
                            placeholder="Search by name, email, role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "7px 10px 7px 32px",
                                fontSize: "13px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                outline: "none"
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>Status Filter:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                padding: "6px 10px",
                                fontSize: "12px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1"
                            }}
                        >
                            <option value="all">All ({total})</option>
                            <option value="invited">Pending Start ({pending})</option>
                            <option value="in_progress">In Progress ({inProgress})</option>
                            <option value="completed">Submitted ({completed})</option>
                            {failedEmails > 0 && <option value="email_failed">Email Failed ({failedEmails})</option>}
                        </select>
                    </div>
                </div>

                {/* Table Content */}
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569" }}>Candidate</th>
                                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569" }}>Assessment</th>
                                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569" }}>Email Status</th>
                                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569" }}>Exam Progress</th>
                                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569" }}>Score</th>
                                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569" }}>Integrity Flags</th>
                                <th style={{ padding: "12px 16px", fontWeight: 600, color: "#475569", textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                                        No candidates match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map((cand) => {
                                    const hasIntegrityAlert = (
                                        (cand.integrityFlags.tabSwitches > 0) ||
                                        (cand.integrityFlags.fullscreenExits > 0) ||
                                        (cand.integrityFlags.copyPastes > 0)
                                    );

                                    const isCompleted = cand.interviewStatus === "completed" || cand.interviewStatus === "submitted" || cand.interviewStatus === "evaluated";
                                    const isInProgress = cand.interviewStatus === "in-progress";
                                    const isEmailFailed = cand.inviteStatus === "email_failed" || cand.inviteStatus === "failed";
                                    const isEmailed = cand.inviteStatus === "emailed" || cand.inviteStatus === "sent";

                                    return (
                                        <tr key={cand._id || cand.email} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            {/* Candidate Name & Email */}
                                            <td style={{ padding: "12px 16px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{cand.name}</span>
                                                    {cand.userState?.mustChangePassword && (
                                                        <span style={{ fontSize: "10px", padding: "1px 5px", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "4px" }} title="Has not changed temporary password yet">
                                                            New User
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#64748b" }}>{cand.email}</div>
                                            </td>

                                            {/* Assigned Assessment */}
                                            <td style={{ padding: "12px 16px" }}>
                                                <div style={{ color: "#0f172a", fontWeight: 500 }}>{cand.role}</div>
                                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                                    {cand.domain} • {cand.difficulty} • {Math.round((cand.durationSeconds || 1800) / 60)}m
                                                </div>
                                            </td>

                                            {/* Part 3: Email Status Column */}
                                            <td style={{ padding: "12px 16px" }}>
                                                {isEmailFailed ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                                                        <span
                                                            title={cand.emailError || "Email delivery failed"}
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                                padding: "3px 8px",
                                                                borderRadius: "10px",
                                                                fontSize: "11px",
                                                                fontWeight: 600,
                                                                backgroundColor: "#fef2f2",
                                                                color: "#991b1b",
                                                                cursor: "help"
                                                            }}
                                                        >
                                                            <AlertTriangle size={12} /> Failed
                                                        </span>
                                                        <span style={{ fontSize: "11px", color: "#b91c1c", maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={cand.emailError}>
                                                            {cand.emailError || "Delivery rejected"}
                                                        </span>
                                                    </div>
                                                ) : isEmailed ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 500, backgroundColor: "#dcfce7", color: "#166534" }}>
                                                            <CheckCircle2 size={12} /> Emailed
                                                        </span>
                                                        {cand.previewUrl && (
                                                            <a
                                                                href={cand.previewUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{ fontSize: "11px", color: "#2563eb", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "2px" }}
                                                                title="View Ethereal test inbox email"
                                                            >
                                                                View Email <ExternalLink size={10} />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 500, backgroundColor: "#f1f5f9", color: "#475569" }}>
                                                        <Clock size={12} /> Queued
                                                    </span>
                                                )}
                                            </td>

                                            {/* Exam Progress */}
                                            <td style={{ padding: "12px 16px" }}>
                                                {isCompleted ? (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 500, backgroundColor: "#dcfce7", color: "#166534" }}>
                                                        <CheckCircle2 size={12} /> Submitted
                                                    </span>
                                                ) : isInProgress ? (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 500, backgroundColor: "#fef3c7", color: "#92400e" }}>
                                                        <Loader2 size={12} className="animate-spin" /> In Progress
                                                    </span>
                                                ) : (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 500, backgroundColor: "#eff6ff", color: "#1e40af" }}>
                                                        <Mail size={12} /> Invited
                                                    </span>
                                                )}
                                            </td>

                                            {/* Score */}
                                            <td style={{ padding: "12px 16px" }}>
                                                {isCompleted ? (
                                                    cand.score !== null ? (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                            <span style={{ fontWeight: 600, color: "#0f172a" }}>
                                                                {cand.totalScore > 0 ? `${Math.round((cand.score / cand.totalScore) * 100)}%` : cand.score}
                                                            </span>
                                                            <Link
                                                                to={`/results/${cand.interviewId}`}
                                                                style={{ color: "#16a34a", display: "inline-flex", alignItems: "center" }}
                                                                title="View detailed scorecard"
                                                            >
                                                                <ExternalLink size={13} />
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: "#64748b", fontSize: "12px" }}>Grading...</span>
                                                    )
                                                ) : (
                                                    <span style={{ color: "#94a3b8" }}>—</span>
                                                )}
                                            </td>

                                            {/* Integrity / Telemetry */}
                                            <td style={{ padding: "12px 16px" }}>
                                                {hasIntegrityAlert ? (
                                                    <span
                                                        style={{
                                                            padding: "3px 8px",
                                                            borderRadius: "4px",
                                                            backgroundColor: "#fef2f2",
                                                            color: "#991b1b",
                                                            fontSize: "11px",
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {cand.integrityFlags.tabSwitches} tabs, {cand.integrityFlags.copyPastes} pastes
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#16a34a", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                        <Shield size={12} /> Clean
                                                    </span>
                                                )}
                                            </td>

                                            {/* Row Actions */}
                                            <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                                                    {/* Fallback Action: Reset access & copy invite */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResetAndCopyInvite(cand.email)}
                                                        disabled={actionLoading === cand.email}
                                                        style={{
                                                            background: "#ffffff",
                                                            border: "1px solid #cbd5e1",
                                                            borderRadius: "4px",
                                                            padding: "4px 8px",
                                                            fontSize: "11px",
                                                            fontWeight: 500,
                                                            color: "#0f172a",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                            cursor: "pointer"
                                                        }}
                                                        title="Generate new credentials and copy pre-written invite message for WhatsApp / Slack"
                                                    >
                                                        <Copy size={11} /> Copy Invite
                                                    </button>

                                                    {/* Resend email */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResendInvite(cand.email)}
                                                        disabled={actionLoading === cand.email}
                                                        style={{
                                                            background: "none",
                                                            border: "1px solid #cbd5e1",
                                                            borderRadius: "4px",
                                                            padding: "4px 8px",
                                                            fontSize: "11px",
                                                            fontWeight: 500,
                                                            color: "#475569",
                                                            cursor: "pointer"
                                                        }}
                                                        title="Resend invitation or reminder email"
                                                    >
                                                        {isEmailFailed ? "Retry" : "Resend"}
                                                    </button>

                                                    {/* Timeline */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewTimeline(cand)}
                                                        style={{
                                                            background: "none",
                                                            border: "1px solid #cbd5e1",
                                                            borderRadius: "4px",
                                                            padding: "4px 6px",
                                                            fontSize: "11px",
                                                            color: "#64748b",
                                                            cursor: "pointer"
                                                        }}
                                                        title="View candidate timeline"
                                                    >
                                                        <History size={12} />
                                                    </button>

                                                    {/* Extend Deadline */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCandidate(cand);
                                                            setExtendDeadlineModal(true);
                                                        }}
                                                        style={{
                                                            background: "none",
                                                            border: "1px solid #cbd5e1",
                                                            borderRadius: "4px",
                                                            padding: "4px 8px",
                                                            fontSize: "11px",
                                                            fontWeight: 500,
                                                            color: "#475569",
                                                            cursor: "pointer"
                                                        }}
                                                        title="Extend deadline for this candidate"
                                                    >
                                                        Extend
                                                    </button>

                                                    {/* Unassign (only if not started) */}
                                                    {!isInProgress && !isCompleted && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnassignCandidate(cand.email)}
                                                            disabled={actionLoading === cand.email}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                color: "#94a3b8",
                                                                cursor: "pointer",
                                                                padding: "4px"
                                                            }}
                                                            title="Unassign candidate from batch"
                                                        >
                                                            <UserX size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Part 4 Fallback: Reset Access & Copy Invite Modal */}
            {copyInviteModal && copyInviteData && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: "16px"
                    }}
                >
                    <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "26px", maxWidth: "520px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Key size={18} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 600, color: "#0f172a" }}>
                                    Reset Access & Copy Invite
                                </h3>
                                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                                    One-time credential reveal for manual delivery (WhatsApp, Slack, SMS)
                                </p>
                            </div>
                        </div>

                        <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#92400e", marginBottom: "16px" }}>
                            <strong>Security Note:</strong> This temporary password is only displayed once and is never stored in plaintext. Copy the message below now.
                        </div>

                        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "16px", fontSize: "13px" }}>
                            <div style={{ marginBottom: "6px" }}><strong>Candidate:</strong> {copyInviteData.name} ({copyInviteData.email})</div>
                            <div style={{ marginBottom: "6px" }}>
                                <strong>Temporary Password:</strong>{" "}
                                <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 700, backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>
                                    {copyInviteData.tempPassword}
                                </span>
                            </div>
                            <div>
                                <strong>Direct Login Link:</strong>{" "}
                                <a href={copyInviteData.loginUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb", textDecoration: "underline", wordBreak: "break-all" }}>
                                    {copyInviteData.loginUrl}
                                </a>
                            </div>
                        </div>

                        {/* Pre-written message box */}
                        <div style={{ marginBottom: "18px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                                Pre-formatted Invitation Message:
                            </label>
                            <textarea
                                readOnly
                                rows={8}
                                value={copyInviteData.formattedMessage}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    fontSize: "12px",
                                    fontFamily: "monospace",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#f8fafc",
                                    resize: "none"
                                }}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => setCopyInviteModal(false)}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    color: "#475569",
                                    cursor: "pointer"
                                }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCopyText(copyInviteData.formattedMessage)}
                                style={{
                                    padding: "8px 18px",
                                    backgroundColor: copied ? "#15803d" : "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    cursor: "pointer"
                                }}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? "Copied!" : "Copy Invite Message"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Candidate Timeline Drawer / Modal */}
            {timelineModal && timelineData && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: "16px"
                    }}
                >
                    <div style={{ backgroundColor: "#ffffff", borderRadius: "14px", padding: "24px", maxWidth: "500px", width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <History size={18} style={{ color: "#16a34a" }} />
                                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>
                                    Candidate Activity Timeline
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTimelineModal(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ fontSize: "13px", color: "#475569", marginBottom: "16px" }}>
                            <strong>{timelineData.name}</strong> ({timelineData.email})
                        </div>

                        {(!timelineData.timeline || timelineData.timeline.length === 0) ? (
                            <p style={{ color: "#94a3b8", fontSize: "13px" }}>No event history recorded yet.</p>
                        ) : (
                            <div style={{ position: "relative", paddingLeft: "20px", borderLeft: "2px solid #e2e8f0" }}>
                                {timelineData.timeline.map((evt, idx) => (
                                    <div key={idx} style={{ marginBottom: "16px", position: "relative" }}>
                                        <div
                                            style={{
                                                position: "absolute",
                                                left: "-26px",
                                                top: "4px",
                                                width: "10px",
                                                height: "10px",
                                                borderRadius: "50%",
                                                backgroundColor: "#16a34a"
                                            }}
                                        />
                                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a", textTransform: "capitalize" }}>
                                            {evt.event.replace(/_/g, " ")}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#475569", margin: "2px 0" }}>
                                            {evt.details}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                                            {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : ""}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                            <button
                                type="button"
                                onClick={() => setTimelineModal(false)}
                                style={{ padding: "8px 16px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Extend Deadline Modal */}
            {extendDeadlineModal && selectedCandidate && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: "16px"
                    }}
                >
                    <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", maxWidth: "420px", width: "100%" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 10px 0" }}>
                            Extend Exam Window
                        </h3>
                        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                            Extend the submission deadline for <strong>{selectedCandidate.name}</strong> ({selectedCandidate.email}).
                        </p>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                                New Deadline (Closes At)
                            </label>
                            <input
                                type="datetime-local"
                                value={newClosesAt}
                                onChange={(e) => setNewClosesAt(e.target.value)}
                                style={{ width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={() => setExtendDeadlineModal(false)}
                                style={{ padding: "8px 14px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExtendDeadline}
                                style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}
                            >
                                Save Deadline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Batch Settings Modal */}
            {editSettingsModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: "16px"
                    }}
                >
                    <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px", maxWidth: "460px", width: "100%" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 16px 0" }}>
                            Update Batch Window Settings
                        </h3>

                        <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                                Batch Name
                            </label>
                            <input
                                type="text"
                                value={editBatchName}
                                onChange={(e) => setEditBatchName(e.target.value)}
                                style={{ width: "100%", padding: "8px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                                    Opens At
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editOpensAt}
                                    onChange={(e) => setEditOpensAt(e.target.value)}
                                    style={{ width: "100%", padding: "8px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                                    Closes At
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editClosesAt}
                                    onChange={(e) => setEditClosesAt(e.target.value)}
                                    style={{ width: "100%", padding: "8px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                />
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={() => setEditSettingsModal(false)}
                                style={{ padding: "8px 14px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdateBatchSettings}
                                style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
