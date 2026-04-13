const express = require('express');

const { getProfile } = require('../controllers/userController');
const { requireApiAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireApiAuth);

router.get('/profile', getProfile);

module.exports = router;
