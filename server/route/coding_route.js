const express = require("express")

const router = express.Router()
const { protect } = require("../middleware/authmiddleware")
const {
    submitCode,
    getSubmissions,
    getCodingMeta,
    getCodingProblems
} = require("../controller/coding_controller.js")

router.get("/meta", protect, getCodingMeta)
router.get("/problems", protect, getCodingProblems)
router.post("/submit", protect, submitCode)
router.get("/submissions", protect, getSubmissions)

module.exports = router
