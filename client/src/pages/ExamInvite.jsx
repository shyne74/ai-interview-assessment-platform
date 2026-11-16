import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
    Shield,
    CheckCircle2,
    Clock,
    Lock,
    Key,
    ArrowRight,
    AlertCircle,
    UserCheck,
    Briefcase,
    Layers,
    FileText,
    Sparkles
} from "lucide-react";
import api from "../utils/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import Badge from "../components/ui/Badge";

export default function ExamInvite() {
    const { interviewId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const paramEmail = searchParams.get("email") || "";
    const paramToken = searchParams.get("token") || "";

    const [loading, setLoading] = useState(true);
    const [authenticating, setAuthenticating] = useState(false);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState("");

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const stored = localStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [interview, setInterview] = useState(null);
    const [emailInput, setEmailInput] = useState(paramEmail);
    const [passwordInput, setPasswordInput] = useState("");

    // Initial check and auto-authentication via invite token
    const initializeGate = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            // 1. If invite token is present, attempt frictionless 1-click token login
            if (paramToken) {
                try {
                    const authRes = await api.post("/auth/invite-login", {
                        interviewId,
                        token: paramToken
                    });

                    if (authRes.data.token && authRes.data.user) {
                        localStorage.setItem("token", authRes.data.token);
                        localStorage.setItem("user", JSON.stringify(authRes.data.user));
                        localStorage.setItem("username", authRes.data.user.username || "");
                        localStorage.setItem("role", authRes.data.user.role || "user");
                        setCurrentUser(authRes.data.user);
                        setInterview(authRes.data.interview);
                        setLoading(false);
                        return;
                    }
                } catch (tokenErr) {
                    console.warn("Token auth failed, falling back to manual credentials:", tokenErr);
                }
            }

            // 2. If already logged in, fetch interview details
            const storedToken = localStorage.getItem("token");
            if (storedToken) {
                try {
                    const intRes = await api.get(`/interviews/${interviewId}`);
                    setInterview(intRes.data);
                    setLoading(false);
                    return;
                } catch (intErr) {
                    console.warn("Could not fetch interview with current session:", intErr);
                }
            }

            // 3. Fallback: fetch public interview briefing metadata
            const infoRes = await api.post("/auth/invite-login", { interviewId });
            if (infoRes.data?.interview) {
                setInterview(infoRes.data.interview);
                if (infoRes.data.interview.invitedEmail && !emailInput) {
                    setEmailInput(infoRes.data.interview.invitedEmail);
                }
            }
        } catch (err) {
            console.error("Failed to load interview invitation:", err);
            setError(err.response?.data?.message || "Invalid or expired assessment link.");
        } finally {
            setLoading(false);
        }
    }, [interviewId, paramToken]);

    useEffect(() => {
        initializeGate();
    }, [initializeGate]);

    // Handle manual login with email + temp password
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!emailInput.trim() || !passwordInput.trim()) {
            setError("Please provide your email address and temporary password.");
            return;
        }

        setAuthenticating(true);
        try {
            const res = await api.post("/auth/invite-login", {
                interviewId,
                email: emailInput.trim().toLowerCase(),
                password: passwordInput.trim()
            });

            if (res.data.token && res.data.user) {
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("user", JSON.stringify(res.data.user));
                localStorage.setItem("username", res.data.user.username || "");
                localStorage.setItem("role", res.data.user.role || "user");
                setCurrentUser(res.data.user);
                if (res.data.interview) {
                    setInterview(res.data.interview);
                }
            }
        } catch (err) {
            console.error("Login error:", err);
            setError(err.response?.data?.message || "Invalid email or temporary password.");
        } finally {
            setAuthenticating(false);
        }
    };

    // Launch assessment
    const handleStartAssessment = async () => {
        setStarting(true);
        try {
            // Call start endpoint to transition from pending to in-progress
            await api.post(`/interviews/${interviewId}/start`);
            navigate(`/interview/rules?id=${interviewId}`);
        } catch (err) {
            console.error("Failed to start assessment:", err);
            // If already in-progress, go straight to exam room
            navigate(`/interview/${interviewId}`);
        } finally {
            setStarting(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: "100vh",
                backgroundColor: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px"
            }}>
                <Card style={{ maxWidth: "480px", width: "100%", padding: "32px", textAlign: "center" }}>
                    <Skeleton height={28} width={220} style={{ margin: "0 auto 16px" }} />
                    <Skeleton height={16} width={320} style={{ margin: "0 auto 24px" }} />
                    <Skeleton height={140} style={{ borderRadius: "10px", marginBottom: "20px" }} />
                    <Skeleton height={44} style={{ borderRadius: "8px" }} />
                </Card>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
            <div style={{
                maxWidth: "520px",
                width: "100%",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                overflow: "hidden"
            }}>
                {/* Header Banner */}
                <div style={{
                    backgroundColor: "#0f172a",
                    padding: "24px 28px",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        backgroundColor: "#166534",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff"
                    }}>
                        <Shield size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "-0.01em" }}>
                            AI Assessment Portal
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                            Official Candidate Evaluation Session
                        </div>
                    </div>
                </div>

                <div style={{ padding: "28px" }}>
                    {error && (
                        <div style={{
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            padding: "12px 16px",
                            marginBottom: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            fontSize: "13px",
                            color: "#991b1b"
                        }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {currentUser ? (
                        /* AUTHENTICATED CANDIDATE BRIEFING */
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                                <UserCheck size={18} style={{ color: "#16a34a" }} />
                                <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                                    Verified as {currentUser.username} ({currentUser.email})
                                </span>
                            </div>

                            {/* Assessment Briefing Card */}
                            <div style={{
                                backgroundColor: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                padding: "20px",
                                marginBottom: "24px"
                            }}>
                                <div style={{
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "12px"
                                }}>
                                    Assessment Overview
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#64748b" }}>Role:</span>
                                        <span style={{ fontWeight: "600", color: "#0f172a" }}>
                                            {interview?.roleTitle || "Technical Candidate"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#64748b" }}>Focus Domain:</span>
                                        <span style={{ fontWeight: "600", color: "#0f172a" }}>
                                            {interview?.domain || "General"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#64748b" }}>Format:</span>
                                        <span style={{ fontWeight: "600", color: "#0f172a", textTransform: "capitalize" }}>
                                            {interview?.assessmentType || "Theory"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#64748b" }}>Time Allowed:</span>
                                        <span style={{ fontWeight: "600", color: "#0f172a" }}>
                                            {Math.round((interview?.durationSeconds || 1800) / 60)} minutes
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "#64748b" }}>Total Questions:</span>
                                        <span style={{ fontWeight: "600", color: "#0f172a" }}>
                                            {interview?.questionCount || interview?.responses?.length || 5} questions
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions Box */}
                            <div style={{
                                backgroundColor: "#ecfdf5",
                                border: "1px solid #a7f3d0",
                                borderRadius: "8px",
                                padding: "12px 16px",
                                fontSize: "12px",
                                color: "#065f46",
                                lineHeight: "1.5",
                                marginBottom: "24px"
                            }}>
                                <strong>Assessment Instructions:</strong> Once you click start, your timer begins and formal proctoring rules (fullscreen, tab-switch monitoring, and copy-paste limits) will be enforced.
                            </div>

                            {/* Launch CTA */}
                            <Button
                                variant="primary"
                                onClick={handleStartAssessment}
                                disabled={starting}
                                style={{
                                    width: "100%",
                                    padding: "12px 20px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px"
                                }}
                            >
                                {starting ? "Preparing Workspace..." : "Start Assessment Now"}
                                <ArrowRight size={16} />
                            </Button>
                        </div>
                    ) : (
                        /* UN-AUTHENTICATED ACCESS GATE */
                        <div>
                            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 6px" }}>
                                Access Your Assessment
                            </h2>
                            <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 20px", lineHeight: "1.5" }}>
                                Enter the email and temporary password provided in your assessment invitation email.
                            </p>

                            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Registered Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="candidate@example.com"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        required
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px"
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                                        Temporary Password
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter password from invitation email"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        required
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px"
                                        }}
                                    />
                                </div>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={authenticating}
                                    style={{
                                        width: "100%",
                                        padding: "12px 20px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        marginTop: "8px"
                                    }}
                                >
                                    {authenticating ? "Verifying Credentials..." : "Log In & Access Assessment"}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
