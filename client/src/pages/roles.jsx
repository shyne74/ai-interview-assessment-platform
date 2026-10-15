import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
    BriefcaseIcon,
    PlusIcon,
    ArrowRightIcon,
    BrainIcon,
    SparklesIcon
} from "../components/icons";
import Toast from "../components/Toast";

function Roles() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "info" });

    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: "",
        description: ""
    });

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const response = await api.get("/roles");
            setRoles(response.data.roles || response.data || []);
        } catch (err) {
            console.log(err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post("/roles", {
                title: form.title.trim(),
                description: form.description.trim()
            });

            setToast({
                show: true,
                message: "Role created successfully and available for interviews!",
                type: "success"
            });

            setForm({
                title: "",
                description: ""
            });
            setShowCreateModal(false);
            fetchRoles();
        } catch (err) {
            setToast({
                show: true,
                message: err.response?.data?.message || "Failed to create role",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-vh-100 tech-grid-bg py-5">
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            <div className="container">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-5">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge-tech badge-indigo">
                                <BriefcaseIcon size={14} /> Position Architecture
                            </span>
                            <span className="text-muted small">{roles.length} Defined Roles</span>
                        </div>
                        <h2 className="fw-bold text-white mb-0" style={{ letterSpacing: "-0.02em" }}>
                            Manage Interview Roles
                        </h2>
                        <p className="text-muted small mb-0">
                            Configure technical job roles and evaluation specifications for candidate assessments
                        </p>
                    </div>

                    <button
                        className="btn btn-primary-gradient"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <PlusIcon size={18} /> Create New Role
                    </button>
                </div>

                {/* Roles Grid */}
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading roles...</span>
                        </div>
                        <p className="text-muted mt-3 small">Loading active roles...</p>
                    </div>
                ) : roles.length === 0 ? (
                    <div className="glass-card p-5 text-center">
                        <BriefcaseIcon size={44} className="text-muted mb-3" />
                        <h4 className="fw-bold text-white mb-2">No Interview Roles Defined</h4>
                        <p className="text-muted small mb-4">
                            Create your first technical interview role to begin generating candidate questions.
                        </p>
                        <button
                            className="btn btn-primary-gradient"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <PlusIcon size={16} /> Define Role
                        </button>
                    </div>
                ) : (
                    <div className="row g-4">
                        {roles.map((role) => (
                            <div key={role._id} className="col-md-6 col-lg-4">
                                <div className="glass-card glass-card-interactive p-4 h-100 d-flex flex-column justify-content-between">
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <span className="badge-tech badge-approved">
                                                Active Role
                                            </span>
                                            <span className="text-muted small d-flex align-items-center gap-1">
                                                <SparklesIcon size={12} /> AI Evaluated
                                            </span>
                                        </div>

                                        <h4 className="fw-bold text-white mb-2">{role.title}</h4>

                                        <p className="text-muted small mb-4" style={{ minHeight: "44px" }}>
                                            {role.description || "Comprehensive technical assessment covering core concepts, real-world patterns, and system problem solving."}
                                        </p>
                                    </div>

                                    <div>
                                        <hr style={{ borderColor: "var(--border-subtle)" }} className="my-3" />
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-secondary small fw-semibold">
                                                Ready for testing
                                            </span>
                                            <button
                                                className="btn btn-sm btn-secondary-dark d-flex align-items-center gap-1"
                                                onClick={() => navigate("/dashboard")}
                                                title="View as Candidate"
                                            >
                                                <span>Preview</span>
                                                <ArrowRightIcon size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Role Modal */}
                {showCreateModal && (
                    <div className="modal-backdrop-custom">
                        <div className="modal-content-custom p-4 p-md-5" style={{ maxWidth: "560px" }}>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h4 className="fw-bold text-white mb-0">Create New Interview Role</h4>
                                    <span className="text-muted small">Define job profile for assessments</span>
                                </div>
                                <button
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={submitting}
                                />
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Role Title
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-custom"
                                        name="title"
                                        value={form.title}
                                        onChange={handleChange}
                                        placeholder="e.g. Full Stack Developer, DevOps Engineer"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="form-label text-secondary small fw-semibold">
                                        Role Description & Scope
                                    </label>
                                    <textarea
                                        className="form-control form-control-custom"
                                        rows="4"
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        placeholder="Describe the responsibilities, expected seniorities, and focus areas..."
                                    />
                                </div>

                                <div className="d-flex gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-secondary-dark flex-grow-1"
                                        onClick={() => setShowCreateModal(false)}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary-gradient flex-grow-1"
                                        disabled={submitting}
                                    >
                                        {submitting ? "Creating..." : "Create Role"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Roles;