// Backend URL configuration
// This is used for API calls to the Python backend server
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// Log the backend URL to help debug deployment issues
if (import.meta.env.PROD) {
    console.log('[Config] Using Production Backend URL:', BACKEND_URL);
} else {
    console.log('[Config] Using Development Backend URL:', BACKEND_URL);
}
