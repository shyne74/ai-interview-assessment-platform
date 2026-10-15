const axios = require("axios")
const Question = require("../models/question_schema.js")
const Submission = require("../models/submission_schema.js")

exports.submitCode = async function(req, res) {
    try {
        const { questionId, languageId, sourceCode } = req.body

        // 1. Find question
        const question = await Question.findById(questionId)

        if (!question) {
            return res.status(404).json({
                message: "question not found"
            })
        }

        // 2. Make sure it's a coding question
        if (question.assessmentType !== "coding") {
            return res.status(400).json({
                message: "this is not a coding question"
            })
        }

        // 3. Guard: no samples → cannot run test cases
        const samples = question.codingData?.samples || []
        if (samples.length === 0) {
            return res.status(400).json({
                message: "No test cases available for this problem. Cannot execute."
            })
        }

        
        const testResults = []

        for (const sample of samples) {
            const judgeResponse = await axios.post(
                "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
                {
                    source_code: sourceCode,
                    language_id: languageId,
                    stdin: sample.input,
                    expected_output: sample.output
                }
            )

            testResults.push(judgeResponse.data)
        }

        // 5. Overall execution result
        const allPassed = testResults.every(function(test) {
            return test.status && test.status.id === 3
        })

        const firstFailed = testResults.find(function(test) {
            return !test.status || test.status.id !== 3
        })

        const executionResult = {
            status: allPassed
                ? "Accepted"
                : (firstFailed?.status?.description || "Wrong Answer"),
            tests: testResults
        }

        // 6. Send result to FastAPI + Groq
        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000"
        const aiResponse = await axios.post(
            `${FASTAPI_URL}/evaluate-code`,
            {
                code: sourceCode,
                problem: question.questionText,
                executionResult: executionResult.status
            }
        )

        // 7. Save submission in MongoDB
        const submission = await Submission.create({
            questionId: question._id,
            userId: req.user._id,
            sourceCode: sourceCode,
            languageId: languageId,
            execution: executionResult,
            evaluation: aiResponse.data.evaluation
        })

        // 8. Return result
        return res.status(200).json({
            submission: submission
        })

    } catch (error) {
        return res.status(500).json({
            message: "code submission failed",
            error: error.message
        })
    }
}

exports.getSubmissions = async function(req, res) {
    try {
        const submissions = await Submission.find({
            userId: req.user._id
        })
        .populate("questionId", "questionText codingData")

        return res.status(200).json({
            submissions: submissions
        })

    } catch (error) {
        return res.status(500).json({
            message: "failed to get submissions",
            error: error.message
        })
    }
}
// exports.getfunction = async function(req,res){
    
// }