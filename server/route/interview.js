const express = require("express")
const router = express.Router()

const{startInterview,submitInterview,getInterviewById,logViolation,heartbeat}=require("../controller/interviewer")
const{protect,authorize}  = require("../middleware/authmiddleware")

router.post("/",protect,startInterview)
router.get("/:id",protect,getInterviewById)
router.post("/:id/submit",protect,submitInterview)
router.post("/:id/violation",protect,logViolation)
router.post("/:id/heartbeat",protect,heartbeat)

module.exports =router