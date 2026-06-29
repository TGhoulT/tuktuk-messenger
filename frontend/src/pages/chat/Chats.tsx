import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // добавлен useQueryClient
import { chatsApi } from '../../api/chats';
import { chatStore } from '../../stores/chatStore';
import { ChatList } from '../../components/chat/ChatList';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { Loader } from '../../components/common/Loader/Loader';
import { useSocket } from '../../hooks/useSocket';
import type { Chat } from '../../types/chat.types';
import type { Message } from '../../types/message.types';

export const Chats: React.FC = () => {
    const { setChats, currentChatId } = chatStore();
    const socket = useSocket();
    const queryClient = useQueryClient(); // получили queryClient

    const { data, isLoading, error } = useQuery({
        queryKey: ['chats'],
        queryFn: () => chatsApi.getChats().then((res) => res.data),
    });

    useEffect(() => {
        if (data) setChats(data);
    }, [data, setChats]);

    useEffect(() => {
        if (!socket) return;
        const handleNewChat = (chat: Chat) => {
            // Обновляем стор
            chatStore.getState().addChat(chat);
            // Обновляем кэш React Query
            queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
                if (!oldChats) return [chat];
                if (oldChats.some(c => c.id === chat.id)) return oldChats;
                return [chat, ...oldChats];
            });
            // Подписываемся на комнату нового чата
            if (socket) {
                socket.emit('join_chat', { chatId: chat.id });
            }
        };
        const handleUpdateChat = (chat: Chat) => chatStore.getState().updateChat(chat.id, chat);
        const handleDeleteChat = (chatId: string) => chatStore.getState().removeChat(chatId);
        socket.on('new_chat', handleNewChat);
        socket.on('update_chat', handleUpdateChat);
        socket.on('delete_chat', handleDeleteChat);

        const handleNewMessage = (message: Message) => {
            // Обновляем lastMessage
            queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
                if (!oldChats) return oldChats;
                const updatedChats = oldChats.map(chat => {
                    if (chat.id === message.chatId) {
                        return {
                            ...chat,
                            lastMessage: {
                                id: message.id,
                                type: message.type,
                                text: message.text,
                                createdAt: message.createdAt,
                            },
                        };
                    }
                    return chat;
                });
                return updatedChats.sort((a, b) => {
                    const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
                    const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
                    return timeB - timeA;
                });
            });

            // Увеличиваем unreadCount, если чат не открыт
            const currentChatId = chatStore.getState().currentChatId;
            if (currentChatId !== message.chatId) {
                const chat = chatStore.getState().chats.find(c => c.id === message.chatId);
                if (chat) {
                    const newCount = (chat.unreadCount || 0) + 1;
                    chatStore.getState().updateChat(message.chatId, { unreadCount: newCount });
                    // Обновляем кэш React Query
                    queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
                        if (!oldChats) return oldChats;
                        return oldChats.map(chat => {
                            if (chat.id === message.chatId) {
                                return { ...chat, unreadCount: newCount };
                            }
                            return chat;
                        });
                    });
                }
            }
        };
        socket.on('new_message', handleNewMessage);

        socket.on('chat_read', (data: { chatId: string; readBy: string }) => {
            // Обновляем стор
            chatStore.getState().updateChat(data.chatId, { unreadCount: 0 });
            // Обновляем кэш React Query
            queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
                if (!oldChats) return oldChats;
                return oldChats.map(chat => {
                    if (chat.id === data.chatId) {
                        return { ...chat, unreadCount: 0 };
                    }
                    return chat;
                });
            });
        });

        return () => {
            socket.off('new_chat', handleNewChat);
            socket.off('update_chat', handleUpdateChat);
            socket.off('delete_chat', handleDeleteChat);
            socket.off('new_message', handleNewMessage);
        };
    }, [socket, queryClient]);

    if (isLoading) return <Loader />;
    if (error) return <div className="text-red-500">Ошибка загрузки чатов</div>;

    return (
        <div className="flex h-screen">
            <ChatList />
            {currentChatId ? <ChatWindow key={currentChatId} chatId={currentChatId} /> : <div className="flex-1 flex items-center justify-center text-text-primary">Выберите, кому хотели бы написать</div>}
        </div>
    );
};