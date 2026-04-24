const express = require('express');

const { getWellnessPicks } = require('../controllers/resourceController');
const { requireApiAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireApiAuth);

router.get('/', getWellnessPicks);
router.get('/picks', getWellnessPicks);

module.exports = router;
