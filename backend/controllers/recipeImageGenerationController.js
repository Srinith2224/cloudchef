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
        const imagePath = req.file.path;
        const detectedIngredients = await detectIngredients(imagePath);

        if (!Array.isArray(detectedIngredients) || detectedIngredients.length === 0) {
            return res.status(500).json({ error: 'No ingredients detected.' });
        }

        const ingredients = detectedIngredients.map(item => item.label);
        const { servingSize, cuisine, difficulty, dietaryPreferences } = req.body;

        // The prompt that gives clear instructions to the model
        const input = `You are a professional chef creating a recipe. 
Based on these detected ingredients: ${ingredients.join(', ')}, create a complete recipe.

The recipe must include:
1. A creative recipe name
2. A complete ingredients list with quantities
3. Step-by-step cooking instructions

Serving Size: ${servingSize || 2}
Cuisine Type: ${cuisine || 'Any'}
Difficulty Level: ${difficulty || 'Medium'}
Dietary Restrictions: ${dietaryPreferences || 'None'}

Format your response exactly as follows:
Recipe Name: Cucumber French Loaf Delight
Ingredients:
- 2 cucumbers, sliced
- 1 French loaf, sliced
- 1/2 tsp salt
- 1 tbsp olive oil

Instructions:
1. Slice the cucumbers thinly
2. Toast the French loaf slices
3. Arrange cucumber slices on bread
4. Sprinkle with salt and drizzle with oil`;

        console.log("Sending prompt to model:", input);

        const response = await hf.textGeneration({
            model: 'mistralai/Mistral-7B-Instruct-v0.3',
            inputs: input,
            parameters: {
                max_length: 800,
                num_return_sequences: 1,
                temperature: 0.7,
                top_p: 0.9
            }
        });

        let recipeText = response.generated_text;
        console.log("Raw model response:", recipeText);

        // Extract just the recipe portion by removing the prompt part
        // Find where the actual recipe begins by looking for the first "Recipe Name:" after the prompt
        const recipeStartIndex = recipeText.lastIndexOf("Recipe Name:");
        if (recipeStartIndex === -1) {
            return res.status(500).json({ 
                error: 'Failed to find recipe format in generated text',
                rawText: recipeText 
            });
        }

        // Extract just the recipe part from the response
        const actualRecipe = recipeText.substring(recipeStartIndex);
        console.log("Extracted recipe:", actualRecipe);

        // Parse the recipe content with more specific and robust regex
        const recipeNameMatch = actualRecipe.match(/Recipe Name:\s*([^\n]+)/);
        const ingredientsListMatch = actualRecipe.match(/Ingredients:\s*\n([\s\S]*?)(?=\s*Instructions:)/);
        const stepsTextMatch = actualRecipe.match(/Instructions:\s*\n([\s\S]*?)(?:\n\n|$)/);

        if (!recipeNameMatch || !ingredientsListMatch || !stepsTextMatch) {
            console.error("Failed to parse recipe with regex patterns");
            
            return res.status(200).json({ 
                recipe: {
                    recipeName: "Recipe with " + ingredients.join(", "),
                    ingredientsList: ingredients.map(ing => `${ing} - as needed`),
                    steps: [
                        { stepNumber: 1, text: "Combine all ingredients", timer: 5 },
                        { stepNumber: 2, text: "Cook until done", timer: 10 }
                    ]
                },
                warning: "Recipe was generated but couldn't be parsed correctly",
                rawText: actualRecipe
            });
        }

        // Extract and clean recipe components
        const recipeName = recipeNameMatch[1].trim();
        
        // Process ingredients - handle bullet points and line breaks
        const ingredientsList = ingredientsListMatch[1]
            .trim()
            .split('\n')
            .map(item => item.trim().replace(/^[-•*]\s*/, '')) // Remove bullet points
            .filter(item => item);
            
        // Process steps
        const steps = stepsTextMatch[1]
            .trim()
            .split('\n')
            .map(step => step.trim())
            .filter(step => step)
            .map((step, index) => ({
                stepNumber: index + 1,
                text: step.replace(/^\d+[\.\)]\s*/, '').trim(), // Remove any existing step numbers
                timer: 5 // Default timer
            }));

        const formattedRecipe = {
            recipeName,
            ingredientsList,
            steps
        };

        res.status(200).json({ recipe: formattedRecipe });
    } catch (error) {
        console.error('Recipe generation error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

module.exports = { generateRecipeFromImage, testDetectIngredients };