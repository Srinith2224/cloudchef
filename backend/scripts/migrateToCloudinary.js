/*
 * Uploads old local images/videos (from before Cloudinary) and updates the
 * database URLs. Needs Cloudinary keys in .env.
 *
 *   npm run migrate-cloudinary
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const mongoose = require('mongoose');
const Recipe = require('../models/RecipeModel');
const User = require('../models/UserModel');
const { cloudinary, cloudinaryEnabled } = require('../config/cloudinaryConfig');

const ROOT = path.join(__dirname, '..');
const isLocal = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');

const upload = async (url, folder, resourceType = 'image') => {
  const localPath = path.join(ROOT, url);
  if (!fs.existsSync(localPath)) {
    console.log(`  missing file, skipped: ${url}`);
    return url;
  }
  const result = await cloudinary.uploader.upload(localPath, { folder, resource_type: resourceType });
  console.log(`  uploaded ${url}`);
  return result.secure_url;
};

async function main() {
  if (!cloudinaryEnabled) {
    console.log('Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env first.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  for (const recipe of await Recipe.find({})) {
    let changed = false;
    if (isLocal(recipe.mainImage)) { recipe.mainImage = await upload(recipe.mainImage, 'recipe-images'); changed = true; }
    for (const step of recipe.steps) {
      if (isLocal(step.image)) { step.image = await upload(step.image, 'recipe-steps-images'); changed = true; }
      if (isLocal(step.video)) { step.video = await upload(step.video, 'recipe-steps-videos', 'video'); changed = true; }
    }
    if (changed) { await recipe.save(); console.log(`Recipe updated: ${recipe.title}`); }
  }

  for (const user of await User.find({ profilePhoto: /^\// })) {
    user.profilePhoto = await upload(user.profilePhoto, 'profile-photos');
    await user.save();
    console.log(`Profile photo updated: ${user.email}`);
  }

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
