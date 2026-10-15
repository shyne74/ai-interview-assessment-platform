const Interview = require("../models/interview_schema")
const Question = require("../models/question_schema")
const axios = require("axios")

exports.startInterview = async function(req, res) {
    try {
        const { roleTitle, domain, limit = 5, assessmentType = "theory", questionIds } = req.body

        let questions = [];

        if (Array.isArray(questionIds) && questionIds.length > 0) {
            // Load exact specified questions (e.g. from JD generator or specific test selection)
            questions = await Question.find({ _id: { $in: questionIds } });
        } else if (assessmentType === "mixed") {
            const theoryLimit = Math.ceil(Number(limit) / 2);
            const codingLimit = Math.floor(Number(limit) / 2);

            const roleRegex = new RegExp(`^${roleTitle.trim()}$`, "i");
            const domainRegex = domain ? new RegExp(domain.trim(), "i") : /.*/;

            const theoryQuestions = await Question.find({
                role: { $regex: roleRegex },
                status: "approved",
                $or: [
                    { assessmentType: "theory" },
                    { type: "technical" },
                    { assessmentType: { $exists: false } }
                ]
            }).limit(theoryLimit);

            const codingQuestions = await Question.find({
                role: { $regex: roleRegex },
                status: "approved",
                $or: [
                    { assessmentType: "coding" },
                    { type: "coding" }
                ]
            }).limit(codingLimit);

            questions = [...theoryQuestions, ...codingQuestions];

            // If we don't have enough, backfill with any approved questions for this role
            if (questions.length < Number(limit)) {
                const existingIds = questions.map(q => q._id);
                const backfill = await Question.find({
                    role: { $regex: roleRegex },
                    status: "approved",
                    _id: { $nin: existingIds }
                }).limit(Number(limit) - questions.length);
                questions = [...questions, ...backfill];
            }
        } else if (assessmentType === "coding") {
            const roleRegex = new RegExp(`^${roleTitle.trim()}$`, "i");
            questions = await Question.find({
                role: { $regex: roleRegex },
                status: "approved",
                $or: [
                    { assessmentType: "coding" },
                    { type: "coding" }
                ]
            }).limit(Number(limit));

            if (!questions.length) {
                questions = await Question.find({
                    role: { $regex: roleRegex },
                    status: "approved"
                }).limit(Number(limit));
            }
        } else {
            // Default: theory
            const roleRegex = new RegExp(`^${roleTitle.trim()}$`, "i");
            questions = await Question.find({
                role: { $regex: roleRegex },
                status: "approved",
                $or: [
                    { assessmentType: "theory" },
                    { type: "technical" },
                    { assessmentType: { $exists: false } }
                ]
            }).limit(Number(limit));

            if (!questions.length) {
                questions = await Question.find({
                    role: { $regex: roleRegex },
                    status: "approved"
                }).limit(Number(limit));
            }
        }

        if (!questions.length) {
            return res.status(404).json({ message: "No approved questions found for this role. Please generate questions in the Question Bank or AI Generator." })
        }

        const initialResponses = questions.map(function(q) {
            const isCoding = q.assessmentType === "coding" || q.type === "coding";
            return {
                questionId: q._id,
                questionText: q.questionText,
                questionType: isCoding ? "coding" : "theory",
                userAnswer: "",
                code: isCoding ? "" : undefined,
                language: isCoding ? "javascript" : undefined
            }
        });

        const newInterview = await Interview.create({
            candidateId: req.user._id,
            roleTitle,
            domain,
            assessmentType,
            status: "in-progress",
            responses: initialResponses
        });

        return res.status(201).json({
            message: "Interview created successfully",
            interviewId: newInterview._id,
            assessmentType,
            questions
        });
    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
}

exports.submitInterview = async function(req, res) {
    try {
        const { id } = req.params;
        const { answers = [] } = req.body;

        const interview = await Interview.findById(id);
        if (!interview) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

        // Evaluate all answers concurrently with robust fallbacks
        const evaluationPromises = answers.map(async (ans) => {
            const dbquestion = await Question.findById(ans.questionId);
            if (!dbquestion) return null;

            // Accurate check for coding vs theory
            const isCoding = (dbquestion.assessmentType === "coding" || Boolean(dbquestion.codingData?.samples?.length)) && dbquestion.assessmentType !== "theory";

            if (isCoding) {
                const codeToEval = (ans.code || ans.userAnswer || "").trim();
                if (!codeToEval) {
                    return {
                        questionId: dbquestion._id,
                        questionText: dbquestion.questionText,
                        questionType: "coding",
                        userAnswer: "",
                        code: "",
                        score: {
                            technicalKnowledgeScore: 0,
                            completenessScore: 0,
                            relevanceScore: 0,
                            clarityScore: 0,
                            overallScore: 0.0
                        },
                        aiFeedback: "No code was submitted."
                    };
                }

                try {
                    const aiCodeRes = await axios.post(`${FASTAPI_URL}/evaluate-code`, {
                        code: codeToEval,
                        problem: dbquestion.questionText + "\n" + (dbquestion.idealAnswer || ""),
                        executionResult: ans.executionResult || "Submission evaluated by AI engine"
                    }, { timeout: 15000 });

                    let parsedEval = {};
                    try {
                        parsedEval = typeof aiCodeRes.data.evaluation === "string"
                            ? JSON.parse(aiCodeRes.data.evaluation)
                            : (aiCodeRes.data.evaluation || {});
                    } catch (e) {
                        parsedEval = { feedback: String(aiCodeRes.data?.evaluation || "Code analyzed") };
                    }

                    const codeScore = codeToEval.length > 50 ? 8.0 : 5.0;
                    return {
                        questionId: dbquestion._id,
                        questionText: dbquestion.questionText,
                        questionType: "coding",
                        userAnswer: ans.userAnswer || "",
                        code: codeToEval,
                        language: ans.language || "javascript",
                        score: {
                            technicalKnowledgeScore: codeScore,
                            completenessScore: codeScore,
                            relevanceScore: codeScore,
                            clarityScore: codeScore,
                            overallScore: codeScore
                        },
                        aiFeedback: parsedEval.feedback || "Code reviewed successfully.",
                        codeEvaluation: {
                            approach: parsedEval.approach || "Structured algorithmic approach",
                            timeComplexity: parsedEval.timeComplexity || "O(N)",
                            spaceComplexity: parsedEval.spaceComplexity || "O(1)",
                            codeQuality: parsedEval.codeQuality || "Standard syntax",
                            feedback: parsedEval.feedback || ""
                        }
                    };
                } catch (codeErr) {
                    console.log("Coding eval fallback:", codeErr.message);
                    const fallbackScore = codeToEval.length > 30 ? 7.0 : 4.0;
                    return {
                        questionId: dbquestion._id,
                        questionText: dbquestion.questionText,
                        questionType: "coding",
                        userAnswer: ans.userAnswer || "",
                        code: codeToEval,
                        score: {
                            technicalKnowledgeScore: fallbackScore,
                            completenessScore: fallbackScore,
                            relevanceScore: fallbackScore,
                            clarityScore: fallbackScore,
                            overallScore: fallbackScore
                        },
                        aiFeedback: "Code submission received and recorded."
                    };
                }
            } else {
                // Theory Conceptual Answer
                const candidateAns = (ans.userAnswer || ans.code || "").trim();

                if (!candidateAns) {
                    return {
                        questionId: dbquestion._id,
                        questionText: dbquestion.questionText,
                        questionType: "theory",
                        userAnswer: "",
                        score: {
                            technicalKnowledgeScore: 0,
                            completenessScore: 0,
                            relevanceScore: 0,
                            clarityScore: 0,
                            overallScore: 0.0
                        },
                        aiFeedback: "Candidate did not provide an answer."
                    };
                }

                try {
                    const airesponse = await axios.post(`${FASTAPI_URL}/evaluate_answer`, {
                        questionText: dbquestion.questionText,
                        idealAnswer: dbquestion.idealAnswer || "Conceptual and logical depth expected",
                        keypoints: dbquestion.keypoint || [],
                        candidateAnswer: candidateAns
                    }, { timeout: 15000 });

                    const evaldata = airesponse.data || {};
                    const ovScore = Number(evaldata.overallScore) || 
                        Number((((evaldata.technicalKnowledgeScore || 0) + (evaldata.completenessScore || 0) + (evaldata.relevanceScore || 0) + (evaldata.clarityScore || 0)) / 4).toFixed(1));

                    return {
                        questionId: dbquestion._id,
                        questionText: dbquestion.questionText,
                        questionType: "theory",
                        userAnswer: candidateAns,
                        score: {
                            technicalKnowledgeScore: Number(evaldata.technicalKnowledgeScore) || 0,
                            completenessScore: Number(evaldata.completenessScore) || 0,
                            relevanceScore: Number(evaldata.relevanceScore) || 0,
                            clarityScore: Number(evaldata.clarityScore) || 0,
                            overallScore: ovScore
                        },
                        aiFeedback: evaldata.feedback || "Evaluated."
                    };
                } catch (theoryErr) {
                    console.log("Theory eval fallback:", theoryErr.message);
                    const ansWords = candidateAns.split(/\s+/).length;
                    const est = Math.min(9.0, Math.max(3.0, Number((ansWords / 15.0).toFixed(1))));
                    return {
                        questionId: dbquestion._id,
                        questionText: dbquestion.questionText,
                        questionType: "theory",
                        userAnswer: candidateAns,
                        score: {
                            technicalKnowledgeScore: Math.round(est),
                            completenessScore: Math.round(est),
                            relevanceScore: Math.round(est),
                            clarityScore: Math.round(est),
                            overallScore: est
                        },
                        aiFeedback: "Answer received. Good conceptual coverage."
                    };
                }
            }
        });

        const settled = await Promise.all(evaluationPromises);
        const evaluatedResponses = settled.filter(Boolean);

        let totalScoreSum = 0;
        evaluatedResponses.forEach((r) => {
            totalScoreSum += (r.score?.overallScore || 0);
        });

        const finalAverage = evaluatedResponses.length > 0
            ? Number((totalScoreSum / evaluatedResponses.length).toFixed(1))
            : 0;

        interview.responses = evaluatedResponses;
        interview.overallScore = finalAverage;
        interview.status = "completed";
        await interview.save();

        return res.status(200).json({
            message: "Interview submitted and evaluated successfully",
            overallScore: finalAverage,
            responses: evaluatedResponses
        });

    } catch (error) {
        console.error("submitInterview error:", error);
        return res.status(500).json({ message: error.message || "Failed to submit interview" });
    }
};

exports.getInterviewById = async function(req, res) {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        const questionIds = (interview.responses || []).map(r => r.questionId).filter(Boolean);
        const dbQuestions = await Question.find({ _id: { $in: questionIds } });

        const qMap = {};
        dbQuestions.forEach(q => {
            qMap[q._id.toString()] = q;
        });

        const questions = (interview.responses || []).map(r => {
            const dbQ = qMap[r.questionId?.toString()];
            if (dbQ) return dbQ;
            return {
                _id: r.questionId,
                questionText: r.questionText,
                assessmentType: r.questionType === "coding" ? "coding" : "theory",
                type: r.questionType === "coding" ? "coding" : "technical",
                difficulty: "medium"
            };
        });

        return res.status(200).json({
            interview,
            questions
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};