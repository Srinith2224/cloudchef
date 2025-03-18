import React, { useEffect, useState } from 'react';
import { useRecipesContext } from '../hooks/useRecipesContext';
import { useNavigate } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import './SavedRecipes.css'; // Import the CSS file for styling
import LoadingAnimation from '../components/LoadingAnimation';

const SavedRecipes = () => {
    const { user } = useRecipesContext();
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [unsaveMessage, setUnsaveMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
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
            } finally {
                setIsLoading(false);
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
            
            {isLoading && <LoadingAnimation message="Loading your saved recipes..." />}

            <div className="recipes-grid">
                {savedRecipes.length > 0 ? (
                    savedRecipes.map((recipe) => (
                        <RecipeCard 
                            key={recipe._id}
                            recipe={recipe}
                            onUnsave={handleUnsave}
                        />
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