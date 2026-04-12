const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('like handler no longer calls the global refresh flow', () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'app.js'),
    'utf8'
  );

  const likeHandlerSource = appSource.split('async function handleLikePost')[1].split('async function handleCreatePost')[0];

  assert.ok(likeHandlerSource.includes('beginOptimisticToggle'));
  assert.ok(likeHandlerSource.includes('apiFetch(`/api/posts/${postId}/like`'));
  assert.equal(likeHandlerSource.includes('refreshView('), false);
});
