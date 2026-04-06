const express = require("express");

const { updateTrackerHandler } = require("../controllers/trackerController");
const { validateTracker } = require("../middleware/validators");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/tracker", validateTracker, asyncHandler(updateTrackerHandler));

module.exports = router;
