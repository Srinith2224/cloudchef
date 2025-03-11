import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './UpdateRecipe.css'; // Using the same CSS as RecipeForm for consistency

const UpdateRecipe = () => {
    const { id } = useParams();
    const [currentStep, setCurrentStep] = useState(0);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [totalTimeHours, setTotalTimeHours] = useState(0);
    const [totalTimeMinutes, setTotalTimeMinutes] = useState(0);
    const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }]);
    const [nutritionCalories, setNutritionCalories] = useState(0);
    const [nutritionFat, setNutritionFat] = useState(0);
    const [nutritionProtein, setNutritionProtein] = useState(0);
    const [nutritionCarbs, setNutritionCarbs] = useState(0);
    const [steps, setSteps] = useState([{ description: '', ingredient: '', quantity: '', alternate: '' }]);
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState([]);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [stepPreviews, setStepPreviews] = useState([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [calculatingNutrition, setCalculatingNutrition] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    // Calculate the progress bar width based on current step
    const progressWidth = ((currentStep + 1) / 6) * 100;

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                setLoading(true);
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
                    setTags(data.tags || []);
                    
                    // Set image preview from existing recipe
                    if (data.mainImage) {
                        setImagePreview(`http://localhost:4000${data.mainImage}`);
                    }

                    // Initialize step previews
                    const initialPreviews = data.steps.map(step => ({
                        image: step.image ? `http://localhost:4000${step.image}` : null,
                        video: step.video ? `http://localhost:4000${step.video}` : null
                    }));
                    setStepPreviews(initialPreviews);
                } else {
                    setError(data.error || 'Failed to fetch recipe');
                }
            } catch (err) {
                setError('Failed to fetch recipe details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [id]);

    useEffect(() => {
        const calculateNutrition = async () => {
            // Only calculate if we have valid ingredients
            const validIngredients = ingredients.filter(ing => 
                ing.name.trim() && ing.quantity.trim() && ing.unit && ing.unit.trim()
            );
            
            if (validIngredients.length === 0) return;
            
            setCalculatingNutrition(true);
            try {
                const response = await fetch('/api/recipes/calculate-nutrition', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ ingredients: validIngredients })
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
        // Clear any previous errors
        setError('');
        
        // Prevent going beyond the last step
        if (currentStep >= stepsContent.length - 1) return;
        
        // Prevent default form submission
        setCurrentStep((prevStep) => prevStep + 1);
        
        // Scroll to top of form with smooth animation
        window.scrollTo({
            top: document.querySelector('.recipe-form').offsetTop - 20,
            behavior: 'smooth'
        });
    };

    const prevStep = () => {
        setError('');
        setCurrentStep((prevStep) => prevStep - 1);
        
        // Scroll to top of form with smooth animation
        window.scrollTo({
            top: document.querySelector('.recipe-form').offsetTop - 20,
            behavior: 'smooth'
        });
    };

    // Jump directly to a specific step (for progress indicators)
    const jumpToStep = (stepIndex) => {
        setCurrentStep(stepIndex);
        window.scrollTo({
            top: document.querySelector('.recipe-form').offsetTop - 20,
            behavior: 'smooth'
        });
    };

    const handleIngredientChange = (index, field, value) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
        
        // Focus the new ingredient field after rendering
        setTimeout(() => {
            const inputs = document.querySelectorAll('.ingredient-table tbody tr:last-child input');
            if (inputs && inputs.length > 0) {
                inputs[0].focus();
            }
        }, 100);
    };

    const handleDeleteIngredient = (index) => {
        if (ingredients.length <= 1) return;
        const newIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(newIngredients);
    };

    const handleStepChange = (index, field, value) => {
        const newSteps = [...steps];
        newSteps[index][field] = value;
        
        // Ensure compatibility between text/description fields
        if (field === 'description') {
            newSteps[index].text = value; // Also update text field
        } else if (field === 'text') {
            newSteps[index].description = value; // Also update description field
        }
        
        setSteps(newSteps);
    };

    const handleAddStep = () => {
        setSteps([...steps, { description: '', ingredient: '', quantity: '', alternate: '' }]);
        
        // Add a new preview placeholder
        setStepPreviews(prev => [...prev, { image: null, video: null }]);
        
        // Scroll to the new step after a brief delay
        setTimeout(() => {
            const newStepElement = document.querySelector('.step-item:last-child');
            if (newStepElement) {
                newStepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const handleDeleteStep = (index) => {
        if (steps.length <= 1) return;
        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps);
        
        // Also remove the preview
        const newPreviews = [...stepPreviews];
        newPreviews.splice(index, 1);
        setStepPreviews(newPreviews);
    };

    const handleAddTag = () => {
        if (!tagInput.trim()) return;
        
        // Prevent duplicate tags
        if (tags.includes(tagInput.trim())) {
            setError('This tag already exists');
            setTimeout(() => setError(''), 3000);
            return;
        }
        
        setTags([...tags, tagInput.trim()]);
        setTagInput('');
    };

    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleRemoveTag = (indexToRemove) => {
        setTags(tags.filter((_, index) => index !== indexToRemove));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image is too large. Maximum size is 5MB.');
            return;
        }
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Please select a valid image file (JPEG, PNG, WebP)');
            return;
        }
        
        setImage(file);
        
        // Create a preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleStepImageChange = (index, e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image is too large. Maximum size is 5MB.');
            return;
        }
        
        const newSteps = [...steps];
        newSteps[index].imageFile = file;
        setSteps(newSteps);
        
        // Create preview for this step's image
        const reader = new FileReader();
        reader.onloadend = () => {
            const newPreviews = [...stepPreviews];
            if (!newPreviews[index]) newPreviews[index] = {};
            newPreviews[index].image = reader.result;
            setStepPreviews(newPreviews);
        };
        reader.readAsDataURL(file);
    };

    const handleStepVideoChange = (index, e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            setError('Video is too large. Maximum size is 50MB.');
            return;
        }
        
        const newSteps = [...steps];
        newSteps[index].videoFile = file;
        setSteps(newSteps);
        
        // For video, we just set a flag that it exists
        const newPreviews = [...stepPreviews];
        if (!newPreviews[index]) newPreviews[index] = {};
        newPreviews[index].video = file.name;
        setStepPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Only validate required fields on final submission
        const hasTitle = title.trim().length > 0;
        const hasDescription = description.trim().length > 0;
        const hasTime = totalTimeHours > 0 || totalTimeMinutes > 0;
        const hasValidIngredients = ingredients.some(ing => 
            ing.name && ing.name.trim() && 
            ing.quantity && ing.quantity.trim() && 
            ing.unit && ing.unit.trim()
        );

        // Update this validation to check for both description and text fields
        const hasValidSteps = steps.some(step => 
            (step.description && step.description.trim()) || 
            (step.text && step.text.trim())
        );
        
        if (!hasTitle) {
            setError('Please enter a recipe title');
            setCurrentStep(0);
            return;
        }
        
        if (!hasDescription) {
            setError('Please enter a recipe description');
            setCurrentStep(0);
            return;
        }
        
        if (!hasTime) {
            setError('Please enter preparation time');
            setCurrentStep(0);
            return;
        }
        
        if (!hasValidIngredients) {
            setError('Please add at least one ingredient with all fields filled');
            setCurrentStep(1);
            return;
        }
        
        if (!hasValidSteps) {
            setError('Please add at least one cooking step with a description');
            setCurrentStep(3);
            return;
        }
        
        setError('');
        setLoading(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('totalTime[hours]', totalTimeHours);
        formData.append('totalTime[minutes]', totalTimeMinutes);
        
        // Filter out empty ingredients before submission
        const validIngredients = ingredients.filter(ing => 
            ing.name.trim() && ing.quantity.trim() && ing.unit && ing.unit.trim()
        );
        formData.append('ingredients', JSON.stringify(validIngredients));
        
        formData.append('nutrition[calories]', nutritionCalories);
        formData.append('nutrition[fat]', nutritionFat);
        formData.append('nutrition[protein]', nutritionProtein);
        formData.append('nutrition[carbs]', nutritionCarbs);
        
        // Filter out empty steps
        const validSteps = steps.filter(step => 
            (step.description && step.description.trim()) || 
            (step.text && step.text.trim())
        );

        const stepsForSubmission = validSteps.map((step, index) => {
            const { imageFile, videoFile, ...stepData } = step;
            // Ensure text and description are synchronized
            const stepText = step.description || step.text || '';
            return {
                ...stepData,
                text: stepText,
                description: stepText, // Ensure both fields have the content
                image: step.image || '',
                video: step.video || ''
            };
        });
        
        formData.append('steps', JSON.stringify(stepsForSubmission));
        formData.append('tags', JSON.stringify(tags));
        if (image) formData.append('mainImage', image);
        
        // Append step files with index in the field name
        validSteps.forEach((step, index) => {
            if (step.imageFile) {
                formData.append(`stepImage-${index}`, step.imageFile);
            }
            if (step.videoFile) {
                formData.append(`stepVideo-${index}`, step.videoFile);
            }
        });

        try {
            const response = await fetch(`/api/recipes/${id}`, {
                method: 'PATCH',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSuccessMessage(`"${data.title}" has been updated successfully!`);
                setShowSuccessModal(true);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update the recipe');
            }
        } catch (error) {
            console.error('Error updating recipe:', error);
            setError(error.message || 'Failed to update the recipe');
        } finally {
            setLoading(false);
        }
    };

    const handleOkClick = () => {
        setShowSuccessModal(false);
        navigate('/my-recipes'); // Redirect to "My Recipes" page after acknowledging success
    };

    // Step content components
    const stepsContent = [
        // Step 1: Basic Info
        <div key="step1" className="form-step">
            <h2>Update Your Recipe</h2>
            {error && <div className="error-message">{error}</div>}
            <label>Recipe Title:</label>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your recipe title (e.g. 'Creamy Garlic Pasta')"
                className="input-field"
            />
            <label>Description:</label>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write a short description about your recipe... What makes it special? What inspired you?"
                className="textarea-field"
            />
            <label>Total Preparation Time:</label>
            <div className="total-time-inputs">
                <div className="time-input-group">
                    <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={totalTimeHours}
                        onChange={(e) => setTotalTimeHours(parseInt(e.target.value, 10) || 0)}
                    />
                    <span>Hours</span>
                </div>
                <div className="time-input-group">
                    <input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="0"
                        value={totalTimeMinutes}
                        onChange={(e) => setTotalTimeMinutes(parseInt(e.target.value, 10) || 0)}
                    />
                    <span>Minutes</span>
                </div>
            </div>
        </div>,

        // Step 2: Ingredients
        <div key="step2" className="form-step">
            <div className="ingredient-section">
                <h3>Update Your Ingredients</h3>
                {error && <div className="error-message">{error}</div>}
                <table className="ingredient-table">
                    <thead>
                        <tr>
                            <th>Ingredient Name</th>
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
                                        placeholder="e.g. Olive oil, Flour, Tomatoes"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        value={ingredient.quantity}
                                        onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                        placeholder="e.g. 2, 200, 1/2"
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
                                        className="recipe-delete-button ingredient-delete"
                                        onClick={() => handleDeleteIngredient(index)}
                                        disabled={ingredients.length <= 1}
                                        title="Delete ingredient"
                                    >
                                        <span className="material-icons">delete_outline</span>
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

        // Step 3: Nutrition
        <div key="step3" className="form-step">
            <h3>Update Nutrition Information</h3>
            {error && <div className="error-message">{error}</div>}
            <div className="nutrition-section">
                <div className="nutrition-value" data-unit="kcal">
                    <label>Calories:</label>
                    {calculatingNutrition ? (
                        <span className="calculating">Calculating...</span>
                    ) : (
                        <input
                            type="number"
                            placeholder="Calories"
                            value={nutritionCalories || ""}
                            onChange={(e) => setNutritionCalories(parseInt(e.target.value, 10) || 0)}
                            readOnly={ingredients.length > 0}
                        />
                    )}
                </div>
                
                <div className="nutrition-value" data-unit="g">
                    <label>Fat:</label>
                    {calculatingNutrition ? (
                        <span className="calculating">Calculating...</span>
                    ) : (
                        <input
                            type="number"
                            placeholder="Fat"
                            value={nutritionFat || ""}
                            onChange={(e) => setNutritionFat(parseInt(e.target.value, 10) || 0)}
                            readOnly={ingredients.length > 0}
                        />
                    )}
                </div>
                
                <div className="nutrition-value" data-unit="g">
                    <label>Protein:</label>
                    {calculatingNutrition ? (
                        <span className="calculating">Calculating...</span>
                    ) : (
                        <input
                            type="number"
                            placeholder="Protein"
                            value={nutritionProtein || ""}
                            onChange={(e) => setNutritionProtein(parseInt(e.target.value, 10) || 0)}
                            readOnly={ingredients.length > 0}
                        />
                    )}
                </div>
                
                <div className="nutrition-value" data-unit="g">
                    <label>Carbs:</label>
                    {calculatingNutrition ? (
                        <span className="calculating">Calculating...</span>
                    ) : (
                        <input
                            type="number"
                            placeholder="Carbs"
                            value={nutritionCarbs || ""}
                            onChange={(e) => setNutritionCarbs(parseInt(e.target.value, 10) || 0)}
                            readOnly={ingredients.length > 0}
                        />
                    )}
                </div>
            </div>
            <p className="nutrition-note">
                These values are automatically calculated based on your ingredients. The numbers may vary depending on specific brands and preparation methods.
            </p>
        </div>,

        // Step 4: Instructions
        <div key="step4" className="form-step">
            <h3>Update Cooking Instructions</h3>
            {error && <div className="error-message">{error}</div>}
            {steps.map((step, index) => (
                <div key={index} className="step-item">
                    <h4>Step {index + 1}</h4>
                    <textarea
                        placeholder="Describe what to do in this step (e.g. 'Heat olive oil in a large pan over medium heat')"
                        value={step.description || step.text || ""}
                        onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                    />
                    
                    <div className="step-item-grid">
                        <div>
                            <label>Main Ingredient:</label>
                            <input
                                type="text"
                                placeholder="Key ingredient for this step"
                                value={step.ingredient || ""}
                                onChange={(e) => handleStepChange(index, 'ingredient', e.target.value)}
                            />
                        </div>
                        <div>
                            <label>Quantity:</label>
                            <input
                                type="text"
                                placeholder="How much to use"
                                value={step.quantity || ""}
                                onChange={(e) => handleStepChange(index, 'quantity', e.target.value)}
                            />
                        </div>
                        <div>
                            <label>Alternative:</label>
                            <input
                                type="text"
                                placeholder="Optional substitute"
                                value={step.alternate || ""}
                                onChange={(e) => handleStepChange(index, 'alternate', e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="step-media">
                        <h5>Step Photo</h5>
                        <div className="file-input-wrapper">
                            <div className="file-input-button">
                                Upload Image
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleStepImageChange(index, e)}
                            />
                        </div>
                        {(stepPreviews[index]?.image || step.image) && (
                            <div className="media-preview">
                                <img 
                                    src={stepPreviews[index]?.image || `http://localhost:4000${step.image}`} 
                                    alt={`Step ${index + 1} preview`} 
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="step-media">
                        <h5>Step Video (Optional)</h5>
                        <div className="file-input-wrapper">
                            <div className="file-input-button">
                                Upload Video
                            </div>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleStepVideoChange(index, e)}
                            />
                        </div>
                        {step.video && !stepPreviews[index]?.video && (
                            <div className="media-preview">
                                <video 
                                    src={`http://localhost:4000${step.video}`}
                                    controls
                                    width="300"
                                >
                                    Your browser doesn't support video playback.
                                </video>
                            </div>
                        )}
                        {stepPreviews[index]?.video && (
                            <div className="media-preview">
                                <div className="video-file-selected">
                                    <p>Video selected: {stepPreviews[index]?.video}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        type="button" 
                        className="recipe-delete-button step-delete" 
                        onClick={() => handleDeleteStep(index)}
                        disabled={steps.length <= 1}
                        title="Delete step"
                    >
                        <span className="material-icons">delete_outline</span> Remove Step
                    </button>
                </div>
            ))}
            <button type="button" className="add-ingredient-btn" onClick={handleAddStep}>
                Add Another Step
            </button>
        </div>,

        // Step 5: Tags
        <div key="step5" className="form-step">
            <h3>Update Recipe Tags</h3>
            {error && <div className="error-message">{error}</div>}
            <p>Add tags to help users find your recipe (e.g., dinner, vegan, quick, Italian, spicy)</p>
            <div className="tags-input-container">
                <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Type tag and press Enter"
                />
                <button type="button" onClick={handleAddTag} className="add-tag-btn">Add Tag</button>
            </div>
            
            {tags.length > 0 && (
                <div className="tags-container">
                    {tags.map((tag, index) => (
                        <div key={index} className="tag">
                            {tag} <span onClick={() => handleRemoveTag(index)}>×</span>
                        </div>
                    ))}
                </div>
            )}
        </div>,

        // Step 6: Upload Image
        <div key="step6" className="form-step">
            <h3>Update Recipe Image</h3>
            {error && <div className="error-message">{error}</div>}
            <p>Choose a beautiful photo that showcases your finished dish.</p>
            <div 
                className="upload-container"
                onClick={handleUploadClick}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
                {!imagePreview ? (
                    <>
                        <div className="upload-icon">📷</div>
                        <p className="upload-text">Click to upload a cover photo for your recipe</p>
                        <p className="upload-subtext">Recommended size: 1200 x 800 pixels (16:9 ratio)</p>
                    </>
                ) : (
                    <>
                        <img 
                            src={imagePreview} 
                            alt="Recipe preview" 
                            style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} 
                        />
                        <p className="upload-text" style={{ marginTop: '15px' }}>Click to change photo</p>
                    </>
                )}
            </div>
        </div>
    ];

    if (loading) {
        return <div className="loading">Loading recipe details...</div>;
    }

    return (
        <div className="recipe-form-container">
            <form className="recipe-form" onSubmit={handleSubmit} noValidate>
                {/* Progress indicator */}
                <div className="form-progress">
                    <div className="form-progress-bar" style={{ width: `${progressWidth}%` }}></div>
                    {[0, 1, 2, 3, 4, 5].map((step, i) => (
                        <div 
                            key={i} 
                            className={`progress-step ${currentStep === i ? 'active' : ''} ${currentStep > i ? 'completed' : ''}`}
                            onClick={() => jumpToStep(i)}
                        >
                            {i + 1}
                        </div>
                    ))}
                </div>
                
                {/* Current step content */}
                {stepsContent[currentStep]}
                
                {/* Navigation buttons */}
                <div className="form-buttons">
                    {currentStep > 0 && (
                        <button 
                            type="button" 
                            className="back-button" 
                            onClick={prevStep}
                        >
                            Back
                        </button>
                    )}
                    
                    {currentStep < stepsContent.length - 1 ? (
                        <button 
                            type="button" 
                            className="next-button" 
                            onClick={(e) => {
                                e.preventDefault(); // Explicitly prevent default
                                nextStep();
                            }}
                        >
                            Next
                        </button>
                    ) : (
                        <button 
                            type="submit" // This should be "submit" to trigger handleSubmit
                            className="submit-button" 
                            disabled={loading}
                        >
                            {loading ? 'Updating...' : 'Update Recipe'}
                        </button>
                    )}
                </div>
            </form>
            
            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal-overlay">
                    <div className="modal-content success-modal">
                        <div className="success-icon">✓</div>
                        <h3>Recipe Updated!</h3>
                        <p>{successMessage}</p>
                        <button onClick={handleOkClick}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpdateRecipe;