const express = require("express");

const {
  createPostHandler,
  sharePostHandler,
  toggleBookmarkHandler,
  toggleLikeHandler
} = require("../controllers/postsController");
const {
  validateCommunityExists,
  validateCreatePost,
  validatePostIdParam
} = require("../middleware/validators");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/", validateCreatePost, validateCommunityExists, asyncHandler(createPostHandler));
router.post("/:postId/like", validatePostIdParam, asyncHandler(toggleLikeHandler));
router.post("/:postId/bookmark", validatePostIdParam, asyncHandler(toggleBookmarkHandler));
router.post("/:postId/share", validatePostIdParam, asyncHandler(sharePostHandler));

module.exports = router;
