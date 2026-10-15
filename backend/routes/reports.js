const express = require('express');
const { createReport } = require('../controllers/reportController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/', requireAuth, createReport);

module.exports = router;
