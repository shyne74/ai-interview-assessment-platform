# Company Exam Mode & Email Invitation System

## Overview
Company Exam Mode allows administrators, examiners, and recruiters to organize candidate exam cohorts (batches), assign personalized tests with unique randomized questions, dispatch invitation emails with one-click direct links and temporary credentials, and monitor live test progress and proctoring telemetry in real-time.

---

## ⚡ Go Live in 5 Minutes (Email Setup)

### Option 1: Gmail App Password (Fastest for testing & teams)
1. Ensure **2-Step Verification** is enabled on your Google Account: [myaccount.google.com/security](https://myaccount.google.com/security).
2. Go to **App Passwords**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Create an app password named `AssessAI`. Google will display a 16-character code (e.g. `abcd efgh ijkl mnop`).
4. In `server/.env`, configure:
   ```env
   MAIL_PROVIDER=smtp
   MAIL_DRY_RUN=false
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   MAIL_FROM="AssessAI Examinations <your_email@gmail.com>"
   FRONTEND_URL=https://your-public-site.com
   ```

### Option 2: Ethereal (Zero-Credential Developer Mode)
No credentials required! When enabled, Nodemailer automatically creates a simulated inbox and returns a clickable preview URL for every dispatched invite:
```env
MAIL_PROVIDER=ethereal
MAIL_DRY_RUN=false
FRONTEND_URL=http://localhost:3000
```
- Click **"View Email ↗"** on any candidate row in the tracking table to open and inspect the rendered email, credentials, and links.

### Option 3: Resend HTTP API (Best for custom domains & high deliverability)
1. Sign up at [resend.com](https://resend.com) and create an API Key.
2. In `server/.env`, configure:
   ```env
   MAIL_PROVIDER=resend
   MAIL_DRY_RUN=false
   RESEND_API_KEY=re_123456789...
   MAIL_FROM="Examiner <examiner@yourdomain.com>"
   FRONTEND_URL=https://assess.yourdomain.com
   ```

---

## Core Features & Architecture

### 1. Reliable, Multi-Provider Email Delivery
- **Env-Selected Transport**: Nodemailer SMTP, Resend HTTP API, or Ethereal test inbox.
- **Startup Health Check**: Runs `transporter.verify()` on startup, prints diagnostic summary (masking sensitive credentials), and caches status for live admin monitoring.
- **Production Guard**: In `NODE_ENV=production`, server refuses to send invites if email provider is unconfigured or if `FRONTEND_URL` is set to localhost.
- **Idempotent Dispatch**: Re-clicking "Send Invites" automatically skips candidates whose emails were already confirmed as delivered, preventing duplicate candidate messages.
- **Transient Error Retries**: Retries transient socket/timeout errors up to 3 times with exponential backoff (500ms, 1000ms), but halts immediately on permanent authentication (535) or recipient errors.

### 2. Live Admin Visibility & Status Banners
- **Top Status Banner** on Wizard (Step 3) and Tracking Screen:
  - 🟢 **Green**: Email service connected and active.
  - 🔵 **Blue**: Ethereal test mailbox active with web preview links.
  - 🔴 **Red**: Dry-run mode enabled or SMTP disconnected (with real error diagnosis and setup help).
  - 🟡 **Amber**: Localhost frontend URL warning.
- **Send Guard**: "Send Invites Now" button is disabled whenever email is disconnected or in dry-run mode.
- **Per-Candidate Email Column**: Shows `Emailed`, `Failed`, or `Queued` chips with timestamps and direct Ethereal preview links.
- **Error Diagnosis Tooltips**: Hovering over a `Failed` badge displays the exact human-readable provider diagnosis with an inline `Retry` button.

### 3. Fallbacks for Real-Life Reliability
- **Reset Access & Copy Invite**:
  - If a candidate's email is blocked, spam-filtered, or typo'd, clicking **Copy Invite** generates a fresh temporary password and opens a modal with a pre-written invite message formatted for WhatsApp, Slack, or SMS.
  - Plaintext password is shown only once and is never stored unencrypted in the database.
- **Resend with Account Awareness**:
  - Unregistered / pending candidates receive a rotated temporary password.
  - Candidates who have already logged in receive a friendly reminder email ("Log in with your existing password") without resetting their password.
- **Bulk Reminders**:
  - One-click **"Remind Unstarted"** button at the top of the tracking table emails all candidates who haven't begun.
  - Throttled to a minimum interval of 1 hour per candidate to prevent spamming.
- **Unassign Candidate**:
  - Administrators can remove an unstarted candidate from the cohort, automatically cancelling their pending assessment.
- **Candidate Activity Timeline**:
  - Clicking the timeline icon opens an audit drawer showing chronological events (staged, invite sent, password reset, first login, consent, started, submitted).
- **Temporary Password Expiration**:
  - Temporary passwords expire after 48 hours (`tempPasswordExpiresAt`). Expired attempts receive HTTP 403 with guidance to contact their administrator.
- **Persistent Account Lockout**:
  - 5 consecutive failed login attempts within 15 minutes temporarily lock the account.
  - Persisted in MongoDB with a 15-minute TTL index (`login_attempt_schema.js`) so lockouts survive server restarts.

---

## Deliverability & Technical Boundaries

1. **Custom Domain Inboxes**: Delivering to external candidate inboxes (Gmail, Yahoo, Outlook) from a custom domain requires configuring your domain's DNS with **SPF** (`v=spf1 include:...`), **DKIM**, and **DMARC** records to avoid spam classification.
2. **Post-Acceptance Bounces**: When an SMTP server accepts a message (HTTP 250 OK) but subsequently bounces it (e.g. invalid recipient inbox), detecting the bounce requires provider webhooks (e.g. Resend / SendGrid Webhooks), which is beyond the scope of direct SMTP.
