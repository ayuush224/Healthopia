const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cloudinaryMiddlewareSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'middleware', 'cloudnire.upload.js'),
  'utf8'
);
const postControllerSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'controllers', 'postController.js'),
  'utf8'
);

test('cloudinary middleware skips upload work when no image file is attached', () => {
  assert.ok(cloudinaryMiddlewareSource.includes('if (!req.file?.path) {'));
  assert.ok(cloudinaryMiddlewareSource.includes("public_id: ''"));
  assert.ok(cloudinaryMiddlewareSource.includes("secure_url: ''"));
  assert.ok(cloudinaryMiddlewareSource.includes('next();'));
});

test('post creation safely supports empty cloudinary metadata', () => {
  assert.ok(postControllerSource.includes("const image = req.cloudinary?.secure_url || '';"));
  assert.ok(postControllerSource.includes("const public_id = req.cloudinary?.public_id || '';"));
});
