import React, { useEffect, useState } from 'react';
import { useRecipesContext } from '../hooks/useRecipesContext';
import { useNavigate } from 'react-router-dom';
import './MyRecipes.css'; // Import the CSS file for styling
import RecipeCard from '../components/RecipeCard'; // Fix the import path
import LoadingAnimation from '../components/LoadingAnimation';

const MyRecipes = () => {
    const { user } = useRecipesContext();
    const [recipes, setRecipes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserRecipes = async () => {
            if (!user) return;

            try {
                const response = await fetch(`/api/recipes/user/${user.userId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                setRecipes(data);
            } catch (error) {
                console.error('Error fetching user recipes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserRecipes();
    }, [user]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this recipe?')) {
            try {
                const response = await fetch(`/api/recipes/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                setRecipes(recipes.filter(recipe => recipe._id !== id));
            } catch (error) {
                console.error('Error deleting recipe:', error);
            }
        }
    };

    return (
        <div className="my-recipes">
            <h1>My Recipes</h1>
            {isLoading && <LoadingAnimation message="Loading your recipes..." />}
            <div className="recipes-grid">
                {recipes.length > 0 ? (
                    recipes.map((recipe) => (
                        <div key={recipe._id} className="recipe-wrapper" onClick={() => navigate(`/recipe/${recipe._id}`)}>
                            <RecipeCard recipe={recipe} />
                            <div className="recipe-actions">
                                <button 
                                    className="action-btn delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(recipe._id);
                                    }}
                                    style={{
                                        backgroundColor: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        position: 'absolute',
                                        bottom: '15px',
                                        right: '15px',
                                        zIndex: '100'
                                    }}
                                >
                                    <span className="material-icons">delete</span> Delete
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-recipes">
                        <span className="material-icons no-recipes-icon">menu_book</span>
                        <p>You haven't created any recipes yet.</p>
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

export default MyRecipes;