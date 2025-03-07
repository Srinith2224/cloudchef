const express = require('express');
const router = express.Router();
const { addCalendarEntry, getCalendarEntries, deleteCalendarEntry } = require('../controllers/calendarController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Routes
router.post('/', addCalendarEntry);
router.get('/:userId', getCalendarEntries);
router.delete('/:id', deleteCalendarEntry);

module.exports = router;