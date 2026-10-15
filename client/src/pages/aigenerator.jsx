import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
    SparklesIcon,
    BrainIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CheckIcon,
    LayersIcon,
    ZapIcon,
    FileTextIcon,
    CodeIcon
} from "../components/icons";
import Toast from "../components/Toast";

function AIGenerator() {
    const navigate = useNavigate();
    const [mode, setMode] = useState("topic"); // "topic" | "pdf" | "jd"

    // Preset State
    const [role, setRole] = useState("Full Stack Developer");
    const [domain, setDomain] = useState("React");
    const [difficulty, setDifficulty] = useState("medium");
    const [numQuestions, setNumQuestions] = useState(5);
    const [assessmentType, setAssessmentType] = useState("theory"); // "theory" | "coding" | "mixed"

    // PDF Assimilation State
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfAnalysisLoading, setPdfAnalysisLoading] = useState(false);
    const [pdfDigest, setPdfDigest] = useState(null);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [pdfCustomPrompt, setPdfCustomPrompt] = useState("");
    const [pdfTargetRole, setPdfTargetRole] = useState("");
    const [pdfTargetDifficulty, setPdfTargetDifficulty] = useState("medium");
    const [pdfAssessmentType, setPdfAssessmentType] = useState("theory");

    // JD Analyzer State
    const [jdText, setJdText] = useState("");
    const [jdFile, setJdFile] = useState(null);
    const [jdRoleOverride, setJdRoleOverride] = useState("");
    const [jdAssessmentType, setJdAssessmentType] = useState("mixed");
    const [jdDifficulty, setJdDifficulty] = useState("medium");
    const [jdNumQuestions, setJdNumQuestions] = useState(5);
    const [jdAnalysisResult, setJdAnalysisResult] = useState(null);
    const [jdLoading, setJdLoading] = useState(false);

    // Common Output State
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [launchingTest, setLaunchingTest] = useState(false);
    const [approvedMap, setApprovedMap] = useState({});
    const [toast, setToast] = useState({ show: false, message: "", type: "info" });

    const presets = [
        { role: "Full Stack Developer", domain: "React & Node.js", difficulty: "medium" },
        { role: "Frontend Engineer", domain: "React & TypeScript", difficulty: "medium" },
        { role: "Backend Developer", domain: "Node.js & MongoDB", difficulty: "hard" },
        { role: "System Architect", domain: "System Design & Microservices", difficulty: "hard" },
        { role: "Junior Web Developer", domain: "JavaScript & HTML/CSS", difficulty: "easy" }
    ];

    const handleApplyPreset = (p) => {
        setRole(p.role);
        setDomain(p.domain);
        setDifficulty(p.difficulty);
    };

    // Direct 1-Click Interview Launch with exact questions
    const handleLaunchDirectInterview = async (customRole, customDomain, specificQuestions) => {
        const qList = specificQuestions || questions;
        if (!qList || qList.length === 0) {
            setToast({ show: true, message: "No generated questions available to start test.", type: "warning" });
            return;
        }

        try {
            setLaunchingTest(true);
            const rTitle = customRole || role || "Full Stack Developer";
            const dDomain = customDomain || domain || "Technical Assessment";
            const qIds = qList.map(q => q._id).filter(Boolean);

            const res = await api.post("/interviews", {
                roleTitle: rTitle,
                domain: dDomain,
                limit: qList.length,
                assessmentType: mode === "jd" ? jdAssessmentType : (mode === "pdf" ? pdfAssessmentType : assessmentType),
                questionIds: qIds.length > 0 ? qIds : undefined
            });

            const interviewId = res.data.interviewId;
            const interviewQuestions = res.data.questions || qList;

            setToast({ show: true, message: "Launching your custom interview test room...", type: "success" });
            navigate(`/interview/${interviewId}`, {
                state: { questions: interviewQuestions }
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message || "Failed to initiate test session.",
                type: "error"
            });
        } finally {
            setLaunchingTest(false);
        }
    };

    // Direct 1-Click Adaptive Exam Launch
    const handleLaunchDirectAdaptive = async (customRole, customDomain) => {
        try {
            setLaunchingTest(true);
            const rTitle = customRole || role || "Full Stack Developer";
            const dDomain = customDomain || domain || "General";

            const res = await api.post("/adaptive/start", {
                roleTitle: rTitle,
                domain: dDomain
            });

            navigate(`/adaptive-interview/${res.data.interviewId}`);
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message || "Failed to start adaptive exam.",
                type: "error"
            });
        } finally {
            setLaunchingTest(false);
        }
    };

    // 1. Standard Preset Generator
    const generateQuestions = async () => {
        if (!role.trim() || !domain.trim()) {
            setToast({
                show: true,
                message: "Please provide both a Role and a Domain/Topic.",
                type: "warning"
            });
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/question/generate", {
                role: role.trim(),
                domain: domain.trim(),
                difficulty,
                num_question: Number(numQuestions)
            });

            const generated = response.data.question || [];
            setQuestions(generated);
            setToast({
                show: true,
                message: `Successfully generated ${generated.length} AI questions!`,
                type: "success"
            });
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to generate AI questions.";
            setToast({
                show: true,
                message: msg,
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    // 2. PDF Phase 1: Ingestion & Topic Assimilation
    const handleAnalyzePdf = async () => {
        if (!pdfFile) {
            setToast({ show: true, message: "Please select a PDF document first.", type: "warning" });
            return;
        }

        try {
            setPdfAnalysisLoading(true);
            setPdfDigest(null);
            setSelectedTopics([]);

            const formData = new FormData();
            formData.append("pdf", pdfFile);

            const response = await api.post("/question/analyze-pdf", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setPdfDigest(response.data);
            if (response.data.detectedDomain) {
                setPdfTargetRole(response.data.detectedDomain);
            }
            // Auto-select first two topics
            if (response.data.topics && response.data.topics.length > 0) {
                setSelectedTopics(response.data.topics.slice(0, 3).map(t => t.name));
            }

            setToast({
                show: true,
                message: `PDF assimilated! Extracted ${response.data.topics?.length || 0} core topics.`,
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message || "Failed to analyze PDF.",
                type: "error"
            });
        } finally {
            setPdfAnalysisLoading(false);
        }
    };

    // 2. PDF Phase 2: Generate Questions from Selected Topics
    const handleGenerateFromTopics = async () => {
        if (!pdfDigest) {
            setToast({ show: true, message: "Please assimilate a PDF first.", type: "warning" });
            return;
        }
        if (selectedTopics.length === 0) {
            setToast({ show: true, message: "Please select at least one topic card.", type: "warning" });
            return;
        }

        try {
            setLoading(true);
            const response = await api.post("/question/generate-from-topics", {
                pdfText: pdfDigest.fullText || pdfDigest.extractedTextSnippet || "",
                selectedTopics: selectedTopics,
                role: pdfTargetRole || "Software Engineer",
                domain: selectedTopics[0] || "General",
                difficulty: pdfTargetDifficulty,
                num_questions: Number(numQuestions),
                assessmentType: pdfAssessmentType,
                customPrompt: pdfCustomPrompt,
                autoSave: true
            });

            const generated = response.data.questions || [];
            setQuestions(generated);
            setToast({
                show: true,
                message: `Generated and added ${generated.length} questions to Question Bank!`,
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message || "Topic question generation failed.",
                type: "error"
            });
        } finally {
            setLoading(false);
        }
    };

    // 3. JD Semantic Analyzer
    const handleAnalyzeJD = async () => {
        if (!jdText.trim() && !jdFile) {
            setToast({ show: true, message: "Please paste a Job Description or upload a document.", type: "warning" });
            return;
        }

        try {
            setJdLoading(true);
            setJdAnalysisResult(null);

            const formData = new FormData();
            if (jdFile) formData.append("jdFile", jdFile);
            if (jdText) formData.append("jdText", jdText);
            if (jdRoleOverride) formData.append("roleOverride", jdRoleOverride);
            formData.append("num_questions", String(jdNumQuestions));
            formData.append("assessmentType", jdAssessmentType);
            formData.append("difficulty", jdDifficulty);

            const response = await api.post("/question/analyze-jd", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setJdAnalysisResult(response.data);
            setQuestions(response.data.questions || []);
            setToast({
                show: true,
                message: `Analyzed JD! Created ${response.data.questions?.length || 0} questions in ${response.data.roleTitle} folder.`,
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || err.message || "Failed to analyze Job Description.",
                type: "error"
            });
        } finally {
            setJdLoading(false);
        }
    };

    const handleApproveInline = async (id, index) => {
        try {
            if (id) {
                await api.patch(`/question/${id}/approve`);
            }
            setApprovedMap((prev) => ({ ...prev, [id || index]: true }));
            setToast({
                show: true,
                message: "Question approved and active in the Question Bank!",
                type: "success"
            });
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Approval failed.",
                type: "error"
            });
        }
    };

    const toggleTopicSelection = (topicName) => {
        setSelectedTopics(prev =>
            prev.includes(topicName)
                ? prev.filter(t => t !== topicName)
                : [...prev, topicName]
        );
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
                {/* Header */}
                <div className="glass-card p-4 p-md-5 mb-4 position-relative overflow-hidden">
                    <div
                        style={{
                            position: "absolute",
                            top: "-30px",
                            right: "-30px",
                            width: "200px",
                            height: "200px",
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)",
                            pointerEvents: "none"
                        }}
                    />

                    <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge-tech badge-indigo">
                            <SparklesIcon size={14} /> AI Intelligence Suite
                        </span>
                    </div>

                    <h1 className="fw-bold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
                        AI Question & Assessment Generator
                    </h1>

                    <p className="text-muted mb-4 fs-6" style={{ maxWidth: "650px" }}>
                        Generate calibrated interview questions via Topic Presets, Intelligent PDF Knowledge Assimilation, or Job Description (JD) Semantic Mapping.
                    </p>

                    {/* Navigation Tabs */}
                    <div className="d-flex flex-wrap gap-2">
                        <button
                            className={`btn btn-sm ${mode === "topic" ? "btn-primary-gradient" : "btn-secondary-dark"}`}
                            onClick={() => setMode("topic")}
                        >
                            <LayersIcon size={16} /> Role & Topic Presets
                        </button>
                        <button
                            className={`btn btn-sm ${mode === "pdf" ? "btn-primary-gradient" : "btn-secondary-dark"}`}
                            onClick={() => setMode("pdf")}
                        >
                            <FileTextIcon size={16} /> 📄 Adaptive PDF Assimilation
                        </button>
                        <button
                            className={`btn btn-sm ${mode === "jd" ? "btn-primary-gradient" : "btn-secondary-dark"}`}
                            onClick={() => setMode("jd")}
                        >
                            <ZapIcon size={16} /> 💼 Job Description (JD) Analyzer
                        </button>
                    </div>
                </div>

                <div className="row g-4">
                    {/* Left Generation Form */}
                    <div className="col-lg-5">
                        {/* TAB 1: PRESETS */}
                        {mode === "topic" && (
                            <div className="glass-card p-4">
                                <h4 className="fw-bold text-white mb-3">Topic Preset Parameters</h4>
                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">Quick Presets</label>
                                    <div className="d-flex flex-wrap gap-2">
                                        {presets.map((p, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                className="btn btn-secondary-dark btn-sm"
                                                onClick={() => handleApplyPreset(p)}
                                                style={{ fontSize: "0.78rem" }}
                                            >
                                                {p.role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">Target Role</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-custom"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        placeholder="e.g. Backend Developer"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">Domain / Tech Stack</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-custom"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                        placeholder="e.g. Node.js & PostgreSQL"
                                    />
                                </div>

                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className="form-label text-secondary small fw-semibold">Difficulty</label>
                                        <select
                                            className="form-select form-control-custom"
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label text-secondary small fw-semibold">Question Count</label>
                                        <select
                                            className="form-select form-control-custom"
                                            value={numQuestions}
                                            onChange={(e) => setNumQuestions(e.target.value)}
                                        >
                                            <option value={3}>3 Questions</option>
                                            <option value={5}>5 Questions</option>
                                            <option value={10}>10 Questions</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary-gradient w-100 py-2 mt-2"
                                    onClick={generateQuestions}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" />
                                            Generating AI Questions...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon size={16} /> Generate Questions
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* TAB 2: ADAPTIVE PDF ASSIMILATION */}
                        {mode === "pdf" && (
                            <div className="glass-card p-4">
                                <h4 className="fw-bold text-white mb-2">Adaptive PDF Ingestion</h4>
                                <p className="text-muted small mb-3">
                                    Upload any technical PDF (resume, chapter, cheat sheet, documentation) to extract topic modules and generate targeted questions.
                                </p>

                                {/* Phase 1: Upload & Extract */}
                                <div className="p-3 rounded-3 mb-3 border border-secondary border-opacity-25" style={{ background: "rgba(15, 23, 42, 0.4)" }}>
                                    <label className="form-label text-secondary small fw-semibold">1. Upload Technical Document</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="form-control form-control-custom mb-3"
                                        onChange={(e) => setPdfFile(e.target.files[0])}
                                    />
                                    <button
                                        className="btn btn-secondary-dark w-100 py-2 text-indigo-300"
                                        onClick={handleAnalyzePdf}
                                        disabled={pdfAnalysisLoading || !pdfFile}
                                    >
                                        {pdfAnalysisLoading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" />
                                                Assimilating Document...
                                            </>
                                        ) : (
                                            <>
                                                <BrainIcon size={16} /> Assimilate & Extract Topics
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Phase 2: Parameters */}
                                {pdfDigest && (
                                    <div className="mt-3">
                                        <label className="form-label text-secondary small fw-semibold">2. Configure Generation Parameters</label>
                                        <div className="mb-2">
                                            <input
                                                type="text"
                                                className="form-control form-control-custom mb-2"
                                                placeholder="Target Role (e.g. Backend Engineer)"
                                                value={pdfTargetRole}
                                                onChange={(e) => setPdfTargetRole(e.target.value)}
                                            />
                                        </div>

                                        <div className="row g-2 mb-2">
                                            <div className="col-6">
                                                <select
                                                    className="form-select form-control-custom"
                                                    value={pdfAssessmentType}
                                                    onChange={(e) => setPdfAssessmentType(e.target.value)}
                                                >
                                                    <option value="theory">Theory Questions</option>
                                                    <option value="coding">Coding Problems</option>
                                                    <option value="mixed">Mixed (Both)</option>
                                                </select>
                                            </div>
                                            <div className="col-6">
                                                <select
                                                    className="form-select form-control-custom"
                                                    value={pdfTargetDifficulty}
                                                    onChange={(e) => setPdfTargetDifficulty(e.target.value)}
                                                >
                                                    <option value="easy">Easy</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="hard">Hard</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <input
                                                type="text"
                                                className="form-control form-control-custom"
                                                placeholder="Custom Focus (e.g. Focus on edge cases & concurrency)"
                                                value={pdfCustomPrompt}
                                                onChange={(e) => setPdfCustomPrompt(e.target.value)}
                                            />
                                        </div>

                                        <button
                                            className="btn btn-primary-gradient w-100 py-2"
                                            onClick={handleGenerateFromTopics}
                                            disabled={loading || selectedTopics.length === 0}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Generating Targeted Questions...
                                                </>
                                            ) : (
                                                <>
                                                    <SparklesIcon size={16} /> Generate Questions from Selected Topics ({selectedTopics.length})
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: JOB DESCRIPTION ANALYZER */}
                        {mode === "jd" && (
                            <div className="glass-card p-4">
                                <h4 className="fw-bold text-white mb-2">Job Description (JD) Analyzer</h4>
                                <p className="text-muted small mb-3">
                                    Paste a Job Description or upload a job spec. The AI engine will extract competencies, auto-generate calibrated questions, save them to the Question Bank, and let you attempt them immediately.
                                </p>

                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">Paste Job Description Text</label>
                                    <textarea
                                        className="form-control form-control-custom"
                                        rows="6"
                                        placeholder="Paste full Job Description here (Requirements, Responsibilities, Tech Stack)..."
                                        value={jdText}
                                        onChange={(e) => setJdText(e.target.value)}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">Or Upload JD Document</label>
                                    <input
                                        type="file"
                                        accept=".txt,.pdf,.docx"
                                        className="form-control form-control-custom"
                                        onChange={(e) => setJdFile(e.target.files[0])}
                                    />
                                </div>

                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className="form-label text-secondary small fw-semibold">Assessment Type</label>
                                        <select
                                            className="form-select form-control-custom"
                                            value={jdAssessmentType}
                                            onChange={(e) => setJdAssessmentType(e.target.value)}
                                        >
                                            <option value="mixed">Mixed (Coding + Theory)</option>
                                            <option value="theory">Theory Only</option>
                                            <option value="coding">Coding Only</option>
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label text-secondary small fw-semibold">Count</label>
                                        <select
                                            className="form-select form-control-custom"
                                            value={jdNumQuestions}
                                            onChange={(e) => setJdNumQuestions(e.target.value)}
                                        >
                                            <option value={3}>3 Questions</option>
                                            <option value={5}>5 Questions</option>
                                            <option value={8}>8 Questions</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary-gradient w-100 py-2"
                                    onClick={handleAnalyzeJD}
                                    disabled={jdLoading || (!jdText.trim() && !jdFile)}
                                >
                                    {jdLoading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Analyzing JD & Generating Questions...
                                        </>
                                    ) : (
                                        <>
                                            <ZapIcon size={16} /> Ingest JD & Build Assessment
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Results & Interactive Workspace Area */}
                    <div className="col-lg-7">
                        {/* PDF Knowledge Assimilation Cards View */}
                        {mode === "pdf" && pdfDigest && (
                            <div className="glass-card p-4 mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <SparklesIcon size={18} className="text-cyan-400" />
                                        <h5 className="fw-bold text-white mb-0">Assimilated Document Digest</h5>
                                    </div>
                                    <span className="badge-tech badge-cyan">{pdfDigest.totalPages} Pages Analyzed</span>
                                </div>
                                <p className="text-muted small mb-3 p-3 rounded-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                                    {pdfDigest.summary}
                                </p>

                                <h6 className="fw-semibold text-secondary small text-uppercase mb-2">
                                    Extracted Topics (Click to select for Question Generation):
                                </h6>

                                <div className="d-flex flex-column gap-2 mb-2">
                                    {pdfDigest.topics?.map((topic, i) => {
                                        const isSelected = selectedTopics.includes(topic.name);
                                        return (
                                            <div
                                                key={i}
                                                onClick={() => toggleTopicSelection(topic.name)}
                                                className={`p-3 rounded-3 cursor-pointer transition-all ${
                                                    isSelected ? "border-indigo-500" : "border-secondary border-opacity-25"
                                                }`}
                                                style={{
                                                    background: isSelected ? "rgba(99, 102, 241, 0.12)" : "rgba(15, 23, 42, 0.4)",
                                                    border: "1px solid",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input mt-0"
                                                            checked={isSelected}
                                                            onChange={() => {}}
                                                        />
                                                        <strong className="text-white small">{topic.name}</strong>
                                                    </div>
                                                    <span className="badge-tech badge-pending" style={{ fontSize: "0.7rem" }}>
                                                        {topic.difficulty || "medium"}
                                                    </span>
                                                </div>
                                                <p className="text-muted mb-2 ms-4" style={{ fontSize: "0.8rem" }}>
                                                    {topic.description}
                                                </p>
                                                {topic.keywords && (
                                                    <div className="d-flex flex-wrap gap-1 ms-4">
                                                        {topic.keywords.map((kw, ki) => (
                                                            <span key={ki} className="badge bg-dark text-muted border border-secondary border-opacity-25" style={{ fontSize: "0.68rem" }}>
                                                                #{kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* JD Analysis Result Profile & Action Hub */}
                        {mode === "jd" && jdAnalysisResult && (
                            <div className="glass-card p-4 mb-4 border border-emerald-500 border-opacity-30">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <span className="badge-tech badge-emerald mb-2">🎯 JD Ingestion Complete</span>
                                        <h4 className="fw-bold text-white mb-1">{jdAnalysisResult.roleTitle}</h4>
                                        <p className="text-muted small mb-0">Seniority: <strong>{jdAnalysisResult.seniority || "Mid/Senior"}</strong> • Domain: <strong>{jdAnalysisResult.primaryDomain}</strong></p>
                                    </div>
                                </div>

                                <p className="text-muted small p-3 rounded-3 mb-3" style={{ background: "rgba(16, 185, 129, 0.05)" }}>
                                    {jdAnalysisResult.summary}
                                </p>

                                <div className="mb-4">
                                    <span className="text-secondary small fw-semibold d-block mb-2">Detected Tech Stack:</span>
                                    <div className="d-flex flex-wrap gap-2">
                                        {jdAnalysisResult.techStack?.map((skill, si) => (
                                            <span key={si} className="badge-tech badge-indigo">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Hub */}
                                <div className="p-3 rounded-3" style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="fw-bold text-white mb-0">⚡ Instant Assessment Action Hub</h6>
                                        <span className="badge-tech badge-cyan">{questions.length} Questions Ready</span>
                                    </div>
                                    <p className="text-muted small mb-3">
                                        Questions have been cataloged into the <strong>{jdAnalysisResult.roleTitle}</strong> Question Bank folder. You can immediately enter the test room or start an adaptive exam:
                                    </p>
                                    <div className="d-flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary-gradient btn-sm fw-semibold"
                                            disabled={launchingTest || questions.length === 0}
                                            onClick={() => handleLaunchDirectInterview(jdAnalysisResult.roleTitle, jdAnalysisResult.primaryDomain, questions)}
                                        >
                                            {launchingTest ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Starting Session...
                                                </>
                                            ) : (
                                                <>
                                                    🚀 Start Interview With These {questions.length} Questions Now
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary-dark btn-sm text-amber-300"
                                            disabled={launchingTest}
                                            onClick={() => handleLaunchDirectAdaptive(jdAnalysisResult.roleTitle, jdAnalysisResult.primaryDomain)}
                                        >
                                            ⚡ Take Adaptive Exam
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary-dark btn-sm text-cyan-300"
                                            onClick={() => navigate("/questionbank", { state: { activeRole: jdAnalysisResult.roleTitle } })}
                                        >
                                            📂 View in Question Bank ({jdAnalysisResult.roleTitle})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Generated Questions List */}
                        <div className="glass-card p-4">
                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                                <div>
                                    <h5 className="fw-bold text-white mb-0">Generated Questions Preview ({questions.length})</h5>
                                    <span className="text-muted small">All questions are saved to your Question Bank</span>
                                </div>
                                {questions.length > 0 && (
                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary-gradient btn-sm"
                                            disabled={launchingTest}
                                            onClick={() => handleLaunchDirectInterview(
                                                mode === "jd" ? jdAnalysisResult?.roleTitle : (mode === "pdf" ? pdfTargetRole : role),
                                                mode === "jd" ? jdAnalysisResult?.primaryDomain : (mode === "pdf" ? selectedTopics.join(", ") : domain),
                                                questions
                                            )}
                                        >
                                            🚀 Start Test Now
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary-dark btn-sm text-indigo-400"
                                            onClick={() => navigate("/questionbank", {
                                                state: { activeRole: mode === "jd" ? jdAnalysisResult?.roleTitle : (mode === "pdf" ? pdfTargetRole : role) }
                                            })}
                                        >
                                            Open Bank <ArrowRightIcon size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {questions.length === 0 ? (
                                <div className="p-5 text-center text-muted">
                                    <SparklesIcon size={40} className="text-secondary opacity-50 mb-3" />
                                    <p className="mb-0">No questions generated yet. Choose a mode on the left and trigger generation.</p>
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {questions.map((q, idx) => {
                                        const isApproved = approvedMap[q._id || idx] || q.status === "approved";
                                        const isCoding = q.assessmentType === "coding" || q.type === "coding";

                                        return (
                                            <div key={q._id || idx} className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ background: "rgba(15, 23, 42, 0.5)" }}>
                                                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="badge-tech badge-cyan">Q{idx + 1}</span>
                                                        <span className={`badge-tech ${isCoding ? "badge-indigo" : "badge-emerald"}`} style={{ fontSize: "0.72rem" }}>
                                                            {isCoding ? "Coding" : "Theory"}
                                                        </span>
                                                        <span className="badge-tech badge-pending" style={{ fontSize: "0.72rem" }}>
                                                            {q.difficulty || "medium"}
                                                        </span>
                                                    </div>
                                                    {isApproved ? (
                                                        <span className="badge-tech badge-approved">
                                                            <CheckIcon size={12} /> Active in Bank
                                                        </span>
                                                    ) : (
                                                        <button
                                                            className="btn btn-sm btn-secondary-dark text-emerald-400"
                                                            onClick={() => handleApproveInline(q._id, idx)}
                                                            style={{ fontSize: "0.78rem" }}
                                                        >
                                                            Approve Question
                                                        </button>
                                                    )}
                                                </div>

                                                <h6 className="text-white fw-semibold mb-2">{q.questionText}</h6>

                                                {q.idealAnswer && (
                                                    <div className="p-2 rounded bg-dark bg-opacity-50 text-muted small font-monospace mb-2" style={{ fontSize: "0.8rem" }}>
                                                        <strong className="text-secondary d-block">Model Answer / Criteria:</strong>
                                                        {q.idealAnswer.slice(0, 180)}...
                                                    </div>
                                                )}

                                                {q.keypoint && q.keypoint.length > 0 && (
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {q.keypoint.map((kp, kpi) => (
                                                            <span key={kpi} className="badge bg-secondary bg-opacity-25 text-light" style={{ fontSize: "0.68rem" }}>
                                                                ✓ {kp}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AIGenerator;