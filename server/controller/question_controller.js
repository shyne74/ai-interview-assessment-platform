const Question = require("../models/question_schema");
const cheerio = require("cheerio");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const { cleanCodeforcesStatement } = require("../utils/statement_cleaner");
const { seedCuratedCodeforces } = require("../utils/codeforces_curated_seed");

function canonicalRole(r) {
    if (!r || typeof r !== "string") return "Software Engineer";
    let trimmed = r.trim().replace(/\s+/g, " ");
    let lower = trimmed.toLowerCase();
    
    if (lower === "backend developer" || lower === "backend dev") return "Backend Developer";
    if (lower === "full stack developer" || lower === "fullstack developer" || lower === "full stack dev") return "Full Stack Developer";
    if (lower === "devops engineer" || lower === "devops") return "DevOps Engineer";
    if (lower === "cloud engineer" || lower === "cloud") return "Cloud Engineer";
    if (lower === "software develope" || lower === "software developer") return "Software Developer";
    if (lower === "software engineer" || lower === "swe") return "Software Engineer";
    if (lower === "system architect" || lower === "solutions architect") return "System Architect";
    if (lower === "ai/ml engineer" || lower === "ai engineer" || lower === "ml engineer") return "AI/ML Engineer";
    if (lower === "junior web developer" || lower === "web developer") return "Junior Web Developer";
    if (lower === "support engineer" || lower === "it support") return "Support Engineer";
    if (lower === "coding") return "Coding";
    if (lower === "philosophy") return "Philosophy";
    if (lower === "unknown") return "General Assessment";

    return trimmed
        .toLowerCase()
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

function canonicalDomain(domain, questionText = "", role = "") {
    if (!domain || typeof domain !== "string") return "General";
    let d = domain.trim();
    let lower = d.toLowerCase();

    if (lower === "express" || lower === "expressjs" || lower === "express.js") return "Express.js";
    if (lower === "react" || lower === "reactjs" || lower === "react.js") return "React";
    if (lower === "node" || lower === "nodejs" || lower === "node.js") return "Node.js";
    if (lower === "algorithm" || lower === "algorithms") return "Algorithms";
    if (lower === "python") return "Python";
    if (lower === "database" || lower === "databases") return "Database";
    if (lower === "document analysis") return "Document Analysis";
    if (lower === "generative ai" || lower === "genai") return "Generative AI";
    if (lower === "support engineering") return "Support Engineering";
    if (lower === "system design & microservices") return "System Design & Microservices";
    if (lower === "node.js & mongodb") return "Node.js & MongoDB";
    if (lower === "javascript & html/css") return "JavaScript & HTML/CSS";
    if (lower === "react & node.js") return "React & Node.js";

    if (d.includes(",") || role.toLowerCase().includes("phil") || lower.includes("philosophy")) {
        const text = (questionText + " " + d).toLowerCase();
        if (text.includes("putnam") || text.includes("twin earth") || text.includes("semantic") || text.includes("language and meaning")) {
            return "Philosophy of Language & Semantics";
        }
        if (text.includes("aquinas") || text.includes("five ways") || text.includes("scholasticism") || text.includes("theology") || text.includes("god")) {
            return "Metaphysics & Theology";
        }
        if (text.includes("natural rights") || text.includes("two treatises") || text.includes("state of nature") || text.includes("political")) {
            return "Political Philosophy & Natural Rights";
        }
        if (text.includes("locke") || text.includes("tabula rasa") || text.includes("empiric") || text.includes("epistemology") || text.includes("innate") || text.includes("primary and secondary")) {
            return "Epistemology & Empiricism";
        }
        if (text.includes("plato") || text.includes("aristotle") || text.includes("socrates") || text.includes("cave") || text.includes("forms") || text.includes("greek") || text.includes("pre-socratic")) {
            return "Ancient Greek Philosophy";
        }
        let firstTopic = d.split(",")[0].trim();
        if (firstTopic.length > 35) firstTopic = firstTopic.slice(0, 35).trim();
        return firstTopic;
    }

    return d
        .replace(/\s+/g, " ")
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

exports.canonicalRole = canonicalRole;
exports.canonicalDomain = canonicalDomain;

exports.createquestion = async function(req, res) {
    try {
        const { questionText, domain, role, difficulty, type, idealAnswer, keypoint, maxscore, timeLimit, isAIGenerated, status, createdBy } = req.body

        if (!questionText || !domain || !role || !idealAnswer) {
            return res.status(400).json({ message: "fields cannot be empty" })
        }
        const question = await Question.create({
            questionText,
            domain: canonicalDomain(domain, questionText, role),
            role: canonicalRole(role),
            difficulty: difficulty || "easy",
            type: type || "technical",
            idealAnswer,
            keypoint: keypoint || [],
            maxscore: maxscore || 10,
            timeLimit: timeLimit || 180,
            isAIGenerated: false,
            status: "approved",
            createdBy: req.user._id
        })
        return res.status(201).json({ message: "question created successfully" })
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}

exports.getAllQuestion = async function(req, res) {
    try {
        const { domain, role, status } = req.query
        let query = {}

        if (role) query.role = role
        if (status) query.status = status
        if (domain) query.domain = domain

        const question = await Question.find(query).populate(
            "createdBy",
            "username email"
        );
        return res.json(question)
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}

exports.updatedQuestion = async function(req, res) {
    try {
        const question = await Question.findById(req.params.id)
        if (!question) {
            return res.status(404).json({ message: "question not found!" })
        }

        const updatedQuestion = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

        return res.json({ message: "question updated successfully", question: updatedQuestion })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
};

exports.deletequestion = async function(req, res) {
    try {
        const question = await Question.findById(req.params.id)
        if (!question) {
            return res.status(404).json({ message: "question not found" })
        }
        await question.deleteOne()
        return res.status(200).json({ message: "question deleted succesfully" })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

exports.generatequestion = async function(req, res) {
    try {
        const { role, domain, difficulty = "medium", num_question = 5 } = req.body

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000"

        const response = await axios.post(`${FASTAPI_URL}/generate-question`, {
            role,
            domain,
            difficulty: difficulty || "medium",
            num_questions: num_question,
            num_question: num_question
        })
        const aiGeneratedQuestions = response.data.questions;

        const questionToSave = aiGeneratedQuestions.map(function(q) {
            return {
                questionText: q.questionText,
                role: role,
                domain: domain,
                type: q.type || "technical",
                difficulty: difficulty,
                timeLimit: q.timeLimit || 180,
                maxscore: q.maxscore || 10,
                idealAnswer: q.idealAnswer,
                isAIGenerated: true,
                status: "pending",
                createdBy: req.user._id
            }
        })
        const savedQuestions = await Question.insertMany(questionToSave);
        return res.status(201).json({
            message: `${savedQuestions.length} AI questions generated successfully and pending approval`,
            question: savedQuestions
        })
    } catch (error) {
        return res.status(500).json({
            message: "Failed to generate AI questions via FastAPI",
            error: error.response?.data || error.message,
        });
    }
};

exports.approvequestion = async function(req, res) {
    try {
        const { id } = req.params
        const question = await Question.findByIdAndUpdate(
            id,
            { status: "approved" },
            { new: true, runValidators: true }
        )
        if (!question) {
            return res.status(404).json({ message: "question not found" })
        }
        return res.status(200).json({ message: "question approved successfully", question })
    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

exports.rejectquestion = async function(req, res) {
    try {
        const { id } = req.params

        const question = await Question.findByIdAndUpdate(
            id,
            { status: "rejected" },
            { new: true, runValidators: true }
        )
        if (!question) {
            return res.status(404).json({ message: "question could not be found" })
        }
        return res.status(200).json({ message: "question rejected successfully", question })

    } catch (err) {
        return res.status(500).json({ message: err.message })
    }
}

exports.getcodeforcesproblem = async function(req, res) {
    try {
        const response = await axios.get(
            "https://codeforces.com/api/problemset.problems"
        );
        const problems = response.data.result.problems;
        return res.status(200).json({
            problems: problems
        });
    } catch (error) {
        return res.status(400).json({ message: "failed to get the problems", error: error.message })
    }
}

exports.getcodeforceproblembyid = async function(req, res) {
    try {
        const { contestId, index } = req.params
        const response = await axios.get(
            "https://codeforces.com/api/problemset.problems"
        );

        const problems = response.data.result.problems;
        const problem = problems.find(function(p) {
            return p.contestId == contestId && p.index == index;
        });
        if (!problem) {
            return res.status(404).json({ message: "codeforce problem not found" })
        }
        return res.status(200).json({
            problem: problem
        });

    } catch (error) {
        return res.status(400).json({ message: "error fetching the problem", error: error.message })
    }
}

exports.getcodeforcesstatement = async function(req, res) {
    try {
        const { contestId, index } = req.params
        const response = await axios.get(
            `https://codeforces.com/problemset/problem/${contestId}/${index}`,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9"
                }
            }
        );
        const $ = cheerio.load(response.data);

        const statement = $(".problem-statement").text().trim();

        return res.status(200).json({
            contestId: contestId,
            index: index,
            statement: statement
        });
    } catch (error) {
        return res.status(400).json({
            message: "failed to display the problem",
            error: error.message,
            status: error.response?.status
        })
    }
}

exports.importCodeforcesProblem = async function(req, res) {
    try {
        const {
            contestId,
            index,
            role,
            domain,
            difficulty = "medium"
        } = req.body

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000"

        const response = await axios.post(
            `${FASTAPI_URL}/get-codeforces-statement`,
            {
                contestId,
                index
            }
        )

        const problem = response.data

        if (!problem || !problem.statement || !problem.statement.trim()) {
            return res.status(400).json({
                message: "Problem statement is empty or could not be parsed",
                error: "Invalid problem statement"
            });
        }

        if (!problem.title || problem.title === "Unknown Problem") {
            return res.status(400).json({
                message: "Problem title is invalid or could not be parsed",
                error: "Invalid problem title"
            });
        }

        const rawTimeLimit = typeof problem.timeLimit === "object" && problem.timeLimit !== null
            ? problem.timeLimit.value
            : problem.timeLimit;

        const rawMemoryLimit = typeof problem.memoryLimit === "object" && problem.memoryLimit !== null
            ? problem.memoryLimit.value
            : problem.memoryLimit;

        const timeLimitNum = Number(rawTimeLimit);
        const memoryLimitNum = Number(rawMemoryLimit);

        if (isNaN(timeLimitNum) || timeLimitNum <= 0) {
            return res.status(400).json({
                message: "Invalid time limit received from scraper",
                error: "Invalid time limit"
            });
        }

        if (isNaN(memoryLimitNum) || memoryLimitNum <= 0) {
            return res.status(400).json({
                message: "Invalid memory limit received from scraper",
                error: "Invalid memory limit"
            });
        }

        const cleanStatementText = cleanCodeforcesStatement(problem.statement);
        const cleanInput = cleanCodeforcesStatement(problem.inputSpecification || "");
        const cleanOutput = cleanCodeforcesStatement(problem.outputSpecification || "");
        const cleanSamples = Array.isArray(problem.samples) ? problem.samples.map(s => ({
            input: cleanCodeforcesStatement(s.input || ""),
            output: cleanCodeforcesStatement(s.output || "")
        })) : [];

        const targetRole = canonicalRole(role || "Coding");

        const question = await Question.create({
            questionText: cleanStatementText,
            role: targetRole,
            domain: canonicalDomain(domain || "Algorithms", cleanStatementText, targetRole),
            difficulty: difficulty,
            type: "coding",
            assessmentType: "coding",
            idealAnswer: "Optimal algorithmic solution with time and space complexity considerations.",
            keypoint: [],
            maxscore: difficulty === "hard" ? 15 : difficulty === "medium" ? 12 : 10,
            timeLimit: 180,
            isAIGenerated: false,
            status: "approved",
            createdBy: req.user._id,
            codingData: {
                contestId: Number(problem.contestId),
                index: String(problem.index),
                problemUrl: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
                inputSpecification: cleanInput,
                outputSpecification: cleanOutput,
                samples: cleanSamples,
                memoryLimit: memoryLimitNum,
                timeLimit: timeLimitNum
            }
        })

        return res.status(201).json({
            message: "Codeforces problem imported successfully with clean formatting",
            question: question
        })

    } catch (error) {
        const errorDetail = error.response?.data?.detail || error.response?.data?.message || error.message;
        return res.status(error.response?.status || 500).json({
            message: "failed to import Codeforces problem",
            error: errorDetail
        })
    }
}

exports.seedCodeforcesProblems = async function(req, res) {
    try {
        const targetRole = canonicalRole(req.body?.role || "Coding");
        const result = await seedCuratedCodeforces(req.user?._id, targetRole);
        return res.status(200).json({
            message: `Successfully added ${result.insertedCount} curated Codeforces coding challenges to Question Bank!`,
            ...result
        });
    } catch (error) {
        return res.status(500).json({
            message: "Failed to seed curated Codeforces problems",
            error: error.message
        });
    }
}

exports.getCodingQuestions = async function(req, res) {
    try {
        const questions = await Question.find({
            assessmentType: "coding"
        })

        return res.status(200).json({
            questions: questions
        })

    } catch (error) {
        return res.status(500).json({
            message: "failed to get coding questions",
            error: error.message
        })
    }
}

exports.deleteCodingQuestion = async function(req, res) {
    try {
        const { id } = req.params

        const question = await Question.findOneAndDelete({
            _id: id,
            assessmentType: "coding"
        })

        if (!question) {
            return res.status(404).json({
                message: "coding question not found"
            })
        }

        return res.status(200).json({
            message: "coding question deleted successfully"
        })

    } catch (error) {
        return res.status(500).json({
            message: "failed to delete coding question",
            error: error.message
        })
    }
}

exports.analyzePdfContent = async function(req, res) {
    try {
        if (!req.file) return res.status(400).json({ message: "No PDF file uploaded" });

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
        const formData = new FormData();
        formData.append("file", fs.createReadStream(req.file.path));

        const response = await axios.post(`${FASTAPI_URL}/analyze-pdf-content`, formData, {
            headers: formData.getHeaders(),
            maxContentLength: 50 * 1024 * 1024,
            maxBodyLength: 50 * 1024 * 1024
        });

        // cleanup temp file
        try { fs.unlinkSync(req.file.path); } catch (_) {}

        return res.status(200).json(response.data);
    } catch (error) {
        try { if (req.file) fs.unlinkSync(req.file.path); } catch (_) {}
        console.error("PDF analysis error:", error.response?.data || error.message);
        return res.status(500).json({
            message: "Failed to analyze PDF content",
            error: error.response?.data || error.message
        });
    }
};

function sanitizeQuestionDoc(q, role, domain, difficulty, assessmentType, userId) {
    let reqAssess = String(assessmentType || "theory").toLowerCase();
    
    let normalizedAssessmentType = "theory";
    let normalizedType = "technical";

    if (reqAssess === "coding") {
        normalizedAssessmentType = "coding";
        normalizedType = "coding";
    } else if (reqAssess === "theory") {
        normalizedAssessmentType = "theory";
        normalizedType = "technical";
    } else {
        // Mixed mode: respect question-level classification
        let rawType = String(q.type || "technical").toLowerCase();
        let rawAssess = String(q.assessmentType || "theory").toLowerCase();

        if (rawType.includes("cod") || rawAssess.includes("cod")) {
            normalizedAssessmentType = "coding";
            normalizedType = "coding";
        } else if (rawType.includes("behav")) {
            normalizedAssessmentType = "theory";
            normalizedType = "behavioral";
        } else if (rawType.includes("system") || rawType.includes("design")) {
            normalizedAssessmentType = "theory";
            normalizedType = "system-design";
        } else {
            normalizedAssessmentType = "theory";
            normalizedType = "technical";
        }
    }

    let rawDiff = String(q.difficulty || difficulty || "medium").toLowerCase();
    let normalizedDiff = "medium";
    if (rawDiff.includes("easy")) normalizedDiff = "easy";
    else if (rawDiff.includes("hard")) normalizedDiff = "hard";
    else if (rawDiff.includes("expert") || rawDiff.includes("lead")) normalizedDiff = "expert";

    const cleanQText = q.questionText || "Technical interview question";
    const cleanRole = canonicalRole(q.role || role || "Software Engineer");
    const cleanDomain = canonicalDomain(q.domain || domain || "General", cleanQText, cleanRole);

    return {
        questionText: cleanQText,
        role: cleanRole,
        domain: cleanDomain,
        type: normalizedType,
        assessmentType: normalizedAssessmentType,
        difficulty: normalizedDiff,
        idealAnswer: q.idealAnswer || "Conceptual accuracy and logical depth expected.",
        keypoint: Array.isArray(q.keypoint) ? q.keypoint : (q.keypoint ? [String(q.keypoint)] : []),
        maxscore: Number(q.maxscore) || 10,
        timeLimit: Number(q.timeLimit) || 180,
        isAIGenerated: true,
        status: "approved",
        createdBy: userId
    };
}

exports.generateFromTopics = async function(req, res) {
    try {
        const {
            pdfText = "",
            selectedTopics = [],
            role = "Software Engineer",
            domain = "General",
            difficulty = "medium",
            num_questions = 5,
            assessmentType = "theory",
            customPrompt = "",
            autoSave = true
        } = req.body;

        const cleanTargetRole = canonicalRole(role);
        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

        const response = await axios.post(`${FASTAPI_URL}/generate-questions-from-topics`, {
            pdfText,
            selectedTopics,
            role: cleanTargetRole,
            domain,
            difficulty,
            num_questions: Number(num_questions),
            assessmentType,
            customPrompt
        });

        const generatedQuestions = response.data.questions || [];

        if (autoSave && generatedQuestions.length > 0) {
            const docsToSave = generatedQuestions.map((q, idx) => {
                let assignedDomain = q.domain;
                if (!assignedDomain || assignedDomain.includes(",") || assignedDomain === "General") {
                    if (selectedTopics.length > 0) {
                        assignedDomain = selectedTopics[idx % selectedTopics.length];
                    } else {
                        assignedDomain = domain;
                    }
                }
                return sanitizeQuestionDoc(q, cleanTargetRole, assignedDomain, difficulty, assessmentType, req.user._id);
            });

            const saved = await Question.insertMany(docsToSave);
            return res.status(201).json({
                message: `Generated and added ${saved.length} questions to ${cleanTargetRole} Question Bank!`,
                questions: saved
            });
        }

        return res.status(200).json({ questions: generatedQuestions });
    } catch (error) {
        console.error("Generate from topics error:", error.response?.data || error.message);
        return res.status(500).json({
            message: "Failed to generate questions from topics",
            error: error.response?.data || error.message
        });
    }
};

exports.analyzeAndGenerateJD = async function(req, res) {
    try {
        let jdText = req.body.jdText || "";
        const {
            roleOverride,
            num_questions = 5,
            assessmentType = "mixed",
            difficulty = "medium"
        } = req.body;

        if (req.file) {
            // Read file if uploaded
            try {
                const buffer = fs.readFileSync(req.file.path);
                jdText = buffer.toString("utf-8");
            } catch (e) {
                console.log("Could not read JD text file directly:", e);
            } finally {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
        }

        if (!jdText.trim()) {
            return res.status(400).json({ message: "Job Description text or document is required" });
        }

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

        const response = await axios.post(`${FASTAPI_URL}/analyze-and-generate-jd`, {
            jdText,
            roleOverride,
            num_questions: Number(num_questions),
            assessmentType,
            difficulty
        });

        const jdData = response.data;
        const targetRole = canonicalRole(roleOverride || jdData.roleTitle || "Backend Developer");
        const primaryDomain = canonicalDomain(jdData.primaryDomain || "Backend Systems", "", targetRole);
        const generatedQuestions = jdData.questions || [];

        // Save generated questions directly to the Question Bank under this role
        let savedQuestions = [];
        if (generatedQuestions.length > 0) {
            const docsToSave = generatedQuestions.map(q =>
                sanitizeQuestionDoc(q, targetRole, primaryDomain, difficulty, assessmentType, req.user._id)
            );

            savedQuestions = await Question.insertMany(docsToSave);
        }

        return res.status(201).json({
            message: `Successfully analyzed JD and added ${savedQuestions.length} questions to ${targetRole} folder!`,
            roleTitle: targetRole,
            seniority: jdData.seniority,
            primaryDomain: primaryDomain,
            techStack: jdData.techStack || [],
            summary: jdData.summary,
            questions: savedQuestions.length > 0 ? savedQuestions : generatedQuestions
        });

    } catch (error) {
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (_) {}
        }
        console.error("JD Analysis error:", error.response?.data || error.message);
        return res.status(500).json({
            message: "Failed to analyze Job Description",
            error: error.response?.data || error.message
        });
    }
};

exports.getFolderSummary = async function(req, res) {
    try {
        const questions = await Question.find({});

        // Group by canonical role and domain
        const roleMap = {};

        questions.forEach(q => {
            const role = canonicalRole(q.role || "General Roles");
            const domain = canonicalDomain(q.domain || "General Topics", q.questionText, role);

            if (!roleMap[role]) {
                roleMap[role] = {
                    role: role,
                    totalQuestions: 0,
                    approvedCount: 0,
                    pendingCount: 0,
                    codingCount: 0,
                    theoryCount: 0,
                    domains: {}
                };
            }

            roleMap[role].totalQuestions += 1;
            if (q.status === "approved") roleMap[role].approvedCount += 1;
            if (q.status === "pending") roleMap[role].pendingCount += 1;

            if (q.assessmentType === "coding" || q.type === "coding") {
                roleMap[role].codingCount += 1;
            } else {
                roleMap[role].theoryCount += 1;
            }

            if (!roleMap[role].domains[domain]) {
                roleMap[role].domains[domain] = {
                    name: domain,
                    count: 0,
                    codingCount: 0,
                    theoryCount: 0
                };
            }

            roleMap[role].domains[domain].count += 1;
            if (q.assessmentType === "coding" || q.type === "coding") {
                roleMap[role].domains[domain].codingCount += 1;
            } else {
                roleMap[role].domains[domain].theoryCount += 1;
            }
        });

        const folders = Object.values(roleMap).map(r => ({
            ...r,
            domains: Object.values(r.domains)
        }));

        return res.status(200).json({
            folders,
            totalGlobalQuestions: questions.length
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.consolidateFolders = async function(req, res) {
    try {
        const questions = await Question.find({});
        let updatedCount = 0;
        
        for (const q of questions) {
            const newRole = canonicalRole(q.role);
            const newDomain = canonicalDomain(q.domain, q.questionText, q.role);
            
            if (q.role !== newRole || q.domain !== newDomain) {
                q.role = newRole;
                q.domain = newDomain;
                await q.save();
                updatedCount++;
            }
        }
        
        return res.status(200).json({
            message: `Successfully consolidated ${updatedCount} questions into clean, unified folders.`,
            totalQuestions: questions.length,
            migratedCount: updatedCount
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.generateQuestionsFromPDF = exports.analyzePdfContent;


