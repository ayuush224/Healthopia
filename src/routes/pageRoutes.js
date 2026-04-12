const express = require('express');
const path = require('path');

const { redirectIfAuthenticated, requirePageAuth } = require('../middleware/auth');

const router = express.Router();
const publicDir = path.join(__dirname, '..', '..', 'public');

function sendPage(fileName) {
  return (_req, res) => {
    res.sendFile(path.join(publicDir, fileName));
  };
}

router.get('/sign-in', redirectIfAuthenticated, sendPage('sign-in.html'));
router.get('/register', redirectIfAuthenticated, sendPage('register.html'));

router.get('/', requirePageAuth, sendPage('app.html'));
router.get('/profile', requirePageAuth, sendPage('app.html'));
router.get('/health', requirePageAuth, sendPage('app.html'));
router.get('/community/:communityId', requirePageAuth, sendPage('app.html'));
router.get('/post/:postId', requirePageAuth, sendPage('app.html'));

module.exports = router;
