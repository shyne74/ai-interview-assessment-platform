import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function AdminRegisterCandidates() {
    const navigate = useNavigate();
    
    // Single candidate state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("Backend Developer");
    const [passwordOption, setPasswordOption] = useState("Generate automatic secure password");
    const [manualPassword, setManualPassword] = useState("");
    const [loadingSingle, setLoadingSingle] = useState(false);
    
    // Bulk CSV state
    const [csvFile, setCsvFile] = useState(null);
    const [csvFileName, setCsvFileName] = useState("");
    const [parsedCandidates, setParsedCandidates] = useState([]);
    const [loadingBulk, setLoadingBulk] = useState(false);
    const [bulkReport, setBulkReport] = useState(null);

    // Global notifications
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleAddSingle = async (e) => {
        e.preventDefault();
        setLoadingSingle(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const payload = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                preferredRole: role,
                password: passwordOption === "Set a temporary password manually" ? manualPassword.trim() : undefined
            };

            const res = await api.post("/auth/candidates", payload);
            const cand = res.data.candidate;
            
            setSuccessMessage(`Candidate ${cand.username} (${cand.email}) registered successfully! Temporary password: ${cand.tempPassword}`);
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

    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," + 
            "name,email,role\n" +
            "Aarav Sharma,aarav.sharma@example.com,Backend Developer\n" +
            "Riya Patel,riya.patel@example.com,Frontend Developer\n" +
            "Kabir Verma,kabir.verma@example.com,AI/ML Engineer\n" +
            "Ananya Sen,ananya.sen@example.com,Full Stack Developer";
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "candidates_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCsvFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFile(file);
        setCsvFileName(file.name);
        setErrorMessage("");
        setBulkReport(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text !== "string") return;

            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length <= 1) {
                setErrorMessage("CSV file must contain a header row and at least one candidate row.");
                return;
            }

            const header = lines[0].toLowerCase().split(",").map(h => h.trim());
            const nameIdx = header.indexOf("name");
            const emailIdx = header.indexOf("email");
            const roleIdx = header.indexOf("role");

            if (nameIdx === -1 || emailIdx === -1) {
                setErrorMessage("CSV header must contain 'name' and 'email' columns (e.g. name,email,role).");
                return;
            }

            const parsed = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
                const cName = cols[nameIdx] || "";
                const cEmail = cols[emailIdx] || "";
                const cRole = roleIdx !== -1 ? cols[roleIdx] : "Backend Developer";

                if (cName && cEmail) {
                    parsed.push({ name: cName, email: cEmail, role: cRole || "Backend Developer" });
                }
            }

            setParsedCandidates(parsed);
        };
        reader.readAsText(file);
    };

    const handleUploadBulk = async () => {
        if (!parsedCandidates.length) {
            setErrorMessage("Please select a valid CSV file with candidate rows first.");
            return;
        }

        setLoadingBulk(true);
        setErrorMessage("");
        setSuccessMessage("");
        setBulkReport(null);

        try {
            const res = await api.post("/auth/candidates/bulk", { candidates: parsedCandidates });
            const data = res.data;
            
            setBulkReport(data);
            setSuccessMessage(`Bulk registration processed: ${data.addedCount} added, ${data.skippedCount} skipped.`);
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

    return (
        <div>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <Link to="/candidate-data">Admin · Candidates</Link>
                <span>›</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Add candidates</span>
            </div>

            {/* Header */}
            <div style={{ marginBottom: "28px" }}>
                <h1 className="wf-page-title">Add candidates</h1>
                <p className="wf-page-subtitle">
                    Add one candidate at a time, or upload a CSV to register many candidates simultaneously.
                </p>
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

            {/* 2-Column Split: Option 1 (Single) and Option 2 (CSV) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
                {/* Option 1: One Candidate */}
                <div className="wf-card">
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                        OPTION 1 · ONE CANDIDATE
                    </div>
                    <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "20px" }}>
                        Add a candidate
                    </h2>

                    <form onSubmit={handleAddSingle}>
                        <div style={{ marginBottom: "16px" }}>
                            <label className="wf-form-label">Full name</label>
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
                            <label className="wf-form-label">Email</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="wf-input"
                            />
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label className="wf-form-label">Password configuration</label>
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
                            <div style={{ marginBottom: "16px" }}>
                                <label className="wf-form-label">Temporary password</label>
                                <input
                                    type="text"
                                    placeholder="Enter temporary password"
                                    value={manualPassword}
                                    onChange={(e) => setManualPassword(e.target.value)}
                                    required
                                    className="wf-input"
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: "24px" }}>
                            <label className="wf-form-label">Target engineering role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="wf-input"
                                style={{ backgroundColor: "#ffffff" }}
                            >
                                <option>Backend Developer</option>
                                <option>Frontend Developer</option>
                                <option>Full Stack Developer</option>
                                <option>AI/ML Engineer</option>
                                <option>System Architect</option>
                                <option>Software Engineer</option>
                                <option>DevOps Engineer</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loadingSingle}
                            className="wf-btn-green"
                            style={{ cursor: loadingSingle ? "not-allowed" : "pointer" }}
                        >
                            {loadingSingle ? "Registering candidate..." : "Add candidate"}
                        </button>
                    </form>
                </div>

                {/* Option 2: Bulk CSV Upload */}
                <div className="wf-card">
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                        OPTION 2 · BULK UPLOAD (CSV)
                    </div>
                    <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "20px" }}>
                        Add many candidates
                    </h2>

                    <label
                        style={{
                            display: "block",
                            border: "1.5px dashed #cbd5e1",
                            borderRadius: "8px",
                            padding: "36px 20px",
                            textAlign: "center",
                            backgroundColor: "#f9fafb",
                            marginBottom: "16px",
                            cursor: "pointer"
                        }}
                    >
                        <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleCsvFileChange}
                            style={{ display: "none" }}
                        />
                        <div style={{ fontSize: "28px", marginBottom: "8px" }}>📁</div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                            {csvFileName ? `Selected: ${csvFileName}` : "Drop a CSV file here or browse"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {parsedCandidates.length > 0 
                                ? `${parsedCandidates.length} candidate rows ready for import`
                                : "Columns: name, email, role (optional) · up to 2,000 rows"}
                        </div>
                    </label>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="wf-btn-outline"
                            style={{ padding: "5px 12px", fontSize: "12px", cursor: "pointer" }}
                        >
                            ⬇ Download CSV template
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleUploadBulk}
                        disabled={loadingBulk || !parsedCandidates.length}
                        className="wf-btn-primary"
                        style={{ cursor: loadingBulk || !parsedCandidates.length ? "not-allowed" : "pointer" }}
                    >
                        {loadingBulk ? "Processing import..." : "Upload CSV and review"}
                    </button>

                    {/* Bulk Report Details */}
                    {bulkReport && (
                        <div style={{ marginTop: "20px", padding: "14px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}>
                            <div style={{ fontWeight: "700", color: "#111827", marginBottom: "6px" }}>Import summary</div>
                            <div style={{ color: "#15803d", fontWeight: "600" }}>✓ Added: {bulkReport.addedCount} candidates</div>
                            {bulkReport.skippedCount > 0 && (
                                <div style={{ color: "#b45309", marginTop: "6px" }}>
                                    ⚠ Skipped: {bulkReport.skippedCount} rows
                                    <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                        {bulkReport.skipped.slice(0, 5).map((s, idx) => (
                                            <li key={idx}><strong>{s.email || "Row"}</strong>: {s.reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
