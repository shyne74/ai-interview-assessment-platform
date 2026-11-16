import React, { useState, useEffect } from "react";
import api from "../utils/api";
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Info,
    Send,
    Loader2,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    RefreshCw
} from "lucide-react";

export default function EmailStatusBanner({ onStatusChange, allowTestSend = true }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const [testEmail, setTestEmail] = useState("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [showTestModal, setShowTestModal] = useState(false);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await api.get("/batches/mail-status");
            setStatus(res.data);
            if (onStatusChange) {
                // Operational if connected and not dry-run
                const isOp = res.data.connected && !res.data.dryRun;
                onStatusChange({
                    operational: isOp,
                    provider: res.data.provider,
                    dryRun: res.data.dryRun,
                    lastError: res.data.lastError
                });
            }
        } catch (err) {
            console.error("Failed to load mail status:", err);
            const fallback = {
                connected: false,
                provider: "unknown",
                dryRun: false,
                lastError: err.response?.data?.message || err.message || "Failed to reach server"
            };
            setStatus(fallback);
            if (onStatusChange) {
                onStatusChange({ operational: false, provider: "unknown", lastError: fallback.lastError });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const stored = localStorage.getItem("email");
        if (stored) setTestEmail(stored);
    }, []);

    const handleSendTest = async (e) => {
        if (e) e.preventDefault();
        if (!testEmail) return;
        setTesting(true);
        setTestResult(null);

        try {
            const res = await api.post("/batches/mail-test", { targetEmail: testEmail.trim() });
            setTestResult({
                success: true,
                message: res.data.message || `Test email sent to ${testEmail}`,
                previewUrl: res.data.previewUrl
            });
            fetchStatus();
        } catch (err) {
            const data = err.response?.data;
            setTestResult({
                success: false,
                message: data?.error || err.message || "Failed to send test email.",
                diagnosis: data?.diagnosis
            });
        } finally {
            setTesting(false);
        }
    };

    if (loading && !status) {
        return (
            <div style={{ padding: "10px 16px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                <Loader2 size={15} className="animate-spin" /> Checking email delivery service...
            </div>
        );
    }

    if (!status) return null;

    const isEthereal = status.provider === "ethereal";
    const isDryRun = status.dryRun;
    const isConnected = status.connected && !isDryRun;
    const isLocalhost = status.frontendUrlIsLocalhost;

    // Determine banner variant:
    // Red: dry-run is on OR connection failed
    // Blue: Ethereal mode active
    // Green: Connected with SMTP/Resend
    let bannerBg = "#f0fdf4";
    let bannerBorder = "#bbf7d0";
    let bannerText = "#166534";
    let statusIcon = <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0 }} />;
    let statusTitle = `Email service connected (${status.provider.toUpperCase()} as ${status.from})`;
    let statusDetail = "Assessment invitations and credentials will be delivered to candidates' inboxes.";

    if (isDryRun) {
        bannerBg = "#fef2f2";
        bannerBorder = "#fecaca";
        bannerText = "#991b1b";
        statusIcon = <XCircle size={16} style={{ color: "#dc2626", flexShrink: 0 }} />;
        statusTitle = "Emails are NOT being sent: dry-run mode is enabled (MAIL_DRY_RUN=true)";
        statusDetail = "Emails are only logged to server console. Candidates will NOT receive invitation credentials.";
    } else if (!status.connected) {
        bannerBg = "#fef2f2";
        bannerBorder = "#fecaca";
        bannerText = "#991b1b";
        statusIcon = <XCircle size={16} style={{ color: "#dc2626", flexShrink: 0 }} />;
        statusTitle = `Email delivery disconnected (${status.provider.toUpperCase()})`;
        statusDetail = status.lastError || "Could not connect to SMTP provider. Please check credentials.";
    } else if (isEthereal) {
        bannerBg = "#eff6ff";
        bannerBorder = "#bfdbfe";
        bannerText = "#1e40af";
        statusIcon = <Info size={16} style={{ color: "#2563eb", flexShrink: 0 }} />;
        statusTitle = "Ethereal Test Mailbox Active (MAIL_PROVIDER=ethereal)";
        statusDetail = "Emails are simulated in an Ethereal inbox. Each invite generates a clickable preview URL in tracking.";
    }

    return (
        <div style={{ marginBottom: "20px" }}>
            {/* Main Status Bar */}
            <div
                style={{
                    backgroundColor: bannerBg,
                    border: `1px solid ${bannerBorder}`,
                    borderRadius: "8px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px"
                }}
            >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1, minWidth: "260px" }}>
                    <div style={{ marginTop: "2px" }}>{statusIcon}</div>
                    <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: bannerText }}>
                            {statusTitle}
                        </div>
                        <div style={{ fontSize: "12px", color: bannerText, opacity: 0.9, marginTop: "2px" }}>
                            {statusDetail}
                        </div>
                        {isLocalhost && isConnected && (
                            <div style={{ fontSize: "11px", color: "#b45309", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                                <AlertTriangle size={12} />
                                Note: FRONTEND_URL is localhost ({status.frontendUrl}). External candidates cannot open these links without public hosting or tunnel.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                        type="button"
                        onClick={fetchStatus}
                        title="Re-check email connection status"
                        style={{
                            background: "none",
                            border: `1px solid ${bannerBorder}`,
                            borderRadius: "6px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: bannerText,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer"
                        }}
                    >
                        <RefreshCw size={12} /> Check
                    </button>

                    {allowTestSend && (
                        <button
                            type="button"
                            onClick={() => setShowTestModal(true)}
                            style={{
                                backgroundColor: isConnected || isEthereal ? "#ffffff" : "#dc2626",
                                color: isConnected || isEthereal ? bannerText : "#ffffff",
                                border: `1px solid ${bannerBorder}`,
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "12px",
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer"
                            }}
                        >
                            <Send size={12} /> Send test email
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowHelp(!showHelp)}
                        style={{
                            background: "none",
                            border: `1px solid ${bannerBorder}`,
                            borderRadius: "6px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: bannerText,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer"
                        }}
                    >
                        <HelpCircle size={12} /> Setup Help {showHelp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                </div>
            </div>

            {/* Collapsible Setup Help Panel */}
            {showHelp && (
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "16px 20px",
                        marginTop: "8px",
                        fontSize: "13px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                            Email Dispatch Configuration Guide
                        </h4>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>server/.env</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                        {/* Option A: Gmail SMTP */}
                        <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                                Option 1: Gmail App Password (Recommended for testing)
                            </div>
                            <ol style={{ margin: "0 0 10px 0", paddingLeft: "18px", fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
                                <li>Enable 2-Step Verification in your Google Account.</li>
                                <li>Visit <strong>myaccount.google.com/apppasswords</strong>.</li>
                                <li>Generate an App Password (name it "AssessAI").</li>
                                <li>Copy the 16-character code into <code>SMTP_PASS</code>.</li>
                            </ol>
                            <pre style={{ margin: 0, padding: "8px", backgroundColor: "#0f172a", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", overflowX: "auto" }}>
{`MAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM="AssessAI <your_email@gmail.com>"`}
                            </pre>
                        </div>

                        {/* Option B: Ethereal or Resend */}
                        <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "6px" }}>
                                Option 2: Ethereal (Zero Credentials Dev Mode)
                            </div>
                            <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
                                Generates an isolated test mailbox automatically. Safe for local testing—emails are never sent to external inboxes, but web preview links are generated for every invite.
                            </p>
                            <pre style={{ margin: 0, padding: "8px", backgroundColor: "#0f172a", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", overflowX: "auto" }}>
{`MAIL_PROVIDER=ethereal
MAIL_DRY_RUN=false
FRONTEND_URL=http://localhost:3000`}
                            </pre>
                            <div style={{ fontWeight: 600, color: "#0f172a", marginTop: "10px", marginBottom: "4px", fontSize: "12px" }}>
                                Option 3: Resend HTTP API (Custom Domain)
                            </div>
                            <pre style={{ margin: 0, padding: "8px", backgroundColor: "#0f172a", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", overflowX: "auto" }}>
{`MAIL_PROVIDER=resend
RESEND_API_KEY=re_123456789...
MAIL_FROM="Examiner <examiner@yourdomain.com>"`}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Email Modal */}
            {showTestModal && (
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
                            borderRadius: "12px",
                            padding: "24px",
                            maxWidth: "460px",
                            width: "100%",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                        }}
                    >
                        <h3 style={{ margin: "0 0 10px 0", fontSize: "17px", fontWeight: 600, color: "#0f172a" }}>
                            Send Test Email
                        </h3>
                        <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 16px 0", lineHeight: 1.5 }}>
                            Send a real verification email through <strong>{status.provider.toUpperCase()}</strong> to confirm delivery and review server diagnostics.
                        </p>

                        <form onSubmit={handleSendTest}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                                    Target Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                    style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        fontSize: "13px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            {testResult && (
                                <div
                                    style={{
                                        padding: "12px",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        marginBottom: "16px",
                                        backgroundColor: testResult.success ? "#f0fdf4" : "#fef2f2",
                                        border: `1px solid ${testResult.success ? "#bbf7d0" : "#fecaca"}`,
                                        color: testResult.success ? "#166534" : "#991b1b"
                                    }}
                                >
                                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                                        {testResult.success ? "✓ Test Email Dispatched" : "✗ Delivery Failed"}
                                    </div>
                                    <div>{testResult.message}</div>
                                    {testResult.diagnosis && (
                                        <div style={{ marginTop: "6px", padding: "6px 8px", backgroundColor: "#ffffff", borderRadius: "4px", border: "1px solid #fca5a5", color: "#7f1d1d" }}>
                                            <strong>Suggested Fix:</strong> {testResult.diagnosis}
                                        </div>
                                    )}
                                    {testResult.previewUrl && (
                                        <div style={{ marginTop: "8px" }}>
                                            <a
                                                href={testResult.previewUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: "#2563eb", fontWeight: 600, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                            >
                                                Open Ethereal Preview Inbox <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTestModal(false);
                                        setTestResult(null);
                                    }}
                                    style={{
                                        padding: "8px 14px",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        color: "#475569",
                                        cursor: "pointer"
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={testing || !testEmail}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: "#16a34a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        cursor: "pointer"
                                    }}
                                >
                                    {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    Send Test
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
