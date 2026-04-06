const express = require("express");

const { createComment } = require("../controllers/commentsController");
const { validateComment, validatePostIdParam } = require("../middleware/validators");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/posts/:postId/comments", validatePostIdParam, validateComment, asyncHandler(createComment));

module.exports = router;
