import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../utils/api";

export default function QuestionBank() {
    const [searchParams] = useSearchParams();
    const initialStatus = searchParams.get("status") || "all";

    // Folders / Roles
    const [roles, setRoles] = useState([]);
    const [dbTotalQuestions, setDbTotalQuestions] = useState(0);
    const [otherQuestionsCount, setOtherQuestionsCount] = useState(0);
    const [selectedRole, setSelectedRole] = useState("all");

    // Questions State (Server-side paginated)
    const [questions, setQuestions] = useState([]);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    // Selected Question for Detail View
    const [selectedQuestion, setSelectedQuestion] = useState(null);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState(initialStatus);
    const [difficultyFilter, setDifficultyFilter] = useState("all");

    // Multi-select rows
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // Toast & Error Notifications
    const [actionToast, setActionToast] = useState("");
    const [errorToast, setErrorToast] = useState("");

    // Modal: New Question
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newText, setNewText] = useState("");
    const [newRole, setNewRole] = useState("Backend Developer");
    const [newDomain, setNewDomain] = useState("Architecture");
    const [newDifficulty, setNewDifficulty] = useState("medium");
    const [newType, setNewType] = useState("technical");
    const [newAssessmentType, setNewAssessmentType] = useState("theory");
    const [newIdealAnswer, setNewIdealAnswer] = useState("");
    const [newKeypoints, setNewKeypoints] = useState(["Core Principles"]);
    const [keypointInput, setKeypointInput] = useState("");
    const [newMaxScore, setNewMaxScore] = useState(10);
    const [newTimeLimit, setNewTimeLimit] = useState(180);
    const [savingNew, setSavingNew] = useState(false);

    // Modal: Edit Question
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editQuestion, setEditQuestion] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);

    // Modal: Delete Confirmation
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // 1. Fetch Roles for folder counts
    const fetchRoles = async () => {
        try {
            const res = await api.get("/roles");
            const list = res.data.roles || [];
            setRoles(list);
            if (res.data.totalQuestions !== undefined) {
                setDbTotalQuestions(res.data.totalQuestions);
            }
            if (res.data.otherCount !== undefined) {
                setOtherQuestionsCount(res.data.otherCount);
            }
            if (list.length > 0 && !newRole) {
                setNewRole(list[0].title);
            }
        } catch (err) {
            console.error("Failed to load roles for question bank:", err);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    // 2. Fetch Questions from server (debounced for search)
    const fetchQuestions = async () => {
        setLoading(true);
        setErrorToast("");
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (selectedRole !== "all") params.append("role", selectedRole);
            if (difficultyFilter !== "all") params.append("difficulty", difficultyFilter);
            if (searchTerm.trim()) params.append("search", searchTerm.trim());
            params.append("page", currentPage);
            params.append("limit", 15);

            const res = await api.get(`/question?${params.toString()}`);
            const data = res.data;

            if (Array.isArray(data)) {
                setQuestions(data);
                setTotalQuestions(data.length);
                setTotalPages(1);
                setSelectedQuestion(data.length > 0 ? data[0] : null);
            } else if (data && Array.isArray(data.questions)) {
                setQuestions(data.questions);
                setTotalQuestions(data.total || 0);
                setTotalPages(data.totalPages || 1);
                const matched = data.questions.find(q => selectedQuestion && q._id === selectedQuestion._id);
                setSelectedQuestion(matched || (data.questions.length > 0 ? data.questions[0] : null));
            } else {
                setQuestions([]);
                setTotalQuestions(0);
                setTotalPages(1);
                setSelectedQuestion(null);
            }
        } catch (err) {
            console.error("Failed to load questions:", err);
            setErrorToast("Failed to fetch questions from server.");
            setSelectedQuestion(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRole = (roleKey) => {
        setSelectedRole(roleKey);
        setCurrentPage(1);
        setSelectedQuestion(null);
        setSelectedIds(new Set());
    };

    const activeFolderCount = useMemo(() => {
        if (selectedRole === "all") {
            return dbTotalQuestions || (roles.reduce((sum, r) => sum + (r.questions || r.questionCount || 0), 0) + otherQuestionsCount);
        }
        if (selectedRole === "other") {
            return otherQuestionsCount;
        }
        const matched = roles.find(r => r.title.toLowerCase() === selectedRole.toLowerCase());
        return matched ? (matched.questions ?? matched.questionCount ?? 0) : 0;
    }, [selectedRole, roles, dbTotalQuestions, otherQuestionsCount]);

    const hasActiveFilters = Boolean(
        searchTerm.trim() || statusFilter !== "all" || difficultyFilter !== "all"
    );

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchQuestions();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, difficultyFilter, selectedRole, currentPage]);

    // Handle Checkbox Selection
    const toggleSelectAll = () => {
        if (selectedIds.size === questions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(questions.map(q => q._id)));
        }
    };

    const toggleSelectRow = (id, e) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // Single Question Actions: Approve / Restore
    const handleApprove = async (question) => {
        const prevStatus = question.status;
        const isRestore = prevStatus === "rejected";
        setQuestions(prev => prev.map(q => q._id === question._id ? { ...q, status: "approved" } : q));
        if (selectedQuestion?._id === question._id) {
            setSelectedQuestion(prev => ({ ...prev, status: "approved" }));
        }

        try {
            await api.patch(`/question/${question._id}/approve`);
            setActionToast(isRestore ? "Question restored and approved." : "Question approved and published.");
            fetchRoles();
        } catch (err) {
            setQuestions(prev => prev.map(q => q._id === question._id ? { ...q, status: prevStatus } : q));
            if (selectedQuestion?._id === question._id) {
                setSelectedQuestion(prev => ({ ...prev, status: prevStatus }));
            }
            setErrorToast(err.response?.data?.message || "Failed to approve question.");
        } finally {
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    // Single Question Actions: Reject / Revoke
    const handleReject = async (question) => {
        const prevStatus = question.status;
        const isRevoke = prevStatus === "approved";
        setQuestions(prev => prev.map(q => q._id === question._id ? { ...q, status: "rejected" } : q));
        if (selectedQuestion?._id === question._id) {
            setSelectedQuestion(prev => ({ ...prev, status: "rejected" }));
        }

        try {
            await api.patch(`/question/${question._id}/rejected`);
            setActionToast(isRevoke ? "Question revoked and rejected." : "Question moved to rejected status.");
            fetchRoles();
        } catch (err) {
            setQuestions(prev => prev.map(q => q._id === question._id ? { ...q, status: prevStatus } : q));
            if (selectedQuestion?._id === question._id) {
                setSelectedQuestion(prev => ({ ...prev, status: prevStatus }));
            }
            setErrorToast(err.response?.data?.message || "Failed to reject question.");
        } finally {
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    // Single Question Actions: Delete
    const handleConfirmDelete = async () => {
        if (!questionToDelete) return;
        setDeleting(true);

        try {
            await api.delete(`/question/${questionToDelete._id}`);
            setActionToast("Question removed from bank.");
            setDeleteModalOpen(false);
            setQuestions(prev => prev.filter(q => q._id !== questionToDelete._id));
            if (selectedQuestion?._id === questionToDelete._id) {
                setSelectedQuestion(null);
            }
            setQuestionToDelete(null);
            fetchRoles();
        } catch (err) {
            setErrorToast(err.response?.data?.message || "Failed to delete question.");
        } finally {
            setDeleting(false);
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    // Bulk Actions: Approve, Reject, Delete (Status-aware: skips questions already in target status)
    const handleBulkApprove = async () => {
        if (selectedIds.size === 0) return;
        setBulkProcessing(true);
        const selectedQuestions = questions.filter(q => selectedIds.has(q._id));
        const alreadyApproved = selectedQuestions.filter(q => q.status === "approved");
        const toProcess = selectedQuestions.filter(q => q.status !== "approved");

        let successCount = 0;
        for (const q of toProcess) {
            try {
                await api.patch(`/question/${q._id}/approve`);
                successCount++;
            } catch (err) {
                console.warn(`Failed to approve ${q._id}`);
            }
        }

        // Optimistically update questions list and selected question immediately
        setQuestions(prev => prev.map(q => selectedIds.has(q._id) ? { ...q, status: "approved" } : q));
        if (selectedQuestion && selectedIds.has(selectedQuestion._id)) {
            setSelectedQuestion(prev => ({ ...prev, status: "approved" }));
        }

        const skippedMsg = alreadyApproved.length > 0 ? ` (${alreadyApproved.length} already approved skipped)` : "";
        setActionToast(`Approved ${successCount} questions${skippedMsg}.`);
        setSelectedIds(new Set());
        setBulkProcessing(false);
        fetchRoles();
        setTimeout(() => setActionToast(""), 4000);
    };

    const handleBulkReject = async () => {
        if (selectedIds.size === 0) return;
        setBulkProcessing(true);
        const selectedQuestions = questions.filter(q => selectedIds.has(q._id));
        const alreadyRejected = selectedQuestions.filter(q => q.status === "rejected");
        const toProcess = selectedQuestions.filter(q => q.status !== "rejected");

        let successCount = 0;
        for (const q of toProcess) {
            try {
                await api.patch(`/question/${q._id}/rejected`);
                successCount++;
            } catch (err) {
                console.warn(`Failed to reject ${q._id}`);
            }
        }

        // Optimistically update questions list and selected question immediately
        setQuestions(prev => prev.map(q => selectedIds.has(q._id) ? { ...q, status: "rejected" } : q));
        if (selectedQuestion && selectedIds.has(selectedQuestion._id)) {
            setSelectedQuestion(prev => ({ ...prev, status: "rejected" }));
        }

        const skippedMsg = alreadyRejected.length > 0 ? ` (${alreadyRejected.length} already rejected skipped)` : "";
        setActionToast(`Rejected ${successCount} questions${skippedMsg}.`);
        setSelectedIds(new Set());
        setBulkProcessing(false);
        fetchRoles();
        setTimeout(() => setActionToast(""), 4000);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Permanently delete ${selectedIds.size} selected questions?`)) return;
        setBulkProcessing(true);
        let successCount = 0;
        for (const id of selectedIds) {
            try {
                await api.delete(`/question/${id}`);
                successCount++;
            } catch (err) {
                console.warn(`Failed to delete ${id}`);
            }
        }
        setActionToast(`Deleted ${successCount} of ${selectedIds.size} questions.`);
        setSelectedIds(new Set());
        setBulkProcessing(false);
        fetchQuestions();
        fetchRoles();
        setTimeout(() => setActionToast(""), 4000);
    };

    // Add Keypoint Chip
    const handleAddKeypoint = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = keypointInput.trim().replace(/^,|,$/g, "");
            if (val && !newKeypoints.includes(val)) {
                setNewKeypoints([...newKeypoints, val]);
            }
            setKeypointInput("");
        }
    };

    const handleRemoveKeypoint = (kp) => {
        setNewKeypoints(newKeypoints.filter(k => k !== kp));
    };

    // Submit New Question Modal
    const handleCreateQuestionSubmit = async (e) => {
        e.preventDefault();
        if (!newText.trim()) return;

        setSavingNew(true);
        setErrorToast("");
        try {
            const payload = {
                questionText: newText.trim(),
                role: newRole,
                domain: newDomain.trim() || newRole,
                difficulty: newDifficulty.toLowerCase(),
                type: newType,
                assessmentType: newAssessmentType,
                idealAnswer: newIdealAnswer.trim() || "Structured answer covering architectural principles and trade-offs.",
                keypoint: newKeypoints.length > 0 ? newKeypoints : ["Core Principles"],
                maxscore: Number(newMaxScore) || 10,
                timeLimit: Number(newTimeLimit) || 180
            };

            const res = await api.post("/question", payload);
            const created = res.data.question;

            setActionToast("New question created successfully.");
            setAddModalOpen(false);
            setNewText("");
            setNewIdealAnswer("");
            setNewKeypoints(["Core Principles"]);
            fetchQuestions();
            fetchRoles();
        } catch (err) {
            setErrorToast(err.response?.data?.message || "Failed to create question.");
        } finally {
            setSavingNew(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    // Open Edit Modal
    const handleOpenEditModal = (q) => {
        setEditQuestion({
            _id: q._id,
            questionText: q.questionText,
            role: q.role,
            domain: q.domain,
            difficulty: q.difficulty,
            type: q.type || "technical",
            assessmentType: q.assessmentType || "theory",
            idealAnswer: q.idealAnswer || "",
            maxscore: q.maxscore || 10,
            timeLimit: q.timeLimit || 180
        });
        setEditModalOpen(true);
    };

    // Submit Edit Modal
    const handleSaveEditSubmit = async (e) => {
        e.preventDefault();
        if (!editQuestion) return;

        setSavingEdit(true);
        setErrorToast("");
        try {
            const res = await api.put(`/question/${editQuestion._id}`, editQuestion);
            const updated = res.data.question || editQuestion;

            setActionToast("Question updated successfully.");
            setEditModalOpen(false);
            setQuestions(prev => prev.map(q => q._id === updated._id ? { ...q, ...updated } : q));
            if (selectedQuestion?._id === updated._id) {
                setSelectedQuestion(prev => ({ ...prev, ...updated }));
            }
        } catch (err) {
            setErrorToast(err.response?.data?.message || "Failed to update question.");
        } finally {
            setSavingEdit(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    return (
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Question bank</span>
            </div>

            {/* Header + New Question CTA */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 className="wf-page-title" style={{ margin: "0 0 4px 0" }}>
                        Question bank repository
                    </h1>
                    <p className="wf-page-subtitle" style={{ margin: 0 }}>
                        Review, calibrate, approve, and curate assessment questions across engineering role curricula.
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <Link to="/admin/ai-tools" className="wf-btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>⚡</span> AI Tools
                    </Link>
                    <button
                        type="button"
                        onClick={() => setAddModalOpen(true)}
                        className="wf-btn-primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                        <span>+</span> New question
                    </button>
                </div>
            </div>

            {actionToast && (
                <div style={{ padding: "12px 18px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
                    ✓ {actionToast}
                </div>
            )}

            {errorToast && (
                <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
                    ⚠ {errorToast}
                </div>
            )}

            {/* Bulk Action Toolbar */}
            {selectedIds.size > 0 && (
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 20px",
                    backgroundColor: "#1e293b",
                    borderRadius: "10px",
                    color: "#ffffff",
                    marginBottom: "16px",
                    animation: "fadeIn 0.15s ease"
                }}>
                    <div style={{ fontSize: "13px", fontWeight: "600" }}>
                        {selectedIds.size} {selectedIds.size === 1 ? "question" : "questions"} selected
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            type="button"
                            disabled={bulkProcessing}
                            onClick={handleBulkApprove}
                            style={{
                                padding: "6px 14px",
                                backgroundColor: "#059669",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Bulk Approve
                        </button>
                        <button
                            type="button"
                            disabled={bulkProcessing}
                            onClick={handleBulkReject}
                            style={{
                                padding: "6px 14px",
                                backgroundColor: "#d97706",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Bulk Reject
                        </button>
                        <button
                            type="button"
                            disabled={bulkProcessing}
                            onClick={handleBulkDelete}
                            style={{
                                padding: "6px 14px",
                                backgroundColor: "#dc2626",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Bulk Delete
                        </button>
                    </div>
                </div>
            )}

            {/* 3-Column Workspace: Left Role Folders, Center Table, Right Detail Panel */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1.4fr 1fr", gap: "20px", alignItems: "start" }}>
                {/* 1. Left Column: Role Folders */}
                <div className="wf-card" style={{ padding: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
                        ROLE CURRICULA
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <button
                            type="button"
                            onClick={() => handleSelectRole("all")}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "none",
                                backgroundColor: selectedRole === "all" ? "#f0f7ff" : "transparent",
                                color: selectedRole === "all" ? "#1e40af" : "#374151",
                                fontWeight: selectedRole === "all" ? "700" : "500",
                                fontSize: "13px",
                                textAlign: "left",
                                cursor: "pointer"
                            }}
                        >
                            <span>📁 All Roles</span>
                            <span style={{ fontSize: "11px", color: "#6b7280", backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "10px" }}>
                                {dbTotalQuestions || (roles.reduce((sum, r) => sum + (r.questions || r.questionCount || 0), 0) + otherQuestionsCount)}
                            </span>
                        </button>

                        {roles.map(r => (
                            <button
                                key={r._id || r.title}
                                type="button"
                                onClick={() => handleSelectRole(r.title)}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "none",
                                    backgroundColor: selectedRole.toLowerCase() === r.title.toLowerCase() ? "#f0f7ff" : "transparent",
                                    color: selectedRole.toLowerCase() === r.title.toLowerCase() ? "#1e40af" : "#374151",
                                    fontWeight: selectedRole.toLowerCase() === r.title.toLowerCase() ? "700" : "500",
                                    fontSize: "13px",
                                    textAlign: "left",
                                    cursor: "pointer"
                                }}
                            >
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "6px" }}>
                                    {r.title}
                                </span>
                                <span style={{ fontSize: "11px", color: "#6b7280", backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "10px" }}>
                                    {r.questions ?? r.questionCount ?? 0}
                                </span>
                            </button>
                        ))}

                        <button
                            type="button"
                            onClick={() => handleSelectRole("other")}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "none",
                                backgroundColor: selectedRole === "other" ? "#f0f7ff" : "transparent",
                                color: selectedRole === "other" ? "#1e40af" : "#374151",
                                fontWeight: selectedRole === "other" ? "700" : "500",
                                fontSize: "13px",
                                textAlign: "left",
                                cursor: "pointer"
                            }}
                        >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "6px" }}>
                                📁 Other / Uncategorized
                            </span>
                            <span style={{ fontSize: "11px", color: "#6b7280", backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "10px" }}>
                                {otherQuestionsCount}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 2. Center Column: Filters & Questions Table */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* Search & Filter Bar */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <input
                            type="text"
                            placeholder="Search questions by text or concept..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="wf-input"
                            style={{ flex: 1, minWidth: "200px" }}
                        />

                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="wf-input"
                            style={{ width: "auto", minWidth: "120px", backgroundColor: "#ffffff" }}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <select
                            value={difficultyFilter}
                            onChange={(e) => { setDifficultyFilter(e.target.value); setCurrentPage(1); }}
                            className="wf-input"
                            style={{ width: "auto", minWidth: "120px", backgroundColor: "#ffffff" }}
                        >
                            <option value="all">All Difficulty</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>

                    {/* Table Card */}
                    <div className="wf-card" style={{ padding: 0, overflow: "hidden" }}>
                        {loading ? (
                            <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                Loading question repository...
                            </div>
                        ) : questions.length === 0 ? (
                            <div style={{ padding: "40px 20px", textAlign: "center" }}>
                                <div style={{ fontSize: "28px", marginBottom: "8px" }}>📋</div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>
                                    No questions found
                                </div>
                                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "14px" }}>
                                    Try adjusting your filters or add a new question to this track.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAddModalOpen(true)}
                                    className="wf-btn-primary"
                                    style={{ fontSize: "12px", padding: "7px 14px" }}
                                >
                                    + Add Question
                                </button>
                            </div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1.5px solid #e5e7eb", backgroundColor: "#f9fafb", textAlign: "left", color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>
                                        <th style={{ padding: "10px 14px", width: "36px" }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === questions.length && questions.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th style={{ padding: "10px 12px" }}>Question</th>
                                        <th style={{ padding: "10px 12px" }}>Domain</th>
                                        <th style={{ padding: "10px 12px" }}>Difficulty</th>
                                        <th style={{ padding: "10px 12px" }}>Status</th>
                                        <th style={{ padding: "10px 12px" }}>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {questions.map(q => {
                                        const isSelected = selectedQuestion?._id === q._id;
                                        const isChecked = selectedIds.has(q._id);
                                        const status = (q.status || "approved").toLowerCase();

                                        return (
                                            <tr
                                                key={q._id}
                                                onClick={() => setSelectedQuestion(q)}
                                                style={{
                                                    borderBottom: "1px solid #f3f4f6",
                                                    cursor: "pointer",
                                                    backgroundColor: isSelected ? "#f0f7ff" : isChecked ? "#fefce8" : "#ffffff",
                                                    transition: "background-color 0.1s ease"
                                                }}
                                            >
                                                <td style={{ padding: "10px 14px" }} onClick={(e) => toggleSelectRow(q._id, e)}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => toggleSelectRow(q._id, e)}
                                                    />
                                                </td>
                                                <td style={{ padding: "10px 12px", maxWidth: "260px" }}>
                                                    <div style={{
                                                        fontWeight: "600",
                                                        color: "#111827",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap"
                                                    }}>
                                                        {q.questionText}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "10px 12px", color: "#4b5563", fontSize: "12px" }}>
                                                    {q.domain}
                                                </td>
                                                <td style={{ padding: "10px 12px" }}>
                                                    <span style={{
                                                        fontSize: "11px",
                                                        fontWeight: "600",
                                                        color: q.difficulty === "hard" ? "#991b1b" : q.difficulty === "medium" ? "#92400e" : "#065f46"
                                                    }}>
                                                        {(q.difficulty || "medium").toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "10px 12px" }}>
                                                    <span style={{
                                                        padding: "3px 8px",
                                                        borderRadius: "4px",
                                                        fontSize: "11px",
                                                        fontWeight: "700",
                                                        backgroundColor: status === "approved" ? "#ecfdf5" : status === "pending" ? "#fef3c7" : "#fee2e2",
                                                        color: status === "approved" ? "#065f46" : status === "pending" ? "#92400e" : "#991b1b"
                                                    }}>
                                                        {status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: "12px" }}>
                                                    {q.assessmentType || (q.type === "coding" ? "Coding" : "Theory")}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        {/* Pagination footer */}
                        {!loading && questions.length > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid #e5e7eb", fontSize: "12px", color: "#6b7280" }}>
                                <div>
                                    {hasActiveFilters
                                        ? `Showing ${totalQuestions} of ${activeFolderCount} questions`
                                        : `${totalQuestions} questions`}
                                </div>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                    <button
                                        type="button"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        className="wf-btn-outline"
                                        style={{ padding: "3px 8px", fontSize: "11px", opacity: currentPage === 1 ? 0.5 : 1 }}
                                    >
                                        Prev
                                    </button>
                                    <span style={{ fontWeight: "700", color: "#111827" }}>
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        className="wf-btn-outline"
                                        style={{ padding: "3px 8px", fontSize: "11px", opacity: currentPage === totalPages ? 0.5 : 1 }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Right Column: Detailed Question Panel */}
                <div className="wf-card" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
                        QUESTION INSPECTION
                    </div>

                    {!selectedQuestion ? (
                        <div style={{ padding: "40px 16px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔍</div>
                            <div style={{ fontWeight: "600", color: "#4b5563", marginBottom: "4px" }}>
                                Select a question to inspect
                            </div>
                            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                                Choose any question from the catalog list to inspect its ideal answer, scoring rubric, and validation actions.
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Title & Status */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                <span style={{
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    backgroundColor: selectedQuestion.status === "approved" ? "#ecfdf5" : selectedQuestion.status === "pending" ? "#fef3c7" : "#fee2e2",
                                    color: selectedQuestion.status === "approved" ? "#065f46" : selectedQuestion.status === "pending" ? "#92400e" : "#991b1b"
                                }}>
                                    {(selectedQuestion.status || "approved").toUpperCase()}
                                </span>

                                {selectedQuestion.isAIGenerated && (
                                    <span style={{ fontSize: "11px", backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                                        ✨ AI Calibrated
                                    </span>
                                )}
                            </div>

                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", lineHeight: "1.4", margin: "0 0 16px 0" }}>
                                {selectedQuestion.questionText}
                            </h3>

                            {/* Attributes Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px", fontSize: "12px" }}>
                                <div style={{ padding: "8px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
                                    <div style={{ color: "#6b7280", marginBottom: "2px" }}>Role Track</div>
                                    <div style={{ fontWeight: "600", color: "#111827" }}>{selectedQuestion.role}</div>
                                </div>
                                <div style={{ padding: "8px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
                                    <div style={{ color: "#6b7280", marginBottom: "2px" }}>Domain</div>
                                    <div style={{ fontWeight: "600", color: "#111827" }}>{selectedQuestion.domain}</div>
                                </div>
                                <div style={{ padding: "8px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
                                    <div style={{ color: "#6b7280", marginBottom: "2px" }}>Format</div>
                                    <div style={{ fontWeight: "600", color: "#111827" }}>{selectedQuestion.assessmentType || "Theory"}</div>
                                </div>
                                <div style={{ padding: "8px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
                                    <div style={{ color: "#6b7280", marginBottom: "2px" }}>Time Limit</div>
                                    <div style={{ fontWeight: "600", color: "#111827" }}>{selectedQuestion.timeLimit || 180}s ({selectedQuestion.maxscore || 10} pts)</div>
                                </div>
                            </div>

                            {/* Key Points Chips */}
                            {selectedQuestion.keypoint && selectedQuestion.keypoint.length > 0 && (
                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", marginBottom: "6px", textTransform: "uppercase" }}>
                                        Expected Key Points
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                        {selectedQuestion.keypoint.map((kp, idx) => (
                                            <span key={idx} style={{ backgroundColor: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                                • {kp}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ideal Reference Answer */}
                            <div style={{ marginBottom: "20px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", marginBottom: "6px", textTransform: "uppercase" }}>
                                    Ideal Reference Answer
                                </div>
                                <div style={{
                                    fontSize: "12px",
                                    lineHeight: "1.5",
                                    color: "#374151",
                                    backgroundColor: "#f9fafb",
                                    padding: "10px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #f3f4f6",
                                    maxHeight: "140px",
                                    overflowY: "auto"
                                }}>
                                    {selectedQuestion.idealAnswer || "No ideal answer provided."}
                                </div>
                            </div>

                            {/* Action Buttons: Status-aware Approve, Reject, Edit, Delete */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {(!selectedQuestion.status || selectedQuestion.status === "pending") && (
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            type="button"
                                            onClick={() => handleApprove(selectedQuestion)}
                                            style={{
                                                flex: 1,
                                                padding: "8px",
                                                backgroundColor: "#059669",
                                                color: "#ffffff",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                cursor: "pointer"
                                            }}
                                        >
                                            ✓ Approve
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReject(selectedQuestion)}
                                            style={{
                                                flex: 1,
                                                padding: "8px",
                                                backgroundColor: "#d97706",
                                                color: "#ffffff",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                cursor: "pointer"
                                            }}
                                        >
                                            ✕ Reject
                                        </button>
                                    </div>
                                )}

                                {selectedQuestion.status === "approved" && (
                                    <button
                                        type="button"
                                        onClick={() => handleReject(selectedQuestion)}
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            backgroundColor: "#fffbeb",
                                            color: "#b45309",
                                            border: "1px solid #fde68a",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        ✕ Revoke / Reject
                                    </button>
                                )}

                                {selectedQuestion.status === "rejected" && (
                                    <button
                                        type="button"
                                        onClick={() => handleApprove(selectedQuestion)}
                                        style={{
                                            width: "100%",
                                            padding: "8px",
                                            backgroundColor: "#ecfdf5",
                                            color: "#065f46",
                                            border: "1px solid #a7f3d0",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        ✓ Restore & approve
                                    </button>
                                )}

                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(selectedQuestion)}
                                        className="wf-btn-outline"
                                        style={{ flex: 1, padding: "7px", fontSize: "12px" }}
                                    >
                                        Edit Details
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQuestionToDelete(selectedQuestion);
                                            setDeleteModalOpen(true);
                                        }}
                                        style={{
                                            padding: "7px 12px",
                                            backgroundColor: "#fef2f2",
                                            color: "#dc2626",
                                            border: "1px solid #fecaca",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal 1: New Question */}
            {addModalOpen && (
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
                    <div className="wf-card" style={{ width: "560px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
                                Add New Question to Bank
                            </h2>
                            <button
                                type="button"
                                onClick={() => setAddModalOpen(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", color: "#9ca3af", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateQuestionSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Question Text</label>
                                <textarea
                                    value={newText}
                                    onChange={(e) => setNewText(e.target.value)}
                                    placeholder="Enter full question formulation..."
                                    rows={3}
                                    className="wf-input"
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div>
                                    <label className="wf-form-label">Role Track</label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        {roles.map(r => (
                                            <option key={r._id || r.title} value={r.title}>{r.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="wf-form-label">Domain / Topic</label>
                                    <input
                                        type="text"
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        placeholder="e.g. Memory Management"
                                        className="wf-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div>
                                    <label className="wf-form-label">Difficulty</label>
                                    <select
                                        value={newDifficulty}
                                        onChange={(e) => setNewDifficulty(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="wf-form-label">Assessment Format</label>
                                    <select
                                        value={newAssessmentType}
                                        onChange={(e) => setNewAssessmentType(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="theory">Theory</option>
                                        <option value="coding">Coding</option>
                                        <option value="mixed">Mixed</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Key Points Tag Input (Press Enter or comma to add)</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {newKeypoints.map((kp, idx) => (
                                        <span key={idx} style={{ backgroundColor: "#e2e8f0", color: "#1e293b", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                            {kp}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveKeypoint(kp)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={keypointInput}
                                    onChange={(e) => setKeypointInput(e.target.value)}
                                    onKeyDown={handleAddKeypoint}
                                    placeholder="Add key concept and press Enter..."
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Ideal Reference Answer</label>
                                <textarea
                                    value={newIdealAnswer}
                                    onChange={(e) => setNewIdealAnswer(e.target.value)}
                                    placeholder="Explanation against which AI evaluation grades the candidate..."
                                    rows={3}
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                                <div>
                                    <label className="wf-form-label">Max Score</label>
                                    <input
                                        type="number"
                                        value={newMaxScore}
                                        onChange={(e) => setNewMaxScore(e.target.value)}
                                        className="wf-input"
                                    />
                                </div>
                                <div>
                                    <label className="wf-form-label">Time Limit (Seconds)</label>
                                    <input
                                        type="number"
                                        value={newTimeLimit}
                                        onChange={(e) => setNewTimeLimit(e.target.value)}
                                        className="wf-input"
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setAddModalOpen(false)}
                                    className="wf-btn-outline"
                                    style={{ padding: "8px 16px" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingNew}
                                    className="wf-btn-primary"
                                    style={{ padding: "8px 20px" }}
                                >
                                    {savingNew ? "Saving..." : "Add to Bank"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Edit Question */}
            {editModalOpen && editQuestion && (
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
                    <div className="wf-card" style={{ width: "540px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
                                Edit Question Details
                            </h2>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", color: "#9ca3af", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Question Text</label>
                                <textarea
                                    value={editQuestion.questionText}
                                    onChange={(e) => setEditQuestion({ ...editQuestion, questionText: e.target.value })}
                                    rows={3}
                                    className="wf-input"
                                    required
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div>
                                    <label className="wf-form-label">Domain</label>
                                    <input
                                        type="text"
                                        value={editQuestion.domain}
                                        onChange={(e) => setEditQuestion({ ...editQuestion, domain: e.target.value })}
                                        className="wf-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="wf-form-label">Difficulty</label>
                                    <select
                                        value={editQuestion.difficulty}
                                        onChange={(e) => setEditQuestion({ ...editQuestion, difficulty: e.target.value })}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Ideal Reference Answer</label>
                                <textarea
                                    value={editQuestion.idealAnswer}
                                    onChange={(e) => setEditQuestion({ ...editQuestion, idealAnswer: e.target.value })}
                                    rows={3}
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="wf-btn-outline"
                                    style={{ padding: "8px 16px" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="wf-btn-primary"
                                    style={{ padding: "8px 20px" }}
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 3: Confirm Delete Question */}
            {deleteModalOpen && questionToDelete && (
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
                            Delete Question?
                        </h2>
                        <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                            Are you sure you want to permanently remove this question from the repository?
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
