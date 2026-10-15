const express = require('express');
const calendar = require('../controllers/calendarController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', calendar.getCalendarEntries);
router.post('/', calendar.addCalendarEntry);
router.get('/:userId', calendar.getCalendarEntries); // legacy URL
router.patch('/:id', calendar.updateCalendarEntry);
router.delete('/:id', calendar.deleteCalendarEntry);

module.exports = router;
