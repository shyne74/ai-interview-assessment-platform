import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function AdminRegisterCandidates() {
    const navigate = useNavigate();

    // Roles state
    const [rolesList, setRolesList] = useState([]);

    // Single candidate state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Backend Developer");
    const [passwordOption, setPasswordOption] = useState("Generate automatic secure password");
    const [manualPassword, setManualPassword] = useState("");
    const [loadingSingle, setLoadingSingle] = useState(false);
    const [registeredCandidate, setRegisteredCandidate] = useState(null);
    const [copiedPassword, setCopiedPassword] = useState(false);

    // Bulk CSV state
    const [csvFile, setCsvFile] = useState(null);
    const [csvFileName, setCsvFileName] = useState("");
    const [parsedCandidates, setParsedCandidates] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loadingBulk, setLoadingBulk] = useState(false);
    const [bulkReport, setBulkReport] = useState(null);

    // Global notifications
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Load available roles for dropdown
    useEffect(() => {
        const loadRoles = async () => {
            try {
                const res = await api.get("/roles");
                const roles = res.data.roles || [];
                setRolesList(roles);
                if (roles.length > 0) {
                    setRole(roles[0].title);
                }
            } catch (err) {
                console.error("Failed to load roles:", err);
            }
        };
        loadRoles();
    }, []);

    // Single Registration
    const handleAddSingle = async (e) => {
        e.preventDefault();
        setLoadingSingle(true);
        setErrorMessage("");
        setSuccessMessage("");
        setRegisteredCandidate(null);
        setCopiedPassword(false);

        try {
            const payload = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                preferredRole: role,
                password: passwordOption === "Set a temporary password manually" ? manualPassword.trim() : undefined
            };

            const res = await api.post("/auth/candidates", payload);
            const cand = res.data.candidate;

            setRegisteredCandidate(cand);
            setSuccessMessage(`Candidate ${cand.username} registered successfully!`);
            setName("");
            setEmail("");
            setManualPassword("");
        } catch (err) {
            console.error("Failed to add candidate:", err);
            setErrorMessage(err.response?.data?.message || "Failed to register candidate. Please check details.");
        } finally {
            setLoadingSingle(false);
        }
    };

    const handleCopyPassword = () => {
        if (!registeredCandidate?.tempPassword) return;
        navigator.clipboard.writeText(registeredCandidate.tempPassword);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 3000);
    };

    // Download Sample CSV
    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," +
            "name,email,role\n" +
            "Aarav Sharma,aarav.sharma@example.com,Backend Developer\n" +
            "Riya Patel,riya.patel@example.com,Frontend Developer\n" +
            "Kabir Verma,kabir.verma@example.com,Full Stack Developer\n" +
            "Ananya Sen,ananya.sen@example.com,AI/ML Engineer";

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "candidates_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Parse CSV file content
    const processCsvText = (text) => {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
            setErrorMessage("CSV file must contain a header row and at least one candidate row.");
            setParsedCandidates([]);
            return;
        }

        const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
        const nameIdx = header.indexOf("name");
        const emailIdx = header.indexOf("email");
        const roleIdx = header.indexOf("role");

        if (nameIdx === -1 || emailIdx === -1) {
            setErrorMessage("CSV header must contain 'name' and 'email' columns (e.g. name,email,role).");
            setParsedCandidates([]);
            return;
        }

        const parsed = [];
        const seenInFile = new Set();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
            const rawName = cols[nameIdx] || "";
            const rawEmail = (cols[emailIdx] || "").toLowerCase();
            const rawRole = roleIdx !== -1 && cols[roleIdx] ? cols[roleIdx] : "Backend Developer";

            let validationStatus = "Valid";
            let validationError = "";

            if (!rawName) {
                validationStatus = "Invalid";
                validationError = "Missing candidate name";
            } else if (!rawEmail || !emailRegex.test(rawEmail)) {
                validationStatus = "Invalid";
                validationError = "Malformed email address";
            } else if (seenInFile.has(rawEmail)) {
                validationStatus = "Duplicate";
                validationError = "Duplicate email in uploaded file";
            } else {
                seenInFile.add(rawEmail);
            }

            parsed.push({
                rowNum: i,
                name: rawName,
                email: rawEmail,
                role: rawRole,
                status: validationStatus,
                error: validationError
            });
        }

        setParsedCandidates(parsed);
    };

    // File change handler
    const handleCsvFileChange = (file) => {
        if (!file) return;
        setCsvFile(file);
        setCsvFileName(file.name);
        setErrorMessage("");
        setSuccessMessage("");
        setBulkReport(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if (typeof content === "string") {
                processCsvText(content);
            }
        };
        reader.readAsText(file);
    };

    // Drag and Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && (file.name.endsWith(".csv") || file.type.includes("csv") || file.type.includes("text"))) {
            handleCsvFileChange(file);
        } else {
            setErrorMessage("Please drop a valid .csv spreadsheet file.");
        }
    };

    // Submit Bulk Candidates
    const handleUploadBulk = async () => {
        const validCandidates = parsedCandidates
            .filter(c => c.status === "Valid")
            .map(c => ({ name: c.name, email: c.email, role: c.role }));

        if (validCandidates.length === 0) {
            setErrorMessage("No valid candidate rows available for import.");
            return;
        }

        setLoadingBulk(true);
        setErrorMessage("");
        setSuccessMessage("");
        setBulkReport(null);

        try {
            const res = await api.post("/auth/candidates/bulk", { candidates: validCandidates });
            const data = res.data;

            setBulkReport(data);
            setSuccessMessage(`Bulk registration processed: ${data.addedCount} candidates added, ${data.skippedCount} skipped.`);
            setCsvFile(null);
            setCsvFileName("");
            setParsedCandidates([]);
        } catch (err) {
            console.error("Bulk upload failed:", err);
            setErrorMessage(err.response?.data?.message || "Failed to process bulk upload.");
        } finally {
            setLoadingBulk(false);
        }
    };

    const validCount = parsedCandidates.filter(c => c.status === "Valid").length;
    const invalidCount = parsedCandidates.length - validCount;

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <Link to="/candidate-data">Admin · Candidates</Link>
                <span>›</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Register candidates</span>
            </div>

            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 className="wf-page-title">Register candidates</h1>
                <p className="wf-page-subtitle">
                    Onboard candidates individually with instant temporary credentials, or batch import a roster via CSV.
                </p>
            </div>

            {/* Company Exam Mode Banner */}
            <div
                style={{
                    padding: "16px 20px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px"
                }}
            >
                <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#166534", marginBottom: "2px" }}>
                        Need to run a formal company exam round?
                    </div>
                    <div style={{ fontSize: "12px", color: "#15803d" }}>
                        Schedule an exam window, assign randomized tests, send email credentials with 1-click links, and monitor live progress.
                    </div>
                </div>
                <Link
                    to="/admin/batches/new"
                    style={{
                        padding: "8px 16px",
                        backgroundColor: "#16a34a",
                        color: "#ffffff",
                        textDecoration: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "500",
                        whiteSpace: "nowrap"
                    }}
                >
                    Create Exam Batch →
                </Link>
            </div>

            {successMessage && (
                <div style={{ padding: "12px 18px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "24px" }}>
                    ✓ {successMessage}
                </div>
            )}

            {errorMessage && (
                <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "24px" }}>
                    ⚠ {errorMessage}
                </div>
            )}

            {/* 2-Column Split: Single Candidate vs Bulk CSV */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
                {/* Column 1: One Candidate Registration */}
                <div className="wf-card">
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                        OPTION 1 · SINGLE ONBOARDING
                    </div>
                    <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", marginBottom: "20px" }}>
                        Add single candidate
                    </h2>

                    <form onSubmit={handleAddSingle}>
                        <div style={{ marginBottom: "16px" }}>
                            <label className="wf-form-label">Full Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Riya Das"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="wf-input"
                            />
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label className="wf-form-label">Email Address</label>
                            <input
                                type="email"
                                placeholder="riya.das@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="wf-input"
                            />
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label className="wf-form-label">Target Engineering Track</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="wf-input"
                                style={{ backgroundColor: "#ffffff" }}
                            >
                                {rolesList.length > 0 ? (
                                    rolesList.map(r => (
                                        <option key={r._id || r.title} value={r.title}>{r.title}</option>
                                    ))
                                ) : (
                                    <>
                                        <option>Backend Developer</option>
                                        <option>Frontend Developer</option>
                                        <option>Full Stack Developer</option>
                                        <option>AI/ML Engineer</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label className="wf-form-label">Password Generation Option</label>
                            <select
                                value={passwordOption}
                                onChange={(e) => setPasswordOption(e.target.value)}
                                className="wf-input"
                                style={{ backgroundColor: "#ffffff" }}
                            >
                                <option>Generate automatic secure password</option>
                                <option>Set a temporary password manually</option>
                            </select>
                        </div>

                        {passwordOption === "Set a temporary password manually" && (
                            <div style={{ marginBottom: "20px" }}>
                                <label className="wf-form-label">Temporary Password</label>
                                <input
                                    type="text"
                                    placeholder="Enter initial temporary password"
                                    value={manualPassword}
                                    onChange={(e) => setManualPassword(e.target.value)}
                                    required
                                    className="wf-input"
                                />
                            </div>
                        )}

                        <div style={{ marginTop: "24px" }}>
                            <button
                                type="submit"
                                disabled={loadingSingle}
                                className="wf-btn-primary"
                                style={{ width: "100%", padding: "10px", fontSize: "14px" }}
                            >
                                {loadingSingle ? "Registering Candidate..." : "Register Candidate"}
                            </button>
                        </div>
                    </form>

                    {/* Temporary Password Credential Display Card */}
                    {registeredCandidate && (
                        <div style={{
                            marginTop: "24px",
                            padding: "16px",
                            backgroundColor: "#f0f7ff",
                            border: "1.5px solid #3b82f6",
                            borderRadius: "10px"
                        }}>
                            <div style={{ fontSize: "12px", fontWeight: "700", color: "#1e40af", marginBottom: "6px" }}>
                                CANDIDATE CREATED — ONE-TIME CREDENTIALS
                            </div>
                            <div style={{ fontSize: "13px", color: "#1f2937", marginBottom: "4px" }}>
                                <strong>User:</strong> {registeredCandidate.username} ({registeredCandidate.email})
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                                <div style={{
                                    flex: 1,
                                    fontFamily: "monospace",
                                    fontSize: "14px",
                                    fontWeight: "700",
                                    backgroundColor: "#ffffff",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    color: "#0f172a"
                                }}>
                                    {registeredCandidate.tempPassword}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopyPassword}
                                    style={{
                                        padding: "8px 14px",
                                        backgroundColor: copiedPassword ? "#059669" : "#1e40af",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    {copiedPassword ? "✓ Copied" : "Copy Password"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Column 2: Bulk CSV Upload */}
                <div className="wf-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                            OPTION 2 · BATCH CSV IMPORT
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                                textDecoration: "underline"
                            }}
                        >
                            Download CSV template
                        </button>
                    </div>

                    <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", marginBottom: "16px" }}>
                        Upload candidate spreadsheet
                    </h2>

                    {/* Drag and Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{
                            border: isDragging ? "2px dashed #2563eb" : "2px dashed #cbd5e1",
                            backgroundColor: isDragging ? "#eff6ff" : "#f8fafc",
                            borderRadius: "10px",
                            padding: "28px 20px",
                            textAlign: "center",
                            cursor: "pointer",
                            marginBottom: "16px",
                            transition: "all 0.15s ease"
                        }}
                        onClick={() => document.getElementById("csv-file-input").click()}
                    >
                        <input
                            id="csv-file-input"
                            type="file"
                            accept=".csv,text/csv"
                            style={{ display: "none" }}
                            onChange={(e) => handleCsvFileChange(e.target.files?.[0])}
                        />
                        <div style={{ fontSize: "28px", marginBottom: "8px" }}>📄</div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                            {csvFileName ? csvFileName : "Drag and drop CSV here, or browse"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            Header columns: <code>name</code>, <code>email</code>, <code>role</code>
                        </div>
                    </div>

                    {/* Parsed Candidates Preview */}
                    {parsedCandidates.length > 0 && (
                        <div style={{ marginBottom: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>
                                    Preview ({parsedCandidates.length} rows)
                                </div>
                                <div style={{ fontSize: "12px" }}>
                                    <span style={{ color: "#059669", fontWeight: "600", marginRight: "8px" }}>
                                        ✓ {validCount} valid
                                    </span>
                                    {invalidCount > 0 && (
                                        <span style={{ color: "#dc2626", fontWeight: "600" }}>
                                            ⚠ {invalidCount} invalid
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                    <thead style={{ backgroundColor: "#f9fafb", position: "sticky", top: 0 }}>
                                        <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", color: "#6b7280" }}>
                                            <th style={{ padding: "6px 10px" }}>Name</th>
                                            <th style={{ padding: "6px 10px" }}>Email</th>
                                            <th style={{ padding: "6px 10px" }}>Role</th>
                                            <th style={{ padding: "6px 10px" }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedCandidates.map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: row.status !== "Valid" ? "#fef2f2" : "#ffffff" }}>
                                                <td style={{ padding: "6px 10px", fontWeight: "600" }}>{row.name || "—"}</td>
                                                <td style={{ padding: "6px 10px" }}>{row.email || "—"}</td>
                                                <td style={{ padding: "6px 10px", color: "#6b7280" }}>{row.role}</td>
                                                <td style={{ padding: "6px 10px" }}>
                                                    <span style={{
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        fontSize: "10px",
                                                        fontWeight: "700",
                                                        backgroundColor: row.status === "Valid" ? "#ecfdf5" : "#fee2e2",
                                                        color: row.status === "Valid" ? "#065f46" : "#991b1b"
                                                    }}>
                                                        {row.status === "Valid" ? "Ready" : row.error}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                type="button"
                                disabled={loadingBulk || validCount === 0}
                                onClick={handleUploadBulk}
                                className="wf-btn-primary"
                                style={{ width: "100%", marginTop: "14px", padding: "10px" }}
                            >
                                {loadingBulk ? "Importing Roster..." : `Import ${validCount} Candidates`}
                            </button>
                        </div>
                    )}

                    {/* Bulk Import Report (Added vs Skipped) */}
                    {bulkReport && (
                        <div style={{
                            padding: "16px",
                            backgroundColor: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            marginTop: "16px"
                        }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
                                Import Summary Report
                            </div>
                            <div style={{ display: "flex", gap: "16px", fontSize: "13px", marginBottom: "12px" }}>
                                <span style={{ color: "#059669", fontWeight: "700" }}>
                                    Added: {bulkReport.addedCount}
                                </span>
                                <span style={{ color: bulkReport.skippedCount > 0 ? "#d97706" : "#6b7280", fontWeight: "700" }}>
                                    Skipped: {bulkReport.skippedCount}
                                </span>
                            </div>

                            {bulkReport.skipped && bulkReport.skipped.length > 0 && (
                                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                    <div style={{ fontWeight: "600", marginBottom: "4px", color: "#374151" }}>Skipped entries:</div>
                                    <ul style={{ margin: 0, paddingLeft: "18px" }}>
                                        {bulkReport.skipped.map((s, idx) => (
                                            <li key={idx}>
                                                <strong>{s.name || s.email}:</strong> {s.reason}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div style={{ marginTop: "12px" }}>
                                <Link to="/candidate-data" style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                                    View in Candidates Directory →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
