import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';
import { disconnectSocket } from '../sockets/socket';
import { chatStore } from './chatStore';

interface AuthState {
    user: { id: string; username: string; email: string } | null;
    accessToken: string | null;
    refreshToken: string | null;
    sessionId: string | null;
    setTokens: (accessToken: string, refreshToken: string, sessionId: string) => void;
    setUser: (user: AuthState['user']) => void;
    logout: () => Promise<void>;
}

export const authStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            sessionId: null,
            setTokens: (accessToken, refreshToken, sessionId) => set({ accessToken, refreshToken, sessionId }),
            setUser: (user) => set({ user }),
            logout: async () => {
                const refreshToken = get().refreshToken;
                if (refreshToken) {
                    try {
                        await authApi.logout(refreshToken);
                    } catch (e) {
                        console.error('Ошибка при выходе на сервере', e);
                    }
                }
                // Очищаем состояние аутентификации
                set({ user: null, accessToken: null, refreshToken: null, sessionId: null });
                // Очищаем чаты
                chatStore.getState().setChats([]);
                chatStore.getState().setCurrentChatId(null);
                // Очищаем чувствительные данные в localStorage
                localStorage.removeItem('recent-searches');
                localStorage.removeItem('layout-version');
                // Разрываем сокет
                disconnectSocket();
            },
        }),
        { name: 'auth-storage' }
    )
);