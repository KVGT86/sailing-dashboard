// This checks if the app is running on your computer or on the web
const IS_PRODUCTION = import.meta.env.PROD;

// Replace 'lightfoot-backend' with the actual name Render gives you
export const API_URL = IS_PRODUCTION 
    ? "https://lightfoot-backend.onrender.com/api" 
    : "http://localhost:5222/api";