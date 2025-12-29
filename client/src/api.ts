import axios from 'axios';

// EMERGENCY HARDCODE: To fix connection issues once and for all.
const api = axios.create({
    baseURL: 'https://api.zapp.fitness/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
