import React, { useEffect, useRef, useState, useCallback } from 'react';
import { chatStore } from '../../stores/chatStore';

interface MessageContextMenuProps {
    messageId: string;
    position: { x: number; y: number };
    messageRect: DOMRect;
    selectedText?: string | null;
    messageText?: string | null;
    onClose: () => void;
    onDelete: (messageId: string) => void;  // новый проп
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
    messageId,
    position,
    messageRect,
    selectedText,
    messageText,
    onClose,
    onDelete,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
        opacity: 0,
        transform: 'scale(0.9)',
        transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
    });
    const [origin, setOrigin] = useState('center top');

    const toggleMessageSelection = chatStore((state) => state.toggleMessageSelection);
    const setReplyToMessageId = chatStore((state) => state.setReplyToMessageId);
    const setEditMessageId = chatStore((state) => state.setEditMessageId);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;
        const menuHeight = menu.offsetHeight;
        const menuWidth = menu.offsetWidth;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const clickRelativeY = position.y - messageRect.top;
        const isUpperHalf = clickRelativeY < messageRect.height / 2;

        let top: number, newOrigin: string;
        if (isUpperHalf) {
            top = position.y;
            newOrigin = 'center top';
            if (top + menuHeight > windowHeight - 10) {
                top = Math.max(10, position.y - menuHeight);
                newOrigin = 'center bottom';
            }
        } else {
            top = position.y - menuHeight;
            newOrigin = 'center bottom';
            if (top < 10) {
                top = position.y;
                newOrigin = 'center top';
            }
        }
        let left = position.x + 12;
        if (left + menuWidth > windowWidth - 10) left = windowWidth - menuWidth - 10;
        if (left < 10) left = 10;

        setMenuStyle({
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            opacity: 1,
            transform: 'scale(1)',
            transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
        });
        setOrigin(newOrigin);
    }, [position, messageRect]);

    const handleCopy = useCallback(async () => {
        const text = selectedText || messageText || '';
        if (text) await navigator.clipboard.writeText(text);
        onClose();
    }, [selectedText, messageText, onClose]);

    const handleReply = useCallback(() => { setReplyToMessageId(messageId); onClose(); }, [messageId, setReplyToMessageId, onClose]);
    const handleEdit = useCallback(() => { setEditMessageId(messageId); onClose(); }, [messageId, setEditMessageId, onClose]);
    const handlePin = useCallback(() => { chatStore.getState().setPinMessageId(messageId); onClose(); }, [messageId, onClose]);
    const handleForward = useCallback(() => { chatStore.getState().setSelectionMode(true); chatStore.getState().toggleMessageSelection(messageId); onClose(); }, [messageId, onClose]);
    const handleDelete = useCallback(() => {
        onClose();                         // закрываем меню
        onDelete(messageId);               // сообщаем родителю, какое сообщение удалить
    }, [messageId, onClose, onDelete]);
    const handleSelect = useCallback(() => { toggleMessageSelection(messageId); onClose(); }, [messageId, toggleMessageSelection, onClose]);

    const hasSelectedText = !!(selectedText && selectedText.trim());

    return (
        <div
            ref={menuRef}
            className="fixed z-[200] w-56 bg-bg-primary border border-border rounded-lg shadow-2xl py-1 overflow-hidden"
            style={{ ...menuStyle, transformOrigin: origin }}
        >
            <button onClick={handleReply} className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition">
                {hasSelectedText ? 'Ответить с цитатой' : 'Ответить'}
            </button>
            <button onClick={handleCopy} className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition">
                {hasSelectedText ? 'Копировать выделенное' : 'Копировать'}
            </button>
            <button onClick={handleEdit} className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition">Изменить</button>
            <button onClick={handlePin} className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition">Закрепить</button>
            <button onClick={handleForward} className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition">Переслать</button>
            <button onClick={handleDelete} className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition text-red-500">Удалить</button>
            <button onClick={handleSelect} className="w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition">Выделить</button>
        </div>
    );
};