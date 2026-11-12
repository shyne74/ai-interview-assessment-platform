const ResultAnalysis = require("../models/result_schema");
const Interview = require("../models/interview_schema");
const Question = require("../models/question_schema");
const Role = require("../models/role_schema");
const axios = require("axios");

exports.analyzeResult = async function(req, res) {
    try {
        const { id } = req.params;

        const interview = await Interview.findOne({
            _id: id,
            candidateId: req.user._id
        });

        if (!interview) {
            return res.status(404).json({ message: "interview not found" });
        }

        if (interview.status !== "completed" && interview.status !== "evaluated") {
            return res.status(400).json({ message: "please complete the interview before" });
        }

        const existingAnalysis = await ResultAnalysis.findOne({
            interviewId: interview._id
        });

        if (existingAnalysis) {
            return res.status(200).json({ message: "analyse already done", result: existingAnalysis });
        }

        const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

        const analysisData = interview.responses.map(function(response) {
            return {
                questionText: response.questionText,
                userAnswer: response.userAnswer,
                score: {
                    technicalKnowledgeScore: response.score?.technicalKnowledgeScore || 0,
                    completenessScore: response.score?.completenessScore || 0,
                    relevanceScore: response.score?.relevanceScore || 0,
                    clarityScore: response.score?.clarityScore || 0,
                    overallScore: response.score?.overallScore || 0
                },
                aiFeedback: response.aiFeedback
            };
        });

        const payload = {
            response: analysisData,
            roleTitle: interview.roleTitle,
            domain: interview.domain
        };

        console.log("SENDING TO FASTAPI:", JSON.stringify(payload, null, 2));

        const aiResponse = await axios.post(`${FASTAPI_URL}/analyze-results`, payload);
        const analysis = aiResponse.data;

        const resultAnalysis = await ResultAnalysis.create({
            interviewId: interview._id,
            candidateId: interview.candidateId,
            roleTitle: interview.roleTitle,
            domain: interview.domain,
            overallScore: interview.overallScore,
            skillBreakdown: analysis.skillBreakdown || {},
            strongAreas: analysis.strongAreas || [],
            weakAreas: analysis.weakAreas || [],
            performanceTrend: analysis.performanceTrend || "",
            summaryFeedback: analysis.summaryFeedback || "",
            plagiarismReport: interview.plagiarismSummary || undefined
        });

        return res.status(201).json({ message: "result analysis done successfully", result: resultAnalysis });
    } catch (err) {
        console.error("RESULT ANALYSIS ERROR:", err.response?.data || err.message);
        return res.status(500).json({
            message: err.response?.data || err.message
        });
    }
};

exports.getresults = async function(req, res) {
    try {
        const { id } = req.params;
        const mongoose = require("mongoose");
        const query = {};
        if (mongoose.Types.ObjectId.isValid(id)) {
            query.$or = [{ interviewId: id }, { _id: id }];
        } else {
            query.interviewId = id;
        }
        if (req.user && req.user.role !== "admin") {
            query.candidateId = req.user._id;
        }

        const result = await ResultAnalysis.findOne(query).populate("interviewId", "plagiarismSummary integrity responses overallScore roleTitle domain");
        if (!result) {
            return res.status(400).json({ message: "there is no result available" });
        }
        const resultObj = result.toObject();
        if (!resultObj.plagiarismReport && resultObj.interviewId?.plagiarismSummary) {
            resultObj.plagiarismReport = resultObj.interviewId.plagiarismSummary;
        }
        return res.status(200).json({ result: resultObj });
    } catch (err) {
        return res.status(500).json({ message: "couldnt get the result for interview" });
    }
};

