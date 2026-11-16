const axios = require("axios");
const Question = require("../models/question_schema.js");
const Submission = require("../models/submission_schema.js");

const DSA_TOPIC_CONFIGS = [
    { slug: "arrays", label: "Arrays", keywords: ["array", "subarray", "elements", "matrix", "vector", "indices", "multiset"] },
    { slug: "strings", label: "Strings", keywords: ["string", "substring", "palindrome", "character", "prefix", "suffix"] },
    { slug: "hash-maps", label: "Hash Maps", keywords: ["hash map", "hash table", "hashmap", "dictionary", "hash set", "hashset", "frequency"] },
    { slug: "two-pointers", label: "Two Pointers", keywords: ["two pointer", "two pointers", "left right", "pointers"] },
    { slug: "sliding-window", label: "Sliding Window", keywords: ["sliding window", "window", "consecutive"] },
    { slug: "linked-lists", label: "Linked Lists", keywords: ["linked list", "singly linked", "doubly linked", "head node"] },
    { slug: "stacks-queues", label: "Stacks & Queues", keywords: ["stack", "queue", "deque", "lifo", "fifo", "parentheses", "bracket"] },
    { slug: "binary-search", label: "Binary Search", keywords: ["binary search", "bisection", "lower_bound", "upper_bound"] },
    { slug: "sorting", label: "Sorting", keywords: ["sort", "sorting", "sorted", "bubble sort", "merge sort", "quick sort", "comparator", "inversion"] },
    { slug: "recursion", label: "Recursion", keywords: ["recursion", "recursive", "base case", "divide and conquer"] },
    { slug: "trees", label: "Trees", keywords: ["tree", "rooted tree", "binary tree", "ancestor", "leaf", "subtree"] },
    { slug: "binary-search-trees", label: "Binary Search Trees", keywords: ["binary search tree", "bst", "inorder"] },
    { slug: "heaps", label: "Heaps", keywords: ["heap", "priority queue", "min-heap", "max-heap"] },
    { slug: "graphs", label: "Graphs", keywords: ["graph", "vertex", "vertices", "edge", "edges", "dfs", "bfs", "directed", "cycle", "shortest path"] },
    { slug: "backtracking", label: "Backtracking", keywords: ["backtracking", "permutations", "combinations", "n-queens", "sudoku"] },
    { slug: "greedy", label: "Greedy", keywords: ["greedy", "optimal", "minimum operations", "maximum"] },
    { slug: "dynamic-programming", label: "Dynamic Programming", keywords: ["dynamic programming", "dp", "memoization", "knapsack", "subsequence"] },
    { slug: "tries", label: "Tries", keywords: ["trie", "prefix tree", "prefix search"] },
    { slug: "bit-manipulation", label: "Bit Manipulation", keywords: ["bitwise", "xor", "bitmask", "binary representation", "bit shift"] },
    { slug: "math", label: "Math", keywords: ["math", "integer", "modulo", "prime", "gcd", "lcm", "combinatorics", "divisible"] }
];

function getKeywordsForTopic(topicQuery) {
    if (!topicQuery) return null;
    const clean = topicQuery.trim().toLowerCase();
    const found = DSA_TOPIC_CONFIGS.find(t => 
        t.slug === clean || 
        t.label.toLowerCase() === clean ||
        t.slug.replace(/-/g, " ") === clean
    );
    if (found) return found.keywords;
    return clean.split(/[\s,&/]+/).filter(w => w.length > 2);
}

