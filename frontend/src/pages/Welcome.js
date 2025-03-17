import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import RecipeCard from '../components/RecipeCard';
import searchIcon from '../assets/search-icon.png';
import './Welcome.css';

const Welcome = () => {
    const { user, recipes, dispatch } = useRecipesContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filter states
    const [filters, setFilters] = useState({
        cuisineType: [],
        mealType: [],
        dietary: [],
        cookingTime: [],
        difficulty: []
    });

    // Filter options
    const filterOptions = {
        cuisineType: ['Indian', 'Chinese', 'Italian', 'Mexican', 'American', 'Thai', 'Japanese', 'Mediterranean', 'French'],
        mealType: ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Appetizer'],
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb'],
        cookingTime: ['Under 15 min', '15-30 min', '30-60 min', 'Over 60 min'],
        difficulty: ['Easy', 'Intermediate', 'Advanced']
    };

    // Add state to track which dropdown is open
    const [openDropdown, setOpenDropdown] = useState(null);
    const dropdownRefs = useRef({});
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown && dropdownRefs.current[openDropdown] && 
                !dropdownRefs.current[openDropdown].contains(event.target)) {
                setOpenDropdown(null);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdown]);
    
    // Toggle dropdown open/close
    const toggleDropdown = (category) => {
        setOpenDropdown(openDropdown === category ? null : category);
    };

    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                const response = await fetch('/api/recipes');
                const data = await response.json();

                if (response.ok) {
                    dispatch({ type: 'SET_RECIPES', payload: data });
                    setFilteredRecipes(data);
                }
            } catch (error) {
                console.error('Error fetching recipes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipes();
    }, [dispatch]);

    // Debug function to create or update recipe data
    const addDebugRecipes = async () => {
        if (!recipes || recipes.length === 0) {
            console.log("No recipes found");
            return;
        }
        
        // Get a single sample recipe
        const sampleRecipe = recipes[0];
        
        // Log the complete structure
        console.log("RECIPE STRUCTURE INVESTIGATION:");
        console.log("Complete recipe object:", sampleRecipe);
        
        // Check specific fields
        console.log("Recipe fields:");
        console.log("- title:", sampleRecipe.title);
        console.log("- description:", sampleRecipe.description);
        console.log("- tags:", sampleRecipe.tags);
        console.log("- totalTime:", sampleRecipe.totalTime);
        console.log("- ingredients:", sampleRecipe.ingredients ? sampleRecipe.ingredients.length : 0);
        console.log("- steps:", sampleRecipe.steps ? sampleRecipe.steps.length : 0);
        
        // Check for custom fields that we're trying to filter by
        console.log("Filter fields (might be missing):");
        console.log("- cuisine:", sampleRecipe.cuisine);
        console.log("- mealType:", sampleRecipe.mealType);
        console.log("- cookingTime:", sampleRecipe.cookingTime);
        console.log("- difficulty:", sampleRecipe.difficulty);
        
        // Check if tags contain any of our filter values
        if (sampleRecipe.tags && sampleRecipe.tags.length > 0) {
            console.log("Tags analysis:");
            console.log("- Contains cuisine?", filterOptions.cuisineType.some(c => sampleRecipe.tags.includes(c)));
            console.log("- Contains mealType?", filterOptions.mealType.some(m => sampleRecipe.tags.includes(m)));
            console.log("- Contains dietary?", filterOptions.dietary.some(d => sampleRecipe.tags.includes(d)));
            console.log("- Contains difficulty?", filterOptions.difficulty.some(d => sampleRecipe.tags.includes(d)));
        }
    }

    // Call this in useEffect if needed
    useEffect(() => {
        addDebugRecipes();
    }, [recipes]);

    // Handle filter changes
    const handleFilterChange = (category, value) => {
        setFilters(prevFilters => {
            const updatedFilters = { ...prevFilters };
            
            if (updatedFilters[category].includes(value)) {
                // Remove the value if already selected
                updatedFilters[category] = updatedFilters[category].filter(item => item !== value);
            } else {
                // Add the value if not already selected
                updatedFilters[category] = [...updatedFilters[category], value];
            }
            
            return updatedFilters;
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            cuisineType: [],
            mealType: [],
            dietary: [],
            cookingTime: [],
            difficulty: []
        });
        setSearchQuery('');
    };

    // Apply search and filters
    useEffect(() => {
        if (!recipes) return;
        
        let results = [...recipes];
        
        // Apply text search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            results = results.filter(recipe => 
                (recipe.title && recipe.title.toLowerCase().includes(query)) ||
                (recipe.description && recipe.description.toLowerCase().includes(query)) ||
                (recipe.tags && Array.isArray(recipe.tags) && recipe.tags.some(tag => 
                    tag.toLowerCase().includes(query)))
            );
        }
        
        // Apply filters with case-insensitive matching
        // 1. cuisineType filter - check against recipe.tags
        if (filters.cuisineType.length > 0) {
            results = results.filter(recipe => {
                if (!recipe.tags || !Array.isArray(recipe.tags)) return false;
                
                // Convert all tags to lowercase for case-insensitive comparison
                const lowercaseTags = recipe.tags.map(tag => tag.toLowerCase());
                
                return filters.cuisineType.some(cuisine => 
                    lowercaseTags.includes(cuisine.toLowerCase())
                );
            });
        }
        
        // 2. mealType filter - check against recipe.tags
        if (filters.mealType.length > 0) {
            results = results.filter(recipe => {
                if (!recipe.tags || !Array.isArray(recipe.tags)) return false;
                
                // Convert all tags to lowercase for case-insensitive comparison
                const lowercaseTags = recipe.tags.map(tag => tag.toLowerCase());
                
                return filters.mealType.some(mealType => 
                    lowercaseTags.includes(mealType.toLowerCase())
                );
            });
        }
        
        // 3. dietary filter - check against recipe.tags
        if (filters.dietary.length > 0) {
            results = results.filter(recipe => {
                if (!recipe.tags || !Array.isArray(recipe.tags)) return false;
                
                // Convert all tags to lowercase for case-insensitive comparison
                const lowercaseTags = recipe.tags.map(tag => tag.toLowerCase());
                
                return filters.dietary.some(diet => 
                    lowercaseTags.includes(diet.toLowerCase())
                );
            });
        }
        
        // 4. cookingTime filter - fallback to tag-based filtering if totalTime not available
        if (filters.cookingTime.length > 0) {
            results = results.filter(recipe => {
                // First try using totalTime
                if (recipe.totalTime) {
                    const totalMinutes = (recipe.totalTime.hours || 0) * 60 + (recipe.totalTime.minutes || 0);
                    
                    return filters.cookingTime.some(time => {
                        if (time === 'Under 15 min' && totalMinutes < 15) return true;
                        if (time === '15-30 min' && totalMinutes >= 15 && totalMinutes <= 30) return true;
                        if (time === '30-60 min' && totalMinutes > 30 && totalMinutes <= 60) return true;
                        if (time === 'Over 60 min' && totalMinutes > 60) return true;
                        return false;
                    });
                }
                
                // Fallback to tag-based filtering
                if (recipe.tags && Array.isArray(recipe.tags)) {
                    const lowercaseTags = recipe.tags.map(tag => tag.toLowerCase());
                    
                    // Check if tags contain the cooking time ranges
                    return filters.cookingTime.some(time => 
                        lowercaseTags.includes(time.toLowerCase())
                    );
                }
                
                return false;
            });
        }
        
        // 5. difficulty filter - check against recipe.tags
        if (filters.difficulty.length > 0) {
            results = results.filter(recipe => {
                if (!recipe.tags || !Array.isArray(recipe.tags)) return false;
                
                // Convert all tags to lowercase for case-insensitive comparison
                const lowercaseTags = recipe.tags.map(tag => tag.toLowerCase());
                
                return filters.difficulty.some(level => 
                    lowercaseTags.includes(level.toLowerCase())
                );
            });
        }
        
        console.log('Final filtered recipes count:', results.length);
        setFilteredRecipes(results);
    }, [recipes, searchQuery, filters]);

    // Search on Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            // Search is applied automatically through useEffect
        }
    };

    // Render filter section as dropdown
    const renderFilterSection = (category, title) => {
        const selectedCount = filters[category].length;
        
        return (
            <div className="filter-section">
                <div 
                    className={`filter-dropdown-header ${openDropdown === category ? 'active' : ''}`}
                    onClick={() => toggleDropdown(category)}
                >
                    <h3>{title}</h3>
                    <div className="filter-dropdown-info">
                        {selectedCount > 0 && (
                            <span className="selected-count">{selectedCount}</span>
                        )}
                        <span className="dropdown-arrow">{openDropdown === category ? '▲' : '▼'}</span>
                    </div>
                </div>
                
                {openDropdown === category && (
                    <div 
                        className="filter-dropdown-content" 
                        ref={el => dropdownRefs.current[category] = el}
                    >
                        {filterOptions[category].map(option => (
                            <label key={option} className="filter-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={filters[category].includes(option)}
                                    onChange={() => handleFilterChange(category, option)}
                                />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Helper function to make search more flexible
    const isMatchingFilter = (item, filter, field) => {
        if (!item || !item[field]) return false;
        
        // For array fields (like tags)
        if (Array.isArray(item[field])) {
            return item[field].some(value => 
                value.toLowerCase().includes(filter.toLowerCase())
            );
        }
        
        // For string fields
        return item[field].toLowerCase().includes(filter.toLowerCase());
    }

    // Add this as a more flexible alternative filter implementation if needed
    const applyFiltersAlternative = () => {
        if (!recipes) return [];
        
        let results = [...recipes];
        
        // Text search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            results = results.filter(recipe => 
                (recipe.title && recipe.title.toLowerCase().includes(query)) ||
                (recipe.description && recipe.description.toLowerCase().includes(query)) ||
                (recipe.cuisine && recipe.cuisine.toLowerCase().includes(query)) ||
                (recipe.tags && Array.isArray(recipe.tags) && 
                    recipe.tags.some(tag => tag.toLowerCase().includes(query)))
            );
        }
        
        // Very simple filtering approach as fallback
        if (filters.cuisineType.length > 0) {
            results = results.filter(recipe => 
                filters.cuisineType.some(cuisine => 
                    recipe.cuisine && recipe.cuisine.toLowerCase() === cuisine.toLowerCase()
                )
            );
        }
        
        if (filters.mealType.length > 0) {
            results = results.filter(recipe => 
                filters.mealType.some(type => 
                    recipe.mealType && recipe.mealType.toLowerCase() === type.toLowerCase()
                )
            );
        }
        
        if (filters.dietary.length > 0) {
            results = results.filter(recipe => 
                recipe.tags && Array.isArray(recipe.tags) &&
                filters.dietary.some(dietary => 
                    recipe.tags.some(tag => tag.toLowerCase() === dietary.toLowerCase())
                )
            );
        }
        
        return results;
    }

    return (
        <div className="welcome-container with-sidebar">
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
                    <button className="search-icon-button">
                        <img src={searchIcon} alt="Search" className="search-icon" />
                    </button>
                </div>
                <p>Explore and share your favorite recipes</p>
            </div>
            
            <div className="welcome-content">
                <div className="filters-sidebar">
                    <div className="filters-header">
                        <h2>Filters</h2>
                        <button className="clear-filters-btn" onClick={clearFilters}>Clear All</button>
                    </div>
                    
                    {renderFilterSection('cuisineType', 'Cuisine')}
                    {renderFilterSection('mealType', 'Meal Type')}
                    {renderFilterSection('dietary', 'Dietary')}
                    {renderFilterSection('cookingTime', 'Cooking Time')}
                    {renderFilterSection('difficulty', 'Difficulty')}
                </div>
                
                <div className="recipes-container">
                    <div className="search-summary">
                        
                        {Object.values(filters).some(arr => arr.length > 0) && (
                            <div className="active-filters">
                                {Object.entries(filters).map(([category, values]) => 
                                    values.map(value => (
                                        <span key={`${category}-${value}`} className="filter-tag">
                                            {value}
                                            <button onClick={() => handleFilterChange(category, value)}>×</button>
                                        </span>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    
                    {loading ? (
                        <div className="loading-spinner">Loading...</div>
                    ) : filteredRecipes.length > 0 ? (
                        <div className="recipes-grid">
                            {filteredRecipes.map((recipe) => (
                                <RecipeCard key={recipe._id} recipe={recipe} />
                            ))}
                        </div>
                    ) : (
                        <div className="no-results">
                            <span className="material-icons">search_off</span>
                            <h3>No recipes found</h3>
                            <p>We couldn't find any recipes matching your current filters</p>
                            <div className="active-filters-summary">
                                {Object.entries(filters)
                                    .filter(([_, values]) => values.length > 0)
                                    .map(([category, values]) => (
                                        <div key={category} className="filter-category">
                                            <strong>{category}:</strong> {values.join(', ')}
                                        </div>
                                    ))}
                            </div>
                            <button className="reset-search-btn" onClick={clearFilters}>Reset All Filters</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Welcome;