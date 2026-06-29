import axios from 'axios';
import { authStore } from '../stores/authStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const { accessToken, sessionId } = authStore.getState();
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    if (sessionId) config.headers['X-Session-Id'] = sessionId;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const { refreshToken } = authStore.getState();
                if (!refreshToken) return Promise.reject(error);
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refreshToken });
                const { accessToken, sessionId } = response.data;
                authStore.getState().setTokens(accessToken, refreshToken, sessionId);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (err) {
                authStore.getState().logout();
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default api;