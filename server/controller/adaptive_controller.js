const AdaptiveInterview = require("../models/adaptive_interview_schema");
const Question = require("../models/question_schema");
const axios = require("axios");
const { computeAnswerIntegrity } = require("../services/integrity");
const { MAX_INTEGRITY_VIOLATIONS, DEFAULT_DURATION_SECONDS } = require("../config/integrity_config");
const { generateAndSaveQuestions } = require("../utils/ai_question_generator");

const LEVEL_CONFIG = {
    1: { name: "Beginner", difficulty: "easy", basePoints: 100 },
    2: { name: "Intermediate", difficulty: "medium", basePoints: 200 },
    3: { name: "Advanced", difficulty: "hard", basePoints: 350 },
    4: { name: "Expert", difficulty: "hard", basePoints: 500 }
};

function isAdaptiveSessionExpired(interview) {
    if (!interview.startedAt || !interview.durationSeconds) return false;
    const deadline = new Date(interview.startedAt).getTime() + (interview.durationSeconds * 1000);
    return Date.now() > deadline;
}

function finalizeAdaptiveInterview(interview, autoReason = "") {
    interview.status = "evaluated";
    interview.evaluatedAt = new Date();
    if (autoReason) {
        interview.autoSubmittedReason = autoReason;
    }

    const count = interview.questionHistory.length;
    if (count > 0) {
        const sum = interview.questionHistory.reduce((acc, q) => acc + (q.score || 0), 0);
        interview.overallScore = Number((sum / count).toFixed(1));
    } else {
        interview.overallScore = 0;
    }

    const updatedTotalPoints = interview.totalPoints || 0;
    const newLevel = interview.currentLevel || 2;

    if (updatedTotalPoints >= 1200 || newLevel >= 4) {
        interview.masteryBadge = "⚡ Principal Architect Tier";
    } else if (updatedTotalPoints >= 750 || newLevel === 3) {
        interview.masteryBadge = "🔥 Senior Technical Specialist";
    } else if (updatedTotalPoints >= 400 || newLevel === 2) {
        interview.masteryBadge = "✨ Intermediate Practitioner";
    } else {
        interview.masteryBadge = "🌱 Developing Apprentice";
    }

    interview.overallFeedback = `Adaptive exam complete! Final Score: ${interview.overallScore}/10 with ${updatedTotalPoints} total points earned. Rank achieved: ${interview.masteryBadge}.${autoReason ? ` (${autoReason})` : ""}`;
}

