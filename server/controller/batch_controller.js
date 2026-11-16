const Batch = require("../models/batch_schema");
const Interview = require("../models/interview_schema");
const User = require("../models/user_schema");
const Question = require("../models/question_schema");
const bcrypt = require("bcryptjs");
const {
    MAIL_PROVIDER,
    MAIL_DRY_RUN,
    MAIL_FROM,
    FRONTEND_URL,
    verifyConnection,
    sendAssessmentInvite,
    sendTestMail
} = require("../services/email_service");
const { generateSecureTempPassword } = require("../services/security_service");

/**
 * Helper to shuffle an array (Fisher-Yates)
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Fetch questions matching role, domain, difficulty, type
 */
async function selectQuestionsForCandidate({ role, domain, difficulty, assessmentType, limit, uniqueSeed = 0 }) {
    const totalRequired = Math.max(1, Number(limit) || 5);
    const roleRegex = new RegExp(role || "Software", "i");
    const domainRegex = domain ? new RegExp(domain.trim(), "i") : null;

    const baseQuery = { status: "approved" };
    if (roleRegex) baseQuery.role = { $regex: roleRegex };
    if (domainRegex) baseQuery.domain = { $regex: domainRegex };
    if (difficulty && difficulty !== "all") baseQuery.difficulty = difficulty;

    if (assessmentType === "coding") {
        baseQuery.$or = [
            { type: "coding" },
            { assessmentType: "coding" },
            { "codingData.contestId": { $exists: true } }
        ];
    } else if (assessmentType === "theory") {
        baseQuery.$or = [
            { type: "technical" },
            { assessmentType: "theory" },
            { assessmentType: { $exists: false } }
        ];
    }

    let candidateQuestions = await Question.find(baseQuery);

    if (candidateQuestions.length < totalRequired) {
        const fallbackQuery = { status: "approved" };
        if (roleRegex) fallbackQuery.role = { $regex: roleRegex };
        const fallbackPool = await Question.find(fallbackQuery);
        const existingIds = new Set(candidateQuestions.map(q => q._id.toString()));
        for (const q of fallbackPool) {
            if (!existingIds.has(q._id.toString())) {
                candidateQuestions.push(q);
                existingIds.add(q._id.toString());
            }
            if (candidateQuestions.length >= totalRequired * 2) break;
        }
    }

    if (!candidateQuestions.length) {
        candidateQuestions = await Question.find({ status: "approved" }).limit(totalRequired * 3);
    }

    const shuffled = shuffleArray(candidateQuestions);
    return shuffled.slice(0, totalRequired);
}

/**
 * Email status & health check endpoint
 */
