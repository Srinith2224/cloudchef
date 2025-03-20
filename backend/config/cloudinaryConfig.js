const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure recipe main image storage
const recipeImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'recipe-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
  }
});

// Configure recipe steps images storage
const recipeStepsImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'recipe-steps-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
  }
});

// Configure recipe steps videos storage
const recipeStepsVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'recipe-steps-videos',
    resource_type: 'video',  // This is crucial for video uploads
    allowed_formats: ['mp4', 'mov', 'avi', 'webm', 'mkv']
  }
});

// Configure profile photo storage
const profilePhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'profile-photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
  }
});

// Create multer upload instances
const uploadRecipeImage = multer({ storage: recipeImageStorage });
const uploadRecipeStepsImage = multer({ storage: recipeStepsImageStorage });
const uploadRecipeStepsVideo = multer({ storage: recipeStepsVideoStorage });
const uploadProfilePhoto = multer({ storage: profilePhotoStorage });

// Dynamic storage configuration
const dynamicStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let folder;
    let resource_type = 'auto'; // Let Cloudinary detect the resource type
    let allowed_formats;

    if (file.fieldname === 'mainImage') {
      folder = 'recipe-images';
      resource_type = 'image';
      allowed_formats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    } else if (file.fieldname.startsWith('stepImage')) {
      folder = 'recipe-steps-images';
      resource_type = 'image';
      allowed_formats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    } else if (file.fieldname.startsWith('stepVideo')) {
      folder = 'recipe-steps-videos';
      resource_type = 'video';
      allowed_formats = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
    }

    return {
      folder,
      resource_type,
      allowed_formats
    };
  }
});

module.exports = {
  cloudinary,
  recipeImageStorage,   // Export this for dynamic uploads
  uploadRecipeImage,
  uploadRecipeStepsImage,
  uploadRecipeStepsVideo,
  uploadProfilePhoto,
  dynamicStorage // Add this
};