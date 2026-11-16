const mongoose = require("mongoose");

const batchCandidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "interview"
    },
    roleTitle: {
        type: String,
        default: "Software Engineer"
    },
    role: {
        type: String,
        default: "Software Engineer"
    },
    domain: {
        type: String,
        default: "REST APIs"
    },
    assessmentType: {
        type: String,
        enum: ["theory", "coding", "mixed"],
        default: "theory"
    },
    difficulty: {
        type: String,
        enum: ["easy", "medium", "hard"],
        default: "medium"
    },
    limit: {
        type: Number,
        default: 5
    },
    totalQuestions: {
        type: Number,
        default: 5
    },
    durationSeconds: {
        type: Number,
        default: 1800
    },
    inviteStatus: {
        type: String,
        enum: ["invited", "queued", "sent", "emailed", "email_failed", "failed", "logged_in", "in_progress", "submitted", "evaluated"],
        default: "invited"
    },
    emailSentAt: {
        type: Date
    },
    emailError: {
        type: String,
        default: ""
    },
    lastLoginAt: {
        type: Date
    },
    tempPassword: {
        type: String, // Kept only in-memory or briefly for initial creation response / manual reveal if email failed
        default: ""
    },
    previewUrl: {
        type: String,
        default: ""
    },
    messageId: {
        type: String,
        default: ""
    },
    emailAttempts: {
        type: Number,
        default: 0
    },
    lastRemindedAt: {
        type: Date
    },
    timeline: [
        {
            event: { type: String },
            timestamp: { type: Date, default: Date.now },
            details: { type: String, default: "" }
        }
    ]
}, { _id: true });

const batchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    organizationName: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    opensAt: {
        type: Date
    },
    closesAt: {
        type: Date
    },
    defaultDurationSeconds: {
        type: Number,
        default: 1800
    },
    uniqueQuestions: {
        type: Boolean,
        default: true
    },
    restrictToAssigned: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ["draft", "sent", "active", "in_progress", "closed"],
        default: "draft"
    },
    candidates: [batchCandidateSchema],
    sentAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model("batch", batchSchema);
