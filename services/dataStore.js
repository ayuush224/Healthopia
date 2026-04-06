const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data", "app-data.json");

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function updateData(mutator) {
  const data = readData();
  const result = mutator(data);
  writeData(data);
  return result;
}

module.exports = {
  readData,
  writeData,
  updateData
};
