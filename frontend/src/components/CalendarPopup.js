import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './CalendarPopup.css';

const CalendarPopup = ({ onSubmit, onClose }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedMealTime, setSelectedMealTime] = useState('Dinner');

    const handleSubmit = () => {
        // Pass both the date and meal time to the parent component
        onSubmit(selectedDate, selectedMealTime);
    };

    return (
        <div className="calendar-popup-overlay" onClick={onClose}>
            <div className="calendar-popup" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>×</button>
                <h3>Schedule Recipe</h3>
                <DatePicker
                    selected={selectedDate}
                    onChange={date => setSelectedDate(date)}
                    inline
                    minDate={new Date()}
                />
                <div className="meal-time-selector">
                    <label>Meal Type:</label>
                    <select 
                        value={selectedMealTime}
                        onChange={(e) => setSelectedMealTime(e.target.value)}
                    >
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                        <option value="Snack">Snack</option>
                    </select>
                </div>
                <div className="calendar-popup-buttons">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="schedule-btn" onClick={handleSubmit}>Schedule</button>
                </div>
            </div>
        </div>
    );
};

export default CalendarPopup;