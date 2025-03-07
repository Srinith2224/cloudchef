import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import './ScheduledMeals.css';

const ScheduledMeals = () => {
    const { user } = useRecipesContext();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchScheduledMeals = async () => {
            if (!user || !user.userId) {
                console.error('User ID is not available');
                setLoading(false);
                return;
            }

            try {
                // Remove or comment out this console.log
                // console.log('Fetching scheduled meals for user ID:', user.userId);
                
                const response = await fetch(`/api/calendar/${user.userId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch scheduled meals: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                // Remove or comment out this console.log
                // console.log('Calendar data received:', data);
                
                if (!Array.isArray(data)) {
                    console.error('Expected array of scheduled meals, received:', typeof data);
                    setEvents([]);
                    setLoading(false);
                    return;
                }
                
                // Transform data into calendar events
                const calendarEvents = data.map(entry => {
                    // Remove or comment out this console.log
                    // console.log('Processing entry:', entry);
                    
                    // Validate the entry structure
                    if (!entry || !entry.recipeId) {
                        console.error('Invalid meal entry:', entry);
                        return null;
                    }
                    
                    // Format the date properly for FullCalendar
                    let formattedDate;
                    try {
                        const dateObj = new Date(entry.date);
                        formattedDate = dateObj.toISOString().split('T')[0];
                        // Remove or comment out this console.log
                        // console.log(`Date conversion: ${entry.date} -> ${formattedDate}`);
                    } catch (e) {
                        console.error('Date parsing error:', e);
                        formattedDate = new Date().toISOString().split('T')[0]; // Fallback to today
                    }
                    
                    return {
                        id: entry._id,
                        title: entry.recipeId.title || 'Unnamed Recipe',
                        start: formattedDate,
                        recipeId: entry.recipeId._id,
                        mealTime: entry.mealTime || 'Dinner',
                        extendedProps: {
                            recipeDetails: entry.recipeId
                        }
                    };
                }).filter(Boolean); // Filter out any null entries
                
                // Remove or comment out this console.log
                // console.log('Calendar events created:', calendarEvents);
                setEvents(calendarEvents);
            } catch (error) {
                console.error('Error fetching scheduled meals:', error);
                setError('Failed to load your meal plan. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchScheduledMeals();
    }, [user]);

    const handleDeleteMeal = async (mealId, e) => {
        // Stop event propagation to prevent navigation
        if (e) {
            e.stopPropagation();
        }
        
        try {
            console.log('Deleting meal with ID:', mealId);
            const response = await fetch(`/api/calendar/${mealId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                // Remove the deleted meal from state
                setEvents(prevEvents => prevEvents.filter(event => event.id !== mealId));
                console.log('Meal deleted successfully');
            } else {
                console.error('Failed to delete scheduled meal');
            }
        } catch (error) {
            console.error('Error deleting scheduled meal:', error);
        }
    };

    const handleEventClick = (info) => {
        // Navigate to recipe details page
        if (info.event.extendedProps.recipeDetails && info.event.extendedProps.recipeDetails._id) {
            console.log('Navigating to recipe:', info.event.extendedProps.recipeDetails._id);
            navigate(`/recipe/${info.event.extendedProps.recipeDetails._id}`);
        } else {
            console.error('Missing recipe details or ID:', info.event.extendedProps);
        }
    };

    // Custom event rendering
    const renderEventContent = (eventInfo) => {
        return (
            <div className="event-content">
                <div className="recipe-title">{eventInfo.event.title}</div>
                <div className="meal-time">
                    <span className="material-icons">schedule</span>
                    {eventInfo.event.extendedProps.mealTime || 'Dinner'}
                </div>
                <button 
                    className="delete-btn"
                    onClick={(e) => handleDeleteMeal(eventInfo.event.id, e)}
                    title="Remove from calendar"
                >
                    <span className="material-icons">close</span>
                </button>
            </div>
        );
    };

    return (
        <div className="scheduled-meals-container">
            <h1>My Meal Plan</h1>
            
            <div className="calendar-container">
                {loading ? (
                    <div className="loading">Loading your meal plan...</div>
                ) : error ? (
                    <div className="error-message">{error}</div>
                ) : events.length > 0 ? (
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        events={events}
                        eventContent={renderEventContent}
                        eventClick={handleEventClick}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,dayGridWeek'
                        }}
                        height="auto"
                        fixedWeekCount={false}
                    />
                ) : (
                    <div className="empty-calendar-message">
                        <span className="material-icons">calendar_month</span>
                        <h3>No meals scheduled yet</h3>
                        <p>Start planning your meals by scheduling recipes from our collection.</p>
                        <button 
                            className="browse-recipes-btn" 
                            onClick={() => navigate('/welcome')}
                        >
                            Discover Recipes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduledMeals;