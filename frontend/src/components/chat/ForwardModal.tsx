import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { chatStore } from '../../stores/chatStore';
import type { Chat } from '../../types/chat.types';

interface ForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onForward: (targetChatId: string) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ isOpen, onClose, onForward }) => {
    const chats = chatStore((state) => state.chats);
    const currentChatId = chatStore((state) => state.currentChatId);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredChats, setFilteredChats] = useState<Chat[]>([]);

    const availableChats = useMemo(() => chats.filter(c => c.id !== currentChatId), [chats, currentChatId]);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            return;
        }
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            setFilteredChats(availableChats);
        } else {
            setFilteredChats(availableChats.filter(chat => {
                const displayName = chat.displayTitle || chat.title || '';
                return displayName.toLowerCase().includes(query);
            }));
        }
    }, [searchQuery, availableChats, isOpen]);

    // Закрытие по Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-bg-primary border border-border rounded-lg w-[90%] max-w-md min-h-[300px] max-h-[80vh] flex flex-col shadow-xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-text-primary">Переслать...</h3>
                </div>
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Поиск..."
                            autoFocus
                            className="w-full p-2 pl-9 rounded bg-transparent text-text-primary border border-border focus:outline-none focus:border-accent-lime placeholder-text-secondary"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredChats.length === 0 ? (
                        <div className="p-4 text-center text-text-secondary text-sm">Ничего не найдено</div>
                    ) : (
                        filteredChats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => onForward(chat.id)}
                                className="w-full px-4 py-3 text-left hover:bg-bg-tertiary transition flex items-center gap-3"
                            >
                                <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-semibold text-text-primary">
                                    {(chat.displayTitle || chat.title || 'Чат')[0].toUpperCase()}
                                </div>
                                <span className="text-text-primary truncate">{chat.displayTitle || chat.title || 'Чат'}</span>
                            </button>
                        ))
                    )}
                </div>
                <div className="p-4 border-t border-border flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-bg-tertiary text-text-primary rounded hover:bg-bg-secondary transition">Отмена</button>
                </div>
            </div>
        </div>,
        document.body
    );
};