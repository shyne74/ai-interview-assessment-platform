import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function Roles() {
    const [rolesList, setRolesList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Active edit role
    const [editingRole, setEditingRole] = useState(null);
    const [roleTitle, setRoleTitle] = useState("");
    const [roleDesc, setRoleDesc] = useState("");
    const [domains, setDomains] = useState([]);
    const [aliases, setAliases] = useState([]);
    const [saveToast, setSaveToast] = useState("");
    const [errorToast, setErrorToast] = useState("");
    const [saving, setSaving] = useState(false);

    // New role modal
    const [newRoleModalOpen, setNewRoleModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newDomainInput, setNewDomainInput] = useState("");
    const [creatingRole, setCreatingRole] = useState(false);

    const fetchDbRoles = async () => {
        try {
            setLoading(true);
            const res = await api.get("/roles");
            const dbRoles = res.data.roles || [];
            
            const mapped = dbRoles.map((r, i) => ({
                id: r._id || `role-${i}`,
                _id: r._id,
                title: r.title,
                description: r.description || "",
                domains: Array.isArray(r.domains) && r.domains.length > 0 ? r.domains : ["General"],
                aliases: Array.isArray(r.aliases) ? r.aliases : [],
                questions: typeof r.questions === "number" ? r.questions : 0,
                status: r.status || "Active"
            }));

            setRolesList(mapped);
            if (mapped.length > 0) {
                // If currently editing, keep it selected or pick the first
                const current = editingRole ? mapped.find(m => m.id === editingRole.id) : null;
                const toSelect = current || mapped[0];
                selectRole(toSelect);
            } else {
                setEditingRole(null);
            }
        } catch (err) {
            console.error("Failed to load roles:", err);
            setErrorToast("Failed to load roles from backend.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDbRoles();
    }, []);

    const selectRole = (r) => {
        setEditingRole(r);
        setRoleTitle(r.title);
        setRoleDesc(r.description || `Focuses on ${r.title} best practices and architecture.`);
        setDomains(r.domains || ["General"]);
        setAliases(r.aliases || []);
        setErrorToast("");
        setSaveToast("");
    };

    const removeDomain = (dom) => {
        setDomains(domains.filter((d) => d !== dom));
    };

    const addDomain = () => {
        const val = prompt("Enter new domain for this role:");
        if (val && val.trim() && !domains.includes(val.trim())) {
            setDomains([...domains, val.trim()]);
        }
    };

    const removeAlias = (alias) => {
        setAliases(aliases.filter((a) => a !== alias));
    };

    const addAlias = () => {
        const val = prompt("Enter new role alias (e.g. 'Backend Engineer'):");
        if (val && val.trim() && !aliases.includes(val.trim())) {
            setAliases([...aliases, val.trim()]);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editingRole) return;

        setSaving(true);
        setErrorToast("");
        setSaveToast("");

        try {
            const payload = {
                title: roleTitle.trim(),
                description: roleDesc.trim(),
                domains,
                aliases
            };

            const targetId = editingRole._id || editingRole.id;
            const res = await api.put(`/roles/${targetId}`, payload);
            const updated = res.data.role;

            setSaveToast(`Role "${roleTitle}" updated and persisted successfully.`);
            setRolesList(prev => prev.map(r => (r.id === editingRole.id ? {
                ...r,
                title: updated.title,
                description: updated.description,
                domains: updated.domains,
                aliases: updated.aliases
            } : r)));
            setEditingRole(prev => ({
                ...prev,
                title: updated.title,
                description: updated.description,
                domains: updated.domains,
                aliases: updated.aliases
            }));
        } catch (err) {
            console.error("Failed to update role:", err);
            setErrorToast(err.response?.data?.message || "Failed to save role changes.");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveToast(""), 4000);
        }
    };

    const handleCreateRoleSubmit = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setCreatingRole(true);
        setErrorToast("");
        setSaveToast("");

        try {
            const initialDomains = newDomainInput
                ? newDomainInput.split(",").map(d => d.trim()).filter(Boolean)
                : ["General"];

            const payload = {
                title: newTitle.trim(),
                description: newDesc.trim() || `${newTitle.trim()} engineering role track`,
                domains: initialDomains,
                aliases: [newTitle.trim().toLowerCase()]
            };

            const res = await api.post("/roles", payload);
            const created = res.data.role;
            const newR = {
                id: created._id,
                _id: created._id,
                title: created.title,
                description: created.description,
                domains: created.domains || ["General"],
                aliases: created.aliases || [],
                questions: 0,
                status: "Active"
            };

            setRolesList([newR, ...rolesList]);
            selectRole(newR);
            setNewRoleModalOpen(false);
            setNewTitle("");
            setNewDesc("");
            setNewDomainInput("");
            setSaveToast(`New role "${created.title}" registered successfully.`);
        } catch (err) {
            console.error("Failed to create role:", err);
            setErrorToast(err.response?.data?.message || "Failed to create role.");
        } finally {
            setCreatingRole(false);
            setTimeout(() => setSaveToast(""), 4000);
        }
    };

    const handleDeleteRole = async () => {
        if (!editingRole) return;
        if (!window.confirm(`Are you sure you want to delete role "${editingRole.title}"?`)) {
            return;
        }

        try {
            const targetId = editingRole._id || editingRole.id;
            await api.delete(`/roles/${targetId}`);
            setSaveToast(`Role "${editingRole.title}" deleted successfully.`);
            const remaining = rolesList.filter(r => r.id !== editingRole.id);
            setRolesList(remaining);
            if (remaining.length > 0) {
                selectRole(remaining[0]);
            } else {
                setEditingRole(null);
            }
        } catch (err) {
            console.error("Failed to delete role:", err);
            setErrorToast(err.response?.data?.message || "Failed to delete role.");
        } finally {
            setTimeout(() => setSaveToast(""), 4000);
        }
    };

    return (
        <div>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Roles</span>
            </div>

            {/* Header + Add Role action */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                    <h1 className="wf-page-title" style={{ margin: "0 0 6px 0" }}>
                        Role tracks & competency mapping
                    </h1>
                    <p className="wf-page-subtitle" style={{ margin: 0 }}>
                        Manage engineering disciplines, associated curricula domains, and automated taxonomy aliases.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setNewRoleModalOpen(true)}
                    className="wf-btn-primary"
                >
                    + Add role
                </button>
            </div>

            {saveToast && (
                <div style={{ padding: "12px 18px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ✓ {saveToast}
                </div>
            )}

            {errorToast && (
                <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "20px" }}>
                    ⚠ {errorToast}
                </div>
            )}

            {/* 2-Column Split: Roles List & Role Editor */}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.4fr", gap: "28px" }}>
                {/* Left Card: Roles List */}
                <div className="wf-card" style={{ padding: "0", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6", fontSize: "13px", fontWeight: "700", color: "#111827" }}>
                        Engineering roles ({rolesList.length})
                    </div>

                    <div style={{ maxHeight: "560px", overflowY: "auto" }}>
                        {loading ? (
                            <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                Loading roles from database...
                            </div>
                        ) : rolesList.length === 0 ? (
                            <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                No roles defined. Click "+ Add role" to create one.
                            </div>
                        ) : (
                            rolesList.map((r) => {
                                const isSelected = editingRole && editingRole.id === r.id;
                                return (
                                    <div
                                        key={r.id}
                                        onClick={() => selectRole(r)}
                                        style={{
                                            padding: "16px 20px",
                                            borderBottom: "1px solid #f3f4f6",
                                            cursor: "pointer",
                                            backgroundColor: isSelected ? "#f8fafc" : "#ffffff",
                                            borderLeft: isSelected ? "4px solid #111827" : "4px solid transparent"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                                            <span style={{ fontSize: "14px", fontWeight: isSelected ? "700" : "600", color: "#111827" }}>
                                                {r.title}
                                            </span>
                                            <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                                {r.questions} questions
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                                            {r.domains.slice(0, 3).join(" · ")}
                                            {r.domains.length > 3 ? ` +${r.domains.length - 3} more` : ""}
                                        </div>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <span className="wf-pill wf-pill-green" style={{ fontSize: "11px", padding: "1px 8px" }}>
                                                {r.status}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Card: Role Details & Competency Editor */}
                <div className="wf-card">
                    {editingRole ? (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
                                    Edit role: {editingRole.title}
                                </h2>
                                <button
                                    type="button"
                                    onClick={handleDeleteRole}
                                    style={{
                                        border: "none",
                                        backgroundColor: "transparent",
                                        color: "#dc2626",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        fontWeight: "600"
                                    }}
                                >
                                    Delete role
                                </button>
                            </div>

                            <form onSubmit={handleSave}>
                                <div style={{ marginBottom: "16px" }}>
                                    <label className="wf-form-label">Role title</label>
                                    <input
                                        type="text"
                                        value={roleTitle}
                                        onChange={(e) => setRoleTitle(e.target.value)}
                                        required
                                        className="wf-input"
                                    />
                                </div>

                                <div style={{ marginBottom: "20px" }}>
                                    <label className="wf-form-label">Description & interview scope</label>
                                    <textarea
                                        value={roleDesc}
                                        onChange={(e) => setRoleDesc(e.target.value)}
                                        className="wf-textarea"
                                        style={{ minHeight: "80px" }}
                                    />
                                </div>

                                {/* Domains under this role */}
                                <div style={{ marginBottom: "20px" }}>
                                    <label className="wf-form-label">Curriculum domains under this role</label>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                                        {domains.map((dom) => (
                                            <span
                                                key={dom}
                                                className="wf-pill wf-pill-gray"
                                                style={{ padding: "4px 12px", fontSize: "13px" }}
                                            >
                                                {dom}
                                                <button
                                                    type="button"
                                                    onClick={() => removeDomain(dom)}
                                                    style={{ border: "none", background: "transparent", color: "#6b7280", marginLeft: "6px", cursor: "pointer" }}
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addDomain}
                                            className="wf-btn-outline"
                                            style={{ padding: "4px 10px", fontSize: "12px" }}
                                        >
                                            + Add domain
                                        </button>
                                    </div>
                                </div>

                                {/* Aliases */}
                                <div style={{ marginBottom: "24px" }}>
                                    <label className="wf-form-label">Aliases (used for auto-categorization & import)</label>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                                        {aliases.map((alias) => (
                                            <span
                                                key={alias}
                                                className="wf-pill wf-pill-blue"
                                                style={{ padding: "4px 12px", fontSize: "13px" }}
                                            >
                                                {alias}
                                                <button
                                                    type="button"
                                                    onClick={() => removeAlias(alias)}
                                                    style={{ border: "none", background: "transparent", color: "#2563eb", marginLeft: "6px", cursor: "pointer" }}
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addAlias}
                                            className="wf-btn-outline"
                                            style={{ padding: "4px 10px", fontSize: "12px" }}
                                        >
                                            + Add alias
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="wf-btn-green"
                                        style={{ cursor: saving ? "not-allowed" : "pointer" }}
                                    >
                                        {saving ? "Saving..." : "Save changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => selectRole(editingRole)}
                                        className="wf-btn-outline"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                            Select a role from the left list to review or modify competencies.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Add New Role */}
            {newRoleModalOpen && (
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
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div className="wf-card" style={{ maxWidth: "480px", width: "100%", padding: "24px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 8px 0" }}>
                            Add Engineering Role Track
                        </h2>
                        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
                            Register a new technical track into the system question taxonomy.
                        </p>

                        <form onSubmit={handleCreateRoleSubmit}>
                            <div style={{ marginBottom: "16px" }}>
                                <label className="wf-form-label">Role Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mobile Developer (iOS/Android)"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    required
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label className="wf-form-label">Description</label>
                                <textarea
                                    placeholder="Brief summary of core technical responsibilities"
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    className="wf-textarea"
                                    style={{ minHeight: "70px" }}
                                />
                            </div>

                            <div style={{ marginBottom: "24px" }}>
                                <label className="wf-form-label">Initial Curriculum Domains (comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Swift, Kotlin, Jetpack Compose, Core Animation"
                                    value={newDomainInput}
                                    onChange={(e) => setNewDomainInput(e.target.value)}
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setNewRoleModalOpen(false)}
                                    disabled={creatingRole}
                                    className="wf-btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingRole}
                                    className="wf-btn-primary"
                                    style={{ cursor: creatingRole ? "not-allowed" : "pointer" }}
                                >
                                    {creatingRole ? "Creating..." : "Create Role"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
