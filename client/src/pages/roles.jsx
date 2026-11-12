import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function Roles() {
    const [rolesList, setRolesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionToast, setActionToast] = useState("");

    // Search and Status Filter
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Selected Role for Detail Inspection / Edit
    const [selectedRole, setSelectedRole] = useState(null);

    // Modal 1: Create Role
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newDomains, setNewDomains] = useState(["General"]);
    const [newDomainInput, setNewDomainInput] = useState("");
    const [newAliases, setNewAliases] = useState([]);
    const [newAliasInput, setNewAliasInput] = useState("");
    const [newStatus, setNewStatus] = useState("Active");
    const [creating, setCreating] = useState(false);

    // Modal 2: Edit Role
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editRoleData, setEditRoleData] = useState(null);
    const [editDomainInput, setEditDomainInput] = useState("");
    const [editAliasInput, setEditAliasInput] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    // Modal 3: Delete Confirmation
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch Roles from backend
    const fetchRoles = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/roles");
            const roles = res.data.roles || [];
            setRolesList(roles);
            if (roles.length > 0 && (!selectedRole || !roles.find(r => r._id === selectedRole._id))) {
                setSelectedRole(roles[0]);
            }
        } catch (err) {
            console.error("Failed to load roles:", err);
            setError("Failed to synchronize taxonomy and roles from server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    // Filtered and Searched Roles
    const filteredRoles = useMemo(() => {
        return rolesList.filter(r => {
            const s = searchTerm.toLowerCase();
            const matchesSearch = !s ||
                (r.title || "").toLowerCase().includes(s) ||
                (r.description || "").toLowerCase().includes(s) ||
                (r.domains || []).some(d => d.toLowerCase().includes(s)) ||
                (r.aliases || []).some(a => a.toLowerCase().includes(s));

            const matchesStatus = statusFilter === "all" || (r.status || "Active").toLowerCase() === statusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        });
    }, [rolesList, searchTerm, statusFilter]);

    // Tag Input: New Role Domains
    const handleAddNewDomain = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = newDomainInput.trim().replace(/^,|,$/g, "");
            if (val && !newDomains.includes(val)) {
                setNewDomains([...newDomains, val]);
            }
            setNewDomainInput("");
        }
    };

    const handleRemoveNewDomain = (dom) => {
        setNewDomains(newDomains.filter(d => d !== dom));
    };

    // Tag Input: New Role Aliases
    const handleAddNewAlias = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = newAliasInput.trim().replace(/^,|,$/g, "");
            if (val && !newAliases.includes(val)) {
                setNewAliases([...newAliases, val]);
            }
            setNewAliasInput("");
        }
    };

    const handleRemoveNewAlias = (al) => {
        setNewAliases(newAliases.filter(a => a !== al));
    };

    // Tag Input: Edit Role Domains
    const handleAddEditDomain = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = editDomainInput.trim().replace(/^,|,$/g, "");
            if (val && !editRoleData.domains.includes(val)) {
                setEditRoleData({
                    ...editRoleData,
                    domains: [...editRoleData.domains, val]
                });
            }
            setEditDomainInput("");
        }
    };

    const handleRemoveEditDomain = (dom) => {
        setEditRoleData({
            ...editRoleData,
            domains: editRoleData.domains.filter(d => d !== dom)
        });
    };

    // Tag Input: Edit Role Aliases
    const handleAddEditAlias = (e) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const val = editAliasInput.trim().replace(/^,|,$/g, "");
            if (val && !editRoleData.aliases.includes(val)) {
                setEditRoleData({
                    ...editRoleData,
                    aliases: [...editRoleData.aliases, val]
                });
            }
            setEditAliasInput("");
        }
    };

    const handleRemoveEditAlias = (al) => {
        setEditRoleData({
            ...editRoleData,
            aliases: editRoleData.aliases.filter(a => a !== al)
        });
    };

    // Submit Create Role
    const handleCreateRoleSubmit = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setCreating(true);
        setError("");
        try {
            const payload = {
                title: newTitle.trim(),
                description: newDesc.trim() || `${newTitle.trim()} engineering discipline`,
                domains: newDomains.length > 0 ? newDomains : ["General"],
                aliases: newAliases,
                status: newStatus
            };

            const res = await api.post("/roles", payload);
            const created = res.data.role;

            setActionToast(`Role "${created.title}" created successfully.`);
            setCreateModalOpen(false);
            setNewTitle("");
            setNewDesc("");
            setNewDomains(["General"]);
            setNewAliases([]);
            fetchRoles();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create role.");
        } finally {
            setCreating(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    // Open Edit Modal
    const handleOpenEditModal = (r) => {
        setEditRoleData({
            _id: r._id,
            title: r.title,
            description: r.description || "",
            domains: Array.isArray(r.domains) ? [...r.domains] : ["General"],
            aliases: Array.isArray(r.aliases) ? [...r.aliases] : [],
            status: r.status || "Active"
        });
        setEditModalOpen(true);
    };

    // Submit Edit Role
    const handleSaveEditSubmit = async (e) => {
        e.preventDefault();
        if (!editRoleData) return;

        setSavingEdit(true);
        setError("");
        try {
            const payload = {
                title: editRoleData.title.trim(),
                description: editRoleData.description.trim(),
                domains: editRoleData.domains,
                aliases: editRoleData.aliases,
                status: editRoleData.status
            };

            const res = await api.put(`/roles/${editRoleData._id}`, payload);
            const updated = res.data.role || editRoleData;

            setActionToast(`Role "${updated.title}" updated successfully.`);
            setEditModalOpen(false);
            setRolesList(prev => prev.map(r => r._id === updated._id ? { ...r, ...updated } : r));
            if (selectedRole?._id === updated._id) {
                setSelectedRole(prev => ({ ...prev, ...updated }));
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update role.");
        } finally {
            setSavingEdit(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    // Confirm Delete Role
    const handleConfirmDelete = async () => {
        if (!roleToDelete) return;
        setDeleting(true);

        try {
            await api.delete(`/roles/${roleToDelete._id}`);
            setActionToast(`Role "${roleToDelete.title}" removed.`);
            setDeleteModalOpen(false);
            setRolesList(prev => prev.filter(r => r._id !== roleToDelete._id));
            if (selectedRole?._id === roleToDelete._id) {
                setSelectedRole(null);
            }
            setRoleToDelete(null);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete role.");
        } finally {
            setDeleting(false);
            setTimeout(() => setActionToast(""), 4000);
        }
    };

    return (
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div className="wf-breadcrumb">
                <span>Admin</span>
                <span>·</span>
                <span style={{ color: "#111827", fontWeight: "600" }}>Roles & taxonomy</span>
            </div>

            {/* Header + Add Role CTA */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 className="wf-page-title" style={{ margin: "0 0 4px 0" }}>
                        Roles & engineering taxonomy
                    </h1>
                    <p className="wf-page-subtitle" style={{ margin: 0 }}>
                        Curate technical role tracks, competency curricula domains, and automated taxonomy search aliases.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="wf-btn-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                    <span>+</span> Add Role
                </button>
            </div>

            {actionToast && (
                <div style={{ padding: "12px 18px", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
                    ✓ {actionToast}
                </div>
            )}

            {error && (
                <div style={{ padding: "12px 18px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#991b1b", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* Search & Filter Bar */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                <input
                    type="text"
                    placeholder="Search by role title, domain, or alias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="wf-input"
                    style={{ flex: 1, minWidth: "260px" }}
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="wf-input"
                    style={{ width: "auto", minWidth: "140px", backgroundColor: "#ffffff" }}
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Main 2-Column Split: Roles Catalog vs Detailed Inspector */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px", alignItems: "start" }}>
                {/* Column 1: Roles Roster Table / Card List */}
                <div className="wf-card" style={{ padding: 0, overflow: "hidden" }}>
                    {loading ? (
                        <div style={{ padding: "48px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                            Loading engineering taxonomy roles...
                        </div>
                    ) : filteredRoles.length === 0 ? (
                        <div style={{ padding: "40px 20px", textAlign: "center" }}>
                            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🏷️</div>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>
                                No roles found
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
                                {searchTerm || statusFilter !== "all"
                                    ? "No roles matched your search criteria."
                                    : "No engineering role tracks defined yet."}
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="wf-btn-primary"
                                style={{ fontSize: "12px", padding: "7px 14px" }}
                            >
                                + Create Role Track
                            </button>
                        </div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ borderBottom: "1.5px solid #e5e7eb", backgroundColor: "#f9fafb", textAlign: "left", color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>
                                    <th style={{ padding: "10px 14px" }}>Role Track</th>
                                    <th style={{ padding: "10px 14px" }}>Domains</th>
                                    <th style={{ padding: "10px 14px" }}>Questions</th>
                                    <th style={{ padding: "10px 14px" }}>Status</th>
                                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRoles.map(r => {
                                    const isSelected = selectedRole?._id === r._id;
                                    const qCount = r.questions ?? r.questionCount ?? 0;
                                    const status = r.status || "Active";

                                    return (
                                        <tr
                                            key={r._id}
                                            onClick={() => setSelectedRole(r)}
                                            style={{
                                                borderBottom: "1px solid #f3f4f6",
                                                cursor: "pointer",
                                                backgroundColor: isSelected ? "#f0f7ff" : "transparent",
                                                transition: "background-color 0.1s ease"
                                            }}
                                        >
                                            <td style={{ padding: "12px 14px" }}>
                                                <div style={{ fontWeight: "700", color: "#111827" }}>{r.title}</div>
                                                <div style={{ fontSize: "11px", color: "#6b7280", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {r.description || "No description provided."}
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "220px" }}>
                                                    {(r.domains || ["General"]).slice(0, 3).map((d, idx) => (
                                                        <span key={idx} style={{ backgroundColor: "#f3f4f6", color: "#374151", padding: "1px 6px", borderRadius: "4px", fontSize: "10.5px" }}>
                                                            {d}
                                                        </span>
                                                    ))}
                                                    {(r.domains || []).length > 3 && (
                                                        <span style={{ fontSize: "10px", color: "#6b7280" }}>
                                                            +{r.domains.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: "12px 14px", fontWeight: "700", color: qCount > 0 ? "#111827" : "#9ca3af" }}>
                                                {qCount}
                                            </td>
                                            <td style={{ padding: "12px 14px" }}>
                                                <span style={{
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    fontSize: "10px",
                                                    fontWeight: "700",
                                                    backgroundColor: status === "Active" ? "#ecfdf5" : status === "Draft" ? "#fef3c7" : "#f3f4f6",
                                                    color: status === "Active" ? "#065f46" : status === "Draft" ? "#92400e" : "#6b7280"
                                                }}>
                                                    {status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 14px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: "inline-flex", gap: "6px" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditModal(r)}
                                                        className="wf-btn-outline"
                                                        style={{ padding: "3px 8px", fontSize: "11px" }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setRoleToDelete(r);
                                                            setDeleteModalOpen(true);
                                                        }}
                                                        style={{
                                                            padding: "3px 8px",
                                                            border: "1px solid #fecaca",
                                                            borderRadius: "4px",
                                                            backgroundColor: "#ffffff",
                                                            color: "#dc2626",
                                                            fontSize: "11px",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Column 2: Selected Role Detailed Inspector */}
                <div className="wf-card" style={{ padding: "20px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
                        ROLE SPECIFICATION
                    </div>

                    {!selectedRole ? (
                        <div style={{ padding: "40px 10px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                            Select any role to view curriculum domains, search aliases, and question readiness.
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#111827", margin: 0 }}>
                                    {selectedRole.title}
                                </h2>
                                <span style={{
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    backgroundColor: selectedRole.status === "Active" ? "#ecfdf5" : "#fef3c7",
                                    color: selectedRole.status === "Active" ? "#065f46" : "#92400e"
                                }}>
                                    {(selectedRole.status || "Active").toUpperCase()}
                                </span>
                            </div>

                            <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.5", margin: "0 0 16px 0" }}>
                                {selectedRole.description || "No description defined for this engineering track."}
                            </p>

                            {/* Question Count Readiness Card */}
                            <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#6b7280" }}>Approved Questions in Bank</div>
                                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#111827" }}>
                                        {selectedRole.questions ?? selectedRole.questionCount ?? 0}
                                    </div>
                                </div>
                                <Link
                                    to={`/questionbank`}
                                    className="wf-btn-outline"
                                    style={{ fontSize: "11px", padding: "5px 10px", textDecoration: "none" }}
                                >
                                    Browse Bank →
                                </Link>
                            </div>

                            {/* Curriculum Domains */}
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>
                                    Curriculum Domains ({selectedRole.domains?.length || 0})
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                    {(selectedRole.domains || ["General"]).map((dom, idx) => (
                                        <span key={idx} style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600" }}>
                                            {dom}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Search Aliases */}
                            <div style={{ marginBottom: "20px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "6px" }}>
                                    Taxonomy Search Aliases ({selectedRole.aliases?.length || 0})
                                </div>
                                {selectedRole.aliases && selectedRole.aliases.length > 0 ? (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                        {selectedRole.aliases.map((al, idx) => (
                                            <span key={idx} style={{ backgroundColor: "#f3f4f6", color: "#4b5563", padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}>
                                                "{al}"
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: "12px", color: "#9ca3af", fontStyle: "italic" }}>
                                        No aliases mapped yet.
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(selectedRole)}
                                    className="wf-btn-primary"
                                    style={{ flex: 1, padding: "8px", fontSize: "13px" }}
                                >
                                    Edit Role Track
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoleToDelete(selectedRole);
                                        setDeleteModalOpen(true);
                                    }}
                                    style={{
                                        padding: "8px 14px",
                                        border: "1px solid #fecaca",
                                        borderRadius: "8px",
                                        backgroundColor: "#fef2f2",
                                        color: "#dc2626",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal 1: Create Role */}
            {createModalOpen && (
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
                    <div className="wf-card" style={{ width: "520px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
                                Create New Engineering Track
                            </h2>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", color: "#9ca3af", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateRoleSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Role Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Distributed Systems Engineer"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="wf-input"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Description & Scope</label>
                                <textarea
                                    placeholder="Describes technical scope and evaluation focus..."
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    rows={2}
                                    className="wf-input"
                                />
                            </div>

                            {/* Domains Tag Input */}
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Curriculum Domains (Press Enter or comma to add)</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {newDomains.map((dom, idx) => (
                                        <span key={idx} style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontSize: "11.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                            {dom}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveNewDomain(dom)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Add domain and press Enter (e.g. Concurrency, Kafka)..."
                                    value={newDomainInput}
                                    onChange={(e) => setNewDomainInput(e.target.value)}
                                    onKeyDown={handleAddNewDomain}
                                    className="wf-input"
                                />
                            </div>

                            {/* Aliases Tag Input */}
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Search Aliases (Press Enter or comma to add)</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {newAliases.map((al, idx) => (
                                        <span key={idx} style={{ backgroundColor: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: "4px", fontSize: "11.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                            {al}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveNewAlias(al)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Add alternative title (e.g. Backend Lead)..."
                                    value={newAliasInput}
                                    onChange={(e) => setNewAliasInput(e.target.value)}
                                    onKeyDown={handleAddNewAlias}
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label className="wf-form-label">Status</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="wf-input"
                                    style={{ backgroundColor: "#ffffff" }}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Archived">Archived</option>
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="wf-btn-outline"
                                    style={{ padding: "8px 16px" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="wf-btn-primary"
                                    style={{ padding: "8px 20px" }}
                                >
                                    {creating ? "Creating..." : "Create Role"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Edit Role */}
            {editModalOpen && editRoleData && (
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
                    <div className="wf-card" style={{ width: "520px", maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", padding: "28px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
                                Edit Role Track
                            </h2>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", color: "#9ca3af", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Role Title</label>
                                <input
                                    type="text"
                                    value={editRoleData.title}
                                    onChange={(e) => setEditRoleData({ ...editRoleData, title: e.target.value })}
                                    className="wf-input"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Description</label>
                                <textarea
                                    value={editRoleData.description}
                                    onChange={(e) => setEditRoleData({ ...editRoleData, description: e.target.value })}
                                    rows={2}
                                    className="wf-input"
                                />
                            </div>

                            {/* Domains */}
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Curriculum Domains</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {editRoleData.domains.map((dom, idx) => (
                                        <span key={idx} style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "2px 8px", borderRadius: "4px", fontSize: "11.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                            {dom}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEditDomain(dom)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Add domain and press Enter..."
                                    value={editDomainInput}
                                    onChange={(e) => setEditDomainInput(e.target.value)}
                                    onKeyDown={handleAddEditDomain}
                                    className="wf-input"
                                />
                            </div>

                            {/* Aliases */}
                            <div style={{ marginBottom: "14px" }}>
                                <label className="wf-form-label">Search Aliases</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {editRoleData.aliases.map((al, idx) => (
                                        <span key={idx} style={{ backgroundColor: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: "4px", fontSize: "11.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                            {al}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEditAlias(al)}
                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Add alias and press Enter..."
                                    value={editAliasInput}
                                    onChange={(e) => setEditAliasInput(e.target.value)}
                                    onKeyDown={handleAddEditAlias}
                                    className="wf-input"
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label className="wf-form-label">Status</label>
                                <select
                                    value={editRoleData.status}
                                    onChange={(e) => setEditRoleData({ ...editRoleData, status: e.target.value })}
                                    className="wf-input"
                                    style={{ backgroundColor: "#ffffff" }}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Archived">Archived</option>
                                </select>
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
                                    disabled={savingEdit}
                                    className="wf-btn-primary"
                                    style={{ padding: "8px 20px" }}
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 3: Confirm Delete Role */}
            {deleteModalOpen && roleToDelete && (
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
                    <div className="wf-card" style={{ width: "420px", maxWidth: "100%", padding: "28px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: "0 0 12px 0" }}>
                            Delete Role Track?
                        </h2>
                        <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.5", margin: "0 0 20px 0" }}>
                            Are you sure you want to delete <strong>{roleToDelete.title}</strong>? Any questions mapped to this role will remain in the catalog.
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={() => setDeleteModalOpen(false)}
                                className="wf-btn-outline"
                                style={{ padding: "8px 16px" }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={handleConfirmDelete}
                                style={{
                                    padding: "8px 18px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    border: "none",
                                    borderRadius: "8px",
                                    backgroundColor: "#dc2626",
                                    color: "#ffffff",
                                    cursor: "pointer"
                                }}
                            >
                                {deleting ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
