import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
    // PDF HANDLERS
    // ==============================================================
    const handleAnalyzePdf = async () => {
        if (!pdfFile) {
            setPdfError("Please select a PDF file first.");
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
            if (selectedTopics.length === 1 && customPdfTopics.length === 0) return;
            setSelectedTopics(selectedTopics.filter((t) => t !== topicName));
        } else {
            setSelectedTopics([...selectedTopics, topicName]);
        }
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

            // Link pre-generated questions directly
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
            setJdError("Please enter or paste the Job Description text.");
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
            setJdError(err.response?.data?.message || err.message || "Failed to analyze Job Description.");
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

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1120px", margin: "0 auto" }}>
            {/* Header */}
            <div>
                <h1 style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#0f172a",
                    letterSpacing: "-0.03em",
                    margin: "0 0 6px 0"
                }}>
                    Prepare from your own material
                </h1>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <p style={{ fontSize: "15px", color: "#475569", margin: 0 }}>
                        Turn study textbooks, research papers, or target job descriptions into tailored assessments.
                    </p>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Source → topics → questions → practice
                    </span>
                </div>
            </div>

            {/* Two Mode Cards (Image 3 Style) */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px"
            }}>
                {/* PDF Preparation Card */}
                <div
                    onClick={() => setMode("pdf")}
                    style={{
                        backgroundColor: activeMode === "pdf" ? "#f0f7ff" : "#ffffff",
                        border: activeMode === "pdf" ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: activeMode === "pdf" ? "0 4px 12px rgba(59, 130, 246, 0.08)" : "none"
                    }}
                >
                    <div>
                        <div style={{ fontSize: "24px", marginBottom: "12px" }}>📄</div>
                        <h2 style={{
                            fontSize: "18px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 8px 0"
                        }}>
                            PDF preparation
                        </h2>
                        <p style={{
                            fontSize: "14px",
                            color: "#475569",
                            lineHeight: "1.5",
                            margin: 0
                        }}>
                            Bring study notes or a reference document. Review the topics before generating questions.
                        </p>
                    </div>

                    <div style={{ marginTop: "20px" }}>
                        <span style={{
                            color: activeMode === "pdf" ? "#1e40af" : "#2563eb",
                            fontSize: "13px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                        }}>
                            Use a PDF →
                        </span>
                    </div>
                </div>

                {/* Job Description Practice Card */}
                <div
                    onClick={() => setMode("jd")}
                    style={{
                        backgroundColor: activeMode === "jd" ? "#f0fdf4" : "#ffffff",
                        border: activeMode === "jd" ? "1.5px solid #10b981" : "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "28px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: activeMode === "jd" ? "0 4px 12px rgba(16, 185, 129, 0.08)" : "none"
                    }}
                >
                    <div>
                        <div style={{ fontSize: "24px", marginBottom: "12px" }}>💼</div>
                        <h2 style={{
                            fontSize: "18px",
                            fontWeight: "700",
                            color: "#0f172a",
                            margin: "0 0 8px 0"
                        }}>
                            Job-description practice
                        </h2>
                        <p style={{
                            fontSize: "14px",
                            color: "#475569",
                            lineHeight: "1.5",
                            margin: 0
                        }}>
                            See the skills a role asks for, then practise questions tailored to those requirements.
                        </p>
                    </div>

                    <div style={{ marginTop: "20px" }}>
                        <span style={{
                            color: activeMode === "jd" ? "#065f46" : "#2563eb",
                            fontSize: "13px",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                        }}>
                            Analyse a job description →
                        </span>
                    </div>
                </div>
            </div>

            {/* ============================================================== */}
            {/* MODE 1: PDF PREPARATION                                        */}
            {/* ============================================================== */}
            {activeMode === "pdf" && (
                <>
                    {/* Stepper Header */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "center", fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                        <span style={{ color: pdfStep === 1 ? "#2563eb" : "#059669" }}>
                            {pdfStep > 1 ? "✓" : "1"} Upload PDF
                        </span>
                        <span>→</span>
                        <span style={{ color: pdfStep === 2 ? "#2563eb" : pdfStep > 2 ? "#059669" : "#94a3b8" }}>
                            {pdfStep > 2 ? "✓" : "2"} Review Real Topics & Configure
                        </span>
                        <span>→</span>
                        <span style={{ color: pdfStep === 3 ? "#2563eb" : "#94a3b8" }}>
                            3 Practise Assessment
                        </span>
                    </div>

                    {pdfError && (
                        <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600" }}>
                            ⚠ {pdfError}
                        </div>
                    )}

                    {/* Step 1: Upload */}
                    {pdfStep === 1 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "28px" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>
                                    Choose your document
                                </h3>

                                <div
                                    style={{
                                        border: "2px dashed #cbd5e1",
                                        borderRadius: "10px",
                                        padding: "48px 24px",
                                        textAlign: "center",
                                        backgroundColor: "#f8fafc",
                                        marginBottom: "20px"
                                    }}
                                >
                                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📄</div>
                                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a", marginBottom: "4px" }}>
                                        {pdfFile ? pdfFile.name : "Drop a PDF here"}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                                        {pdfFile ? `${(pdfFile.size / 1024).toFixed(0)} KB · Ready to extract` : "or choose a file from your device"}
                                    </div>

                                    <label
                                        style={{
                                            display: "inline-block",
                                            padding: "8px 18px",
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#0f172a",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Choose PDF
                                        <input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setPdfFile(e.target.files[0]);
                                                    setPdfError("");
                                                }
                                            }}
                                            style={{ display: "none" }}
                                        />
                                    </label>
                                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "12px" }}>
                                        Supports textbooks, biographies, lecture notes, and research papers.
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAnalyzePdf}
                                    disabled={!pdfFile || pdfLoading}
                                    style={{
                                        backgroundColor: !pdfFile || pdfLoading ? "#94a3b8" : "#1e3a8a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "12px 24px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: !pdfFile || pdfLoading ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {pdfLoading ? "Analysing document..." : "Analyse document →"}
                                </button>
                            </div>

                            {/* How it works */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "28px" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>
                                    How it works
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px" }}>
                                    <div>
                                        <strong style={{ color: "#0f172a" }}>1. Genuine Content Extraction</strong>
                                        <p style={{ margin: "2px 0 0 0", color: "#64748b" }}>We read the text and structure across pages (with OCR for scanned documents).</p>
                                    </div>
                                    <div>
                                        <strong style={{ color: "#0f172a" }}>2. Real Topic Identification</strong>
                                        <p style={{ margin: "2px 0 0 0", color: "#64748b" }}>AI identifies the exact domain and key themes present in the document.</p>
                                    </div>
                                    <div>
                                        <strong style={{ color: "#0f172a" }}>3. Grounded Assessment</strong>
                                        <p style={{ margin: "2px 0 0 0", color: "#64748b" }}>Questions test your understanding directly based on the uploaded material.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2 & 3: Review Topics & Configure */}
                    {(pdfStep === 2 || pdfStep === 3) && (
                        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
                            {/* Left Column: Topics from Document */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                        DOCUMENT DOMAIN: {detectedDomain.toUpperCase()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPdfStep(1)}
                                        style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer" }}
                                    >
                                        Change PDF
                                    </button>
                                </div>

                                <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: "0 0 8px 0" }}>
                                    Topics Extracted from Document
                                </h3>

                                {pdfSummary && (
                                    <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", fontSize: "13px", color: "#475569", lineHeight: 1.5, marginBottom: "16px" }}>
                                        {pdfSummary}
                                    </div>
                                )}

                                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
                                    Select the topics you want included in your assessment:
                                </p>

                                {/* Real Topics List */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                                    {extractedTopics.map((topic, idx) => {
                                        const name = typeof topic === "string" ? topic : topic.name;
                                        const desc = typeof topic === "string" ? "" : topic.description;
                                        const diff = typeof topic === "string" ? "Medium" : (topic.difficulty || "Medium");
                                        const isChecked = selectedTopics.includes(name);

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => togglePdfTopic(name)}
                                                style={{
                                                    padding: "12px 14px",
                                                    borderRadius: "8px",
                                                    border: isChecked ? "1.5px solid #16a34a" : "1px solid #e2e8f0",
                                                    backgroundColor: isChecked ? "#f0fdf4" : "#ffffff",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start",
                                                    transition: "all 0.15s ease"
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {}}
                                                        style={{ marginTop: "3px", cursor: "pointer", accentColor: "#16a34a" }}
                                                    />
                                                    <div>
                                                        <div style={{ fontSize: "14px", fontWeight: isChecked ? "700" : "600", color: isChecked ? "#15803d" : "#0f172a" }}>
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

                                {/* Custom PDF Topics */}
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Add Custom Subtopic from Document
                                    </label>
                                    <form onSubmit={handleAddCustomPdfTopic} style={{ display: "flex", gap: "8px" }}>
                                        <input
                                            type="text"
                                            placeholder="e.g. Specific chapter or theorem..."
                                            value={customPdfInput}
                                            onChange={(e) => setCustomPdfInput(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: "9px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "13px",
                                                backgroundColor: "#f8fafc"
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
                                                        backgroundColor: "#eff6ff",
                                                        border: "1px solid #bfdbfe",
                                                        borderRadius: "16px",
                                                        padding: "3px 10px",
                                                        fontSize: "12px",
                                                        color: "#1d4ed8",
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
                                                        style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontWeight: "bold" }}
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Parameters & Actions */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px" }}>
                                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>
                                        Assessment Parameters
                                    </h3>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                                        <div>
                                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                                Question Count
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
                                            backgroundColor: startingPdfExam ? "#94a3b8" : "#1e3a8a",
                                            color: "#ffffff",
                                            border: "none",
                                            borderRadius: "8px",
                                            padding: "12px",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            cursor: startingPdfExam ? "not-allowed" : "pointer",
                                            marginBottom: "10px"
                                        }}
                                    >
                                        {startingPdfExam ? "Launching Assessment..." : "Start PDF Practice Assessment →"}
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
                                            cursor: "pointer"
                                        }}
                                    >
                                        {pdfLoading ? "Generating preview..." : "Preview Questions on Screen"}
                                    </button>
                                </div>

                                {/* Preview Questions if generated */}
                                {generatedQuestions.length > 0 && (
                                    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
                                        <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "0 0 12px 0" }}>
                                            Generated Document Questions ({generatedQuestions.length})
                                        </h4>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                            {generatedQuestions.map((q, i) => (
                                                <div key={i} style={{ padding: "10px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12px", color: "#1e293b", lineHeight: 1.4 }}>
                                                    <strong>Q{i + 1}:</strong> {q.questionText}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ============================================================== */}
            {/* MODE 2: JOB DESCRIPTION PRACTICE                               */}
            {/* ============================================================== */}
            {activeMode === "jd" && (
                <>
                    {jdError && (
                        <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600" }}>
                            ⚠ {jdError}
                        </div>
                    )}

                    {jdStep === 1 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
                            {/* Left: Input Form */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "28px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                                        Target Job Description
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={loadSampleJd}
                                        style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                                    >
                                        Load Sample Senior Backend JD
                                    </button>
                                </div>

                                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px 0" }}>
                                    Paste the job posting requirements or spec below. AI will extract the key competencies and calibrate assessment questions:
                                </p>

                                <textarea
                                    rows={12}
                                    placeholder="Paste job posting text here (e.g. Full Stack Developer with 3+ years experience in React, Node.js, PostgreSQL, Docker...)"
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
                                        marginBottom: "20px"
                                    }}
                                />

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                                            Question Count
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
                                            Difficulty Target
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
                                            Assessment Format
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
                                        cursor: jdLoading || !jdText.trim() ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {jdLoading ? "Analysing JD & Calibrating Questions..." : "Analyse Job Description & Generate Practice →"}
                                </button>
                            </div>

                            {/* Right: How JD Practice Works */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "28px" }}>
                                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>
                                    How Job Description Practice Works
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px" }}>
                                    <div>
                                        <strong style={{ color: "#0f172a" }}>1. Role & Tech Stack Parsing</strong>
                                        <p style={{ margin: "2px 0 0 0", color: "#64748b" }}>AI analyzes the exact seniority level, required frameworks, cloud platforms, and architecture patterns.</p>
                                    </div>
                                    <div>
                                        <strong style={{ color: "#0f172a" }}>2. Calibrated Interview Questions</strong>
                                        <p style={{ margin: "2px 0 0 0", color: "#64748b" }}>Generates scenario-based technical questions matching the specific hiring bar of the position.</p>
                                    </div>
                                    <div>
                                        <strong style={{ color: "#0f172a" }}>3. Benchmark Evaluation</strong>
                                        <p style={{ margin: "2px 0 0 0", color: "#64748b" }}>Evaluates your answers against senior engineering standards for the targeted role.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Breakdown & Launch */}
                    {jdStep === 2 && jdResult && (
                        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
                            {/* Left: Questions Preview */}
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                                        Tailored Interview Questions ({jdResult.questions?.length || 0})
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setJdStep(1)}
                                        style={{ background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer" }}
                                    >
                                        Edit Job Description
                                    </button>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {(jdResult.questions || []).map((q, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: "16px",
                                                borderRadius: "8px",
                                                border: "1px solid #e2e8f0",
                                                backgroundColor: "#f8fafc"
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                                                <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase" }}>
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
                                    <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>
                                        Extracted Job Profile
                                    </h4>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", marginBottom: "20px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#64748b" }}>Target Role</span>
                                            <strong style={{ color: "#0f172a" }}>{jdResult.roleTitle}</strong>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#64748b" }}>Seniority Tier</span>
                                            <strong style={{ color: "#0f172a" }}>{jdResult.seniority}</strong>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#64748b" }}>Primary Domain</span>
                                            <strong style={{ color: "#0f172a" }}>{jdResult.primaryDomain}</strong>
                                        </div>
                                    </div>

                                    {/* Tech Stack Pills */}
                                    {jdResult.techStack && jdResult.techStack.length > 0 && (
                                        <div style={{ marginBottom: "24px" }}>
                                            <div style={{ fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>
                                                Identified Tech Stack & Competencies
                                            </div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                {jdResult.techStack.map((tech, idx) => (
                                                    <span
                                                        key={idx}
                                                        style={{
                                                            fontSize: "11px",
                                                            fontWeight: "600",
                                                            backgroundColor: "#eff6ff",
                                                            color: "#1d4ed8",
                                                            padding: "3px 9px",
                                                            borderRadius: "4px",
                                                            border: "1px solid #bfdbfe"
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
                                            padding: "14px",
                                            fontSize: "14px",
                                            fontWeight: "700",
                                            cursor: startingJdExam ? "not-allowed" : "pointer"
                                        }}
                                    >
                                        {startingJdExam ? "Launching Assessment..." : "Start Tailored Assessment →"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
