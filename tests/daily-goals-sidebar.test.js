const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'app.js'),
  'utf8'
);
const appHtmlSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'app.html'),
  'utf8'
);
const healthModelSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'models', 'HealthTracker.js'),
  'utf8'
);
const healthControllerSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'controllers', 'healthController.js'),
  'utf8'
);

test('health tracker schema stores customizable daily goals', () => {
  assert.ok(healthModelSource.includes('stepsGoal'));
  assert.ok(healthModelSource.includes('runningGoal'));
  assert.ok(healthModelSource.includes('sleepGoal'));
});

test('health controller persists goal updates and validates positive values', () => {
  assert.ok(healthControllerSource.includes("const stepsGoal = ensureOptionalNumber(req.body.stepsGoal, 'Steps goal');"));
  assert.ok(healthControllerSource.includes("const runningGoal = ensureOptionalNumber(req.body.runningGoal, 'Running goal');"));
  assert.ok(healthControllerSource.includes("const sleepGoal = ensureOptionalNumber(req.body.sleepGoal, 'Sleep goal');"));
  assert.ok(healthControllerSource.includes("throw new AppError('Steps goal must be greater than 0.', 400);"));
  assert.ok(healthControllerSource.includes("throw new AppError('Running goal must be greater than 0.', 400);"));
  assert.ok(healthControllerSource.includes("throw new AppError('Sleep goal must be greater than 0.', 400);"));
});

test('health route shows a dedicated daily goals sidebar editor', () => {
  assert.ok(appHtmlSource.includes('id="daily-goals-sidebar-section"'));
  assert.ok(appHtmlSource.includes('id="daily-goals-sidebar"'));
  assert.ok(appSource.includes('function renderDailyGoalsSidebar()'));
  assert.ok(appSource.includes('function renderDailyGoalsPopover(goals)'));
  assert.ok(appSource.includes("const isHealthRoute = route.name === 'health';"));
  assert.ok(appSource.includes("elements.dailyGoalsSidebarSection.classList.toggle('is-hidden', !isHealthRoute);"));
});

test('sidebar health tracker reads today from daily logs and rolls forward each day', () => {
  assert.ok(appSource.includes('function getTodayHealthTrackerSummary()'));
  assert.ok(appSource.includes("const todayLog = (state.health?.dailyLogs || []).find((log) => String(log?.date || '') === todayKey);"));
  assert.ok(appSource.includes('function scheduleDailyHealthRollover()'));
  assert.ok(appSource.includes('refreshForDailyHealthRollover();'));
});

test('saving daily goals rehydrates persisted health state through the shared refresh flow', () => {
  assert.ok(appSource.includes("await refreshView({ skipLoading: true, refreshShell: true });"));
});
