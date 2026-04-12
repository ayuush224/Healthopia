const HealthTracker = require('../models/HealthTracker');
const asyncHandler = require('../utils/asyncHandler');
const { ensureOptionalNumber } = require('../utils/validation');
const { AppError } = require('../utils/errors');

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateValue) {
  if (dateValue === undefined || dateValue === null || dateValue === '') {
    return formatDateKey(new Date());
  }

  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
    const [year, month, day] = dateValue.trim().split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);

    if (Number.isNaN(parsedDate.getTime()) || formatDateKey(parsedDate) !== dateValue.trim()) {
      throw new AppError('Date must use a valid YYYY-MM-DD value.', 400);
    }

    return dateValue.trim();
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError('Date must be a valid calendar day.', 400);
  }

  return formatDateKey(parsedDate);
}

function roundMetric(value = 0) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function createEmptyHealthEntry(dateKey = formatDateKey(new Date())) {
  return {
    date: dateKey,
    steps: 0,
    running_km: 0,
    sleep_hours: 0
  };
}

function serializeHealthEntry(tracker, fallbackDateKey = formatDateKey(new Date())) {
  if (!tracker) {
    return createEmptyHealthEntry(fallbackDateKey);
  }

  return {
    date: tracker.date || fallbackDateKey,
    steps: Math.round(Number(tracker.steps || 0)),
    running_km: roundMetric(tracker.running_km || 0),
    sleep_hours: roundMetric(tracker.sleep_hours || 0)
  };
}

async function getTodayHealth(userId) {
  const todayDateKey = formatDateKey(new Date());
  const tracker = await HealthTracker.findOne({
    userId,
    date: todayDateKey
  });

  return serializeHealthEntry(tracker, todayDateKey);
}

async function getWeeklyHealth(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 6);

  const startDateKey = formatDateKey(startDate);
  const endDateKey = formatDateKey(today);

  const trackers = await HealthTracker.find({
    userId,
    date: {
      $gte: startDateKey,
      $lte: endDateKey
    }
  }).sort({ date: 1 });

  const trackerMap = new Map(trackers.map((tracker) => [tracker.date, serializeHealthEntry(tracker)]));

  return Array.from({ length: 7 }, (_, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + index);

    const dateKey = formatDateKey(currentDate);
    const baseEntry = trackerMap.get(dateKey) || createEmptyHealthEntry(dateKey);

    return {
      ...baseEntry,
      label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(currentDate)
    };
  });
}

async function getYearlyHealth(userId) {
  const currentYear = new Date().getFullYear();
  const yearlyBuckets = await HealthTracker.aggregate([
    {
      $match: {
        userId,
        date: {
          $gte: `${currentYear}-01-01`,
          $lte: `${currentYear}-12-31`
        }
      }
    },
    {
      $group: {
        _id: {
          $substrCP: ['$date', 5, 2]
        },
        steps: {
          $avg: '$steps'
        },
        running_km: {
          $avg: '$running_km'
        },
        sleep_hours: {
          $avg: '$sleep_hours'
        },
        days_logged: {
          $sum: 1
        }
      }
    }
  ]);

  const monthMap = new Map(yearlyBuckets.map((bucket) => [bucket._id, bucket]));

  return MONTH_LABELS.map((label, index) => {
    const monthKey = String(index + 1).padStart(2, '0');
    const bucket = monthMap.get(monthKey);

    return {
      label,
      month: monthKey,
      steps: bucket ? Math.round(Number(bucket.steps || 0)) : 0,
      running_km: bucket ? roundMetric(bucket.running_km || 0) : 0,
      sleep_hours: bucket ? roundMetric(bucket.sleep_hours || 0) : 0,
      days_logged: bucket ? bucket.days_logged : 0,
      date: `${currentYear}-${monthKey}-01`
    };
  });
}

const getHealthOverview = asyncHandler(async (req, res) => {
  const [today, weekly, yearly] = await Promise.all([
    getTodayHealth(req.user._id),
    getWeeklyHealth(req.user._id),
    getYearlyHealth(req.user._id)
  ]);

  res.json({
    today,
    weekly,
    yearly
  });
});

const getHealthToday = asyncHandler(async (req, res) => {
  const today = await getTodayHealth(req.user._id);

  res.json({
    health: today
  });
});

const getHealthWeekly = asyncHandler(async (req, res) => {
  const weekly = await getWeeklyHealth(req.user._id);

  res.json({
    data: weekly
  });
});

const getHealthYearly = asyncHandler(async (req, res) => {
  const yearly = await getYearlyHealth(req.user._id);

  res.json({
    data: yearly
  });
});

const logHealthActivity = asyncHandler(async (req, res) => {
  const date = parseDateKey(req.body.date);
  const steps = ensureOptionalNumber(req.body.steps, 'Walking (steps)');
  const runningKm = ensureOptionalNumber(req.body.running_km, 'Running (km)');
  const sleepHours = ensureOptionalNumber(req.body.sleep_hours, 'Sleep (hours)');

  const updates = {};

  if (steps !== undefined) {
    updates.steps = Math.round(steps);
  }

  if (runningKm !== undefined) {
    updates.running_km = roundMetric(runningKm);
  }

  if (sleepHours !== undefined) {
    updates.sleep_hours = roundMetric(sleepHours);
  }

  if (!Object.keys(updates).length) {
    throw new AppError('At least one activity metric is required.', 400);
  }

  const tracker = await HealthTracker.findOneAndUpdate(
    {
      userId: req.user._id,
      date
    },
    {
      $set: {
        userId: req.user._id,
        date,
        ...updates
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  res.status(201).json({
    message: 'Daily activity saved.',
    health: serializeHealthEntry(tracker, date)
  });
});

module.exports = {
  getHealthOverview,
  getHealthToday,
  getHealthWeekly,
  getHealthYearly,
  logHealthActivity
};
