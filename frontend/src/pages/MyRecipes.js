import React, { useEffect, useState } from 'react';
import { useRecipesContext } from '../hooks/useRecipesContext';
import { useNavigate } from 'react-router-dom';
import './MyRecipes.css'; // Import the CSS file for styling

const MyRecipes = () => {
    const { user } = useRecipesContext();
    const [recipes, setRecipes] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserRecipes = async () => {
            if (!user || !user.userId) {
                console.error('User ID is not available');
                return;
            }

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
            }
        };

        fetchUserRecipes();
    }, [user]);

    const handleRecipeClick = (id) => {
        navigate(`/recipe/${id}`);
    };

    const handleDelete = async (id) => {
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
    };

    return (
        <div className="my-recipes">
            <h1>My Recipes</h1>
            <div className="recipes-grid">
                {recipes.length > 0 ? (
                    recipes.map((recipe) => (
                        <div 
                            key={recipe._id} 
                            className="recipe-item" 
                            onClick={() => handleRecipeClick(recipe._id)}
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
                            </div>
                            <div className="recipe-content">
                                <h4>{recipe.title}</h4>
                                <div className="recipe-actions">
                                    <button 
                                        className="action-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/update-recipe/${recipe._id}`);
                                        }}
                                    >
                                        <span className="material-icons">edit</span> Edit
                                    </button>
                                    <button 
                                        className="action-btn delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(recipe._id);
                                        }}
                                    >
                                        <span className="material-icons">delete</span> Delete
                                    </button>
                                </div>
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