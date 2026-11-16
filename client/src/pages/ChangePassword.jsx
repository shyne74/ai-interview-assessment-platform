import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../components/ui/ToastContext";
import { Lock, Check, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function ChangePassword() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Password strength rules
    const hasLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const isMatched = newPassword && newPassword === confirmPassword;
    const isStrong = hasLength && hasUpper && hasLower && (hasNumber || hasSpecial);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!isStrong) {
            setError("Password must be at least 8 characters and include uppercase, lowercase, and a number or symbol.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            const res = await api.post("/auth/change-password", {
                currentPassword: currentPassword || undefined,
                newPassword
            });

            // Update user state in localStorage
            localStorage.setItem("mustChangePassword", "false");
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    const u = JSON.parse(storedUser);
                    u.mustChangePassword = false;
                    localStorage.setItem("user", JSON.stringify(u));
                } catch (e) {}
            }

            addToast("Password updated successfully. Welcome to your assessment!", "success");
            navigate("/dashboard");
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Failed to update password.";
            setError(msg);
            addToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", padding: "24px" }}>
            <div
                style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "36px",
                    maxWidth: "460px",
                    width: "100%",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)"
                }}
            >
                <div style={{ textAlign: "center", marginBottom: "28px" }}>
                    <div
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            backgroundColor: "#f0fdf4",
                            color: "#16a34a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 14px auto"
                        }}
                    >
                        <ShieldCheck size={26} />
                    </div>
                    <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#0f172a", margin: "0 0 6px 0" }}>
                        Set Your Permanent Password
                    </h1>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                        You logged in with a temporary invite password. Please create a secure password to protect your account and assessment results.
                    </p>
                </div>

                {error && (
                    <div
                        style={{
                            padding: "10px 14px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#991b1b",
                            marginBottom: "18px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                    >
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
                            Current / Temporary Password
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter the password from your email"
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "14px",
                                outline: "none"
                            }}
                        />
                    </div>

                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <label style={{ fontSize: "12px", fontWeight: 500, color: "#334155" }}>
                                New Password <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ background: "none", border: "none", fontSize: "11px", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            required
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "14px",
                                outline: "none"
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#334155", marginBottom: "6px" }}>
                            Confirm New Password <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-type your new password"
                            required
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "14px",
                                outline: "none"
                            }}
                        />
                    </div>

                    {/* Strength Criteria Checklist */}
                    <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                            Password requirements:
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                            <div style={{ color: hasLength ? "#16a34a" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Check size={12} /> At least 8 characters
                            </div>
                            <div style={{ color: hasUpper ? "#16a34a" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Check size={12} /> Uppercase letter
                            </div>
                            <div style={{ color: hasLower ? "#16a34a" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Check size={12} /> Lowercase letter
                            </div>
                            <div style={{ color: (hasNumber || hasSpecial) ? "#16a34a" : "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Check size={12} /> Number or symbol
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isStrong || !isMatched}
                        style={{
                            marginTop: "8px",
                            padding: "11px",
                            backgroundColor: (isStrong && isMatched) ? "#16a34a" : "#cbd5e1",
                            color: "#ffffff",
                            borderRadius: "8px",
                            border: "none",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: (isStrong && isMatched) ? "pointer" : "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px"
                        }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                        Save Password & Continue
                    </button>
                </form>
            </div>
        </div>
    );
}
