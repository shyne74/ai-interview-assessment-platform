const express = require("express")
const router = express.Router()

const{getroles,createRole}=require("../controller/rolecontroller")
const{protect,authorize}=require("../middleware/authmiddleware")

router.use(protect)
router.get("/",getroles)
router.post("/",authorize("admin"),createRole)

module.exports = router