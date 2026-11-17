import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, Check, Plus, ExternalLink, Zap, Code, Loader2 } from "lucide-react";
import api from "../utils/api";
import Toast from "../components/Toast";
import { cleanStatement } from "../utils/formatters";

const TOP_TAGS = [
    "all",
    "implementation",
    "math",
    "greedy",
    "dp",
    "data structures",
    "strings",
    "graphs",
    "sortings",
    "binary search",
    "brute force"
];

export default function CodeforcesImporter() {
    const [allProblems, setAllProblems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [importingId, setImportingId] = useState(null);
    const [batchImporting, setBatchImporting] = useState(false);
    const [importedSet, setImportedSet] = useState(new Set());
    const [toast, setToast] = useState({ show: false, message: "", type: "info" });

    // Progressive disclosure states
    const [showSettings, setShowSettings] = useState(false);
    const [moreActionsOpen, setMoreActionsOpen] = useState(false);
    const moreActionsRef = useRef(null);

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTag, setSelectedTag] = useState("all");
    const [ratingTier, setRatingTier] = useState("all");
    const [pageSize, setPageSize] = useState(24);

    // Target configuration for import
    const [form, setForm] = useState({
        role: "Coding",
        domain: "Algorithms",
        difficulty: "auto"
    });

    // Preview modal state
    const [previewProblem, setPreviewProblem] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Close more actions on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (moreActionsRef.current && !moreActionsRef.current.contains(e.target)) {
                setMoreActionsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchProblems = async () => {
        try {
            setLoading(true);
            const response = await api.get("/question/codeforces");
            const rawProblems = response.data?.problems || [];
            setAllProblems(rawProblems);
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to load Codeforces problemset.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProblems();
    }, []);

    // Filtered Problems List
    const filteredProblems = useMemo(() => {
        return allProblems.filter((p) => {
            if (searchTerm.trim()) {
                const search = searchTerm.toLowerCase();
                const idMatch = `${p.contestId}${p.index}`.toLowerCase().includes(search);
                const nameMatch = (p.name || "").toLowerCase().includes(search);
                const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(search));
                if (!idMatch && !nameMatch && !tagMatch) return false;
            }

            if (selectedTag !== "all") {
                if (!p.tags || !p.tags.includes(selectedTag)) return false;
            }

            if (ratingTier === "easy") {
                if (p.rating && p.rating > 1100) return false;
            } else if (ratingTier === "medium") {
                if (!p.rating || p.rating < 1200 || p.rating > 1500) return false;
            } else if (ratingTier === "hard") {
                if (!p.rating || p.rating < 1600) return false;
            }

            return true;
        });
    }, [allProblems, searchTerm, selectedTag, ratingTier]);

    const getCalculatedDifficulty = (rating) => {
        if (!rating) return "medium";
        if (rating <= 1100) return "easy";
        if (rating <= 1500) return "medium";
        return "hard";
    };

    // Single Problem Import
    const handleImport = async (contestId, index, rating) => {
        const key = `${contestId}-${index}`;
        try {
            setImportingId(key);
            const effectiveDiff = form.difficulty === "auto" ? getCalculatedDifficulty(rating) : form.difficulty;

            await api.post("/question/import-codeforces", {
                contestId,
                index,
                role: form.role,
                domain: form.domain,
                difficulty: effectiveDiff
            });

            setImportedSet((prev) => new Set([...prev, key]));
            setToast({
                show: true,
                message: `Problem ${contestId}${index} imported cleanly into Question bank!`,
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to import problem.",
                type: "error"
            });
        } finally {
            setImportingId(null);
        }
    };

    // Quick seed curated problems
    const handleSeedCurated = async () => {
        try {
            setSeeding(true);
            setMoreActionsOpen(false);
            const res = await api.post("/question/seed-curated-codeforces");
            setToast({
                show: true,
                message: res.data?.message || "Successfully seeded curated competitive problems!",
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to seed curated problems.",
                type: "error"
            });
        } finally {
            setSeeding(false);
        }
    };

    // Batch Import Top 10 from filtered list
    const handleBatchImportTop = async () => {
        const candidates = filteredProblems
            .filter((p) => !importedSet.has(`${p.contestId}-${p.index}`))
            .slice(0, 10);

        if (candidates.length === 0) {
            setToast({ show: true, message: "No un-imported problems in current filter.", type: "warning" });
            return;
        }

        try {
            setBatchImporting(true);
            setMoreActionsOpen(false);
            let count = 0;
            for (const p of candidates) {
                try {
                    const effectiveDiff = form.difficulty === "auto" ? getCalculatedDifficulty(p.rating) : form.difficulty;
                    await api.post("/question/import-codeforces", {
                        contestId: p.contestId,
                        index: p.index,
                        role: form.role,
                        domain: form.domain,
                        difficulty: effectiveDiff
                    });
                    setImportedSet((prev) => new Set([...prev, `${p.contestId}-${p.index}`]));
                    count++;
                } catch (e) {
                    console.log(`Failed to import ${p.contestId}${p.index}`, e);
                }
            }

            setToast({
                show: true,
                message: `Imported ${count} problems into ${form.role}!`,
                type: "success"
            });
        } catch (err) {
            setToast({ show: true, message: "Batch import completed with errors.", type: "error" });
        } finally {
            setBatchImporting(false);
        }
    };

    // Open Statement Preview
    const handleOpenPreview = async (contestId, index, name) => {
        try {
            setPreviewLoading(true);
            setPreviewProblem({ contestId, index, name, loading: true });

            const res = await api.get(`/question/codeforces/${contestId}/${index}/statement`);
            setPreviewProblem({
                contestId,
                index,
                name,
                statement: cleanStatement(res.data?.statement || ""),
                loading: false
            });
        } catch (err) {
            setPreviewProblem({
                contestId,
                index,
                name,
                statement: "Statement preview unavailable directly. You can still import to format via AI scraper.",
                loading: false
            });
        } finally {
            setPreviewLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "48px" }}>
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span>Tools</span>
                <span>·</span>
                <span style={{ color: "#0f172a", fontWeight: "600" }}>Codeforces importer</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 className="wf-page-title" style={{ margin: "0 0 4px 0" }}>
                        Codeforces importer
                    </h1>
                    <p className="wf-page-subtitle" style={{ margin: 0 }}>
                        Search competitive programming problems and import them directly into role curricula.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {/* More actions dropdown: hides Quick seed */}
                    <div style={{ position: "relative" }} ref={moreActionsRef}>
                        <button
                            type="button"
                            onClick={() => setMoreActionsOpen(!moreActionsOpen)}
                            className="wf-btn-outline"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 14px" }}
                        >
                            <span>More actions</span>
                            <ChevronDown size={14} />
                        </button>
                        {moreActionsOpen && (
                            <div className="wf-menu-dropdown" style={{ right: 0, minWidth: "220px" }}>
                                <button
                                    type="button"
                                    onClick={handleSeedCurated}
                                    disabled={seeding}
                                    className="wf-menu-item"
                                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                                >
                                    {seeding ? "Seeding problems..." : "Quick seed 20+ top problems"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBatchImportTop}
                                    disabled={batchImporting || filteredProblems.length === 0}
                                    className="wf-menu-item"
                                    style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                                >
                                    {batchImporting ? "Importing..." : "Import top 10 matching"}
                                </button>
                            </div>
                        )}
                    </div>

                    <Link
                        to="/questionbank"
                        className="wf-btn-outline"
                        style={{ textDecoration: "none", fontSize: "13px", padding: "8px 14px" }}
                    >
                        View question bank →
                    </Link>
                </div>
            </div>

            {/* Collapsed Import Settings Section (Progressive Disclosure) */}
            <div className="wf-card" style={{ marginBottom: "20px", padding: "16px 20px" }}>
                <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#2563eb",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                    }}
                >
                    <span>{showSettings ? "Hide import settings" : "Import settings (role, domain, difficulty)"}</span>
                    <ChevronDown size={14} style={{ transform: showSettings ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>

                {showSettings && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                                Target role folder
                            </label>
                            <input
                                type="text"
                                className="wf-input"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                placeholder="Coding"
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                                Target domain
                            </label>
                            <input
                                type="text"
                                className="wf-input"
                                value={form.domain}
                                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                                placeholder="Algorithms"
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                                Difficulty mapping
                            </label>
                            <select
                                className="wf-input"
                                style={{ backgroundColor: "#ffffff" }}
                                value={form.difficulty}
                                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                            >
                                <option value="auto">Auto-detect from rating</option>
                                <option value="easy">Force Easy</option>
                                <option value="medium">Force Medium</option>
                                <option value="hard">Force Hard</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Search & Filter Bar */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: "1 1 280px" }}>
                    <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
                    <input
                        type="text"
                        placeholder="Search by problem name or ID (e.g., 4A, Watermelon, DP)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="wf-input"
                        style={{ width: "100%", padding: "7px 12px 7px 32px", fontSize: "13px" }}
                    />
                </div>

                <select
                    className="wf-input"
                    style={{ width: "auto", minWidth: "150px", backgroundColor: "#ffffff" }}
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                >
                    <option value="all">All algorithm tags</option>
                    {TOP_TAGS.filter((t) => t !== "all").map((tag) => (
                        <option key={tag} value={tag}>
                            {tag}
                        </option>
                    ))}
                </select>

                <select
                    className="wf-input"
                    style={{ width: "auto", minWidth: "140px", backgroundColor: "#ffffff" }}
                    value={ratingTier}
                    onChange={(e) => setRatingTier(e.target.value)}
                >
                    <option value="all">All rating tiers</option>
                    <option value="easy">Easy (≤ 1100)</option>
                    <option value="medium">Medium (1200 – 1500)</option>
                    <option value="hard">Hard (≥ 1600)</option>
                </select>
            </div>

            {/* Results Status Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", fontSize: "13px", color: "#64748b" }}>
                <span>
                    Showing <strong>{Math.min(pageSize, filteredProblems.length)}</strong> of {filteredProblems.length} problem(s)
                </span>
            </div>

            {/* Problems Grid: Clean light cards */}
            {loading ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    <Loader2 size={24} className="animate-spin" style={{ color: "#16a34a", margin: "0 auto 12px auto" }} />
                    <div>Loading Codeforces problemset index...</div>
                </div>
            ) : filteredProblems.length === 0 ? (
                <div className="wf-card" style={{ padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>
                        No problems found
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Try adjusting your search query, algorithm tag, or rating filter.
                    </div>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "28px" }}>
                    {filteredProblems.slice(0, pageSize).map((p) => {
                        const key = `${p.contestId}-${p.index}`;
                        const isImported = importedSet.has(key);
                        const isImporting = importingId === key;

                        return (
                            <div
                                key={key}
                                className="wf-card"
                                style={{
                                    padding: "20px",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    gap: "14px",
                                    backgroundColor: isImported ? "#f0fdf4" : "#ffffff",
                                    borderColor: isImported ? "#bbf7d0" : "#e2e8f0"
                                }}
                            >
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0, maxWidth: "75%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>
                                            {p.name}
                                        </h3>
                                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", backgroundColor: "#eff6ff", padding: "2px 7px", borderRadius: "4px" }}>
                                            {p.contestId}{p.index}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                        <span style={{
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            backgroundColor: p.rating ? (p.rating <= 1100 ? "#ecfdf5" : p.rating <= 1500 ? "#fffbeb" : "#fef2f2") : "#f1f5f9",
                                            color: p.rating ? (p.rating <= 1100 ? "#065f46" : p.rating <= 1500 ? "#92400e" : "#991b1b") : "#475569"
                                        }}>
                                            Rating: {p.rating || "Unrated"}
                                        </span>
                                        <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                                            {getCalculatedDifficulty(p.rating).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Tag chips */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                                        {p.tags?.slice(0, 3).map((tag, ti) => (
                                            <span
                                                key={ti}
                                                style={{
                                                    fontSize: "11px",
                                                    backgroundColor: "#f1f5f9",
                                                    color: "#334155",
                                                    padding: "2px 7px",
                                                    borderRadius: "4px"
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {p.tags?.length > 3 && (
                                            <span style={{ fontSize: "10.5px", color: "#64748b", alignSelf: "center" }}>
                                                +{p.tags.length - 3}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions: Preview + Import */}
                                <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenPreview(p.contestId, p.index, p.name)}
                                        className="wf-btn-outline"
                                        style={{ flex: 1, padding: "6px 12px", fontSize: "12px", textAlign: "center" }}
                                    >
                                        Preview
                                    </button>

                                    {isImported ? (
                                        <span style={{
                                            flex: 1,
                                            padding: "6px 12px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            backgroundColor: "#dcfce7",
                                            color: "#166534",
                                            borderRadius: "6px",
                                            textAlign: "center",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "4px"
                                        }}>
                                            <Check size={13} /> Imported
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={isImporting}
                                            onClick={() => handleImport(p.contestId, p.index, p.rating)}
                                            className="wf-btn-primary"
                                            style={{ flex: 1, padding: "6px 12px", fontSize: "12px", textAlign: "center" }}
                                        >
                                            {isImporting ? "Importing..." : "Import"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Single "Load more" button at bottom */}
            {!loading && filteredProblems.length > pageSize && (
                <div style={{ textAlign: "center" }}>
                    <button
                        type="button"
                        onClick={() => setPageSize((prev) => prev + 24)}
                        className="wf-btn-outline"
                        style={{ padding: "8px 24px", fontSize: "13px" }}
                    >
                        Load more problems
                    </button>
                </div>
            )}

            {/* Statement Preview Modal */}
            {previewProblem && (
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
                    zIndex: 1000,
                    padding: "20px"
                }}>
                    <div className="wf-card" style={{ maxWidth: "680px", width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                            <div>
                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", backgroundColor: "#eff6ff", padding: "2px 7px", borderRadius: "4px" }}>
                                    {previewProblem.contestId}{previewProblem.index}
                                </span>
                                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: "6px 0 0 0" }}>
                                    {previewProblem.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewProblem(null)}
                                style={{ background: "none", border: "none", fontSize: "18px", color: "#64748b", cursor: "pointer", padding: "4px" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px", marginBottom: "20px" }}>
                            {previewLoading ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                    <Loader2 size={20} className="animate-spin" style={{ color: "#16a34a", margin: "0 auto 8px auto" }} />
                                    <div>Fetching and cleaning statement...</div>
                                </div>
                            ) : (
                                <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#334155", whiteSpace: "pre-wrap" }}>
                                    {previewProblem.statement}
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                            <button
                                type="button"
                                onClick={() => setPreviewProblem(null)}
                                className="wf-btn-outline"
                                style={{ padding: "7px 16px", fontSize: "13px" }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleImport(previewProblem.contestId, previewProblem.index);
                                    setPreviewProblem(null);
                                }}
                                className="wf-btn-primary"
                                style={{ padding: "7px 16px", fontSize: "13px" }}
                            >
                                Import problem
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
