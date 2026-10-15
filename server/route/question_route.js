const express = require("express")
const router = express.Router()
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
} = require("../controller/question_controller.js")

const { protect, authorize } = require("../middleware/authmiddleware")

router.use(protect, authorize("admin"))

router.get("/", getAllQuestion)
router.get("/folders/summary", getFolderSummary)
router.post("/consolidate", consolidateFolders)
router.post("/seed-codeforces", seedCodeforcesProblems)
router.post("/", createquestion)

router.post("/generate", generatequestion)
router.post("/generate-from-pdf", upload.single("pdf"), generateQuestionsFromPDF)
router.post("/analyze-pdf", upload.single("pdf"), analyzePdfContent)
router.post("/generate-from-topics", generateFromTopics)
router.post("/analyze-jd", upload.single("jdFile"), analyzeAndGenerateJD)

router.patch("/:id/approve", approvequestion)
router.patch("/:id/rejected", rejectquestion)

router.get("/codeforces", getcodeforcesproblem)
router.get("/codeforces/:contestId/:index", getcodeforceproblembyid)
router.get("/codeforces/:contestId/:index/statement", getcodeforcesstatement)
router.post("/import-codeforces", importCodeforcesProblem)
router.get("/coding", getCodingQuestions)
router.delete("/coding/:id", deleteCodingQuestion)

router.put("/:id", updatedQuestion)
router.delete("/:id", deletequestion)

module.exports = router
