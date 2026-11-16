const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "AI Assess <examiner@assess.ai>";
const CLIENT_URL = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

let cachedTransporter = null;
let etherealAccount = null;

async function getTransporter() {
    if (cachedTransporter) return cachedTransporter;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
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

    // Fallback: Ethereal test inbox in development/testing
    if (!etherealAccount) {
        console.log("[emailService] Initializing Ethereal test account...");
        etherealAccount = await nodemailer.createTestAccount();
        console.log(`[emailService] Ethereal inbox ready: ${etherealAccount.user}`);
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

/**
 * Sends assessment invitation email with credentials and direct link
 */
async function sendAssessmentInviteEmail({
    to,
    candidateName = "Candidate",
    roleTitle = "Software Engineer",
    domain = "General",
    assessmentType = "theory",
    durationSeconds = 1800,
    email,
    tempPassword,
    examUrl
}) {
    const targetEmail = (to || email || "").trim().toLowerCase();
    if (!targetEmail) {
        throw new Error("Recipient email address is required.");
    }

    const durationMinutes = Math.round((Number(durationSeconds) || 1800) / 60);
    const directLink = examUrl || `${CLIENT_URL}/login`;

    const subject = `Assessment Invitation: ${roleTitle} (${domain})`;

    const text = `
Hello ${candidateName},

You have been invited to complete a technical assessment on the AI Assessment Platform.

ASSESSMENT DETAILS:
- Role: ${roleTitle}
- Domain / Focus: ${domain}
- Format: ${assessmentType.toUpperCase()}
- Duration: ${durationMinutes} minutes

YOUR LOGIN CREDENTIALS:
- Email: ${targetEmail}
${tempPassword ? `- Temporary Password: ${tempPassword}` : `- Use your existing account password`}

ACCESS YOUR ASSESSMENT:
Open the link below to verify your credentials and begin your assessment:
${directLink}

Please complete the assessment in a quiet environment on a desktop or laptop with a modern web browser.

Good luck,
The AI Assessment Team
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Assessment Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
    <div style="max-width: 580px; margin: 32px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
            <div style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
                AI Assessment Platform
            </div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
                Official Technical Evaluation Invitation
            </div>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
            <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px 0;">
                Hello ${candidateName},
            </h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                You have been registered for a formal technical assessment. Please review your assessment details and credentials below.
            </p>

            <!-- Test Details Card -->
            <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
                    Assessment Overview
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 4px 0; color: #64748b; width: 40%;">Role:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${roleTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Domain:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${domain}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Format:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600; text-transform: capitalize;">${assessmentType}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #64748b;">Allotted Time:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${durationMinutes} minutes</td>
                    </tr>
                </table>
            </div>

            <!-- Credentials Box -->
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 20px; margin-bottom: 28px;">
                <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                    Your Login Credentials
                </div>
                <div style="font-size: 13px; color: #166534; line-height: 1.6;">
                    <div><strong>Email:</strong> <span style="font-family: monospace; background-color: #dcfce7; padding: 2px 6px; border-radius: 4px;">${targetEmail}</span></div>
                    ${tempPassword ? `<div style="margin-top: 4px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background-color: #dcfce7; padding: 2px 6px; border-radius: 4px;">${tempPassword}</span></div>` : '<div style="margin-top: 4px;"><em>Log in with your existing account password.</em></div>'}
                </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 28px;">
                <a href="${directLink}" style="display: inline-block; background-color: #15803d; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(21, 128, 61, 0.2);">
                    Start Assessment →
                </a>
            </div>

            <!-- Fallback Direct Link -->
            <div style="font-size: 12px; color: #94a3b8; line-height: 1.5; word-break: break-all; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                If the button above does not work, copy and paste this direct access link into your browser:<br/>
                <a href="${directLink}" style="color: #2563eb; text-decoration: none;">${directLink}</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 11px; color: #94a3b8; text-align: center;">
            This is an automated invitation from AI Assessment Platform. Please do not reply directly to this email.
        </div>
    </div>
</body>
</html>
`.trim();

    const transporter = await getTransporter();
    const mailOptions = {
        from: MAIL_FROM,
        to: targetEmail,
        subject,
        text,
        html
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || "";

    console.log(`[emailService] Invitation email dispatched to ${targetEmail}. MessageId: ${info.messageId}`);
    if (previewUrl) {
        console.log(`[emailService] Ethereal Preview URL: ${previewUrl}`);
    }

    return {
        success: true,
        messageId: info.messageId,
        previewUrl
    };
}

module.exports = {
    sendAssessmentInviteEmail,
    CLIENT_URL
};
