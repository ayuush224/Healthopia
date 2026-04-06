const { updateData } = require("../services/dataStore");
const { updateTracker } = require("../services/feedService");

function updateTrackerHandler(req, res) {
  const tracker = updateData((data) => updateTracker(data, req.body));
  res.status(200).json({ ok: true, tracker });
}

module.exports = {
  updateTrackerHandler
};
