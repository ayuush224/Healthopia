const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

(async () => {
  mongoose.connect(process.env.DATABASE_URL)
  .then(() => console.log("Database Connected"))
  .catch((err) => console.log("Error Occured in Database connection " + err));
})();

const bootstrapRoutes = require("./routes/bootstrapRoutes");
const commentsRoutes = require("./routes/commentsRoutes");
const postsRoutes = require("./routes/postsRoutes");
const trackerRoutes = require("./routes/trackerRoutes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./middleware/logger");
const notFound = require("./middleware/notFound");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

app.use(logger);
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", bootstrapRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api", commentsRoutes);
app.use("/api", trackerRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, HOST, () => {
  console.log(`Soft Health running at http://${HOST}:${PORT}`);
});
