import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './Welcome.css';
import searchIcon from '../assets/search-icon.png';

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


    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            if (user) {
                navigate(`/search-results?query=${searchQuery}`);
            } else {
                // For guests, search within welcome page or show auth prompt
                navigate(`/welcome?query=${searchQuery}`);
            }
        }
    };
    
    const handleCuisineSearch = (cuisine) => {
        if (user) {
            navigate(`/search-results?query=${cuisine}`);
        } else {
            // For guests, search within welcome page or show auth prompt
            navigate(`/welcome?query=${cuisine}`);
        }
    };

    const handleRecipeClick = (recipeId) => {
        navigate(`/recipe/${recipeId}`);
    };

    return (
        <div className="welcome-container">
            {!user && (
                <div className="guest-banner">
                    <p>You're browsing as a guest. <Link to="/Auth">Sign in</Link> or <Link to="/Auth">create an account</Link> to create recipes, save favorites, and more!</p>
                </div>
            )}
            
            <div className="search-bar">
                <div className="search-input-container">
                    <input
                        type="text"
                        placeholder="Search recipes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button className="search-icon-button" onClick={handleSearch}>
                        <img src={searchIcon} alt="Search" className="search-icon" />
                    </button>
                </div>
                <p>Explore and share your favorite recipes.</p>
            </div>
            
            <div className="button-group">
                <button onClick={() => handleCuisineSearch('Indian')}>Indian</button>
                <button onClick={() => handleCuisineSearch('Chinese')}>Chinese</button>
                <button onClick={() => handleCuisineSearch('Italian')}>Italian</button>
                <button onClick={() => handleCuisineSearch('Mexican')}>Mexican</button>
                <button onClick={() => handleCuisineSearch('American')}>American</button>
                <button onClick={() => handleCuisineSearch('BreakFast')}>Breakfast</button>
                <button onClick={() => handleCuisineSearch('Lunch')}>Lunch</button>
                <button onClick={() => handleCuisineSearch('Dessert')}>Dessert</button>
            </div>
            
            <div className="recipes-grid">
                {recipes.map((recipe) => (
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
                            </div>
                            {recipe && recipe.createdBy && (
                                <Link to={`/user/${recipe.createdBy._id}`} className="recipe-author-link">
                                    <div className="recipe-card-author">
                                        {recipe.createdBy.profilePhoto ? (
                                            <img 
                                                src={recipe.createdBy.profilePhoto.startsWith('http') ? 
                                                    recipe.createdBy.profilePhoto : 
                                                    `http://localhost:4000${recipe.createdBy.profilePhoto}`} 
                                                alt="Author" 
                                                className="recipe-author-image"
                                            />
                                        ) : (
                                            <div className="recipe-author-placeholder">
                                                <span className="material-icons">account_circle</span>
                                            </div>
                                        )}
                                        <span className="recipe-author-name">{recipe.createdBy.firstName}</span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Welcome;