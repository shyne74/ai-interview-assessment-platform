# Changes and Hardening Summary

## Overview
This document summarizes the comprehensive security, architectural, and user-experience hardening implemented across the AI Interview Platform across all 6 phases.

---

### Phase 1: Exam Locking After Submission
- **Database Schema Upgrades**:
  - Added explicit session states: `["pending", "in-progress", "submitted", "evaluated", "completed", "abandoned"]` to both `Interview` (`server/models/interview_schema.js`) and `AdaptiveInterview` (`server/models/adaptive_interview_schema.js`).
  - Added server-authoritative fields: `startedAt`, `durationSeconds`, `submittedAt`, `evaluatedAt`, and `autoSubmittedReason`.
- **Server Enforcement**:
  - Updated `server/controller/interviewer.js` and `server/controller/adaptive_controller.js` to reject any answer submission or modifications on sessions that are not `in-progress` (HTTP 400/409).
  - Implemented server-authoritative time expiry: if `(now - startedAt) > durationSeconds`, the session is immediately auto-submitted.
  - Implemented double-submit idempotency: submitting an already evaluated session returns the existing evaluation immediately with HTTP 200 without calling the AI service again.
- **Client Route & History Guard**:
  - Replaced browser history state upon exam submission (`history.replaceState`) and redirected candidates to `/results/:id`.
  - Added session status check on load to prevent re-opening submitted exams in an editable view.

---

### Phase 2: Exam Window Lock & Proctored Environment
- **Fullscreen User-Gesture Requirement**:
  - Built proctored start gate modal in `Interview.jsx` and `AdaptiveInterview.jsx`. Questions remain locked until candidate clicks *"Start Exam in Fullscreen"*.
- **Violation Tracking**:
  - Created reusable custom hook `client/src/hooks/useExamIntegrity.js`.
  - Captures and logs: `document.visibilitychange` (hidden), `window blur`, `fullscreenchange` (exited), and keyboard shortcuts (`F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`).
  - Configurable violation threshold (`MAX_INTEGRITY_VIOLATIONS = 2` in `server/config/integrity_config.js`).
  - First violation displays prominent red warning modal.
  - Second violation triggers immediate server auto-submission with reason `"auto-submitted: integrity violation"`.
- **Client Heartbeats & Abandonment**:
  - Client sends periodic heartbeat pings every 15 seconds to `/:id/heartbeat`.
  - Backend tracks `lastHeartbeatAt` and marks abandoned sessions past the grace timeout.
- **Browser Limits Disclosure**:
  - Documented realistic browser API boundaries (in code comments and `README.md`): standard web browsers cannot block physical second phones or OS-level `Alt+Tab`. The system captures behavioral telemetry for audit trails.

---

### Phase 3: Anti-Copy & AI-Assistance Detection
- **Input Telemetry & Paste Interception**:
  - Disabled direct paste in answer textareas and code editors (`onPaste preventDefault`).
  - Recorded attempted paste lengths and copy/cut events.
  - Tracked keystroke telemetry: count of keystrokes, total characters typed, typing duration, and largest single character insert delta.
- **Integrity Analysis Service (`server/services/integrity.js`)**:
  - Implemented algorithmic inspection of candidate responses:
    - Keystroke-to-character ratio.
    - Characters per second (flagging superhuman typing speeds > 20 chars/sec).
    - AI formatting artifacts (markdown headers `###`, bold bullet patterns, and boilerplate clichés).
    - Jaccard textual overlap with reference answers.
  - Assigns a multi-factor `riskLevel` (`low`, `medium`, `high`) with explanatory evidence items.
- **Admin Review Panel (`client/src/pages/adminResults.jsx`)**:
  - Integrated dedicated Integrity & Telemetry Report panel in the submission modal.
  - Displays risk badges, paste counts, typing speeds, and flagged evidence for manual reviewer discretion without altering scores automatically.

---

### Phase 4: Candidate Role Security & Admin UI Isolation
- **Client Navigation Guarding**:
  - Hidden entire `ADMINISTRATION` sidebar navigation (Question Bank, AI Generator, Codeforces, Candidates, Results) when `user.role === "candidate"`.
  - Built `client/src/components/AdminRoute.jsx` and wrapped all admin routes in `client/src/App.jsx`. Non-admin users attempting direct URL access are redirected to `/dashboard`.
- **Backend API Authorization**:
  - Hardened `server/middleware/authmiddleware.js` (`authorize("admin")`) to strictly return `403 Forbidden` for candidates attempting to query admin endpoints.

---

### Phase 5: Question Bank Unification & Taxonomy
- **Canonical Taxonomy Specification (`server/config/taxonomy.js` & `client/src/config/taxonomy.js`)**:
  - Defined 10 fixed roles and alias dictionaries.
  - Controlled 4–5 non-overlapping domains per role.
  - Resolved multi-topic comma strings and misclassified items (e.g. React under DevOps, Algorithms (112) under Coding).
- **Migration CLI (`server/scripts/migrate_taxonomy.js`)**:
  - Supports `--dry-run` (default) to preview planned renames and merges without touching data.
  - Supports `--apply` to update MongoDB records and merge identical questions (preserving the record with the most complete `idealAnswer`).
  - Generates JSON audit report file (`taxonomy_migration_report.json`).
- **Question Bank UI (`client/src/pages/questionbank.jsx`)**:
  - Renders canonical folder tree.
  - Filters out empty folders.
  - Displays warning badges (`⚠️ < 3 Qs`) on understocked folders with fewer than 3 questions.
- **Data Validation**:
  - Integrated canonical taxonomy sanitization in question creation and AI generator endpoints.

---

### Phase 6: AI Proctoring (Decommissioned)
- **Webcam AI Proctoring Removed**:
  - Removed all webcam streaming, facial presence heuristics, and camera permission gates from both standard interviews (`Interview.jsx`) and adaptive exams (`AdaptiveInterview.jsx`).
  - Deleted `client/src/components/AIProctoringView.jsx`.
  - Non-invasive browser exam integrity protections remain fully operational: fullscreen window locks, blur/tab-switch detection, paste interception, keystroke telemetry, and anti-cheat audit reporting.
