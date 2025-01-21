const Calendar = require('../models/CalendarModel');
const mongoose = require('mongoose');

// Add a calendar entry
const addCalendarEntry = async (req, res) => {
    const userId = req.userId;
    const { recipeId, date } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(404).json({ error: 'Invalid user ID or recipe ID' });
    }

    try {
        // Find the user's calendar
        let calendar = await Calendar.findOne({ userId });

        if (!calendar) {
            // Create a new calendar if it doesn't exist
            calendar = new Calendar({ userId, scheduledRecipes: [] });
        }

        // Add the new scheduled recipe
        calendar.scheduledRecipes.push({ recipeId, date });
        await calendar.save();

        res.status(200).json(calendar);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all calendar entries
const getCalendarEntries = async (req, res) => {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        const calendar = await Calendar.findOne({ userId }).populate('scheduledRecipes.recipeId');
        res.status(200).json(calendar ? calendar.scheduledRecipes : []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a calendar entry by ID
const deleteCalendarEntry = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Invalid entry ID' });
    }

    try {
        const calendar = await Calendar.findOneAndUpdate(
            { userId: req.userId },
            { $pull: { scheduledRecipes: { _id: id } } },
            { new: true }
        );

        if (!calendar) {
            return res.status(404).json({ error: 'Calendar not found' });
        }

        res.status(200).json(calendar);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { addCalendarEntry, getCalendarEntries, deleteCalendarEntry };
