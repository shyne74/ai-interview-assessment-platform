const express = require("express");
const router = express.Router();
const { globalSearch } = require("../controller/search_controller");
const { optionalAuth } = require("../middleware/authmiddleware");

// Search is accessible to all users (optional token attaches personal assessments)
router.get("/", optionalAuth, globalSearch);

module.exports = router;
