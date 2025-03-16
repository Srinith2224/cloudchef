import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RecipeCard.css';

const RecipeCard = ({ recipe, onUnsave }) => {
    const navigate = useNavigate();
    
    const handleClick = () => {
        navigate(`/recipe/${recipe._id}`);
    };
    
    const handleUnsaveClick = (e) => {
        e.stopPropagation();
        if (onUnsave) {
            onUnsave(recipe._id, e);
        }
    };
    
    // Format time to display
    const formatTime = () => {
        if (!recipe.totalTime) return '-- min';
        const { hours, minutes } = recipe.totalTime;
        if (hours && minutes) return `${hours}h ${minutes}m`;
        if (hours) return `${hours}h`;
        return `${minutes}m`;
    };

    return (
        <div className="recipe-item" onClick={handleClick}>
            <div className="recipe-image-container">
                {recipe.mainImage ? (
                    <img 
                        src={`http://localhost:4000${recipe.mainImage}`}
                        alt={recipe.title} 
                    />
                ) : (
                    <div className="placeholder-image">
                        <span className="material-icons">image</span>
                    </div>
                )}
                
                {recipe.cuisine && (
                    <div className="cuisine-badge">
                        <span className="material-icons">restaurant</span>
                        {recipe.cuisine}
                    </div>
                )}
                
                <div className="time-badge">
                    <span className="material-icons">schedule</span>
                    {formatTime()}
                </div>
            </div>
            
            <div className="recipe-content">
                <div className="recipe-header">
                    <h4>{recipe.title}</h4>
                    
                    <div className="recipe-rating">
                        <span className="star material-icons">star</span>
                        <span>{recipe.averageRating ? recipe.averageRating.toFixed(1) : '0.0'}</span>
                        <span className="rating-count">({recipe.ratingCount || 0})</span>
                    </div>
                </div>
                
                {recipe.tags && recipe.tags.length > 0 && (
                    <div className="recipe-tags">
                        {recipe.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="recipe-tag">{tag}</span>
                        ))}
                        {recipe.tags.length > 3 && <span className="recipe-tag">+{recipe.tags.length - 3}</span>}
                    </div>
                )}
                
                <div className="recipe-meta">
                    <div>
                        <span className="material-icons">restaurant_menu</span>
                        {recipe.ingredients ? recipe.ingredients.length : 0} ingredients
                    </div>
                    <div>
                        <span className="material-icons">description</span>
                        {recipe.steps ? recipe.steps.length : 0} steps
                    </div>
                </div>
            </div>
            
            {onUnsave && (
                <button className="unsave-button" onClick={handleUnsaveClick}>
                    <span className="material-icons">bookmark_remove</span>
                </button>
            )}
        </div>
    );
};

export default RecipeCard;