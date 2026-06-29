import { useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../sockets/socket';
import { useAuth } from './useAuth';

export const useSocket = () => {
    const { accessToken } = useAuth();

    useEffect(() => {
        if (accessToken) {
            connectSocket();
        } else {
            disconnectSocket();
        }
        return () => {
            disconnectSocket();
        };
    }, [accessToken]);

    const socket = getSocket();

    // Отправка событий при изменении видимости вкладки
    useEffect(() => {
        if (!socket) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                socket.emit('went_offline');
            } else {
                socket.emit('ping_online');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [socket]);

    return socket;
};