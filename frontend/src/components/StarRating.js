import React from 'react';
import './StarRating.css';

const StarRating = ({ rating, size = "medium", interactive = false, onChange }) => {
    const renderStars = () => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;

        for (let i = 1; i <= 5; i++) {
            if (interactive) {
                stars.push(
                    <span 
                        key={i} 
                        className={`star interactive ${size}`}
                        onClick={() => onChange(i)}
                        onMouseEnter={() => document.querySelectorAll('.star.interactive').forEach((star, index) => {
                            if (index < i) star.classList.add('hover');
                            else star.classList.remove('hover');
                        })}
                        onMouseLeave={() => document.querySelectorAll('.star.interactive').forEach(star => {
                            star.classList.remove('hover');
                        })}
                    >
                        {i <= fullStars ? "★" : "☆"}
                    </span>
                );
            } else {
                stars.push(
                    <span key={i} className={`star ${size}`}>
                        {i <= fullStars ? "★" : (i === fullStars + 1 && halfStar ? "★" : "☆")}
                    </span>
                );
            }
        }
        return stars;
    };

    return (
        <div className="star-rating">
            {renderStars()}
            {size !== "small" && <span className="rating-value">({rating.toFixed(1)})</span>}
        </div>
    );
};

export default StarRating;