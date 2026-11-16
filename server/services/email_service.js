const nodemailer = require("nodemailer");
const https = require("https");

const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || "smtp").toLowerCase().trim();
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "AI Assess <no-reply@assess.ai>";
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const MAIL_DRY_RUN = process.env.MAIL_DRY_RUN === "true";

let cachedTransporter = null;
let etherealAccount = null;
let healthStatus = {
    connected: false,
    lastError: null,
    lastCheckedAt: null
};

// Print startup configuration
function printStartupSummary() {
    console.log("================ EMAIL SERVICE CONFIGURATION ================");
    console.log(`MAIL_PROVIDER:           ${MAIL_PROVIDER}`);
    console.log(`MAIL_DRY_RUN:            ${MAIL_DRY_RUN}`);
    console.log(`SMTP_HOST:               ${SMTP_HOST ? SMTP_HOST : "(not configured)"}`);
    console.log(`SMTP_PORT:               ${SMTP_PORT}`);
    console.log(`SMTP_SECURE:             ${SMTP_SECURE}`);
    console.log(`SMTP_USER:               ${SMTP_USER ? SMTP_USER : "(not configured)"}`);
    console.log(`SMTP_PASS:               ${SMTP_PASS ? "[SET: ********]" : "(not configured)"}`);
    console.log(`RESEND_API_KEY:          ${process.env.RESEND_API_KEY ? "[SET: ********]" : "(not configured)"}`);
    console.log(`MAIL_FROM:               ${MAIL_FROM}`);
    console.log(`FRONTEND_URL:            ${FRONTEND_URL}`);
    console.log(`NODE_ENV:                ${process.env.NODE_ENV || "development"}`);
    console.log("=============================================================");
}

// Production guard check
function checkProductionGuard() {
    if (process.env.NODE_ENV === "production") {
        if (MAIL_DRY_RUN) {
            console.error("FATAL: MAIL_DRY_RUN is true in production environment! Candidate invites will not be delivered.");
        }
        if (MAIL_PROVIDER === "smtp" && (!SMTP_HOST || !SMTP_USER || !SMTP_PASS)) {
            console.error("FATAL: Incomplete SMTP configuration in production! Missing: " +
                [!SMTP_HOST && "SMTP_HOST", !SMTP_USER && "SMTP_USER", !SMTP_PASS && "SMTP_PASS"].filter(Boolean).join(", "));
        }
        if (MAIL_PROVIDER === "resend" && !process.env.RESEND_API_KEY) {
            console.error("FATAL: RESEND_API_KEY missing in production environment!");
        }
        if (FRONTEND_URL.includes("localhost") || FRONTEND_URL.includes("127.0.0.1")) {
            console.error("WARNING: FRONTEND_URL is set to localhost in production! Candidates will not be able to open login links.");
        }
    }
}

printStartupSummary();
checkProductionGuard();

/**
 * Initializes and verifies the mail transporter
 */
async function getTransporter() {
    if (cachedTransporter) return cachedTransporter;

    if (MAIL_PROVIDER === "ethereal") {
        if (!etherealAccount) {
            console.log("[EmailService] Creating Ethereal test inbox...");
            etherealAccount = await nodemailer.createTestAccount();
            console.log(`[EmailService] Ethereal inbox initialized: ${etherealAccount.user}`);
        }
        cachedTransporter = nodemailer.createTransport({
            host: etherealAccount.smtp.host,
            port: etherealAccount.smtp.port,
            secure: etherealAccount.smtp.secure,
            auth: {
                user: etherealAccount.user,
                pass: etherealAccount.pass
            }
        });
        return cachedTransporter;
    }

    if (MAIL_PROVIDER === "smtp") {
        if (!SMTP_HOST) {
            throw new Error("SMTP_HOST is not configured. Set SMTP_HOST or switch MAIL_PROVIDER to 'ethereal'.");
        }
        cachedTransporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        });
        return cachedTransporter;
    }

    return null;
}

/**
 * Verifies email connection and caches health
 */
