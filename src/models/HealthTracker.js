const mongoose = require('mongoose');
const { Schema } = mongoose;

const healthTrackerSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  steps: {
    type: Number,
    default: 0,
    min: 0
  },
  running_km: {
    type: Number,
    default: 0,
    min: 0
  },
  sleep_hours: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

healthTrackerSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('HealthTracker', healthTrackerSchema);
