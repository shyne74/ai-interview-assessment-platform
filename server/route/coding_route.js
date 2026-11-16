const express = require("express");

const router = express.Router();
const { protect } = require("../middleware/authmiddleware");
const {
    submitCode,
    getSubmissions,
    getProblemSubmissions,
    getCodingMeta,
    getCodingProblems,
    getCodingProblemById,
    getUserCodingProgress
} = require("../controller/coding_controller.js");

router.get("/meta", protect, getCodingMeta);
router.get("/progress", protect, getUserCodingProgress);
router.get("/problems", protect, getCodingProblems);
router.get("/problems/:id", protect, getCodingProblemById);
router.post("/submit", protect, submitCode);
router.get("/submissions", protect, getSubmissions);
router.get("/submissions/:problemId", protect, getProblemSubmissions);

module.exports = router;
