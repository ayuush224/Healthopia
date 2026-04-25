require("dotenv").config();

const app = require('./src/app');
const { port } = require('./src/config/env');
const { connectToDatabase } = require('./src/config/db');
const { seedCommunities, seedResources } = require('./src/config/seed');

async function startServer() {
  await connectToDatabase();
  console.log('Database connected.');

  await Promise.all([
    seedCommunities(),
    seedResources()
  ]);

  app.listen(port, () => {
    console.log(`Health Wellness app running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});
