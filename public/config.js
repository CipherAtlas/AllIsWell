// Server URL configuration
// Auto-detects server URL based on environment
const getServerUrl = () => {
  // Check if explicitly set via window variable (for testing)
  if (window.SERVER_URL) {
    return window.SERVER_URL;
  }
  
  // In development (localhost)
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '') {
    return 'http://localhost:3000';
  }
  
  // In production (mobile app or deployed web)
  // Replace this with your actual Railway server URL after deployment
  // Railway URL format: https://your-app-name.up.railway.app
  // You'll get this URL after deploying to Railway
  return 'https://your-app-name.up.railway.app';
};

// Make server URL available globally
window.SERVER_URL = getServerUrl();
