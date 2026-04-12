const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

(async () => {
  mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Database Connected"))
  .catch((err) => console.log("Error Occured in Database connection " + err));
})();

const app = require('./src/app');
const { port } = require('./src/config/env');
const { connectToDatabase } = require('./src/config/db');
const { seedCommunities } = require('./src/config/seed');

async function startServer() {
  await connectToDatabase();
  await seedCommunities();

  app.listen(port, () => {
    console.log(`Health Wellness app running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});
