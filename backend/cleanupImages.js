const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Recipe = require('./models/RecipeModel');

const recipeImagesPath = path.join(__dirname, 'recipeImages');
const recipeStepsImagesPath = path.join(__dirname, 'recipeStepsImages');
const recipeStepsVideosPath = path.join(__dirname, 'recipeStepsVideos');
const uploadsPath = path.join(__dirname, 'uploads'); // Add uploads directory
const uploadedImagesPath = path.join(__dirname, 'uploadedImages'); // Add uploadedImages directory

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('Connected to DB');

        // Get all images and videos referenced in the database
        const recipes = await Recipe.find({});
        const referencedPaths = new Set();

        recipes.forEach(recipe => {
            if (recipe.mainImage) referencedPaths.add(recipe.mainImage);
            recipe.steps.forEach(step => {
                if (step.image) referencedPaths.add(step.image);
                if (step.video) referencedPaths.add(step.video);
            });
        });

        // Function to clean up unused files in a directory
        const cleanupDirectory = (directoryPath) => {
            if (!fs.existsSync(directoryPath)) {
                console.log(`Directory ${directoryPath} does not exist, skipping...`);
                return;
            }
            
            fs.readdir(directoryPath, (err, files) => {
                if (err) {
                    console.error('Error reading directory:', directoryPath, err);
                    return;
                }

                files.forEach(file => {
                    const filePath = path.join(directoryPath, file);
                    const relativePath = `/${path.relative(__dirname, filePath).replace(/\\/g, '/')}`;

                    if (!referencedPaths.has(relativePath)) {
                        fs.unlink(filePath, err => {
                            if (err) {
                                console.error('Error deleting file:', filePath, err);
                            } else {
                                console.log('Deleted unused file:', filePath);
                            }
                        });
                    }
                });
            });
        };

        // Clean up each directory
        cleanupDirectory(recipeImagesPath);
        cleanupDirectory(recipeStepsImagesPath);
        cleanupDirectory(recipeStepsVideosPath);
        cleanupDirectory(uploadsPath); // Clean uploads directory
        cleanupDirectory(uploadedImagesPath); // Clean uploadedImages directory
    })
    .catch(err => {
        console.error('Error connecting to DB:', err);
    })
    .finally(() => {
        setTimeout(() => {
            mongoose.connection.close();
            console.log('Database connection closed');
        }, 2000);
    });