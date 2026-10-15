const express = require("express")
const router = express.Router()
const{analyzeResult,getresults,getallresults,getAllResultsAdmin,getAnalytics}=require("../controller/resultcontroller")
const{protect,authorize}=require("../middleware/authmiddleware")

router.use(protect)

router.get("/", getallresults)
router.post('/:id/analyze',analyzeResult)
router.get("/admin",protect,authorize("admin"),getAllResultsAdmin)
router.get("/analytics",authorize("admin"),getAnalytics)
router.get("/:id",getresults)


module.exports = router
