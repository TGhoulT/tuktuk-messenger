import React, { useState, useEffect, useCallback } from 'react';
import { chatStore } from '../../stores/chatStore';
import { useAuth } from '../../hooks/useAuth';
import { messagesApi } from '../../api/messages';

export const PinMessageModal: React.FC = () => {
    const { pinMessageId, setPinMessageId, chats, currentChatId } = chatStore();
    const { user: currentUser } = useAuth();
    const [forBoth, setForBoth] = useState(false);

    const chat = chats.find(c => c.id === currentChatId);
    const isDialog = chat?.type === 'dialog' && !['saved', 'system'].includes(chat?.type ?? '');

    // Находим собеседника
    const companion = chat?.participants?.find(p => p.userId !== currentUser?.id);
    const companionName = companion?.user?.username || 'собеседника';

    const handleClose = useCallback(() => {
        setPinMessageId(null);
    }, [setPinMessageId]);

    const handlePin = useCallback(async () => {
        if (!pinMessageId) return;
        try {
            await messagesApi.pinMessage(pinMessageId, isDialog ? forBoth : false);
        } catch (err) {
            console.error('Ошибка закрепления', err);
        }
        handleClose();
    }, [pinMessageId, forBoth, isDialog, handleClose]);

    // Закрытие по Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        if (pinMessageId) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pinMessageId, handleClose]);

    if (!pinMessageId || !chat) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
            <div className="bg-bg-primary border border-border rounded-lg p-6 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-text-primary mb-3">Закрепить это сообщение?</h3>

                {isDialog && (
                    <div className="flex items-center mb-5">
                        <input
                            type="checkbox"
                            id="pin-for-both"
                            checked={forBoth}
                            onChange={(e) => setForBoth(e.target.checked)}
                            className="w-4 h-4 text-accent-lime bg-bg-secondary border-border rounded focus:ring-accent-lime"
                        />
                        <label htmlFor="pin-for-both" className="ml-2 text-sm text-text-secondary cursor-pointer">
                            Также закрепить для {companionName}
                        </label>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm bg-bg-tertiary text-text-primary rounded hover:bg-bg-secondary transition"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handlePin}
                        className="px-4 py-2 text-sm bg-accent-lime text-black rounded hover:bg-accent-yellow transition"
                    >
                        Закрепить
                    </button>
                </div>
            </div>
        </div>
    );
};