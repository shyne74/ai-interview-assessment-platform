const mongoose = require("mongoose")

const interviewSchema = new mongoose.Schema({
    candidateId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    roleTitle:{
        type:String,
        required:true,
        trim:true
    },
    domain:{
        type:String,
        required:true,
        trim:true
    },

    assessmentType: {
        type: String,
        enum: ["theory", "coding", "mixed"],
        default: "theory"
    },
    interviewType: {
        type: String,
        default: "mock"
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "batch"
    },
    opensAt: {
        type: Date
    },
    closesAt: {
        type: Date
    },
    inviteToken: {
        type: String,
        default: ""
    },
    invitedEmail: {
        type: String,
        default: ""
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
    lastLoginAt: {
        type: Date
    },
    status:{
        type:String,
        enum:["pending","in-progress","submitted","evaluated","completed","abandoned"],
        default:"pending"
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
    responses:[{
        questionId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Question"
        },
        questionText:String,
        userAnswer:String,
        code:String,
        language:String,
        questionType:{
            type: String,
            default: "theory"
        },
        score:{
          technicalKnowledgeScore: { type: Number, default: 0 },
          completenessScore: { type: Number, default: 0 },
          relevanceScore: { type: Number, default: 0 },
          clarityScore: { type: Number, default: 0 },
          overallScore: { type: Number, default: 0 },
        },
        aiFeedback:String,
        codeEvaluation: {
          approach: String,
          timeComplexity: String,
          spaceComplexity: String,
          codeQuality: String,
          feedback: String
        },
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
        },
        plagiarismReport: {
          plagiarismScore: { type: Number, default: 0 },
          originalityScore: { type: Number, default: 100 },
          riskLevel: { type: String, default: "low" },
          status: { type: String, default: "Clean" },
          isPlagiarized: { type: Boolean, default: false },
          detectedSources: [{ type: String }],
          similarityWithIdeal: { type: Number, default: 0 },
          details: { type: Object, default: {} }
        }
    },
],
plagiarismSummary: {
    overallPlagiarismScore: { type: Number, default: 0 },
    overallOriginalityScore: { type: Number, default: 100 },
    highestQuestionPlagiarism: { type: Number, default: 0 },
    status: { type: String, default: "Clean" },
    flaggedQuestionsCount: { type: Number, default: 0 }
},
overallScore:{
    type:Number,
    default:0
},
overallFeedback:{
    type:String,
    default:"nothing to say"
}

},{
    timestamps:true
}
)

module.exports = mongoose.model("Interview",interviewSchema)
