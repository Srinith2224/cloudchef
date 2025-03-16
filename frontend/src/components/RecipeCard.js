import React from 'react';
import { useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import './RecipeCard.css';

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

  return (
    <div className="recipe-item" onClick={handleClick}>
      <div className="recipe-image-container">
        {recipe.mainImage ? (
          <img src={`http://localhost:4000${recipe.mainImage}`} alt={recipe.title} />
        ) : (
          <div className="placeholder-image">
            <span className="material-icons">restaurant_menu</span>
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
        
        {/* Show first tag as cuisine tag */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="cuisine-tag">
            <span className="material-icons">restaurant</span>
            {recipe.tags[0]}
          </div>
        )}
      </div>
      
      <div className="recipe-content">
        <h4>{recipe.title}</h4>
        <div className="recipe-meta">
          <div>
            <span className="material-icons">schedule</span>
            {recipe.totalTime ? `${recipe.totalTime.hours}h ${recipe.totalTime.minutes}m` : 'N/A'}
          </div>
          <div>
            <span className="material-icons">restaurant_menu</span>
            {recipe.ingredients?.length || 0} items
          </div>
          {recipe.ratings && recipe.ratings.length > 0 && (
            <div className="recipe-rating">
              <StarRating 
                rating={calculateAvgRating(recipe.ratings).avg} 
                small={true} 
              />
              <span className="rating-count">({calculateAvgRating(recipe.ratings).count})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;