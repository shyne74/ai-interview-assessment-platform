import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    Search,
    Shuffle,
    CheckCircle2,
    Clock,
    Circle,
    Play,
    Shield,
    Sparkles,
    Filter,
    ChevronRight,
    ExternalLink,
    Code2,
    Terminal,
    AlertCircle,
    Check
} from "lucide-react";
import api from "../utils/api";
import { getTopicBySlug, getAllTopics } from "../config/dsaTopics";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { useToast } from "../components/ui/ToastContext";

export default function DsaTopicPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

    const topic = useMemo(() => {
        return getTopicBySlug(slug) || {
            slug: slug || "arrays",
            label: (slug || "Topic").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
            description: "Practice algorithmic coding problems curated for technical interviews.",
            keywords: []
        };
    }, [slug]);

    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [difficulty, setDifficulty] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("default");
    const [mode, setMode] = useState("practice"); // "practice" | "exam"
    const [selectedProblemIds, setSelectedProblemIds] = useState(new Set());
    const [examDurationMinutes, setExamDurationMinutes] = useState(30);
    const [startingExam, setStartingExam] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);

    // Fetch problems
    const fetchProblems = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (topic.slug) params.append("topic", topic.slug);
            if (difficulty !== "all") params.append("difficulty", difficulty);
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (searchQuery.trim()) params.append("search", searchQuery.trim());
            if (sortBy !== "default") params.append("sort", sortBy);
            params.append("limit", "100");

            const res = await api.get(`/coding/problems?${params.toString()}`);
            setProblems(res.data.problems || []);
        } catch (err) {
            console.error("Failed to load topic problems:", err);
            toastError("Failed to load problems for this topic.");
        } finally {
            setLoading(false);
        }
    }, [topic.slug, difficulty, statusFilter, searchQuery, sortBy, toastError]);

    useEffect(() => {
        fetchProblems();
    }, [fetchProblems]);

    // Computed stats
    const totalCount = problems.length;
    const solvedCount = problems.filter(p => p.userStatus === "solved").length;
    const attemptedCount = problems.filter(p => p.userStatus === "attempted").length;
    const solvedPercentage = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

    // Selection handlers for exam mode
    const handleToggleSelect = (id) => {
        setSelectedProblemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedProblemIds.size === problems.length) {
            setSelectedProblemIds(new Set());
        } else {
            setSelectedProblemIds(new Set(problems.map(p => p._id)));
        }
    };

    // Pick random problem
    const handlePickRandom = () => {
        if (!problems.length) {
            toastInfo("No problems available to pick from.");
            return;
        }
        const eligible = problems.filter(p => p.isExecutable);
        const pool = eligible.length > 0 ? eligible : problems;
        const randomItem = pool[Math.floor(Math.random() * pool.length)];
        navigate(`/practice/problems/${randomItem._id}`);
    };

    // Start Proctored Exam from selected problems
    const handleStartExam = async () => {
        if (selectedProblemIds.size === 0) {
            toastError("Please select at least 1 problem for your exam.");
            return;
        }

        setStartingExam(true);
        try {
            const selectedIds = Array.from(selectedProblemIds);
            const durationSeconds = examDurationMinutes * 60;

            const res = await api.post("/interviews", {
                roleTitle: "Coding Assessment",
                domain: topic.label,
                assessmentType: "coding",
                interviewType: "proctored-dsa",
                questionIds: selectedIds,
                durationSeconds: durationSeconds,
                totalQuestions: selectedIds.length
            });

            const interviewId = res.data._id || res.data.interview?._id;
            toastSuccess(`Starting ${selectedIds.length}-problem proctored session.`);
            navigate(`/interview/${interviewId}`);
        } catch (err) {
            console.error("Start exam error:", err);
            toastError(err.response?.data?.message || "Failed to start exam session.");
            setStartingExam(false);
        }
    };

    // AI On-demand Generation
    const handleGenerateAiProblems = async () => {
        setGeneratingAI(true);
        try {
            await api.post("/questions/generate", {
                role: "Coding",
                domain: topic.label,
                topics: [topic.label],
                count: 3,
                assessmentType: "coding",
                difficulty: "medium"
            });
            toastSuccess(`Generated practice problems for ${topic.label}!`);
            fetchProblems();
        } catch (err) {
            console.warn("AI generation note:", err.message);
            toastInfo(`Requested new practice problems for ${topic.label}. Refreshing...`);
            setTimeout(fetchProblems, 1500);
        } finally {
            setGeneratingAI(false);
        }
    };

    const getDifficultyBadgeVariant = (diff) => {
        switch ((diff || "").toLowerCase()) {
            case "easy": return "success";
            case "medium": return "warning";
            case "hard": return "error";
            default: return "neutral";
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "var(--color-background, #f8fafc)",
            color: "var(--color-text, #0f172a)",
            paddingBottom: "80px"
        }}>
            {/* Header Strip */}
            <div style={{
                backgroundColor: "var(--color-surface, #ffffff)",
                borderBottom: "1px solid var(--color-border, #e2e8f0)",
                padding: "24px 0"
            }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
                    {/* Breadcrumbs */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "var(--text-caption, 13px)",
                        color: "var(--color-text-muted, #64748b)",
                        marginBottom: "16px"
                    }}>
                        <Link to="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
                            Dashboard
                        </Link>
                        <ChevronRight size={14} />
                        <span>Practice</span>
                        <ChevronRight size={14} />
                        <span style={{ color: "var(--color-primary, #15803d)", fontWeight: "500" }}>
                            {topic.label}
                        </span>
                    </div>

                    {/* Title & Description */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                <h1 style={{
                                    fontSize: "var(--text-h1, 28px)",
                                    fontWeight: "600",
                                    color: "var(--color-text, #0f172a)",
                                    margin: 0,
                                    letterSpacing: "-0.02em"
                                }}>
                                    {topic.label}
                                </h1>
                                <Badge variant="neutral">
                                    {totalCount} {totalCount === 1 ? "problem" : "problems"}
                                </Badge>
                                {solvedCount > 0 && (
                                    <Badge variant="success">
                                        {solvedCount} solved
                                    </Badge>
                                )}
                            </div>
                            <p style={{
                                fontSize: "var(--text-body, 15px)",
                                color: "var(--color-text-muted, #64748b)",
                                maxWidth: "720px",
                                margin: 0,
                                lineHeight: 1.5
                            }}>
                                {topic.description}
                            </p>
                        </div>

                        {/* Mode Switcher Toggle */}
                        <div style={{
                            display: "inline-flex",
                            backgroundColor: "var(--color-surface-sunken, #f1f5f9)",
                            padding: "4px",
                            borderRadius: "10px",
                            border: "1px solid var(--color-border, #e2e8f0)"
                        }}>
                            <button
                                type="button"
                                onClick={() => setMode("practice")}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: mode === "practice" ? "600" : "500",
                                    backgroundColor: mode === "practice" ? "var(--color-surface, #ffffff)" : "transparent",
                                    color: mode === "practice" ? "var(--color-primary, #15803d)" : "var(--color-text-muted, #64748b)",
                                    boxShadow: mode === "practice" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                <Code2 size={16} />
                                Practice Mode
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("exam")}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: mode === "exam" ? "600" : "500",
                                    backgroundColor: mode === "exam" ? "var(--color-surface, #ffffff)" : "transparent",
                                    color: mode === "exam" ? "var(--color-primary, #15803d)" : "var(--color-text-muted, #64748b)",
                                    boxShadow: mode === "exam" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                <Shield size={16} />
                                Exam Mode
                            </button>
                        </div>
                    </div>

                    {/* Progress strip if totalCount > 0 */}
                    {totalCount > 0 && (
                        <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ flex: 1, maxWidth: "340px" }}>
                                <ProgressBar value={solvedPercentage} max={100} height={6} />
                            </div>
                            <span style={{ fontSize: "12px", color: "var(--color-text-muted, #64748b)", fontWeight: "500" }}>
                                {solvedCount} of {totalCount} completed ({solvedPercentage}%)
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Exam Mode Sticky Selection Banner */}
            {mode === "exam" && (
                <div style={{
                    backgroundColor: "#ecfdf5",
                    borderBottom: "1px solid #a7f3d0",
                    padding: "12px 24px",
                    position: "sticky",
                    top: 0,
                    zIndex: 20
                }}>
                    <div style={{
                        maxWidth: "1200px",
                        margin: "0 auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <Shield size={18} style={{ color: "#059669" }} />
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#065f46" }}>
                                Exam Mode: {selectedProblemIds.size} {selectedProblemIds.size === 1 ? "problem" : "problems"} selected
                            </span>
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#059669",
                                    fontSize: "13px",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                    padding: 0
                                }}
                            >
                                {selectedProblemIds.size === problems.length ? "Deselect all" : "Select all"}
                            </button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Clock size={15} style={{ color: "#065f46" }} />
                                <span style={{ fontSize: "13px", color: "#065f46" }}>Duration:</span>
                                <select
                                    value={examDurationMinutes}
                                    onChange={(e) => setExamDurationMinutes(Number(e.target.value))}
                                    style={{
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #6ee7b7",
                                        backgroundColor: "#ffffff",
                                        fontSize: "13px",
                                        color: "#065f46"
                                    }}
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                    <option value={90}>90 minutes</option>
                                </select>
                            </div>

                            <Button
                                variant="primary"
                                size="sm"
                                disabled={selectedProblemIds.size === 0 || startingExam}
                                onClick={handleStartExam}
                            >
                                {startingExam ? "Launching..." : `Start Exam (${selectedProblemIds.size})`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div style={{ maxWidth: "1200px", margin: "24px auto 0", padding: "0 24px" }}>
                {/* Toolbar */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "16px",
                    marginBottom: "20px"
                }}>
                    {/* Left: Search & Filter Pills */}
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px", flex: 1 }}>
                        {/* Search Input */}
                        <div style={{ position: "relative", minWidth: "220px", maxWidth: "320px", width: "100%" }}>
                            <Search
                                size={16}
                                style={{
                                    position: "absolute",
                                    left: "12px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--color-text-muted, #94a3b8)"
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Search problems..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    padding: "8px 12px 8px 36px",
                                    fontSize: "13px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border, #cbd5e1)",
                                    backgroundColor: "var(--color-surface, #ffffff)",
                                    color: "var(--color-text, #0f172a)",
                                    outline: "none"
                                }}
                            />
                        </div>

                        {/* Difficulty Pills */}
                        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "2px", borderRadius: "8px" }}>
                            {["all", "easy", "medium", "hard"].map((diff) => (
                                <button
                                    key={diff}
                                    type="button"
                                    onClick={() => setDifficulty(diff)}
                                    style={{
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        border: "none",
                                        fontSize: "12px",
                                        fontWeight: difficulty === diff ? "600" : "400",
                                        cursor: "pointer",
                                        backgroundColor: difficulty === diff ? "#ffffff" : "transparent",
                                        color: difficulty === diff ? "#0f172a" : "#64748b",
                                        boxShadow: difficulty === diff ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>

                        {/* Status Pills */}
                        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "2px", borderRadius: "8px" }}>
                            {["all", "solved", "attempted", "todo"].map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    style={{
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        border: "none",
                                        fontSize: "12px",
                                        fontWeight: statusFilter === st ? "600" : "400",
                                        cursor: "pointer",
                                        backgroundColor: statusFilter === st ? "#ffffff" : "transparent",
                                        color: statusFilter === st ? "#0f172a" : "#64748b",
                                        boxShadow: statusFilter === st ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                                        textTransform: "capitalize"
                                    }}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Sort & Pick Random */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                padding: "7px 12px",
                                borderRadius: "8px",
                                border: "1px solid var(--color-border, #cbd5e1)",
                                backgroundColor: "var(--color-surface, #ffffff)",
                                fontSize: "13px",
                                color: "var(--color-text, #0f172a)",
                                outline: "none"
                            }}
                        >
                            <option value="default">Sort by: Default</option>
                            <option value="difficulty-asc">Difficulty: Easy to Hard</option>
                            <option value="difficulty-desc">Difficulty: Hard to Easy</option>
                            <option value="status">Status</option>
                        </select>

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handlePickRandom}
                            disabled={problems.length === 0}
                            style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        >
                            <Shuffle size={14} />
                            Pick Random
                        </Button>
                    </div>
                </div>

                {/* Problem List Table */}
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} height={60} style={{ borderRadius: "8px" }} />
                        ))}
                    </div>
                ) : problems.length === 0 ? (
                    /* Honest Empty State */
                    <Card style={{ padding: "48px 24px", textAlign: "center" }}>
                        <div style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "16px",
                            backgroundColor: "#f0fdf4",
                            color: "#15803d",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 16px"
                        }}>
                            <Code2 size={28} />
                        </div>

                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "0 0 8px" }}>
                            {searchQuery || difficulty !== "all" || statusFilter !== "all"
                                ? "No problems match your filters"
                                : `No problems for ${topic.label} yet`}
                        </h3>

                        <p style={{
                            fontSize: "14px",
                            color: "#64748b",
                            maxWidth: "460px",
                            margin: "0 auto 24px",
                            lineHeight: 1.5
                        }}>
                            {searchQuery || difficulty !== "all" || statusFilter !== "all"
                                ? "Try resetting your search terms or difficulty filters to see more problems."
                                : `We're continuously curating verified problems for ${topic.label}. You can browse all available coding topics or generate fresh practice problems.`}
                        </p>

                        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                            {searchQuery || difficulty !== "all" || statusFilter !== "all" ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setDifficulty("all");
                                        setStatusFilter("all");
                                    }}
                                >
                                    Reset Filters
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigate("/practice/topics/arrays")}
                                    >
                                        Browse Arrays Problems
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleGenerateAiProblems}
                                        disabled={generatingAI}
                                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                                    >
                                        <Sparkles size={15} />
                                        {generatingAI ? "Generating..." : "Generate Practice Problems"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                ) : (
                    <Card style={{ overflow: "hidden", padding: 0 }}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                <thead>
                                    <tr style={{
                                        backgroundColor: "var(--color-surface-sunken, #f8fafc)",
                                        borderBottom: "1px solid var(--color-border, #e2e8f0)",
                                        fontSize: "12px",
                                        color: "var(--color-text-muted, #64748b)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em"
                                    }}>
                                        {mode === "exam" && (
                                            <th style={{ padding: "12px 16px", width: "40px" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProblemIds.size === problems.length && problems.length > 0}
                                                    onChange={handleSelectAll}
                                                    aria-label="Select all problems"
                                                />
                                            </th>
                                        )}
                                        <th style={{ padding: "12px 16px", width: "70px" }}>Status</th>
                                        <th style={{ padding: "12px 16px" }}>Title & Description</th>
                                        <th style={{ padding: "12px 16px", width: "110px" }}>Difficulty</th>
                                        <th style={{ padding: "12px 16px", width: "130px" }}>Format</th>
                                        <th style={{ padding: "12px 16px", width: "100px", textAlign: "right" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {problems.map((p, idx) => {
                                        const isSelected = selectedProblemIds.has(p._id);
                                        const cleanText = p.questionText?.replace(/\s+/g, " ").trim() || "Algorithmic Problem";
                                        const titleExcerpt = cleanText.length > 90 ? `${cleanText.slice(0, 90)}...` : cleanText;

                                        return (
                                            <tr
                                                key={p._id}
                                                style={{
                                                    borderBottom: "1px solid var(--color-border, #e2e8f0)",
                                                    backgroundColor: isSelected
                                                        ? "#f0fdf4"
                                                        : idx % 2 === 0
                                                        ? "var(--color-surface, #ffffff)"
                                                        : "var(--color-surface-sunken, #fafafa)",
                                                    transition: "background-color 0.1s ease"
                                                }}
                                            >
                                                {mode === "exam" && (
                                                    <td style={{ padding: "14px 16px" }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelect(p._id)}
                                                            aria-label={`Select ${titleExcerpt}`}
                                                        />
                                                    </td>
                                                )}

                                                {/* Status Icon */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    {p.userStatus === "solved" ? (
                                                        <CheckCircle2 size={18} style={{ color: "var(--color-primary, #15803d)" }} title="Solved" />
                                                    ) : p.userStatus === "attempted" ? (
                                                        <Clock size={18} style={{ color: "#d97706" }} title="Attempted" />
                                                    ) : (
                                                        <Circle size={18} style={{ color: "#cbd5e1" }} title="Todo" />
                                                    )}
                                                </td>

                                                {/* Title & Description */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    <Link
                                                        to={`/practice/problems/${p._id}`}
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: "500",
                                                            color: "var(--color-text, #0f172a)",
                                                            textDecoration: "none",
                                                            display: "block",
                                                            lineHeight: 1.4
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.color = "var(--color-primary, #15803d)"}
                                                        onMouseLeave={(e) => e.target.style.color = "var(--color-text, #0f172a)"}
                                                    >
                                                        {titleExcerpt}
                                                    </Link>
                                                    {p.codingData?.problemUrl && (
                                                        <span style={{ fontSize: "11px", color: "#94a3b8", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                                            Codeforces {p.codingData.contestId}{p.codingData.index}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Difficulty Badge */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    <Badge variant={getDifficultyBadgeVariant(p.difficulty)}>
                                                        {p.difficulty || "Medium"}
                                                    </Badge>
                                                </td>

                                                {/* Executability / Format */}
                                                <td style={{ padding: "14px 16px" }}>
                                                    {p.isExecutable ? (
                                                        <span style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                            fontSize: "11px",
                                                            color: "#15803d",
                                                            fontWeight: "500"
                                                        }}>
                                                            <Terminal size={13} />
                                                            Executable
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "4px",
                                                            fontSize: "11px",
                                                            color: "#64748b"
                                                        }}>
                                                            View only
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action Button */}
                                                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                                    <Button
                                                        variant={p.isExecutable ? "secondary" : "outline"}
                                                        size="sm"
                                                        onClick={() => navigate(`/practice/problems/${p._id}`)}
                                                    >
                                                        {p.isExecutable ? "Solve" : "View"}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
