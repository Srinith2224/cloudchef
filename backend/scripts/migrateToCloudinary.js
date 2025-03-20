require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Recipe = require('../models/RecipeModel');
const User = require('../models/UserModel');
const { cloudinary } = require('../config/cloudinaryConfig');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for migration'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function migrateRecipeImages() {
  try {
    const recipes = await Recipe.find({});
    console.log(`Found ${recipes.length} recipes to migrate`);
    
    for (const recipe of recipes) {
      console.log(`Processing recipe: ${recipe.title}`);
      
      // Migrate main image
      if (recipe.mainImage && recipe.mainImage.startsWith('/recipeImages/')) {
        const localPath = path.join(__dirname, '..', recipe.mainImage);
        
        if (fs.existsSync(localPath)) {
          try {
            console.log(`Uploading main image: ${localPath}`);
            const result = await cloudinary.uploader.upload(localPath, {
              folder: 'recipe-images'
            });
            
            // Update the recipe with Cloudinary URL
            recipe.mainImage = result.secure_url;
            await recipe.save();
            console.log('Main image migrated successfully');
          } catch (err) {
            console.error(`Error uploading main image: ${err.message}`);
          }
        } else {
          console.log(`Main image file not found: ${localPath}`);
        }
      }
      
      // Migrate instruction images/videos
      if (recipe.instructions && recipe.instructions.length > 0) {
        for (let i = 0; i < recipe.instructions.length; i++) {
          const instruction = recipe.instructions[i];
          
          // Migrate instruction image
          if (instruction.image && instruction.image.startsWith('/recipeStepsImages/')) {
            const localPath = path.join(__dirname, '..', instruction.image);
            
            if (fs.existsSync(localPath)) {
              try {
                console.log(`Uploading instruction image: ${localPath}`);
                const result = await cloudinary.uploader.upload(localPath, {
                  folder: 'recipe-steps-images'
                });
                
                // Update the instruction with Cloudinary URL
                recipe.instructions[i].image = result.secure_url;
                await recipe.save();
                console.log('Instruction image migrated successfully');
              } catch (err) {
                console.error(`Error uploading instruction image: ${err.message}`);
              }
            } else {
              console.log(`Instruction image file not found: ${localPath}`);
            }
          }
          
          // Migrate instruction video
          if (instruction.video && instruction.video.startsWith('/recipeStepsVideos/')) {
            const localPath = path.join(__dirname, '..', instruction.video);
            
            if (fs.existsSync(localPath)) {
              try {
                console.log(`Uploading instruction video: ${localPath}`);
                const result = await cloudinary.uploader.upload(localPath, {
                  folder: 'recipe-steps-videos',
                  resource_type: 'video'
                });
                
                // Update the instruction with Cloudinary URL
                recipe.instructions[i].video = result.secure_url;
                await recipe.save();
                console.log('Instruction video migrated successfully');
              } catch (err) {
                console.error(`Error uploading instruction video: ${err.message}`);
              }
            } else {
              console.log(`Instruction video file not found: ${localPath}`);
            }
          }
        }
      }
    }
    
    console.log('Recipe image migration completed');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

async function migrateUserImages() {
  try {
    const users = await User.find({ profilePhoto: { $exists: true, $ne: null } });
    console.log(`Found ${users.length} users with profile photos to migrate`);
    
    for (const user of users) {
      if (user.profilePhoto && user.profilePhoto.startsWith('/profilePhotos/')) {
        const localPath = path.join(__dirname, '..', user.profilePhoto);
        
        if (fs.existsSync(localPath)) {
          try {
            console.log(`Uploading profile photo: ${localPath}`);
            const result = await cloudinary.uploader.upload(localPath, {
              folder: 'profile-photos'
            });
            
            // Update the user with Cloudinary URL
            user.profilePhoto = result.secure_url;
            await user.save();
            console.log('Profile photo migrated successfully');
          } catch (err) {
            console.error(`Error uploading profile photo: ${err.message}`);
          }
        } else {
          console.log(`Profile photo file not found: ${localPath}`);
        }
      }
    }
    
    console.log('User image migration completed');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

async function runMigration() {
  try {
    await migrateRecipeImages();
    await migrateUserImages();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

runMigration();