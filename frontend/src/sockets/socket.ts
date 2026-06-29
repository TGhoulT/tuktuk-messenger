import { io, Socket } from 'socket.io-client';
import { authStore } from '../stores/authStore';

let socket: Socket | null = null;

export const connectSocket = () => {
    const token = authStore.getState().accessToken;
    if (!token || socket?.connected) return;
    socket = io(import.meta.env.VITE_API_URL, {
        auth: { token },
        transports: ['websocket'],
        autoConnect: true,
    });
    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('connect_error', (err) => console.error('Socket error:', err));
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => socket;