const HealthTracker = require('../models/HealthTracker');
const asyncHandler = require('../utils/asyncHandler');
const { ensureOptionalNumber } = require('../utils/validation');

function enrichHealthTracker(tracker) {
  const waterGoal = tracker.waterGoal || 0;
  const hydrationPercent = waterGoal ? Math.min(100, Math.round((tracker.waterIntake / waterGoal) * 100)) : 0;
  const stepsGoal = 10000;
  const stepsPercent = Math.min(100, Math.round((tracker.steps / stepsGoal) * 100));

  return {
    ...tracker.toObject(),
    hydrationPercent,
    stepsGoal,
    stepsPercent
  };
}

async function getOrCreateHealthTracker(userId) {
  let tracker = await HealthTracker.findOne({ userId });

  if (!tracker) {
    tracker = await HealthTracker.create({
      userId,
      waterIntake: 0,
      waterGoal: 2500,
      steps: 0
    });
  }

  return tracker;
}

const getHealth = asyncHandler(async (req, res) => {
  const tracker = await getOrCreateHealthTracker(req.user._id);

  res.json({
    health: enrichHealthTracker(tracker)
  });
});

const updateHealth = asyncHandler(async (req, res) => {
  const tracker = await getOrCreateHealthTracker(req.user._id);

  const waterIntake = ensureOptionalNumber(req.body.waterIntake, 'Water intake');
  const waterGoal = ensureOptionalNumber(req.body.waterGoal, 'Water goal');
  const steps = ensureOptionalNumber(req.body.steps, 'Steps');

  if (waterIntake !== undefined) {
    tracker.waterIntake = waterIntake;
  }

  if (waterGoal !== undefined) {
    tracker.waterGoal = waterGoal;
  }

  if (steps !== undefined) {
    tracker.steps = steps;
  }

  await tracker.save();

  res.json({
    message: 'Health tracker updated.',
    health: enrichHealthTracker(tracker)
  });
});

module.exports = {
  getHealth,
  updateHealth
};
