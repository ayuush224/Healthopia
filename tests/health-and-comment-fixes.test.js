const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'app.js'),
  'utf8'
);
const healthControllerSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'controllers', 'healthController.js'),
  'utf8'
);
const postControllerSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'controllers', 'postController.js'),
  'utf8'
);
const appServerSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'app.js'),
  'utf8'
);
const commentRoutesSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'routes', 'commentRoutes.js'),
  'utf8'
);

test('health tracker builds a rolling local 7 day window on the frontend', () => {
  const healthLoadSource = appSource
    .split("if (route.name === 'health')")[1]
    .split("if (route.name === 'wellness-picks')")[0];

  assert.ok(appSource.includes('function buildRollingWeeklyData'));
  assert.ok(appSource.includes("const today = new Date();"));
  assert.ok(appSource.includes('for (let i = 6; i >= 0; i -= 1)'));
  assert.ok(appSource.includes("d.toLocaleDateString('en-US', { weekday: 'short' })"));
  assert.ok(appSource.includes('const existingDay = logsByDate.get(day.dateKey);'));
  assert.ok(appSource.includes('syncWeeklyHealthWindow();'));
  assert.equal(healthLoadSource.includes("apiFetch('/api/health/weekly')"), false);
});

test('comment deletion is exposed through a dedicated secured API route', () => {
  assert.ok(appServerSource.includes("app.use('/api/comments', commentRoutes);"));
  assert.ok(commentRoutesSource.includes("router.delete('/:id', deleteComment);"));
  assert.ok(postControllerSource.includes('const deleteComment = asyncHandler'));
  assert.ok(postControllerSource.includes("comment.userId.toString() !== req.user.id"));
  assert.ok(postControllerSource.includes("return res.status(403).json({ message: 'Unauthorized' });"));
});

test('frontend renders owner-only comment delete controls and deletes without a full refresh', () => {
  assert.ok(appSource.includes('function canDeleteComment(comment)'));
  assert.ok(appSource.includes("data-action=\"delete-comment\""));
  assert.ok(appSource.includes("window.confirm('Delete this comment?')"));
  assert.ok(appSource.includes("apiFetch(`/api/comments/${commentId}`"));
  assert.equal(appSource.includes('refreshView({ skipLoading: true, refreshShell: true })'), true);
});