exports.getMailStatus = async function(req, res) {
    try {
        const health = await verifyConnection();
        return res.status(200).json({
            provider: MAIL_PROVIDER,
            dryRun: MAIL_DRY_RUN,
            connected: health.connected,
            from: MAIL_FROM,
            frontendUrl: FRONTEND_URL,
            frontendUrlIsLocalhost: FRONTEND_URL.includes("localhost") || FRONTEND_URL.includes("127.0.0.1"),
            lastError: health.lastError,
            lastCheckedAt: health.lastCheckedAt
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * Send real test email endpoint
 */
exports.sendTestMailEndpoint = async function(req, res) {
    try {
        const { targetEmail } = req.body;
        const emailToTest = targetEmail || req.user?.email;
        if (!emailToTest) {
            return res.status(400).json({ success: false, error: "Recipient email is required." });
        }

        const result = await sendTestMail(emailToTest);
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * 1. Create a draft or new batch
 */
exports.createBatch = async function(req, res) {
    try {
        const {
            name,
            organizationName = "AssessAI",
            opensAt,
            closesAt,
            defaultDurationSeconds = 1800,
            uniqueQuestions = true,
            restrictToAssigned = true,
            candidates = []
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Batch name is required." });
        }

        const batch = await Batch.create({
            name: name.trim(),
            organizationName: organizationName.trim(),
            createdBy: req.user._id,
            opensAt: opensAt ? new Date(opensAt) : null,
            closesAt: closesAt ? new Date(closesAt) : null,
            defaultDurationSeconds: Number(defaultDurationSeconds) || 1800,
            uniqueQuestions: Boolean(uniqueQuestions),
            restrictToAssigned: Boolean(restrictToAssigned),
            status: "draft",
            candidates: candidates.map(c => {
                const r = (c.roleTitle || c.role || "Software Engineer").trim();
                return {
                    name: (c.name || "").trim(),
                    email: (c.email || "").trim().toLowerCase(),
                    role: r,
                    roleTitle: r,
                    domain: (c.domain || "Fullstack").trim(),
                    assessmentType: c.assessmentType || "theory",
                    difficulty: c.difficulty || "medium",
                    totalQuestions: Number(c.totalQuestions) || Number(c.limit) || 5,
                    limit: Number(c.totalQuestions) || Number(c.limit) || 5,
                    durationSeconds: Number(c.durationSeconds) || Number(defaultDurationSeconds) || 1800,
                    inviteStatus: "queued",
                    timeline: [{
                        event: "created",
                        details: "Added to examination batch"
                    }]
                };
            })
        });

        return res.status(201).json({
            message: "Batch created successfully.",
            batch
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * 2. List all batches with summary counts
 */
exports.listBatches = async function(req, res) {
    try {
        const batches = await Batch.find().sort({ createdAt: -1 });

        const batchIds = batches.map(b => b._id);
        const interviews = await Interview.find({ batchId: { $in: batchIds } })
            .select("batchId status score totalScore isEvaluated inviteStatus startedAt submittedAt");

        const interviewMap = {};
        interviews.forEach(inv => {
            const bId = inv.batchId.toString();
            if (!interviewMap[bId]) interviewMap[bId] = [];
            interviewMap[bId].push(inv);
        });

        const list = batches.map(batch => {
            const bInterviews = interviewMap[batch._id.toString()] || [];
            const totalCandidates = batch.candidates.length;
            const completed = bInterviews.filter(i => i.status === "completed" || i.status === "submitted" || i.status === "evaluated");
            const inProgress = bInterviews.filter(i => i.status === "in-progress");
            const pending = bInterviews.filter(i => i.status === "pending");
            const invited = batch.candidates.filter(c => c.inviteStatus === "emailed" || c.inviteStatus === "sent").length;

            const scores = completed
                .filter(i => i.isEvaluated && typeof i.score === "number")
                .map(i => (i.totalScore > 0 ? (i.score / i.totalScore) * 100 : i.score));

            const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

            return {
                _id: batch._id,
                name: batch.name,
                organizationName: batch.organizationName,
                opensAt: batch.opensAt,
                closesAt: batch.closesAt,
                status: batch.status,
                uniqueQuestions: batch.uniqueQuestions,
                restrictToAssigned: batch.restrictToAssigned,
                createdAt: batch.createdAt,
                stats: {
                    total: totalCandidates,
                    invited,
                    pending: pending.length,
                    inProgress: inProgress.length,
                    completed: completed.length,
                    avgScore
                }
            };
        });

        return res.status(200).json({ batches: list });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * 3. Get single batch details with candidate tracking & interview status
 */
exports.getBatchById = async function(req, res) {
    try {
        const { id } = req.params;
        const batch = await Batch.findById(id).populate("createdBy", "username email");
        if (!batch) {
            return res.status(404).json({ message: "Batch not found." });
        }

        const interviews = await Interview.find({ batchId: batch._id })
            .populate("candidateId", "username email mustChangePassword proctoringConsentAt tempPasswordExpiresAt");

        const interviewMap = {};
        interviews.forEach(inv => {
            interviewMap[inv._id.toString()] = inv;
            if (inv.candidateId && inv.candidateId.email) {
                interviewMap[inv.candidateId.email.toLowerCase()] = inv;
            }
        });

        const trackingCandidates = batch.candidates.map(c => {
            const linkedInterview = (c.interviewId && interviewMap[c.interviewId.toString()]) || interviewMap[c.email.toLowerCase()];
            return {
                _id: c._id,
                name: c.name,
                email: c.email,
                role: c.role,
                domain: c.domain,
                assessmentType: c.assessmentType,
                difficulty: c.difficulty,
                totalQuestions: c.totalQuestions,
                durationSeconds: c.durationSeconds,
                inviteStatus: c.inviteStatus,
                emailSentAt: c.emailSentAt,
                emailError: c.emailError,
                previewUrl: c.previewUrl || linkedInterview?.previewUrl || null,
                messageId: c.messageId || null,
                emailAttempts: c.emailAttempts || 0,
                lastRemindedAt: c.lastRemindedAt || null,
                timeline: c.timeline || [],
                interviewId: linkedInterview?._id || c.interviewId || null,
                interviewStatus: linkedInterview?.status || "unassigned",
                startedAt: linkedInterview?.startedAt || null,
                submittedAt: linkedInterview?.submittedAt || null,
                score: linkedInterview?.score ?? null,
                totalScore: linkedInterview?.totalScore ?? null,
                isEvaluated: linkedInterview?.isEvaluated ?? false,
                integrityFlags: {
                    tabSwitches: linkedInterview?.tabSwitchCount || 0,
                    fullscreenExits: linkedInterview?.fullscreenExitCount || 0,
                    copyPastes: linkedInterview?.copyPasteCount || 0,
                    integrityScore: linkedInterview?.integrityScore ?? 100
                },
                userState: {
                    mustChangePassword: linkedInterview?.candidateId?.mustChangePassword ?? null,
                    proctoringConsentAt: linkedInterview?.candidateId?.proctoringConsentAt ?? null,
                    tempPasswordExpiresAt: linkedInterview?.candidateId?.tempPasswordExpiresAt ?? null
                }
            };
        });

        return res.status(200).json({
            batch: {
                _id: batch._id,
                name: batch.name,
                organizationName: batch.organizationName,
                opensAt: batch.opensAt,
                closesAt: batch.closesAt,
                defaultDurationSeconds: batch.defaultDurationSeconds,
                uniqueQuestions: batch.uniqueQuestions,
                restrictToAssigned: batch.restrictToAssigned,
                status: batch.status,
                createdAt: batch.createdAt,
                createdBy: batch.createdBy,
                candidates: trackingCandidates
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * 4. Update batch settings
 */
exports.updateBatch = async function(req, res) {
    try {
        const { id } = req.params;
        const {
            name,
            organizationName,
            opensAt,
            closesAt,
            defaultDurationSeconds,
            uniqueQuestions,
            restrictToAssigned,
            status
        } = req.body;

        const batch = await Batch.findById(id);
        if (!batch) {
            return res.status(404).json({ message: "Batch not found." });
        }

        if (name) batch.name = name.trim();
        if (organizationName) batch.organizationName = organizationName.trim();
        if (opensAt !== undefined) batch.opensAt = opensAt ? new Date(opensAt) : null;
        if (closesAt !== undefined) batch.closesAt = closesAt ? new Date(closesAt) : null;
        if (defaultDurationSeconds) batch.defaultDurationSeconds = Number(defaultDurationSeconds);
        if (uniqueQuestions !== undefined) batch.uniqueQuestions = Boolean(uniqueQuestions);
        if (restrictToAssigned !== undefined) batch.restrictToAssigned = Boolean(restrictToAssigned);
        if (status) batch.status = status;

        await batch.save();

        if (opensAt !== undefined || closesAt !== undefined) {
            const updateFields = {};
            if (opensAt !== undefined) updateFields.opensAt = batch.opensAt;
            if (closesAt !== undefined) updateFields.closesAt = batch.closesAt;
            await Interview.updateMany(
                { batchId: batch._id, status: "pending" },
                { $set: updateFields }
            );
        }

        return res.status(200).json({ message: "Batch updated successfully.", batch });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * 5. Validate & Preview candidates before saving/sending
 */
exports.validateCandidates = async function(req, res) {
    try {
        const { candidates = [] } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const results = [];
        let newCount = 0;
        let existingCount = 0;
        let invalidCount = 0;

        for (const item of candidates) {
            const email = (item.email || "").trim().toLowerCase();
            const name = (item.name || "").trim();
            const isValid = emailRegex.test(email) && name.length > 0;

            if (!isValid) {
                invalidCount++;
                results.push({
                    name,
                    email,
                    valid: false,
                    reason: !name ? "Name required" : "Invalid email format"
                });
                continue;
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                existingCount++;
                results.push({
                    name,
                    email,
                    valid: true,
                    isExistingAccount: true,
                    role: item.role || existingUser.preferredRole || "Software Engineer",
                    domain: item.domain || "Fullstack"
                });
            } else {
                newCount++;
                results.push({
                    name,
                    email,
                    valid: true,
                    isExistingAccount: false,
                    role: item.role || "Software Engineer",
                    domain: item.domain || "Fullstack"
                });
            }
        }

        return res.status(200).json({
            total: candidates.length,
            validCount: newCount + existingCount,
            newCount,
            existingCount,
            invalidCount,
            candidates: results
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * 6. Dispatch invites: Creates accounts, generates tests, emails candidates
 */
exports.dispatchBatchInvites = async function(req, res) {
    try {
        const { id } = req.params;
        const { testEmail, candidates: incomingCandidates, forceResend } = req.body;

        const batch = await Batch.findById(id);
        if (!batch) {
            return res.status(404).json({ message: "Batch not found." });
        }

        // Production guard check
        if (process.env.NODE_ENV === "production") {
            if (MAIL_DRY_RUN) {
                return res.status(400).json({
                    message: "Cannot send invites: MAIL_DRY_RUN is enabled in production environment."
                });
            }
            const health = await verifyConnection();
            if (!health.connected) {
                return res.status(400).json({
                    message: `Cannot send invites: Email service is not connected (${health.lastError || "Unknown error"}).`
                });
            }
            if (FRONTEND_URL.includes("localhost") || FRONTEND_URL.includes("127.0.0.1")) {
                return res.status(400).json({
                    message: "Cannot send invites: FRONTEND_URL is set to localhost in production."
                });
            }
        }

        // If candidates are passed in payload, save or merge them into batch
        if (Array.isArray(incomingCandidates) && incomingCandidates.length > 0) {
            batch.candidates = incomingCandidates.map(c => {
                const r = (c.roleTitle || c.role || "Software Engineer").trim();
                return {
                    name: (c.name || "").trim(),
                    email: (c.email || "").trim().toLowerCase(),
                    role: r,
                    roleTitle: r,
                    domain: (c.domain || "Fullstack").trim(),
                    assessmentType: c.assessmentType || "theory",
                    difficulty: c.difficulty || "medium",
                    totalQuestions: Number(c.totalQuestions) || Number(c.limit) || 5,
                    limit: Number(c.totalQuestions) || Number(c.limit) || 5,
                    durationSeconds: Number(c.durationSeconds) || batch.defaultDurationSeconds || 1800,
                    inviteStatus: c.inviteStatus || "queued",
                    timeline: c.timeline || [{ event: "created", details: "Candidate staged in batch" }]
                };
            });
            await batch.save();
        }

        // TEST EMAIL MODE: Send a single sample invite to test address
        if (testEmail) {
            const cleanTestEmail = testEmail.trim().toLowerCase();
            const sampleCandidate = batch.candidates[0] || {
                name: "Test Candidate",
                role: "Software Engineer",
                domain: "Fullstack",
                durationSeconds: batch.defaultDurationSeconds || 1800
            };

            const testResult = await sendAssessmentInvite({
                candidateEmail: cleanTestEmail,
                candidateName: req.user?.username || "Admin Tester",
                testName: sampleCandidate.role,
                assessmentRole: sampleCandidate.role,
                assessmentDomain: sampleCandidate.domain,
                temporaryPassword: "SampleTempPassword123!",
                loginUrl: `${FRONTEND_URL}/login?email=${encodeURIComponent(cleanTestEmail)}`,
                durationMinutes: Math.round((sampleCandidate.durationSeconds || 1800) / 60),
                opensAt: batch.opensAt,
                closesAt: batch.closesAt,
                organizationName: batch.organizationName
            });

            return res.status(200).json({
                message: testResult.success ? `Test invitation email sent to ${cleanTestEmail}` : `Failed to send test email: ${testResult.error}`,
                testResult
            });
        }

        // FULL BATCH DISPATCH
        batch.status = "active";
        batch.sentAt = new Date();
        const results = [];

        for (let i = 0; i < batch.candidates.length; i++) {
            const cand = batch.candidates[i];
            const cleanEmail = cand.email.trim().toLowerCase();
            const cleanName = cand.name.trim();

            // Idempotency check: Skip if already successfully emailed unless forceResend is requested
            if ((cand.inviteStatus === "emailed" || cand.inviteStatus === "sent") && !forceResend) {
                results.push({
                    name: cleanName,
                    email: cleanEmail,
                    status: "already_sent",
                    skipped: true,
                    previewUrl: cand.previewUrl || null
                });
                continue;
            }

            try {
                // 1. Check or create User
                let user = await User.findOne({ email: cleanEmail });
                let generatedPassword = null;

                if (!user) {
                    generatedPassword = generateSecureTempPassword();
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

                    user = await User.create({
                        username: cleanName,
                        email: cleanEmail,
                        password: hashedPassword,
                        role: "user",
                        preferredRole: cand.role,
                        mustChangePassword: true,
                        tempPasswordExpiresAt: new Date(Date.now() + 48 * 3600 * 1000), // 48-hour temporary credential validity
                        invitedBy: req.user._id,
                        batchIds: [batch._id]
                    });
                } else {
                    if (!user.batchIds) user.batchIds = [];
                    if (!user.batchIds.includes(batch._id)) {
                        user.batchIds.push(batch._id);
                    }
                    // If user was created by invitation and still must change password, ensure temp expiry exists
                    if (user.mustChangePassword && !user.tempPasswordExpiresAt) {
                        user.tempPasswordExpiresAt = new Date(Date.now() + 48 * 3600 * 1000);
                    }
                    await user.save();
                }

                const candRole = cand.roleTitle || cand.role || "Software Engineer";
                const candDomain = cand.domain || "Fullstack";
                const candDuration = cand.durationSeconds || batch.defaultDurationSeconds || 1800;
                const candQuestions = cand.totalQuestions || cand.limit || 5;

                // 2. Select questions
                const selectedQuestions = await selectQuestionsForCandidate({
                    role: candRole,
                    domain: candDomain,
                    difficulty: cand.difficulty || "medium",
                    assessmentType: cand.assessmentType || "theory",
                    limit: candQuestions,
                    uniqueSeed: i
                });

                const responses = selectedQuestions.map(q => ({
                    questionId: q._id,
                    questionText: q.questionText,
                    userAnswer: ""
                }));

                // 3. Create or reuse Interview
                let interview = null;
                if (cand.interviewId) {
                    interview = await Interview.findById(cand.interviewId);
                }

                if (!interview || interview.status !== "pending") {
                    interview = await Interview.create({
                        candidateId: user._id,
                        roleTitle: candRole,
                        domain: candDomain,
                        assessmentType: cand.assessmentType || "theory",
                        difficulty: cand.difficulty || "medium",
                        durationSeconds: candDuration,
                        batchId: batch._id,
                        opensAt: batch.opensAt,
                        closesAt: batch.closesAt,
                        status: "pending",
                        responses,
                        inviteStatus: "queued"
                    });
                    cand.interviewId = interview._id;
                }

                // 4. Send Email
                const emailResult = await sendAssessmentInvite({
                    candidateEmail: cleanEmail,
                    candidateName: cleanName,
                    testName: candRole,
                    roleTitle: candRole,
                    assessmentRole: candRole,
                    assessmentDomain: candDomain,
                    temporaryPassword: generatedPassword, // null if user already had account
                    isExistingAccount: !generatedPassword,
                    loginUrl: `${FRONTEND_URL}/login?email=${encodeURIComponent(cleanEmail)}`,
                    durationMinutes: Math.round(candDuration / 60),
                    opensAt: batch.opensAt,
                    closesAt: batch.closesAt,
                    organizationName: batch.organizationName
                });

                cand.emailAttempts = (cand.emailAttempts || 0) + 1;
                if (!cand.timeline) cand.timeline = [];

                if (emailResult.success) {
                    cand.inviteStatus = "emailed";
                    cand.emailSentAt = new Date();
                    cand.emailError = "";
                    cand.messageId = emailResult.messageId || "";
                    cand.previewUrl = emailResult.previewUrl || "";
                    cand.timeline.push({
                        event: "invite_sent",
                        details: `Dispatched via ${MAIL_PROVIDER}` + (emailResult.previewUrl ? ` - Preview: ${emailResult.previewUrl}` : "")
                    });

                    interview.inviteStatus = "emailed";
                    interview.emailSentAt = new Date();
                    interview.emailError = "";
                    interview.messageId = cand.messageId;
                    interview.previewUrl = cand.previewUrl;
                    await interview.save();
                } else {
                    cand.inviteStatus = "email_failed";
                    cand.emailError = emailResult.error || "Failed to dispatch email";
                    cand.timeline.push({
                        event: "invite_failed",
                        details: `Delivery failed: ${cand.emailError}`
                    });

                    interview.inviteStatus = "email_failed";
                    interview.emailError = cand.emailError;
                    await interview.save();
                }

                results.push({
                    name: cleanName,
                    email: cleanEmail,
                    status: cand.inviteStatus,
                    interviewId: interview._id,
                    isExistingAccount: !generatedPassword,
                    previewUrl: cand.previewUrl || null,
                    error: cand.emailError || null
                });

                // Small delay between sends to respect rate limits
                if (i < batch.candidates.length - 1) {
                    await new Promise(r => setTimeout(r, 150));
                }
            } catch (err) {
                cand.inviteStatus = "email_failed";
                cand.emailError = err.message;
                if (!cand.timeline) cand.timeline = [];
                cand.timeline.push({
                    event: "invite_failed",
                    details: `System error: ${err.message}`
                });
                results.push({
                    name: cleanName,
                    email: cleanEmail,
                    status: "email_failed",
                    error: err.message
                });
            }
        }

        await batch.save();

        const sentCount = results.filter(r => r.status === "emailed" || r.status === "sent").length;
        const failedCount = results.filter(r => r.status === "email_failed" || r.status === "failed").length;

        return res.status(200).json({
            message: `Dispatch complete. Sent: ${sentCount}, Failed: ${failedCount}.`,
            sentCount,
            failedCount,
            results
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * 7. Copy Invite Credentials (modal fallback when email fails or for manual dispatch)
 */
exports.copyInviteCredentials = async function(req, res) {
    try {
        const { id, candidateEmail } = req.params;
        const batch = await Batch.findById(id);
        if (!batch) return res.status(404).json({ message: "Batch not found." });

        const cand = batch.candidates.find(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
        if (!cand) return res.status(404).json({ message: "Candidate not found in batch." });

        let user = await User.findOne({ email: cand.email });
        const newTempPassword = generateSecureTempPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newTempPassword, salt);

        if (!user) {
            user = await User.create({
                username: cand.name,
                email: cand.email,
                password: hashedPassword,
                role: "user",
                preferredRole: cand.role,
                mustChangePassword: true,
                tempPasswordExpiresAt: new Date(Date.now() + 48 * 3600 * 1000),
                invitedBy: req.user._id,
                batchIds: [batch._id]
            });
        } else {
            user.password = hashedPassword;
            user.mustChangePassword = true;
            user.tempPasswordExpiresAt = new Date(Date.now() + 48 * 3600 * 1000);
            await user.save();
        }

        if (!cand.timeline) cand.timeline = [];
        cand.timeline.push({
            event: "password_reset",
            details: "Generated new credentials for manual invitation copy."
        });
        await batch.save();

        const loginUrl = `${FRONTEND_URL}/login?email=${encodeURIComponent(cand.email)}`;
        const opensStr = batch.opensAt ? new Date(batch.opensAt).toLocaleString() : "Immediately";
        const closesStr = batch.closesAt ? new Date(batch.closesAt).toLocaleString() : "No expiration specified";
        const durationMin = Math.round((cand.durationSeconds || batch.defaultDurationSeconds || 1800) / 60);

        const formattedMessage = `Hello ${cand.name},

You have been invited by ${batch.organizationName} to complete the technical assessment: ${cand.role}.

ASSESSMENT DETAILS:
- Role: ${cand.role}
- Duration: ${durationMin} minutes
- Opens: ${opensStr}
- Closes: ${closesStr}

LOGIN CREDENTIALS:
Email: ${cand.email}
Temporary Password: ${newTempPassword}

LOGIN LINK:
${loginUrl}

Note: You will be prompted to set a new password upon first login.`;

        return res.status(200).json({
            name: cand.name,
            email: cand.email,
            tempPassword: newTempPassword,
            loginUrl,
            role: cand.role,
            durationMinutes: durationMin,
            opensAt: batch.opensAt,
            closesAt: batch.closesAt,
            formattedMessage
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * 8. Resend invite email to a specific candidate
 * If candidate hasn't logged in: generates fresh temp password and sends invite.
 * If candidate has already logged in / set password: sends reminder email without password.
 */
exports.resendCandidateInvite = async function(req, res) {
    try {
        const { id, candidateEmail } = req.params;
        const batch = await Batch.findById(id);
        if (!batch) {
            return res.status(404).json({ message: "Batch not found." });
        }

        const candidate = batch.candidates.find(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found in this batch." });
        }

        const user = await User.findOne({ email: candidate.email.toLowerCase().trim() });
        let generatedPassword = null;
        const hasLoggedIn = user && (!user.mustChangePassword || candidate.inviteStatus === "logged_in");

        if (!hasLoggedIn && user) {
            generatedPassword = generateSecureTempPassword();
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(generatedPassword, salt);
            user.mustChangePassword = true;
            user.tempPasswordExpiresAt = new Date(Date.now() + 48 * 3600 * 1000);
            await user.save();
        }

        const emailResult = await sendAssessmentInvite({
            candidateEmail: candidate.email,
            candidateName: candidate.name,
            testName: candidate.role,
            roleTitle: candidate.role,
            assessmentRole: candidate.role,
            assessmentDomain: candidate.domain,
            temporaryPassword: generatedPassword,
            isExistingAccount: hasLoggedIn,
            isReminder: hasLoggedIn,
            loginUrl: `${FRONTEND_URL}/login?email=${encodeURIComponent(candidate.email)}`,
            durationMinutes: Math.round(candidate.durationSeconds / 60),
            opensAt: batch.opensAt,
            closesAt: batch.closesAt,
            organizationName: batch.organizationName
        });

        candidate.emailAttempts = (candidate.emailAttempts || 0) + 1;
        if (!candidate.timeline) candidate.timeline = [];

        if (emailResult.success) {
            candidate.inviteStatus = "emailed";
            candidate.emailSentAt = new Date();
            candidate.emailError = "";
            candidate.messageId = emailResult.messageId || "";
            candidate.previewUrl = emailResult.previewUrl || "";
            candidate.timeline.push({
                event: "resent",
                details: `Invitation resent via ${MAIL_PROVIDER}` + (emailResult.previewUrl ? ` - Preview: ${emailResult.previewUrl}` : "")
            });
            await batch.save();
            return res.status(200).json({
                message: `Invite resent to ${candidate.email}`,
                previewUrl: candidate.previewUrl
            });
        } else {
            candidate.inviteStatus = "email_failed";
            candidate.emailError = emailResult.error || "Delivery failed";
            candidate.timeline.push({
                event: "invite_failed",
                details: `Resend failed: ${candidate.emailError}`
            });
            await batch.save();
            return res.status(500).json({ message: `Failed to resend invite: ${emailResult.error}` });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * 9. Bulk reminder: "Remind everyone who hasn't started"
 * Respects 1-hour throttle per candidate
 */
exports.remindUnstartedCandidates = async function(req, res) {
    try {
        const { id } = req.params;
        const batch = await Batch.findById(id);
        if (!batch) return res.status(404).json({ message: "Batch not found." });

        const interviews = await Interview.find({ batchId: batch._id, status: "pending" });
        const interviewMap = {};
        interviews.forEach(inv => {
            interviewMap[inv._id.toString()] = inv;
        });

        const now = Date.now();
        const ONE_HOUR_MS = 60 * 60 * 1000;
        let remindedCount = 0;
        let skippedCount = 0;

        for (const cand of batch.candidates) {
            const inv = cand.interviewId && interviewMap[cand.interviewId.toString()];
            // Only remind if interview is pending (not in-progress or completed)
            if (!inv) continue;

            if (cand.lastRemindedAt && (now - new Date(cand.lastRemindedAt).getTime() < ONE_HOUR_MS)) {
                skippedCount++;
                continue;
            }

            const emailResult = await sendAssessmentInvite({
                candidateEmail: cand.email,
                candidateName: cand.name,
                testName: cand.role,
                assessmentRole: cand.role,
                assessmentDomain: cand.domain,
                isExistingAccount: true,
                isReminder: true,
                loginUrl: `${FRONTEND_URL}/login?email=${encodeURIComponent(cand.email)}`,
                durationMinutes: Math.round(cand.durationSeconds / 60),
                opensAt: batch.opensAt,
                closesAt: batch.closesAt,
                organizationName: batch.organizationName
            });

            if (emailResult.success) {
                cand.lastRemindedAt = new Date();
                if (!cand.timeline) cand.timeline = [];
                cand.timeline.push({
                    event: "reminder_sent",
                    details: `Reminder dispatched via ${MAIL_PROVIDER}`
                });
                remindedCount++;
            }
        }

        await batch.save();
        return res.status(200).json({
            message: `Sent ${remindedCount} reminder(s). Skipped ${skippedCount} throttled candidate(s).`,
            remindedCount,
            skippedCount
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * 10. Unassign candidate from batch (only before they start)
 */
exports.unassignCandidate = async function(req, res) {
    try {
        const { id, candidateEmail } = req.params;
        const batch = await Batch.findById(id);
        if (!batch) return res.status(404).json({ message: "Batch not found." });

        const candIndex = batch.candidates.findIndex(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
        if (candIndex === -1) {
            return res.status(404).json({ message: "Candidate not found in batch." });
        }

        const cand = batch.candidates[candIndex];
        if (cand.interviewId) {
            const interview = await Interview.findById(cand.interviewId);
            if (interview && interview.status !== "pending") {
                return res.status(400).json({ message: "Cannot remove candidate: assessment has already been started or completed." });
            }
            if (interview) {
                await Interview.findByIdAndDelete(cand.interviewId);
            }
        }

        // Remove candidate from batch
        batch.candidates.splice(candIndex, 1);
        await batch.save();

        return res.status(200).json({ message: `Candidate ${candidateEmail} unassigned from batch.` });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * 11. Close batch
 */
exports.closeBatch = async function(req, res) {
    try {
        const { id } = req.params;
        const batch = await Batch.findById(id);
        if (!batch) return res.status(404).json({ message: "Batch not found." });

        batch.status = "closed";
        await batch.save();

        return res.status(200).json({ message: "Batch closed successfully.", batch });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * 12. Candidate Timeline
 */
exports.getCandidateTimeline = async function(req, res) {
    try {
        const { id, candidateEmail } = req.params;
        const batch = await Batch.findById(id);
        if (!batch) return res.status(404).json({ message: "Batch not found." });

        const cand = batch.candidates.find(c => c.email.toLowerCase() === candidateEmail.toLowerCase());
        if (!cand) return res.status(404).json({ message: "Candidate not found in batch." });

        return res.status(200).json({
            name: cand.name,
            email: cand.email,
            timeline: cand.timeline || []
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * 13. Update candidate's interview (extend deadline or update duration)
 */
exports.updateCandidateInterview = async function(req, res) {
    try {
        const { id, interviewId } = req.params;
        const { closesAt, durationSeconds } = req.body;

        const interview = await Interview.findOne({ _id: interviewId, batchId: id });
        if (!interview) {
            return res.status(404).json({ message: "Candidate interview not found." });
        }

        if (closesAt) interview.closesAt = new Date(closesAt);
        if (durationSeconds) interview.durationSeconds = Number(durationSeconds);
        await interview.save();

        return res.status(200).json({
            message: "Candidate exam window updated.",
            interview
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * 14. Export Batch Results as CSV
 */
exports.exportBatchCsv = async function(req, res) {
    try {
        const { id } = req.params;
        const batch = await Batch.findById(id);
        if (!batch) {
            return res.status(404).json({ message: "Batch not found." });
        }

        const interviews = await Interview.find({ batchId: batch._id })
            .populate("candidateId", "username email");

        const interviewMap = {};
        interviews.forEach(inv => {
            if (inv.candidateId?.email) {
                interviewMap[inv.candidateId.email.toLowerCase()] = inv;
            }
        });

        const headers = [
            "Candidate Name",
            "Email",
            "Role",
            "Domain",
            "Status",
            "Score",
            "Total Score",
            "Percentage",
            "Integrity Score",
            "Tab Switches",
            "Fullscreen Exits",
            "Paste Events",
            "Started At",
            "Submitted At"
        ];

        const rows = batch.candidates.map(c => {
            const inv = interviewMap[c.email.toLowerCase()];
            const pct = inv?.totalScore > 0 ? Math.round((inv.score / inv.totalScore) * 100) : (inv?.score ?? "");
            return [
                `"${c.name.replace(/"/g, '""')}"`,
                `"${c.email.replace(/"/g, '""')}"`,
                `"${(c.role || "").replace(/"/g, '""')}"`,
                `"${(c.domain || "").replace(/"/g, '""')}"`,
                inv?.status || "unassigned",
                inv?.score ?? "",
                inv?.totalScore ?? "",
                pct !== "" ? `${pct}%` : "",
                inv?.integrityScore ?? "",
                inv?.tabSwitchCount ?? 0,
                inv?.fullscreenExitCount ?? 0,
                inv?.copyPasteCount ?? 0,
                inv?.startedAt ? new Date(inv.startedAt).toISOString() : "",
                inv?.submittedAt ? new Date(inv.submittedAt).toISOString() : ""
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\r\n");
        const filename = `${batch.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_results.csv`;

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
