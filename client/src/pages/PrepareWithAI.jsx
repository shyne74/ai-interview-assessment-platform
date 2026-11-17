import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    FileText,
    Briefcase,
    UploadCloud,
    Check,
    AlertCircle,
    X,
    ArrowRight,
    Clock,
    RotateCcw,
    Sparkles,
    Layers,
    FileCheck2
} from "lucide-react";
import api from "../utils/api";

export default function PrepareWithAI() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Mode: "pdf" | "jd"
    const activeMode = searchParams.get("mode") === "jd" ? "jd" : "pdf";
    const setMode = (m) => setSearchParams({ mode: m });

    // ==========================================
    // PDF Preparation State
    // ==========================================
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfStep, setPdfStep] = useState(1); // 1: Upload, 2: Review topics & Configure, 3: Preview questions
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState("");
    const [pdfText, setPdfText] = useState("");
    const [pdfSummary, setPdfSummary] = useState("");
    const [detectedDomain, setDetectedDomain] = useState("");
    const [pdfTotalPages, setPdfTotalPages] = useState(1);
    const [extractedTopics, setExtractedTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [customPdfTopics, setCustomPdfTopics] = useState([]);
    const [customPdfInput, setCustomPdfInput] = useState("");
    const [pdfQuestionCount, setPdfQuestionCount] = useState(5);
    const [pdfDifficulty, setPdfDifficulty] = useState("Medium");
    const [pdfFormat, setPdfFormat] = useState("Theory");
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [startingPdfExam, setStartingPdfExam] = useState(false);

    // Upload zone drag state & staged analysis text
    const [isDragging, setIsDragging] = useState(false);
    const [analysisStage, setAnalysisStage] = useState("Reading pages");

    useEffect(() => {
        if (!pdfLoading) {
            setAnalysisStage("Reading pages");
            return;
        }
        const timer1 = setTimeout(() => setAnalysisStage("Finding topics"), 1600);
        const timer2 = setTimeout(() => setAnalysisStage("Preparing review"), 3400);
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [pdfLoading]);

    // ==========================================
    // Job Description Practice State
    // ==========================================
    const [jdText, setJdText] = useState("");
    const [jdStep, setJdStep] = useState(1); // 1: Input & Configure, 2: Competency Breakdown & Preview
    const [jdLoading, setJdLoading] = useState(false);
    const [jdError, setJdError] = useState("");
    const [jdQuestionCount, setJdQuestionCount] = useState(5);
    const [jdDifficulty, setJdDifficulty] = useState("medium");
    const [jdFormat, setJdFormat] = useState("mixed");
    const [jdResult, setJdResult] = useState(null);
    const [startingJdExam, setStartingJdExam] = useState(false);

    // ==============================================================
    // PDF FILE VALIDATION & DRAG HANDLERS
    // ==============================================================
    const validateAndSetPdf = (file) => {
        setPdfError("");
        if (!file) return;

        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            setPdfError("Only PDF documents are supported. Please select a valid .pdf file.");
            return;
        }

        const MAX_SIZE_MB = 25;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setPdfError(`File size exceeds ${MAX_SIZE_MB} MB. Please upload a smaller document.`);
            return;
        }

        setPdfFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndSetPdf(e.dataTransfer.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setPdfFile(null);
        setPdfError("");
        setPdfText("");
        setExtractedTopics([]);
        setSelectedTopics([]);
        setCustomPdfTopics([]);
        setGeneratedQuestions([]);
    };

    // ==============================================================
    // PDF API HANDLERS
    // ==============================================================
    const handleAnalyzePdf = async () => {
        if (!pdfFile) {
            setPdfError("Choose a PDF to continue.");
            return;
        }
        setPdfLoading(true);
        setPdfError("");
        setGeneratedQuestions([]);
        try {
            const formData = new FormData();
            formData.append("pdf", pdfFile);
            const res = await api.post("/question/analyze-pdf", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const data = res.data;

            if (!data.topics || data.topics.length === 0) {
                throw new Error("No structured topics could be extracted from this document. Please ensure it contains readable text.");
            }

            setPdfText(data.fullText || data.extractedTextSnippet || "");
            setPdfSummary(data.summary || "");
            setDetectedDomain(data.detectedDomain || "Document Analysis");
            setPdfTotalPages(data.totalPages || 1);
            setExtractedTopics(data.topics);

            // Select all detected topics by default
            setSelectedTopics(data.topics.map((t) => (typeof t === "string" ? t : t.name)));
            setPdfStep(2);
        } catch (err) {
            console.error("PDF analysis error:", err);
            setPdfError(
                err.response?.data?.message ||
                err.response?.data?.detail ||
                err.message ||
                "Failed to analyze PDF content. Please check that the PDF is not encrypted."
            );
        } finally {
            setPdfLoading(false);
        }
    };

    const togglePdfTopic = (topicName) => {
        if (selectedTopics.includes(topicName)) {
            setSelectedTopics(selectedTopics.filter((t) => t !== topicName));
        } else {
            setSelectedTopics([...selectedTopics, topicName]);
        }
    };

    const handleSelectAllTopics = () => {
        const allNames = extractedTopics.map((t) => (typeof t === "string" ? t : t.name));
        setSelectedTopics(allNames);
    };

    const handleClearTopics = () => {
        setSelectedTopics([]);
    };

    const handleAddCustomPdfTopic = (e) => {
        if (e) e.preventDefault();
        const trimmed = customPdfInput.trim();
        if (!trimmed) return;
        if (!customPdfTopics.includes(trimmed)) {
            setCustomPdfTopics([...customPdfTopics, trimmed]);
        }
        setCustomPdfInput("");
    };

    const handleRemoveCustomPdfTopic = (topic) => {
        setCustomPdfTopics(customPdfTopics.filter((t) => t !== topic));
    };

    const handlePreviewPdfQuestions = async () => {
        if (selectedTopics.length === 0 && customPdfTopics.length === 0) return;
        setPdfLoading(true);
        setPdfError("");
        try {
            const combined = Array.from(new Set([...selectedTopics, ...customPdfTopics]));
            const res = await api.post("/question/generate-from-topics", {
                pdfText: pdfText,
                selectedTopics: combined,
                role: detectedDomain || "Document Analysis",
                domain: selectedTopics[0] || detectedDomain || "Document Study",
                difficulty: pdfDifficulty.toLowerCase(),
                num_questions: Number(pdfQuestionCount),
                assessmentType: pdfFormat.toLowerCase(),
                autoSave: true
            });
            const qs = res.data.questions || [];
            if (qs.length === 0) {
                throw new Error("No questions could be generated for the selected topics.");
            }
            setGeneratedQuestions(qs);
            setPdfStep(3);
        } catch (err) {
            console.error("PDF Question preview error:", err);
            setPdfError(err.response?.data?.message || err.message || "Failed to preview questions.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleStartPdfAssessment = async () => {
        if (startingPdfExam) return;
        setStartingPdfExam(true);
        setPdfError("");
        try {
            const combined = Array.from(new Set([...selectedTopics, ...customPdfTopics]));
            const durationMinutes = pdfQuestionCount <= 3 ? 15 : pdfQuestionCount <= 5 ? 25 : pdfQuestionCount <= 8 ? 40 : 50;

            const payload = {
                roleTitle: detectedDomain || "Document Analysis",
                domain: selectedTopics[0] || detectedDomain || "Document Study",
                selectedTopics: combined,
                customTopics: customPdfTopics,
                assessmentType: pdfFormat.toLowerCase(),
                difficulty: pdfDifficulty.toLowerCase(),
                limit: pdfQuestionCount,
                durationSeconds: durationMinutes * 60,
                generateWithAI: true,
                pdfText: pdfText,
                interviewType: "pdf-prep"
            };

            if (generatedQuestions.length > 0) {
                payload.questionIds = generatedQuestions.map(q => q._id).filter(Boolean);
            }

            const res = await api.post("/interviews", payload);
            const interviewId = res.data.interviewId;

            localStorage.setItem("activeInterviewId", interviewId);
            navigate(`/interview/${interviewId}`, { replace: true });
        } catch (err) {
            console.error("Launch PDF exam error:", err);
            setPdfError(err.response?.data?.message || "Could not launch PDF assessment. Please retry.");
            setStartingPdfExam(false);
        }
    };

    // ==============================================================
    // JOB DESCRIPTION HANDLERS
    // ==============================================================
    const handleAnalyzeJd = async () => {
        if (!jdText.trim()) {
            setJdError("Please enter or paste the job description text.");
            return;
        }

        setJdLoading(true);
        setJdError("");
        try {
            const payload = {
                jdText: jdText.trim(),
                num_questions: Number(jdQuestionCount),
                difficulty: jdDifficulty.toLowerCase(),
                assessmentType: jdFormat.toLowerCase()
            };

            const res = await api.post("/question/analyze-jd", payload);
            const data = res.data;

            if (!data.questions || data.questions.length === 0) {
                throw new Error("Could not extract technical competencies from this job description. Please ensure it specifies technical requirements.");
            }

            setJdResult(data);
            setJdStep(2);
        } catch (err) {
            console.error("JD analysis error:", err);
            setJdError(err.response?.data?.message || err.message || "Failed to analyze job description.");
        } finally {
            setJdLoading(false);
        }
    };

    const handleStartJdAssessment = async () => {
        if (!jdResult || startingJdExam) return;
        setStartingJdExam(true);
        setJdError("");

        try {
            const questions = jdResult.questions || [];
            const durationMinutes = jdQuestionCount <= 3 ? 15 : jdQuestionCount <= 5 ? 25 : 40;

            const payload = {
                roleTitle: jdResult.roleTitle || "Software Engineer",
                domain: jdResult.primaryDomain || "Technical Competencies",
                assessmentType: jdFormat.toLowerCase(),
                difficulty: jdDifficulty.toLowerCase(),
                limit: questions.length,
                durationSeconds: durationMinutes * 60,
                generateWithAI: false,
                questionIds: questions.map(q => q._id).filter(Boolean),
                interviewType: "jd-practice"
            };

            const res = await api.post("/interviews", payload);
            const interviewId = res.data.interviewId;

            localStorage.setItem("activeInterviewId", interviewId);
            navigate(`/interview/${interviewId}`, { replace: true });
        } catch (err) {
            console.error("Launch JD exam error:", err);
            setJdError(err.response?.data?.message || "Could not launch tailored assessment.");
            setStartingJdExam(false);
        }
    };

    const loadSampleJd = () => {
        setJdText(
            "Senior Backend Engineer (Node.js / Distributed Systems)\n\n" +
            "Key Responsibilities:\n" +
            "• Design and maintain scalable microservices using Node.js, Express, and TypeScript.\n" +
            "• Architect resilient data models using MongoDB and PostgreSQL with robust index optimization.\n" +
            "• Build high-throughput event-driven messaging pipelines using Kafka or RabbitMQ.\n" +
            "• Containerize services using Docker and manage deployments on Kubernetes.\n" +
            "• Implement distributed caching strategies with Redis (cache-aside, write-through, TTL invalidation).\n\n" +
            "Requirements:\n" +
            "• 4+ years backend engineering experience.\n" +
            "• Deep understanding of concurrency, async I/O, database indexing, and REST/gRPC API design."
        );
        setJdError("");
    };

    // Format file size nicely
    const formatFileSize = (bytes) => {
        if (!bytes) return "0 KB";
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(0)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    };

    // Stepper definition
    const pdfSteps = [
        { num: 1, label: "Upload PDF", reachable: true },
        { num: 2, label: "Review topics", reachable: extractedTopics.length > 0 },
        { num: 3, label: "Practise", reachable: generatedQuestions.length > 0 || (pdfStep === 2 && selectedTopics.length > 0) }
    ];

    return (
        <div className="prepare-page" style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1120px", margin: "0 auto" }}>
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .prepare-fade-in {
                    animation: fadeInUp 0.26s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .prepare-fade-in {
                        animation: none !important;
                        opacity: 1 !important;
                        transform: none !important;
                    }
                }

                /* Source Selector Tabs */
                .source-tab-btn {
                    flex: 1;
                    padding: 14px 20px;
                    background-color: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    cursor: pointer;
                    outline: none;
                    transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
                    text-align: left;
                }
                .source-tab-btn:hover {
                    border-color: #cbd5e1;
                    background-color: #f8fafc;
                    transform: translateY(-1px);
                }
                .source-tab-btn.active {
                    border-color: #16a34a;
                    background-color: #f0fdf4;
                    box-shadow: 0 4px 14px rgba(22, 163, 74, 0.08);
                }
                .source-tab-btn:focus-visible {
                    box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.25);
                }

                /* Upload Dropzone */
                .upload-dropzone {
                    border: 2px dashed #cbd5e1;
                    border-radius: 12px;
                    padding: 44px 24px;
                    text-align: center;
                    background-color: #f8fafc;
                    transition: border-color 0.18s ease, background-color 0.18s ease;
                    outline: none;
                }
                .upload-dropzone.dragging {
                    border-color: #16a34a !important;
                    background-color: #f0fdf4 !important;
                }

                /* Topic selection cards */
                .topic-select-row {
                    padding: 12px 14px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background-color: #ffffff;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    transition: all 0.14s ease;
                    outline: none;
                }
                .topic-select-row:hover {
                    border-color: #cbd5e1;
                    background-color: #fcfcfc;
                }
                .topic-select-row.selected {
                    border-color: #16a34a;
                    background-color: #f0fdf4;
                }
                .topic-select-row:focus-visible {
                    box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.35);
                }

                /* Step number badge */
                .step-number-circle {
                    width: 26px;
                    height: 26px;
                    border-radius: 9999px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                @media (max-width: 768px) {
                    .source-tabs-grid {
                        flex-direction: column !important;
                    }
                    .prepare-content-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .stepper-nav {
                        flex-wrap: wrap;
                        gap: 8px !important;
                    }
                }
            `}</style>

            {/* Header */}
            <div className="prepare-fade-in">
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Prepare with AI
                </h1>
                <p style={{
                    fontSize: "15px",
                    color: "#475569",
                    margin: 0,
                    lineHeight: "1.5",
                    maxWidth: "680px"
                }}>
                    Turn study textbooks, research papers, or target job descriptions into tailored assessments.
                </p>
            </div>

            {/* Source Selector at the Top */}
            <div className="source-tabs-grid prepare-fade-in" style={{ display: "flex", gap: "16px" }}>
                {/* PDF Preparation Tab */}
                <button
                    type="button"
                    className={`source-tab-btn ${activeMode === "pdf" ? "active" : ""}`}
                    onClick={() => setMode("pdf")}
                >
                    <div style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        backgroundColor: activeMode === "pdf" ? "#dcfce7" : "#f1f5f9",
                        border: activeMode === "pdf" ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: activeMode === "pdf" ? "#16a34a" : "#64748b",
                        flexShrink: 0
                    }}>
                        <FileText size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <div style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: activeMode === "pdf" ? "#0f172a" : "#334155",
                            marginBottom: "2px"
                        }}>
                            PDF preparation
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                            Upload notes, papers, or book chapters
                        </div>
                    </div>
                </button>

                {/* Job Description Practice Tab */}
                <button
                    type="button"
                    className={`source-tab-btn ${activeMode === "jd" ? "active" : ""}`}
                    onClick={() => setMode("jd")}
                >
                    <div style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        backgroundColor: activeMode === "jd" ? "#dcfce7" : "#f1f5f9",
                        border: activeMode === "jd" ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: activeMode === "jd" ? "#16a34a" : "#64748b",
                        flexShrink: 0
                    }}>
                        <Briefcase size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <div style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: activeMode === "jd" ? "#0f172a" : "#334155",
                            marginBottom: "2px"
                        }}>
                            Job-description practice
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                            Match requirements from a specific role
                        </div>
                    </div>
                </button>
            </div>

            {/* ============================================================== */}
            {/* MODE 1: PDF PREPARATION                                        */}
            {/* ============================================================== */}
            {activeMode === "pdf" && (
                <div key="pdf-container" className="prepare-fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                    
                    {/* Stepper with real state */}
                    <div className="stepper-nav" style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 18px",
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px"
                    }}>
                        {pdfSteps.map((step, idx) => {
                            const isCompleted = pdfStep > step.num;
                            const isCurrent = pdfStep === step.num;
                            const isMuted = !isCompleted && !isCurrent;

                            return (
                                <React.Fragment key={step.num}>
                                    <button
                                        type="button"
                                        disabled={!step.reachable}
                                        onClick={() => { if (step.reachable) setPdfStep(step.num); }}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            background: "none",
                                            border: "none",
                                            padding: 0,
                                            cursor: step.reachable ? "pointer" : "default",
                                            color: isCurrent ? "#0f172a" : isCompleted ? "#16a34a" : "#94a3b8",
                                            fontWeight: isCurrent ? "700" : "500",
                                            fontSize: "13px"
                                        }}
                                    >
                                        <span style={{
                                            width: "22px",
                                            height: "22px",
                                            borderRadius: "9999px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: isCompleted ? "#16a34a" : isCurrent ? "#0f172a" : "#e2e8f0",
                                            color: isMuted ? "#64748b" : "#ffffff",
                                            fontSize: "11px",
                                            fontWeight: "700"
                                        }}>
                                            {isCompleted ? <Check size={12} strokeWidth={3} /> : step.num}
                                        </span>
                                        <span>{step.label}</span>
                                    </button>

                                    {idx < pdfSteps.length - 1 && (
                                        <span style={{ color: "#cbd5e1", fontSize: "14px" }}>→</span>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* PDF Error Alert */}
                    {pdfError && (
                        <div style={{
                            padding: "12px 16px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "10px",
                            color: "#991b1b",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <AlertCircle size={16} color="#dc2626" />
                                <span>{pdfError}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPdfError("")}
                                style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", padding: "2px" }}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    {/* STEP 1: Upload Dropzone & How it Works */}
                    {pdfStep === 1 && (
                        <div className="prepare-content-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
                            {/* Upload Area Card */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "28px" }}>
                                <h2 style={{ fontSize: "17px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px 0" }}>
                                    Choose your document
                                </h2>

                                {!pdfFile ? (
                                    /* Interactive Upload Dropzone */
                                    <div
                                        className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                document.getElementById("pdf-file-input")?.click();
                                            }
                                        }}
                                    >
                                        <div style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: "12px",
                                            backgroundColor: isDragging ? "#dcfce7" : "#f1f5f9",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: isDragging ? "#16a34a" : "#64748b",
                                            marginBottom: "12px"
                                        }}>
                                            <UploadCloud size={24} strokeWidth={2} />
                                        </div>

                                        <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>
                                            {isDragging ? "Release to upload" : "Drop a PDF here or choose a file"}
                                        </div>

                                        <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "18px" }}>
                                            Supports textbooks, study notes, lecture slides, and research papers up to 25 MB.
                                        </div>

                                        <label
                                            htmlFor="pdf-file-input"
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "9px 20px",
                                                backgroundColor: "#ffffff",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "8px",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                                color: "#0f172a",
                                                cursor: "pointer",
                                                boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                                            }}
                                        >
                                            Choose PDF
                                            <input
                                                id="pdf-file-input"
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        validateAndSetPdf(e.target.files[0]);
                                                    }
                                                }}
                                                style={{ display: "none" }}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    /* File Card Replacement */
                                    <div style={{
                                        border: "1px solid #bbf7d0",
                                        borderRadius: "12px",
                                        padding: "20px",
                                        backgroundColor: "#f0fdf4",
                                        marginBottom: "20px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "16px"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                            <div style={{
                                                width: "42px",
                                                height: "42px",
                                                borderRadius: "10px",
                                                backgroundColor: "#ffffff",
                                                border: "1px solid #86efac",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#16a34a",
                                                flexShrink: 0
                                            }}>
                                                <FileCheck2 size={22} strokeWidth={2} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "2px", wordBreak: "break-all" }}>
                                                    {pdfFile.name}
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#166534" }}>
                                                    {formatFileSize(pdfFile.size)} · Ready for topic extraction
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleRemoveFile}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "#64748b",
                                                fontSize: "13px",
                                                fontWeight: "500",
                                                cursor: "pointer",
                                                padding: "6px 10px",
                                                borderRadius: "6px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
                                        >
                                            <X size={14} />
                                            Remove
                                        </button>
                                    </div>
                                )}

                                {/* Action button or staged progress */}
                                <div style={{ marginTop: "24px" }}>
                                    {pdfLoading ? (
                                        <div style={{
                                            padding: "14px 20px",
                                            backgroundColor: "#f0fdf4",
                                            border: "1px solid #86efac",
                                            borderRadius: "8px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "12px"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div style={{
                                                    width: "14px",
                                                    height: "14px",
                                                    borderRadius: "50%",
                                                    border: "2px solid #16a34a",
                                                    borderTopColor: "transparent",
                                                    animation: "spin 0.8s linear infinite"
                                                }} />
                                                <span style={{ fontSize: "14px", fontWeight: "600", color: "#15803d" }}>
                                                    {analysisStage}...
                                                </span>
                                            </div>
                                            <span style={{ fontSize: "12px", color: "#166534" }}>Extracting topics</span>
                                        </div>
                                    ) : (
                                        <div>
                                            <button
                                                type="button"
                                                onClick={handleAnalyzePdf}
                                                disabled={!pdfFile}
                                                style={{
                                                    backgroundColor: !pdfFile ? "#94a3b8" : "#16a34a",
                                                    color: "#ffffff",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    padding: "12px 24px",
                                                    fontSize: "14px",
                                                    fontWeight: "600",
                                                    cursor: !pdfFile ? "not-allowed" : "pointer",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    transition: "background-color 0.15s ease"
                                                }}
                                                onMouseEnter={(e) => { if (pdfFile) e.currentTarget.style.backgroundColor = "#15803d"; }}
                                                onMouseLeave={(e) => { if (pdfFile) e.currentTarget.style.backgroundColor = "#16a34a"; }}
                                            >
                                                Analyse document
                                                <ArrowRight size={15} />
                                            </button>

                                            {!pdfFile && (
                                                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
                                                    Choose a PDF to continue
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* How It Works: Numbered Step Cards */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "28px" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 18px 0" }}>
                                    How it works
                                </h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {/* Step 1 */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        padding: "12px 14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                        borderRadius: "10px"
                                    }}>
                                        <div className="step-number-circle" style={{ backgroundColor: "#16a34a", color: "#ffffff" }}>
                                            1
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "2px" }}>
                                                Content extraction
                                            </div>
                                            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                                We read the text and structural sections across your document.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 2 */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        padding: "12px 14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                        borderRadius: "10px"
                                    }}>
                                        <div className="step-number-circle" style={{ backgroundColor: "#16a34a", color: "#ffffff" }}>
                                            2
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "2px" }}>
                                                Topic identification
                                            </div>
                                            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                                AI identifies the primary domain, core theorems, and key technical concepts.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 3 */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        padding: "12px 14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                        borderRadius: "10px"
                                    }}>
                                        <div className="step-number-circle" style={{ backgroundColor: "#16a34a", color: "#ffffff" }}>
                                            3
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "2px" }}>
                                                Targeted practice
                                            </div>
                                            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                                Questions test your understanding directly from your uploaded material.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 & 3: Review Topics & Configure Parameters */}
                    {(pdfStep === 2 || pdfStep === 3) && (
                        <div className="prepare-content-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
                            {/* Left Column: Topics from Document */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "26px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                        Domain: {detectedDomain.toUpperCase()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPdfStep(1)}
                                        style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer", fontWeight: "500" }}
                                    >
                                        Change PDF
                                    </button>
                                </div>

                                <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "0 0 8px 0" }}>
                                    Topics extracted from document
                                </h2>

                                {pdfSummary && (
                                    <div style={{
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "8px",
                                        padding: "12px 14px",
                                        fontSize: "13px",
                                        color: "#475569",
                                        lineHeight: 1.5,
                                        marginBottom: "16px"
                                    }}>
                                        {pdfSummary}
                                    </div>
                                )}

                                {/* Topic Counter & Select All / Clear Actions */}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "14px",
                                    paddingBottom: "10px",
                                    borderBottom: "1px solid #f1f5f9"
                                }}>
                                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                                        {selectedTopics.length} of {extractedTopics.length} topics selected
                                    </span>
                                    <div style={{ display: "flex", gap: "12px" }}>
                                        <button
                                            type="button"
                                            onClick={handleSelectAllTopics}
                                            style={{ background: "none", border: "none", color: "#16a34a", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}
                                        >
                                            Select all
                                        </button>
                                        <span style={{ color: "#cbd5e1" }}>•</span>
                                        <button
                                            type="button"
                                            onClick={handleClearTopics}
                                            style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", fontWeight: "500", cursor: "pointer", padding: 0 }}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {/* Extracted Topics List */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                                    {extractedTopics.map((topic, idx) => {
                                        const name = typeof topic === "string" ? topic : topic.name;
                                        const desc = typeof topic === "string" ? "" : topic.description;
                                        const diff = typeof topic === "string" ? "Medium" : (topic.difficulty || "Medium");
                                        const isChecked = selectedTopics.includes(name);

                                        return (
                                            <div
                                                key={idx}
                                                className={`topic-select-row ${isChecked ? "selected" : ""}`}
                                                tabIndex={0}
                                                onClick={() => togglePdfTopic(name)}
                                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") togglePdfTopic(name); }}
                                            >
                                                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}}
                                                        style={{ marginTop: "3px", cursor: "pointer", accentColor: "#16a34a" }}
                                                    />
                                                    <div>
                                                        <div style={{ fontSize: "14px", fontWeight: isChecked ? "600" : "500", color: isChecked ? "#15803d" : "#0f172a" }}>
                                                            {name}
                                                        </div>
                                                        {desc && (
                                                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", lineHeight: 1.4 }}>
                                                                {desc}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <span style={{
                                                    fontSize: "11px",
                                                    textTransform: "capitalize",
                                                    color: "#64748b",
                                                    backgroundColor: "#f1f5f9",
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    fontWeight: "600",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                    {diff}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Custom Subtopics */}
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Add custom subtopic from document
                                    </label>
                                    <form onSubmit={handleAddCustomPdfTopic} style={{ display: "flex", gap: "8px" }}>
                                        <input
                                            type="text"
                                            placeholder="e.g. Chapter 4 edge cases or specific algorithm..."
                                            value={customPdfInput}
                                            onChange={(e) => setCustomPdfInput(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: "9px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "13px",
                                                backgroundColor: "#f8fafc",
                                                outline: "none"
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            style={{
                                                backgroundColor: "#0f172a",
                                                color: "#ffffff",
                                                border: "none",
                                                borderRadius: "6px",
                                                padding: "9px 14px",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                                cursor: "pointer"
                                            }}
                                        >
                                            + Add
                                        </button>
                                    </form>

                                    {customPdfTopics.length > 0 && (
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                                            {customPdfTopics.map((ct) => (
                                                <span
                                                    key={ct}
                                                    style={{
                                                        backgroundColor: "#f0fdf4",
                                                        border: "1px solid #bbf7d0",
                                                        borderRadius: "16px",
                                                        padding: "3px 10px",
                                                        fontSize: "12px",
                                                        color: "#166534",
                                                        fontWeight: "600",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "6px"
                                                    }}
                                                >
                                                    {ct}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCustomPdfTopic(ct)}
                                                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Parameters & Start Assessment */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px" }}>
                                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px 0" }}>
                                        Assessment parameters
                                    </h3>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                                Question count
                                            </label>
                                            <select
                                                value={pdfQuestionCount}
                                                onChange={(e) => setPdfQuestionCount(Number(e.target.value))}
                                                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                                            >
                                                <option value={3}>3 questions (Fast Check · 15m)</option>
                                                <option value={5}>5 questions (Standard · 25m)</option>
                                                <option value={8}>8 questions (Deep Dive · 40m)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                                Difficulty
                                            </label>
                                            <select
                                                value={pdfDifficulty}
                                                onChange={(e) => setPdfDifficulty(e.target.value)}
                                                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                                            >
                                                <option value="Easy">Easy (Foundational)</option>
                                                <option value="Medium">Medium (Applied Analysis)</option>
                                                <option value="Hard">Hard (Deep Critical Thinking)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                                Format
                                            </label>
                                            <select
                                                value={pdfFormat}
                                                onChange={(e) => setPdfFormat(e.target.value)}
                                                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                                            >
                                                <option value="Theory">Conceptual Analysis & Principles</option>
                                                <option value="Mixed">Mixed (Concepts + Practical)</option>
                                                <option value="Coding">Coding Implementation</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleStartPdfAssessment}
                                        disabled={startingPdfExam || (selectedTopics.length === 0 && customPdfTopics.length === 0)}
                                        style={{
                                            width: "100%",
                                            backgroundColor: startingPdfExam || (selectedTopics.length === 0 && customPdfTopics.length === 0) ? "#94a3b8" : "#16a34a",
                                            color: "#ffffff",
                                            border: "none",
                                            borderRadius: "8px",
                                            padding: "12px",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            cursor: startingPdfExam || (selectedTopics.length === 0 && customPdfTopics.length === 0) ? "not-allowed" : "pointer",
                                            marginBottom: "10px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            transition: "background-color 0.15s ease"
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!startingPdfExam && (selectedTopics.length > 0 || customPdfTopics.length > 0)) {
                                                e.currentTarget.style.backgroundColor = "#15803d";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!startingPdfExam && (selectedTopics.length > 0 || customPdfTopics.length > 0)) {
                                                e.currentTarget.style.backgroundColor = "#16a34a";
                                            }
                                        }}
                                    >
                                        {startingPdfExam ? "Launching assessment..." : "Start practice assessment"}
                                        <ArrowRight size={15} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handlePreviewPdfQuestions}
                                        disabled={pdfLoading || (selectedTopics.length === 0 && customPdfTopics.length === 0)}
                                        style={{
                                            width: "100%",
                                            backgroundColor: "#f8fafc",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "8px",
                                            padding: "10px",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#0f172a",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "6px"
                                        }}
                                    >
                                        {pdfLoading ? "Generating preview..." : "Preview questions"}
                                    </button>
                                </div>

                                {/* Preview Questions if generated */}
                                {generatedQuestions.length > 0 && (
                                    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
                                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", margin: "0 0 12px 0" }}>
                                            Generated document questions ({generatedQuestions.length})
                                        </h4>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            {generatedQuestions.map((q, i) => (
                                                <div key={i} style={{ padding: "10px 12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", color: "#1e293b", lineHeight: 1.4 }}>
                                                    <strong>Q{i + 1}:</strong> {q.questionText}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================== */}
            {/* MODE 2: JOB DESCRIPTION PRACTICE                               */}
            {/* ============================================================== */}
            {activeMode === "jd" && (
                <div key="jd-container" className="prepare-fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                    
                    {jdError && (
                        <div style={{
                            padding: "12px 16px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "10px",
                            color: "#991b1b",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <AlertCircle size={16} color="#dc2626" />
                                <span>{jdError}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setJdError("")}
                                style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", padding: "2px" }}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    {/* Step 1: Input & Configuration */}
                    {jdStep === 1 && (
                        <div className="prepare-content-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
                            {/* Left: Input Form */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "28px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                    <h2 style={{ fontSize: "17px", fontWeight: "600", color: "#0f172a", margin: 0 }}>
                                        Target job description
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={loadSampleJd}
                                        style={{ background: "none", border: "none", color: "#16a34a", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                                    >
                                        Load sample backend JD
                                    </button>
                                </div>

                                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px 0", lineHeight: "1.5" }}>
                                    Paste requirements from a job posting. AI extracts the competencies and prepares practice questions.
                                </p>

                                <textarea
                                    rows={10}
                                    placeholder="Paste job posting text here (e.g. Full Stack Developer with experience in React, Node.js, PostgreSQL, Docker...)"
                                    value={jdText}
                                    onChange={(e) => setJdText(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "12px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        lineHeight: 1.5,
                                        boxSizing: "border-box",
                                        fontFamily: "inherit",
                                        backgroundColor: "#f8fafc",
                                        marginBottom: "20px",
                                        outline: "none"
                                    }}
                                />

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                            Question count
                                        </label>
                                        <select
                                            value={jdQuestionCount}
                                            onChange={(e) => setJdQuestionCount(Number(e.target.value))}
                                            style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", backgroundColor: "#ffffff" }}
                                        >
                                            <option value={3}>3 questions</option>
                                            <option value={5}>5 questions</option>
                                            <option value={8}>8 questions</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                            Difficulty target
                                        </label>
                                        <select
                                            value={jdDifficulty}
                                            onChange={(e) => setJdDifficulty(e.target.value)}
                                            style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", backgroundColor: "#ffffff" }}
                                        >
                                            <option value="easy">Junior / Entry</option>
                                            <option value="medium">Mid-Level</option>
                                            <option value="hard">Senior / Staff</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                            Assessment format
                                        </label>
                                        <select
                                            value={jdFormat}
                                            onChange={(e) => setJdFormat(e.target.value)}
                                            style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", backgroundColor: "#ffffff" }}
                                        >
                                            <option value="mixed">Mixed (Theory + Coding)</option>
                                            <option value="theory">Theory & Concepts</option>
                                            <option value="coding">Hands-on Coding</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAnalyzeJd}
                                    disabled={jdLoading || !jdText.trim()}
                                    style={{
                                        backgroundColor: jdLoading || !jdText.trim() ? "#94a3b8" : "#16a34a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "12px 24px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: jdLoading || !jdText.trim() ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        transition: "background-color 0.15s ease"
                                    }}
                                    onMouseEnter={(e) => { if (!jdLoading && jdText.trim()) e.currentTarget.style.backgroundColor = "#15803d"; }}
                                    onMouseLeave={(e) => { if (!jdLoading && jdText.trim()) e.currentTarget.style.backgroundColor = "#16a34a"; }}
                                >
                                    {jdLoading ? "Analysing job description..." : "Analyse and generate practice"}
                                    <ArrowRight size={15} />
                                </button>
                            </div>

                            {/* Right: How JD Practice Works */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "28px" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 18px 0" }}>
                                    How it works
                                </h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        padding: "12px 14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                        borderRadius: "10px"
                                    }}>
                                        <div className="step-number-circle" style={{ backgroundColor: "#16a34a", color: "#ffffff" }}>
                                            1
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "2px" }}>
                                                Role parsing
                                            </div>
                                            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                                AI identifies the seniority level, frameworks, cloud tools, and architecture requirements.
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        padding: "12px 14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                        borderRadius: "10px"
                                    }}>
                                        <div className="step-number-circle" style={{ backgroundColor: "#16a34a", color: "#ffffff" }}>
                                            2
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "2px" }}>
                                                Calibrated questions
                                            </div>
                                            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                                Generates questions reflecting the actual evaluation criteria of the role.
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "12px",
                                        padding: "12px 14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                        borderRadius: "10px"
                                    }}>
                                        <div className="step-number-circle" style={{ backgroundColor: "#16a34a", color: "#ffffff" }}>
                                            3
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "2px" }}>
                                                Detailed evaluation
                                            </div>
                                            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
                                                Evaluates your responses against production standards for that position.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Breakdown & Launch */}
                    {jdStep === 2 && jdResult && (
                        <div className="prepare-content-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
                            {/* Left: Questions Preview */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "26px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: 0 }}>
                                        Tailored interview questions ({jdResult.questions?.length || 0})
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setJdStep(1)}
                                        style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer", fontWeight: "500" }}
                                    >
                                        Edit job description
                                    </button>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    {(jdResult.questions || []).map((q, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: "14px 16px",
                                                borderRadius: "10px",
                                                border: "1px solid #e2e8f0",
                                                backgroundColor: "#f8fafc"
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#16a34a", textTransform: "uppercase" }}>
                                                    QUESTION {idx + 1} · {q.type || q.assessmentType || "TECHNICAL"}
                                                </span>
                                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "capitalize" }}>
                                                    {q.difficulty || jdDifficulty}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", margin: "0 0 6px 0", lineHeight: 1.4 }}>
                                                {q.questionText}
                                            </p>
                                            {q.idealAnswer && (
                                                <div style={{ fontSize: "12px", color: "#475569", marginTop: "8px", borderTop: "1px dashed #cbd5e1", paddingTop: "8px" }}>
                                                    <strong>Benchmark:</strong> {q.idealAnswer.slice(0, 160)}...
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Competency Profile & Action */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px" }}>
                                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px 0" }}>
                                        Extracted job profile
                                    </h3>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", marginBottom: "20px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#64748b" }}>Target role</span>
                                            <strong style={{ color: "#0f172a" }}>{jdResult.roleTitle}</strong>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#64748b" }}>Seniority tier</span>
                                            <strong style={{ color: "#0f172a" }}>{jdResult.seniority}</strong>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#64748b" }}>Primary domain</span>
                                            <strong style={{ color: "#0f172a" }}>{jdResult.primaryDomain}</strong>
                                        </div>
                                    </div>

                                    {/* Tech Stack Pills */}
                                    {jdResult.techStack && jdResult.techStack.length > 0 && (
                                        <div style={{ marginBottom: "24px" }}>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>
                                                Identified tech stack & competencies
                                            </div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                {jdResult.techStack.map((tech, idx) => (
                                                    <span
                                                        key={idx}
                                                        style={{
                                                            fontSize: "11px",
                                                            fontWeight: "600",
                                                            backgroundColor: "#f0fdf4",
                                                            color: "#166534",
                                                            padding: "3px 9px",
                                                            borderRadius: "4px",
                                                            border: "1px solid #bbf7d0"
                                                        }}
                                                    >
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleStartJdAssessment}
                                        disabled={startingJdExam}
                                        style={{
                                            width: "100%",
                                            backgroundColor: startingJdExam ? "#94a3b8" : "#16a34a",
                                            color: "#ffffff",
                                            border: "none",
                                            borderRadius: "8px",
                                            padding: "13px",
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            cursor: startingJdExam ? "not-allowed" : "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "8px",
                                            transition: "background-color 0.15s ease"
                                        }}
                                        onMouseEnter={(e) => { if (!startingJdExam) e.currentTarget.style.backgroundColor = "#15803d"; }}
                                        onMouseLeave={(e) => { if (!startingJdExam) e.currentTarget.style.backgroundColor = "#16a34a"; }}
                                    >
                                        {startingJdExam ? "Launching assessment..." : "Start tailored assessment"}
                                        <ArrowRight size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
