// Vite uses 'import.meta.env' for environment variables.
// This ensures the frontend talks to the correct backend URL (e.g., Render or Home Server)
// while defaulting to localhost during local development.
const VITE_API_URL = import.meta.env.VITE_API_URL;

export const API_URL = VITE_API_URL 
    ? `${VITE_API_URL}/api` 
    : "http://localhost:5222/api";
