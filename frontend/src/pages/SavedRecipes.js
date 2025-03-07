import React, { useEffect, useState } from 'react';
import { useRecipesContext } from '../hooks/useRecipesContext';
import { useNavigate } from 'react-router-dom';
import './SavedRecipes.css'; // Import the CSS file for styling

const SavedRecipes = () => {
    const { user } = useRecipesContext();
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [unsaveMessage, setUnsaveMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSavedRecipes = async () => {
            try {
                const response = await fetch(`/api/users/${user.userId}/saved-recipes`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    setSavedRecipes(data);
                } else {
                    console.error('Failed to fetch saved recipes:', data.message);
                }
            } catch (error) {
                console.error('Error fetching saved recipes:', error);
            }
        };

        fetchSavedRecipes();
    }, [user.userId]);

    const handleUnsave = async (recipeId, e) => {
        e.stopPropagation(); // Prevent navigating to the recipe details page
        try {
            const response = await fetch('/api/users/delete-saved-recipe', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user.userId, recipeId })
            });

            if (response.ok) {
                setSavedRecipes(savedRecipes.filter(recipe => recipe._id !== recipeId));
                setUnsaveMessage('Recipe unsaved successfully');
                
                // Clear message after 3 seconds
                setTimeout(() => {
                    setUnsaveMessage('');
                }, 3000);
            } else {
                console.error('Failed to unsave recipe');
            }
        } catch (error) {
            console.error('Error unsaving recipe:', error);
        }
    };

    return (
        <div className="saved-recipes-container">
            <h1>Saved Recipes</h1>
            
            {unsaveMessage && (
                <div className="unsave-message">
                    {unsaveMessage}
                </div>
            )}
            
            <div className="recipes-grid">
                {savedRecipes.length > 0 ? (
                    savedRecipes.map((recipe) => (
                        <div 
                            key={recipe._id} 
                            className="recipe-item" 
                            onClick={() => navigate(`/recipe/${recipe._id}`)}
                        >
                            <div className="recipe-image-container">
                                {recipe.mainImage ? (
                                    <img 
                                        src={`http://localhost:4000${recipe.mainImage}`} 
                                        alt={recipe.title}
                                    />
                                ) : (
                                    <div className="placeholder-image">
                                        <span className="material-icons">restaurant_menu</span>
                                    </div>
                                )}
                                <button 
                                    className="unsave-button"
                                    onClick={(e) => handleUnsave(recipe._id, e)}
                                    title="Remove from favorites"
                                >
                                    <span className="material-icons">bookmark_remove</span>
                                </button>
                                <div className="saved-tag">
                                    <span className="material-icons">bookmark</span>
                                    Saved
                                </div>
                            </div>
                            <div className="recipe-content">
                                <h4>{recipe.title}</h4>
                                <div className="recipe-meta">
                                    <div>
                                        <span className="material-icons">schedule</span>
                                        {recipe.totalTime ? 
                                            `${recipe.totalTime.hours}h ${recipe.totalTime.minutes}m` : 
                                            'N/A'
                                        }
                                    </div>
                                    <div>
                                        <span className="material-icons">restaurant_menu</span>
                                        {recipe.ingredients?.length || 0} items
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-recipes">
                        <span className="material-icons no-recipes-icon">bookmark_border</span>
                        <p>You haven't saved any recipes yet</p>
                        <button 
                            className="browse-recipes-btn" 
                            onClick={() => navigate('/welcome')}  // Change from '/' to '/welcome'
                        >
                            Discover Recipes
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedRecipes;