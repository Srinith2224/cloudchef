// Create a new file: src/utils/apiClient.js
const apiClient = {
    fetch: async (url, options = {}) => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // If token exists and we're making an authenticated request
        if (token) {
          // Set default headers if none provided
          options.headers = options.headers || {};
          
          // Add authorization header with proper format
          options.headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await fetch(url, options);
        
        // If unauthorized (token expired or invalid), handle it
        if (response.status === 401) {
          console.log('Authentication failed. Logging out...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/auth'; // Redirect to login
          return null;
        }
        
        return response;
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    }
  };
  
  export default apiClient;