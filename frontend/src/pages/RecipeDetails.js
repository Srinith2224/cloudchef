import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import CalendarPopup from '../components/CalendarPopup';
import './RecipeDetails.css';

// Component for the immersive step-by-step mode
const ImmersiveStepMode = ({ recipe, onExit }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    const totalSteps = recipe.steps.length;
    const currentStep = recipe.steps[currentStepIndex];
    const isLastStep = currentStepIndex === totalSteps - 1;
    const isFirstStep = currentStepIndex === 0;
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;
    
    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowRight' && !isLastStep) {
            handleNextStep();
        } else if (e.key === 'ArrowLeft' && !isFirstStep) {
            handlePrevStep();
        } else if (e.key === 'Escape') {
            onExit();
        }
    }, [currentStepIndex, totalSteps]);
    
    useEffect(() => {
        // Add keyboard event listener
        window.addEventListener('keydown', handleKeyDown);
        
        // Remove event listener on cleanup
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    const handleNextStep = () => {
        if (isLastStep) {
            setSuccessMessage("Your dish is ready! 🎉");
            setShowSuccessModal(true);
        } else {
            setCurrentStepIndex(prev => prev + 1);
        }
    };
    
    const handlePrevStep = () => {
        if (!isFirstStep) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };
    
    const handleOkClick = () => {
        setShowSuccessModal(false);
        if (isLastStep) {
            onExit();
        }
    };
    
    return (
        <div className="immersive-step-mode">
            <div className="immersive-step-header">
                <div className="immersive-step-title">
                    {recipe.title}
                </div>
                <div className="immersive-step-title">
                    Step {currentStepIndex + 1} of {totalSteps}
                </div>
                <button className="immersive-step-exit" onClick={onExit}>
                    Exit
                </button>
            </div>
            
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            
            <div className="immersive-step-content">
                <div className="immersive-step-body">
                    <div className="immersive-step-title-container">
                        <h2>Step {currentStepIndex + 1}</h2>
                        <p className="immersive-step-description">
                            {currentStep.text || currentStep.description}
                        </p>
                    </div>
                    
                    <div className="immersive-media-section">
                        <div className="immersive-media-wrapper">
                            {/* Display video if available */}
                            {currentStep.video && (
                                <video 
                                    className="immersive-media"
                                    src={`http://localhost:4000${currentStep.video}`} 
                                    controls
                                    poster={currentStep.image ? `http://localhost:4000${currentStep.image}` : ''}
                                >
                                    Your browser does not support video playback.
                                </video>
                            )}
                            
                            {/* Display image only if no video and image exists */}
                            {!currentStep.video && currentStep.image && (
                                <img 
                                    className="immersive-media"
                                    src={`http://localhost:4000${currentStep.image}`} 
                                    alt={`Step ${currentStepIndex + 1}`} 
                                />
                            )}
                        </div>
                        
                        {/* Step ingredients info - removed the redundant step instruction */}
                        {(currentStep.ingredients && currentStep.ingredients.length > 0) || 
                         (currentStep.ingredient) || 
                         (currentStep.alternate) || 
                         (currentStep.timer) ? (
                            <div className="immersive-step-info">
                                {currentStep.ingredients && currentStep.ingredients.length > 0 && (
                                    <>
                                        <h4>Ingredients for this step:</h4>
                                        <ul>
                                            {currentStep.ingredients.map((ing, idx) => (
                                                <li key={idx}>{ing}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                                
                                {/* Support for single ingredient format */}
                                {currentStep.ingredient && (
                                    <>
                                        <h4>Ingredients for this step:</h4>
                                        <p>{currentStep.ingredient} 
                                           {currentStep.quantity && ` - ${currentStep.quantity}`}
                                        </p>
                                    </>
                                )}
                                
                                {currentStep.alternate && (
                                    <>
                                        <h4>Alternative ingredient:</h4>
                                        <p>{currentStep.alternate}</p>
                                    </>
                                )}
                                
                                {currentStep.timer && (
                                    <>
                                        <h4>Timer:</h4>
                                        <p>{currentStep.timer} minutes</p>
                                    </>
                                )}
                            </div>
                        ) : null}
                    </div>
                    
                    <div className="immersive-navigation-container">
                        <div className="immersive-navigation">
                            <button 
                                className="immersive-nav-button"
                                onClick={handlePrevStep}
                                disabled={isFirstStep}
                            >
                                <span className="material-icons">arrow_back</span> Previous Step
                            </button>
                            <button 
                                className={`immersive-nav-button ${isLastStep ? 'finish-pulse' : ''}`}
                                onClick={handleNextStep}
                            >
                                {isLastStep ? "Finish" : "Next Step"} <span className="material-icons">arrow_forward</span>
                            </button>
                        </div>
                        
                        <div className="keyboard-shortcuts">
                            Keyboard shortcuts: ← Previous Step | → Next Step | ESC Exit
                        </div>
                    </div>
                </div>
            </div>
            
            {showSuccessModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h4>{successMessage}</h4>
                        <button onClick={handleOkClick}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main RecipeDetails component
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

    const handleCalendarSubmit = async (date, mealTime = 'Dinner') => {
        try {
            console.log('Scheduling recipe:', id, 'for date:', date, 'as:', mealTime);
            
            // Make sure date is a proper Date object
            const dateObj = new Date(date);
            const formattedDate = dateObj.toISOString();
            
            const response = await fetch('/api/calendar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    recipeId: id, 
                    date: formattedDate,
                    userId: user.userId,
                    mealTime: mealTime // Use the selected meal time
                })
            });

            const responseData = await response.json();
            console.log('Schedule response:', responseData);
        
            if (response.ok) {
                setSuccessMessage(`Recipe scheduled successfully as ${mealTime}!`);
                setShowSuccessModal(true);
                setShowCalendarPopup(false);
            } else {
                console.error('Failed to schedule recipe:', responseData.error || 'Unknown error');
                setSuccessMessage('Failed to schedule recipe. Please try again.');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error scheduling recipe:', error);
            setSuccessMessage('Error scheduling recipe. Please try again.');
            setShowSuccessModal(true);
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

    // If in step-by-step mode, render the immersive experience
    if (stepByStepMode && recipe) {
        return <ImmersiveStepMode recipe={recipe} onExit={toggleStepByStepMode} />;
    }

    if (!recipe) {
        return <p>Loading...</p>;
    }

    return (
        <div className="recipe-details">
            <button className="close-btn" onClick={handleClose}>&times;</button>
            
            <div className="recipe-header">
                {recipe.mainImage && (
                    <img src={`http://localhost:4000${recipe.mainImage}`} alt={recipe.title} className="recipe-image" />
                )}
                <h2>{recipe.title}</h2>
            </div>
            
            <div className="recipe-info">
                <div className="info-card">
                    <h3>Details</h3>
                    
                    {recipe.description && (
                        <div className="info-item">
                            <strong>Description:</strong>
                            <span>{recipe.description}</span>
                        </div>
                    )}
                    
                    <div className="info-item">
                        <strong>Total Time:</strong>
                        <span>
                            {recipe.totalTime.hours > 0 ? `${recipe.totalTime.hours}h ` : ''}
                            {recipe.totalTime.minutes}m
                        </span>
                    </div>
                    
                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="recipe-tags">
                            <div className="info-item">
                                <strong>Tags:</strong>
                            </div>
                            <div>
                                {recipe.tags.map((tag, index) => (
                                    <span key={index} className="tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="info-card">
                    <h3>Nutrition Facts</h3>
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
                                    <td>{recipe.nutrition.fat}g</td>
                                    <td>{recipe.nutrition.protein}g</td>
                                    <td>{recipe.nutrition.carbs}g</td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <p>No nutrition information available.</p>
                    )}
                </div>
            </div>
            
            <div className="info-card">
                <h3>Ingredients <button className="add-all-to-cart-btn" onClick={handleAddAllToCart}>Add All to Cart</button></h3>
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
                                            <span className="material-icons">remove_shopping_cart</span> Remove
                                        </button>
                                    ) : (
                                        <button
                                            className="add-to-cart-btn"
                                            onClick={() => handleAddToCart(ingredient)}
                                        >
                                            <span className="material-icons">add_shopping_cart</span> Add
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="steps-section">
                <div className="steps-header">
                    <h3>Steps</h3>
                    <button 
                        className="step-by-step-btn" 
                        onClick={toggleStepByStepMode}
                    >
                        Start Step-by-Step Mode
                    </button>
                </div>
                
                {stepByStepMode ? (
                    <div className="step-by-step-view">
                        <div className="step-counter">
                            Step {currentStepIndex + 1} of {recipe.steps.length}
                        </div>
                        
                        <div className="current-step">
                            <h4>{recipe.steps[currentStepIndex].text || recipe.steps[currentStepIndex].description}</h4>
                            
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
                                    <p><span className="material-icons">timer</span> {recipe.steps[currentStepIndex].timer} minutes</p>
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
            
            <div className="creator-info">
                <div className="creator-detail">
                    <span className="material-icons">person</span>
                    <p><strong>Created by:</strong> {recipe.createdBy.firstName} {recipe.createdBy.lastName}</p>
                </div>
                <div className="creator-detail">
                    <span className="material-icons">calendar_today</span>
                    <p><strong>Created on:</strong> {new Date(recipe.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
            
            <div className="button-row">
                {user && user.userId === recipe.createdBy._id ? (
                    <>
                        <button className="btn update-btn" onClick={() => navigate(`/update-recipe/${recipe._id}`)}>
                            <span className="material-icons">edit</span> Update
                        </button>
                        <button className="btn schedule-btn" onClick={handleSchedule}>
                            <span className="material-icons">calendar_today</span> Schedule
                        </button>
                        <button className="btn delete-btn" onClick={handleDelete}>
                            <span className="material-icons">delete</span> Delete
                        </button>
                    </>
                ) : (
                    <>
                        {isSaved ? (
                            <button className="btn unsave-btn" onClick={handleUnsave}>
                                <span className="material-icons">bookmark_remove</span> Unsave
                            </button>
                        ) : (
                            <button className="btn save-btn" onClick={handleSave}>
                                <span className="material-icons">bookmark_add</span> Save
                            </button>
                        )}
                        <button className="btn schedule-btn" onClick={handleSchedule}>
                            <span className="material-icons">calendar_today</span> Schedule
                        </button>
                    </>
                )}
            </div>
            
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