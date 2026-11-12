const express = require("express");
const router = express.Router();

const { getroles, createRole, updateRole, deleteRole } = require("../controller/rolecontroller");
const { protect, authorize } = require("../middleware/authmiddleware");

router.use(protect);
router.get("/", getroles);
router.post("/", authorize("admin"), createRole);
router.put("/:id", authorize("admin"), updateRole);
router.delete("/:id", authorize("admin"), deleteRole);

module.exports = router;
