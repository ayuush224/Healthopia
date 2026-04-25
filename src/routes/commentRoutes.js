const express = require('express');

const { deleteComment } = require('../controllers/postController');
const { requireApiAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireApiAuth);

router.delete('/:id', deleteComment);

module.exports = router;
