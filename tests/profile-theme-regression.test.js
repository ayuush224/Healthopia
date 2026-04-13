const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appHtmlSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'app.html'),
  'utf8'
);
const appSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'app.js'),
  'utf8'
);
const userRoutesSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'routes', 'userRoutes.js'),
  'utf8'
);

test('legacy profile settings affordances are removed from the shell', () => {
  assert.equal(appHtmlSource.includes('Profile Settings'), false);
  assert.equal(appSource.includes('profile-form'), false);
  assert.equal(appSource.includes('handleProfileUpdate'), false);
});

test('profile dropdown and theme toggle are wired into the app shell', () => {
  assert.ok(appHtmlSource.includes('theme-toggle-button'));
  assert.ok(appSource.includes('THEME_STORAGE_KEY'));
  assert.ok(appSource.includes('function toggleTheme()'));
  assert.ok(appSource.includes('function toggleProfileMenu()'));
  assert.ok(appSource.includes("action === 'set-profile-tab'"));
  assert.ok(appSource.includes("action === 'logout'"));
});

test('profile editing API route is removed', () => {
  assert.ok(userRoutesSource.includes("router.get('/profile', getProfile);"));
  assert.equal(userRoutesSource.includes("router.put('/profile'"), false);
});
