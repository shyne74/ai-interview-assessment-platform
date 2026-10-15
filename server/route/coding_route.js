const express = require("express")

const router = express.Router()
const { protect } = require("../middleware/authmiddleware")
const { submitCode, getSubmissions } = require("../controller/coding_controller.js")

router.post("/submit", protect, submitCode)
router.get("/submissions", protect, getSubmissions)

module.exports = router