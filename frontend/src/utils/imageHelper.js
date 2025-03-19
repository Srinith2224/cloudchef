/**
 * Helper function to handle image URLs that could be either local paths or Cloudinary URLs
 * @param {string} path - The image path or URL
 * @returns {string} - The full URL to the image
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  
  // If it's already a complete URL (from Cloudinary), use it directly
  if (path.startsWith('http')) {
    return path;
  }
  
  // If it's a data URL (from FileReader previews), use it directly
  if (path.startsWith('data:')) {
    return path;
  }
  
  // Otherwise, prepend the backend URL
  return `http://localhost:4000${path}`;
};