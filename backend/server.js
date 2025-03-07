require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const recipeRoutes = require('./routes/recipes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const calendarRoutes = require('./routes/calendar');
const cartRoutes = require('./routes/cart');
const reportRoutes = require('./routes/reports');
const recipeImageGenerationRoutes = require('./routes/recipeImageGeneration');
const Recipe = require('./models/RecipeModel');
const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware
app.use(express.json());
app.use('/profilePhotos', express.static(path.join(__dirname, 'profilePhotos')));

// Routers
app.use('/api/recipes', recipeRoutes);
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recipe-image-generation', recipeImageGenerationRoutes);

// Check that this route is properly registered
app.use('/api/calendar', require('./routes/calendar'));

// Serve static files from recipeImages
app.use('/recipeImages', express.static(path.join(__dirname, 'recipeImages')));
app.use('/recipeStepsImages', express.static(path.join(__dirname, 'recipeStepsImages')));
app.use('/recipeStepsVideos', express.static(path.join(__dirname, 'recipeStepsVideos')));

// Automated cleanup function
async function cleanupUnusedFiles() {
    
    
    try {
        const recipes = await Recipe.find({});
        const referencedPaths = new Set();

        recipes.forEach(recipe => {
            if (recipe.mainImage) referencedPaths.add(recipe.mainImage);
            recipe.steps.forEach(step => {
                if (step.image) referencedPaths.add(step.image);
                if (step.video) referencedPaths.add(step.video);
            });
        });

        const directoriesToClean = [
            path.join(__dirname, 'recipeImages'),
            path.join(__dirname, 'recipeStepsImages'),
            path.join(__dirname, 'recipeStepsVideos'),
            path.join(__dirname, 'uploads'),
            path.join(__dirname, 'uploadedImages')
        ];

        // Clean up each directory
        for (const directoryPath of directoriesToClean) {
            if (!fs.existsSync(directoryPath)) {
                console.log(`Directory ${directoryPath} does not exist, skipping...`);
                continue;
            }
            
            const files = fs.readdirSync(directoryPath);
            
            for (const file of files) {
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
            }
        }
        
        
    } catch (error) {
        console.error('Error during automatic cleanup:', error);
    }
}

// Connect to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        // Listen for requests
        app.listen(process.env.PORT, () => {
            console.log('Connected to DB & listening on port', process.env.PORT);
            
            // Run cleanup once when server starts
            cleanupUnusedFiles();
            
            // Schedule cleanup to run every day (86400000 ms = 24 hours)
            setInterval(cleanupUnusedFiles, 86400000);
        });
    })
    .catch((error) => {
        console.log(error);
    });