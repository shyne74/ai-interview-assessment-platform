import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
    BookOpenIcon,
    PlusIcon,
    EditIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    SearchIcon,
    SparklesIcon,
    CheckIcon,
    LayersIcon,
    CodeIcon,
    FileTextIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    ZapIcon
} from "../components/icons";
import Toast from "../components/Toast";
import { canonicalRole, canonicalDomain, ROLES, ROLE_DOMAINS } from "../config/taxonomy";


function QuestionBank() {
    const location = useLocation();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [launchingTest, setLaunchingTest] = useState(false);
    const [consolidating, setConsolidating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [toast, setToast] = useState({
        show: false,
        message: "",
        type: "info"
    });

    // Navigation & Folder State
    const [viewMode, setViewMode] = useState("folders"); // "folders" | "flat"
    const [activeRoleFolder, setActiveRoleFolder] = useState(
        location.state?.activeRole ? canonicalRole(location.state.activeRole) : null
    );
    const [activeDomainFolder, setActiveDomainFolder] = useState(null);

    // Search & Multi-Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [difficultyFilter, setDifficultyFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all"); // "all" | "theory" | "coding"

    const [form, setForm] = useState({
        questionText: "",
        role: "Full Stack Developer",
        domain: "React",
        difficulty: "medium",
        assessmentType: "theory",
        idealAnswer: "",
        keypoint: "",
        maxscore: 10
    });

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await api.get("/question");
            setQuestions(response.data || []);
        } catch (err) {
            console.error("Fetch questions error:", err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    // Sync active role from router state if provided
    useEffect(() => {
        if (location.state?.activeRole) {
            setActiveRoleFolder(canonicalRole(location.state.activeRole));
            setViewMode("folders");
        }
    }, [location.state]);

    // Handle Consolidate Folders
    const handleConsolidate = async () => {
        try {
            setConsolidating(true);
            const res = await api.post("/question/consolidate");
            setToast({
                show: true,
                message: res.data?.message || "Folders synchronized and consolidated successfully!",
                type: "success"
            });
            fetchQuestions();
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message || "Failed to consolidate folders.",
                type: "error"
            });
        } finally {
            setConsolidating(false);
        }
    };

    // Folder Structure Aggregation with Canonical Normalization
    const roleFolders = useMemo(() => {
        const map = {};

        questions.forEach((q) => {
            const rawRole = q.role || "General Roles";
            const r = canonicalRole(rawRole);
            const rawDomain = q.domain || "Core Concepts";
            const d = canonicalDomain(rawDomain, q.questionText, r);
            const isCoding = q.assessmentType === "coding" || q.type === "coding";

            if (!map[r]) {
                map[r] = {
                    name: r,
                    total: 0,
                    approved: 0,
                    pending: 0,
                    codingCount: 0,
                    theoryCount: 0,
                    domains: {}
                };
            }

            map[r].total += 1;
            if (q.status === "approved") map[r].approved += 1;
            if (q.status === "pending") map[r].pending += 1;
            if (isCoding) map[r].codingCount += 1;
            else map[r].theoryCount += 1;

            if (!map[r].domains[d]) {
                map[r].domains[d] = {
                    name: d,
                    total: 0,
                    codingCount: 0,
                    theoryCount: 0
                };
            }

            map[r].domains[d].total += 1;
            if (isCoding) map[r].domains[d].codingCount += 1;
            else map[r].domains[d].theoryCount += 1;
        });

        // Filter out any role folder or sub-domain with 0 questions
        return Object.values(map)
            .filter(r => r.total > 0)
            .map(r => ({
                ...r,
                domains: Object.fromEntries(
                    Object.entries(r.domains).filter(([_, d]) => d.total > 0)
                )
            }))
            .sort((a, b) => b.total - a.total);
    }, [questions]);

    // Filtered Questions
    const filteredQuestions = useMemo(() => {
        return questions.filter((q) => {
            const qRoleNorm = canonicalRole(q.role || "General Roles");
            const qDomainNorm = canonicalDomain(q.domain || "Core Concepts", q.questionText, qRoleNorm);

            // Folder constraints if active
            if (activeRoleFolder && qRoleNorm !== activeRoleFolder) return false;
            if (activeDomainFolder && qDomainNorm !== activeDomainFolder) return false;

            // Search Filter
            if (searchTerm.trim()) {
                const search = searchTerm.toLowerCase();
                const textMatch = q.questionText?.toLowerCase().includes(search);
                const roleMatch = q.role?.toLowerCase().includes(search);
                const domainMatch = q.domain?.toLowerCase().includes(search);
                const keypointsMatch = Array.isArray(q.keypoint) && q.keypoint.some((k) => k.toLowerCase().includes(search));

                if (!textMatch && !roleMatch && !domainMatch && !keypointsMatch) {
                    return false;
                }
            }

            // Status Filter
            if (statusFilter !== "all" && q.status !== statusFilter) return false;

            // Difficulty Filter
            if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;

            // Type Filter
            if (typeFilter !== "all") {
                const isCoding = q.assessmentType === "coding" || q.type === "coding";
                if (typeFilter === "coding" && !isCoding) return false;
                if (typeFilter === "theory" && isCoding) return false;
            }

            return true;
        });
    }, [questions, activeRoleFolder, activeDomainFolder, searchTerm, statusFilter, difficultyFilter, typeFilter]);

    // Launch direct interview from folder
    const handleStartFolderInterview = async (roleName, domainName) => {
        try {
            setLaunchingTest(true);
            const res = await api.post("/interviews", {
                roleTitle: roleName,
                domain: domainName || "Technical Assessment",
                limit: 5,
                assessmentType: "mixed"
            });
            navigate(`/interview/${res.data.interviewId}`, {
                state: { questions: res.data.questions }
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message || "Failed to start interview for this role.",
                type: "error"
            });
        } finally {
            setLaunchingTest(false);
        }
    };

    // Handle Create
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post("/question", {
                questionText: form.questionText,
                role: form.role,
                domain: form.domain,
                difficulty: form.difficulty,
                assessmentType: form.assessmentType,
                type: form.assessmentType === "coding" ? "coding" : "technical",
                idealAnswer: form.idealAnswer || "",
                keypoint: form.keypoint
                    ? form.keypoint.split(",").map((i) => i.trim()).filter(Boolean)
                    : [],
                maxscore: Number(form.maxscore)
            });

            setToast({
                show: true,
                message: "Question successfully added to question bank!",
                type: "success"
            });

            setForm({
                questionText: "",
                role: activeRoleFolder || "Full Stack Developer",
                domain: activeDomainFolder || "React",
                difficulty: "medium",
                assessmentType: "theory",
                idealAnswer: "",
                keypoint: "",
                maxscore: 10
            });

            setShowCreateModal(false);
            fetchQuestions();
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to create question",
                type: "error"
            });
        }
    };

    // Handle Edit
    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/question/${editingQuestion._id}`, {
                questionText: editingQuestion.questionText,
                role: editingQuestion.role,
                domain: editingQuestion.domain,
                difficulty: editingQuestion.difficulty,
                assessmentType: editingQuestion.assessmentType,
                idealAnswer: editingQuestion.idealAnswer || "",
                keypoint:
                    typeof editingQuestion.keypoint === "string"
                        ? editingQuestion.keypoint.split(",").map((i) => i.trim()).filter(Boolean)
                        : editingQuestion.keypoint || [],
                maxscore: Number(editingQuestion.maxscore)
            });

            setToast({
                show: true,
                message: "Question updated successfully!",
                type: "success"
            });

            setEditingQuestion(null);
            fetchQuestions();
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to update question",
                type: "error"
            });
        }
    };

    // Handle Delete
    const handleDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await api.delete(`/question/${deleteTargetId}`);
            setToast({
                show: true,
                message: "Question deleted successfully",
                type: "success"
            });
            setDeleteTargetId(null);
            fetchQuestions();
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to delete question",
                type: "error"
            });
        }
    };

    // Handle Status Patch
    const handleStatusChange = async (id, newStatus) => {
        try {
            if (newStatus === "approved") {
                await api.patch(`/question/${id}/approve`);
            } else {
                await api.patch(`/question/${id}/rejected`);
            }
            setToast({
                show: true,
                message: `Question marked as ${newStatus}`,
                type: "success"
            });
            fetchQuestions();
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to update status",
                type: "error"
            });
        }
    };

    return (
        <div className="min-vh-100 tech-grid-bg pb-5">
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            <div className="container py-4 py-md-5">
                {/* Header Card */}
                <div className="glass-card p-4 p-md-5 mb-4 position-relative overflow-hidden">
                    <div
                        style={{
                            position: "absolute",
                            top: "-40px",
                            right: "-40px",
                            width: "220px",
                            height: "220px",
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%)",
                            pointerEvents: "none"
                        }}
                    />

                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="badge-tech badge-indigo">
                                    <BookOpenIcon size={14} /> Knowledge Repository
                                </span>
                                <span className="badge-tech badge-cyan">
                                    {questions.length} Total Questions
                                </span>
                            </div>
                            <h1 className="fw-bold text-white mb-1" style={{ letterSpacing: "-0.02em" }}>
                                Role-Categorized Question Bank
                            </h1>
                            <p className="text-muted mb-0 small">
                                Browse questions organized into Role folders, search by topic or keywords, and manage assessment items.
                            </p>
                        </div>

                        <div className="d-flex flex-wrap gap-2">
                            <button
                                className="btn btn-secondary-dark"
                                onClick={handleConsolidate}
                                disabled={consolidating}
                                title="Synchronize and consolidate role and domain folders"
                            >
                                <ZapIcon size={16} className={consolidating ? "spin text-cyan-400" : "text-amber-400"} />
                                {consolidating ? "Syncing..." : "Sync Folders"}
                            </button>
                            <Link to="/ai-generator" className="btn btn-secondary-dark">
                                <SparklesIcon size={16} /> AI Generator
                            </Link>
                            <button
                                className="btn btn-primary-gradient"
                                onClick={() => {
                                    setForm({
                                        questionText: "",
                                        role: activeRoleFolder || "Full Stack Developer",
                                        domain: activeDomainFolder || "React",
                                        difficulty: "medium",
                                        assessmentType: "theory",
                                        idealAnswer: "",
                                        keypoint: "",
                                        maxscore: 10
                                    });
                                    setShowCreateModal(true);
                                }}
                            >
                                <PlusIcon size={16} /> Add Question
                            </button>
                        </div>
                    </div>

                    {/* Breadcrumbs & View Toggle */}
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 pt-3 border-top border-secondary border-opacity-25">
                        {/* Breadcrumbs */}
                        <div className="d-flex align-items-center gap-2 text-muted small">
                            <button
                                className={`btn btn-link p-0 text-decoration-none ${!activeRoleFolder ? "text-white fw-bold" : "text-indigo-400"}`}
                                onClick={() => {
                                    setActiveRoleFolder(null);
                                    setActiveDomainFolder(null);
                                }}
                            >
                                📁 All Role Folders
                            </button>

                            {activeRoleFolder && (
                                <>
                                    <span>/</span>
                                    <button
                                        className={`btn btn-link p-0 text-decoration-none ${!activeDomainFolder ? "text-white fw-bold" : "text-indigo-400"}`}
                                        onClick={() => setActiveDomainFolder(null)}
                                    >
                                        📁 {activeRoleFolder}
                                    </button>
                                </>
                            )}

                            {activeDomainFolder && (
                                <>
                                    <span>/</span>
                                    <span className="text-cyan-400 fw-bold">
                                        📂 {activeDomainFolder}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* View Switcher */}
                        <div className="d-flex gap-2">
                            <button
                                className={`btn btn-sm ${viewMode === "folders" ? "btn-primary-gradient" : "btn-secondary-dark"}`}
                                onClick={() => setViewMode("folders")}
                            >
                                📁 Folder View
                            </button>
                            <button
                                className={`btn btn-sm ${viewMode === "flat" ? "btn-primary-gradient" : "btn-secondary-dark"}`}
                                onClick={() => {
                                    setViewMode("flat");
                                    setActiveRoleFolder(null);
                                    setActiveDomainFolder(null);
                                }}
                            >
                                📋 All Questions List
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="glass-card p-3 mb-4">
                    <div className="row g-2 align-items-center">
                        <div className="col-lg-5">
                            <div className="input-group">
                                <span className="input-group-text bg-dark border-secondary border-opacity-25 text-muted">
                                    <SearchIcon size={16} />
                                </span>
                                <input
                                    type="text"
                                    className="form-control form-control-custom"
                                    placeholder="Search by question text, role, domain, or key concepts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-md-2 col-6">
                            <select
                                className="form-select form-control-custom"
                                value={difficultyFilter}
                                onChange={(e) => setDifficultyFilter(e.target.value)}
                            >
                                <option value="all">Difficulty: All</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>

                        <div className="col-md-2 col-6">
                            <select
                                className="form-select form-control-custom"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Status: All</option>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending Review</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <div className="col-md-3 col-12">
                            <select
                                className="form-select form-control-custom"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="all">Type: All (Theory & Coding)</option>
                                <option value="theory">Theory Questions Only</option>
                                <option value="coding">Coding Problems Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 1. FOLDER HIERARCHY VIEW */}
                {viewMode === "folders" && !activeRoleFolder && (
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h5 className="fw-bold text-white mb-0">Role Knowledge Folders ({roleFolders.length})</h5>
                                <span className="text-muted small">Standardized role hierarchy • Click to open or launch an immediate assessment</span>
                            </div>
                        </div>

                        <div className="row g-3">
                            {roleFolders.map((rf, i) => (
                                <div key={i} className="col-md-6 col-lg-4">
                                    <div
                                        className="glass-card p-4 h-100 d-flex flex-column justify-content-between transition-all hover-scale"
                                        style={{ border: "1px solid rgba(255, 255, 255, 0.12)", background: "rgba(15, 23, 42, 0.65)" }}
                                    >
                                        <div>
                                             <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div
                                                        className="d-flex align-items-center justify-content-center rounded-3 p-2"
                                                        style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)" }}
                                                    >
                                                        <span style={{ fontSize: "1.4rem" }}>📁</span>
                                                    </div>
                                                    <div>
                                                        <h6 className="fw-bold text-white mb-0 fs-6">{rf.name}</h6>
                                                        <span className="text-muted small">{Object.keys(rf.domains).length} Domain Sub-folders</span>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-1">
                                                    {rf.total < 3 && (
                                                        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50" style={{ fontSize: "0.68rem" }} title="Understocked folder (< 3 questions)">
                                                            ⚠️ &lt; 3 Qs
                                                        </span>
                                                    )}
                                                    <span className="badge-tech badge-cyan fw-bold">{rf.total} Qs</span>
                                                </div>
                                            </div>

                                            {/* Sub-domain Badges with high contrast and neat layout */}
                                            <div className="d-flex flex-wrap gap-1 mb-3">
                                                {Object.values(rf.domains).slice(0, 5).map((d, di) => (
                                                    <span
                                                        key={di}
                                                        className="badge bg-dark text-indigo-200 border border-indigo-500 border-opacity-30 px-2 py-1 text-truncate"
                                                        style={{ fontSize: "0.72rem", letterSpacing: "0.01em", maxWidth: "220px" }}
                                                        title={`${d.name} (${d.total} questions)`}
                                                    >
                                                        📂 {d.name} <span className="text-cyan-400">({d.total})</span>
                                                    </span>
                                                ))}
                                                {Object.keys(rf.domains).length > 5 && (
                                                    <span className="badge bg-dark text-secondary border border-secondary border-opacity-25 px-2 py-1" style={{ fontSize: "0.72rem" }}>
                                                        +{Object.keys(rf.domains).length - 5} more
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-muted small mb-3">
                                                <span className="text-emerald-400 fw-semibold">✓ {rf.approved}</span> Active • <span className="text-cyan-400 fw-semibold">{rf.codingCount}</span> Coding • <span className="text-indigo-300 fw-semibold">{rf.theoryCount}</span> Theory
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="d-flex gap-2 pt-3 border-top border-secondary border-opacity-25">
                                            <button
                                                className="btn btn-secondary-dark btn-sm flex-grow-1 text-white"
                                                onClick={() => {
                                                    setActiveRoleFolder(rf.name);
                                                    setActiveDomainFolder(null);
                                                }}
                                            >
                                                📁 Open Folder
                                            </button>
                                            <button
                                                className="btn btn-primary-gradient btn-sm px-3"
                                                disabled={launchingTest}
                                                onClick={() => handleStartFolderInterview(rf.name)}
                                                title={`Launch interview for ${rf.name}`}
                                            >
                                                ▶ Start Test
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. SUB-DOMAIN FOLDERS VIEW */}
                {viewMode === "folders" && activeRoleFolder && !activeDomainFolder && (
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h5 className="fw-bold text-white mb-0">📂 {activeRoleFolder} — Domain Categories</h5>
                                <span className="text-muted small">Select a domain category to inspect questions or launch practice</span>
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-primary-gradient btn-sm"
                                    disabled={launchingTest}
                                    onClick={() => handleStartFolderInterview(activeRoleFolder)}
                                >
                                    ▶ Start Full Role Test
                                </button>
                                <button
                                    className="btn btn-secondary-dark btn-sm"
                                    onClick={() => setActiveRoleFolder(null)}
                                >
                                    <ArrowLeftIcon size={14} /> Back to All Roles
                                </button>
                            </div>
                        </div>

                        {/* Sub-domain Cards */}
                        <div className="row g-3 mb-4">
                            {Object.values(roleFolders.find((r) => r.name === activeRoleFolder)?.domains || {}).map((dom, di) => (
                                <div key={di} className="col-md-4 col-sm-6">
                                    <div
                                        className="p-3 rounded-3 glass-card h-100 d-flex flex-column justify-content-between"
                                        style={{ border: "1px solid rgba(99, 102, 241, 0.3)", background: "rgba(15, 23, 42, 0.6)" }}
                                    >
                                        <div>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="fw-bold text-white small fs-6">📂 {dom.name}</span>
                                                <div className="d-flex align-items-center gap-1">
                                                    {dom.total < 3 && (
                                                        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50" style={{ fontSize: "0.68rem" }} title="Understocked folder (< 3 questions)">
                                                            ⚠️ &lt; 3 Qs
                                                        </span>
                                                    )}
                                                    <span className="badge-tech badge-cyan">{dom.total} Qs</span>
                                                </div>
                                            </div>
                                            <div className="text-muted small mb-3">
                                                <span>{dom.theoryCount} Theory • {dom.codingCount} Coding</span>
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2 pt-2 border-top border-secondary border-opacity-25">
                                            <button
                                                className="btn btn-secondary-dark btn-sm flex-grow-1 text-cyan-300"
                                                onClick={() => setActiveDomainFolder(dom.name)}
                                            >
                                                View Qs →
                                            </button>
                                            <button
                                                className="btn btn-primary-gradient btn-sm"
                                                disabled={launchingTest}
                                                onClick={() => handleStartFolderInterview(activeRoleFolder, dom.name)}
                                                title={`Start test for ${dom.name}`}
                                            >
                                                ▶ Practice
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. QUESTIONS LIST VIEW (Filtered or In Folder) */}
                <div className="glass-card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold text-white mb-0">
                            {activeDomainFolder
                                ? `Questions in ${activeDomainFolder} (${filteredQuestions.length})`
                                : activeRoleFolder
                                ? `Questions in ${activeRoleFolder} (${filteredQuestions.length})`
                                : `All Cataloged Questions (${filteredQuestions.length})`}
                        </h5>
                    </div>

                    {loading ? (
                        <div className="p-5 text-center">
                            <div className="spinner-border text-indigo-400 mb-2" role="status" />
                            <p className="text-muted small mb-0">Loading question repository...</p>
                        </div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="p-5 text-center text-muted">
                            <BookOpenIcon size={40} className="text-secondary opacity-50 mb-3" />
                            <p className="mb-0">No questions found matching the selected filters/folder.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-dark table-hover mb-0 align-middle">
                                <thead>
                                    <tr className="text-secondary small text-uppercase">
                                        <th style={{ width: "45%" }}>Question</th>
                                        <th>Role / Domain</th>
                                        <th>Type & Difficulty</th>
                                        <th>Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQuestions.map((q) => {
                                        const isCoding = q.assessmentType === "coding" || q.type === "coding";

                                        return (
                                            <tr key={q._id}>
                                                <td>
                                                    <span className="text-white fw-semibold d-block mb-1">
                                                        {q.questionText}
                                                    </span>
                                                    {q.keypoint && q.keypoint.length > 0 && (
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {q.keypoint.slice(0, 3).map((kp, kpi) => (
                                                                <span key={kpi} className="badge bg-secondary bg-opacity-25 text-light" style={{ fontSize: "0.68rem" }}>
                                                                    {kp}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="badge-tech badge-indigo d-block mb-1" style={{ fontSize: "0.72rem" }}>
                                                        {q.role}
                                                    </span>
                                                    <span className="text-muted small">📂 {q.domain}</span>
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-column gap-1">
                                                        <span className={`badge-tech ${isCoding ? "badge-cyan" : "badge-emerald"}`} style={{ fontSize: "0.72rem" }}>
                                                            {isCoding ? "💻 Coding" : "📖 Theory"}
                                                        </span>
                                                        <span className={`badge-tech ${q.difficulty === "hard" ? "badge-rejected" : q.difficulty === "medium" ? "badge-pending" : "badge-approved"}`} style={{ fontSize: "0.72rem" }}>
                                                            {q.difficulty || "medium"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge-tech ${q.status === "approved" ? "badge-approved" : q.status === "pending" ? "badge-pending" : "badge-rejected"}`}>
                                                        {q.status || "approved"}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <div className="d-flex justify-content-end gap-1">
                                                        {q.status === "pending" && (
                                                            <button
                                                                className="btn btn-sm btn-secondary-dark text-emerald-400 p-1"
                                                                title="Approve"
                                                                onClick={() => handleStatusChange(q._id, "approved")}
                                                            >
                                                                <CheckIcon size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn btn-sm btn-secondary-dark text-cyan-400 p-1"
                                                            title="Edit"
                                                            onClick={() => setEditingQuestion(q)}
                                                        >
                                                            <EditIcon size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-secondary-dark text-rose-400 p-1"
                                                            title="Delete"
                                                            onClick={() => setDeleteTargetId(q._id)}
                                                        >
                                                            <TrashIcon size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE QUESTION MODAL */}
            {showCreateModal && (
                <div className="modal-backdrop-custom">
                    <div className="modal-content-custom p-4 p-md-5" style={{ maxWidth: "600px" }}>
                        <h4 className="fw-bold text-white mb-3">Create New Question</h4>
                        <form onSubmit={handleCreate}>
                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-semibold">Question Text</label>
                                <textarea
                                    className="form-control form-control-custom"
                                    rows="3"
                                    required
                                    value={form.questionText}
                                    onChange={(e) => setForm({ ...form, questionText: e.target.value })}
                                />
                            </div>

                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <label className="form-label text-secondary small fw-semibold">Role Folder</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-custom"
                                        required
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label text-secondary small fw-semibold">Domain Sub-folder</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-custom"
                                        required
                                        value={form.domain}
                                        onChange={(e) => setForm({ ...form, domain: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <label className="form-label text-secondary small fw-semibold">Assessment Type</label>
                                    <select
                                        className="form-select form-control-custom"
                                        value={form.assessmentType}
                                        onChange={(e) => setForm({ ...form, assessmentType: e.target.value })}
                                    >
                                        <option value="theory">Theory Concept</option>
                                        <option value="coding">Coding Challenge</option>
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label text-secondary small fw-semibold">Difficulty</label>
                                    <select
                                        className="form-select form-control-custom"
                                        value={form.difficulty}
                                        onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-semibold">Model / Ideal Answer</label>
                                <textarea
                                    className="form-control form-control-custom"
                                    rows="3"
                                    value={form.idealAnswer}
                                    onChange={(e) => setForm({ ...form, idealAnswer: e.target.value })}
                                />
                            </div>

                            <div className="mb-4">
                                <label className="form-label text-secondary small fw-semibold">Key Concepts (Comma-separated)</label>
                                <input
                                    type="text"
                                    className="form-control form-control-custom"
                                    placeholder="e.g. Event loop, microtasks, async/await"
                                    value={form.keypoint}
                                    onChange={(e) => setForm({ ...form, keypoint: e.target.value })}
                                />
                            </div>

                            <div className="d-flex gap-3">
                                <button
                                    type="button"
                                    className="btn btn-secondary-dark flex-grow-1"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary-gradient flex-grow-1">
                                    Save Question
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT QUESTION MODAL */}
            {editingQuestion && (
                <div className="modal-backdrop-custom">
                    <div className="modal-content-custom p-4 p-md-5" style={{ maxWidth: "600px" }}>
                        <h4 className="fw-bold text-white mb-3">Edit Question</h4>
                        <form onSubmit={handleEdit}>
                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-semibold">Question Text</label>
                                <textarea
                                    className="form-control form-control-custom"
                                    rows="3"
                                    required
                                    value={editingQuestion.questionText}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                                />
                            </div>

                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <label className="form-label text-secondary small fw-semibold">Role Folder</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-custom"
                                        required
                                        value={editingQuestion.role}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, role: e.target.value })}
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label text-secondary small fw-semibold">Domain Sub-folder</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-custom"
                                        required
                                        value={editingQuestion.domain}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, domain: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label text-secondary small fw-semibold">Ideal Answer</label>
                                <textarea
                                    className="form-control form-control-custom"
                                    rows="3"
                                    value={editingQuestion.idealAnswer || ""}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, idealAnswer: e.target.value })}
                                />
                            </div>

                            <div className="d-flex gap-3">
                                <button
                                    type="button"
                                    className="btn btn-secondary-dark flex-grow-1"
                                    onClick={() => setEditingQuestion(null)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary-gradient flex-grow-1">
                                    Update Question
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteTargetId && (
                <div className="modal-backdrop-custom">
                    <div className="modal-content-custom p-4 text-center" style={{ maxWidth: "440px" }}>
                        <TrashIcon size={40} className="text-rose-400 mb-3" />
                        <h4 className="fw-bold text-white mb-2">Delete Question?</h4>
                        <p className="text-muted small mb-4">
                            This action cannot be undone. Are you sure you want to remove this question from the Question Bank?
                        </p>
                        <div className="d-flex gap-3">
                            <button
                                className="btn btn-secondary-dark flex-grow-1"
                                onClick={() => setDeleteTargetId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary-gradient flex-grow-1"
                                style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}
                                onClick={handleDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default QuestionBank;