const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectToDatabase() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
}

module.exports = {
  connectToDatabase
};
