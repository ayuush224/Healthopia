const express = require('express');

const {
  getHealthOverview,
  getHealthToday,
  getHealthWeekly,
  getHealthYearly,
  logHealthActivity
} = require('../controllers/healthController');
const { requireApiAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireApiAuth);

router.get('/', getHealthOverview);
router.post('/log', logHealthActivity);
router.put('/', logHealthActivity);
router.get('/today', getHealthToday);
router.get('/weekly', getHealthWeekly);
router.get('/yearly', getHealthYearly);

module.exports = router;
