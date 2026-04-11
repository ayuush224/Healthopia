

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
