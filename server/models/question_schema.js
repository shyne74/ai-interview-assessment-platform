const mongoose = require("mongoose")

const questionSchema = new mongoose.Schema({
    questionText:{
        type:String,
        required:true
    },
    role:{
        type:String,
        required:[true,"role is required"]

    },
    domain:{
        type:String,
        required:true
    },
    difficulty:{
        type:String,
        enum:["easy","medium","hard","expert"],
        required:true,
        default:"medium"
    },
    type:{
        type:String,
        enum:["technical","coding","behavioral","behavioural","system-design","general"],
        default:"technical"
    },
    idealAnswer:{
        type:String,
        required:false
    },
    keypoint:[{
        type:String
    }],
    maxscore:{
        type:Number,
        default:10
    },
    timeLimit:{
        type:Number,
        default:180
    },
    assessmentType:{
        type: String,
        enum: ["theory", "coding", "mixed", "practical", "technical"],
        default: "theory"
    },
    codingData: {
    contestId: Number,
    index: String,
    problemUrl: String,
    inputSpecification: String,
    outputSpecification: String,
    samples: [{
        input: String,
        output: String
    }],
    memoryLimit: Number,
    timeLimit: Number
    },
    isAIGenerated: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "approved" // Manually created ones default to approved
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"

    }
},{
    timestamps:true
})

module.exports = mongoose.model("Question",questionSchema)