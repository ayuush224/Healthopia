const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appSource = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'js', 'app.js'),
  'utf8'
);

test('home view no longer includes the inline create composer', () => {
  const homeViewSource = appSource
    .split('function renderHomeView')[1]
    .split('function renderProfileView')[0];

  assert.equal(appSource.includes('function renderCreatePostSection'), false);
  assert.equal(appSource.includes('composer-textarea'), false);
  assert.equal(homeViewSource.includes('renderCreatePostSection'), false);
});

test('create post flow uses modal actions and multipart submission without refreshing the view', () => {
  const createHandlerSource = appSource
    .split('async function handleCreatePost')[1]
    .split('async function handleComment')[0];

  assert.ok(createHandlerSource.includes('new FormData(form)'));
  assert.ok(createHandlerSource.includes("apiFetch('/api/posts'"));
  assert.equal(createHandlerSource.includes('refreshView('), false);
  assert.ok(appSource.includes("action === 'open-post-modal'"));
  assert.ok(appSource.includes("action === 'dismiss-post-modal'"));
  assert.ok(appSource.includes("action === 'remove-post-image'"));
});
