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

    const handleGenerateRecipe = async () => {
        try {
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
        }
    };

    return (
        <div className="generate-recipe">
            <h1>Generate Recipe</h1>
            <label>Ingredients:</label>
            <textarea
                placeholder="Enter ingredients, separated by commas"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
            />
            <label>Serving Size:</label>
            <select value={servingSize} onChange={(e) => setServingSize(e.target.value)}>
                {[...Array(10).keys()].map(i => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
            </select>
            <label>Cuisine:</label>
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                <option value="">Select Cuisine</option>
                <option value="Indian">Indian 🇮🇳</option>
                <option value="Chinese">Chinese 🇨🇳</option>
                <option value="Italian">Italian 🇮🇹</option>
                <option value="Mexican">Mexican 🇲🇽</option>
                <option value="American">American 🇺🇸</option>
                {/* Add more cuisines as needed */}
            </select>
            <label>Difficulty:</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="">Select Difficulty</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
            </select>
            <label>Dietary Preferences:</label>
            <input
                type="text"
                placeholder="Enter dietary preferences, separated by commas"
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
            />
            <button onClick={handleGenerateRecipe}>Generate My Recipe</button>
            {error && <p className="error">{error}</p>}
            {generatedRecipe && (
                <div className="generated-recipe">
                    <h2>{generatedRecipe.recipeName}</h2>
                    <p><strong>Total Time:</strong> {generatedRecipe.totalTime}</p>
                    <p><strong>Ingredients:</strong></p>
                    <ul>
                        {generatedRecipe.ingredientsList.map((ingredient, index) => (
                            <li key={index}>{ingredient}</li>
                        ))}
                    </ul>
                    <p><strong>Steps:</strong></p>
                    <ol>
                        {generatedRecipe.steps.map((step, index) => (
                            <li key={index}>{step.text.replace(/^\d+\.\s*/, '')}</li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
};

export default GenerateRecipe;