exports.getallresults = async function(req, res) {
    try {
        const results = await ResultAnalysis.find({
            candidateId: req.user._id
        }).sort({ createdAt: -1 });
        return res.status(200).json({ results });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

exports.getAllResultsAdmin = async function(req, res) {
    try {
        const results = await ResultAnalysis.find()
            .populate("candidateId", "username email")
            .populate("interviewId")
            .sort({ createdAt: -1 });
        return res.status(200).json({ results });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getAnalytics = async function(req, res) {
    try {
        const results = await ResultAnalysis.find().populate("interviewId", "violations plagiarismSummary");
        const totalResults = results.length;

        const averageScore = totalResults
            ? Number((results.reduce((sum, r) => sum + (r.overallScore || 0), 0) / totalResults).toFixed(1))
            : 0;

        // Calculate real flagged integrity count
        let flaggedIntegrityCount = 0;
        results.forEach(r => {
            const plag = r.plagiarismReport || r.interviewId?.plagiarismSummary || {};
            const risk = (plag.riskLevel || plag.status || "").toLowerCase();
            const flaggedCount = plag.flaggedCount || 0;
            const violations = r.interviewId?.violations?.length || 0;

            if (risk.includes("high") || risk.includes("moderate") || risk.includes("suspicious") || flaggedCount > 0 || violations >= 3) {
                flaggedIntegrityCount++;
            }
        });

        // Calculate real 8-week volume
        const now = Date.now();
        const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        const weeklyBuckets = [0, 0, 0, 0, 0, 0, 0, 0];

        results.forEach(r => {
            const createdAt = new Date(r.createdAt || Date.now()).getTime();
            const weeksAgo = Math.floor((now - createdAt) / ONE_WEEK_MS);
            if (weeksAgo >= 0 && weeksAgo < 8) {
                // weeklyBuckets[7] is most recent week (W8), weeklyBuckets[0] is 7 weeks ago (W1)
                const index = 7 - weeksAgo;
                weeklyBuckets[index]++;
            }
        });

        const maxInBucket = Math.max(...weeklyBuckets, 1);
        const weeklyVolume = weeklyBuckets.map((count, idx) => ({
            week: `W${idx + 1}`,
            count,
            height: Math.max(16, Math.round((count / maxInBucket) * 140))
        }));

        // Calculate score tier distribution
        const scoreDistribution = {
            exceptional: results.filter(r => (r.overallScore || 0) >= 8.5).length,
            proficient: results.filter(r => (r.overallScore || 0) >= 7.0 && (r.overallScore || 0) < 8.5).length,
            competent: results.filter(r => (r.overallScore || 0) >= 5.0 && (r.overallScore || 0) < 7.0).length,
            needsWork: results.filter(r => (r.overallScore || 0) < 5.0).length
        };

        // Calculate pass rate (overallScore >= 7.0)
        const passedCount = results.filter(r => (r.overallScore || 0) >= 7.0).length;
        const passRate = totalResults ? Number(((passedCount / totalResults) * 100).toFixed(1)) : 0;

        // Calculate domain averages
        const domainSums = {};
        const domainCounts = {};
        results.forEach(r => {
            const d = r.domain || r.roleTitle || "General";
            domainSums[d] = (domainSums[d] || 0) + (r.overallScore || 0);
            domainCounts[d] = (domainCounts[d] || 0) + 1;
        });
        const domainAverages = {};
        Object.keys(domainCounts).forEach(d => {
            domainAverages[d] = Number((domainSums[d] / domainCounts[d]).toFixed(1));
        });

        // Find roles with low approved question inventory (< 5)
        const allRoles = await Role.find({});
        const lowInventoryRoles = [];
        for (const role of allRoles) {
            const count = await Question.countDocuments({
                role: { $regex: new RegExp(`^${role.title}$`, "i") },
                status: "approved"
            });
            if (count < 5) {
                lowInventoryRoles.push({ role: role.title, count });
            }
        }

        return res.status(200).json({
            totalResults,
            totalInterviews: totalResults,
            averageScore,
            integrityFlags: flaggedIntegrityCount,
            flaggedIntegrityCount,
            passRate,
            weeklyVolume,
            domainAverages,
            scoreDistribution,
            lowInventoryRoles
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};
