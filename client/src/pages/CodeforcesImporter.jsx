import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
    BookOpenIcon,
    CheckCircleIcon,
    PlusIcon,
    SearchIcon,
    ZapIcon,
    CodeIcon,
    SparklesIcon,
    ArrowRightIcon,
    CheckIcon
} from "../components/icons";
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

function CodeforcesImporter() {
    const [allProblems, setAllProblems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [importingId, setImportingId] = useState(null);
    const [batchImporting, setBatchImporting] = useState(false);
    const [importedSet, setImportedSet] = useState(new Set());
    const [toast, setToast] = useState({ show: false, message: "", type: "info" });

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTag, setSelectedTag] = useState("all");
    const [ratingTier, setRatingTier] = useState("all"); // "all" | "easy" | "medium" | "hard"
    const [pageSize, setPageSize] = useState(30);

    // Target configuration for import
    const [form, setForm] = useState({
        role: "Coding",
        domain: "Algorithms",
        difficulty: "auto" // "auto" determines based on Codeforces rating
    });

    // Problem statement preview modal state
    const [previewProblem, setPreviewProblem] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const fetchProblems = async () => {
        try {
            setLoading(true);
            const response = await api.get("/question/codeforces");
            const rawProblems = response.data?.problems || [];
            setAllProblems(rawProblems);
            setToast({
                show: true,
                message: `Loaded ${rawProblems.length} Codeforces competitive programming problems!`,
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to load Codeforces problems.",
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
            // Search filter
            if (searchTerm.trim()) {
                const search = searchTerm.toLowerCase();
                const idMatch = `${p.contestId}${p.index}`.toLowerCase().includes(search);
                const nameMatch = p.name?.toLowerCase().includes(search);
                const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(search));
                if (!idMatch && !nameMatch && !tagMatch) return false;
            }

            // Tag filter
            if (selectedTag !== "all") {
                if (!p.tags || !p.tags.includes(selectedTag)) return false;
            }

            // Rating tier filter
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

    // Determine target difficulty from rating
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
                message: `Problem ${contestId}${index} imported cleanly into Question Bank!`,
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.error || err.response?.data?.message || "Import failed.",
                type: "error"
            });
        } finally {
            setImportingId(null);
        }
    };

    // Quick Seed Curated Problems
    const handleSeedCurated = async () => {
        try {
            setSeeding(true);
            const res = await api.post("/question/seed-codeforces", {
                role: form.role || "Coding"
            });
            setToast({
                show: true,
                message: res.data?.message || "Added 20+ top curated coding challenges to Question Bank!",
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Seeding failed.",
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
            setToast({ show: true, message: "No un-imported problems in the current filter.", type: "warning" });
            return;
        }

        try {
            setBatchImporting(true);
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
                message: `Batch imported ${count} Codeforces problems to ${form.role}!`,
                type: "success"
            });
        } catch (err) {
            setToast({ show: true, message: "Batch import finished with errors.", type: "error" });
        } finally {
            setBatchImporting(false);
        }
    };

    // Open Problem Preview
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
        <div className="min-vh-100 tech-grid-bg pb-5">
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            {/* Preview Modal */}
            {previewProblem && (
                <div className="modal-backdrop-custom">
                    <div className="glass-card p-4 p-md-5" style={{ maxWidth: "720px", width: "95%", maxHeight: "85vh", overflowY: "auto" }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center gap-2">
                                <span className="badge-tech badge-cyan">{previewProblem.contestId}{previewProblem.index}</span>
                                <h4 className="fw-bold text-white mb-0">{previewProblem.name}</h4>
                            </div>
                            <button className="btn btn-sm btn-secondary-dark" onClick={() => setPreviewProblem(null)}>✕ Close</button>
                        </div>
                        <hr style={{ borderColor: "var(--border-subtle)" }} />
                        {previewLoading ? (
                            <div className="p-5 text-center">
                                <div className="spinner-border text-cyan-400 mb-2" />
                                <p className="text-muted small mb-0">Fetching and formatting statement...</p>
                            </div>
                        ) : (
                            <div className="text-light small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                {previewProblem.statement}
                            </div>
                        )}
                        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary border-opacity-25">
                            <button className="btn btn-secondary-dark" onClick={() => setPreviewProblem(null)}>Close</button>
                            <button
                                className="btn btn-primary-gradient"
                                onClick={() => {
                                    handleImport(previewProblem.contestId, previewProblem.index);
                                    setPreviewProblem(null);
                                }}
                            >
                                <PlusIcon size={16} /> Import Problem
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container py-4 py-md-5">
                {/* Header Card */}
                <div className="glass-card p-4 p-md-5 mb-4 position-relative overflow-hidden">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="badge-tech badge-indigo">
                                    <CodeIcon size={14} /> Competitive Programming
                                </span>
                                <span className="badge-tech badge-cyan">
                                    {allProblems.length.toLocaleString()} Problems Available
                                </span>
                            </div>
                            <h1 className="fw-bold text-white mb-1" style={{ letterSpacing: "-0.02em" }}>
                                Codeforces Problem Repository
                            </h1>
                            <p className="text-muted mb-0 small">
                                Search real-world algorithmic problems, preview cleaned statements with zero raw LaTeX artifacts, and import into your Question Bank.
                            </p>
                        </div>

                        <div className="d-flex flex-wrap gap-2">
                            <button
                                className="btn btn-secondary-dark"
                                onClick={handleSeedCurated}
                                disabled={seeding}
                                title="Seed 20+ top classic problems instantly"
                            >
                                <ZapIcon size={16} className={seeding ? "spin text-cyan-400" : "text-amber-400"} />
                                {seeding ? "Seeding..." : "⚡ Quick Seed 20+ Top Problems"}
                            </button>
                            <Link to="/questionbank" className="btn btn-primary-gradient">
                                <BookOpenIcon size={16} /> View Question Bank
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Import Target Settings */}
                <div className="glass-card p-4 mb-4">
                    <h6 className="fw-bold text-white mb-3 d-flex align-items-center gap-2">
                        <SparklesIcon size={16} className="text-indigo-400" /> Target Import Configuration
                    </h6>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label text-secondary small fw-semibold">Target Role Folder</label>
                            <input
                                type="text"
                                className="form-control form-control-custom fw-semibold text-white"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                placeholder="Coding"
                            />
                            <div className="text-secondary mt-1" style={{ fontSize: "0.75rem" }}>
                                Defaults to <strong className="text-cyan-400">Coding</strong> folder
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label text-secondary small fw-semibold">Target Domain</label>
                            <input
                                type="text"
                                className="form-control form-control-custom"
                                value={form.domain}
                                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                                placeholder="Algorithms"
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label text-secondary small fw-semibold">Difficulty Mapping</label>
                            <select
                                className="form-select form-control-custom"
                                value={form.difficulty}
                                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                            >
                                <option value="auto">Auto-detect from Codeforces Rating</option>
                                <option value="easy">Force Easy</option>
                                <option value="medium">Force Medium</option>
                                <option value="hard">Force Hard</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="glass-card p-3 mb-4">
                    <div className="row g-2 align-items-center">
                        <div className="col-lg-4">
                            <div className="input-group">
                                <span className="input-group-text bg-dark border-secondary border-opacity-25 text-muted">
                                    <SearchIcon size={16} />
                                </span>
                                <input
                                    type="text"
                                    className="form-control form-control-custom"
                                    placeholder="Search by problem name or ID (e.g., 4A, Watermelon, DP)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-md-3 col-6">
                            <select
                                className="form-select form-control-custom"
                                value={selectedTag}
                                onChange={(e) => setSelectedTag(e.target.value)}
                            >
                                <option value="all">All Algorithm Tags</option>
                                {TOP_TAGS.filter((t) => t !== "all").map((tag) => (
                                    <option key={tag} value={tag}>
                                        🏷️ {tag.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-3 col-6">
                            <select
                                className="form-select form-control-custom"
                                value={ratingTier}
                                onChange={(e) => setRatingTier(e.target.value)}
                            >
                                <option value="all">Rating: All Tiers</option>
                                <option value="easy">Easy (Rating ≤ 1100)</option>
                                <option value="medium">Medium (Rating 1200 - 1500)</option>
                                <option value="hard">Hard (Rating ≥ 1600)</option>
                            </select>
                        </div>

                        <div className="col-lg-2 col-12 d-flex justify-content-end">
                            <button
                                className="btn btn-primary-gradient w-100"
                                onClick={handleBatchImportTop}
                                disabled={batchImporting || filteredProblems.length === 0}
                                title="Import top 10 matching problems into question bank"
                            >
                                {batchImporting ? "Importing..." : "⚡ Import Top 10"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Problems Grid */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">
                        Showing <strong className="text-white">{Math.min(pageSize, filteredProblems.length)}</strong> of {filteredProblems.length} filtered problems
                    </span>
                    {filteredProblems.length > pageSize && (
                        <button
                            className="btn btn-sm btn-secondary-dark text-cyan-400"
                            onClick={() => setPageSize((prev) => prev + 30)}
                        >
                            Load More (+30)
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="p-5 text-center">
                        <div className="spinner-border text-indigo-400 mb-2" />
                        <p className="text-muted small mb-0">Connecting to Codeforces problemset index...</p>
                    </div>
                ) : filteredProblems.length === 0 ? (
                    <div className="glass-card p-5 text-center text-muted">
                        <CodeIcon size={44} className="text-secondary opacity-50 mb-3" />
                        <h5 className="text-white fw-bold mb-1">No Problems Found</h5>
                        <p className="mb-0 small">Try adjusting your search query, tag, or rating filter.</p>
                    </div>
                ) : (
                    <div className="row g-3">
                        {filteredProblems.slice(0, pageSize).map((p) => {
                            const key = `${p.contestId}-${p.index}`;
                            const isImported = importedSet.has(key);

                            return (
                                <div key={key} className="col-md-6 col-lg-4">
                                    <div
                                        className="glass-card p-4 h-100 d-flex flex-column justify-content-between hover-scale"
                                        style={{
                                            border: isImported
                                                ? "1px solid rgba(16, 185, 129, 0.4)"
                                                : "1px solid rgba(255, 255, 255, 0.12)",
                                            background: isImported
                                                ? "rgba(16, 185, 129, 0.05)"
                                                : "rgba(15, 23, 42, 0.65)"
                                        }}
                                    >
                                        <div>
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <h6 className="fw-bold text-white mb-0 text-truncate" style={{ maxWidth: "75%" }} title={p.name}>
                                                    {p.name}
                                                </h6>
                                                <span className="badge-tech badge-cyan fw-bold">
                                                    {p.contestId}{p.index}
                                                </span>
                                            </div>

                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <span className={`badge ${p.rating ? (p.rating <= 1100 ? "bg-success" : p.rating <= 1500 ? "bg-warning text-dark" : "bg-danger") : "bg-secondary"}`} style={{ fontSize: "0.72rem" }}>
                                                    ⭐ {p.rating || "Unrated"}
                                                </span>
                                                <span className="text-muted small">
                                                    {getCalculatedDifficulty(p.rating).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Tag Badges */}
                                            <div className="d-flex flex-wrap gap-1 mb-3">
                                                {p.tags?.slice(0, 3).map((tag, ti) => (
                                                    <span
                                                        key={ti}
                                                        className="badge bg-dark text-indigo-200 border border-indigo-500 border-opacity-30 px-2 py-1"
                                                        style={{ fontSize: "0.7rem" }}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                                {p.tags?.length > 3 && (
                                                    <span className="badge bg-dark text-secondary border border-secondary border-opacity-25" style={{ fontSize: "0.7rem" }}>
                                                        +{p.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="d-flex gap-2 pt-3 border-top border-secondary border-opacity-25">
                                            <button
                                                className="btn btn-secondary-dark btn-sm flex-grow-1"
                                                onClick={() => handleOpenPreview(p.contestId, p.index, p.name)}
                                            >
                                                👁️ Preview
                                            </button>
                                            <button
                                                className={`btn btn-sm ${isImported ? "btn-secondary-dark text-emerald-400" : "btn-primary-gradient"} px-3`}
                                                onClick={() => handleImport(p.contestId, p.index, p.rating)}
                                                disabled={importingId === key || isImported}
                                            >
                                                {importingId === key ? (
                                                    <span className="spinner-border spinner-border-sm" />
                                                ) : isImported ? (
                                                    <><CheckIcon size={14} /> Added</>
                                                ) : (
                                                    <><PlusIcon size={14} /> Import</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CodeforcesImporter;
