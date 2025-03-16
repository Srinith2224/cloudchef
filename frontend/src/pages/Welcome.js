import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './Welcome.css';
import searchIcon from '../assets/search-icon.png';
import RecipeCard from '../components/RecipeCard'; // Import the RecipeCard component

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
                    <RecipeCard key={recipe._id} recipe={recipe} />
                ))}
            </div>
        </div>
    );
};

export default Welcome;