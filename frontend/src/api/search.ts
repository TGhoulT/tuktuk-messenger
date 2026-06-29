import api from './client';

export const searchApi = {
    searchMessages: (params: { q: string; chatId?: string; limit?: number; cursor?: string }) =>
        api.get('/search/messages', { params }),
    searchGlobal: (q: string) =>
        api.get('/search', { params: { q } }),
};