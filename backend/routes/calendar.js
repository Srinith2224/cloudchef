const express = require('express');
const { addCalendarEntry, getCalendarEntries, deleteCalendarEntry } = require('../controllers/calendarController');
const requireAuth = require('../middleware/authMiddleware');
const router = express.Router();

router.use(requireAuth); // Apply auth middleware to all routes

// POST add a calendar entry
router.post('/', addCalendarEntry);

// GET all calendar entries
router.get('/', getCalendarEntries);

// DELETE a calendar entry by ID
router.delete('/:id', requireAuth, deleteCalendarEntry);

module.exports = router;