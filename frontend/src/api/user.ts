import api from './client';

export const userApi = {
    getMe: () => api.get('/user/me'),
    updateMe: (data: Partial<{ username: string; avatarUrl: string; bio: string }>) => api.patch('/user/me', data),
    getSettings: () => api.get('/user/settings'),
    updateSettings: (data: any) => api.patch('/user/settings', data),
    getPublicProfile: (userId: string) => api.get(`/user/${userId}`),
    checkUsername: (username: string) => api.get(`/user/check-username/${username}`),
};