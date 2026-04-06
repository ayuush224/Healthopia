const { updateData } = require("../services/dataStore");
const {
  createPost,
  incrementShare,
  toggleBookmark,
  toggleLike
} = require("../services/feedService");

function createPostHandler(req, res) {
  const post = updateData((data) => createPost(data, req.body));
  res.status(201).json({ ok: true, post });
}

function toggleLikeHandler(req, res) {
  const result = updateData((data) => toggleLike(data, req.params.postId));
  res.status(200).json({ ok: true, ...result });
}

function toggleBookmarkHandler(req, res) {
  const result = updateData((data) => toggleBookmark(data, req.params.postId));
  res.status(200).json({ ok: true, ...result });
}

function sharePostHandler(req, res) {
  const result = updateData((data) => incrementShare(data, req.params.postId));
  res.status(200).json({ ok: true, ...result });
}

module.exports = {
  createPostHandler,
  sharePostHandler,
  toggleBookmarkHandler,
  toggleLikeHandler
};
