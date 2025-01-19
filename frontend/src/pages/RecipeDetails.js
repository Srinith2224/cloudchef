import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecipesContext } from '../hooks/useRecipesContext';
import './RecipeDetails.css'; // Import the CSS file

const RecipeDetails = () => {
    const { id } = useParams();
    const { user, dispatch } = useRecipesContext();
    const [recipe, setRecipe] = useState(null);
    const [isSaved, setIsSaved] = useState(false); // State to track if the recipe is saved
    const [showSuccessModal, setShowSuccessModal] = useState(false); // State for success modal
    const [successMessage, setSuccessMessage] = useState(''); // State for success message
    const [addedIngredients, setAddedIngredients] = useState([]); // State to track added ingredients
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
                body: JSON.stringify({ ingredient: ingredient.name, quantity: parseInt(ingredient.quantity, 10) })
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
            const response = await fetch('/api/cart/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ingredientId: ingredient._id })
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
            const response = await fetch('/api/cart/add-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ingredients: recipe.ingredients })
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

    const handleOkClick = () => {
        setShowSuccessModal(false);
    };

    const handleClose = () => {
        navigate(-1); // Go back to the previous page
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
                                <td>{ingredient.quantity}</td>
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
                <p><strong>Steps:</strong></p>
                <ol>
                    {recipe.steps.map((step, index) => (
                        <li key={index}>
                            {step.text}
                            {step.image && <img src={`http://localhost:4000${step.image}`} alt={`Step ${step.stepNumber}`} className="step-image" />}
                            {step.ingredients && step.ingredients.length > 0 && (
                                <ul>
                                    {step.ingredients.map((ing, ingIndex) => (
                                        <li key={ingIndex}>{ing}</li>
                                    ))}
                                </ul>
                            )}
                            {step.timer && <p>Timer: {step.timer} minutes</p>}
                        </li>
                    ))}
                </ol>
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

export default RecipeDetails;