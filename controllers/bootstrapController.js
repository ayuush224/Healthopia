const { readData } = require("../services/dataStore");
const { buildBootstrapPayload } = require("../services/feedService");

function getBootstrap(req, res) {
  const data = readData();
  const payload = buildBootstrapPayload(data, req.query);

  res.status(200).json(payload);
}

module.exports = {
  getBootstrap
};
