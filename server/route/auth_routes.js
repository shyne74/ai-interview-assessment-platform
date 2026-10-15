const express = require("express")
const { loginuser } = require("../controller/authcontroller")
const {registeruser}=require("../controller/authcontroller")
const {getCandidates} = require("../controller/authcontroller")
const { protect, authorize } = require("../middleware/authmiddleware")
const router = express.Router()

router.post("/login",loginuser)
router.post("/register",registeruser)
router.get("/candidates", protect, authorize("admin"), getCandidates)

module.exports = router