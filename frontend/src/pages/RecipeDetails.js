import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './RecipeDetails.css'; // Import the CSS file
import CalendarPopup from '../components/CalendarPopup'; // Import the CalendarPopup component

const RecipeDetails = () => {
    const { id } = useParams();
    const { user, dispatch } = useRecipesContext();
    const [recipe, setRecipe] = useState(null);
    const [isSaved, setIsSaved] = useState(false); // State to track if the recipe is saved
    const [showSuccessModal, setShowSuccessModal] = useState(false); // State for success modal
    const [successMessage, setSuccessMessage] = useState(''); // State for success message
    const [addedIngredients, setAddedIngredients] = useState([]); // State to track added ingredients
    const [showCalendarPopup, setShowCalendarPopup] = useState(false); // State for calendar popup
    const [stepByStepMode, setStepByStepMode] = useState(false); // State for step-by-step mode
    const [currentStepIndex, setCurrentStepIndex] = useState(0); // State for current step index
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                const response = await fetch(`/api/recipes/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    setRecipe(data);
                } else {
                    console.error('Failed to fetch recipe:', data.message);
                }
            } catch (error) {
                console.error('Error fetching recipe:', error);
            }
        };

        const checkIfSaved = async () => {
            try {
                const response = await fetch(`/api/users/${user.userId}/saved-recipes`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();

                if (response.ok) {
                    const isRecipeSaved = data.some(savedRecipe => savedRecipe._id === id);
                    setIsSaved(isRecipeSaved);
                } else {
                    console.error('Failed to fetch saved recipes:', data.message);
                }
            } catch (error) {
                console.error('Error fetching saved recipes:', error);
            }
        };

        fetchRecipe();
        checkIfSaved();

        // Load added ingredients from local storage
        const storedAddedIngredients = localStorage.getItem(`addedIngredients_${id}`);
        if (storedAddedIngredients) {
            setAddedIngredients(JSON.parse(storedAddedIngredients));
        }
    }, [id, user.userId]);

    const handleAddToCart = async (ingredient) => {
        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    ingredient: ingredient.name,
                    quantity: parseInt(ingredient.quantity, 10),
                    unit: ingredient.unit || '' // Include unit
                })
            });

            if (response.ok) {
                setSuccessMessage('Ingredient added to cart successfully');
                setShowSuccessModal(true);
                const updatedAddedIngredients = [...addedIngredients, ingredient.name];
                setAddedIngredients(updatedAddedIngredients);
                localStorage.setItem(`addedIngredients_${id}`, JSON.stringify(updatedAddedIngredients));
            } else {
                console.error('Failed to add ingredient to cart');
            }
        } catch (error) {
            console.error('Error adding ingredient to cart:', error);
        }
    };

    const handleRemoveFromCart = async (ingredient) => {
        try {
            // First find the cart item to get its ID
            const cartResponse = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const cartData = await cartResponse.json();
            
            // Find the item in the cart that matches this ingredient
            const cartItem = cartData.items.find(item => 
                item.ingredient.toLowerCase() === ingredient.name.toLowerCase()
            );
            
            if (!cartItem) {
                console.error('Item not found in cart');
                return;
            }

            // Now delete it using its ID
            const response = await fetch('/api/cart/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ingredientId: cartItem._id })
            });

            if (response.ok) {
                setSuccessMessage('Ingredient removed from cart successfully');
                setShowSuccessModal(true);
                const updatedAddedIngredients = addedIngredients.filter(item => item !== ingredient.name);
                setAddedIngredients(updatedAddedIngredients);
                localStorage.setItem(`addedIngredients_${id}`, JSON.stringify(updatedAddedIngredients));
            } else {
                console.error('Failed to remove ingredient from cart');
            }
        } catch (error) {
            console.error('Error removing ingredient from cart:', error);
        }
    };

    const handleAddAllToCart = async () => {
        try {
            // Make sure each ingredient has a unit property (even if it's empty string)
            const ingredientsWithUnits = recipe.ingredients.map(ingredient => ({
                ...ingredient,
                unit: ingredient.unit || ''
            }));

            const response = await fetch('/api/cart/add-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ingredients: ingredientsWithUnits })
            });

            if (response.ok) {
                setSuccessMessage('All ingredients added to cart successfully');
                setShowSuccessModal(true);
                const allIngredientNames = recipe.ingredients.map(ingredient => ingredient.name);
                setAddedIngredients(allIngredientNames);
                localStorage.setItem(`addedIngredients_${id}`, JSON.stringify(allIngredientNames));
            } else {
                console.error('Failed to add all ingredients to cart');
            }
        } catch (error) {
            console.error('Error adding all ingredients to cart:', error);
        }
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(`/api/recipes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSuccessMessage(data.message); // Set success message from response
                setShowSuccessModal(true); // Show success modal
                dispatch({ type: 'DELETE_RECIPE', payload: id });
                setTimeout(() => {
                    navigate('/my-recipes'); // Navigate to My Recipes page after a delay
                }, 2000); // Adjust the delay as needed
            } else {
                console.error('Failed to delete recipe');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetch('/api/users/save-recipe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user.userId, recipeId: id })
            });

            if (response.ok) {
                setIsSaved(true);
                setSuccessMessage('Recipe Saved Successfully');
                setShowSuccessModal(true); // Show success modal
            } else {
                console.error('Failed to save recipe');
            }
        } catch (error) {
            console.error('Error saving recipe:', error);
        }
    };

    const handleUnsave = async () => {
        try {
            const response = await fetch('/api/users/delete-saved-recipe', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId: user.userId, recipeId: id })
            });

            if (response.ok) {
                setIsSaved(false);
                setSuccessMessage('Recipe Unsaved Successfully');
                setShowSuccessModal(true); // Show success modal
            } else {
                console.error('Failed to unsave recipe');
            }
        } catch (error) {
            console.error('Error unsaving recipe:', error);
        }
    };

    const handleSchedule = () => {
        setShowCalendarPopup(true);
    };

    const handleCalendarSubmit = async (date) => {
        try {
            const response = await fetch('/api/calendar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ recipeId: id, date })
            });
    
            if (response.ok) {
                setSuccessMessage('Recipe scheduled successfully');
                setShowSuccessModal(true);
                setShowCalendarPopup(false);
            } else {
                console.error('Failed to schedule recipe');
            }
        } catch (error) {
            console.error('Error scheduling recipe:', error);
        }
    };

    const handleOkClick = () => {
        setShowSuccessModal(false);
    };

    const handleClose = () => {
        navigate(-1); // Go back to the previous page
    };

    // Toggle step-by-step mode
    const toggleStepByStepMode = () => {
        setStepByStepMode(!stepByStepMode);
        setCurrentStepIndex(0); // Reset to first step when toggling mode
    };

    // Navigate to next step
    const nextStep = () => {
        if (currentStepIndex < recipe.steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            // At last step
            setSuccessMessage("Your dish is ready! 🎉");
            setShowSuccessModal(true);
        }
    };

    // Navigate to previous step
    const prevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    if (!recipe) {
        return <p>Loading...</p>;
    }

    return (
        <div className="recipe-details">
            <button className="close-btn" onClick={handleClose}>X</button>
            {recipe.mainImage && (
                <img src={`http://localhost:4000${recipe.mainImage}`} alt={recipe.title} className="recipe-image" />
            )}
            <h2>{recipe.title}</h2>
            <div className="recipe-info">
                <p><strong>Description:</strong> {recipe.description}</p>
                <p><strong>Total Time:</strong> {recipe.totalTime.hours} hours {recipe.totalTime.minutes} minutes</p>
                <p>
                    <strong>Ingredients:</strong>
                    <button className="add-all-to-cart-btn" onClick={handleAddAllToCart}>Add All to Cart</button>
                </p>
                <table className="ingredients-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Quantity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recipe.ingredients.map((ingredient, index) => (
                            <tr key={index}>
                                <td>{ingredient.name}</td>
                                <td>{ingredient.quantity} {ingredient.unit}</td>
                                <td>
                                    {addedIngredients.includes(ingredient.name) ? (
                                        <button
                                            className="add-to-cart-btn"
                                            onClick={() => handleRemoveFromCart(ingredient)}
                                        >
                                            Remove from cart
                                        </button>
                                    ) : (
                                        <button
                                            className="add-to-cart-btn"
                                            onClick={() => handleAddToCart(ingredient)}
                                        >
                                            Add to Cart
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p><strong>Nutrition:</strong></p>
                {recipe.nutrition ? (
                    <table className="nutrition-table">
                        <thead>
                            <tr>
                                <th>Calories</th>
                                <th>Fat</th>
                                <th>Protein</th>
                                <th>Carbs</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{recipe.nutrition.calories}</td>
                                <td>{recipe.nutrition.fat}</td>
                                <td>{recipe.nutrition.protein}</td>
                                <td>{recipe.nutrition.carbs}</td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <p>No nutrition information available.</p>
                )}
                
                {/* Steps section with step-by-step mode implementation */}
                <div className="steps-section">
                    <div className="steps-header">
                        <h3>Steps:</h3>
                        <button 
                            className="step-by-step-btn" 
                            onClick={toggleStepByStepMode}
                        >
                            {stepByStepMode ? "End Step-by-Step Mode" : "Step-by-Step Mode"}
                        </button>
                    </div>
                    
                    {stepByStepMode ? (
                        <div className="step-by-step-view">
                            <div className="step-counter">
                                Step {currentStepIndex + 1} of {recipe.steps.length}
                            </div>
                            
                            <div className="current-step">
                                <h4>Step {currentStepIndex + 1}</h4>
                                <p>{recipe.steps[currentStepIndex].text || recipe.steps[currentStepIndex].description}</p>
                                
                                {/* Display video if available */}
                                {recipe.steps[currentStepIndex].video && (
                                    <div className="step-video-container">
                                        <video 
                                            src={`http://localhost:4000${recipe.steps[currentStepIndex].video}`} 
                                            controls
                                            className="step-video"
                                            poster={recipe.steps[currentStepIndex].image ? `http://localhost:4000${recipe.steps[currentStepIndex].image}` : ''}
                                        >
                                            Your browser does not support video playback.
                                        </video>
                                    </div>
                                )}
                                
                                {/* Display image only if no video and image exists */}
                                {!recipe.steps[currentStepIndex].video && recipe.steps[currentStepIndex].image && (
                                    <img 
                                        src={`http://localhost:4000${recipe.steps[currentStepIndex].image}`} 
                                        alt={`Step ${currentStepIndex + 1}`} 
                                        className="step-image"
                                    />
                                )}
                                
                                {recipe.steps[currentStepIndex].ingredients && recipe.steps[currentStepIndex].ingredients.length > 0 && (
                                    <div className="step-ingredients">
                                        <h5>Ingredients for this step:</h5>
                                        <ul>
                                            {recipe.steps[currentStepIndex].ingredients.map((ing, idx) => (
                                                <li key={idx}>{ing}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {/* Support for single ingredient format */}
                                {recipe.steps[currentStepIndex].ingredient && (
                                    <div className="step-ingredients">
                                        <h5>Ingredients for this step:</h5>
                                        <p>{recipe.steps[currentStepIndex].ingredient} 
                                           {recipe.steps[currentStepIndex].quantity && ` - ${recipe.steps[currentStepIndex].quantity}`}
                                        </p>
                                    </div>
                                )}
                                
                                {recipe.steps[currentStepIndex].alternate && (
                                    <div className="step-alternate">
                                        <h5>Alternative ingredient:</h5>
                                        <p>{recipe.steps[currentStepIndex].alternate}</p>
                                    </div>
                                )}
                                
                                {recipe.steps[currentStepIndex].timer && (
                                    <div className="step-timer">
                                        <h5>Timer:</h5>
                                        <p>{recipe.steps[currentStepIndex].timer} minutes</p>
                                    </div>
                                )}
                                
                                <div className="step-navigation">
                                    <button 
                                        onClick={prevStep} 
                                        disabled={currentStepIndex === 0}
                                    >
                                        Previous
                                    </button>
                                    <button onClick={nextStep}>
                                        {currentStepIndex === recipe.steps.length - 1 ? "Finish" : "Next"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ol className="steps-list">
                            {recipe.steps.map((step, index) => (
                                <li key={index}>
                                    {step.text || step.description}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
                
                <p><strong>Created by:</strong> {recipe.createdBy.firstName} {recipe.createdBy.lastName}</p>
                <p><strong>Created on:</strong> {new Date(recipe.createdAt).toLocaleDateString()}</p>
            </div>
            
            {user && user.userId === recipe.createdBy._id ? (
                <div className="button-group">
                    <button className="btn update-btn" onClick={() => navigate(`/update-recipe/${recipe._id}`)}>Update</button>
                    <button className="btn delete-btn" onClick={handleDelete}>
                        <span className="material-icons">delete</span>
                    </button>
                </div>
            ) : (
                isSaved ? (
                    <button className="btn unsave-btn" onClick={handleUnsave}>Unsave</button>
                ) : (
                    <button className="btn save-btn" onClick={handleSave}>Save</button>
                )
            )}
            <button className="btn schedule-btn" onClick={handleSchedule}>Schedule</button>
            {showSuccessModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h4>{successMessage}</h4>
                        <button onClick={handleOkClick}>OK</button>
                    </div>
                </div>
            )}
            {showCalendarPopup && (
                <CalendarPopup onSubmit={handleCalendarSubmit} onClose={() => setShowCalendarPopup(false)} />
            )}
        </div>
    );
};

export default RecipeDetails;