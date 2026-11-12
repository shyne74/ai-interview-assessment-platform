import { useState, useEffect } from "react";
import api from "../utils/api";

export default function QuestionBank() {
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionToast, setActionToast] = useState("");
    const [errorToast, setErrorToast] = useState("");
    const [processing, setProcessing] = useState(false);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // "all" | "approved" | "pending" | "rejected"
    const [difficultyFilter, setDifficultyFilter] = useState("all");

    // Add Question Modal state
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newQuestionText, setNewQuestionText] = useState("");
    const [newRole, setNewRole] = useState("Backend Developer");
    const [newDomain, setNewDomain] = useState("Architecture");
    const [newDifficulty, setNewDifficulty] = useState("medium");
    const [newType, setNewType] = useState("theory");
    const [newIdealAnswer, setNewIdealAnswer] = useState("");
    const [addingQuestion, setAddingQuestion] = useState(false);

    // Edit Question Modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editQuestionText, setEditQuestionText] = useState("");
    const [editDomain, setEditDomain] = useState("");
    const [editDifficulty, setEditDifficulty] = useState("medium");
    const [editIdealAnswer, setEditIdealAnswer] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    // Fetch folder summary and questions on mount
    const loadBankData = async () => {
        try {
            setLoading(true);
            const [summaryRes, questionsRes] = await Promise.all([
                api.get("/question/folders/summary"),
                api.get("/question")
            ]);

            const rawFolders = summaryRes.data.folders || [];
            const allQuestions = Array.isArray(questionsRes.data) ? questionsRes.data : questionsRes.data.questions || [];

            const mappedFolders = rawFolders.map((f, idx) => {
                const pending = f.pendingCount || 0;
                const statusText = pending > 0 ? `${pending} need review` : "All valid";
                const badgeColor = pending > 0 ? "#fef3c7" : "#ecfdf5";
                const textColor = pending > 0 ? "#b45309" : "#059669";
                return {
                    id: `folder-${idx}`,
                    role: f.role,
                    name: f.role,
                    count: `${f.totalQuestions || 0} questions`,
                    detail: `${f.theoryCount || 0} theory · ${f.codingCount || 0} coding`,
                    status: statusText,
                    badgeColor,
                    textColor,
                    pendingCount: pending
                };
            });

            setFolders(mappedFolders);
            if (mappedFolders.length > 0 && !selectedFolder) {
                setSelectedFolder(mappedFolders[0]);
            }

            // Map all questions
            const mappedQuestions = allQuestions.map((q) => {
                let validation = "Valid";
                if (q.status === "pending") validation = "Needs review";
                else if (q.status === "rejected") validation = "Invalid";

                return {
                    id: q._id,
                    _id: q._id,
                    title: q.questionText || "Untitled question",
                    domain: `${q.role || "General"} · ${q.domain || "Theory"}`,
                    domainOnly: q.domain || "General",
                    role: q.role || "General",
                    difficulty: q.difficulty ? (q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1).toLowerCase()) : "Medium",
                    status: q.status || "approved",
                    validation,
                    idealAnswer: q.idealAnswer || "Ideal answer structured for accurate grading.",
                    keyPoints: q.keyPoints || ["Core concept explanation", "Performance trade-offs", "Edge case coverage"],
                    maxScore: 10,
                    timeLimit: q.timeLimit || 180,
                    type: q.assessmentType || (q.type === "coding" ? "Coding" : "Theory"),
                    raw: q
                };
            });

            setQuestions(mappedQuestions);
            if (mappedQuestions.length > 0 && !selectedQuestion) {
                setSelectedQuestion(mappedQuestions[0]);
            }
        } catch (err) {
            console.error("Failed to load question bank:", err);
            setErrorToast("Failed to fetch questions from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBankData();
    }, []);

    // Filter questions by selected folder, search term, status, and difficulty
    const filteredQuestions = questions.filter((q) => {
        // Folder filter
        if (selectedFolder && selectedFolder.role !== "All" && selectedFolder.role) {
            if (q.role.toLowerCase() !== selectedFolder.role.toLowerCase()) return false;
        }

        // Search term
        if (searchTerm.trim()) {
            const s = searchTerm.toLowerCase();
            const matchesText = q.title.toLowerCase().includes(s);
            const matchesDomain = q.domain.toLowerCase().includes(s);
            const matchesRole = q.role.toLowerCase().includes(s);
            if (!matchesText && !matchesDomain && !matchesRole) return false;
        }

        // Status filter
        if (statusFilter !== "all") {
            if (statusFilter === "approved" && q.status !== "approved") return false;
            if (statusFilter === "pending" && q.status !== "pending") return false;
            if (statusFilter === "rejected" && q.status !== "rejected") return false;
        }

        // Difficulty filter
        if (difficultyFilter !== "all") {
            if (q.difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) return false;
        }

        return true;
    });

    const handleApprove = async () => {
        if (!selectedQuestion) return;
        setProcessing(true);
        setErrorToast("");
        try {
            await api.patch(`/question/${selectedQuestion.id}/approve`);
            setActionToast(`Question approved and published to bank.`);
            setQuestions((prev) =>
                prev.map((q) => (q.id === selectedQuestion.id ? { ...q, validation: "Valid", status: "approved" } : q))
            );
            setSelectedQuestion((prev) => ({ ...prev, validation: "Valid", status: "approved" }));
        } catch (err) {
            console.error("Failed to approve:", err);
            setErrorToast(`Error: ${err.response?.data?.message || err.message}`);
        } finally {
            setProcessing(false);
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    const handleReject = async () => {
        if (!selectedQuestion) return;
        setProcessing(true);
        setErrorToast("");
        try {
            await api.patch(`/question/${selectedQuestion.id}/rejected`);
            setActionToast(`Question flagged as rejected.`);
            setQuestions((prev) =>
                prev.map((q) => (q.id === selectedQuestion.id ? { ...q, validation: "Invalid", status: "rejected" } : q))
            );
            setSelectedQuestion((prev) => ({ ...prev, validation: "Invalid", status: "rejected" }));
        } catch (err) {
            console.error("Failed to reject:", err);
            setErrorToast(`Error: ${err.response?.data?.message || err.message}`);
        } finally {
            setProcessing(false);
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm("Are you sure you want to permanently delete this question?")) {
            return;
        }

        try {
            await api.delete(`/question/${qId}`);
            setActionToast("Question deleted from bank.");
            const remaining = questions.filter(q => q.id !== qId);
            setQuestions(remaining);
            if (selectedQuestion && selectedQuestion.id === qId) {
                setSelectedQuestion(remaining.length > 0 ? remaining[0] : null);
            }
        } catch (err) {
            console.error("Delete question error:", err);
            setErrorToast(err.response?.data?.message || "Failed to delete question.");
        } finally {
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    const handleAddQuestionSubmit = async (e) => {
        e.preventDefault();
        if (!newQuestionText.trim() || !newIdealAnswer.trim()) {
            setErrorToast("Question text and ideal answer are required.");
            return;
        }

        setAddingQuestion(true);
        setErrorToast("");
        setActionToast("");

        try {
            const payload = {
                questionText: newQuestionText.trim(),
                role: newRole,
                domain: newDomain.trim() || "General",
                difficulty: newDifficulty.toLowerCase(),
                assessmentType: newType,
                type: newType === "coding" ? "coding" : "technical",
                idealAnswer: newIdealAnswer.trim(),
                status: "approved"
            };

            const res = await api.post("/question", payload);
            const created = res.data.question;

            const mappedNew = {
                id: created._id,
                _id: created._id,
                title: created.questionText,
                domain: `${created.role} · ${created.domain}`,
                domainOnly: created.domain,
                role: created.role,
                difficulty: created.difficulty.charAt(0).toUpperCase() + created.difficulty.slice(1).toLowerCase(),
                status: "approved",
                validation: "Valid",
                idealAnswer: created.idealAnswer,
                keyPoints: ["Core concept explanation", "Performance trade-offs", "Edge case coverage"],
                maxScore: 10,
                timeLimit: 180,
                type: created.assessmentType || "Theory",
                raw: created
            };

            setQuestions([mappedNew, ...questions]);
            setSelectedQuestion(mappedNew);
            setAddModalOpen(false);
            setNewQuestionText("");
            setNewIdealAnswer("");
            setActionToast("New question added to bank successfully.");
        } catch (err) {
            console.error("Add question error:", err);
            setErrorToast(err.response?.data?.message || "Failed to create question.");
        } finally {
            setAddingQuestion(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    const handleOpenEditModal = (q) => {
        setSelectedQuestion(q);
        setEditQuestionText(q.title);
        setEditDomain(q.domainOnly || "General");
        setEditDifficulty(q.difficulty.toLowerCase());
        setEditIdealAnswer(q.idealAnswer);
        setEditModalOpen(true);
    };

    const handleEditQuestionSubmit = async (e) => {
        e.preventDefault();
        if (!selectedQuestion) return;

        setSavingEdit(true);
        setErrorToast("");

        try {
            const payload = {
                questionText: editQuestionText.trim(),
                domain: editDomain.trim(),
                difficulty: editDifficulty,
                idealAnswer: editIdealAnswer.trim()
            };

            const res = await api.put(`/question/${selectedQuestion.id}`, payload);
            const updated = res.data.question;

            const updatedMapped = {
                ...selectedQuestion,
                title: updated.questionText,
                domain: `${updated.role} · ${updated.domain}`,
                domainOnly: updated.domain,
                difficulty: updated.difficulty.charAt(0).toUpperCase() + updated.difficulty.slice(1).toLowerCase(),
                idealAnswer: updated.idealAnswer
            };

            setQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? updatedMapped : q));
            setSelectedQuestion(updatedMapped);
            setEditModalOpen(false);
            setActionToast("Question updated successfully.");
        } catch (err) {
            console.error("Edit question error:", err);
            setErrorToast(err.response?.data?.message || "Failed to update question.");
        } finally {
            setSavingEdit(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    const getDifficultyPill = (diff) => {
        if (diff.toLowerCase() === "easy") return "wf-pill wf-pill-green";
        if (diff.toLowerCase() === "hard" || diff.toLowerCase() === "expert") return "wf-pill wf-pill-red";
        return "wf-pill wf-pill-yellow";
    };

    return (
        <div>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Question bank</span>
            </div>

            {/* Header + Add Question Action */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                    <h1 className="wf-page-title" style={{ margin: "0 0 6px 0" }}>
                        Question bank & validation
                    </h1>
                    <p className="wf-page-subtitle" style={{ margin: 0 }}>
                        Review, validate, approve, edit, and organize assessment questions across engineering tracks.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setNewRole(selectedFolder?.role || "Backend Developer");
                        setAddModalOpen(true);
                    }}
                    className="wf-btn-primary"
                >
                    + Add question
                </button>
            </div>

            {/* Notifications */}
            {actionToast && (
                <div style={{ padding: "10px 16px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ✓ {actionToast}
                </div>
            )}
            {errorToast && (
                <div style={{ padding: "10px 16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ⚠ {errorToast}
                </div>
            )}

            {/* Search & Filter Toolbar */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                <input
                    type="text"
                    placeholder="Search question text or domain..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="wf-input"
                    style={{ maxWidth: "320px" }}
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="wf-input"
                    style={{ maxWidth: "160px", backgroundColor: "#ffffff" }}
                >
                    <option value="all">All validation states</option>
                    <option value="approved">Valid (Approved)</option>
                    <option value="pending">Needs review (Pending)</option>
                    <option value="rejected">Invalid (Rejected)</option>
                </select>

                <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="wf-input"
                    style={{ maxWidth: "150px", backgroundColor: "#ffffff" }}
                >
                    <option value="all">All difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>

                <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "auto" }}>
                    Showing {filteredQuestions.length} of {questions.length} questions
                </span>
            </div>

            {/* 3-Column Layout: Folders | Questions Table | Inspector Panel */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1.4fr 1.1fr", gap: "20px", alignItems: "start" }}>
                {/* Column 1: Role Folders */}
                <div className="wf-card" style={{ padding: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
                        Role Tracks
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {loading ? (
                            <div style={{ fontSize: "12px", color: "#6b7280", padding: "10px" }}>Loading folders...</div>
                        ) : (
                            folders.map((folder) => {
                                const isSelected = selectedFolder && selectedFolder.role === folder.role;
                                return (
                                    <div
                                        key={folder.id}
                                        onClick={() => setSelectedFolder(folder)}
                                        style={{
                                            padding: "10px 12px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            backgroundColor: isSelected ? "#f3f4f6" : "transparent",
                                            borderLeft: isSelected ? "3px solid #111827" : "3px solid transparent"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                                            <span style={{ fontSize: "13px", fontWeight: isSelected ? "700" : "600", color: "#111827" }}>
                                                {folder.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "10px",
                                                    fontWeight: "600",
                                                    padding: "1px 6px",
                                                    borderRadius: "4px",
                                                    backgroundColor: folder.badgeColor,
                                                    color: folder.textColor
                                                }}
                                            >
                                                {folder.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#6b7280" }}>
                                            {folder.count} · {folder.detail}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Column 2: Questions Table */}
                <div className="wf-card" style={{ padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
                        <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: 0 }}>
                            {selectedFolder ? `${selectedFolder.name} questions` : "Questions"}
                        </h2>
                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            {filteredQuestions.length} questions
                        </span>
                    </div>

                    <div style={{ overflowX: "auto", maxHeight: "600px", overflowY: "auto" }}>
                        <table className="wf-table" style={{ fontSize: "12px" }}>
                            <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>Difficulty</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQuestions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
                                            No questions found matching criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredQuestions.map((q) => {
                                        const isSelected = selectedQuestion && selectedQuestion.id === q.id;
                                        return (
                                            <tr
                                                key={q.id}
                                                onClick={() => setSelectedQuestion(q)}
                                                style={{
                                                    cursor: "pointer",
                                                    backgroundColor: isSelected ? "#f8fafc" : "transparent"
                                                }}
                                            >
                                                <td style={{ maxWidth: "260px" }}>
                                                    <div style={{ fontWeight: "600", color: "#111827", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {q.title}
                                                    </div>
                                                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                                                        {q.domain}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={getDifficultyPill(q.difficulty)}>
                                                        {q.difficulty}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={q.validation === "Valid" ? "wf-pill wf-pill-green" : q.validation === "Needs review" ? "wf-pill wf-pill-yellow" : "wf-pill wf-pill-red"}
                                                    >
                                                        {q.validation}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", gap: "6px" }}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEditModal(q);
                                                            }}
                                                            style={{ border: "none", backgroundColor: "transparent", color: "#2563eb", cursor: "pointer", fontSize: "11px" }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteQuestion(q.id);
                                                            }}
                                                            style={{ border: "none", backgroundColor: "transparent", color: "#dc2626", cursor: "pointer", fontSize: "11px" }}
                                                        >
                                                            Delete
                                                        </button>
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

                {/* Column 3: Inspector Panel */}
                <div className="wf-card" style={{ padding: "18px" }}>
                    {selectedQuestion ? (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                    INSPECTOR
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(selectedQuestion)}
                                    className="wf-btn-outline"
                                    style={{ padding: "2px 8px", fontSize: "11px" }}
                                >
                                    Edit
                                </button>
                            </div>

                            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginBottom: "12px", lineHeight: 1.4 }}>
                                {selectedQuestion.title}
                            </h3>

                            {/* Metadata Key-Values */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", borderTop: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", padding: "10px 0", marginBottom: "14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#6b7280" }}>Track & Domain</span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>{selectedQuestion.domain}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#6b7280" }}>Type</span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>{selectedQuestion.type}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#6b7280" }}>Ideal answer</span>
                                    <span style={{ fontWeight: "600", color: "#111827" }}>Present</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#6b7280" }}>Status</span>
                                    <span style={{ fontWeight: "600", color: selectedQuestion.validation === "Valid" ? "#059669" : "#d97706" }}>
                                        {selectedQuestion.validation}
                                    </span>
                                </div>
                            </div>

                            {/* Ideal Answer Preview */}
                            <div style={{ marginBottom: "18px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", marginBottom: "4px" }}>
                                    Benchmark ideal answer
                                </div>
                                <div style={{ fontSize: "12px", color: "#374151", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px", lineHeight: 1.4, maxHeight: "150px", overflowY: "auto" }}>
                                    {selectedQuestion.idealAnswer}
                                </div>
                            </div>

                            {/* Actions: Approve / Reject */}
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    disabled={processing || selectedQuestion.validation === "Valid"}
                                    className="wf-btn-green"
                                    style={{ flex: 1, justifyContent: "center", padding: "6px", cursor: processing ? "not-allowed" : "pointer" }}
                                >
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReject}
                                    disabled={processing || selectedQuestion.validation === "Invalid"}
                                    className="wf-btn-danger"
                                    style={{ padding: "6px 12px", cursor: processing ? "not-allowed" : "pointer" }}
                                >
                                    Reject
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: "20px", textAlign: "center", color: "#6b7280", fontSize: "12px" }}>
                            Select a question to inspect details.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Add New Question */}
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
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div className="wf-card" style={{ maxWidth: "540px", width: "100%", padding: "24px", maxHeight: "90vh", overflowY: "auto" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>
                            Add Assessment Question
                        </h2>
                        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
                            Create a custom validated technical question and add it directly to the question bank.
                        </p>

                        <form onSubmit={handleAddQuestionSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Question Text</label>
                                <textarea
                                    placeholder="e.g. Explain how database indexing works under the hood and when a composite index is preferred."
                                    value={newQuestionText}
                                    onChange={(e) => setNewQuestionText(e.target.value)}
                                    required
                                    className="wf-textarea"
                                    style={{ minHeight: "80px" }}
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
                                        <option>Backend Developer</option>
                                        <option>Frontend Developer</option>
                                        <option>Full Stack Developer</option>
                                        <option>AI/ML Engineer</option>
                                        <option>System Architect</option>
                                        <option>DevOps Engineer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="wf-form-label">Domain Topic</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Database Indexing"
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        required
                                        className="wf-input"
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
                                    <label className="wf-form-label">Format</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="theory">Theory / Concepts</option>
                                        <option value="coding">Coding Challenge</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label className="wf-form-label">Benchmark Ideal Answer</label>
                                <textarea
                                    placeholder="Provide a comprehensive answer against which AI will grade candidate submissions."
                                    value={newIdealAnswer}
                                    onChange={(e) => setNewIdealAnswer(e.target.value)}
                                    required
                                    className="wf-textarea"
                                    style={{ minHeight: "100px" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setAddModalOpen(false)}
                                    disabled={addingQuestion}
                                    className="wf-btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingQuestion}
                                    className="wf-btn-primary"
                                    style={{ cursor: addingQuestion ? "not-allowed" : "pointer" }}
                                >
                                    {addingQuestion ? "Adding..." : "Add to Question Bank"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Question */}
            {editModalOpen && (
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
                    <div className="wf-card" style={{ maxWidth: "540px", width: "100%", padding: "24px", maxHeight: "90vh", overflowY: "auto" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>
                            Edit Question
                        </h2>
                        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
                            Modify the question statement, target domain, or grading benchmark.
                        </p>

                        <form onSubmit={handleEditQuestionSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Question Text</label>
                                <textarea
                                    value={editQuestionText}
                                    onChange={(e) => setEditQuestionText(e.target.value)}
                                    required
                                    className="wf-textarea"
                                    style={{ minHeight: "80px" }}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                                <div>
                                    <label className="wf-form-label">Domain Topic</label>
                                    <input
                                        type="text"
                                        value={editDomain}
                                        onChange={(e) => setEditDomain(e.target.value)}
                                        required
                                        className="wf-input"
                                    />
                                </div>
                                <div>
                                    <label className="wf-form-label">Difficulty</label>
                                    <select
                                        value={editDifficulty}
                                        onChange={(e) => setEditDifficulty(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label className="wf-form-label">Benchmark Ideal Answer</label>
                                <textarea
                                    value={editIdealAnswer}
                                    onChange={(e) => setEditIdealAnswer(e.target.value)}
                                    required
                                    className="wf-textarea"
                                    style={{ minHeight: "100px" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    disabled={savingEdit}
                                    className="wf-btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="wf-btn-green"
                                    style={{ cursor: savingEdit ? "not-allowed" : "pointer" }}
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