async function verifyConnection() {
    const now = new Date();
    if (MAIL_DRY_RUN) {
        healthStatus = {
            connected: false,
            lastError: "Dry-run mode is active: no emails will be delivered.",
            lastCheckedAt: now
        };
        return healthStatus;
    }

    if (MAIL_PROVIDER === "ethereal") {
        try {
            await getTransporter();
            healthStatus = {
                connected: true,
                lastError: null,
                lastCheckedAt: now
            };
            return healthStatus;
        } catch (err) {
            healthStatus = {
                connected: false,
                lastError: err.message,
                lastCheckedAt: now
            };
            return healthStatus;
        }
    }

    if (MAIL_PROVIDER === "resend") {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            healthStatus = {
                connected: false,
                lastError: "RESEND_API_KEY is not configured.",
                lastCheckedAt: now
            };
            return healthStatus;
        }
        healthStatus = {
            connected: true,
            lastError: null,
            lastCheckedAt: now
        };
        return healthStatus;
    }

    if (MAIL_PROVIDER === "smtp") {
        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
            healthStatus = {
                connected: false,
                lastError: "SMTP credentials incomplete (SMTP_HOST, SMTP_USER, or SMTP_PASS missing).",
                lastCheckedAt: now
            };
            return healthStatus;
        }

        try {
            const transport = await getTransporter();
            await transport.verify();
            healthStatus = {
                connected: true,
                lastError: null,
                lastCheckedAt: now
            };
            return healthStatus;
        } catch (err) {
            healthStatus = {
                connected: false,
                lastError: err.message,
                lastCheckedAt: now
            };
            return healthStatus;
        }
    }

    healthStatus = {
        connected: false,
        lastError: `Unknown MAIL_PROVIDER '${MAIL_PROVIDER}'.`,
        lastCheckedAt: now
    };
    return healthStatus;
}

// Auto-verify in background on startup
setTimeout(() => {
    verifyConnection().then(st => {
        if (st.connected) {
            console.log(`[EmailService] Connection verified successfully (${MAIL_PROVIDER}).`);
        } else {
            console.warn(`[EmailService] Initial verification failed: ${st.lastError}`);
        }
    }).catch(err => {
        console.warn(`[EmailService] Initial verification error: ${err.message}`);
    });
}, 1000);

/**
 * Diagnostic helper: translates technical SMTP errors into clear human recommendations
 */
function diagnoseMailError(err) {
    if (!err) return "Unknown error occurred.";
    const msg = (err.message || "").toLowerCase();
    const code = (err.code || "").toUpperCase();

    if (msg.includes("invalid login") || msg.includes("username and password not accepted") || msg.includes("535") || msg.includes("badcredentials")) {
        return "Authentication failed (535): Invalid username or password. If using Gmail, you MUST generate an App Password (16 characters from Google Account > Security > 2-Step Verification > App Passwords) and use that in SMTP_PASS.";
    }
    if (code === "ECONNREFUSED" || msg.includes("econnrefused")) {
        return `Connection refused: Could not connect to SMTP server at ${SMTP_HOST}:${SMTP_PORT}. Verify that the host and port are correct and your network does not block outbound SMTP connections.`;
    }
    if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT" || msg.includes("timeout")) {
        return `Connection timed out: The SMTP server at ${SMTP_HOST}:${SMTP_PORT} did not respond in time. Check your internet connection and firewall settings.`;
    }
    if (msg.includes("self signed certificate") || msg.includes("tlsv1") || msg.includes("handshake")) {
        return "TLS/SSL Handshake error: Security mismatch. Check whether SMTP_PORT (465 for SSL, 587 for STARTTLS) and SMTP_SECURE match your email provider.";
    }
    if (msg.includes("sender address rejected") || msg.includes("550") || msg.includes("553") || msg.includes("not authorized")) {
        return `Sender address rejected: The server rejected sender address '${MAIL_FROM}'. Verify that your authenticated account has permission to send from this address.`;
    }
    return `Mail delivery error: ${err.message || "Failed to communicate with provider."}`;
}

function formatWindowDate(date) {
    if (!date) return "Open immediately";
    const d = new Date(date);
    return d.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short"
    });
}

/**
 * Builds HTML and Plain Text templates for assessment invitation
 */
