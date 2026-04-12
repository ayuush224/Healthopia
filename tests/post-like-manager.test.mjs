import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const managerModuleSource = await fs.readFile(
  path.join(process.cwd(), 'public', 'js', 'postLikeManager.js'),
  'utf8'
);
const managerModuleUrl = `data:text/javascript;base64,${Buffer.from(managerModuleSource).toString('base64')}`;
const { createPostLikeManager } = await import(managerModuleUrl);

test('hydrates liked state from the initial liked post ids', () => {
  const manager = createPostLikeManager(['post-1', 'post-2']);

  assert.equal(manager.isLiked('post-1'), true);
  assert.equal(manager.isLiked('post-9'), false);
});

test('optimistic like prevents duplicate rapid clicks while a request is pending', () => {
  const manager = createPostLikeManager([]);
  const optimisticState = manager.beginOptimisticToggle('post-1', 7);

  assert.deepEqual(optimisticState, {
    postId: 'post-1',
    liked: true,
    likesCount: 8
  });
  assert.equal(manager.isLiked('post-1'), true);
  assert.equal(manager.isPending('post-1'), true);
  assert.equal(manager.beginOptimisticToggle('post-1', 8), null);
});

test('confirm keeps the manager in sync after a successful unlike', () => {
  const manager = createPostLikeManager(['post-1']);
  const optimisticState = manager.beginOptimisticToggle('post-1', 5);

  assert.equal(optimisticState.liked, false);

  const confirmedState = manager.confirm('post-1', false, 4);

  assert.deepEqual(confirmedState, {
    postId: 'post-1',
    liked: false,
    likesCount: 4
  });
  assert.equal(manager.isLiked('post-1'), false);
  assert.equal(manager.isPending('post-1'), false);
});

test('rollback restores the previous state after an API failure', () => {
  const manager = createPostLikeManager(['post-1']);

  manager.beginOptimisticToggle('post-1', 6);
  const rollbackState = manager.rollback('post-1');

  assert.deepEqual(rollbackState, {
    postId: 'post-1',
    liked: true,
    likesCount: 6
  });
  assert.equal(manager.isLiked('post-1'), true);
  assert.equal(manager.isPending('post-1'), false);
});
