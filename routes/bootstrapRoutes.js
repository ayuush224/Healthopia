const express = require("express");

const { getBootstrap } = require("../controllers/bootstrapController");
const { validateBootstrapQuery } = require("../middleware/validators");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/bootstrap", validateBootstrapQuery, asyncHandler(getBootstrap));

module.exports = router;
