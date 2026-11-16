import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Papa from "papaparse";
import api from "../utils/api";
import { useToast } from "../components/ui/ToastContext";
import EmailStatusBanner from "../components/EmailStatusBanner";
import {
    ArrowLeft,
    Check,
    ChevronRight,
    Upload,
    Download,
    Plus,
    Trash2,
    Send,
    Save,
    Mail,
    Users,
    Clock,
    Shield,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Info,
    Calendar,
    Settings2
} from "lucide-react";

export default function AdminBatchWizard() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    // Step state (1: Details, 2: Candidates, 3: Review & Send)
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Batch Configuration
    const [batchName, setBatchName] = useState("");
    const [orgName, setOrgName] = useState("AssessAI");
    const [opensAt, setOpensAt] = useState("");
    const [closesAt, setClosesAt] = useState("");
    const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(30);
    const [uniqueQuestions, setUniqueQuestions] = useState(true);
    const [restrictToAssigned, setRestrictToAssigned] = useState(true);

    // Step 2: Candidates grid
    const [candidates, setCandidates] = useState([
        {
            name: "",
            email: "",
            role: "Software Engineer",
            domain: "Fullstack",
            assessmentType: "theory",
            difficulty: "medium",
            totalQuestions: 5,
            durationMinutes: 30
        }
    ]);

    // Validation status
    const [validating, setValidating] = useState(false);
    const [validationSummary, setValidationSummary] = useState(null);

    // Step 3: Dispatch & Test
    const [mailOperational, setMailOperational] = useState(true);
    const [mailStatusInfo, setMailStatusInfo] = useState(null);
    const [testEmail, setTestEmail] = useState("");
    const [sendingTest, setSendingTest] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const [savingDraft, setSavingDraft] = useState(false);
    const [sendingBatch, setSendingBatch] = useState(false);
    const [sendProgress, setSendProgress] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Bulk apply state
    const [bulkRole, setBulkRole] = useState("Software Engineer");
    const [bulkDomain, setBulkDomain] = useState("Fullstack");
    const [bulkDifficulty, setBulkDifficulty] = useState("medium");
    const [bulkQuestions, setBulkQuestions] = useState(5);
    const [bulkDuration, setBulkDuration] = useState(30);

    // Prefill testEmail with admin's email if available
    useEffect(() => {
        const storedEmail = localStorage.getItem("email") || "";
        if (storedEmail) setTestEmail(storedEmail);
    }, []);

    // Validate candidates on Step 2 entry or change
    const runValidation = async (list) => {
        const clean = list.filter(c => c.name.trim() || c.email.trim());
        if (!clean.length) {
            setValidationSummary(null);
            return;
        }

        try {
            setValidating(true);
            const res = await api.post("/batches/validate", {
                candidates: clean.map(c => ({
                    name: c.name,
                    email: c.email,
                    role: c.role,
                    domain: c.domain
                }))
            });
            setValidationSummary(res.data);
        } catch (err) {
            console.warn("Candidate validation check failed:", err);
        } finally {
            setValidating(false);
        }
    };

    // CSV Parse handler
    const handleCsvUpload = (file) => {
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (!results.data || !results.data.length) {
                    addToast("The uploaded CSV file is empty.", "error");
                    return;
                }

                const parsed = results.data.map(row => {
                    const name = row.Name || row.name || row["Candidate Name"] || row["Full Name"] || "";
                    const email = row.Email || row.email || row["Email Address"] || "";
                    const role = row.Role || row.role || row["Role Title"] || "Software Engineer";
                    const domain = row.Domain || row.domain || row.Topic || "Fullstack";
                    const assessmentType = (row.Type || row.type || "theory").toLowerCase();
                    const difficulty = (row.Difficulty || row.difficulty || "medium").toLowerCase();
                    const totalQuestions = Number(row.Questions || row.questions || row.totalQuestions) || 5;
                    const durationMinutes = Number(row.Duration || row.duration || row.durationMinutes) || defaultDurationMinutes;

                    return {
                        name: name.trim(),
                        email: email.trim().toLowerCase(),
                        role: role.trim(),
                        domain: domain.trim(),
                        assessmentType: ["theory", "coding", "mixed"].includes(assessmentType) ? assessmentType : "theory",
                        difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
                        totalQuestions: Math.max(1, totalQuestions),
                        durationMinutes: Math.max(5, durationMinutes)
                    };
                }).filter(r => r.name || r.email);

                if (parsed.length > 0) {
                    setCandidates(parsed);
                    runValidation(parsed);
                    addToast(`Imported ${parsed.length} candidates from CSV.`, "success");
                } else {
                    addToast("No valid candidate rows found in CSV. Check column headers.", "error");
                }
            },
            error: (err) => {
                addToast(`Failed to parse CSV: ${err.message}`, "error");
            }
        });
    };

    // Sample CSV download
    const downloadSampleCsv = () => {
        const headers = ["Name", "Email", "Role", "Domain", "Type", "Difficulty", "Questions", "Duration"];
        const sampleRows = [
            ["Alex Morgan", "alex.morgan@example.com", "Software Engineer", "Fullstack", "theory", "medium", "5", "30"],
            ["Jordan Lee", "jordan.lee@example.com", "Backend Developer", "Node.js", "theory", "hard", "5", "45"],
            ["Taylor Swift", "taylor.s@example.com", "Frontend Developer", "React", "theory", "easy", "5", "30"]
        ];
        const csvContent = [headers.join(","), ...sampleRows.map(r => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "sample_exam_candidates.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Row management
    const addCandidateRow = () => {
        const lastRow = candidates[candidates.length - 1];
        setCandidates([
            ...candidates,
            {
                name: "",
                email: "",
                role: lastRow?.role || "Software Engineer",
                domain: lastRow?.domain || "Fullstack",
                assessmentType: lastRow?.assessmentType || "theory",
                difficulty: lastRow?.difficulty || "medium",
                totalQuestions: lastRow?.totalQuestions || 5,
                durationMinutes: lastRow?.durationMinutes || defaultDurationMinutes
            }
        ]);
    };

    const updateCandidateRow = (index, field, value) => {
        const updated = [...candidates];
        updated[index] = { ...updated[index], [field]: value };
        setCandidates(updated);
    };

    const removeCandidateRow = (index) => {
        if (candidates.length === 1) {
            setCandidates([{
                name: "",
                email: "",
                role: "Software Engineer",
                domain: "Fullstack",
                assessmentType: "theory",
                difficulty: "medium",
                totalQuestions: 5,
                durationMinutes: defaultDurationMinutes
            }]);
            return;
        }
        const updated = candidates.filter((_, i) => i !== index);
        setCandidates(updated);
        runValidation(updated);
    };

    // Bulk apply
    const applyBulkDefaults = () => {
        const updated = candidates.map(c => ({
            ...c,
            role: bulkRole,
            domain: bulkDomain,
            difficulty: bulkDifficulty,
            totalQuestions: Number(bulkQuestions) || 5,
            durationMinutes: Number(bulkDuration) || defaultDurationMinutes
        }));
        setCandidates(updated);
        addToast(`Applied defaults to all ${updated.length} candidate rows.`, "success");
    };

    // Navigation checks
    const goToStep2 = () => {
        if (!batchName.trim()) {
            addToast("Please provide a name for this exam batch.", "error");
            return;
        }
        setCurrentStep(2);
        runValidation(candidates);
    };

    const goToStep3 = () => {
        const clean = candidates.filter(c => c.name.trim() && c.email.trim());
        if (!clean.length) {
            addToast("Please add at least one candidate with a name and email.", "error");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalid = clean.filter(c => !emailRegex.test(c.email.trim()));
        if (invalid.length > 0) {
            addToast(`${invalid.length} candidate(s) have invalid email format.`, "error");
            return;
        }
        setCurrentStep(3);
    };

    // Action: Send test invite to me
    const handleSendTestInvite = async () => {
        if (!testEmail || !testEmail.includes("@")) {
            addToast("Please provide a valid test email address.", "error");
            return;
        }

        try {
            setSendingTest(true);
            setTestResult(null);

            // First create a temporary draft batch to run the test
            const draftRes = await api.post("/batches", {
                name: batchName || "Test Sample Batch",
                organizationName: orgName,
                opensAt: opensAt || null,
                closesAt: closesAt || null,
                defaultDurationSeconds: defaultDurationMinutes * 60,
                uniqueQuestions,
                restrictToAssigned,
                candidates: [{
                    name: "Test Preview Candidate",
                    email: testEmail.trim().toLowerCase(),
                    role: candidates[0]?.role || "Software Engineer",
                    domain: candidates[0]?.domain || "Fullstack",
                    durationSeconds: (candidates[0]?.durationMinutes || defaultDurationMinutes) * 60
                }]
            });

            const batchId = draftRes.data.batch._id;

            const sendRes = await api.post(`/batches/${batchId}/send`, {
                testEmail: testEmail.trim().toLowerCase()
            });

            setTestResult({
                success: true,
                message: sendRes.data.message || `Test invitation successfully sent to ${testEmail}!`
            });
            addToast(`Test invite sent to ${testEmail}!`, "success");
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setTestResult({ success: false, message: msg });
            addToast(`Failed to send test invite: ${msg}`, "error");
        } finally {
            setSendingTest(false);
        }
    };

    // Action: Save as Draft
    const handleSaveDraft = async () => {
        try {
            setSavingDraft(true);
            const cleanCandidates = candidates
                .filter(c => c.name.trim() && c.email.trim())
                .map(c => ({
                    name: c.name.trim(),
                    email: c.email.trim().toLowerCase(),
                    role: c.role,
                    roleTitle: c.role,
                    domain: c.domain,
                    assessmentType: c.assessmentType,
                    difficulty: c.difficulty,
                    totalQuestions: Number(c.totalQuestions) || 5,
                    durationSeconds: (Number(c.durationMinutes) || defaultDurationMinutes) * 60
                }));

            const res = await api.post("/batches", {
                name: batchName.trim(),
                organizationName: orgName.trim(),
                opensAt: opensAt || null,
                closesAt: closesAt || null,
                defaultDurationSeconds: defaultDurationMinutes * 60,
                uniqueQuestions,
                restrictToAssigned,
                candidates: cleanCandidates
            });

            addToast("Batch saved as draft.", "success");
            navigate(`/admin/batches/${res.data.batch._id}`);
        } catch (err) {
            addToast(`Failed to save draft: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setSavingDraft(false);
        }
    };

    // Action: Send Invites (Final Dispatch)
    const handleDispatchBatch = async () => {
        setShowConfirmModal(false);
        try {
            setSendingBatch(true);
            setSendProgress({ status: "creating", message: "Creating batch and initializing test questions..." });

            const cleanCandidates = candidates
                .filter(c => c.name.trim() && c.email.trim())
                .map(c => ({
                    name: c.name.trim(),
                    email: c.email.trim().toLowerCase(),
                    role: c.role,
                    roleTitle: c.role,
                    domain: c.domain,
                    assessmentType: c.assessmentType,
                    difficulty: c.difficulty,
                    totalQuestions: Number(c.totalQuestions) || 5,
                    durationSeconds: (Number(c.durationMinutes) || defaultDurationMinutes) * 60
                }));

            // 1. Create Batch
            const batchRes = await api.post("/batches", {
                name: batchName.trim(),
                organizationName: orgName.trim(),
                opensAt: opensAt || null,
                closesAt: closesAt || null,
                defaultDurationSeconds: defaultDurationMinutes * 60,
                uniqueQuestions,
                restrictToAssigned,
                candidates: cleanCandidates
            });

            const batchId = batchRes.data.batch._id;
            setSendProgress({ status: "dispatching", message: `Generating unique tests and emailing ${cleanCandidates.length} candidates...` });

            // 2. Dispatch Invites
            const dispatchRes = await api.post(`/batches/${batchId}/send`, {});
            const { sentCount = 0, failedCount = 0, results = [] } = dispatchRes.data;

            if (failedCount > 0) {
                setSendProgress({
                    status: "partial",
                    batchId,
                    sentCount,
                    failedCount,
                    results,
                    message: `Completed with errors: ${sentCount} sent, ${failedCount} failed.`
                });
                addToast(`Dispatched ${sentCount} invites (${failedCount} failed).`, "error");
            } else {
                addToast(`Successfully dispatched invites for ${sentCount} candidates!`, "success");
                navigate(`/admin/batches/${batchId}`);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setSendProgress({ status: "error", message: msg });
            addToast(`Dispatch error: ${msg}`, "error");
        } finally {
            setSendingBatch(false);
        }
    };

    const handleRetryFailed = async (batchId) => {
        try {
            setSendingBatch(true);
            setSendProgress(prev => ({ ...prev, status: "dispatching", message: "Retrying failed invites..." }));
            const res = await api.post(`/batches/${batchId}/send`, { forceResend: true });
            if (res.data.failedCount > 0) {
                setSendProgress({
                    status: "partial",
                    batchId,
                    sentCount: res.data.sentCount,
                    failedCount: res.data.failedCount,
                    results: res.data.results,
                    message: `Retry completed: ${res.data.sentCount} sent, ${res.data.failedCount} still failed.`
                });
            } else {
                addToast("All failed invites successfully sent!", "success");
                navigate(`/admin/batches/${batchId}`);
            }
        } catch (err) {
            addToast(`Retry failed: ${err.response?.data?.message || err.message}`, "error");
        } finally {
            setSendingBatch(false);
        }
    };

    const validCandidatesCount = candidates.filter(c => c.name.trim() && c.email.trim()).length;

    return (
        <div className="wf-page-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 24px" }}>
            {/* Top breadcrumb & header */}
            <div style={{ marginBottom: "24px" }}>
                <Link
                    to="/admin/batches"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        color: "#64748b",
                        textDecoration: "none",
                        marginBottom: "12px",
                        fontWeight: 500
                    }}
                >
                    <ArrowLeft size={14} /> Back to Exam Batches
                </Link>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#0f172a", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                            Create Exam Batch
                        </h1>
                        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                            Configure test window, add candidate roster, randomize question pools, and dispatch credentials.
                        </p>
                    </div>

                    {/* Step progress pills */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {[
                            { num: 1, label: "Exam Details" },
                            { num: 2, label: "Candidates & Tests" },
                            { num: 3, label: "Review & Send" }
                        ].map((s, idx) => {
                            const isDone = currentStep > s.num;
                            const isCurrent = currentStep === s.num;
                            return (
                                <div key={s.num} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div
                                        onClick={() => {
                                            if (s.num === 1) setCurrentStep(1);
                                            else if (s.num === 2 && batchName.trim()) setCurrentStep(2);
                                            else if (s.num === 3 && batchName.trim() && validCandidatesCount > 0) setCurrentStep(3);
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "6px 12px",
                                            borderRadius: "20px",
                                            backgroundColor: isCurrent ? "#16a34a" : isDone ? "#dcfce7" : "#f1f5f9",
                                            color: isCurrent ? "#ffffff" : isDone ? "#166534" : "#64748b",
                                            fontSize: "12px",
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: "18px",
                                                height: "18px",
                                                borderRadius: "50%",
                                                backgroundColor: isCurrent ? "rgba(255,255,255,0.25)" : isDone ? "#16a34a" : "#cbd5e1",
                                                color: isDone ? "#ffffff" : "inherit",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "10px",
                                                fontWeight: 600
                                            }}
                                        >
                                            {isDone ? <Check size={10} /> : s.num}
                                        </span>
                                        {s.label}
                                    </div>
                                    {idx < 2 && <ChevronRight size={14} style={{ color: "#94a3b8" }} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* STEP 1: EXAM DETAILS */}
            {currentStep === 1 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
                    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "28px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginBottom: "20px" }}>
                            General Information & Schedule
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
                                    Batch Name <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={batchName}
                                    onChange={(e) => setBatchName(e.target.value)}
                                    placeholder="e.g. 2026 Campus Hiring Sprint - Round 1"
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                    autoFocus
                                />
                                <span style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "block" }}>
                                    A descriptive identifier for this candidate cohort.
                                </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
                                        Organization / Department
                                    </label>
                                    <input
                                        type="text"
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        placeholder="e.g. TechCorp Labs"
                                        style={{
                                            width: "100%",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "14px"
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
                                        Default Duration (Minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="180"
                                        value={defaultDurationMinutes}
                                        onChange={(e) => setDefaultDurationMinutes(Number(e.target.value) || 30)}
                                        style={{
                                            width: "100%",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "14px"
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Exam Window Schedule */}
                            <div style={{ padding: "18px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                    <Calendar size={16} style={{ color: "#16a34a" }} />
                                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>Exam Time Window (Optional)</span>
                                </div>
                                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                                    Leave blank to allow candidates to take their assessment immediately without deadline enforcement.
                                </p>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                                            Opens At (Local Time)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={opensAt}
                                            onChange={(e) => setOpensAt(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "13px"
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                                            Closes At (Deadline)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={closesAt}
                                            onChange={(e) => setClosesAt(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #cbd5e1",
                                                fontSize: "13px"
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Toggles */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
                                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={uniqueQuestions}
                                        onChange={(e) => setUniqueQuestions(e.target.checked)}
                                        style={{ marginTop: "3px", accentColor: "#16a34a" }}
                                    />
                                    <div>
                                        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a" }}>
                                            Unique questions for each candidate
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                            Picks distinct randomized question subsets from the bank so candidates cannot easily share answers.
                                        </div>
                                    </div>
                                </label>

                                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={restrictToAssigned}
                                        onChange={(e) => setRestrictToAssigned(e.target.checked)}
                                        style={{ marginTop: "3px", accentColor: "#16a34a" }}
                                    />
                                    <div>
                                        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0f172a" }}>
                                            Restrict candidates to assigned tests only
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                            Hides practice carousels and free exploration during the active batch period.
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={goToStep2}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "10px 20px",
                                    backgroundColor: "#16a34a",
                                    color: "#ffffff",
                                    borderRadius: "8px",
                                    border: "none",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    cursor: "pointer"
                                }}
                            >
                                Continue to Candidates <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Right Info Box */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                <Shield size={18} style={{ color: "#16a34a" }} />
                                <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>Proctoring & Integrity</span>
                            </div>
                            <p style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, margin: 0 }}>
                                All batch exams enforce live proctoring telemetry:
                            </p>
                            <ul style={{ fontSize: "12px", color: "#64748b", margin: "10px 0 0 0", paddingLeft: "20px", lineHeight: 1.6 }}>
                                <li>Tab switch tracking & warnings</li>
                                <li>Fullscreen exits & clipboard paste blocking</li>
                                <li>Consent checkbox required before test start</li>
                                <li>Live integrity score computed on submission</li>
                            </ul>
                        </div>

                        <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                <Mail size={16} style={{ color: "#16a34a" }} />
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "#166534" }}>Automated Emailing</span>
                            </div>
                            <p style={{ fontSize: "12px", color: "#15803d", margin: 0, lineHeight: 1.5 }}>
                                When dispatched, each candidate receives a secure login link, prefilled email, auto-generated temporary password, and instructions.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: CANDIDATES & TESTS */}
            {currentStep === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Bulk Action & CSV Bar */}
                    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
                            <div>
                                <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", margin: "0 0 4px 0" }}>
                                    Candidate Roster & Test Configuration
                                </h2>
                                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                                    Upload a CSV roster or manually enter candidates. You can customize the role, domain, and questions per person.
                                </p>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={downloadSampleCsv}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "8px 14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#475569",
                                        cursor: "pointer"
                                    }}
                                >
                                    <Download size={14} /> Download Sample CSV
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".csv"
                                    style={{ display: "none" }}
                                    onChange={(e) => handleCsvUpload(e.target.files[0])}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "8px 14px",
                                        backgroundColor: "#16a34a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        cursor: "pointer"
                                    }}
                                >
                                    <Upload size={14} /> Import CSV
                                </button>
                            </div>
                        </div>

                        {/* Bulk Apply Bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Apply to all rows:</span>
                            <input
                                type="text"
                                placeholder="Role"
                                value={bulkRole}
                                onChange={(e) => setBulkRole(e.target.value)}
                                style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "160px" }}
                            />
                            <input
                                type="text"
                                placeholder="Domain"
                                value={bulkDomain}
                                onChange={(e) => setBulkDomain(e.target.value)}
                                style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "140px" }}
                            />
                            <select
                                value={bulkDifficulty}
                                onChange={(e) => setBulkDifficulty(e.target.value)}
                                style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Questions"
                                min="1"
                                max="20"
                                value={bulkQuestions}
                                onChange={(e) => setBulkQuestions(e.target.value)}
                                style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "80px" }}
                            />
                            <button
                                type="button"
                                onClick={applyBulkDefaults}
                                style={{
                                    padding: "6px 12px",
                                    backgroundColor: "#e2e8f0",
                                    color: "#1e293b",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    cursor: "pointer"
                                }}
                            >
                                Apply Defaults
                            </button>
                        </div>
                    </div>

                    {/* Candidate Table Grid */}
                    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                                        <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569", width: "40px" }}>#</th>
                                        <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>Candidate Name <span style={{ color: "#ef4444" }}>*</span></th>
                                        <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>Candidate Email <span style={{ color: "#ef4444" }}>*</span></th>
                                        <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>Role</th>
                                        <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569" }}>Domain</th>
                                        <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569", width: "110px" }}>Difficulty</th>
                                        <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569", width: "90px" }}>Qs</th>
                                        <th style={{ padding: "12px 14px", fontWeight: 600, color: "#475569", width: "90px" }}>Mins</th>
                                        <th style={{ padding: "12px 14px", width: "40px" }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map((cand, idx) => (
                                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{idx + 1}</td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <input
                                                    type="text"
                                                    value={cand.name}
                                                    onChange={(e) => updateCandidateRow(idx, "name", e.target.value)}
                                                    placeholder="Alex Morgan"
                                                    style={{ width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                />
                                            </td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <input
                                                    type="email"
                                                    value={cand.email}
                                                    onChange={(e) => updateCandidateRow(idx, "email", e.target.value)}
                                                    placeholder="alex@example.com"
                                                    style={{ width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                />
                                            </td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <input
                                                    type="text"
                                                    value={cand.role}
                                                    onChange={(e) => updateCandidateRow(idx, "role", e.target.value)}
                                                    style={{ width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                />
                                            </td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <input
                                                    type="text"
                                                    value={cand.domain}
                                                    onChange={(e) => updateCandidateRow(idx, "domain", e.target.value)}
                                                    style={{ width: "100%", padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                />
                                            </td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <select
                                                    value={cand.difficulty}
                                                    onChange={(e) => updateCandidateRow(idx, "difficulty", e.target.value)}
                                                    style={{ width: "100%", padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                >
                                                    <option value="easy">Easy</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="hard">Hard</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="20"
                                                    value={cand.totalQuestions}
                                                    onChange={(e) => updateCandidateRow(idx, "totalQuestions", Number(e.target.value) || 5)}
                                                    style={{ width: "100%", padding: "6px 8px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                />
                                            </td>
                                            <td style={{ padding: "8px 10px" }}>
                                                <input
                                                    type="number"
                                                    min="5"
                                                    max="180"
                                                    value={cand.durationMinutes}
                                                    onChange={(e) => updateCandidateRow(idx, "durationMinutes", Number(e.target.value) || 30)}
                                                    style={{ width: "100%", padding: "6px 8px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                />
                                            </td>
                                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => removeCandidateRow(idx)}
                                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                                                    title="Remove candidate"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Row Button */}
                        <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <button
                                type="button"
                                onClick={addCandidateRow}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: "none",
                                    border: "1px dashed #cbd5e1",
                                    borderRadius: "6px",
                                    padding: "8px 16px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "#475569",
                                    cursor: "pointer"
                                }}
                            >
                                <Plus size={14} /> Add Candidate Row
                            </button>

                            {/* Validation summary badge */}
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}>
                                {validating ? (
                                    <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                                        <Loader2 size={14} className="animate-spin" /> Checking accounts...
                                    </span>
                                ) : validationSummary ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ padding: "4px 8px", borderRadius: "12px", backgroundColor: "#f0fdf4", color: "#166534", fontSize: "12px", fontWeight: 500 }}>
                                            {validationSummary.newCount} New Accounts
                                        </span>
                                        {validationSummary.existingCount > 0 && (
                                            <span style={{ padding: "4px 8px", borderRadius: "12px", backgroundColor: "#eff6ff", color: "#1e40af", fontSize: "12px", fontWeight: 500 }}>
                                                {validationSummary.existingCount} Existing Accounts
                                            </span>
                                        )}
                                        {validationSummary.invalidCount > 0 && (
                                            <span style={{ padding: "4px 8px", borderRadius: "12px", backgroundColor: "#fef2f2", color: "#991b1b", fontSize: "12px", fontWeight: 500 }}>
                                                {validationSummary.invalidCount} Incomplete/Invalid
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span style={{ color: "#64748b" }}>{validCandidatesCount} candidate(s) entered</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Step 2 Bottom Controls */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                        <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "10px 18px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#475569",
                                cursor: "pointer"
                            }}
                        >
                            <ArrowLeft size={16} /> Back to Details
                        </button>

                        <button
                            type="button"
                            onClick={goToStep3}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "10px 20px",
                                backgroundColor: "#16a34a",
                                color: "#ffffff",
                                borderRadius: "8px",
                                border: "none",
                                fontWeight: 500,
                                fontSize: "14px",
                                cursor: "pointer"
                            }}
                        >
                            Review & Send Invites <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: REVIEW & DISPATCH */}
            {currentStep === 3 && (
                <div>
                    {/* Part 3: Top Email Status Banner in Step 3 */}
                    <EmailStatusBanner
                        onStatusChange={(st) => {
                            setMailOperational(st.operational);
                            setMailStatusInfo(st);
                        }}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px", alignItems: "start" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Summary Card */}
                        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
                            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>
                                Batch Overview
                            </h2>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
                                <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Batch Name</div>
                                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{batchName}</div>
                                </div>
                                <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Organization</div>
                                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{orgName}</div>
                                </div>
                                <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Candidates</div>
                                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#16a34a" }}>{validCandidatesCount} total</div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                                <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Exam Window</div>
                                    <div style={{ fontSize: "13px", color: "#0f172a" }}>
                                        {opensAt || closesAt ? (
                                            <>
                                                <div><strong>Opens:</strong> {opensAt ? new Date(opensAt).toLocaleString() : "Immediate"}</div>
                                                <div><strong>Closes:</strong> {closesAt ? new Date(closesAt).toLocaleString() : "No deadline"}</div>
                                            </>
                                        ) : (
                                            "Open / Self-paced (No strict window)"
                                        )}
                                    </div>
                                </div>
                                <div style={{ padding: "14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Rules & Restrictions</div>
                                    <div style={{ fontSize: "13px", color: "#0f172a", display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <span>• {uniqueQuestions ? "Unique randomized questions per candidate" : "Identical question set"}</span>
                                        <span>• {restrictToAssigned ? "Restricted to assigned assessment only" : "Free practice allowed"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Candidate Table Snippet */}
                            <div>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                                    Candidates to be invited ({validCandidatesCount}):
                                </div>
                                <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                        <thead>
                                            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                                                <th style={{ padding: "8px 12px", color: "#64748b" }}>Name</th>
                                                <th style={{ padding: "8px 12px", color: "#64748b" }}>Email</th>
                                                <th style={{ padding: "8px 12px", color: "#64748b" }}>Role / Domain</th>
                                                <th style={{ padding: "8px 12px", color: "#64748b" }}>Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {candidates.filter(c => c.name.trim() && c.email.trim()).map((c, i) => (
                                                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                    <td style={{ padding: "8px 12px", fontWeight: 500, color: "#0f172a" }}>{c.name}</td>
                                                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{c.email}</td>
                                                    <td style={{ padding: "8px 12px", color: "#475569" }}>{c.role} ({c.domain})</td>
                                                    <td style={{ padding: "8px 12px", color: "#475569" }}>{c.durationMinutes || defaultDurationMinutes} mins</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 Action Controls */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(2)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "10px 18px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: "#475569",
                                    cursor: "pointer"
                                }}
                            >
                                <ArrowLeft size={16} /> Back to Candidates
                            </button>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    disabled={savingDraft || sendingBatch}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "10px 18px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        color: "#334155",
                                        cursor: "pointer"
                                    }}
                                >
                                    {savingDraft ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save as Draft
                                </button>

                                {!mailOperational && (
                                    <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: 500, marginRight: "8px" }}>
                                        Email service disconnected or in dry-run mode.
                                    </span>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(true)}
                                    disabled={sendingBatch || validCandidatesCount === 0 || !mailOperational}
                                    title={!mailOperational ? "Email service is not operational. See setup banner." : ""}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "10px 22px",
                                        backgroundColor: (!mailOperational || validCandidatesCount === 0) ? "#94a3b8" : "#16a34a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: 500,
                                        cursor: (!mailOperational || validCandidatesCount === 0) ? "not-allowed" : "pointer",
                                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                    }}
                                >
                                    {sendingBatch ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Send Invites Now ({validCandidatesCount})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Test Invite Box & Tips */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                <Mail size={16} style={{ color: "#16a34a" }} />
                                <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>Test Invite Email</span>
                            </div>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 14px 0", lineHeight: 1.5 }}>
                                Preview the exact invitation email, credentials, and links before sending to real candidates.
                            </p>

                            <div style={{ marginBottom: "12px" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#475569", marginBottom: "4px" }}>
                                    Send sample invite to:
                                </label>
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="your.email@company.com"
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        fontSize: "13px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1"
                                    }}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleSendTestInvite}
                                disabled={sendingTest || !testEmail}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    padding: "8px 12px",
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "#1e293b",
                                    cursor: "pointer"
                                }}
                            >
                                {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Send test invite to me
                            </button>

                            {testResult && (
                                <div
                                    style={{
                                        marginTop: "12px",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        backgroundColor: testResult.success ? "#f0fdf4" : "#fef2f2",
                                        color: testResult.success ? "#166534" : "#991b1b",
                                        border: `1px solid ${testResult.success ? "#bbf7d0" : "#fecaca"}`
                                    }}
                                >
                                    {testResult.message}
                                </div>
                            )}
                        </div>

                        {/* Dispatch Progress indicator */}
                        {sendProgress && (
                            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                    {sendProgress.status === "dispatching" || sendProgress.status === "creating" ? (
                                        <Loader2 size={16} className="animate-spin" style={{ color: "#16a34a" }} />
                                    ) : sendProgress.status === "partial" ? (
                                        <AlertCircle size={16} style={{ color: "#dc2626" }} />
                                    ) : (
                                        <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                                    )}
                                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                                        {sendProgress.status === "partial" ? "Dispatch Completed with Errors" : "Dispatch Status"}
                                    </span>
                                </div>
                                <div style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>
                                    {sendProgress.message}
                                </div>

                                {sendProgress.results && (
                                    <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "6px", marginBottom: "12px" }}>
                                        {sendProgress.results.map((r, idx) => (
                                            <div key={idx} style={{ padding: "6px 10px", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f8fafc" }}>
                                                <div>
                                                    <strong>{r.name}</strong> ({r.email})
                                                </div>
                                                <div>
                                                    {r.status === "emailed" ? (
                                                        <span style={{ color: "#166534", fontWeight: 600 }}>✓ Sent</span>
                                                    ) : (
                                                        <span style={{ color: "#dc2626", fontWeight: 600 }} title={r.error}>✗ Failed</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {sendProgress.status === "partial" && sendProgress.batchId && (
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            type="button"
                                            onClick={() => handleRetryFailed(sendProgress.batchId)}
                                            disabled={sendingBatch}
                                            style={{
                                                flex: 1,
                                                padding: "7px",
                                                backgroundColor: "#16a34a",
                                                color: "#ffffff",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: 500,
                                                cursor: "pointer"
                                            }}
                                        >
                                            Retry Failed Only
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/admin/batches/${sendProgress.batchId}`)}
                                            style={{
                                                flex: 1,
                                                padding: "7px",
                                                backgroundColor: "#f1f5f9",
                                                color: "#334155",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: 500,
                                                cursor: "pointer"
                                            }}
                                        >
                                            Go to Tracking
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(15, 23, 42, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: "16px"
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "14px",
                            padding: "24px",
                            maxWidth: "480px",
                            width: "100%",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                            <div
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "50%",
                                    backgroundColor: "#dcfce7",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#16a34a"
                                }}
                            >
                                <Send size={18} />
                            </div>
                            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0f172a", margin: 0 }}>
                                Dispatch Exam Invitations?
                            </h3>
                        </div>

                        <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.5, margin: "0 0 18px 0" }}>
                            You are about to create accounts and email login credentials to{" "}
                            <strong>{validCandidatesCount} candidates</strong> for <strong>{batchName}</strong>.
                        </p>

                        <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#64748b", marginBottom: "20px" }}>
                            • Each candidate will receive their temporary password and custom test link.<br />
                            • Tests will be randomized per your settings.<br />
                            • You can track candidate logins and progress live in the batch dashboard.
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "#475569",
                                    cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDispatchBatch}
                                style={{
                                    padding: "8px 18px",
                                    backgroundColor: "#16a34a",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    color: "#ffffff",
                                    cursor: "pointer"
                                }}
                            >
                                Yes, Dispatch Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
