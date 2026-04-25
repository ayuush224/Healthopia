require("dotenv").config();

const app = require('./src/app');
const { connectToDatabase } = require('./src/config/db');
const { seedCommunities, seedResources } = require('./src/config/seed');

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectToDatabase();
  console.log('Database connected.');

  if (process.env.SEED_DB === "true") {
    await Promise.all([
      seedCommunities(),
      seedResources()
    ]);
    console.log("Database seeded.");
  }

  app.listen(PORT, () => {
    console.log(`Healthopia running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});