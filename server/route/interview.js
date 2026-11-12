const express = require("express")
const router = express.Router()

const {
    startInterview,
    submitInterview,
    getInterviewById,
    logViolation,
    heartbeat,
    getActiveInterview,
    saveInterviewProgress,
    getPendingInterviews,
    startPendingInterview,
    assignInterview
} = require("../controller/interviewer")
const { protect } = require("../middleware/authmiddleware")

router.get("/active", protect, getActiveInterview)
router.get("/pending", protect, getPendingInterviews)
router.post("/assign", protect, assignInterview)
router.post("/:id/start", protect, startPendingInterview)
router.post("/:id/progress", protect, saveInterviewProgress)
router.post("/", protect, startInterview)
router.get("/:id", protect, getInterviewById)
router.post("/:id/submit", protect, submitInterview)
router.post("/:id/violation", protect, logViolation)
router.post("/:id/heartbeat", protect, heartbeat)

module.exports = router