import React, { useState, useEffect, useMemo } from "react";
import {
    X,
    Mail,
    User,
    Briefcase,
    Layers,
    Clock,
    HelpCircle,
    Sparkles,
    CheckCircle2,
    Copy,
    Check,
    ExternalLink,
    Shield,
    AlertCircle
} from "lucide-react";
import api from "../utils/api";
import Button from "./ui/Button";
import Badge from "./ui/Badge";

export default function AssignTestModal({
    isOpen,
    onClose,
    initialCandidate = null,
    candidatesList = [],
    onAssigned
}) {
    const [roles, setRoles] = useState([]);
    const [candidateName, setCandidateName] = useState("");
    const [candidateEmail, setCandidateEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState("Software Engineer");
    const [selectedDomain, setSelectedDomain] = useState("Algorithms");
    const [assessmentType, setAssessmentType] = useState("theory");
    const [difficulty, setDifficulty] = useState("medium");
    const [questionCount, setQuestionCount] = useState(5);
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [generateWithAI, setGenerateWithAI] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [assignedResult, setAssignedResult] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // Load available roles
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await api.get("/roles");
                const roleDocs = res.data.roles || [];
                setRoles(roleDocs);
                if (roleDocs.length > 0 && !selectedRole) {
                    setSelectedRole(roleDocs[0].title);
                    setSelectedDomain(roleDocs[0].domains?.[0] || "General");
                }
            } catch (err) {
                console.warn("Could not fetch roles:", err);
            }
        };
        fetchRoles();
    }, []);

    // Hydrate initial candidate if opened from a table row
    useEffect(() => {
        if (initialCandidate) {
            setCandidateName(initialCandidate.username || initialCandidate.name || "");
            setCandidateEmail(initialCandidate.email || "");
            if (initialCandidate.preferredRole) {
                setSelectedRole(initialCandidate.preferredRole);
            }
        } else {
            setCandidateName("");
            setCandidateEmail("");
        }
        setAssignedResult(null);
        setError("");
    }, [initialCandidate, isOpen]);

    // Available domains for currently selected role
    const availableDomains = useMemo(() => {
        const found = roles.find(r => r.title.toLowerCase() === selectedRole.toLowerCase());
        if (found && found.domains && found.domains.length > 0) {
            return found.domains;
        }
        return ["General", "Core Concepts", "Algorithms", "System Design"];
    }, [roles, selectedRole]);

    // Handle role change
    const handleRoleChange = (newRole) => {
        setSelectedRole(newRole);
        const found = roles.find(r => r.title.toLowerCase() === newRole.toLowerCase());
        if (found && found.domains && found.domains.length > 0) {
            setSelectedDomain(found.domains[0]);
        } else {
            setSelectedDomain("General");
        }
    };

    // Candidate email autocomplete selection
    const handleEmailSelect = (cand) => {
        setCandidateEmail(cand.email);
        if (cand.username) {
            setCandidateName(cand.username);
        }
        if (cand.preferredRole) {
            handleRoleChange(cand.preferredRole);
        }
    };

    // Copy to clipboard helper
    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Submit assignment
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!candidateEmail.trim() || !candidateName.trim()) {
            setError("Candidate Name and Email are required.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                candidateName: candidateName.trim(),
                candidateEmail: candidateEmail.trim().toLowerCase(),
                roleTitle: selectedRole,
                domain: selectedDomain,
                selectedTopics: [selectedDomain],
                assessmentType,
                difficulty,
                limit: Number(questionCount),
                durationSeconds: Number(durationMinutes) * 60,
                generateWithAI
            };

            const res = await api.post("/interviews/assign-by-email", payload);
            setAssignedResult(res.data);
            if (onAssigned) {
                onAssigned(res.data);
            }
        } catch (err) {
            console.error("Assignment error:", err);
            setError(err.response?.data?.message || "Failed to assign assessment and send invitation.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
        }}>
            <div style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                width: "100%",
                maxWidth: "600px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                border: "1px solid #e2e8f0"
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#f8fafc"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            backgroundColor: "#ecfdf5",
                            color: "#059669",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <Mail size={18} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: "17px", fontWeight: "600", color: "#0f172a", margin: 0 }}>
                                Assign Assessment & Send Invite
                            </h2>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                                Automatically provisions credentials and emails the candidate direct test access.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "4px"
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                    {error && (
                        <div style={{
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            padding: "12px 14px",
                            marginBottom: "16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            color: "#991b1b"
                        }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {assignedResult ? (
                        /* SUCCESS RECEIPT / RECRUITER BACKUP VIEW */
                        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                            <div style={{
                                backgroundColor: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                borderRadius: "10px",
                                padding: "16px 20px",
                                textAlign: "center"
                            }}>
                                <CheckCircle2 size={36} style={{ color: "#16a34a", margin: "0 auto 8px" }} />
                                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#166534", margin: "0 0 4px" }}>
                                    Assessment Assigned & Invitation Dispatched!
                                </h3>
                                <p style={{ fontSize: "13px", color: "#15803d", margin: 0 }}>
                                    An official email containing credentials and a secure entry link was sent to <strong>{assignedResult.candidate?.email}</strong>.
                                </p>
                                {assignedResult.previewUrl && (
                                    <div style={{ marginTop: "10px" }}>
                                        <a
                                            href={assignedResult.previewUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                fontSize: "12px",
                                                color: "#2563eb",
                                                textDecoration: "underline",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            }}
                                        >
                                            View Ethereal test inbox email <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Recruiter Credentials Backup Box */}
                            <div style={{
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                padding: "18px 20px"
                            }}>
                                <div style={{
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    color: "#475569",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "12px"
                                }}>
                                    Recruiter Backup Credentials
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                                    {/* Email */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: "#64748b" }}>Candidate Email:</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <code style={{ backgroundColor: "#e2e8f0", padding: "2px 8px", borderRadius: "4px" }}>
                                                {assignedResult.candidate?.email}
                                            </code>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(assignedResult.candidate?.email, "email")}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                                            >
                                                {copiedField === "email" ? <Check size={14} style={{ color: "#16a34a" }} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Temporary Password */}
                                    {assignedResult.candidate?.tempPassword && (
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ color: "#64748b" }}>Temporary Password:</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <code style={{ backgroundColor: "#e2e8f0", padding: "2px 8px", borderRadius: "4px", fontWeight: "700", color: "#0f172a" }}>
                                                    {assignedResult.candidate?.tempPassword}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(assignedResult.candidate?.tempPassword, "pass")}
                                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                                                >
                                                    {copiedField === "pass" ? <Check size={14} style={{ color: "#16a34a" }} /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Direct Exam Link */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ color: "#64748b" }}>Direct Exam Access Link:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(assignedResult.examUrl, "url")}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "#2563eb",
                                                    fontSize: "12px",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px"
                                                }}
                                            >
                                                {copiedField === "url" ? <Check size={13} style={{ color: "#16a34a" }} /> : <Copy size={13} />}
                                                {copiedField === "url" ? "Copied" : "Copy Link"}
                                            </button>
                                        </div>
                                        <div style={{
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            padding: "8px 12px",
                                            fontSize: "12px",
                                            color: "#334155",
                                            wordBreak: "break-all"
                                        }}>
                                            {assignedResult.examUrl}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setAssignedResult(null);
                                        onClose();
                                    }}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* ASSIGNMENT FORM */
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {/* Candidate Name & Email */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Candidate Name <span style={{ color: "#dc2626" }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Alex Morgan"
                                        value={candidateName}
                                        onChange={(e) => setCandidateName(e.target.value)}
                                        required
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px"
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Candidate Email <span style={{ color: "#dc2626" }}>*</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="alex@example.com"
                                        value={candidateEmail}
                                        onChange={(e) => setCandidateEmail(e.target.value)}
                                        required
                                        list="candidates-datalist"
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px"
                                        }}
                                    />
                                    <datalist id="candidates-datalist">
                                        {candidatesList.map(c => (
                                            <option key={c._id} value={c.email}>
                                                {c.username} ({c.preferredRole || "Candidate"})
                                            </option>
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            {/* Role & Domain */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Target Role
                                    </label>
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => handleRoleChange(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            backgroundColor: "#ffffff"
                                        }}
                                    >
                                        {roles.length > 0 ? (
                                            roles.map(r => (
                                                <option key={r._id || r.title} value={r.title}>
                                                    {r.title}
                                                </option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="Software Engineer">Software Engineer</option>
                                                <option value="Backend Developer">Backend Developer</option>
                                                <option value="Frontend Developer">Frontend Developer</option>
                                                <option value="Full Stack Developer">Full Stack Developer</option>
                                                <option value="AI/ML Engineer">AI/ML Engineer</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Domain / Focus Area
                                    </label>
                                    <select
                                        value={selectedDomain}
                                        onChange={(e) => setSelectedDomain(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            backgroundColor: "#ffffff"
                                        }}
                                    >
                                        {availableDomains.map(d => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Format & Difficulty */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Assessment Format
                                    </label>
                                    <select
                                        value={assessmentType}
                                        onChange={(e) => setAssessmentType(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            backgroundColor: "#ffffff"
                                        }}
                                    >
                                        <option value="theory">Theory & Conceptual</option>
                                        <option value="coding">Algorithmic Coding (Judge0)</option>
                                        <option value="mixed">Mixed (Theory + Code)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Difficulty Level
                                    </label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            backgroundColor: "#ffffff"
                                        }}
                                    >
                                        <option value="easy">Easy (Entry level)</option>
                                        <option value="medium">Medium (Mid level)</option>
                                        <option value="hard">Hard (Senior level)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Questions & Duration */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Question Count
                                    </label>
                                    <select
                                        value={questionCount}
                                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            backgroundColor: "#ffffff"
                                        }}
                                    >
                                        <option value={3}>3 Questions (Quick screen)</option>
                                        <option value={5}>5 Questions (Standard)</option>
                                        <option value={8}>8 Questions (In-depth)</option>
                                        <option value={10}>10 Questions (Comprehensive)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Allotted Duration
                                    </label>
                                    <select
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            backgroundColor: "#ffffff"
                                        }}
                                    >
                                        <option value={15}>15 Minutes</option>
                                        <option value={30}>30 Minutes</option>
                                        <option value={45}>45 Minutes</option>
                                        <option value={60}>60 Minutes</option>
                                        <option value={90}>90 Minutes</option>
                                    </select>
                                </div>
                            </div>

                            {/* AI Generation Checkbox */}
                            <div style={{
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                padding: "12px 14px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <Sparkles size={16} style={{ color: "#2563eb" }} />
                                    <div>
                                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                                            Generate with AI (Dynamic Questions)
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                                            Uses FastAPI + LLM to tailor fresh questions specifically to the domain.
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={generateWithAI}
                                    onChange={(e) => setGenerateWithAI(e.target.checked)}
                                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                />
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                                <Button variant="outline" type="button" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" disabled={submitting}>
                                    {submitting ? "Assigning & Sending Email..." : "Assign & Send Invite"}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
