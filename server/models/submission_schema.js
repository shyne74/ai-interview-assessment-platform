const mongoose = require("mongoose")

const submissionSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    sourceCode: {
        type: String,
        required: true
    },
    languageId: {
        type: Number,
        required: true
    },
    execution: {
        type: Object
    },
    evaluation: {
        type: Object
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Submission", submissionSchema)