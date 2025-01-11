import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';

const Welcome = () => {
    const { user, dispatch } = useRecipesContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [recipes, setRecipes] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                const response = await fetch('/api/recipes', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    setRecipes(data);
                    dispatch({ type: 'SET_RECIPES', payload: data });
                } else {
                    console.error('Failed to fetch recipes:', data.message);
                }
            } catch (error) {
                console.error('Error fetching recipes:', error);
            }
        };

        fetchRecipes();
    }, [dispatch]);

    const handleSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/search-results?query=${searchQuery}`);
        }
    };

    const handleAddRecipe = () => {
        navigate('/add-recipe');
    };

    const handleMyRecipes = () => {
        navigate('/my-recipes');
    };

    const handleSavedRecipes = () => {
        navigate('/saved-recipes');
    };

    return (
        <div className="welcome-container">
            <h1>Welcome, {user ? user.firstName : 'Guest'}!</h1>
            <p>Explore and share your favorite recipes.</p>
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="button-group">
                    <button onClick={handleSearch}>Search</button>
                    <button onClick={handleAddRecipe}>Add Recipe</button>
                    <button onClick={handleMyRecipes}>My Recipes</button>
                    <button onClick={handleSavedRecipes}>Saved Recipes</button>
                </div>
            </div>
            <div className="recipes-grid">
                {recipes.map((recipe) => (
                    <div 
                        key={recipe._id} 
                        className="recipe-item" 
                        onClick={() => navigate(`/recipe/${recipe._id}`)}
                        style={{ cursor: 'pointer', textAlign: 'center', marginBottom: '20px' }}
                    >
                        {recipe.mainImage && (
                            <img src={`${process.env.REACT_APP_BASE_URL}${recipe.mainImage}`} alt={recipe.title} style={{ width: '100%', borderRadius: '8px' }} />
                        )}
                        <h4>{recipe.title}</h4>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Welcome;
