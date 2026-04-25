const HealthTracker = require('../models/HealthTracker');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const { ensureOptionalNumber } = require('../utils/validation');

const STEPS_GOAL = 10000;

function getDateKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function getDateKeyOffset(daysOffset = 0) {
  const today = new Date();
  const date = new Date(today);
  date.setDate(today.getDate() + daysOffset);

  return getDateKey(date);
}

function ensureDateKey(value) {
  if (value === undefined || value === null || value === '') {
    return getDateKeyOffset();
  }

  const dateKey = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || Number.isNaN(new Date(`${dateKey}T00:00:00.000Z`).getTime())) {
    throw new AppError('Log date is invalid.', 400);
  }

  return dateKey;
}

function toActivityDay(dateKey, log) {
  return {
    date: dateKey,
    walking: log?.walking || 0,
    running: log?.running || 0,
    sleep: log?.sleep || 0,
    hasData: Boolean(log)
  };
}

function findDailyLog(tracker, dateKey) {
  return tracker.dailyLogs?.find((log) => log.date === dateKey) || null;
}

function enrichHealthTracker(tracker) {
  const waterGoal = tracker.waterGoal || 0;
  const hydrationPercent = waterGoal ? Math.min(100, Math.round((tracker.waterIntake / waterGoal) * 100)) : 0;
  const stepsGoal = STEPS_GOAL;
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
      steps: 0,
      running: 0,
      sleep: 0,
      dailyLogs: []
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

const getTodayHealth = asyncHandler(async (req, res) => {
  const tracker = await getOrCreateHealthTracker(req.user._id);
  const today = new Date();
  const todayKey = getDateKey(today);

  res.json({
    today: toActivityDay(todayKey, findDailyLog(tracker, todayKey)),
    todayLabel: today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  });
});

const getWeeklyHealth = asyncHandler(async (req, res) => {
  const tracker = await getOrCreateHealthTracker(req.user._id);
  const logsByDate = new Map((tracker.dailyLogs || []).map((log) => [log.date, log]));
  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateKey: getDateKey(d)
    });
  }

  const weeklyData = days.map((day) => ({
    ...toActivityDay(day.dateKey, logsByDate.get(day.dateKey)),
    label: day.label
  }));

  res.json({
    weeklyData,
    selectedDay: getDateKey(today),
    todayLabel: today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  });
});

const updateHealth = asyncHandler(async (req, res) => {
  const tracker = await getOrCreateHealthTracker(req.user._id);

  const waterIntake = ensureOptionalNumber(req.body.waterIntake, 'Water intake');
  const waterGoal = ensureOptionalNumber(req.body.waterGoal, 'Water goal');
  const steps = ensureOptionalNumber(req.body.steps, 'Steps');
  const running = ensureOptionalNumber(req.body.running, 'Running');
  const sleep = ensureOptionalNumber(req.body.sleep, 'Sleep');

  if (waterIntake !== undefined) {
    tracker.waterIntake = waterIntake;
  }

  if (waterGoal !== undefined) {
    tracker.waterGoal = waterGoal;
  }

  if (steps !== undefined) {
    tracker.steps = steps;
  }

  if (running !== undefined) {
    tracker.running = running;
  }

  if (sleep !== undefined) {
    tracker.sleep = sleep;
  }

  await tracker.save();

  res.json({
    message: 'Health tracker updated.',
    health: enrichHealthTracker(tracker)
  });
});

const logHealthActivity = asyncHandler(async (req, res) => {
  const tracker = await getOrCreateHealthTracker(req.user._id);

  const dateKey = ensureDateKey(req.body.date);
  const walking = ensureOptionalNumber(req.body.steps ?? req.body.walking, 'Steps') ?? 0;
  const running = ensureOptionalNumber(req.body.running, 'Running') ?? 0;
  const sleep = ensureOptionalNumber(req.body.sleep, 'Sleep') ?? 0;
  const existingLog = findDailyLog(tracker, dateKey);

  if (existingLog) {
    existingLog.walking = walking;
    existingLog.running = running;
    existingLog.sleep = sleep;
  } else {
    tracker.dailyLogs.push({
      date: dateKey,
      walking,
      running,
      sleep
    });
  }

  if (dateKey === getDateKeyOffset()) {
    tracker.steps = walking;
    tracker.running = running;
    tracker.sleep = sleep;
  }

  await tracker.save();

  res.status(201).json({
    message: 'Health activity saved.',
    log: toActivityDay(dateKey, {
      walking,
      running,
      sleep
    }),
    health: enrichHealthTracker(tracker)
  });
});

module.exports = {
  getHealth,
  getTodayHealth,
  getWeeklyHealth,
  logHealthActivity,
  updateHealth
};
