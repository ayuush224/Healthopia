const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pageRoutesSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'routes', 'pageRoutes.js'),
  'utf8'
);
const registerSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'register.html'),
  'utf8'
);
const appHtmlSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'app.html'),
  'utf8'
);
const appSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'app.js'),
  'utf8'
);
const registerJsSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'register.js'),
  'utf8'
);
const signInSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'sign-in.html'),
  'utf8'
);
const landingSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'landing.html'),
  'utf8'
);
const landingJsSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'landing.js'),
  'utf8'
);
const helperSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'helpers.js'),
  'utf8'
);

test('root route serves landing for unauthenticated users and app for authenticated users', () => {
  assert.ok(pageRoutesSource.includes("req.user ? 'app.html' : 'landing.html'"));
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', 'landing.html')));
  assert.ok(landingSource.includes('landing-theme-toggle'));
  assert.ok(landingSource.includes('data-scroll-target=\"#landing-explore\"'));
  assert.ok(landingSource.includes('/images/landing-slide-posts.png'));
  assert.ok(landingJsSource.includes('startSlideshow()'));
});

test('mobile nav exposes resources instead of the old community shortcut', () => {
  assert.ok(appHtmlSource.includes('data-route=\"/wellness-picks\"'));
  assert.ok(appHtmlSource.includes('<span>Resources</span>'));
});

test('desktop sidebar includes community recommendations and sign-in hero is simplified', () => {
  assert.ok(appHtmlSource.includes('community-recommendations-sidebar'));
  assert.ok(appSource.includes('getTrendingCommunities()'));
  assert.ok(appSource.includes("data-action=\"join-community\""));
  assert.equal(signInSource.includes('auth-preview'), false);
});

test('registration includes avatar selection and sends the chosen avatar', () => {
  assert.ok(registerSource.includes('id=\"avatar-input\"'));
  assert.ok(registerSource.includes('data-avatar-option=\"avatar-1.png\"'));
  assert.ok(registerJsSource.includes('function setSelectedAvatar'));
  assert.ok(registerJsSource.includes("avatar: formData.get('avatar')"));
});

test('avatar rendering supports uploaded profile avatar assets and wellness pagination rerenders the active view', () => {
  assert.ok(helperSource.includes('entity?.avatar'));
  assert.ok(helperSource.includes('/avatars/'));
  assert.ok(appSource.includes("action === 'wellness-next-page'"));
  assert.ok(appSource.includes("action === 'wellness-prev-page'"));
  assert.ok(appSource.includes('renderCurrentView();'));
});
