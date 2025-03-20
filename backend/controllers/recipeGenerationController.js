const { HfInference } = require('@huggingface/inference');
const dotenv = require('dotenv');

dotenv.config();

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

const generateRecipe = async (req, res) => {
    const { ingredients, servingSize, cuisine, difficulty, dietaryPreferences } = req.body;

    try {
        // Validate inputs
        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ error: 'Valid ingredients are required' });
        }

        console.log('Generating recipe with:', {
            ingredients, servingSize, cuisine, difficulty, dietaryPreferences
        });

        const input = `Generate a detailed recipe with the following details:
Ingredients (include quantities):
${ingredients.join(', ')}
Serving Size: ${servingSize || 2}
Cuisine: ${cuisine || 'Any'}
Difficulty: ${difficulty || 'Medium'}
Dietary Preferences: ${dietaryPreferences || 'None'}
Instructions:`;

        // Check if API key is set
        if (!process.env.HUGGING_FACE_API_KEY) {
            console.error('HUGGING_FACE_API_KEY is not set in environment variables');
            return res.status(500).json({ error: 'API key configuration error' });
        }

        // Log what we're sending to the API
        console.log('Sending to Hugging Face API:', input);

        const response = await hf.textGeneration({
            model: 'mistralai/Mistral-7B-Instruct-v0.3',
            inputs: input,
            parameters: {
                max_length: 500, // Increased for more complete recipes
                num_return_sequences: 1,
                temperature: 0.7,
                top_p: 0.9
            }
        });

        console.log('Raw API response:', response);

        let recipeText = response.generated_text;

        if (!recipeText) {
            console.error('No text generated from the API');
            return res.status(500).json({ error: 'Failed to generate recipe text' });
        }

        // Since there's no explicit recipe name in the response, we'll create one
        const recipeName = `${cuisine || 'Mixed'} ${ingredients.join(' & ')} Bowl`;

        // Extract instructions and tips separately
        const instructionsMatch = recipeText.match(/Instructions:\n([\s\S]*?)(?:Tips:|$)/);
        const tipsMatch = recipeText.match(/Tips:\n([\s\S]*?)$/);

        // We already have the ingredients from the request
        const ingredientsList = ingredients.map(ing => `${ing} - as needed`);

        // Process the steps properly
        let steps = [];
        if (instructionsMatch && instructionsMatch[1]) {
            steps = instructionsMatch[1].trim().split('\n').map((step, index) => ({
                stepNumber: index + 1,
                text: step.trim().replace(/^\d+\.\s*/, ''), // Remove any existing numbers
                timer: 5 // Default timer
            })).filter(step => step.text);
        }

        // Include tips as the last step if available
        if (tipsMatch && tipsMatch[1]) {
            const tipsText = tipsMatch[1].trim()
                .split('\n')
                .map(tip => tip.trim().replace(/^-\s*/, ''))
                .join('\n');
            
            steps.push({
                stepNumber: steps.length + 1,
                text: `Tips: ${tipsText}`,
                timer: 0
            });
        }

        // Construct the final recipe object
        const formattedRecipe = {
            recipeName,
            ingredientsList,
            steps
        };

        res.status(200).json({ recipe: formattedRecipe });
    } catch (error) {
        console.error('Recipe generation error:', error);
        res.status(500).json({ 
            error: 'Recipe generation failed: ' + (error.message || 'Unknown error'),
            details: error.stack
        });
    }
};

module.exports = { generateRecipe };