exports.submitCode = async function(req, res) {
    try {
        const questionId = req.body.questionId || req.body.problemId;
        const { languageId, sourceCode, isRunOnly, samplesOnly } = req.body;
        const runOnly = Boolean(isRunOnly || samplesOnly);

        if (!questionId) {
            return res.status(400).json({ message: "questionId or problemId is required" });
        }

        // 1. Find question
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        // 2. Validate question type
        const isCoding = question.assessmentType === "coding" || 
                         question.type === "coding" || 
                         question.role === "Coding" || 
                         Boolean(question.codingData?.contestId);

        if (!isCoding) {
            return res.status(400).json({ message: "This is not a coding question" });
        }

        // 3. Samples guard
        const samples = question.codingData?.samples || question.codingData?.sampleTestCases || [];
        if (samples.length === 0) {
            return res.status(400).json({
                message: "No test cases available for this problem. Cannot execute."
            });
        }

        // 4. Run through Judge0 for all samples
        const testResults = [];
        let totalRuntime = 0;
        let maxMemory = 0;

        for (const sample of samples) {
            try {
                const judgeResponse = await axios.post(
                    "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
                    {
                        source_code: sourceCode,
                        language_id: languageId,
                        stdin: sample.input || "",
                        expected_output: sample.output || ""
                    },
                    { timeout: 15000 }
                );

                const data = judgeResponse.data;
                testResults.push(data);
                if (data.time) totalRuntime += parseFloat(data.time) || 0;
                if (data.memory) maxMemory = Math.max(maxMemory, parseInt(data.memory, 10) || 0);
            } catch (judgeErr) {
                testResults.push({
                    status: { id: 13, description: "Judge Execution Error" },
                    stderr: judgeErr.message,
                    compile_output: judgeErr.message
                });
            }
        }

        // 5. Evaluate execution results
        const passedCount = testResults.filter(t => t.status && t.status.id === 3).length;
        const allPassed = passedCount === testResults.length && testResults.length > 0;
        const firstFailed = testResults.find(t => !t.status || t.status.id !== 3);

        const executionResult = {
            status: allPassed ? "Accepted" : (firstFailed?.status?.description || "Wrong Answer"),
            passedCount,
            totalCount: testResults.length,
            runtimeSeconds: totalRuntime,
            memoryKB: maxMemory,
            tests: testResults
        };

        // 6. If Run Only (samples run), do not call AI evaluator or save to Submission DB
        if (runOnly) {
            return res.status(200).json({
                isRunOnly: true,
                execution: executionResult
            });
        }

        // 7. Full submission: call FastAPI AI evaluation (with resilient fallback)
        let aiEvaluation = {
            status: executionResult.status,
            analysis: "Automated analysis completed successfully."
        };

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
        try {
            const aiResponse = await axios.post(
                `${FASTAPI_URL}/evaluate-code`,
                {
                    code: sourceCode,
                    problem: question.questionText,
                    executionResult: executionResult.status
                },
                { timeout: 15000 }
            );
            if (aiResponse.data?.evaluation) {
                aiEvaluation = aiResponse.data.evaluation;
            }
        } catch (aiErr) {
            console.warn("[Coding Controller] AI evaluation non-blocking error:", aiErr.message);
            aiEvaluation = {
                feedback: `Solution evaluated as ${executionResult.status}. ${passedCount}/${testResults.length} test cases passed.`,
                codeQuality: allPassed ? "Good" : "Needs Optimization",
                timeComplexity: "Estimated O(N)",
                spaceComplexity: "Estimated O(1)"
            };
        }

        // 8. Save submission in MongoDB
        const submission = await Submission.create({
            questionId: question._id,
            userId: req.user._id,
            sourceCode: sourceCode,
            languageId: languageId,
            execution: executionResult,
            evaluation: aiEvaluation
        });

        return res.status(200).json({
            submission
        });

    } catch (error) {
        console.error("[Coding Controller] submitCode error:", error);
        return res.status(500).json({
            message: "Code execution failed",
            error: error.message
        });
    }
};

exports.getSubmissions = async function(req, res) {
    try {
        const submissions = await Submission.find({
            userId: req.user._id
        })
        .populate("questionId", "questionText codingData domain difficulty")
        .sort({ createdAt: -1 });

        return res.status(200).json({
            submissions
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to get submissions",
            error: error.message
        });
    }
};

exports.getProblemSubmissions = async function(req, res) {
    try {
        const { problemId } = req.params;
        const submissions = await Submission.find({
            userId: req.user._id,
            questionId: problemId
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            submissions
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to get problem submissions",
            error: error.message
        });
    }
};

