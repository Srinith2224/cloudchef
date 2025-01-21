const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { HfInference } = require('@huggingface/inference');

dotenv.config();

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const hf = new HfInference(HUGGING_FACE_API_KEY);

// Utility function to read image as base64
const readImageAsBase64 = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, { encoding: 'base64' }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

async function detectIngredients(imagePath) {
    try {
        // Read the image file and convert it to base64
        const imageBase64 = await readImageAsBase64(imagePath);

        // Prepare the payload
        const payload = {
            inputs: {
                image: imageBase64
            }
        };

        const response = await axios.post(
            'https://api-inference.huggingface.co/models/microsoft/resnet-50',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
            }
        );
        return response.data;
    } catch (error) {
        // Enhanced error logging
        if (error.response) {
            console.error('Error detecting ingredients:', error.response.data);
        } else {
            console.error('Error detecting ingredients:', error.message);
        }
        throw error;
    }
}

async function testDetectIngredients(req, res) {
    try {
        const imagePath = req.file.path; // Uploaded file path
        const detectedIngredients = await detectIngredients(imagePath);
        res.json({ detectedIngredients });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function generateRecipeFromImage(req, res) {
    try {
        const imagePath = req.file.path; // Uploaded file path
        const detectedIngredients = await detectIngredients(imagePath);

        // Ensure detectedIngredients is an array and contains 'label' keys
        if (!Array.isArray(detectedIngredients) || detectedIngredients.length === 0) {
            return res.status(500).json({ error: 'No ingredients detected.' });
        }

        const ingredients = detectedIngredients.map(item => item.label); // Adjust based on the response structure

        const { servingSize, cuisine, difficulty, dietaryPreferences } = req.body;

        const input = `Generate a detailed recipe with the following details:
Ingredients (include quantities):
${ingredients.join(', ')}
Serving Size: ${servingSize}
Cuisine: ${cuisine}
Difficulty: ${difficulty}
Dietary Preferences: ${dietaryPreferences}
Instructions:`;

        const response = await hf.textGeneration({
            model: 'mistralai/Mistral-7B-Instruct-v0.3',
            inputs: input,
            parameters: {
                max_length: 200, // Limit the output length
                num_return_sequences: 1,
                temperature: 0.7,
                top_p: 0.9
            }
        });

        let recipeText = response.generated_text;

        if (!recipeText) {
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
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { generateRecipeFromImage, testDetectIngredients };