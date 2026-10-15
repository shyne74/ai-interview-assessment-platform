const mongoose = require("mongoose");

const adaptiveInterviewSchema = new mongoose.Schema({
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    roleTitle: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    targetQuestionCount: { type: Number, default: 5 },
    
    status: {
        type: String,
        enum: ["in-progress", "completed"],
        default: "in-progress"
    },
    
    currentLevel: { type: Number, default: 2 }, // 1: Easy, 2: Medium, 3: Hard, 4: Expert
    currentDifficulty: { type: String, default: "medium" },
    currentTopic: { type: String },
    totalPoints: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    levelHistory: [{ type: Number, default: 2 }],
    
    questionHistory: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question"
        },
        questionText: String,
        userAnswer: String,
        score: Number,
        level: Number,
        difficulty: String,
        pointsAwarded: Number,
        penaltyApplied: Number,
        streakBonus: Number,
        runningPointsTotal: Number,
        strength: String,
        weakness: String,
        aiFeedback: String
    }],
    
    overallScore: { type: Number, default: 0 },
    overallFeedback: { type: String, default: "" },
    masteryBadge: { type: String, default: "Intermediate Practitioner" }
}, { timestamps: true });

module.exports = mongoose.model("AdaptiveInterview", adaptiveInterviewSchema);
