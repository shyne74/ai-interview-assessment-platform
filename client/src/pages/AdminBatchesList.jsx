import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../components/ui/ToastContext";
import {
    Plus,
    Users,
    Calendar,
    ArrowRight,
    Download,
    CheckCircle2,
    Clock,
    Search,
    Loader2,
    Shield,
    Sparkles,
    Briefcase
} from "lucide-react";

export default function AdminBatchesList() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const res = await api.get("/batches");
            setBatches(res.data.batches || []);
        } catch (err) {
            console.error("Failed to load batches:", err);
            addToast("Failed to load exam batches.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatches();
    }, []);

    const filteredBatches = batches.filter(b => (
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.organizationName && b.organizationName.toLowerCase().includes(searchQuery.toLowerCase()))
    ));

    return (
        <div className="wf-page-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#0f172a", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                        Exam Batches
                    </h1>
                    <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
                        Company exam rounds, scheduled cohorts, email invitations, and live proctoring results.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Link
                        to="/admin/batches/new"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "9px 18px",
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            textDecoration: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 500,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}
                    >
                        <Plus size={16} /> Create New Batch
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ position: "relative", width: "320px" }}>
                    <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
                    <input
                        type="text"
                        placeholder="Search batches by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "8px 12px 8px 34px",
                            fontSize: "13px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            outline: "none"
                        }}
                    />
                </div>

                <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Showing {filteredBatches.length} of {batches.length} batch(es)
                </div>
            </div>

            {/* Loading */}
            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: "#16a34a" }} />
                </div>
            ) : filteredBatches.length === 0 ? (
                /* Empty state */
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "60px 24px",
                        textAlign: "center",
                        maxWidth: "600px",
                        margin: "40px auto"
                    }}
                >
                    <div
                        style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "50%",
                            backgroundColor: "#f0fdf4",
                            color: "#16a34a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 16px auto"
                        }}
                    >
                        <Briefcase size={26} />
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0f172a", margin: "0 0 8px 0" }}>
                        No Exam Batches Created Yet
                    </h3>
                    <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, margin: "0 0 24px 0" }}>
                        Company Exam Mode lets you invite a group of candidates, configure unique or personalized tests, email temporary login credentials, and monitor results live.
                    </p>
                    <Link
                        to="/admin/batches/new"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 20px",
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                            textDecoration: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500
                        }}
                    >
                        <Plus size={16} /> Create Your First Batch
                    </Link>
                </div>
            ) : (
                /* Batches Grid */
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                    {filteredBatches.map((batch) => {
                        const total = batch.stats?.total || 0;
                        const completed = batch.stats?.completed || 0;
                        const inProgress = batch.stats?.inProgress || 0;
                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                        return (
                            <div
                                key={batch._id}
                                style={{
                                    backgroundColor: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "12px",
                                    padding: "20px 24px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: "16px",
                                    transition: "border-color 0.15s ease",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                                }}
                            >
                                <div style={{ flex: "1 1 340px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                                        <Link
                                            to={`/admin/batches/${batch._id}`}
                                            style={{
                                                fontSize: "16px",
                                                fontWeight: 600,
                                                color: "#0f172a",
                                                textDecoration: "none"
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.color = "#16a34a"}
                                            onMouseOut={(e) => e.currentTarget.style.color = "#0f172a"}
                                        >
                                            {batch.name}
                                        </Link>
                                        <span
                                            style={{
                                                padding: "2px 8px",
                                                borderRadius: "10px",
                                                fontSize: "10px",
                                                fontWeight: 600,
                                                textTransform: "uppercase",
                                                backgroundColor: batch.status === "active" ? "#dcfce7" : "#f1f5f9",
                                                color: batch.status === "active" ? "#166534" : "#475569"
                                            }}
                                        >
                                            {batch.status}
                                        </span>
                                    </div>

                                    <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                        <span>Org: <strong>{batch.organizationName || "AssessAI"}</strong></span>
                                        <span>•</span>
                                        <span>Created: {new Date(batch.createdAt).toLocaleDateString()}</span>
                                        {batch.closesAt && (
                                            <>
                                                <span>•</span>
                                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                    <Clock size={12} /> Deadline: {new Date(batch.closesAt).toLocaleDateString()}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Progress & Stats */}
                                <div style={{ flex: "1 1 260px", minWidth: "220px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#475569", marginBottom: "6px" }}>
                                        <span><strong>{completed}</strong> of {total} completed</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div style={{ width: "100%", height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                                        <div
                                            style={{
                                                width: `${pct}%`,
                                                height: "100%",
                                                backgroundColor: "#16a34a",
                                                borderRadius: "3px",
                                                transition: "width 0.3s ease"
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                                        {inProgress > 0 && <span style={{ color: "#d97706" }}>• {inProgress} in-progress</span>}
                                        {batch.stats?.avgScore !== null && <span>• Avg Score: <strong>{batch.stats.avgScore}%</strong></span>}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Link
                                        to={`/admin/batches/${batch._id}`}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "8px 16px",
                                            backgroundColor: "#f8fafc",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            fontSize: "13px",
                                            fontWeight: 500,
                                            color: "#1e293b",
                                            textDecoration: "none"
                                        }}
                                    >
                                        Live Tracking <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
