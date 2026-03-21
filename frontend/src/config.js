const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// If you want to force Render even when developing locally, set this to false
const USE_LOCAL_BACKEND = false; 

export const API_URL = (IS_DEV && USE_LOCAL_BACKEND)
    ? "http://localhost:5222/api" 
    : "https://lightfoot-backend.onrender.com/api";