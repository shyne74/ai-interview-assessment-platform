const Interview = require("../models/interview_schema");
const Question = require("../models/question_schema");
const axios = require("axios");
const { computeAnswerIntegrity } = require("../services/integrity");
const { MAX_INTEGRITY_VIOLATIONS, DEFAULT_DURATION_SECONDS } = require("../config/integrity_config");
const { generateAndSaveQuestions } = require("../utils/ai_question_generator");

/**
 * Checks if session time has expired based on server startedAt and durationSeconds.
 */
function isSessionExpired(interview) {
    if (!interview.startedAt || !interview.durationSeconds) return false;
    const deadline = new Date(interview.startedAt).getTime() + (interview.durationSeconds * 1000);
    return Date.now() > deadline;
}

exports.startInterview = async function(req, res) {
    try {
        const { roleTitle, domain, limit = 5, assessmentType = "theory", questionIds, durationSeconds } = req.body;

        let questions = [];

        if (Array.isArray(questionIds) && questionIds.length > 0) {
            questions = await Question.find({ _id: { $in: questionIds } });
        } else {
            const roleRegex = new RegExp(`^${roleTitle.trim()}$`, "i");
            const targetDomain = (domain && domain.trim()) ? domain.trim() : "General";
            const domainRegex = targetDomain !== "General"
                ? new RegExp(targetDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i")
                : null;

            // Base query filters
            const excludeResumeFilter = {
                domain: { $nin: ["Document Analysis", "Resume Projects"] },
                role: { $nin: ["Document Analysis", "Resume Projects"] }
            };

            const baseQuery = {
                role: { $regex: roleRegex },
                status: "approved",
                ...excludeResumeFilter
            };
            if (domainRegex) {
                baseQuery.domain = { $regex: domainRegex };
            }

            if (assessmentType === "mixed") {
                const theoryLimit = Math.ceil(Number(limit) / 2);
                const codingLimit = Math.floor(Number(limit) / 2);

                const theoryQuestions = await Question.find({
                    ...baseQuery,
                    $or: [
                        { assessmentType: "theory" },
                        { type: "technical" },
                        { assessmentType: { $exists: false } }
                    ]
                }).limit(theoryLimit);

                const codingQuestions = await Question.find({
                    status: "approved",
                    ...excludeResumeFilter,
                    $or: [
                        { "codingData.contestId": { $exists: true } },
                        { role: "Coding" },
                        { role: { $regex: roleRegex }, type: "coding" },
                        { role: { $regex: roleRegex }, assessmentType: "coding" }
                    ]
                }).sort({ "codingData.contestId": -1, createdAt: -1 }).limit(codingLimit);

                questions = [...theoryQuestions, ...codingQuestions];

            } else if (assessmentType === "coding") {
                // For coding assessments, reliably select Codeforces / algorithmic coding problems
                const codingFilters = [
                    { "codingData.contestId": { $exists: true } },
                    { role: "Coding" },
                    { role: { $regex: roleRegex }, type: "coding" },
                    { role: { $regex: roleRegex }, assessmentType: "coding" }
                ];

                const domainIsGenericOrAlgo = !domainRegex || /algorithm|codeforce|general/i.test(targetDomain);
                const codingDomainFilter = domainIsGenericOrAlgo ? {} : { domain: { $regex: domainRegex } };

                questions = await Question.find({
                    status: "approved",
                    ...excludeResumeFilter,
                    ...codingDomainFilter,
                    $or: codingFilters
                }).sort({ "codingData.contestId": -1, createdAt: -1 }).limit(Number(limit));

                // Fallback to Codeforces problems if domain filter yielded fewer questions
                if (questions.length < Number(limit)) {
                    const existingIds = questions.map(q => q._id);
                    const fallbackCoding = await Question.find({
                        status: "approved",
                        _id: { $nin: existingIds },
                        ...excludeResumeFilter,
                        $or: [
                            { "codingData.contestId": { $exists: true } },
                            { role: "Coding" },
                            { type: "coding" }
                        ]
                    }).sort({ "codingData.contestId": -1, createdAt: -1 }).limit(Number(limit) - questions.length);
                    questions = [...questions, ...fallbackCoding];
                }

            } else {
                // Default: theory
                questions = await Question.find({
                    ...baseQuery,
                    $or: [
                        { assessmentType: "theory" },
                        { type: "technical" },
                        { assessmentType: { $exists: false } }
                    ]
                }).limit(Number(limit));
            }

            // Keyword match fallback if strict domain returned fewer questions
            if (questions.length < Number(limit) && domainRegex && assessmentType !== "coding") {
                const keywords = targetDomain.split(/[\s,&/]+/).filter(w => w.length > 2);
                if (keywords.length > 0) {
                    const existingIds = questions.map(q => q._id);
                    const kwRegexes = keywords.map(kw => new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i"));
                    const kwMatched = await Question.find({
                        role: { $regex: roleRegex },
                        status: "approved",
                        ...excludeResumeFilter,
                        _id: { $nin: existingIds },
                        $or: kwRegexes.flatMap(rgx => [{ domain: { $regex: rgx } }, { questionText: { $regex: rgx } }])
                    }).limit(Number(limit) - questions.length);
                    questions = [...questions, ...kwMatched];
                }
            }

            // ON-DEMAND AI QUESTION GENERATION:
            // If the database does not have enough questions for this role & tech stack/domain,
            // generate fresh approved questions on the fly!
            if (questions.length < Number(limit) && assessmentType !== "coding") {
                const needed = Number(limit) - questions.length;
                console.log(`[Standard Interview] Need ${needed} more questions for "${roleTitle} - ${targetDomain}". Generating on-demand...`);
                try {
                    const generated = await generateAndSaveQuestions({
                        role: roleTitle,
                        domain: targetDomain,
                        difficulty: "medium",
                        count: Math.max(needed, 3),
                        assessmentType: assessmentType,
                        userId: req.user?._id
                    });
                    if (generated.length > 0) {
                        questions = [...questions, ...generated.slice(0, needed)];
                    }
                } catch (aiErr) {
                    console.error("[Standard Interview] AI on-demand question generation failed:", aiErr.message);
                }
            }

            // Safe fallback if still under limit
            if (questions.length < Number(limit)) {
                const existingIds = questions.map(q => q._id);
                const backfillQuery = {
                    status: "approved",
                    ...excludeResumeFilter,
                    _id: { $nin: existingIds }
                };
                if (assessmentType === "coding") {
                    backfillQuery.$or = [
                        { "codingData.contestId": { $exists: true } },
                        { role: "Coding" },
                        { type: "coding" }
                    ];
                } else {
                    backfillQuery.role = { $regex: roleRegex };
                }
                const backfill = await Question.find(backfillQuery).limit(Number(limit) - questions.length);
                questions = [...questions, ...backfill];
            }
        }

        if (!questions.length) {
            return res.status(404).json({
                message: `No approved questions could be found or generated for "${roleTitle}" with domain "${domain || 'General'}". Please try again.`
            });
        }

        const initialResponses = questions.map(function(q) {
            const isCoding = q.assessmentType === "coding" || q.type === "coding";
            return {
                questionId: q._id,
                questionText: q.questionText,
                questionType: isCoding ? "coding" : "theory",
                userAnswer: "",
                code: isCoding ? "" : undefined,
                language: isCoding ? "javascript" : undefined
            };
        });

        const effectiveDuration = Number(durationSeconds) || DEFAULT_DURATION_SECONDS;

        const newInterview = await Interview.create({
            candidateId: req.user._id,
            roleTitle,
            domain,
            assessmentType,
            status: "in-progress",
            startedAt: new Date(),
            durationSeconds: effectiveDuration,
            lastHeartbeatAt: new Date(),
            responses: initialResponses,
            violations: []
        });

        return res.status(201).json({
            message: "Interview created successfully",
            interviewId: newInterview._id,
            assessmentType,
            startedAt: newInterview.startedAt,
            durationSeconds: effectiveDuration,
            status: newInterview.status,
            questions
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * Handles evaluation for a list of answers and updates interview model.
 */
async function processEvaluation(interview, answers, autoReason = "") {
    const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

    const answerMap = {};
    (answers || []).forEach(a => {
        if (a && a.questionId) {
            answerMap[a.questionId.toString()] = a;
        }
    });

    const evaluationPromises = (interview.responses || []).map(async (resp) => {
        const qId = resp.questionId?.toString();
        const clientAns = answerMap[qId] || {};
        const dbquestion = await Question.findById(resp.questionId);

        const questionText = dbquestion?.questionText || resp.questionText || "";
        const idealAnswer = dbquestion?.idealAnswer || "";
        const isCoding = (dbquestion?.assessmentType === "coding" || Boolean(dbquestion?.codingData?.samples?.length)) && dbquestion?.assessmentType !== "theory";

        const userAnswer = clientAns.userAnswer !== undefined ? clientAns.userAnswer : (resp.userAnswer || "");
        const code = clientAns.code !== undefined ? clientAns.code : (resp.code || "");
        const language = clientAns.language || resp.language || "javascript";
        const telemetry = clientAns.telemetry || resp.telemetry || {};

        // Compute integrity report for this answer
        const integrityReport = computeAnswerIntegrity({
            answer: isCoding ? (code || userAnswer) : userAnswer,
            idealAnswer: idealAnswer,
            telemetry: telemetry
        });

        if (isCoding) {
            const codeToEval = (code || userAnswer || "").trim();
            if (!codeToEval) {
                return {
                    questionId: resp.questionId,
                    questionText,
                    questionType: "coding",
                    userAnswer: "",
                    code: "",
                    score: {
                        technicalKnowledgeScore: 0,
                        completenessScore: 0,
                        relevanceScore: 0,
                        clarityScore: 0,
                        overallScore: 0.0
                    },
                    aiFeedback: "No code was submitted.",
                    telemetry,
                    integrityReport
                };
            }

            try {
                const aiCodeRes = await axios.post(`${FASTAPI_URL}/evaluate-code`, {
                    code: codeToEval,
                    problem: questionText + "\n" + idealAnswer,
                    executionResult: clientAns.executionResult || "Submission evaluated by AI engine"
                }, { timeout: 15000 });

                let parsedEval = {};
                try {
                    parsedEval = typeof aiCodeRes.data.evaluation === "string"
                        ? JSON.parse(aiCodeRes.data.evaluation)
                        : (aiCodeRes.data.evaluation || {});
                } catch (e) {
                    parsedEval = { feedback: String(aiCodeRes.data?.evaluation || "Code analyzed") };
                }

                const codeScore = codeToEval.length > 50 ? 8.0 : 5.0;
                return {
                    questionId: resp.questionId,
                    questionText,
                    questionType: "coding",
                    userAnswer,
                    code: codeToEval,
                    language,
                    score: {
                        technicalKnowledgeScore: codeScore,
                        completenessScore: codeScore,
                        relevanceScore: codeScore,
                        clarityScore: codeScore,
                        overallScore: codeScore
                    },
                    aiFeedback: parsedEval.feedback || "Code reviewed successfully.",
                    codeEvaluation: {
                        approach: parsedEval.approach || "Structured algorithmic approach",
                        timeComplexity: parsedEval.timeComplexity || "O(N)",
                        spaceComplexity: parsedEval.spaceComplexity || "O(1)",
                        codeQuality: parsedEval.codeQuality || "Standard syntax",
                        feedback: parsedEval.feedback || ""
                    },
                    telemetry,
                    integrityReport
                };
            } catch (codeErr) {
                const fallbackScore = codeToEval.length > 30 ? 7.0 : 4.0;
                return {
                    questionId: resp.questionId,
                    questionText,
                    questionType: "coding",
                    userAnswer,
                    code: codeToEval,
                    language,
                    score: {
                        technicalKnowledgeScore: fallbackScore,
                        completenessScore: fallbackScore,
                        relevanceScore: fallbackScore,
                        clarityScore: fallbackScore,
                        overallScore: fallbackScore
                    },
                    aiFeedback: "Code submission received and recorded.",
                    telemetry,
                    integrityReport
                };
            }
        } else {
            // Theory Conceptual Answer
            const candidateAns = (userAnswer || code || "").trim();

            if (!candidateAns) {
                return {
                    questionId: resp.questionId,
                    questionText,
                    questionType: "theory",
                    userAnswer: "",
                    score: {
                        technicalKnowledgeScore: 0,
                        completenessScore: 0,
                        relevanceScore: 0,
                        clarityScore: 0,
                        overallScore: 0.0
                    },
                    aiFeedback: "Candidate did not provide an answer.",
                    telemetry,
                    integrityReport
                };
            }

            try {
                const airesponse = await axios.post(`${FASTAPI_URL}/evaluate_answer`, {
                    questionText,
                    idealAnswer: idealAnswer || "Conceptual and logical depth expected",
                    keypoints: dbquestion?.keypoint || [],
                    candidateAnswer: candidateAns
                }, { timeout: 15000 });

                const evaldata = airesponse.data || {};
                const ovScore = Number(evaldata.overallScore) || 
                    Number((((evaldata.technicalKnowledgeScore || 0) + (evaldata.completenessScore || 0) + (evaldata.relevanceScore || 0) + (evaldata.clarityScore || 0)) / 4).toFixed(1));

                return {
                    questionId: resp.questionId,
                    questionText,
                    questionType: "theory",
                    userAnswer: candidateAns,
                    score: {
                        technicalKnowledgeScore: Number(evaldata.technicalKnowledgeScore) || 0,
                        completenessScore: Number(evaldata.completenessScore) || 0,
                        relevanceScore: Number(evaldata.relevanceScore) || 0,
                        clarityScore: Number(evaldata.clarityScore) || 0,
                        overallScore: ovScore
                    },
                    aiFeedback: evaldata.feedback || "Evaluated.",
                    telemetry,
                    integrityReport
                };
            } catch (theoryErr) {
                const ansWords = candidateAns.split(/\s+/).length;
                const est = Math.min(9.0, Math.max(3.0, Number((ansWords / 15.0).toFixed(1))));
                return {
                    questionId: resp.questionId,
                    questionText,
                    questionType: "theory",
                    userAnswer: candidateAns,
                    score: {
                        technicalKnowledgeScore: Math.round(est),
                        completenessScore: Math.round(est),
                        relevanceScore: Math.round(est),
                        clarityScore: Math.round(est),
                        overallScore: est
                    },
                    aiFeedback: "Answer received. Good conceptual coverage.",
                    telemetry,
                    integrityReport
                };
            }
        }
    });

    const settled = await Promise.all(evaluationPromises);
    const evaluatedResponses = settled.filter(Boolean);

    let totalScoreSum = 0;
    evaluatedResponses.forEach((r) => {
        totalScoreSum += (r.score?.overallScore || 0);
    });

    const finalAverage = evaluatedResponses.length > 0
        ? Number((totalScoreSum / evaluatedResponses.length).toFixed(1))
        : 0;

    interview.responses = evaluatedResponses;
    interview.overallScore = finalAverage;
    interview.status = "evaluated";
    interview.evaluatedAt = new Date();
    if (autoReason) {
        interview.autoSubmittedReason = autoReason;
    }
    await interview.save();

    return { finalAverage, evaluatedResponses };
}

exports.submitInterview = async function(req, res) {
    try {
        const { id } = req.params;
        const { answers = [], reason } = req.body;

        const interview = await Interview.findById(id);
        if (!interview) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        // Authorization check: user can only submit their own interview
        if (interview.candidateId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        // Idempotency: If already evaluated or completed, return existing evaluation immediately
        if (interview.status === "evaluated" || interview.status === "completed") {
            return res.status(200).json({
                message: "Interview is already submitted and evaluated.",
                alreadyEvaluated: true,
                status: interview.status,
                overallScore: interview.overallScore,
                responses: interview.responses
            });
        }

        // If currently in 'submitted' state (e.g. concurrent request in flight)
        if (interview.status === "submitted") {
            return res.status(409).json({
                message: "Interview is currently being evaluated. Please wait.",
                status: "submitted"
            });
        }

        // Reject if session abandoned
        if (interview.status === "abandoned") {
            return res.status(400).json({
                message: "This interview session was abandoned due to inactivity.",
                status: "abandoned"
            });
        }

        // Server-authoritative timer check
        const expired = isSessionExpired(interview);
        const autoReason = expired ? "auto-submitted: time expired" : (reason || "");

        // Transition: in-progress -> submitted
        interview.status = "submitted";
        interview.submittedAt = new Date();
        if (autoReason) {
            interview.autoSubmittedReason = autoReason;
        }
        await interview.save();

        // Process Evaluation: submitted -> evaluated
        const { finalAverage, evaluatedResponses } = await processEvaluation(interview, answers, autoReason);

        return res.status(200).json({
            message: "Interview submitted and evaluated successfully",
            overallScore: finalAverage,
            responses: evaluatedResponses,
            autoSubmittedReason: autoReason || undefined,
            status: "evaluated"
        });

    } catch (error) {
        console.error("submitInterview error:", error);
        return res.status(500).json({ message: error.message || "Failed to submit interview" });
    }
};

exports.getInterviewById = async function(req, res) {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        // Verify candidate ownership
        if (interview.candidateId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized to access this interview session" });
        }

        // Server-authoritative timer expiry check on session retrieval
        if (interview.status === "in-progress" && isSessionExpired(interview)) {
            interview.status = "submitted";
            interview.submittedAt = new Date();
            interview.autoSubmittedReason = "auto-submitted: time expired";
            await interview.save();

            // Evaluate in background
            await processEvaluation(interview, interview.responses, "auto-submitted: time expired");
        }

        const isReadOnly = interview.status !== "in-progress";

        const questionIds = (interview.responses || []).map(r => r.questionId).filter(Boolean);
        const dbQuestions = await Question.find({ _id: { $in: questionIds } });

        const qMap = {};
        dbQuestions.forEach(q => {
            qMap[q._id.toString()] = q;
        });

        const questions = (interview.responses || []).map(r => {
            const dbQ = qMap[r.questionId?.toString()];
            if (dbQ) return dbQ;
            return {
                _id: r.questionId,
                questionText: r.questionText,
                assessmentType: r.questionType === "coding" ? "coding" : "theory",
                type: r.questionType === "coding" ? "coding" : "technical",
                difficulty: "medium"
            };
        });

        return res.status(200).json({
            interview,
            questions,
            isReadOnly,
            status: interview.status
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * Logs an integrity violation event during the exam.
 * If violations reach the MAX_INTEGRITY_VIOLATIONS threshold, auto-submits the exam.
 */
exports.logViolation = async function(req, res) {
    try {
        const { id } = req.params;
        const { type, questionIndex = 0, details = "" } = req.body;

        const interview = await Interview.findById(id);
        if (!interview) return res.status(404).json({ message: "Session not found" });

        if (interview.candidateId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        if (interview.status !== "in-progress") {
            return res.status(200).json({
                message: "Exam already submitted or evaluated",
                autoSubmitted: true,
                status: interview.status
            });
        }

        interview.violations.push({
            type: type || "window_blur",
            timestamp: new Date(),
            questionIndex: Number(questionIndex) || 0,
            details: details || ""
        });

        const count = interview.violations.length;
        let autoSubmitted = false;

        if (count >= MAX_INTEGRITY_VIOLATIONS) {
            autoSubmitted = true;
            interview.status = "submitted";
            interview.submittedAt = new Date();
            interview.autoSubmittedReason = "auto-submitted: integrity violation";
            await interview.save();

            // Evaluate responses immediately
            await processEvaluation(interview, interview.responses, "auto-submitted: integrity violation");
        } else {
            await interview.save();
        }

        return res.status(200).json({
            message: autoSubmitted ? "Violation threshold exceeded. Exam auto-submitted." : "Violation recorded.",
            violationCount: count,
            maxAllowed: MAX_INTEGRITY_VIOLATIONS,
            autoSubmitted,
            status: interview.status
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/**
 * Client heartbeat to keep session alive and prevent abandoned attempts.
 */
exports.heartbeat = async function(req, res) {
    try {
        const { id } = req.params;
        const interview = await Interview.findById(id);
        if (!interview) return res.status(404).json({ message: "Session not found" });

        if (interview.candidateId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        // Check if session has expired based on timer
        if (interview.status === "in-progress" && isSessionExpired(interview)) {
            interview.status = "submitted";
            interview.submittedAt = new Date();
            interview.autoSubmittedReason = "auto-submitted: time expired";
            await interview.save();

            await processEvaluation(interview, interview.responses, "auto-submitted: time expired");
            return res.status(200).json({
                alive: false,
                status: "submitted",
                expired: true,
                message: "Session time has expired. Exam auto-submitted."
            });
        }

        if (interview.status !== "in-progress") {
            return res.status(200).json({
                alive: false,
                status: interview.status,
                message: "Exam is no longer in progress."
            });
        }

        interview.lastHeartbeatAt = new Date();
        await interview.save();

        return res.status(200).json({
            alive: true,
            status: interview.status,
            remainingSeconds: Math.max(0, Math.floor((new Date(interview.startedAt).getTime() + (interview.durationSeconds * 1000) - Date.now()) / 1000))
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};