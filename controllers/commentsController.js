const { updateData } = require("../services/dataStore");
const { addComment } = require("../services/feedService");

function createComment(req, res) {
  const result = updateData((data) => addComment(data, req.params.postId, req.body));
  res.status(201).json({ ok: true, ...result });
}

module.exports = {
  createComment
};
