import React, { useState } from 'react';
import './GenerateRecipe.css'; // Import the CSS file for styling

const GenerateRecipe = () => {
    const [ingredients, setIngredients] = useState('');
    const [servingSize, setServingSize] = useState(1);
    const [cuisine, setCuisine] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [dietaryPreferences, setDietaryPreferences] = useState('');
    const [generatedRecipe, setGeneratedRecipe] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState('text'); // State to toggle between text and image options
    const [image, setImage] = useState(null);

    const handleGenerateRecipe = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Basic validation
            if (!ingredients.trim()) {
                setError('Please enter some ingredients');
                setLoading(false);
                return;
            }

            console.log('Sending request with ingredients:', ingredients);

            const response = await fetch('/api/recipes/generate-recipe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    ingredients: ingredients.split(',').map(ing => ing.trim()),
                    servingSize,
                    cuisine,
                    difficulty,
                    dietaryPreferences
                })
            });

            const data = await response.json();
            if (response.ok) {
                setGeneratedRecipe(data.recipe);
                setError(null);
            } else {
                setError(data.error);
            }
        } catch (error) {
            setError('Failed to generate recipe');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateRecipeFromImage = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('image', image);
        formData.append('servingSize', servingSize);
        formData.append('cuisine', cuisine);
        formData.append('difficulty', difficulty);
        formData.append('dietaryPreferences', dietaryPreferences);

        try {
            const response = await fetch('/api/recipe-image-generation/generate-recipe-from-image-and-text', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                setGeneratedRecipe(data.recipe);
            } else {
                setError(data.error || 'Failed to generate recipe. Please try again.');
            }
        } catch (error) {
            console.error('Recipe generation error:', error);
            setError('Failed to generate recipe: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleBackClick = () => {
        setGeneratedRecipe(null);
        setIngredients('');
        setServingSize(1);
        setCuisine('');
        setDifficulty('');
        setDietaryPreferences('');
        setImage(null);
        setSelectedOption('text');
    };

    return (
        <div className="generate-recipe">
            <h1>Generate Recipe</h1>
            <div className="option-buttons">
                <button onClick={() => setSelectedOption('text')} className={selectedOption === 'text' ? 'active' : ''}>
                    Dish by Description
                </button>
                <button onClick={() => setSelectedOption('image')} className={selectedOption === 'image' ? 'active' : ''}>
                    Scan Your Fridge
                </button>
            </div>
            <form className={generatedRecipe ? 'slide-out' : ''}>
                {selectedOption === 'text' ? (
                    <>
                        <label>Ingredients:</label>
                        <textarea
                            className="input-box"
                            placeholder="Enter ingredients, separated by commas"
                            value={ingredients}
                            onChange={(e) => setIngredients(e.target.value)}
                        />
                        <label>Serving Size:</label>
                        <select className="input-box" value={servingSize} onChange={(e) => setServingSize(e.target.value)}>
                            {[...Array(10).keys()].map(i => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                        </select>
                        <label>Cuisine:</label>
                        <select className="input-box" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                            <option value="">Select Cuisine</option>
                            <option value="Indian">Indian 🇮🇳</option>
                            <option value="Chinese">Chinese 🇨🇳</option>
                            <option value="Italian">Italian 🇮🇹</option>
                            <option value="Mexican">Mexican 🇲🇽</option>
                            <option value="American">American 🇺🇸</option>
                        </select>
                        <label>Difficulty:</label>
                        <select className="input-box" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                            <option value="">Select Difficulty</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                        <label>Dietary Preferences:</label>
                        <input
                            className="input-box"
                            type="text"
                            placeholder="Enter dietary preferences, separated by commas"
                            value={dietaryPreferences}
                            onChange={(e) => setDietaryPreferences(e.target.value)}
                        />
                        <button onClick={handleGenerateRecipe} disabled={loading}>
                            {loading ? 'Generating...' : 'Generate My Recipe'}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="upload-image-container">
                            <label htmlFor="upload-image">Upload Image</label>
                            <input
                                id="upload-image"
                                type="file"
                                onChange={(e) => setImage(e.target.files[0])}
                            />
                        </div>
                        <label>Serving Size:</label>
                        <select className="input-box" value={servingSize} onChange={(e) => setServingSize(e.target.value)}>
                            {[...Array(10).keys()].map(i => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                        </select>
                        <label>Cuisine:</label>
                        <select className="input-box" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                            <option value="">Select Cuisine</option>
                            <option value="Indian">Indian 🇮🇳</option>
                            <option value="Chinese">Chinese 🇨🇳</option>
                            <option value="Italian">Italian 🇮🇹</option>
                            <option value="Mexican">Mexican 🇲🇽</option>
                            <option value="American">American 🇺🇸</option>
                        </select>
                        <label>Difficulty:</label>
                        <select className="input-box" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                            <option value="">Select Difficulty</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                        <label>Dietary Preferences:</label>
                        <input
                            className="input-box"
                            type="text"
                            placeholder="Enter dietary preferences, separated by commas"
                            value={dietaryPreferences}
                            onChange={(e) => setDietaryPreferences(e.target.value)}
                        />
                        <button onClick={handleGenerateRecipeFromImage} disabled={loading}>
                            {loading ? 'Generating...' : 'Generate My Recipe'}
                        </button>
                    </>
                )}
            </form>
            {error && <p className="error">{error}</p>}
            {generatedRecipe && (
                <div className="generated-recipe show">
                    <h2>{generatedRecipe.recipeName}</h2>
                    
                    <div className="recipe-section">
                        <h3>Ingredients</h3>
                        <ul className="ingredients-list">
                            {generatedRecipe.ingredientsList.map((ingredient, index) => (
                                <li key={index}>{ingredient}</li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="recipe-section">
                        <h3>Preparation</h3>
                        <ol className="steps-list">
                            {generatedRecipe.steps.map((step, index) => {
                                // Remove any existing numbering from the steps
                                const cleanStep = step.text.replace(/^\d+\.+\s*/, '');
                                return <li key={index}>{cleanStep}</li>;
                            })}
                        </ol>
                    </div>
                    
                    <button onClick={handleBackClick} className="back-button">Back</button>
                </div>
            )}
        </div>
    );
};

export default GenerateRecipe;