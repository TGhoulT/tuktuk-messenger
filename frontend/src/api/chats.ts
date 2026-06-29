import api from './client';
import type { Chat } from '../types/chat.types';

export const chatsApi = {
    getChats: () => api.get<Chat[]>('/chat'),
    getChat: (chatId: string) => api.get<Chat>(`/chat/${chatId}`),
    createChat: (data: { type: 'dialog' | 'group' | 'channel'; title?: string; userIds?: string[] }) =>
        api.post<Chat>('/chat', data),
    addParticipant: (chatId: string, userIds: string[]) =>
        api.post(`/chat/${chatId}/participants`, { userIds }),
    removeParticipant: (chatId: string, userId: string) =>
        api.delete(`/chat/${chatId}/participants/${userId}`),
};