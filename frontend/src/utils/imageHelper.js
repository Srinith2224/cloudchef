/**
 * Helper function to handle image URLs that could be either local paths or Cloudinary URLs
 * @param {string} url - The image path or URL
 * @returns {string} - The full URL to the image
 */
export const getImageUrl = (url) => {
  if (!url) return '';
  
  // Check if it's already a Cloudinary URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Check if it's a local path
  if (url.startsWith('/profilePhotos/') || 
      url.startsWith('/recipeImages/') || 
      url.startsWith('/recipeStepsImages/')) {
    // For local paths, use your API base URL
    return `${process.env.REACT_APP_API_URL || ''}${url}`;
  }
  
  // Return the original URL if we can't determine the type
  return url;
};