const express = require("express")
const router = express.Router()

const {
    loginuser,
    registeruser,
    getCandidates,
    createCandidate,
    bulkCreateCandidates,
    deleteCandidate,
    updateProfile
} = require("../controller/authcontroller")

const { protect, authorize } = require("../middleware/authmiddleware")

router.post("/login", loginuser)
router.post("/register", registeruser)
router.get("/candidates", protect, authorize("admin"), getCandidates)
router.post("/candidates", protect, authorize("admin"), createCandidate)
router.post("/candidates/bulk", protect, authorize("admin"), bulkCreateCandidates)
router.delete("/candidates/:id", protect, authorize("admin"), deleteCandidate)
router.put("/profile", protect, updateProfile)

module.exports = router
