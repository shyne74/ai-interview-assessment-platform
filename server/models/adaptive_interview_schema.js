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
        enum: ["in-progress", "submitted", "evaluated", "completed", "abandoned"],
        default: "in-progress"
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    durationSeconds: {
        type: Number,
        default: 1800 // default 30 minutes
    },
    submittedAt: {
        type: Date
    },
    evaluatedAt: {
        type: Date
    },
    autoSubmittedReason: {
        type: String,
        default: ""
    },
    lastHeartbeatAt: {
        type: Date,
        default: Date.now
    },
    violations: [{
        type: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        questionIndex: { type: Number, default: 0 },
        details: { type: String, default: "" }
    }],
    
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
        aiFeedback: String,
        telemetry: {
          pasteAttempts: { type: Number, default: 0 },
          copyAttempts: { type: Number, default: 0 },
          keystrokesCount: { type: Number, default: 0 },
          totalCharsTyped: { type: Number, default: 0 },
          largestInsertLength: { type: Number, default: 0 },
          typingDurationMs: { type: Number, default: 0 }
        },
        integrityReport: {
          riskLevel: { type: String, enum: ["low", "medium", "high"], default: "low" },
          reasons: [{ type: String }],
          flags: {
            pasteDetected: { type: Boolean, default: false },
            lowKeystrokeRatio: { type: Boolean, default: false },
            fastTypingSpeed: { type: Boolean, default: false },
            suspiciousPatterns: { type: Boolean, default: false },
            highIdealSimilarity: { type: Boolean, default: false }
          },
          details: { type: Object, default: {} }
        }
    }],
    
    overallScore: { type: Number, default: 0 },
    overallFeedback: { type: String, default: "" },
    masteryBadge: { type: String, default: "Intermediate Practitioner" }
}, { timestamps: true });

module.exports = mongoose.model("AdaptiveInterview", adaptiveInterviewSchema);
