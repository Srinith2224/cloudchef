const Calendar = require('../models/CalendarModel');
const mongoose = require('mongoose');

// Add a calendar entry
const addCalendarEntry = async (req, res) => {
    const userId = req.userId;
    const { recipeId, date, mealTime = 'Dinner' } = req.body;

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
        calendar.scheduledRecipes.push({ 
            recipeId, 
            date, 
            mealTime 
        });
        
        await calendar.save();

        // Return the newly created entry for confirmation
        const savedCalendar = await Calendar.findOne({ userId })
            .populate('scheduledRecipes.recipeId');
        
        res.status(200).json({
            message: 'Recipe scheduled successfully',
            calendar: savedCalendar
        });
    } catch (error) {
        console.error('Error adding calendar entry:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get calendar entries for a user
const getCalendarEntries = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(404).json({ error: 'Invalid user ID' });
    }

    try {
        // Find the calendar and populate recipe details
        const calendar = await Calendar.findOne({ userId })
            .populate({
                path: 'scheduledRecipes.recipeId',
                select: 'title mainImage totalTime ingredients steps'
            });
        
        // Remove or comment out this console.log
        // console.log('Found calendar for userId:', userId, calendar ? 'yes' : 'no');
        
        if (!calendar || !calendar.scheduledRecipes || calendar.scheduledRecipes.length === 0) {
            // Remove or comment out this console.log
            // console.log('No scheduled recipes found');
            return res.status(200).json([]);
        }
        
        // Remove or comment out this console.log
        // console.log(`Found ${calendar.scheduledRecipes.length} scheduled recipes`);
        
        // Format the data to make it easier to work with on the frontend
        const formattedEntries = calendar.scheduledRecipes.map(entry => {
            if (!entry.recipeId) {
                // This log might be useful for debugging, but can be removed as well
                // console.log('Warning: Entry missing recipeId', entry);
                return null;
            }
            return {
                _id: entry._id,
                recipeId: entry.recipeId,
                date: entry.date,
                mealTime: entry.mealTime
            };
        }).filter(Boolean); // Remove any null entries
        
        res.status(200).json(formattedEntries);
    } catch (error) {
        console.error('Error getting calendar entries:', error);
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

        res.status(200).json({
            message: 'Calendar entry deleted successfully',
            calendar
        });
    } catch (error) {
        console.error('Error deleting calendar entry:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { addCalendarEntry, getCalendarEntries, deleteCalendarEntry };
