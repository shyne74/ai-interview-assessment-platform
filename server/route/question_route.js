const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
    createquestion,
    getAllQuestion,
    updatedQuestion,
    deletequestion,
    generatequestion,
    rejectquestion,
    approvequestion,
    getcodeforcesproblem,
    getcodeforceproblembyid,
    getcodeforcesstatement,
    importCodeforcesProblem,
    getCodingQuestions,
    deleteCodingQuestion,
    generateQuestionsFromPDF,
    analyzePdfContent,
    generateFromTopics,
    analyzeAndGenerateJD,
    getFolderSummary,
    consolidateFolders,
    seedCodeforcesProblems
} = require("../controller/question_controller.js");

const { protect, authorize } = require("../middleware/authmiddleware");

// ==========================================
// Candidate & Admin Accessible (Protected Auth)
// Enables PDF assimilation & JD assimilation for candidates too
// ==========================================
router.post("/generate", protect, generatequestion);
router.post("/generate-from-pdf", protect, upload.single("pdf"), generateQuestionsFromPDF);
router.post("/analyze-pdf", protect, upload.single("pdf"), analyzePdfContent);
router.post("/generate-from-topics", protect, generateFromTopics);
router.post("/analyze-jd", protect, upload.single("jdFile"), analyzeAndGenerateJD);
router.get("/codeforces/:contestId/:index", protect, getcodeforceproblembyid);
router.get("/codeforces/:contestId/:index/statement", protect, getcodeforcesstatement);

// ==========================================
// Administration Only Routes (Admin RBAC Guard)
// ==========================================
router.get("/", protect, authorize("admin"), getAllQuestion);
router.get("/folders/summary", protect, authorize("admin"), getFolderSummary);
router.post("/consolidate", protect, authorize("admin"), consolidateFolders);
router.post("/seed-codeforces", protect, authorize("admin"), seedCodeforcesProblems);
router.post("/", protect, authorize("admin"), createquestion);

router.patch("/:id/approve", protect, authorize("admin"), approvequestion);
router.patch("/:id/rejected", protect, authorize("admin"), rejectquestion);

router.get("/codeforces", protect, authorize("admin"), getcodeforcesproblem);
router.post("/import-codeforces", protect, authorize("admin"), importCodeforcesProblem);
router.get("/coding", protect, authorize("admin"), getCodingQuestions);
router.delete("/coding/:id", protect, authorize("admin"), deleteCodingQuestion);

router.put("/:id", protect, authorize("admin"), updatedQuestion);
router.delete("/:id", protect, authorize("admin"), deletequestion);

module.exports = router;
