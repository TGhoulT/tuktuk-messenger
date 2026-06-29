import { useEffect } from 'react';
import { getSocket } from '../sockets/socket';

export const useSocketEvent = (event: string, handler: (...args: any[]) => void) => {
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        socket.on(event, handler);
        return () => {
            socket.off(event, handler);
        };
    }, [event, handler]);
};