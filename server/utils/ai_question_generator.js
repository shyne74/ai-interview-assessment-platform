const axios = require("axios");
const Question = require("../models/question_schema");

/**
 * On-demand AI Question Generator
 * Generates tailor-made questions for any role, tech stack, or custom domain
 * and saves them directly as approved questions in the database.
 */
async function generateAndSaveQuestions({
    role = "Software Engineer",
    domain = "General",
    difficulty = "medium",
    count = 5,
    assessmentType = "theory",
    userId = null
}) {
    const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

    const normalizedDifficulty = ["easy", "medium", "hard", "expert"].includes(String(difficulty).toLowerCase())
        ? String(difficulty).toLowerCase()
        : "medium";

    console.log(`[AI Generator] On-demand generation requested for Role: "${role}", Domain: "${domain}", Count: ${count}`);

    try {
        const response = await axios.post(`${FASTAPI_URL}/generate-question`, {
            role: role.trim(),
            domain: domain.trim(),
            difficulty: normalizedDifficulty,
            num_questions: Math.max(1, Number(count) || 5)
        }, {
            timeout: 25000
        });

        const rawQuestions = response.data?.questions || [];
        if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
            console.warn("[AI Generator] FastAPI returned empty questions array.");
            return [];
        }

        const isCodingAssessment = assessmentType === "coding";

        const docsToSave = rawQuestions.map((q) => {
            const isCodeQuestion = isCodingAssessment || q.type === "coding" || q.assessmentType === "coding";
            return {
                questionText: q.questionText || `Explain the core concepts and trade-offs of ${domain} in ${role}.`,
                role: role.trim(),
                domain: domain.trim(),
                difficulty: normalizedDifficulty,
                type: isCodeQuestion ? "coding" : "technical",
                assessmentType: isCodeQuestion ? "coding" : "theory",
                idealAnswer: q.idealAnswer || "Comprehensive explanation demonstrating depth of understanding and practical application.",
                keypoint: Array.isArray(q.keypoint) && q.keypoint.length > 0 ? q.keypoint : [domain, role, "Best Practices"],
                maxscore: Number(q.maxscore) || 10,
                timeLimit: Number(q.timeLimit) || 180,
                status: "approved",
                isAIGenerated: true,
                createdBy: userId || null
            };
        });

        const saved = await Question.insertMany(docsToSave);
        console.log(`[AI Generator] Successfully generated and stored ${saved.length} questions for "${role} - ${domain}".`);
        return saved;

    } catch (err) {
        console.error("[AI Generator Error] Failed on-demand generation:", err.response?.data || err.message);
        return [];
    }
}

module.exports = {
    generateAndSaveQuestions
};
