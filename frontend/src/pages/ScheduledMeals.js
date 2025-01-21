// frontend/src/pages/ScheduledMeals.js
import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './ScheduledMeals.css';


const ScheduledMeals = () => {
    const { user } = useRecipesContext();
    const [scheduledMeals, setScheduledMeals] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchScheduledMeals = async () => {
            try {
                const response = await fetch('/api/calendar', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    setScheduledMeals(data);
                } else {
                    console.error('Failed to fetch scheduled meals:', data.message);
                }
            } catch (error) {
                console.error('Error fetching scheduled meals:', error);
            }
        };

        fetchScheduledMeals();
    }, [user.userId]);

    const handleDelete = async (mealId) => {
        try {
            const response = await fetch(`/api/calendar/${mealId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                setScheduledMeals(scheduledMeals.filter(meal => meal._id !== mealId));
            } else {
                console.error('Failed to delete scheduled meal');
            }
        } catch (error) {
            console.error('Error deleting scheduled meal:', error);
        }
    };

    const events = scheduledMeals.map(meal => ({
        title: meal.recipeId?.title || 'Unknown Recipe',
        date: meal.date,
        id: meal._id,
        recipeId: meal.recipeId?._id
    }));

    const eventContent = (eventInfo) => {
        return (
            <div className="event-content">
                <span
                    className="recipe-title"
                    onClick={() => navigate(`/recipe/${eventInfo.event.extendedProps.recipeId}`)}
                >
                    {eventInfo.event.title}
                </span>
                <button
                    className="delete-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(eventInfo.event.id);
                    }}
                >
                    <span className="material-icons">delete</span>
                </button>
            </div>
        );
    };

    return (
        <div className="scheduled-meals">
            <h1>Scheduled Meals</h1>
            <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                events={events}
                eventContent={eventContent}
            />
        </div>
    );
};

export default ScheduledMeals;