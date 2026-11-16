const express = require("express")
const router = express.Router()

const {
    loginuser,
    registeruser,
    getCandidates,
    createCandidate,
    bulkCreateCandidates,
    deleteCandidate,
    updateProfile,
    changePassword,
    recordProctoringConsent,
    inviteLogin
} = require("../controller/authcontroller")

const { protect, authorize } = require("../middleware/authmiddleware")

router.post("/login", loginuser)
router.post("/invite-login", inviteLogin)
router.post("/register", registeruser)
router.get("/candidates", protect, authorize("admin"), getCandidates)
router.post("/candidates", protect, authorize("admin"), createCandidate)
router.post("/candidates/bulk", protect, authorize("admin"), bulkCreateCandidates)
router.delete("/candidates/:id", protect, authorize("admin"), deleteCandidate)
router.put("/profile", protect, updateProfile)
router.post("/change-password", protect, changePassword)
router.post("/proctoring-consent", protect, recordProctoringConsent)

module.exports = router
