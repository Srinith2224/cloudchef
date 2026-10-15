const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const VIDEO_FORMATS = ['mp4', 'mov', 'webm'];

const MB = 1024 * 1024;
const IMAGE_LIMIT = 8 * MB;
const VIDEO_LIMIT = 50 * MB;

const cloudinaryEnabled = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
} else {
  console.warn('[uploads] Cloudinary is not configured. Files will be saved to backend/uploads (fine for local development only).');
}

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/** Local disk fallback so the app works without Cloudinary during development. */
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const folderFor = (fieldname) => {
  if (fieldname === 'profilePhoto') return { folder: 'profile-photos', resource_type: 'image', allowed_formats: IMAGE_FORMATS };
  if (fieldname.startsWith('stepVideo')) return { folder: 'recipe-steps-videos', resource_type: 'video', allowed_formats: VIDEO_FORMATS };
  if (fieldname.startsWith('stepImage')) return { folder: 'recipe-steps-images', resource_type: 'image', allowed_formats: IMAGE_FORMATS };
  return { folder: 'recipe-images', resource_type: 'image', allowed_formats: IMAGE_FORMATS };
};

const storage = cloudinaryEnabled
  ? new CloudinaryStorage({ cloudinary, params: (req, file) => folderFor(file.fieldname) })
  : localStorage;

/** Converts a multer file to the URL we store in the database. */
const fileUrl = (file) => {
  if (!file) return null;
  if (cloudinaryEnabled) return file.path; // Cloudinary returns the secure URL here
  return `/uploads/${file.filename}`;
};

const recipeFileFilter = (req, file, cb) => {
  const { fieldname, mimetype } = file;
  const isImageField = fieldname === 'mainImage' || /^stepImage-\d+$/.test(fieldname);
  const isVideoField = /^stepVideo-\d+$/.test(fieldname);

  if (isImageField && mimetype.startsWith('image/')) return cb(null, true);
  if (isVideoField && mimetype.startsWith('video/')) return cb(null, true);

  const err = new Error(isImageField ? 'Only image files are allowed.' : isVideoField ? 'Only video files are allowed.' : `Unexpected file field "${fieldname}".`);
  err.status = 400;
  cb(err);
};

const imageOnlyFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  const err = new Error('Only image files are allowed.');
  err.status = 400;
  cb(err);
};

/** Recipe create/update: main image + numbered step images/videos. */
const uploadRecipeFiles = multer({
  storage,
  fileFilter: recipeFileFilter,
  limits: { fileSize: VIDEO_LIMIT, files: 41 }
}).any();

const uploadProfilePhoto = multer({ storage, fileFilter: imageOnlyFilter, limits: { fileSize: IMAGE_LIMIT, files: 1 } });

/** Images sent to the AI are kept in memory only, never stored. */
const uploadAiImage = multer({ storage: multer.memoryStorage(), fileFilter: imageOnlyFilter, limits: { fileSize: IMAGE_LIMIT, files: 1 } });

/** Pulls the Cloudinary public_id out of a stored URL (including folders). */
const publicIdFromUrl = (url) => {
  const match = String(url || '').match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
  return match ? match[1] : null;
};

/** Best effort delete: a failure here must never break the request. */
const deleteStoredFile = async (url, resourceType = 'image') => {
  if (!url) return;
  try {
    if (cloudinaryEnabled && url.includes('res.cloudinary.com')) {
      const publicId = publicIdFromUrl(url);
      if (publicId) await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } else if (url.startsWith('/uploads/')) {
      await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
    }
  } catch (error) {
    console.warn('[uploads] Could not delete file:', url, error.message);
  }
};

module.exports = {
  cloudinary,
  cloudinaryEnabled,
  UPLOAD_DIR,
  fileUrl,
  uploadRecipeFiles,
  uploadProfilePhoto,
  uploadAiImage,
  deleteStoredFile,
  publicIdFromUrl,
  IMAGE_LIMIT
};
