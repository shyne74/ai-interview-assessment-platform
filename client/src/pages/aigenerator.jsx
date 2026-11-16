import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function AIGenerator() {
    const navigate = useNavigate();
    const [activeTool, setActiveTool] = useState("pdf"); // "pdf" | "jd"
    const [rolesList, setRolesList] = useState([]);

    // Global notifications
    const [actionToast, setActionToast] = useState("");
    const [errorToast, setErrorToast] = useState("");

    // ==========================================
    // PDF Sub-panel State
    // ==========================================
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfFileName, setPdfFileName] = useState("");
    const [pdfStage, setPdfStage] = useState(1); // 1: Upload, 2: Review Topics & Configure
    const [pdfAnalyzing, setPdfAnalyzing] = useState(false);
    const [pdfProgressText, setPdfProgressText] = useState("");
    const [pdfSummary, setPdfSummary] = useState("");
    const [detectedDomain, setDetectedDomain] = useState("");
    const [pdfTotalPages, setPdfTotalPages] = useState(1);
    const [pdfFullText, setPdfFullText] = useState("");
    const [extractedTopics, setExtractedTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [customTopicInput, setCustomTopicInput] = useState("");

    // PDF Question Generation Configuration
    const [pdfRole, setPdfRole] = useState("");
    const [pdfRoleSuggestion, setPdfRoleSuggestion] = useState(null);
    const [newRoleTitle, setNewRoleTitle] = useState("");
    const [newRoleDomains, setNewRoleDomains] = useState([]);
    const [newRoleDomainInput, setNewRoleDomainInput] = useState("");
    const [pdfDifficulty, setPdfDifficulty] = useState("medium");
    const [pdfCount, setPdfCount] = useState(5);
    const [pdfFormat, setPdfFormat] = useState("theory");
    const [generatingPdfQuestions, setGeneratingPdfQuestions] = useState(false);

    // ==========================================
    // JD Sub-panel State
    // ==========================================
    const [jdText, setJdText] = useState("");
    const [jdRole, setJdRole] = useState("");
    const [jdCount, setJdCount] = useState(5);
    const [jdDifficulty, setJdDifficulty] = useState("medium");
    const [jdFormat, setJdFormat] = useState("mixed");
    const [jdAnalyzing, setJdAnalyzing] = useState(false);
    const [jdProgressText, setJdProgressText] = useState("");
    const [jdAnalysisData, setJdAnalysisData] = useState(null);

    // ==========================================
    // Review Queue State (Generated Questions)
    // ==========================================
    const [reviewQueue, setReviewQueue] = useState([]);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [approvingAll, setApprovingAll] = useState(false);

    // Matching helper: match document to roles taxonomy automatically
    const matchDocumentToRoles = (detectedDomain, topics, summary, roles) => {
        if (!roles || roles.length === 0) {
            return { match: null, confidence: "none", suggestedNewRole: detectedDomain || "New Track", suggestedDomains: topics.slice(0, 4) };
        }

        const domainLower = (detectedDomain || "").toLowerCase().trim();
        const topicsLower = (topics || []).map(t => (typeof t === "string" ? t : t.name || "").toLowerCase().trim());

        let bestRole = null;
        let bestDomain = null;
        let bestScore = 0;

        for (const r of roles) {
            const titleLower = (r.title || "").toLowerCase().trim();
            const aliasesLower = (r.aliases || []).map(a => (a || "").toLowerCase().trim());
            const roleDomains = (r.domains || []).map(d => (d || "").trim());
            const roleDomainsLower = roleDomains.map(d => d.toLowerCase());

            let score = 0;

            if (titleLower === domainLower) {
                score += 100;
            } else if (titleLower.includes(domainLower) || (domainLower && domainLower.includes(titleLower))) {
                score += 50;
            }

            for (const alias of aliasesLower) {
                if (alias === domainLower) {
                    score += 90;
                } else if (alias && (domainLower.includes(alias) || alias.includes(domainLower))) {
                    score += 45;
                }
            }

            for (const t of topicsLower) {
                if (t.includes(titleLower) || titleLower.includes(t)) {
                    score += 15;
                }
                for (let i = 0; i < roleDomainsLower.length; i++) {
                    const rd = roleDomainsLower[i];
                    if (rd && (rd === t || t.includes(rd) || rd.includes(t))) {
                        score += 25;
                        if (!bestDomain) bestDomain = roleDomains[i];
                    }
                }
            }

            for (let i = 0; i < roleDomainsLower.length; i++) {
                const rd = roleDomainsLower[i];
                if (rd && (rd === domainLower || domainLower.includes(rd) || rd.includes(domainLower))) {
                    score += 40;
                    if (!bestDomain) bestDomain = roleDomains[i];
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestRole = r;
                if (!bestDomain && roleDomains.length > 0) {
                    bestDomain = roleDomains[0];
                }
            }
        }

        if (bestScore >= 35 && bestRole) {
            return {
                match: bestRole,
                confidence: bestScore >= 70 ? "high" : "medium",
                suggestedDomain: bestDomain || (topics[0] ? (typeof topics[0] === "string" ? topics[0] : topics[0].name) : "General")
            };
        }

        const cleanTitle = detectedDomain && detectedDomain !== "Document Study" && detectedDomain !== "General"
            ? detectedDomain
            : (topics[0] ? (typeof topics[0] === "string" ? topics[0] : topics[0].name) : "New Role Track");

        return {
            match: null,
            confidence: "none",
            suggestedNewRole: cleanTitle,
            suggestedDomains: topics.slice(0, 5).map(t => typeof t === "string" ? t : t.name)
        };
    };

    // Load available roles
    const loadRoles = async () => {
        try {
            const res = await api.get("/roles");
            const roles = res.data.roles || [];
            setRolesList(roles);
        } catch (err) {
            console.error("Failed to load roles:", err);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    // -------------------------------------------------------------
    // PDF Handlers
    // -------------------------------------------------------------
    const handlePdfFileSelect = (file) => {
        if (!file) return;
        setPdfFile(file);
        setPdfFileName(file.name);
        setErrorToast("");
    };

    const loadSamplePdf = async () => {
        try {
            const res = await fetch("/philosophy_sample.pdf");
            const blob = await res.blob();
            const file = new File([blob], "philosophy_sample.pdf", { type: "application/pdf" });
            handlePdfFileSelect(file);
        } catch (e) {
            console.error("Failed to load sample PDF", e);
        }
    };

    const handleAnalyzePdf = async () => {
        if (!pdfFile) {
            setErrorToast("Please select a PDF file first.");
            return;
        }

        setPdfAnalyzing(true);
        setErrorToast("");
        setPdfProgressText("Uploading document and parsing page contents...");

        try {
            const formData = new FormData();
            formData.append("pdf", pdfFile);

            const timer = setTimeout(() => {
                setPdfProgressText("Extracting domain architecture and key chapters via Groq AI...");
            }, 3000);

            const res = await api.post("/question/analyze-pdf", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            clearTimeout(timer);

            const data = res.data;
            if (!data.topics || data.topics.length === 0) {
                throw new Error("No structured topics could be extracted from this PDF.");
            }

            setPdfSummary(data.summary || "");
            setDetectedDomain(data.detectedDomain || "Document Study");
            setPdfTotalPages(data.totalPages || 1);
            setPdfFullText(data.fullText || "");

            const topicNames = data.topics.map(t => typeof t === "string" ? t : t.name);
            setExtractedTopics(topicNames);
            setSelectedTopics(topicNames);
            setPdfStage(2);

            // Auto-match document against roles taxonomy
            const matchResult = matchDocumentToRoles(data.detectedDomain, topicNames, data.summary, rolesList);
            setPdfRoleSuggestion(matchResult);

            if (matchResult.match) {
                setPdfRole(matchResult.match.title);
            } else {
                const sTitle = matchResult.suggestedNewRole || data.detectedDomain || "New Role Track";
                const sDomains = (topicNames.slice(0, 4) || ["General"]).map(t => typeof t === "string" ? t.slice(0, 40).replace(/,/g, "") : "General");
                setNewRoleTitle(sTitle);
                setNewRoleDomains(sDomains);
                setPdfRole("__CREATE_NEW__");
            }

            setActionToast(`Document analyzed: ${data.totalPages || 1} pages parsed, ${topicNames.length} topics extracted.`);
        } catch (err) {
            console.error("PDF analysis error:", err);
            setErrorToast(err.response?.data?.message || err.message || "Failed to analyze document.");
        } finally {
            setPdfAnalyzing(false);
            setPdfProgressText("");
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    const toggleTopic = (t) => {
        if (selectedTopics.includes(t)) {
            if (selectedTopics.length === 1) return;
            setSelectedTopics(selectedTopics.filter(item => item !== t));
        } else {
            setSelectedTopics([...selectedTopics, t]);
        }
    };

    const handleAddCustomTopic = (e) => {
        if (e.key === "Enter" || e.type === "click") {
            e.preventDefault();
            const val = customTopicInput.trim();
            if (val && !extractedTopics.includes(val)) {
                setExtractedTopics([...extractedTopics, val]);
                setSelectedTopics([...selectedTopics, val]);
                setCustomTopicInput("");
            }
        }
    };

    const handleGenerateFromPdfTopics = async () => {
        if (selectedTopics.length === 0) {
            setErrorToast("Please select at least one topic for question generation.");
            return;
        }

        if (!pdfRole) {
            setErrorToast("Please select or create a role track for this document.");
            return;
        }

        let targetRole = pdfRole;

        // If admin chose to create new role track
        if (pdfRole === "__CREATE_NEW__") {
            if (!newRoleTitle.trim()) {
                setErrorToast("Please enter a title for the new role track.");
                return;
            }
            setGeneratingPdfQuestions(true);
            setPdfProgressText(`Creating new role track "${newRoleTitle.trim()}" in taxonomy...`);
            try {
                const cleanDomains = newRoleDomains.length > 0
                    ? newRoleDomains.map(d => d.slice(0, 40).replace(/,/g, ""))
                    : [selectedTopics[0] ? selectedTopics[0].slice(0, 40).replace(/,/g, "") : "General"];

                await api.post("/roles", {
                    title: newRoleTitle.trim(),
                    domains: cleanDomains,
                    aliases: [],
                    status: "Active"
                });

                targetRole = newRoleTitle.trim();
                setPdfRole(targetRole);

                // Reload roles in background
                loadRoles();
            } catch (roleErr) {
                console.error("Failed to create role:", roleErr);
                setErrorToast(roleErr.response?.data?.message || "Failed to create new role track. Question generation stopped.");
                setGeneratingPdfQuestions(false);
                setPdfProgressText("");
                return; // Stop: Do not generate under wrong role
            }
        } else {
            setGeneratingPdfQuestions(true);
        }

        setErrorToast("");
        setPdfProgressText("Synthesizing grounded questions from reference document...");

        try {
            // Clean single domain from selected topic
            let singleDomain = selectedTopics[0] || detectedDomain || "General";
            if (singleDomain.includes(",")) singleDomain = singleDomain.split(",")[0].trim();
            if (singleDomain.length > 40) singleDomain = singleDomain.slice(0, 40).trim();

            const payload = {
                role: targetRole,
                domain: singleDomain,
                selectedTopics: selectedTopics,
                difficulty: pdfDifficulty.toLowerCase(),
                num_questions: Number(pdfCount),
                assessmentType: pdfFormat.toLowerCase(),
                pdfText: pdfFullText,
                autoSave: true
            };

            const res = await api.post("/question/generate-from-topics", payload);
            const qs = res.data.questions || [];

            if (qs.length === 0) {
                throw new Error("No questions were generated by the AI model. Please retry.");
            }

            // Append to review queue
            const newReviewItems = qs.map(q => ({
                _id: q._id,
                questionText: q.questionText,
                role: q.role || targetRole,
                domain: q.domain || singleDomain,
                difficulty: q.difficulty || pdfDifficulty,
                assessmentType: q.assessmentType || pdfFormat,
                idealAnswer: q.idealAnswer,
                status: q.status || "pending",
                source: "PDF Document"
            }));

            setReviewQueue([...newReviewItems, ...reviewQueue]);
            setActionToast(`Generated ${qs.length} questions for role "${targetRole}"! Ready for review.`);
        } catch (err) {
            console.error("PDF question generation error:", err);
            setErrorToast(err.response?.data?.message || err.message || "Failed to generate questions.");
        } finally {
            setGeneratingPdfQuestions(false);
            setPdfProgressText("");
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    // -------------------------------------------------------------
    // JD Handlers
    // -------------------------------------------------------------
    const loadSampleJd = () => {
        setJdText(
            "Senior Distributed Systems Engineer (Go / Kubernetes)\n\n" +
            "Key Requirements:\n" +
            "• 5+ years building scalable microservices in Go or Node.js.\n" +
            "• In-depth expertise in distributed consensus (Raft/Paxos), database replication, and event streaming (Kafka/RabbitMQ).\n" +
            "• Strong understanding of Docker, Kubernetes orchestration, and cloud infrastructure.\n" +
            "• Experience designing high-throughput, low-latency gRPC and RESTful microservices."
        );
        setErrorToast("");
    };

    const handleAnalyzeJd = async () => {
        if (!jdText.trim()) {
            setErrorToast("Please paste or type the Job Description text.");
            return;
        }

        setJdAnalyzing(true);
        setErrorToast("");
        setJdProgressText("Extracting seniority, competency matrices, and technical requirements...");

        try {
            const payload = {
                jdText: jdText.trim(),
                num_questions: Number(jdCount),
                difficulty: jdDifficulty.toLowerCase(),
                assessmentType: jdFormat.toLowerCase()
            };
            if (jdRole) payload.roleOverride = jdRole;

            const res = await api.post("/question/analyze-jd", payload);
            const data = res.data;

            setJdAnalysisData(data);

            const qs = data.questions || [];
            if (qs.length > 0) {
                const newReviewItems = qs.map(q => ({
                    _id: q._id,
                    questionText: q.questionText,
                    role: q.role || data.roleTitle || "Target Role",
                    domain: q.domain || data.primaryDomain || "Technical Competencies",
                    difficulty: q.difficulty || jdDifficulty,
                    assessmentType: q.assessmentType || jdFormat,
                    idealAnswer: q.idealAnswer,
                    status: q.status || "pending",
                    source: "Job Description"
                }));

                setReviewQueue([...newReviewItems, ...reviewQueue]);
                setActionToast(`Analyzed JD and generated ${qs.length} calibrated questions!`);
            }
        } catch (err) {
            console.error("JD analysis error:", err);
            setErrorToast(err.response?.data?.message || err.message || "Failed to analyze Job Description.");
        } finally {
            setJdAnalyzing(false);
            setJdProgressText("");
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    // -------------------------------------------------------------
    // Review Queue Handlers (Approve, Reject, Discard, Edit)
    // -------------------------------------------------------------
    const handleApproveQuestion = async (q) => {
        try {
            if (q._id) {
                await api.patch(`/question/${q._id}/approve`);
            }
            setReviewQueue(prev => prev.map(item => item._id === q._id ? { ...item, status: "approved" } : item));
            setActionToast(`Question approved and published to Question Bank.`);
        } catch (err) {
            setErrorToast(err.response?.data?.message || "Failed to approve question.");
        } finally {
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    const handleRejectQuestion = async (q) => {
        try {
            if (q._id) {
                await api.patch(`/question/${q._id}/rejected`);
            }
            setReviewQueue(prev => prev.map(item => item._id === q._id ? { ...item, status: "rejected" } : item));
            setActionToast(`Question status marked as rejected.`);
        } catch (err) {
            setErrorToast(err.response?.data?.message || "Failed to reject question.");
        } finally {
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    const handleDiscardQuestion = async (q) => {
        try {
            if (q._id) {
                await api.delete(`/question/${q._id}`);
            }
            setReviewQueue(prev => prev.filter(item => item._id !== q._id));
            setActionToast("Question discarded.");
        } catch (err) {
            setErrorToast(err.response?.data?.message || "Failed to discard question.");
        } finally {
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    const handleApproveAll = async () => {
        const pendingQuestions = reviewQueue.filter(q => q.status !== "approved" && q._id);
        if (pendingQuestions.length === 0) return;

        setApprovingAll(true);
        let count = 0;
        for (const q of pendingQuestions) {
            try {
                await api.patch(`/question/${q._id}/approve`);
                count++;
            } catch (err) {
                console.warn(`Failed to approve ${q._id}`);
            }
        }

        setReviewQueue(prev => prev.map(q => ({ ...q, status: "approved" })));
        setActionToast(`All ${count} questions approved and published to bank!`);
        setApprovingAll(false);
        setTimeout(() => setActionToast(""), 4000);
    };

    const handleOpenEdit = (q) => {
        setEditingQuestion({ ...q });
        setEditModalOpen(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingQuestion) return;

        try {
            if (editingQuestion._id) {
                await api.put(`/question/${editingQuestion._id}`, editingQuestion);
            }
            setReviewQueue(prev => prev.map(q => q._id === editingQuestion._id ? { ...q, ...editingQuestion } : q));
            setEditModalOpen(false);
            setActionToast("Question updated successfully.");
        } catch (err) {
            setErrorToast(err.response?.data?.message || "Failed to save question edit.");
        } finally {
            setTimeout(() => setActionToast(""), 3500);
        }
    };

    return (
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>AI tools</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 className="wf-page-title" style={{ margin: "0 0 4px 0" }}>
                        AI question generation & assimilation
                    </h1>
                    <p className="wf-page-subtitle" style={{ margin: 0 }}>
                        Synthesize questions grounded in study materials (PDF) or calibrate assessments against real job descriptions (JD).
                    </p>
                </div>
                <Link to="/questionbank" className="wf-btn-outline">
                    View Question Bank →
                </Link>
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

            {/* Top Sub-panel Switcher Tabs */}
            <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid #e5e7eb", marginBottom: "24px" }}>
                <button
                    type="button"
                    onClick={() => setActiveTool("pdf")}
                    style={{
                        padding: "10px 18px",
                        fontSize: "14px",
                        fontWeight: "700",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: activeTool === "pdf" ? "2.5px solid #111827" : "2.5px solid transparent",
                        color: activeTool === "pdf" ? "#111827" : "#6b7280",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    <span>📄</span> PDF Document Analyser
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTool("jd")}
                    style={{
                        padding: "10px 18px",
                        fontSize: "14px",
                        fontWeight: "700",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: activeTool === "jd" ? "2.5px solid #111827" : "2.5px solid transparent",
                        color: activeTool === "jd" ? "#111827" : "#6b7280",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px"
                    }}
                >
                    <span>💼</span> Job Description Analyser
                </button>
            </div>

            {/* TOOL 1: PDF Document Analyser */}
            {activeTool === "pdf" && (
                <div className="wf-card" style={{ marginBottom: "28px" }}>
                    {pdfStage === 1 ? (
                        /* Step 1: Upload Document */
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
                                    Upload Study Material, Syllabus, or Reference Book
                                </h2>
                                <button
                                    type="button"
                                    onClick={loadSamplePdf}
                                    style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}
                                >
                                    Load sample Philosophy PDF
                                </button>
                            </div>
                            <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px 0" }}>
                                Extracts genuine chapters, topics, and domain context using smart sampling and OCR fallback.
                            </p>

                            <div
                                style={{
                                    border: "2px dashed #cbd5e1",
                                    borderRadius: "10px",
                                    padding: "36px 20px",
                                    textAlign: "center",
                                    backgroundColor: "#f8fafc",
                                    cursor: "pointer",
                                    marginBottom: "20px"
                                }}
                                onClick={() => document.getElementById("admin-pdf-input").click()}
                            >
                                <input
                                    id="admin-pdf-input"
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: "none" }}
                                    onChange={(e) => handlePdfFileSelect(e.target.files?.[0])}
                                />
                                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                                    {pdfFileName ? pdfFileName : "Click to select PDF or drag and drop here"}
                                </div>
                                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                    Supports textbooks, research papers, syllabus PDFs, and lecture slides
                                </div>
                            </div>

                            {pdfProgressText && (
                                <div style={{ padding: "12px 16px", backgroundColor: "#eff6ff", borderRadius: "8px", color: "#1e40af", fontSize: "13px", fontWeight: "600", marginBottom: "16px", textAlign: "center" }}>
                                    ⏳ {pdfProgressText}
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    disabled={!pdfFile || pdfAnalyzing}
                                    onClick={handleAnalyzePdf}
                                    className="wf-btn-primary"
                                    style={{ padding: "10px 24px", fontSize: "14px" }}
                                >
                                    {pdfAnalyzing ? "Analyzing Document..." : "Analyze Document →"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Review Topics & Configure */
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <div>
                                    <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: "0 0 4px 0" }}>
                                        Extracted Document Structure
                                    </h2>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                        Document: <strong>{pdfFileName}</strong> · {pdfTotalPages} pages · Detected domain: <strong style={{ color: "#2563eb" }}>{detectedDomain}</strong>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPdfStage(1)}
                                    className="wf-btn-outline"
                                    style={{ fontSize: "12px", padding: "6px 12px" }}
                                >
                                    Change Document
                                </button>
                            </div>

                            {pdfSummary && (
                                <div style={{ padding: "12px 16px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", color: "#334155", lineHeight: "1.5", marginBottom: "20px" }}>
                                    <strong>Document Overview:</strong> {pdfSummary}
                                </div>
                            )}

                            {/* Selectable Topic Chips */}
                            <div style={{ marginBottom: "20px" }}>
                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "8px" }}>
                                    Select Topics for Question Synthesis ({selectedTopics.length} selected)
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                                    {extractedTopics.map((topic, idx) => {
                                        const isSelected = selectedTopics.includes(topic);
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => toggleTopic(topic)}
                                                style={{
                                                    padding: "6px 14px",
                                                    borderRadius: "20px",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    border: isSelected ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                                                    backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                                                    color: isSelected ? "#1d4ed8" : "#475569",
                                                    cursor: "pointer",
                                                    transition: "all 0.1s ease"
                                                }}
                                            >
                                                {isSelected ? "✓ " : "+ "}{topic}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom Topic Input */}
                                <div style={{ display: "flex", gap: "8px", maxWidth: "400px" }}>
                                    <input
                                        type="text"
                                        placeholder="Add custom topic..."
                                        value={customTopicInput}
                                        onChange={(e) => setCustomTopicInput(e.target.value)}
                                        onKeyDown={handleAddCustomTopic}
                                        className="wf-input"
                                        style={{ fontSize: "12px", padding: "6px 10px" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomTopic}
                                        className="wf-btn-outline"
                                        style={{ fontSize: "12px", padding: "6px 12px" }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Role Suggestion Card */}
                            {pdfRoleSuggestion && (
                                pdfRoleSuggestion.match ? (
                                    <div style={{
                                        padding: "12px 16px",
                                        backgroundColor: "#f0fdf4",
                                        border: "1px solid #bbf7d0",
                                        borderRadius: "8px",
                                        marginBottom: "16px",
                                        fontSize: "13px",
                                        color: "#166534",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}>
                                        <span>✨</span>
                                        <div>
                                            These questions look like they belong in <strong>{pdfRoleSuggestion.match.title}</strong>
                                            {pdfRoleSuggestion.suggestedDomain && <span> → <strong>{pdfRoleSuggestion.suggestedDomain}</strong></span>}
                                            <span style={{ fontSize: "11px", fontWeight: "700", marginLeft: "6px", backgroundColor: "#dcfce7", padding: "1px 6px", borderRadius: "10px", color: "#15803d" }}>
                                                CONFIDENCE: {pdfRoleSuggestion.confidence.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: "14px 16px",
                                        backgroundColor: "#fffbeb",
                                        border: "1px solid #fde68a",
                                        borderRadius: "8px",
                                        marginBottom: "16px",
                                        fontSize: "13px",
                                        color: "#92400e"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", marginBottom: "4px" }}>
                                            <span>💡</span>
                                            <span>No existing role fits this document</span>
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#78350f" }}>
                                            Suggested new role: <strong>{newRoleTitle || "New Role Track"}</strong>, domains: {newRoleDomains.join(", ") || "General"}
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Question Generation Configuration */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", padding: "18px", backgroundColor: "#f9fafb", borderRadius: "10px", marginBottom: "20px" }}>
                                <div>
                                    <label className="wf-form-label">Role Track Destination</label>
                                    <select
                                        value={pdfRole}
                                        onChange={(e) => setPdfRole(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="" disabled>-- Select a role track --</option>
                                        {newRoleTitle && (
                                            <optgroup label="Suggested New Role">
                                                <option value="__CREATE_NEW__">+ Create new role: {newRoleTitle}</option>
                                            </optgroup>
                                        )}
                                        <optgroup label="Existing Roles">
                                            {rolesList.map(r => (
                                                <option key={r._id || r.title} value={r.title}>{r.title}</option>
                                            ))}
                                        </optgroup>
                                    </select>

                                    {/* Editable New Role Creator */}
                                    {pdfRole === "__CREATE_NEW__" && (
                                        <div style={{ marginTop: "12px", padding: "14px", backgroundColor: "#ffffff", border: "1.5px dashed #cbd5e1", borderRadius: "8px" }}>
                                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>
                                                Configure New Role Track
                                            </div>
                                            <div style={{ marginBottom: "10px" }}>
                                                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                                                    Role Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newRoleTitle}
                                                    onChange={(e) => setNewRoleTitle(e.target.value)}
                                                    className="wf-input"
                                                    placeholder="e.g. Philosophy, Astronomy..."
                                                    style={{ fontSize: "13px" }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                                                    Curriculum Domains ({newRoleDomains.length})
                                                </label>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                                    {newRoleDomains.map((dom, idx) => (
                                                        <span key={idx} style={{ backgroundColor: "#e0f2fe", color: "#0369a1", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                                            {dom}
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewRoleDomains(newRoleDomains.filter((_, i) => i !== idx))}
                                                                style={{ background: "none", border: "none", color: "#0284c7", cursor: "pointer", padding: 0 }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <input
                                                        type="text"
                                                        value={newRoleDomainInput}
                                                        onChange={(e) => setNewRoleDomainInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                if (newRoleDomainInput.trim() && !newRoleDomains.includes(newRoleDomainInput.trim())) {
                                                                    setNewRoleDomains([...newRoleDomains, newRoleDomainInput.trim()]);
                                                                    setNewRoleDomainInput("");
                                                                }
                                                            }
                                                        }}
                                                        placeholder="Add domain..."
                                                        className="wf-input"
                                                        style={{ flex: 1, fontSize: "12px" }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (newRoleDomainInput.trim() && !newRoleDomains.includes(newRoleDomainInput.trim())) {
                                                                setNewRoleDomains([...newRoleDomains, newRoleDomainInput.trim()]);
                                                                setNewRoleDomainInput("");
                                                            }
                                                        }}
                                                        className="wf-btn-outline"
                                                        style={{ fontSize: "12px", padding: "4px 10px" }}
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="wf-form-label">Difficulty Target</label>
                                    <select
                                        value={pdfDifficulty}
                                        onChange={(e) => setPdfDifficulty(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="easy">Easy (Foundational)</option>
                                        <option value="medium">Medium (Standard)</option>
                                        <option value="hard">Hard (Advanced)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="wf-form-label">Total Questions to Synthesize</label>
                                    <select
                                        value={pdfCount}
                                        onChange={(e) => setPdfCount(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value={3}>3 Questions</option>
                                        <option value={5}>5 Questions</option>
                                        <option value={8}>8 Questions</option>
                                        <option value={10}>10 Questions</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="wf-form-label">Assessment Format</label>
                                    <select
                                        value={pdfFormat}
                                        onChange={(e) => setPdfFormat(e.target.value)}
                                        className="wf-input"
                                        style={{ backgroundColor: "#ffffff" }}
                                    >
                                        <option value="theory">Theory Concepts</option>
                                        <option value="coding">Practical / Coding</option>
                                        <option value="mixed">Mixed Assessment</option>
                                    </select>
                                </div>
                            </div>

                            {pdfProgressText && (
                                <div style={{ padding: "12px 16px", backgroundColor: "#eff6ff", borderRadius: "8px", color: "#1e40af", fontSize: "13px", fontWeight: "600", marginBottom: "16px", textAlign: "center" }}>
                                    ⏳ {pdfProgressText}
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    disabled={generatingPdfQuestions}
                                    onClick={handleGenerateFromPdfTopics}
                                    className="wf-btn-primary"
                                    style={{ padding: "10px 24px", fontSize: "14px" }}
                                >
                                    {generatingPdfQuestions ? "Generating Questions..." : "Generate Calibrated Questions →"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TOOL 2: Job Description Analyser */}
            {activeTool === "jd" && (
                <div className="wf-card" style={{ marginBottom: "28px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
                            Analyse Job Description & Generate Tailored Questions
                        </h2>
                        <button
                            type="button"
                            onClick={loadSampleJd}
                            style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}
                        >
                            Load sample JD
                        </button>
                    </div>
                    <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px 0" }}>
                        Paste a job posting or requisitions brief to extract technical competencies, target seniority, and generate role-tailored questions.
                    </p>

                    <div style={{ marginBottom: "16px" }}>
                        <textarea
                            value={jdText}
                            onChange={(e) => setJdText(e.target.value)}
                            placeholder="Paste job description text here..."
                            rows={6}
                            className="wf-input"
                            style={{ fontFamily: "inherit", lineHeight: "1.5" }}
                        />
                    </div>

                    {/* Configuration Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", marginBottom: "16px" }}>
                        <div>
                            <label className="wf-form-label">Role Track Destination</label>
                            <select
                                value={jdRole}
                                onChange={(e) => setJdRole(e.target.value)}
                                className="wf-input"
                                style={{ backgroundColor: "#ffffff" }}
                            >
                                <option value="">Auto-detect from JD</option>
                                {rolesList.map(r => (
                                    <option key={r._id || r.title} value={r.title}>{r.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="wf-form-label">Question Count</label>
                            <select
                                value={jdCount}
                                onChange={(e) => setJdCount(e.target.value)}
                                className="wf-input"
                                style={{ backgroundColor: "#ffffff" }}
                            >
                                <option value={3}>3 questions</option>
                                <option value={5}>5 questions</option>
                                <option value={8}>8 questions</option>
                            </select>
                        </div>
                        <div>
                            <label className="wf-form-label">Target Difficulty</label>
                            <select
                                value={jdDifficulty}
                                onChange={(e) => setJdDifficulty(e.target.value)}
                                className="wf-input"
                                style={{ backgroundColor: "#ffffff" }}
                            >
                                <option value="easy">Junior / Easy</option>
                                <option value="medium">Mid-level / Medium</option>
                                <option value="hard">Senior / Hard</option>
                            </select>
                        </div>
                        <div>
                            <label className="wf-form-label">Assessment Format</label>
                            <select
                                value={jdFormat}
                                onChange={(e) => setJdFormat(e.target.value)}
                                className="wf-input"
                                style={{ backgroundColor: "#ffffff" }}
                            >
                                <option value="mixed">Mixed (Theory + Code)</option>
                                <option value="theory">Theory Concepts</option>
                                <option value="coding">Coding Tasks</option>
                            </select>
                        </div>
                    </div>

                    {jdProgressText && (
                        <div style={{ padding: "12px 16px", backgroundColor: "#eff6ff", borderRadius: "8px", color: "#1e40af", fontSize: "13px", fontWeight: "600", marginBottom: "16px", textAlign: "center" }}>
                            ⏳ {jdProgressText}
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                            type="button"
                            disabled={jdAnalyzing || !jdText.trim()}
                            onClick={handleAnalyzeJd}
                            className="wf-btn-primary"
                            style={{ padding: "10px 24px", fontSize: "14px" }}
                        >
                            {jdAnalyzing ? "Analyzing JD..." : "Analyze JD & Generate Questions →"}
                        </button>
                    </div>

                    {/* Extracted JD Metadata Card */}
                    {jdAnalysisData && (
                        <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "8px" }}>
                                Extracted Competency Matrix
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", color: "#1f2937", marginBottom: "10px" }}>
                                <div><strong>Target Role:</strong> {jdAnalysisData.roleTitle}</div>
                                <div><strong>Seniority:</strong> {jdAnalysisData.seniority}</div>
                                <div><strong>Primary Domain:</strong> {jdAnalysisData.primaryDomain}</div>
                            </div>
                            {jdAnalysisData.techStack && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                                    {jdAnalysisData.techStack.map((tech, idx) => (
                                        <span key={idx} style={{ backgroundColor: "#dcfce7", color: "#14532d", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* REVIEW QUEUE (Generated Questions from PDF or JD) */}
            <div className="wf-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#111827", margin: "0 0 4px 0" }}>
                            Generated Questions Review Queue ({reviewQueue.length})
                        </h2>
                        <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                            Review, calibrate, or approve synthesized questions before publishing to candidate assessments.
                        </p>
                    </div>

                    {reviewQueue.length > 0 && (
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                type="button"
                                disabled={approvingAll}
                                onClick={handleApproveAll}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#059669",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                {approvingAll ? "Approving..." : "✓ Approve All Questions"}
                            </button>
                        </div>
                    )}
                </div>

                {reviewQueue.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>✨</div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>
                            Review Queue is Empty
                        </div>
                        <div style={{ fontSize: "12px" }}>
                            Upload a PDF document or analyze a Job Description above to generate questions into this review queue.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {reviewQueue.map((q, idx) => {
                            const isApproved = q.status === "approved";
                            const isRejected = q.status === "rejected";

                            return (
                                <div
                                    key={q._id || idx}
                                    style={{
                                        padding: "18px",
                                        borderRadius: "10px",
                                        border: isApproved ? "1.5px solid #a7f3d0" : isRejected ? "1.5px solid #fecaca" : "1px solid #e5e7eb",
                                        backgroundColor: isApproved ? "#f0fdf4" : isRejected ? "#fef2f2" : "#ffffff",
                                        transition: "all 0.15s ease"
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            <span style={{
                                                padding: "2px 8px",
                                                borderRadius: "4px",
                                                fontSize: "11px",
                                                fontWeight: "700",
                                                backgroundColor: isApproved ? "#dcfce7" : isRejected ? "#fee2e2" : "#fef3c7",
                                                color: isApproved ? "#15803d" : isRejected ? "#b91c1c" : "#92400e"
                                            }}>
                                                {(q.status || "pending").toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                                {q.role} · {q.domain} · {q.difficulty.toUpperCase()} · {q.assessmentType || "Theory"}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>
                                            Source: {q.source || "AI Generated"}
                                        </span>
                                    </div>

                                    <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 10px 0", lineHeight: "1.4" }}>
                                        {q.questionText}
                                    </h3>

                                    {q.idealAnswer && (
                                        <div style={{ fontSize: "12px", color: "#4b5563", backgroundColor: "#ffffff", padding: "10px 12px", borderRadius: "6px", border: "1px solid #f3f4f6", marginBottom: "14px", lineHeight: "1.5" }}>
                                            <strong>Ideal Answer:</strong> {q.idealAnswer}
                                        </div>
                                    )}

                                    {/* Action Buttons: Approve, Reject, Edit, Discard */}
                                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                        {!isApproved && (
                                            <button
                                                type="button"
                                                onClick={() => handleApproveQuestion(q)}
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
                                                ✓ Approve
                                            </button>
                                        )}
                                        {!isRejected && (
                                            <button
                                                type="button"
                                                onClick={() => handleRejectQuestion(q)}
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
                                                Reject
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(q)}
                                            className="wf-btn-outline"
                                            style={{ padding: "6px 12px", fontSize: "12px" }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDiscardQuestion(q)}
                                            style={{
                                                padding: "6px 12px",
                                                border: "1px solid #fecaca",
                                                borderRadius: "6px",
                                                backgroundColor: "#ffffff",
                                                color: "#dc2626",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Question Modal */}
            {editModalOpen && editingQuestion && (
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
                    <div className="wf-card" style={{ width: "520px", maxWidth: "100%", padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "17px", fontWeight: "700", color: "#111827", margin: 0 }}>
                                Edit Generated Question
                            </h2>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", color: "#9ca3af", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Question Text</label>
                                <textarea
                                    value={editingQuestion.questionText}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                                    rows={3}
                                    className="wf-input"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Ideal Reference Answer</label>
                                <textarea
                                    value={editingQuestion.idealAnswer || ""}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, idealAnswer: e.target.value })}
                                    rows={3}
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
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
                                    className="wf-btn-primary"
                                    style={{ padding: "8px 20px" }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
