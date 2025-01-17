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
                            style={{ cursor: 'pointer', textAlign: 'center', marginBottom: '20px' }}
                        >
                            {recipe.mainImage && (
                                <img src={`http://localhost:4000${recipe.mainImage}`} alt={recipe.title} style={{ width: '100%', borderRadius: '8px' }} />
                            )}
                            <h4>{recipe.title}</h4>
                        </div>
                    ))
                ) : (
                    <p>No recipes available.</p>
                )}
            </div>
        </div>
    );
};

export default MyRecipes;