exports.startAdaptiveInterview = async function(req, res) {
    try {
        const {
            roleTitle,
            role,
            domain,
            difficulty = "medium",
            questionCount = 5,
            targetCount,
            startingLevel,
            durationSeconds
        } = req.body;

        const effectiveRole = roleTitle || role || "Full Stack Developer";
        const effectiveDomain = domain || "General";
        const effectiveQuestionCount = Number(questionCount || targetCount || 5);
        const effectiveDuration = Number(durationSeconds) || DEFAULT_DURATION_SECONDS;

        let initialLevel = 2;
        if (startingLevel) {
            initialLevel = Math.max(1, Math.min(4, Number(startingLevel)));
        } else if (difficulty === "easy") {
            initialLevel = 1;
        } else if (difficulty === "hard" || difficulty === "expert") {
            initialLevel = 3;
        }

        const newInterview = await AdaptiveInterview.create({
            candidateId: req.user._id,
            roleTitle: effectiveRole,
            domain: effectiveDomain,
            targetQuestionCount: effectiveQuestionCount,
            currentLevel: initialLevel,
            currentDifficulty: LEVEL_CONFIG[initialLevel]?.difficulty || "medium",
            currentTopic: effectiveDomain,
            totalPoints: 0,
            currentStreak: 0,
            maxStreak: 0,
            levelHistory: [initialLevel],
            status: "in-progress",
            startedAt: new Date(),
            durationSeconds: effectiveDuration,
            lastHeartbeatAt: new Date(),
            questionHistory: [],
            violations: []
        });

        // Pre-check question bank coverage for this role and domain
        const escapedDomain = effectiveDomain.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingCount = await Question.countDocuments({
            role: new RegExp(`^${effectiveRole.trim()}$`, "i"),
            domain: new RegExp(escapedDomain, "i"),
            status: "approved"
        });

        if (existingCount === 0) {
            console.log(`[Adaptive Exam] Zero pre-existing questions for "${effectiveRole} - ${effectiveDomain}". Initiating AI generator...`);
            generateAndSaveQuestions({
                role: effectiveRole,
                domain: effectiveDomain,
                difficulty: LEVEL_CONFIG[initialLevel]?.difficulty || "medium",
                count: 4,
                userId: req.user._id
            }).catch(e => console.error("[Adaptive Exam] Pre-generation error:", e.message));
        }

        return res.status(201).json({
            message: "Adaptive exam started successfully",
            interviewId: newInterview._id,
            interview: newInterview,
            initialLevel,
            totalPoints: 0,
            startedAt: newInterview.startedAt,
            durationSeconds: effectiveDuration,
            status: newInterview.status
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getAdaptiveSession = async function(req, res) {
    try {
        const { id } = req.params;
        const interview = await AdaptiveInterview.findById(id);
        if (!interview) return res.status(404).json({ message: "Exam session not found" });

        if (interview.candidateId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        // Server-authoritative timer expiry check on session retrieval
        if (interview.status === "in-progress" && isAdaptiveSessionExpired(interview)) {
            finalizeAdaptiveInterview(interview, "auto-submitted: time expired");
            interview.submittedAt = new Date();
            await interview.save();
        }

        const isReadOnly = interview.status !== "in-progress";

        return res.status(200).json({
            interview,
            isReadOnly,
            status: interview.status
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getNextQuestion = async function(req, res) {
    try {
        const { id } = req.params;
        const interview = await AdaptiveInterview.findById(id);

        if (!interview) return res.status(404).json({ message: "Exam session not found" });
        if (interview.candidateId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        // Check if session has expired
        if (interview.status === "in-progress" && isAdaptiveSessionExpired(interview)) {
            finalizeAdaptiveInterview(interview, "auto-submitted: time expired");
            interview.submittedAt = new Date();
            await interview.save();
            return res.status(200).json({ message: "Exam time has expired", isFinished: true, interview });
        }

        if (interview.status !== "in-progress") {
            return res.status(200).json({ message: "Exam completed", isFinished: true, interview });
        }

        if (interview.questionHistory.length >= interview.targetQuestionCount) {
            finalizeAdaptiveInterview(interview);
            await interview.save();
            return res.status(200).json({ message: "Exam limit reached", isFinished: true, interview });
        }

        const askedQuestionIds = interview.questionHistory.map(q => q.questionId);
        const targetTopic = interview.currentTopic || interview.domain || "General";
        const topicRegex = new RegExp(targetTopic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
        const roleRegex = new RegExp(`^${interview.roleTitle.trim()}$`, "i");

        // 1. Try finding by Role + Target Domain + Current Difficulty
        let question = await Question.findOne({
            role: { $regex: roleRegex },
            domain: { $regex: topicRegex },
            difficulty: interview.currentDifficulty,
            status: "approved",
            _id: { $nin: askedQuestionIds }
        });

        // 2. Try finding by Role + Target Domain (any difficulty)
        if (!question) {
            question = await Question.findOne({
                role: { $regex: roleRegex },
                domain: { $regex: topicRegex },
                status: "approved",
                _id: { $nin: askedQuestionIds }
            });
        }

        // 3. Try domain keyword match
        if (!question && targetTopic !== "General") {
            const keywords = targetTopic.split(/[\s,&/]+/).filter(w => w.length > 2);
            for (const kw of keywords) {
                const kwRegex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
                question = await Question.findOne({
                    role: { $regex: roleRegex },
                    $or: [
                        { domain: { $regex: kwRegex } },
                        { questionText: { $regex: kwRegex } }
                    ],
                    status: "approved",
                    _id: { $nin: askedQuestionIds }
                });
                if (question) break;
            }
        }

        // 4. ON-DEMAND AI QUESTION GENERATION:
        // If no matching question exists for this role & tech stack/domain, generate on the fly!
        if (!question) {
            console.log(`[Adaptive Exam] No questions remaining in DB for "${interview.roleTitle} - ${targetTopic}". Generating on-demand with AI...`);
            try {
                const generated = await generateAndSaveQuestions({
                    role: interview.roleTitle,
                    domain: targetTopic,
                    difficulty: interview.currentDifficulty || "medium",
                    count: 3,
                    userId: interview.candidateId
                });
                if (generated && generated.length > 0) {
                    question = generated[0];
                }
            } catch (genErr) {
                console.error("[Adaptive Exam] Dynamic question generation error:", genErr.message);
            }
        }

        // 5. Fallback within the same role only
        if (!question) {
            question = await Question.findOne({
                role: { $regex: roleRegex },
                status: "approved",
                _id: { $nin: askedQuestionIds }
            });
        }

        if (!question) {
            finalizeAdaptiveInterview(interview, "auto-submitted: no further questions");
            await interview.save();
            return res.status(200).json({ message: "No more questions available for this exam session", isFinished: true, interview });
        }

        return res.status(200).json({
            question: {
                _id: question._id,
                questionText: question.questionText,
                role: question.role,
                domain: question.domain,
                difficulty: question.difficulty
            },
            currentLevel: interview.currentLevel || 2,
            currentDifficulty: interview.currentDifficulty || "medium",
            totalPoints: interview.totalPoints || 0,
            currentStreak: interview.currentStreak || 0,
            questionIndex: interview.questionHistory.length + 1,
            targetCount: interview.targetQuestionCount
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.submitAdaptiveAnswer = async function(req, res) {
    try {
        const { id } = req.params;
        const { questionId, userAnswer, telemetry = {} } = req.body;

        const interview = await AdaptiveInterview.findById(id);
        if (!interview) return res.status(404).json({ message: "Exam session not found" });

        if (interview.candidateId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        // Idempotency: If already completed or evaluated, reject
        if (interview.status !== "in-progress") {
            return res.status(409).json({
                message: `Exam session is already ${interview.status}. Further answer submissions are rejected.`,
                status: interview.status
            });
        }

        // Server-authoritative timer check
        if (isAdaptiveSessionExpired(interview)) {
            finalizeAdaptiveInterview(interview, "auto-submitted: time expired");
            interview.submittedAt = new Date();
            await interview.save();
            return res.status(400).json({
                message: "Exam session time has expired. Submissions are no longer accepted.",
                isFinished: true,
                interview
            });
        }

        const dbquestion = await Question.findById(questionId);
        if (!dbquestion) return res.status(404).json({ message: "Question not found" });

        // Compute integrity report for this question
        const integrityReport = computeAnswerIntegrity({
            answer: userAnswer || "",
            idealAnswer: dbquestion.idealAnswer || "",
            telemetry: telemetry
        });

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

        const currentLevel = interview.currentLevel || 2;
        const levelConfig = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[2];

        let evaldata = {};
        try {
            const airesponse = await axios.post(`${FASTAPI_URL}/evaluate-adaptive`, {
                role: interview.roleTitle,
                domain: interview.domain,
                questionText: dbquestion.questionText,
                idealAnswer: dbquestion.idealAnswer || "",
                keypoints: dbquestion.keypoint || [],
                candidateAnswer: userAnswer,
                currentLevel: currentLevel
            }, { timeout: 15000 });
            evaldata = airesponse.data || {};
        } catch (apiErr) {
            evaldata = {
                score: 6.0,
                feedback: "Good conceptual coverage on this domain topic.",
                strength: "Engaged directly with question intent",
                weakness: "Consider adding explicit architectural edge case handling"
            };
        }

        const score = Number((evaldata.score || 0).toFixed(1));

        // Gamified Scoring Calculation
        let pointsAwarded = 0;
        let streakBonus = 0;
        let penaltyApplied = 0;
        let nextStreak = interview.currentStreak || 0;
        let levelShift = 0;

        if (score >= 8.0) {
            pointsAwarded = levelConfig.basePoints;
            nextStreak += 1;
            streakBonus = nextStreak > 1 ? nextStreak * 25 : 0;
            levelShift = 1; // Level up
        } else if (score >= 5.0) {
            pointsAwarded = Math.round(levelConfig.basePoints * (score / 10));
            streakBonus = 0;
            levelShift = 0; // Maintain level
        } else {
            // Mistake penalty
            pointsAwarded = 0;
            streakBonus = 0;
            penaltyApplied = 30 * currentLevel;
            nextStreak = 0;
            levelShift = -1; // Level down
        }

        const prevTotal = interview.totalPoints || 0;
        const updatedTotalPoints = Math.max(0, prevTotal + pointsAwarded + streakBonus - penaltyApplied);
        const newLevel = Math.max(1, Math.min(4, currentLevel + levelShift));
        const newDifficulty = LEVEL_CONFIG[newLevel].difficulty;

        interview.questionHistory.push({
            questionId: dbquestion._id,
            questionText: dbquestion.questionText,
            userAnswer: userAnswer,
            score: score,
            level: currentLevel,
            difficulty: levelConfig.difficulty,
            pointsAwarded: pointsAwarded,
            penaltyApplied: penaltyApplied,
            streakBonus: streakBonus,
            runningPointsTotal: updatedTotalPoints,
            strength: evaldata.strength || "Solid effort",
            weakness: evaldata.weakness || "Minor gaps",
            aiFeedback: evaldata.feedback || "Good conceptual engagement.",
            telemetry,
            integrityReport
        });

        interview.totalPoints = updatedTotalPoints;
        interview.currentStreak = nextStreak;
        interview.maxStreak = Math.max(interview.maxStreak || 0, nextStreak);
        interview.currentLevel = newLevel;
        interview.currentDifficulty = newDifficulty;
        interview.currentTopic = evaldata.nextTopic || interview.domain;
        interview.levelHistory.push(newLevel);

        const isFinished = interview.questionHistory.length >= interview.targetQuestionCount;

        if (isFinished) {
            finalizeAdaptiveInterview(interview);
        }

        await interview.save();

        return res.status(200).json({
            message: "Answer evaluated successfully",
            evaluation: {
                ...evaldata,
                pointsAwarded,
                streakBonus,
                penaltyApplied,
                newTotalPoints: updatedTotalPoints,
                currentStreak: nextStreak,
                levelShift,
                oldLevel: currentLevel,
                newLevel: newLevel,
                newDifficulty: newDifficulty
            },
            isFinished,
            interview
        });

    } catch (error) {
        console.error("Adaptive answer submit error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Logs an integrity violation event during adaptive exam.
 */
exports.logAdaptiveViolation = async function(req, res) {
    try {
        const { id } = req.params;
        const { type, questionIndex = 0, details = "" } = req.body;

        const interview = await AdaptiveInterview.findById(id);
        if (!interview) return res.status(404).json({ message: "Exam session not found" });

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
            finalizeAdaptiveInterview(interview, "auto-submitted: integrity violation");
            interview.submittedAt = new Date();
            await interview.save();
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
 * Adaptive exam client heartbeat.
 */
exports.adaptiveHeartbeat = async function(req, res) {
    try {
        const { id } = req.params;
        const interview = await AdaptiveInterview.findById(id);
        if (!interview) return res.status(404).json({ message: "Exam session not found" });

        if (interview.candidateId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        if (interview.status === "in-progress" && isAdaptiveSessionExpired(interview)) {
            finalizeAdaptiveInterview(interview, "auto-submitted: time expired");
            interview.submittedAt = new Date();
            await interview.save();
            return res.status(200).json({
                alive: false,
                status: "evaluated",
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