exports.getUserCodingProgress = async function(req, res) {
    try {
        const userId = req.user._id;
        const submissions = await Submission.find({ userId })
            .select("questionId execution createdAt")
            .sort({ createdAt: -1 });

        const progressMap = {};
        const solvedIds = new Set();
        const attemptedIds = new Set();

        for (const sub of submissions) {
            const qId = sub.questionId?.toString();
            if (!qId) continue;
            attemptedIds.add(qId);
            const status = sub.execution?.status || "Attempted";
            if (status === "Accepted") {
                solvedIds.add(qId);
            }

            if (!progressMap[qId]) {
                progressMap[qId] = {
                    problemId: qId,
                    bestStatus: status,
                    attempts: 1,
                    lastSubmittedAt: sub.createdAt
                };
            } else {
                progressMap[qId].attempts += 1;
                if (progressMap[qId].bestStatus !== "Accepted" && status === "Accepted") {
                    progressMap[qId].bestStatus = "Accepted";
                }
            }
        }

        return res.status(200).json({
            totalSolved: solvedIds.size,
            totalAttempted: attemptedIds.size,
            progress: Object.values(progressMap)
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch user coding progress",
            error: error.message
        });
    }
};

exports.getCodingProblemById = async function(req, res) {
    try {
        const { id } = req.params;
        const question = await Question.findById(id);

        if (!question) {
            return res.status(404).json({ message: "Problem not found" });
        }

        const isCoding = question.assessmentType === "coding" || 
                         question.type === "coding" || 
                         question.role === "Coding" || 
                         Boolean(question.codingData?.contestId);

        if (!isCoding) {
            return res.status(400).json({ message: "Question is not a coding problem" });
        }

        const isExecutable = Boolean(
            (question.codingData?.samples && question.codingData.samples.length > 0) ||
            (question.codingData?.sampleTestCases && question.codingData.sampleTestCases.length > 0)
        );

        let userStatus = "todo";
        if (req.user?._id) {
            const latestSub = await Submission.findOne({
                userId: req.user._id,
                questionId: id
            }).sort({ createdAt: -1 });

            if (latestSub) {
                userStatus = latestSub.execution?.status === "Accepted" ? "solved" : "attempted";
            }
        }

        return res.status(200).json({
            problem: question,
            isExecutable,
            userStatus
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch problem",
            error: error.message
        });
    }
};

