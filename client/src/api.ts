import axios from 'axios';

let apiUrl = (import.meta.env.VITE_API_URL || 'https://api.zapp.fitness').trim();
if (!apiUrl.startsWith('http')) {
    apiUrl = `https://${apiUrl}`;
}

const api = axios.create({
    baseURL: apiUrl + '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
