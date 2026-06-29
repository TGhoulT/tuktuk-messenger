import api from './client';
import type { Message } from '../types/message.types';

export const messagesApi = {
    getMessages: (chatId: string, cursor?: string, limit = 50) =>
        api.get<{ messages: Message[]; nextCursor: string | null }>(`/message/${chatId}?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
    sendMessage: (data: { chatId: string; type: string; text?: string; fileId?: string; clientMessageId: string; replyToMessageId?: string }) =>
        api.post<Message>('/message', data),
    editMessage: (messageId: string, text: string) =>
        api.patch<Message>(`/message/${messageId}`, { text }),
    deleteMessage: (messageId: string, forAll?: boolean) =>
        api.delete(`/message/${messageId}`, { data: { forAll } }),
    addReaction: (messageId: string, reaction: string) =>
        api.post(`/message/${messageId}/reaction`, { reaction }),
    removeReaction: (messageId: string, reaction: string) =>
        api.delete(`/message/${messageId}/reaction`, { data: { reaction } }),
    forwardMessages: (data: { messageIds: string[]; targetChatIds: string[]; options?: { hideSender?: boolean; hideCaption?: boolean } }) =>
        api.post('/message/forward', data),
    pinMessage: (messageId: string, forBoth?: boolean) =>
        api.post(`/message/${messageId}/pin`, { forBoth: forBoth ?? false }),
    getMessageContext: (chatId: string, messageId: string, limit = 15) =>
        api.get<{ messages: Message[] }>(`/message/${chatId}/context/${messageId}?limit=${limit}`),
};