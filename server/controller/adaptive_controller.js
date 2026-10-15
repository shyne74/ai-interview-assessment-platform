const AdaptiveInterview = require("../models/adaptive_interview_schema");
const Question = require("../models/question_schema");
const axios = require("axios");

const LEVEL_CONFIG = {
    1: { name: "Beginner", difficulty: "easy", basePoints: 100 },
    2: { name: "Intermediate", difficulty: "medium", basePoints: 200 },
    3: { name: "Advanced", difficulty: "hard", basePoints: 350 },
    4: { name: "Expert", difficulty: "hard", basePoints: 500 }
};

exports.startAdaptiveInterview = async function(req, res) {
    try {
        const {
            roleTitle,
            role,
            domain,
            difficulty = "medium",
            questionCount = 5,
            targetCount,
            startingLevel
        } = req.body;

        const effectiveRole = roleTitle || role || "Full Stack Developer";
        const effectiveDomain = domain || "General";
        const effectiveQuestionCount = Number(questionCount || targetCount || 5);

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
            questionHistory: []
        });

        return res.status(201).json({
            message: "Adaptive exam started successfully",
            interviewId: newInterview._id,
            interview: newInterview,
            initialLevel,
            totalPoints: 0
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

        return res.status(200).json({ interview });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getNextQuestion = async function(req, res) {
    try {
        const { id } = req.params;
        const interview = await AdaptiveInterview.findById(id);

        if (!interview) return res.status(404).json({ message: "Exam session not found" });
        if (interview.status === "completed") {
            return res.status(200).json({ message: "Exam completed", isFinished: true, interview });
        }
        if (interview.candidateId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        if (interview.questionHistory.length >= interview.targetQuestionCount) {
            return res.status(200).json({ message: "Exam limit reached", isFinished: true, interview });
        }

        const askedQuestionIds = interview.questionHistory.map(q => q.questionId);

        let question = await Question.findOne({
            role: interview.roleTitle,
            domain: { $regex: new RegExp(interview.currentTopic || interview.domain, "i") },
            difficulty: interview.currentDifficulty,
            status: "approved",
            _id: { $nin: askedQuestionIds }
        });

        if (!question) {
            question = await Question.findOne({
                role: interview.roleTitle,
                difficulty: interview.currentDifficulty,
                status: "approved",
                _id: { $nin: askedQuestionIds }
            });
        }

        if (!question) {
            // fallback to any approved question for this role
            question = await Question.findOne({
                role: interview.roleTitle,
                status: "approved",
                _id: { $nin: askedQuestionIds }
            });
        }

        if (!question) {
            // fallback to any approved question
            question = await Question.findOne({
                status: "approved",
                _id: { $nin: askedQuestionIds }
            });
        }

        if (!question) {
            return res.status(404).json({ message: "No more questions available for this exam session" });
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
        const { questionId, userAnswer } = req.body;

        const interview = await AdaptiveInterview.findById(id);
        if (!interview) return res.status(404).json({ message: "Exam session not found" });
        if (interview.status === "completed") return res.status(400).json({ message: "Exam already completed" });

        const dbquestion = await Question.findById(questionId);
        if (!dbquestion) return res.status(404).json({ message: "Question not found" });

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

        const currentLevel = interview.currentLevel || 2;
        const levelConfig = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[2];

        const airesponse = await axios.post(`${FASTAPI_URL}/evaluate-adaptive`, {
            role: interview.roleTitle,
            domain: interview.domain,
            questionText: dbquestion.questionText,
            idealAnswer: dbquestion.idealAnswer || "",
            keypoints: dbquestion.keypoint || [],
            candidateAnswer: userAnswer,
            currentLevel: currentLevel
        });

        const evaldata = airesponse.data;
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
            aiFeedback: evaldata.feedback || "Good conceptual engagement."
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
            interview.status = "completed";
            const sum = interview.questionHistory.reduce((acc, q) => acc + q.score, 0);
            interview.overallScore = Number((sum / interview.questionHistory.length).toFixed(1));

            // Assign Mastery Badge
            if (updatedTotalPoints >= 1200 || newLevel >= 4) {
                interview.masteryBadge = "⚡ Principal Architect Tier";
            } else if (updatedTotalPoints >= 750 || newLevel === 3) {
                interview.masteryBadge = "🔥 Senior Technical Specialist";
            } else if (updatedTotalPoints >= 400 || newLevel === 2) {
                interview.masteryBadge = "✨ Intermediate Practitioner";
            } else {
                interview.masteryBadge = "🌱 Developing Apprentice";
            }

            interview.overallFeedback = `Adaptive exam complete! Final Score: ${interview.overallScore}/10 with ${updatedTotalPoints} total points earned. Rank achieved: ${interview.masteryBadge}.`;
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

