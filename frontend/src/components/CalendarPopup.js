import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './CalendarPopup.css';

const CalendarPopup = ({ onSubmit, onClose }) => {
    const [selectedDate, setSelectedDate] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedDate) {
            onSubmit(selectedDate.toISOString().split('T')[0]);
        }
    };

    return (
        <div className="calendar-popup">
            <div className="calendar-popup-content">
                <h4>Schedule This Meal</h4>
                <form onSubmit={handleSubmit}>
                    <div className="date-picker-container">
                        <label htmlFor="date">Select Date:</label>
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            minDate={new Date()}
                            dateFormat="yyyy-MM-dd"
                            className="custom-date-picker"
                            placeholderText="Select a date"
                            wrapperClassName="date-picker-wrapper"
                        />
                    </div>
                    <div className="calendar-popup-buttons">
                        <button type="submit">Done</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CalendarPopup;