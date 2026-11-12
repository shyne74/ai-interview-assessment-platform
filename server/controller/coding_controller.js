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

exports.getCodingMeta = async function(req, res) {
    try {
        const questions = await Question.find({
            assessmentType: "coding",
            status: "approved"
        }).select("difficulty keypoint codingData role domain");

        const tagCounts = {};
        const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
        let codeforcesTotal = 0;

        questions.forEach(q => {
            if (q.codingData?.contestId) codeforcesTotal++;
            if (q.difficulty && difficultyCounts[q.difficulty] !== undefined) {
                difficultyCounts[q.difficulty]++;
            }
            (q.keypoint || []).forEach(tag => {
                const cleanTag = tag.trim();
                if (cleanTag) {
                    tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                }
            });
        });

        const topicCategories = [
            { id: "arrays", label: "Arrays & Two Pointers", tags: ["arrays", "two-pointer technique", "two pointers", "sliding window"] },
            { id: "strings", label: "Strings", tags: ["strings", "string", "hashing"] },
            { id: "dp", label: "Dynamic Programming", tags: ["dp", "dynamic programming", "memoization"] },
            { id: "greedy", label: "Greedy Algorithms", tags: ["greedy", "greedy algorithms"] },
            { id: "binary-search", label: "Binary Search", tags: ["binary search", "search"] },
            { id: "data-structures", label: "Data Structures", tags: ["data structures", "hash set", "hashmap", "queue", "stack"] },
            { id: "math", label: "Math & Number Theory", tags: ["math", "number theory", "combinatorics"] },
            { id: "sortings", label: "Sorting & Searching", tags: ["sortings", "sorting"] },
            { id: "recursion", label: "Recursion & Backtracking", tags: ["recursion", "backtracking", "brute force"] },
            { id: "graphs", label: "Graphs & Trees", tags: ["graphs", "trees", "dfs", "bfs"] }
        ];

        return res.status(200).json({
            totalCodingProblems: questions.length,
            codeforcesTotal,
            difficultyCounts,
            tagCounts,
            topicCategories
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getCodingProblems = async function(req, res) {
    try {
        const { topics, difficulty, limit = 5, requireCodeforces = "false" } = req.query;

        const filter = {
            assessmentType: "coding",
            status: "approved"
        };

        if (requireCodeforces === "true") {
            filter["codingData.contestId"] = { $exists: true };
        }

        if (difficulty && difficulty !== "all") {
            filter.difficulty = difficulty.toLowerCase();
        }

        if (topics) {
            const topicList = topics.split(",").map(t => t.trim().toLowerCase());
            filter.$or = [
                { keypoint: { $in: topicList.map(t => new RegExp(t, "i")) } },
                { domain: { $in: topicList.map(t => new RegExp(t, "i")) } }
            ];
        }

        let problems = await Question.find(filter)
            .select("_id questionText role domain difficulty keypoint codingData idealAnswer")
            .limit(Number(limit) || 5);

        if (problems.length < (Number(limit) || 5)) {
            const fallbackFilter = {
                assessmentType: "coding",
                status: "approved",
                _id: { $nin: problems.map(p => p._id) }
            };
            if (difficulty && difficulty !== "all") {
                fallbackFilter.difficulty = difficulty.toLowerCase();
            }
            const needed = (Number(limit) || 5) - problems.length;
            const extra = await Question.find(fallbackFilter).limit(needed);
            problems = [...problems, ...extra];
        }

        return res.status(200).json({
            count: problems.length,
            problems
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};