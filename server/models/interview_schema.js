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
        }
    },
],
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