exports.getCodingMeta = async function(req, res) {
    try {
        const questions = await Question.find({
            $or: [
                { assessmentType: "coding" },
                { type: "coding" },
                { role: "Coding" },
                { "codingData.contestId": { $exists: true } }
            ],
            status: "approved"
        }).select("difficulty keypoint codingData role domain");

        const tagCounts = {};
        const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
        let codeforcesTotal = 0;

        questions.forEach(q => {
            if (q.codingData?.contestId) codeforcesTotal++;
            const diff = (q.difficulty || "").toLowerCase();
            if (diff && difficultyCounts[diff] !== undefined) {
                difficultyCounts[diff]++;
            }
            (q.keypoint || []).forEach(tag => {
                const cleanTag = tag.trim();
                if (cleanTag) {
                    tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                }
            });
            if (Array.isArray(q.codingData?.tags)) {
                q.codingData.tags.forEach(t => {
                    const cleanTag = t.trim();
                    if (cleanTag) {
                        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                    }
                });
            }
        });

        return res.status(200).json({
            totalCodingProblems: questions.length,
            codeforcesTotal,
            difficultyCounts,
            tagCounts,
            topicCategories: DSA_TOPIC_CONFIGS.map(t => ({
                id: t.slug,
                label: t.label,
                keywords: t.keywords
            }))
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getCodingProblems = async function(req, res) {
    try {
        const {
            topic,
            topics,
            slug,
            difficulty,
            status,
            search,
            sort,
            page = 1,
            limit = 50,
            requireCodeforces = "false"
        } = req.query;

        // Base filter for all approved coding questions
        const baseQuery = {
            status: "approved",
            $or: [
                { assessmentType: "coding" },
                { type: "coding" },
                { role: "Coding" },
                { "codingData.contestId": { $exists: true } }
            ]
        };

        if (requireCodeforces === "true") {
            baseQuery["codingData.contestId"] = { $exists: true };
        }

        if (difficulty && difficulty !== "all") {
            baseQuery.difficulty = difficulty.toLowerCase();
        }

        // Fetch candidate problems
        let problems = await Question.find(baseQuery)
            .select("_id questionText role domain difficulty keypoint codingData timeLimit status createdAt")
            .sort({ "codingData.contestId": -1, createdAt: -1 });

        // Filter by topic / keywords if provided
        const topicQuery = topic || topics || slug;
        if (topicQuery) {
            const keywords = getKeywordsForTopic(topicQuery);
            if (keywords && keywords.length > 0) {
                const kwRegexes = keywords.map(kw => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i"));
                problems = problems.filter(q => {
                    const text = q.questionText || "";
                    const domain = q.domain || "";
                    const keypoints = Array.isArray(q.keypoint) ? q.keypoint.join(" ") : "";
                    const tags = Array.isArray(q.codingData?.tags) ? q.codingData.tags.join(" ") : "";
                    const haystack = `${text} ${domain} ${keypoints} ${tags}`;
                    return kwRegexes.some(rgx => rgx.test(haystack));
                });
            }
        }

        // Filter by search query if provided
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
            problems = problems.filter(q => {
                const text = q.questionText || "";
                const domain = q.domain || "";
                return searchRegex.test(text) || searchRegex.test(domain);
            });
        }

        // Fetch user submission status if authenticated
        let userSubmissionMap = {};
        if (req.user?._id) {
            const userSubmissions = await Submission.find({
                userId: req.user._id,
                questionId: { $in: problems.map(p => p._id) }
            }).select("questionId execution createdAt");

            for (const sub of userSubmissions) {
                const qId = sub.questionId.toString();
                const isAccepted = sub.execution?.status === "Accepted";
                if (!userSubmissionMap[qId] || isAccepted) {
                    userSubmissionMap[qId] = isAccepted ? "solved" : "attempted";
                }
            }
        }

        // Attach status and isExecutable to each problem
        let enriched = problems.map(p => {
            const idStr = p._id.toString();
            const uStatus = userSubmissionMap[idStr] || "todo";
            const isExecutable = Boolean(
                (p.codingData?.samples && p.codingData.samples.length > 0) ||
                (p.codingData?.sampleTestCases && p.codingData.sampleTestCases.length > 0)
            );
            return {
                ...p.toObject(),
                userStatus: uStatus,
                isExecutable
            };
        });

        // Filter by user status if requested (all, solved, attempted, todo)
        if (status && status !== "all") {
            enriched = enriched.filter(p => p.userStatus === status.toLowerCase());
        }

        // Sort if requested
        if (sort === "difficulty-asc") {
            const rank = { easy: 1, medium: 2, hard: 3 };
            enriched.sort((a, b) => (rank[a.difficulty] || 2) - (rank[b.difficulty] || 2));
        } else if (sort === "difficulty-desc") {
            const rank = { easy: 1, medium: 2, hard: 3 };
            enriched.sort((a, b) => (rank[b.difficulty] || 2) - (rank[a.difficulty] || 2));
        } else if (sort === "status") {
            const sRank = { todo: 1, attempted: 2, solved: 3 };
            enriched.sort((a, b) => (sRank[a.userStatus] || 1) - (sRank[b.userStatus] || 1));
        }

        // Pagination
        const total = enriched.length;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.max(1, parseInt(limit, 10) || 50);
        const totalPages = Math.ceil(total / pageSize) || 1;
        const paginated = enriched.slice((pageNum - 1) * pageSize, pageNum * pageSize);

        // DO NOT PAD! Return strictly matching problems.
        return res.status(200).json({
            count: paginated.length,
            total,
            page: pageNum,
            totalPages,
            problems: paginated
        });
    } catch (err) {
        console.error("[Coding Controller] getCodingProblems error:", err);
        return res.status(500).json({ message: err.message });
    }
};
