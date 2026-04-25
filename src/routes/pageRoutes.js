const express = require('express');
const path = require('path');

const { optionalPageAuth, redirectIfAuthenticated, requirePageAuth } = require('../middleware/auth');

const router = express.Router();
const publicDir = path.join(__dirname, '..', '..', 'public');

function sendPage(fileName) {
  return (_req, res) => {
    res.sendFile(path.join(publicDir, fileName));
  };
}

router.get('/sign-in', redirectIfAuthenticated, sendPage('sign-in.html'));
router.get('/register', redirectIfAuthenticated, sendPage('register.html'));

router.get('/', optionalPageAuth, (req, res) => {
  res.sendFile(path.join(publicDir, req.user ? 'app.html' : 'landing.html'));
});
router.get('/feed', requirePageAuth, sendPage('app.html'));
router.get('/profile', requirePageAuth, sendPage('app.html'));
router.get('/health', requirePageAuth, sendPage('app.html'));
router.get('/wellness-picks', requirePageAuth, sendPage('app.html'));
router.get('/community/:communityId', requirePageAuth, sendPage('app.html'));
router.get('/post/:postId', requirePageAuth, sendPage('app.html'));

module.exports = router;
