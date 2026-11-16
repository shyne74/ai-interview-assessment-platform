const express = require("express");
const router = express.Router();
const {
    getMailStatus,
    sendTestMailEndpoint,
    createBatch,
    listBatches,
    getBatchById,
    updateBatch,
    validateCandidates,
    dispatchBatchInvites,
    copyInviteCredentials,
    resendCandidateInvite,
    remindUnstartedCandidates,
    unassignCandidate,
    closeBatch,
    getCandidateTimeline,
    updateCandidateInterview,
    exportBatchCsv
} = require("../controller/batch_controller");
const { protect, authorize } = require("../middleware/authmiddleware");

// All batch routes are restricted to admin
router.use(protect, authorize("admin"));

// Mail diagnostics & testing routes (must be before :id)
router.get("/mail-status", getMailStatus);
router.post("/mail-test", sendTestMailEndpoint);

// Batch CRUD & lifecycle routes
router.post("/", createBatch);
router.get("/", listBatches);
router.post("/validate", validateCandidates);
router.get("/:id", getBatchById);
router.put("/:id", updateBatch);
router.post("/:id/send", dispatchBatchInvites);
router.patch("/:id/close", closeBatch);
router.post("/:id/remind-unstarted", remindUnstartedCandidates);

// Candidate-specific operations
router.post("/:id/candidates/:candidateEmail/copy-invite", copyInviteCredentials);
router.post("/:id/candidates/:candidateEmail/resend", resendCandidateInvite);
router.delete("/:id/candidates/:candidateEmail", unassignCandidate);
router.get("/:id/candidates/:candidateEmail/timeline", getCandidateTimeline);
router.patch("/:id/candidates/:interviewId", updateCandidateInterview);

// CSV Export
router.get("/:id/export", exportBatchCsv);

module.exports = router;
