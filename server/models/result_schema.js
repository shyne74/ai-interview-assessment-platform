const mongoose = require("mongoose")

const resultAnalysisSchema = new mongoose.Schema({
    interviewId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Interview",
        required:true,
        unique:true
    },
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
        trim:true,
    },
    overallScore:{
        type:Number,
        required:true
    },
    skillBreakdown:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    },
    strongAreas:{
        type:[String],
        default:[]
    },
    weakAreas:{
        type:[String],
        default:[]
    },
    performanceTrend:{
        type:String,
        default:""
    },
    summaryFeedback:{
        type:String,
        default:""
    },
},
{
    timestamps:true

})

module.exports = mongoose.model(
    "resultAnalysis",
    resultAnalysisSchema
)