import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './UpdateRecipe.css'; // Import CSS for styling

const UpdateRecipe = () => {
    
    const { id } = useParams();
    const [currentStep, setCurrentStep] = useState(0);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [totalTimeHours, setTotalTimeHours] = useState(0);
    const [totalTimeMinutes, setTotalTimeMinutes] = useState(0);
    const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
    const [nutritionCalories, setNutritionCalories] = useState(0);
    const [nutritionFat, setNutritionFat] = useState(0);
    const [nutritionProtein, setNutritionProtein] = useState(0);
    const [nutritionCarbs, setNutritionCarbs] = useState(0);
    const [steps, setSteps] = useState([{ description: '', ingredient: '', quantity: '', alternate: '' }]);
    const [tags, setTags] = useState([]);
    const [image, setImage] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [calculatingNutrition, setCalculatingNutrition] = useState(false); // Add this line
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
                    setTitle(data.title);
                    setDescription(data.description);
                    setTotalTimeHours(data.totalTime.hours);
                    setTotalTimeMinutes(data.totalTime.minutes);
                    setIngredients(data.ingredients);
                    setNutritionCalories(data.nutrition.calories);
                    setNutritionFat(data.nutrition.fat);
                    setNutritionProtein(data.nutrition.protein);
                    setNutritionCarbs(data.nutrition.carbs);
                    setSteps(data.steps);
                    setTags(data.tags);
                } else {
                    setError(data.error);
                }
            } catch (err) {
                setError('Failed to fetch recipe details.');
            }
        };

        fetchRecipe();
    }, [id]);

    useEffect(() => {
        const calculateNutrition = async () => {
            if (ingredients.length === 0 || !ingredients[0].name) return;
            
            setCalculatingNutrition(true);
            try {
                const response = await fetch('/api/recipes/calculate-nutrition', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ ingredients })
                });
                
                if (response.ok) {
                    const nutritionData = await response.json();
                    setNutritionCalories(nutritionData.calories);
                    setNutritionFat(nutritionData.fat);
                    setNutritionProtein(nutritionData.protein);
                    setNutritionCarbs(nutritionData.carbs);
                }
            } catch (error) {
                console.error('Error calculating nutrition:', error);
            } finally {
                setCalculatingNutrition(false);
            }
        };
        
        // Add debounce to prevent too many API calls
        const timer = setTimeout(() => {
            calculateNutrition();
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [ingredients]);

    const nextStep = () => {
        setCurrentStep((prevStep) => prevStep + 1);
    };

    const prevStep = () => {
        setCurrentStep((prevStep) => prevStep - 1);
    };

    const handleIngredientChange = (index, field, value) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { name: '', quantity: '' }]);
    };

    const handleDeleteIngredient = (index) => {
        const newIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(newIngredients);
    };

    const handleStepChange = (index, field, value) => {
        const newSteps = [...steps];
        newSteps[index][field] = value;
        setSteps(newSteps);
    };

    const handleAddStep = () => {
        setSteps([...steps, { description: '', ingredient: '', quantity: '', alternate: '' }]);
    };

    const handleDeleteStep = (index) => {
        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps);
    };

    const handleTagChange = (e) => {
        setTags(e.target.value.split(','));
    };

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);
    };

    // Add file handling for step media
    const handleStepImageChange = (index, e) => {
        if (e.target.files && e.target.files[0]) {
            const newSteps = [...steps];
            newSteps[index].imageFile = e.target.files[0];
            // Preview the selected image
            newSteps[index].imagePreview = URL.createObjectURL(e.target.files[0]);
            setSteps(newSteps);
        }
    };

    const handleStepVideoChange = (index, e) => {
        if (e.target.files && e.target.files[0]) {
            const newSteps = [...steps];
            newSteps[index].videoFile = e.target.files[0];
            // Preview the selected video
            newSteps[index].videoPreview = URL.createObjectURL(e.target.files[0]);
            setSteps(newSteps);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('totalTime[hours]', totalTimeHours);
        formData.append('totalTime[minutes]', totalTimeMinutes);
        formData.append('ingredients', JSON.stringify(ingredients));
        formData.append('nutrition[calories]', nutritionCalories);
        formData.append('nutrition[fat]', nutritionFat);
        formData.append('nutrition[protein]', nutritionProtein);
        formData.append('nutrition[carbs]', nutritionCarbs);
        
        // Prepare steps for submission, keeping existing media paths
        const stepsForSubmission = steps.map((step, index) => {
            const { imageFile, videoFile, imagePreview, videoPreview, ...stepData } = step;
            return stepData;
        });
        
        formData.append('steps', JSON.stringify(stepsForSubmission));
        
        // Append media files
        if (image) formData.append('mainImage', image);
        
        steps.forEach((step, index) => {
            if (step.imageFile) {
                formData.append(`stepImage-${index}`, step.imageFile);
            }
            if (step.videoFile) {
                formData.append(`stepVideo-${index}`, step.videoFile);
            }
        });
        
        formData.append('tags', JSON.stringify(tags));
        if (image) formData.append('mainImage', image);

        try {
            const response = await fetch(`/api/recipes/${id}`, {
                method: 'PATCH',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                setSuccessMessage('Recipe updated successfully');
                setShowSuccessModal(true);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update the recipe');
            }
        } catch (error) {
            console.error('Error updating recipe:', error);
            setError(error.message || 'Failed to update the recipe.');
        }
    };

    const handleOkClick = () => {
        setShowSuccessModal(false);
        navigate('/my-recipes'); // Redirect to "My Recipes" page after acknowledging success
    };

    const stepsContent = [
        <div key="step1">
            <h2>Update Recipe</h2>
            <label>Title:</label>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
            />
            <label>Description:</label>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
            />
            <label>Total Time:</label>
            <div className="total-time-inputs">
                <input
                    type="number"
                    placeholder="Hours"
                    value={totalTimeHours}
                    onChange={(e) => setTotalTimeHours(parseInt(e.target.value, 10))}
                    required
                />
                <span>Hours</span>
                <input
                    type="number"
                    placeholder="Minutes"
                    value={totalTimeMinutes}
                    onChange={(e) => setTotalTimeMinutes(parseInt(e.target.value, 10))}
                    required
                />
                <span>Minutes</span>
            </div>
        </div>,
        <div key="step2">
            <div className="ingredient-section">
                <h3>Ingredients:</h3>
                <table className="ingredient-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Quantity</th>
                            <th>Unit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ingredients.map((ingredient, index) => (
                            <tr key={index}>
                                <td>
                                    <input
                                        type="text"
                                        value={ingredient.name}
                                        onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                                        required
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        value={ingredient.quantity}
                                        onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                        required
                                    />
                                </td>
                                <td>
                                    <select
                                        value={ingredient.unit || ''}
                                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                    >
                                        <option value="">Select Unit</option>
                                        <option value="g">g (Gram)</option>
                                        <option value="kg">kg (Kilogram)</option>
                                        <option value="ml">ml (Milliliter)</option>
                                        <option value="l">l (Liter)</option>
                                        <option value="tbsp">tbsp (Tablespoon)</option>
                                        <option value="tsp">tsp (Teaspoon)</option>
                                        <option value="cup">cup</option>
                                        <option value="packet">packet</option>
                                        <option value="piece">piece</option>
                                        <option value="slice">slice</option>
                                    </select>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="delete-btn"
                                        onClick={() => handleDeleteIngredient(index)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button type="button" className="add-ingredient-btn" onClick={handleAddIngredient}>
                    Add Ingredient
                </button>
            </div>
        </div>,
        <div key="step3">
            <h3>Nutrition:</h3>
            <div className="nutrition-section">
                <label>Calories:</label>
                <div className="nutrition-value">
                    {calculatingNutrition ? (
                        <span className="calculating">Calculating...</span>
                    ) : (
                        <input
                            type="number"
                            placeholder="Calories"
                            value={nutritionCalories}
                            onChange={(e) => setNutritionCalories(parseInt(e.target.value, 10))}
                            readOnly={ingredients.length > 0}
                        />
                    )}
                </div>
                
                <label>Fat:</label>
                <div className="nutrition-value">
                    {calculatingNutrition ? (
                        <span className="calculating">Calculating...</span>
                    ) : (
                        <input
                            type="number"
                            placeholder="Fat (g)"
                            value={nutritionFat}
                            onChange={(e) => setNutritionFat(parseInt(e.target.value, 10))}
                            readOnly={ingredients.length > 0}
                        />
                    )}
                </div>
                
                <label>Protein:</label>
                <div className="nutrition-value">
                    {calculatingNutrition ? (
                        <span className="calculating">Calculating...</span>
                    ) : (
                        <input
                            type="number"
                            placeholder="Protein (g)"
                            value={nutritionProtein}
                            onChange={(e) => setNutritionProtein(parseInt(e.target.value, 10))}
                            readOnly={ingredients.length > 0}
                        />
                    )}
                </div>
                
                <label>Carbs:</label>
                <div className="nutrition-value">
                    {calculatingNutrition ? (
                        <span className="calculating">Calculating...</span>
                    ) : (
                        <input
                            type="number"
                            placeholder="Carbs (g)"
                            value={nutritionCarbs}
                            onChange={(e) => setNutritionCarbs(parseInt(e.target.value, 10))}
                            readOnly={ingredients.length > 0}
                        />
                    )}
                </div>
            </div>
            <p className="nutrition-note">
                These values are automatically calculated based on your ingredients.
                You can manually adjust them if needed.
            </p>
        </div>,
        <div key="step4">
            <h3>Steps:</h3>
            {steps.map((step, index) => (
                <div key={index} className="step-item">
                    <h4>Step {index + 1}</h4>
                    <textarea
                        placeholder="Step description"
                        value={step.description}
                        onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Ingredient"
                        value={step.ingredient}
                        onChange={(e) => handleStepChange(index, 'ingredient', e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Quantity"
                        value={step.quantity}
                        onChange={(e) => handleStepChange(index, 'quantity', e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Alternate Ingredient"
                        value={step.alternate}
                        onChange={(e) => handleStepChange(index, 'alternate', e.target.value)}
                    />
                    <div className="step-media">
                        <h5>Step Image:</h5>
                        {(step.image || step.imagePreview) && (
                            <div className="media-preview">
                                <img 
                                    src={step.imagePreview || `http://localhost:4000${step.image}`}
                                    alt={`Step ${index + 1} preview`}
                                />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleStepImageChange(index, e)}
                        />
                    </div>
                    
                    <div className="step-media">
                        <h5>Step Video:</h5>
                        {(step.video || step.videoPreview) && (
                            <div className="media-preview">
                                <video 
                                    src={step.videoPreview || `http://localhost:4000${step.video}`}
                                    controls
                                    width="300"
                                >
                                    Your browser doesn't support video playback.
                                </video>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleStepVideoChange(index, e)}
                        />
                    </div>
                    <button type="button" onClick={() => handleDeleteStep(index)}>Delete</button>
                </div>
            ))}
            <button type="button" onClick={handleAddStep}>Add Step</button>
        </div>,
        <div key="step5">
            <h3>Tags:</h3>
            <input
                type="text"
                placeholder="Enter tags separated by commas"
                value={tags.join(',')}
                onChange={handleTagChange}
            />
        </div>,
        <div key="step6">
            <h3>Upload Image:</h3>
            <input
                type="file"
                onChange={handleImageChange}
            />
        </div>
    ];

    return (
        <div className="recipe-form-container">
            {error && <div className="error-message">{error}</div>}
            <form className="recipe-form" onSubmit={handleSubmit}>
                {stepsContent[currentStep]}
                <div className="navigation-buttons">
                    {currentStep > 0 && <button type="button" className="back-button" onClick={prevStep}>Back</button>}
                    {currentStep < stepsContent.length - 1 && <button type="button" className="next-button" onClick={nextStep}>Next</button>}
                    {currentStep === stepsContent.length - 1 && <button type="submit" className="next-button">Submit</button>}
                </div>
            </form>
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

export default UpdateRecipe;