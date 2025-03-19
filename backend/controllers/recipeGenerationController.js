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

        // Adjust regex patterns to match the generated text structure
        const recipeNameMatch = recipeText.match(/(?:Enjoy your |Enjoy this )?(.*)\nServing Size:/);
        const ingredientsListMatch = recipeText.match(/Ingredients:\n([\s\S]*?)\n\nInstructions:/);
        const stepsTextMatch = recipeText.match(/Instructions:\n([\s\S]*?)(?:\n\n|$)/);

        if (!recipeNameMatch || !ingredientsListMatch || !stepsTextMatch) {
            return res.status(500).json({ error: 'Failed to parse generated recipe text' });
        }

        const recipeName = recipeNameMatch[1].trim();
        const ingredientsList = ingredientsListMatch[1].trim().split('\n').map(item => item.trim());
        const stepsText = stepsTextMatch[1].trim();

        // Clean and format steps
        const steps = stepsText.split('\n').map((step, index) => ({
            stepNumber: index + 1,
            text: step.trim(),
            timer: 5 // Default timer (can be customized)
        })).filter(step => step.text);

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