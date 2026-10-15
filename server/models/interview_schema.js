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
        enum:["pending","in-progress","completed"],
        default:"pending"
    },
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
