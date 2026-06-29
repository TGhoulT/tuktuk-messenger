import api from './client';
import type { AuthResponse, LoginCredentials, RegisterData } from '../types/auth.types';

export const authApi = {
    register: (data: RegisterData) => api.post<AuthResponse>('/auth/register', data),
    login: (data: LoginCredentials) => api.post<AuthResponse>('/auth/login', data),
    logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
    refresh: (refreshToken: string) => api.post<{ accessToken: string; sessionId: string }>('/auth/refresh', { refreshToken }),
};