const express = require("express");
const router = express.Router();
const { startAdaptiveInterview, getNextQuestion, submitAdaptiveAnswer, getAdaptiveSession, logAdaptiveViolation, adaptiveHeartbeat } = require("../controller/adaptive_controller");
const { protect } = require("../middleware/authmiddleware");

router.use(protect);

router.post("/start", startAdaptiveInterview);
router.get("/:id", getAdaptiveSession);
router.get("/:id/next", getNextQuestion);
router.post("/:id/submit", submitAdaptiveAnswer);
router.post("/:id/violation", logAdaptiveViolation);
router.post("/:id/heartbeat", adaptiveHeartbeat);

module.exports = router;


