# AI Interview Platform - Production Hardened Edition

A modern, full-stack AI technical interview and assessment platform featuring **server-authoritative exam locking**, **proctored exam monitoring**, **multi-signal anti-cheat/integrity telemetry**, **strict role-based access control**, and **canonical question bank taxonomy**.

---

## 🏗️ Architecture Overview

The platform consists of three core decoupled services:

1. **Client**: React 18 SPA built with Vite and modern CSS/Bootstrap.
2. **Server**: Node.js & Express REST API with MongoDB (Mongoose ODM).
3. **AI Evaluation Service**: Python FastAPI microservice utilizing Groq API (`llama-3.3-70b-versatile`) for technical evaluation, code testing, and question generation.

```
       ┌────────────────┐
       │  React Client  │ (Vite :5173)
       └───────┬────────┘
               │  REST API / Auth (JWT) / Heartbeats & Violations
       ┌───────▼────────┐
       │ Express Server │ (Node.js :5000)
       └───────┬────────┘
               │  Mongoose ODM
       ┌───────┴────────┐            ┌───────────────────────────┐
       │ MongoDB DB     │            │ Python FastAPI Microservice│
       └────────────────┘            │ (Groq LLM Engine :8000)   │
                                     └───────────────────────────┘
```

---

## 🔐 Security & Exam Integrity (Phases 1 - 3)

### 1. Exam Locking After Submission (Phase 1)
- **Strict State Lifecycle**: Exam sessions transition through `pending` → `in-progress` → `submitted` → `evaluated`.
- **Server-Authoritative Timer**: `startedAt` and `durationSeconds` are locked on the database session. Any late answer submissions or expired timers trigger immediate auto-submission.
- **Back-Button & Navigation Guard**: Browser history replaces active exam state (`history.replaceState`), preventing answer editing after completion.
- **Double Submission Idempotency**: Repeated submission calls return HTTP 200 with the cached evaluation payload, preventing duplicate AI Groq charges.

### 2. Proctored Exam Window & Heartbeat (Phase 2)
- **Fullscreen User-Gesture Gate**: Candidates must explicitly click *"Start Exam in Fullscreen"* before questions are unlocked.
- **Violation Tracking**: Active monitoring of `visibilitychange` (hidden), `window blur`, exiting fullscreen, and developer shortcuts (`F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`).
- **Configurable Violation Policy**:
  - Violation 1: Red warning modal alert requiring the candidate to resume fullscreen.
  - Violation 2 (default threshold): Immediate server auto-submission marked as `"auto-submitted: integrity violation"`.
- **Client Heartbeat**: The client pings the server every 15 seconds. Sessions with heartbeats missing past the grace timeout (45s) are marked abandoned and auto-submitted.

> [!NOTE]
> **Honest Integrity Limits in Browser Environments**:
> Standard browser web APIs cannot technically block OS-level window management (`Alt+Tab`), multiple physical monitors, or secondary physical devices (such as smartphones). The platform uses multi-layered behavioral detection to log evidence and flag suspicious submissions for human review. For high-stakes institutional testing requiring strict OS lockdown, a desktop wrapper (such as an Electron kiosk shell or Safe Exam Browser) should be deployed.

### 3. Anti-Copy & AI-Assistance Telemetry (Phase 3)
- **Paste Prevention & Keystroke Tracking**: Client intercepts paste attempts (`onPaste preventDefault`) and logs attempted paste lengths. Keystroke telemetry measures character deltas and typing duration.
- **Multi-Signal Integrity Report**: Every answer is scored across:
  - Keystroke-to-character ratio (< 0.5 flagged).
  - Typing speed anomalies (> 20 chars/second or 1200+ WPM flagged).
  - Markdown headings or LLM structured bullet formatting in plain-text answers.
  - Jaccard textual overlap with reference answers.
- **Admin Review Panel**: High-risk answers are flagged in red for administrative inspection without automatically zeroing the candidate's score.

### 4. Role-Based Access Control (Phase 4)
- Candidate accounts cannot see or access the `ADMINISTRATION` sidebar navigation (Question Bank, AI Generator, Codeforces, Results, Candidate Data).
- Express middleware (`authorize("admin")`) returns `403 Forbidden` on all administrative API endpoints. Client-side route guards (`<AdminRoute>`) redirect candidates trying to navigate to admin URLs directly.

---

## 🗂️ Question Bank Taxonomy & Migration (Phase 5)

The platform unifies questions under a centralized canonical taxonomy (`server/config/taxonomy.js` & `client/src/config/taxonomy.js`) consisting of 10 primary roles:
1. Backend Developer
2. Frontend Developer
3. Full Stack Developer
4. Software Engineer
5. DevOps Engineer
6. Cloud Engineer
7. AI/ML Engineer
8. System Architect
9. Philosophy
10. Psychology

Each role has a controlled, non-overlapping list of 4–5 sub-domains.

### Taxonomy Migration CLI
Run the migration script to normalize legacy question categories and deduplicate identical questions:

```bash
# 1. Preview planned folder normalizations and duplicate merges (Safe Dry-Run)
node scripts/migrate_taxonomy.js

# 2. Apply migrations to live MongoDB database and output report
node scripts/migrate_taxonomy.js --apply
```

---

## 🚀 Environment Variables & Quickstart

### 1. Server Environment (`server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_interview_app_database
JWT_SECRET=your_secure_jwt_secret_here
FASTAPI_URL=http://127.0.0.1:8000
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 2. Run Tests
The server test suite uses Node.js's native test runner (`node --test`):

```bash
cd server
npm test
```

### 3. Build & Run Client
```bash
cd client
npm install
npm run build
npm run dev
```

### 4. Run Python FastAPI Evaluation Service
```bash
cd server
python -m uvicorn main:app --reload --port 8000
```