function buildInviteEmail(params) {
    const candidateName = params.candidateName || params.name || "Candidate";
    const candidateEmail = (params.candidateEmail || params.to || "").trim().toLowerCase();
    const tempPassword = params.tempPassword || params.temporaryPassword || "";
    const organizationName = params.organizationName || "AI Assess";
    const testName = params.testName || params.assessmentRole || params.roleTitle || params.role || "Technical Assessment";
    const durationMinutes = Number(params.durationMinutes) || Math.round((Number(params.durationSeconds) || 1800) / 60) || 30;
    const opensAt = params.opensAt;
    const closesAt = params.closesAt;
    const isExistingAccount = Boolean(params.isExistingAccount || (!tempPassword && !params.isNewUser));
    const isReminder = Boolean(params.isReminder);

    const loginUrl = params.loginUrl || `${FRONTEND_URL}/login?email=${encodeURIComponent(candidateEmail)}`;
    const opensText = opensAt ? formatWindowDate(opensAt) : "Open immediately upon receipt";
    const closesText = closesAt ? formatWindowDate(closesAt) : "No expiration specified";

    const subject = isReminder
        ? `Reminder: Your ${organizationName} assessment: ${testName}`
        : `Your ${organizationName} assessment: ${testName}`;

    const credentialBlockHtml = isExistingAccount
        ? `<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
             <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #166534;">Existing Account Verified</p>
             <p style="margin: 0; font-size: 13px; color: #374151;">You already have an AI Assess account with this email address. Please sign in using your existing password to access this assessment.</p>
           </div>`
        : `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
             <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</p>
             <div style="font-family: monospace; font-size: 14px; color: #0f172a; line-height: 1.8;">
               <div><strong>Email:</strong> ${candidateEmail}</div>
               <div><strong>Temporary Password:</strong> <span style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${tempPassword}</span></div>
             </div>
             <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
               <em>You will be asked to set a new personal password on your first login.</em>
             </p>
           </div>`;

    const credentialBlockText = isExistingAccount
        ? `Existing Account: Please log in using your existing account password.`
        : `Your Credentials:\nEmail: ${candidateEmail}\nTemporary Password: ${tempPassword}\n(You will be asked to set a new personal password on first login)`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 32px 16px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
    
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
      <div style="width: 28px; height: 28px; border-radius: 6px; background-color: #16a34a; color: #ffffff; font-weight: 700; font-size: 14px; text-align: center; line-height: 28px;">A</div>
      <span style="font-size: 16px; font-weight: 600; color: #0f172a;">${organizationName} Assessment</span>
    </div>

    <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">
      Hello ${candidateName},
    </h2>
    
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
      You have been invited by <strong>${organizationName}</strong> to complete the official technical assessment: <strong>${testName}</strong>.
    </p>

    <!-- Details Box -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 130px;">Assessment:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${testName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Duration:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${durationMinutes} minutes</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Opens:</td>
          <td style="padding: 4px 0;">${opensText}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;">Deadline:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #b91c1c;">${closesText}</td>
        </tr>
      </table>
    </div>

    ${credentialBlockHtml}

    <div style="margin: 28px 0; text-align: center;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
        Sign In and Begin Assessment →
      </a>
    </div>

    <!-- Proctoring Notice -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 28px;">
      <p style="font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 8px 0;">
        Important Assessment Guidelines
      </p>
      <ul style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 16px 0; padding-left: 18px;">
        <li>Use a desktop or laptop with Google Chrome and a stable internet connection.</li>
        <li>The assessment enforces strict fullscreen proctoring. Tab switching, copy-pasting, and exiting fullscreen are monitored and logged.</li>
        <li>Three security flags will automatically end and submit your assessment.</li>
        <li>Ensure you complete and submit before the stated deadline.</li>
      </ul>
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        If you have questions or experience technical difficulties, please contact your examination administrator.
      </p>
    </div>

  </div>
</body>
</html>`;

    const text = `Hello ${candidateName},

You have been invited by ${organizationName} to complete the technical assessment: ${testName}.

ASSESSMENT DETAILS:
- Test: ${testName}
- Duration: ${durationMinutes} minutes
- Opens: ${opensText}
- Closes: ${closesText}

${credentialBlockText}

LOGIN LINK:
${loginUrl}

IMPORTANT GUIDELINES:
- Please take this exam on a laptop/desktop with Google Chrome.
- Fullscreen mode is enforced throughout the session.
- Tab switching, clipboard copy/paste, and window blur events are monitored and logged.
- Three integrity infractions will automatically conclude your assessment.
- Please submit before the deadline.

If you have questions, please contact your exam administrator.`;

    return { subject, html, text, loginUrl };
}

/**
 * Sends a single email with up to 3 retries on transient network errors.
 * Never retries on permanent authentication or recipient errors.
 */
async function sendMailWithRetry(mailOptions, retries = 3) {
    if (MAIL_DRY_RUN) {
        console.log(`[EmailService DRY-RUN] Rendered email to: ${mailOptions.to}`);
        console.log(`[EmailService DRY-RUN] Subject: ${mailOptions.subject}`);
        return {
            success: false,
            dryRun: true,
            error: "Dry-run mode is ON: emails are logged to console and not dispatched to provider."
        };
    }

    if (MAIL_PROVIDER === "resend") {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error("RESEND_API_KEY is not configured.");
        }
        // Resend HTTP call
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                from: mailOptions.from || MAIL_FROM,
                to: [mailOptions.to],
                subject: mailOptions.subject,
                html: mailOptions.html,
                text: mailOptions.text
            });

            const req = https.request({
                hostname: "api.resend.com",
                port: 443,
                path: "/emails",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Length": Buffer.byteLength(data)
                }
            }, (res) => {
                let body = "";
                res.on("data", chunk => body += chunk);
                res.on("end", () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsed = JSON.parse(body);
                            resolve({ success: true, messageId: parsed.id });
                        } catch {
                            resolve({ success: true, messageId: "resend-ok" });
                        }
                    } else {
                        reject(new Error(`Resend API error (${res.statusCode}): ${body}`));
                    }
                });
            });
            req.on("error", reject);
            req.write(data);
            req.end();
        });
    }

    const transport = await getTransporter();
    if (!transport) {
        throw new Error("Mail transport is not initialized.");
    }

    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const info = await transport.sendMail(mailOptions);
            const previewUrl = (MAIL_PROVIDER === "ethereal" && nodemailer.getTestMessageUrl(info)) || null;

            if (previewUrl) {
                console.log(`[EmailService ETHEREAL] Preview URL: ${previewUrl}`);
            }

            return {
                success: true,
                messageId: info.messageId,
                previewUrl
            };
        } catch (err) {
            lastError = err;
            const isPermanent = /535|invalid login|recipient rejected|550|553/i.test(err.message || "");
            console.warn(`[EmailService] Attempt ${attempt} failed sending to ${mailOptions.to}:`, err.message);

            if (isPermanent || attempt >= retries) {
                break;
            }
            // Exponential backoff
            await new Promise(r => setTimeout(r, 500 * attempt));
        }
    }

    throw new Error(diagnoseMailError(lastError));
}

/**
 * High-level wrapper for candidate invitation
 */
async function sendAssessmentInvite(params) {
    const candidateEmail = (params.candidateEmail || params.to || "").trim().toLowerCase();
    if (!candidateEmail) {
        return { success: false, error: "Recipient email address is required." };
    }

    try {
        const { subject, html, text, loginUrl } = buildInviteEmail(params);

        const mailOptions = {
            from: MAIL_FROM,
            to: candidateEmail,
            subject,
            text,
            html,
            replyTo: params.replyTo || (params.organizationEmail ? params.organizationEmail : undefined)
        };

        const result = await sendMailWithRetry(mailOptions);
        return {
            ...result,
            loginUrl
        };
    } catch (err) {
        return {
            success: false,
            error: err.message || "Failed to dispatch invitation email."
        };
    }
}

/**
 * Sends a real test email to an address
 */
async function sendTestMail(targetEmail) {
    const cleanEmail = (targetEmail || "").trim().toLowerCase();
    if (!cleanEmail) {
        return { success: false, error: "Target email address is required for test email." };
    }

    try {
        const mailOptions = {
            from: MAIL_FROM,
            to: cleanEmail,
            subject: "AI Assess - Test Email Configuration",
            text: "This is a real test email from your AI Assess platform. If you are reading this, your email configuration is working properly!",
            html: `
            <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h3 style="color: #16a34a; margin-top: 0;">✓ Email Delivery Operational</h3>
                <p>This is a real test email from your AI Assess platform. If you received this, your email transport configuration is verified and working.</p>
                <div style="font-size: 12px; color: #64748b; margin-top: 16px;">
                    <div><strong>Provider:</strong> ${MAIL_PROVIDER}</div>
                    <div><strong>From:</strong> ${MAIL_FROM}</div>
                    <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
                </div>
            </div>`
        };

        const result = await sendMailWithRetry(mailOptions);
        return {
            success: true,
            message: `Test email successfully sent to ${cleanEmail}`,
            messageId: result.messageId,
            previewUrl: result.previewUrl
        };
    } catch (err) {
        return {
            success: false,
            error: err.message || "Failed to send test email.",
            diagnosis: diagnoseMailError(err)
        };
    }
}

module.exports = {
    MAIL_PROVIDER,
    MAIL_DRY_RUN,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    MAIL_FROM,
    FRONTEND_URL,
    verifyConnection,
    getHealthStatus: () => ({ ...healthStatus }),
    diagnoseMailError,
    formatWindowDate,
    buildInviteEmail,
    sendAssessmentInvite,
    sendTestMail
};
