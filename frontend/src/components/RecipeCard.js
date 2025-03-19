import React from 'react';
import { useNavigate } from 'react-router-dom';
//import StarRating from './StarRating';
import './RecipeCard.css';
import { getImageUrl } from '../utils/imageHelper';

const RecipeCard = ({ recipe, onUnsave }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/recipe/${recipe._id}`);
  };

  const calculateAvgRating = (ratings) => {
    if (!ratings || ratings.length === 0) return { avg: 0, count: 0 };
    const sum = ratings.reduce((total, r) => total + r.rating, 0);
    return {
      avg: sum / ratings.length,
      count: ratings.length
    };
  };

  // Format time for display
  const formatTime = (totalTime) => {
    if (!totalTime) return 'N/A';
    let timeString = '';
    if (totalTime.hours > 0) timeString += `${totalTime.hours}h `;
    timeString += `${totalTime.minutes}m`;
    return timeString;
  };

  return (
    <div className="recipe-item" onClick={handleClick}>
      <div className="recipe-image-container">
        {recipe.mainImage ? (
          <img 
            src={getImageUrl(recipe.mainImage)} 
            alt={recipe.title} 
            className="recipe-image"
          />
        ) : (
          <div className="placeholder-image">
            <span className="material-icons">restaurant_menu</span>
          </div>
        )}
        
        {/* Display the actual recipe time at top */}
        {recipe.totalTime && (
          <div className="time-badge">
            <span className="material-icons">schedule</span>
            <span>{formatTime(recipe.totalTime)}</span>
          </div>
        )}
        
        {/* Optional: Only show if this is specifically a saved recipe */}
        {onUnsave && (
          <button 
            className="unsave-button"
            onClick={(e) => {
              e.stopPropagation();
              onUnsave(recipe._id, e);
            }}
            title="Remove from favorites"
          >
            <span className="material-icons">bookmark_remove</span>
          </button>
        )}
      </div>
      
      <div className="recipe-content">
        <div className="recipe-title-container">
          <h4>{recipe.title}</h4>
          {recipe.ratings && recipe.ratings.length > 0 && (
            <div className="recipe-rating">
              <span className="star material-icons">star</span>
              <span className="rating-value">{calculateAvgRating(recipe.ratings).avg.toFixed(1)}</span>
              <span className="rating-count">{calculateAvgRating(recipe.ratings).count}</span>
            </div>
          )}
        </div>
        <div className="recipe-meta">
          <div>
            <span className="material-icons">restaurant_menu</span>
            {recipe.ingredients?.length || 0} items
          </div>
          <div className="recipe-author">
            <span className="material-icons">person</span>
            {recipe.createdBy?.firstName || 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;