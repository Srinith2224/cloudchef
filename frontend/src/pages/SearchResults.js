import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './SearchResults.css';


const SearchResults = () => {
    const { dispatch } = useRecipesContext();
    const [searchResults, setSearchResults] = useState([]);
    const location = useLocation();
    const navigate = useNavigate();
    const query = new URLSearchParams(location.search).get('query');

    useEffect(() => {
        const fetchSearchResults = async () => {
            try {
                const response = await fetch(`/api/recipes/search?query=${query}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    setSearchResults(data);
                    dispatch({ type: 'SET_SEARCH_RESULTS', payload: data });
                } else {
                    console.error('Failed to fetch search results:', data.message);
                }
            } catch (error) {
                console.error('Error fetching search results:', error);
            }
        };

        fetchSearchResults();
    }, [query, dispatch]);

    return (
        <div className="search-results-container">
            
            <h1>Search Results for "{query}"</h1>
            <div className="recipes-grid">
                {searchResults.length > 0 ? (
                    searchResults.map((recipe) => (
                        <div 
                            key={recipe._id} 
                            className="recipe-item" 
                            onClick={() => navigate(`/recipe/${recipe._id}`)}
                            style={{ cursor: 'pointer', textAlign: 'center', marginBottom: '20px' }}
                        >
                            {recipe.mainImage && (
                                <img src={`http://localhost:4000${recipe.mainImage}`} alt={recipe.title} style={{ width: '100%', borderRadius: '8px' }} />
                            )}
                            <h4>{recipe.title}</h4>
                        </div>
                    ))
                ) : (
                    <p>No recipes found.</p>
                )}
            </div>
        </div>
    );
};

export default SearchResults;