import React, { useState, useCallback } from 'react';
import { chatStore } from '../../stores/chatStore';
import { messagesApi } from '../../api/messages';
import { useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ForwardModal } from './ForwardModal';

export const SelectionBar: React.FC = () => {
    const { selectedMessages, clearSelectedMessages, setSelectionMode, currentChatId } = chatStore();
    const queryClient = useQueryClient();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showForwardModal, setShowForwardModal] = useState(false);

    const handleDelete = useCallback(async () => {
        try {
            await Promise.all(selectedMessages.map(id => messagesApi.deleteMessage(id)));
            if (currentChatId) {
                queryClient.invalidateQueries({ queryKey: ['messages', currentChatId] });
            }
        } catch (err) {
            console.error('Ошибка удаления', err);
        }
        clearSelectedMessages();
        setShowDeleteConfirm(false);
    }, [selectedMessages, currentChatId, queryClient, clearSelectedMessages]);

    const handleForward = useCallback(async (targetChatId: string) => {
        if (!targetChatId || selectedMessages.length === 0) return;
        try {
            await messagesApi.forwardMessages({
                messageIds: selectedMessages,
                targetChatIds: [targetChatId],
            });
            clearSelectedMessages();
            setShowForwardModal(false);
            queryClient.invalidateQueries({ queryKey: ['messages', targetChatId] });
        } catch (err) {
            console.error('Ошибка пересылки', err);
        }
    }, [selectedMessages, clearSelectedMessages, queryClient]);

    const handleCancel = useCallback(() => {
        setSelectionMode(false);
        setShowForwardModal(false);
    }, [setSelectionMode]);

    const count = selectedMessages.length;
    const currentChat = chatStore.getState().chats.find(c => c.id === currentChatId);
    const companionName = currentChat?.type === 'dialog' ? currentChat?.displayTitle || undefined : undefined;

    return (
        <>
            <div className="h-14 px-4 flex items-center justify-between bg-bg-secondary border-b border-border shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowForwardModal(true)}
                        className="px-3 py-1 rounded hover:bg-bg-tertiary transition text-sm font-medium text-accent-lime"
                    >
                        Переслать {count > 1 && count}
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-3 py-1 rounded hover:bg-bg-tertiary transition text-sm font-medium text-accent-lime"
                    >
                        Удалить {count > 1 && count}
                    </button>
                </div>
                <button
                    onClick={handleCancel}
                    className="px-3 py-1 rounded hover:bg-bg-tertiary transition text-sm font-medium text-accent-lime"
                >
                    Отмена
                </button>
            </div>

            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                count={count}
                userName={companionName}
            />

            <ForwardModal
                isOpen={showForwardModal}
                onClose={() => setShowForwardModal(false)}
                onForward={handleForward}
            />
        </>
    );
};