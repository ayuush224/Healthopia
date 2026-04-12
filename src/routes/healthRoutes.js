const express = require('express');

const { getHealth, updateHealth } = require('../controllers/healthController');
const { requireApiAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireApiAuth);

router.get('/', getHealth);
router.put('/', updateHealth);

module.exports = router;
