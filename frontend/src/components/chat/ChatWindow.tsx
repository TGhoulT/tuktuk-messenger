import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../../api/messages';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { useSocket } from '../../hooks/useSocket';
import { chatStore } from '../../stores/chatStore';
import { useAuth } from '../../hooks/useAuth';
import type { Message, MessageStatus } from '../../types/message.types';
import { MessageContextMenu } from './MessageContextMenu';
import { SelectionBar } from './SelectionBar';
import { PinMessageModal } from './PinMessageModal';
import { chatsApi } from '../../api/chats';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { createPortal } from 'react-dom';
import type { Chat } from '../../types/chat.types';

const getLastSeenStatus = (lastActivityAt: string | null | undefined): string => {
    if (!lastActivityAt) return 'был(а) недавно';
    const now = Date.now();
    const last = new Date(lastActivityAt).getTime();
    const diffMin = Math.floor((now - last) / 60000);
    if (diffMin < 1) return 'был(а) только что';
    if (diffMin < 60) return `был(а) ${diffMin} мин. назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `был(а) ${diffHours} ч. назад`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `был(а) ${diffDays} дн. назад`;
    if (diffDays < 30) return 'был(а) на этой неделе';
    if (diffDays < 365) return 'был(а) в этом году';
    return 'был(а) давно';
};

const muteOptions = [
    { label: '15 минут', value: 15 },
    { label: '30 минут', value: 30 },
    { label: '1 час', value: 60 },
    { label: '2 часа', value: 120 },
    { label: '4 часа', value: 240 },
    { label: '8 часов', value: 480 },
    { label: '12 часов', value: 720 },
    { label: '1 день', value: 1440 },
    { label: '2 дня', value: 2880 },
    { label: '1 неделя', value: 10080 },
    { label: '1 месяц', value: 43200 },
];

const highlightWord = (text: string, query: string): React.ReactNode => {
    if (!query.trim() || !text) return text;
    const lowerQuery = query.toLowerCase();
    const parts: { value: string; isWord: boolean }[] = [];
    const wordRegex = /\p{L}+/gu;
    let lastIndex = 0;
    let match;
    while ((match = wordRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ value: text.substring(lastIndex, match.index), isWord: false });
        }
        parts.push({ value: match[0], isWord: true });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push({ value: text.substring(lastIndex), isWord: false });
    }
    return (
        <>
            {parts.map((part, i) => {
                if (part.isWord && part.value.toLowerCase().includes(lowerQuery)) {
                    return (
                        <mark key={i} className="bg-accent-lime/30 text-text-primary rounded">
                            {part.value}
                        </mark>
                    );
                }
                return part.value;
            })}
        </>
    );
};

const StatusIcon: React.FC<{ status: MessageStatus; className?: string }> = ({ status, className = 'text-text-secondary' }) => {
    switch (status) {
        case 'sending':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`animate-spin ${className}`}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            );
        case 'sent':
        case 'delivered':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M5 12l5 5L20 7" />
                </svg>
            );
        case 'read':
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M3 12l5 5L18 7" />
                    <path d="M11 15l2 2L23 7" />
                </svg>
            );
        default:
            return null;
    }
};

const formatTime = (dateStr: string) => {
    const utcDate = new Date(dateStr);
    const offsetMs = utcDate.getTimezoneOffset() * 60000;
    const localDate = new Date(utcDate.getTime() - offsetMs);
    return localDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 70%)`;
};

export const ChatWindow: React.FC<{ chatId: string }> = ({ chatId }) => {
    const [input, setInput] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false);
    const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
    const [selectedMuteOption, setSelectedMuteOption] = useState<{ label: string; value: number } | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isChoosingSticker, setIsChoosingSticker] = useState(false);
    const [isScrolledUp, setIsScrolledUp] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
    const [dragCurrentIndex, setDragCurrentIndex] = useState<number | null>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const hasMoved = useRef(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const versionMenuRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
    const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const initialScrollDoneRef = useRef(false);
    const wasHighlightedRef = useRef(false);

    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [showTempHighlight, setShowTempHighlight] = useState(false);
    const [isContextLoading, setIsContextLoading] = useState(false);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());

    const queryClient = useQueryClient();
    const {
        chats,
        setCurrentChatId,
        setSearchOpen,
        targetMessageId,
        setTargetMessageId,
        searchQuery,
        isSearchOpen,
        contextMenuMessageId,
        contextMenuPosition,
        contextMenuMessageText,
        contextMenuSelectedText,
        contextMenuMessageRect,
        openContextMenu,
        closeContextMenu,
        isSelectionMode,
        clearSelectedMessages,
        selectedMessages,
        replyToMessageId,
        editMessageId,
        setReplyToMessageId,
        setEditMessageId,
        pinMessageId,
        tempChat,
        clearTempChat,
        layoutVersion,
        setLayoutVersion,
        toggleMessageSelection,
    } = chatStore();
    const { user: currentUser } = useAuth();
    const socket = useSocket();
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTypingSentRef = useRef<number>(0);
    const TYPING_THROTTLE_MS = 3000;
    const isInitialMount = useRef(true);
    const menuPopupRef = useRef<HTMLDivElement>(null);
    const [isExiting] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

    const chat = useMemo(() => chats.find(c => c.id === chatId), [chats, chatId]);
    const isTempChat = chatId?.startsWith('temp-user-');
    const tempUser = isTempChat && tempChat?.chatId === chatId ? tempChat : null;

    const companionId = useMemo(() => {
        if (!chat || chat.type !== 'dialog') return null;
        const other = chat.participants?.find(p => p.userId !== currentUser?.id);
        return other?.userId || null;
    }, [chat, currentUser]);

    useEffect(() => {
        if (!companionId || !socket) return;
        socket.emit('get_online_status', { userId: companionId });
        const handleStatus = (data: { userId: string; online: boolean }) => {
            if (data.userId === companionId) setIsOnline(data.online);
        };
        socket.on('user_online_status', handleStatus);
        return () => {
            socket.off('user_online_status', handleStatus);
        };
    }, [companionId, socket]);

    useEffect(() => {
        if (!companionId || !socket) return;
        const handleFocus = () => {
            socket.emit('get_online_status', { userId: companionId });
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [companionId, socket]);

    useEffect(() => {
        if (!targetMessageId || !chatId) return;
        if (chatId.startsWith('temp-user-')) return;
        setIsContextLoading(true);
        messagesApi.getMessageContext(chatId, targetMessageId, 15)
            .then(res => {
                const contextMessages = res.data.messages;
                if (!contextMessages.length) return;
                queryClient.setQueryData(['messages', chatId], (oldData: any) => {
                    if (!oldData) {
                        return {
                            pages: [{ messages: contextMessages, nextCursor: null }],
                            pageParams: [undefined],
                        };
                    }
                    const existingIds = new Set<string>();
                    const allMessages: Message[] = [];
                    for (const page of oldData.pages) {
                        for (const msg of page.messages) {
                            if (!existingIds.has(msg.id)) {
                                existingIds.add(msg.id);
                                allMessages.push(msg);
                            }
                        }
                    }
                    for (const msg of contextMessages) {
                        if (!existingIds.has(msg.id)) {
                            existingIds.add(msg.id);
                            allMessages.push(msg);
                        }
                    }
                    allMessages.sort((a, b) =>
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );
                    const pageSize = 50;
                    const newPages = [];
                    for (let i = 0; i < allMessages.length; i += pageSize) {
                        const slice = allMessages.slice(i, i + pageSize);
                        newPages.push({
                            messages: slice,
                            nextCursor: slice.length === pageSize ? slice[slice.length - 1].createdAt : null,
                        });
                    }
                    return {
                        pages: newPages,
                        pageParams: newPages.map((_, idx) => oldData.pageParams[idx] ?? undefined),
                    };
                });
                setHighlightedMessageId(targetMessageId);
            })
            .catch(err => console.error('Не удалось загрузить контекст', err))
            .finally(() => setIsContextLoading(false));
    }, [chatId, targetMessageId, queryClient, setTargetMessageId]);

    const {
        data: messagesPages,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['messages', chatId],
        queryFn: ({ pageParam }) =>
            messagesApi.getMessages(chatId, pageParam, 50).then(res => res.data),
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!chatId && !isContextLoading && !chatId.startsWith('temp-user-'),
        initialPageParam: undefined as string | undefined,
    });

    const allMessages = useMemo(() => {
        if (!messagesPages) return [];
        const flat = messagesPages.pages.flatMap(page => page.messages);
        const unique = new Map<string, Message>();
        for (const msg of flat) {
            if (!unique.has(msg.id)) unique.set(msg.id, msg);
        }
        const deduped = Array.from(unique.values());
        const sorted = deduped.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        if (chat?.type === 'saved' || chat?.type === 'system') {
            return sorted.map(msg => ({ ...msg, status: 'read' as MessageStatus }));
        }
        return sorted;
    }, [messagesPages, chat?.type]);

    const messagesWithGroup = useMemo(() => {
        if (layoutVersion === 'z') {
            const result: { msg: Message; showAvatar: boolean; isLastInGroup: boolean }[] = [];
            for (let i = 0; i < allMessages.length; i++) {
                const current = allMessages[i];
                const next = allMessages[i + 1];
                const sameSenderNext = next && next.sender?.id === current.sender?.id;
                const showAvatar = !sameSenderNext;
                const isLastInGroup = !sameSenderNext;
                result.push({ msg: current, showAvatar, isLastInGroup });
            }
            return result;
        }
        return allMessages.map(msg => ({ msg, showAvatar: true, isLastInGroup: true }));
    }, [allMessages, layoutVersion]);

    useEffect(() => {
        if (highlightedMessageId) {
            setShowTempHighlight(true);
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = setTimeout(() => {
                setShowTempHighlight(false);
                setHighlightedMessageId(null);
            }, 3000);
        } else {
            setShowTempHighlight(false);
        }
        return () => {
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        };
    }, [highlightedMessageId]);

    useEffect(() => {
        if (highlightedMessageId) wasHighlightedRef.current = true;
    }, [highlightedMessageId]);

    useEffect(() => {
        if (!highlightedMessageId) return;
        const timer = setTimeout(() => {
            const el = document.getElementById(`msg-${highlightedMessageId}`);
            const container = messagesContainerRef.current;
            if (!el || !container) return;
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const isVisible = elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
            if (!isVisible) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
        return () => clearTimeout(timer);
    }, [highlightedMessageId]);

    useEffect(() => {
        if (!isSearchOpen) {
            setTargetMessageId(null);
            setHighlightedMessageId(null);
            setShowTempHighlight(false);
        }
    }, [isSearchOpen, setTargetMessageId]);

    useEffect(() => {
        if (!bottomSentinelRef.current || allMessages.length === 0) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsScrolledUp(!entry.isIntersecting),
            { threshold: 0 }
        );
        observer.observe(bottomSentinelRef.current);
        return () => observer.disconnect();
    }, [allMessages.length]);

    useEffect(() => {
        if (!loadMoreRef.current || isFetchingNextPage || !hasNextPage) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) fetchNextPage(); },
            { threshold: 0.1 }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        if (isLoading || allMessages.length === 0) return;
        if (!initialScrollDoneRef.current && !wasHighlightedRef.current) {
            scrollToBottom();
            initialScrollDoneRef.current = true;
        }
    }, [isLoading, allMessages.length]);

    useEffect(() => {
        initialScrollDoneRef.current = false;
        wasHighlightedRef.current = false;
    }, [chatId]);

    // Сброс isInitialMount при первом монтировании
    useEffect(() => {
        const timer = setTimeout(() => {
            isInitialMount.current = false;
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Сброс isInitialMount при смене чата
    useEffect(() => {
        isInitialMount.current = true;
        const timer = setTimeout(() => {
            isInitialMount.current = false;
        }, 100);
        return () => clearTimeout(timer);
    }, [chatId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMenuOpen && menuPopupRef.current && !menuPopupRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setIsVersionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setDragStartIndex(null);
                setDragCurrentIndex(null);
                dragStartPos.current = null;
                hasMoved.current = false;
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isDragging]);

    useSocketEvent('new_message', (message: Message) => {
        if (message.chatId === chatId) {
            queryClient.setQueryData(['messages', chatId], (oldData: any) => {
                if (!oldData) return oldData;
                const clientMessageId = message.clientMessageId;
                const newPages = oldData.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.filter((m: Message) => {
                        if (clientMessageId && m.clientMessageId === clientMessageId) return false;
                        if (m.id.startsWith('temp-')) return false;
                        return true;
                    }),
                }));
                const [firstPage, ...restPages] = newPages;
                return {
                    pages: [{ ...firstPage, messages: [...firstPage.messages, message] }, ...restPages],
                    pageParams: oldData.pageParams,
                };
            });
            setIsTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (messagesContainerRef.current) {
                const container = messagesContainerRef.current;
                const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                if (atBottom || document.hasFocus()) scrollToBottom();
            }
            if (document.hasFocus()) socket?.emit('mark_read', { chatId });
        }
    });

    useEffect(() => {
        if (chatId && socket && !chatId.startsWith('temp-user-')) {
            socket.emit('mark_read', { chatId });
        }
    }, [chatId, socket]);

    useEffect(() => {
        if (!chatId || !socket || isLoading || isContextLoading) return;
        if (chatId.startsWith('temp-user-')) return;
        const hasUnreadFromCompanion = allMessages.some(msg =>
            msg.sender?.id !== currentUser?.id &&
            msg.status !== 'read' &&
            msg.status !== 'sending'
        );
        if (hasUnreadFromCompanion) {
            socket.emit('mark_read', { chatId });
            socket.emit('join_chat', { chatId });
        }
    }, [chatId, socket, allMessages, isLoading, isContextLoading, currentUser?.id]);

    useEffect(() => {
        if (chatId && socket && !chatId.startsWith('temp-user-')) {
            socket.emit('join_chat', { chatId });
        }
    }, [chatId, socket]);

    useSocketEvent('chat_read', (data: { chatId: string; readBy: string }) => {
        if (data.chatId === chatId) {
            // Обновляем статусы сообщений (галочки)
            queryClient.setQueryData(['messages', chatId], (oldData: any) => {
                if (!oldData) return oldData;
                const newPages = oldData.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((msg: Message) => {
                        if (msg.sender?.id === currentUser?.id && msg.status !== 'read') {
                            return { ...msg, status: 'read' as MessageStatus };
                        }
                        return msg;
                    }),
                }));
                return { ...oldData, pages: newPages };
            });

            // Обновляем список чатов (для сброса unreadCount)
            queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
                if (!oldChats) return oldChats;
                return oldChats.map(chat => {
                    if (chat.id === chatId) {
                        return { ...chat, unreadCount: 0 };
                    }
                    return chat;
                });
            });

            // Обновляем стор
            chatStore.getState().updateChat(chatId, { unreadCount: 0 });
        }
    });

    useSocketEvent('user_online', (data: { userId: string }) => {
        if (companionId && data.userId === companionId) setIsOnline(true);
    });
    useSocketEvent('user_offline', (data: { userId: string }) => {
        if (companionId && data.userId === companionId) setIsOnline(false);
    });
    useSocketEvent('user_typing', (data: { userId: string; chatId: string }) => {
        if (data.chatId === chatId && data.userId === companionId) {
            setIsTyping(true);
            const timer = setTimeout(() => setIsTyping(false), 6000);
            return () => clearTimeout(timer);
        }
    });
    useSocketEvent('user_typing_stop', (data: { userId: string; chatId: string }) => {
        if (data.chatId === chatId && data.userId === companionId) {
            setIsTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    });
    useSocketEvent('user_choosing_sticker', (data: { userId: string; chatId: string }) => {
        if (data.chatId === chatId && data.userId === companionId) {
            setIsChoosingSticker(true);
            const timer = setTimeout(() => setIsChoosingSticker(false), 6000);
            return () => clearTimeout(timer);
        }
    });

    useSocketEvent('message_deleted', (data: { messageId: string; forAll: boolean }) => {
        // Если forAll === true, удаляем у всех.
        if (data.forAll) {
            queryClient.setQueryData(['messages', chatId], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                        ...page,
                        messages: page.messages.filter((msg: any) => msg.id !== data.messageId),
                    })),
                };
            });
        }
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // Проверяем, открыто ли какое-либо модальное окно (настройки, боковое меню, модалки удаления/закрепления)
                const isAnyModalOpen = document.querySelector('.fixed.inset-0.z-50, .fixed.inset-0.z-40, .fixed.inset-0.z-30, .modal-backdrop');
                if (isAnyModalOpen) return;

                if (isVersionMenuOpen) setIsVersionMenuOpen(false);
                else if (isMenuOpen) setIsMenuOpen(false);
                else if (isMuteModalOpen) setIsMuteModalOpen(false);
                else if (deletingMessageId) setDeletingMessageId(null);
                else if (pinMessageId) chatStore.getState().setPinMessageId(null);
                else if (isSelectionMode) clearSelectedMessages();
                else if (!isSearchOpen) {
                    if (chatId?.startsWith('temp-user-')) clearTempChat();
                    setCurrentChatId(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVersionMenuOpen, isMenuOpen, isMuteModalOpen, deletingMessageId, pinMessageId, isSelectionMode, isSearchOpen, chatId, clearTempChat, setCurrentChatId, clearSelectedMessages]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuPopupRef.current && !menuPopupRef.current.contains(e.target as Node) &&
                menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
                setIsVersionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!chatId?.startsWith('temp-user-') && tempChat) {
            clearTempChat();
        }
    }, [chatId, tempChat, clearTempChat]);

    // useEffect(() => {
    //     if (!chatId || chatId.startsWith('temp-user-')) return;
    //     // Сбросить непрочитанные для этого чата
    //     const currentChat = chats.find(c => c.id === chatId);
    //     if (currentChat && currentChat.unreadCount && currentChat.unreadCount > 0) {
    //         // Оптимистично обновляем store
    //         chatStore.getState().updateChat(chatId, { unreadCount: 0 });
    //         // Отправляем mark_read на сервер (уже есть в других местах, но для надёжности)
    //         socket?.emit('mark_read', { chatId });
    //     }
    // }, [chatId, chats, socket]);

    useEffect(() => {
        if (!chatId || chatId.startsWith('temp-user-')) return;

        // Всегда сбрасываем unreadCount для этого чата
        chatStore.getState().updateChat(chatId, { unreadCount: 0 });
        queryClient.setQueryData<Chat[]>(['chats'], (oldChats) => {
            if (!oldChats) return oldChats;
            return oldChats.map(chat => {
                if (chat.id === chatId) {
                    return { ...chat, unreadCount: 0 };
                }
                return chat;
            });
        });

        socket?.emit('mark_read', { chatId });
    }, [chatId, socket, queryClient]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInput(newValue);
        const now = Date.now();
        if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
            socket?.emit('typing', { chatId });
            lastTypingSentRef.current = now;
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 5000);
    };

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        });
    };

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;
        if (isTempChat && tempUser) {
            try {
                const realChatRes = await chatsApi.createChat({
                    type: 'dialog',
                    userIds: [tempUser.userId],
                });
                const realChat = realChatRes.data;
                chatStore.getState().addChat(realChat);
                chatStore.getState().setCurrentChatId(realChat.id);
                clearTempChat();
                const payload: any = {
                    chatId: realChat.id,
                    type: 'text',
                    text: input,
                    clientMessageId: crypto.randomUUID(),
                };
                if (replyToMessageId) {
                    payload.replyToMessageId = replyToMessageId;
                    setReplyToMessageId(null);
                }
                await messagesApi.sendMessage(payload);
                setInput('');
                scrollToBottom();
                setIsTyping(false);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                socket?.emit('stop_typing', { chatId });
                return;
            } catch (err) {
                console.error('Ошибка создания чата', err);
                return;
            }
        }
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            clientMessageId: crypto.randomUUID(),
            chatId,
            sender: { id: currentUser!.id, username: currentUser!.username },
            type: 'text',
            text: input,
            status: 'sending' as MessageStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            file: null,
            mediaGroupId: null,
            isMediaGroup: false,
            forwardInfo: null,
            reactions: {},
        };
        queryClient.setQueryData(['messages', chatId], (oldData: any) => {
            if (!oldData) return { pages: [{ messages: [optimisticMessage], nextCursor: null }], pageParams: [undefined] };
            const newPages = oldData.pages.map((page: any, index: number) => {
                if (index === 0) return { ...page, messages: [...page.messages, optimisticMessage] };
                return page;
            });
            return { ...oldData, pages: newPages };
        });
        setInput('');
        scrollToBottom();
        if (editMessageId) {
            try {
                await messagesApi.editMessage(editMessageId, input);
                queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
                setEditMessageId(null);
                setIsTyping(false);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                return;
            } catch (err) { console.error('Ошибка редактирования', err); }
            return;
        }
        const payload: any = {
            chatId,
            type: 'text',
            text: input,
            clientMessageId: crypto.randomUUID(),
        };
        if (replyToMessageId) {
            payload.replyToMessageId = replyToMessageId;
            setReplyToMessageId(null);
        }
        try {
            await messagesApi.sendMessage(payload);
            setIsTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        } catch (err) { console.error('Ошибка отправки', err); }
    }, [input, editMessageId, replyToMessageId, chatId, currentUser, queryClient, setEditMessageId, setReplyToMessageId, isTempChat, tempUser, clearTempChat, scrollToBottom]);

    const handleMessageContextMenu = useCallback((e: React.MouseEvent, messageId: string) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const cursorPos = { x: e.clientX, y: e.clientY };
        const selection = window.getSelection()?.toString() || '';
        const msg = allMessages.find(m => m.id === messageId);
        openContextMenu(messageId, cursorPos, rect, selection, msg?.text || '');
    }, [openContextMenu, allMessages]);


    const handleDeleteMessage = useCallback(async (removeForCompanion?: boolean) => {
        if (!deletingMessageId) return;

        // 1. Сразу удаляем из кэша (сообщение исчезает)
        queryClient.setQueryData(['messages', chatId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.filter((msg: any) => msg.id !== deletingMessageId),
                })),
            };
        });

        // 2. Запускаем анимацию (для красоты, хотя сообщение уже пропало)
        setDeletingMessageIds(prev => new Set(prev).add(deletingMessageId));

        try {
            await messagesApi.deleteMessage(deletingMessageId, removeForCompanion);
            // Успех — ничего не делаем, сообщение уже удалено
        } catch (err) {
            // Ошибка — восстанавливаем сообщение
            console.error('Ошибка удаления', err);
            // Возвращаем сообщение в кэш (загружаем заново или вставляем обратно)
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
            alert('Не удалось удалить сообщение');
        } finally {
            setDeletingMessageIds(prev => {
                const next = new Set(prev);
                next.delete(deletingMessageId);
                return next;
            });
            setDeletingMessageId(null);
        }
    }, [deletingMessageId, chatId, queryClient]);

    const getMessageIdFromElement = (element: HTMLElement | null): string | null => {
        if (!element) return null;
        const messageEl = element.closest('[data-message-id]');
        return messageEl?.getAttribute('data-message-id') || null;
    };

    const handleDragStart = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, textarea, [role="button"]')) return;
        const messageId = getMessageIdFromElement(target);
        if (!messageId) return;
        const index = allMessages.findIndex(m => m.id === messageId);
        if (index === -1) return;
        setIsDragging(true);
        setDragStartIndex(index);
        setDragCurrentIndex(index);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        hasMoved.current = false;
    };

    const handleDragMove = (e: React.MouseEvent) => {
        if (!isDragging || dragStartIndex === null) return;
        if (dragStartPos.current) {
            const dx = Math.abs(e.clientX - dragStartPos.current.x);
            const dy = Math.abs(e.clientY - dragStartPos.current.y);
            if (dx + dy < 5 && !hasMoved.current) return;
            hasMoved.current = true;
        }
        const target = e.target as HTMLElement;
        const currentMessageId = getMessageIdFromElement(target);
        if (!currentMessageId) return;
        const currentIndex = allMessages.findIndex(m => m.id === currentMessageId);
        if (currentIndex === -1) return;
        setDragCurrentIndex(currentIndex);
        const [min, max] = [Math.min(dragStartIndex, currentIndex), Math.max(dragStartIndex, currentIndex)];
        const rangeIds = allMessages.slice(min, max + 1).map(m => m.id);
        clearSelectedMessages();
        rangeIds.forEach(id => toggleMessageSelection(id));
    };

    const handleDragEnd = () => {
        if (isDragging && hasMoved.current && isSelectionMode) {
            // перетаскивание – выделение уже обновлено в handleDragMove
        } else if (isDragging && !hasMoved.current && dragStartIndex !== null && isSelectionMode) {
            const startId = allMessages[dragStartIndex]?.id;
            if (startId) {
                toggleMessageSelection(startId);
            }
        }
        setIsDragging(false);
        setDragStartIndex(null);
        setDragCurrentIndex(null);
        dragStartPos.current = null;
        hasMoved.current = false;
    };

    const handleMessageClick = useCallback((_messageId: string, _e: React.MouseEvent) => { }, []);

    if (isLoading) return <div className="flex-1 flex items-center justify-center">Загрузка...</div>;

    let statusText = '';
    if (chat) {
        if (chat.type === 'system') statusText = 'системные уведомления';
        else if (chat.type === 'saved') statusText = '';
        else if (chat.type === 'dialog') {
            if (isOnline) statusText = 'в сети';
            else if (isTyping) statusText = 'печатает...';
            else if (isChoosingSticker) statusText = 'выбирает стикер...';
            else if (chat.lastSeenDisplay) statusText = chat.lastSeenDisplay;
            else if (chat.lastActivityAt) statusText = getLastSeenStatus(chat.lastActivityAt);
            else statusText = 'был(а) недавно';
        } else if (chat.type === 'group' || chat.type === 'channel') {
            statusText = `${chat.participants?.length || 0} участников`;
        }
    }

    const inputPlaceholder = editMessageId ? 'Редактирование...' : replyToMessageId ? 'Ответ...' : 'Сообщение...';

    return (
        <div className="flex-1 flex flex-col bg-bg-primary relative">
            {/* Верхняя панель с анимацией */}
            <div className="relative h-14 overflow-hidden">
                {/* Обычная панель */}
                <div className={`absolute inset-0 transition-all duration-200 ${isSelectionMode ? 'slide-down-to-bottom pointer-events-none' : 'slide-up-from-bottom'}`}>
                    <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-bg-secondary shrink-0">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-text-primary truncate">
                                {isTempChat && tempUser ? tempUser.username : (chat?.displayTitle || chat?.title || 'Чат')}
                            </h3>
                            {isTyping ? (
                                <p className="text-xs text-accent-lime truncate flex items-center gap-1">
                                    печатает
                                    <span className="typing-dots flex">
                                        <span></span><span></span><span></span>
                                    </span>
                                </p>
                            ) : (statusText && <p className={`text-xs truncate ${isOnline ? 'text-accent-lime' : 'text-text-secondary'}`}>{statusText}</p>)}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                            <button onClick={() => setSearchOpen(true)} className="p-1 rounded hover:bg-bg-tertiary transition text-text-secondary hover:text-text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={(e) => {
                                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                        setMenuPosition({
                                            top: rect.bottom + 8,   // отступ от кнопки 8px
                                            right: window.innerWidth - rect.right,
                                        });
                                        setIsMenuOpen(!isMenuOpen);
                                    }}
                                    className="p-1 rounded hover:bg-bg-tertiary transition text-text-secondary hover:text-text-primary"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <circle cx="12" cy="5" r="2" />
                                        <circle cx="12" cy="12" r="2" />
                                        <circle cx="12" cy="19" r="2" />
                                    </svg>
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
                {/* Панель выделения */}
                {(isSelectionMode || isExiting) && !isInitialMount.current && (
                    <div className={`absolute inset-0 transition-all duration-200 ${isSelectionMode ? 'slide-down-from-top' : 'slide-up-to-top'
                        }`}>
                        <SelectionBar />
                    </div>
                )}
                {isMenuOpen && createPortal(
                    <div
                        className="fixed w-56 bg-bg-primary border border-border rounded-lg shadow-xl z-[1000] py-1"
                        style={{
                            top: `${menuPosition.top}px`,
                            right: `${menuPosition.right}px`,
                        }}
                    >
                        {/* содержимое меню (без изменений) */}
                        <div className="px-3 py-2 hover:bg-bg-tertiary cursor-pointer flex items-center justify-between text-sm" onClick={() => { setIsMenuOpen(false); setIsMuteModalOpen(true); }}>
                            <span>🔔 Выключить на время</span>
                            <span className="text-text-secondary">▼</span>
                        </div>
                        <div className="border-t border-border my-1"></div>
                        <div className="px-3 py-2 hover:bg-bg-tertiary cursor-pointer flex items-center justify-between text-sm" onClick={() => setIsVersionMenuOpen(!isVersionMenuOpen)}>
                            <span>🎨 Версия отображения</span>
                            <span className="text-text-secondary">{layoutVersion === 'z' ? 'Z' : 'V'}</span>
                        </div>
                        {isVersionMenuOpen && (
                            <div className="mt-1 bg-bg-secondary border border-border rounded-md shadow-lg py-1">
                                <div className={`px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary ${layoutVersion === 'z' ? 'text-accent-lime' : ''}`} onClick={() => { setLayoutVersion('z'); setIsVersionMenuOpen(false); setIsMenuOpen(false); }}>
                                    Классическая (Z)
                                </div>
                                <div className={`px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary ${layoutVersion === 'v' ? 'text-accent-lime' : ''}`} onClick={() => { setLayoutVersion('v'); setIsVersionMenuOpen(false); setIsMenuOpen(false); }}>
                                    Компактная (V)
                                </div>
                            </div>
                        )}
                    </div>,
                    document.body
                )}
            </div>

            {replyToMessageId && (() => {
                const quotedMsg = allMessages.find(m => m.id === replyToMessageId);
                if (!quotedMsg) return null;
                const maxLen = 58;
                const text = quotedMsg.text || '';
                const truncated = text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
                return (
                    <div className="mx-4 mt-2 flex items-center gap-2 bg-bg-secondary border border-border rounded p-2 text-sm text-text-secondary">
                        <div className="flex-1 truncate">{truncated}</div>
                        <button onClick={() => setReplyToMessageId(null)} className="text-text-secondary hover:text-red-500 transition">✕</button>
                    </div>
                );
            })()}

            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 select-none"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
            >
                {hasNextPage && (
                    <div ref={loadMoreRef} className="py-2 text-center text-text-secondary text-xs">
                        {isFetchingNextPage ? 'Загрузка...' : ''}
                    </div>
                )}
                {messagesWithGroup.map(({ msg, showAvatar, isLastInGroup }) => {
                    const isHighlighted = msg.id === highlightedMessageId && showTempHighlight;
                    const textContent = isHighlighted && searchQuery
                        ? highlightWord(msg.text || '', searchQuery)
                        : msg.text;
                    const isSelected = selectedMessages.includes(msg.id);
                    const isOwn = msg.sender?.id === currentUser?.id;
                    const showChecks = isOwn && chat?.type !== 'channel';
                    const avatarColor = stringToColor(msg.sender?.id || '');
                    const shouldAnimate =
                        msg.id.startsWith('temp-') ||
                        msg.status === 'sending' ||
                        (!isOwn && (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read'));

                    if (layoutVersion === 'z') {
                        // Z: для своих сообщений галочка слева, для чужих – справа
                        return (
                            <div
                                key={msg.id}
                                id={`msg-${msg.id}`}
                                data-message-id={msg.id}
                                className={`group relative flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                            >
                                {isSelected && (
                                    <div className={`absolute ${isOwn ? 'right-[-16px]' : 'left-[-16px]'} top-2 w-5 h-5 bg-accent-lime rounded-full flex items-center justify-center text-black text-xs font-bold animate-slide-in-right-subtle z-10`}>
                                        ✓
                                    </div>
                                )}
                                {showAvatar && (
                                    <div
                                        className={`absolute bottom-0 ${isOwn ? 'right-0' : 'left-0'} w-8 h-8 rounded-full flex items-center justify-center text-xs text-white overflow-hidden`}
                                        style={{ backgroundColor: avatarColor }}
                                        title={msg.sender?.username}
                                    >
                                        {msg.sender?.username?.[0].toUpperCase() || '?'}
                                    </div>
                                )}
                                <div
                                    className={`relative max-w-[70%] rounded-2xl p-2 transition-all duration-200 ${isOwn ? 'bg-blue-500 text-white' : 'bg-white text-black'
                                        } ${isHighlighted ? 'ring-2 ring-accent-yellow' : ''
                                        } ${isSelected ? 'ring-2 ring-accent-yellow' : ''
                                        } ${shouldAnimate ? 'animate-slide-in-from-bottom' : ''
                                        } ${isLastInGroup ? (isOwn ? 'rounded-br-none' : 'rounded-bl-none') : ''
                                        }`}
                                    style={!isOwn ? { marginLeft: '44px' } : { marginRight: '44px' }}
                                    onClick={(e) => handleMessageClick(msg.id, e)}
                                    onContextMenu={(e) => handleMessageContextMenu(e, msg.id)}
                                >
                                    <div className="break-words pr-12">{textContent}</div>
                                    <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none">
                                        <span className="text-[10px] opacity-70">{formatTime(msg.createdAt)}</span>
                                        {showChecks && (
                                            <StatusIcon
                                                status={msg.status}
                                                className={msg.status === 'read' ? 'text-accent-lime' : isOwn ? 'text-white/80' : 'text-gray-500'}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // V: все сообщения слева, галочка справа от сообщения
                    return (
                        <div
                            key={msg.id}
                            id={`msg-${msg.id}`}
                            data-message-id={msg.id}
                            className={`flex items-start gap-2 mb-2 justify-start relative`}
                        >
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white overflow-hidden flex-shrink-0"
                                style={{ backgroundColor: avatarColor }}
                                title={msg.sender?.username}
                            >
                                {msg.sender?.username?.[0].toUpperCase() || '?'}
                            </div>
                            {isSelected && (
                                <div className="absolute right-[-16px] top-2 w-5 h-5 bg-accent-lime rounded-full flex items-center justify-center text-black text-xs font-bold animate-slide-in-right-subtle">
                                    ✓
                                </div>
                            )}
                            <div
                                className={`relative p-2 rounded-lg transition-colors duration-500 cursor-pointer w-fit max-w-[70%] ${isOwn ? 'bg-blue-500 text-white' : 'bg-white text-black'
                                    } ${isHighlighted ? 'ring-2 ring-accent-yellow' : ''
                                    } ${isSelected ? 'ring-2 ring-accent-yellow' : ''
                                    } ${shouldAnimate ? 'animate-slide-in-from-bottom' : ''
                                    }`}
                                onClick={(e) => handleMessageClick(msg.id, e)}
                                onContextMenu={(e) => handleMessageContextMenu(e, msg.id)}
                            >
                                <div className="break-words pr-12">{textContent}</div>
                                <div className="absolute bottom-1 right-2 flex items-center gap-1 select-none">
                                    <span className="text-[10px] opacity-70">{formatTime(msg.createdAt)}</span>
                                    {showChecks && (
                                        <StatusIcon
                                            status={msg.status}
                                            className={msg.status === 'read' ? 'text-accent-lime' : isOwn ? 'text-white' : 'text-black'}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomSentinelRef} className="h-0" />
            </div>

            {isScrolledUp && !isSelectionMode && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-6 w-10 h-10 bg-accent-lime text-black rounded-full shadow-lg flex items-center justify-center hover:bg-accent-yellow transition-opacity duration-200 z-30"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            )}

            <div className="p-4 border-t border-border flex gap-2 items-start">
                {(replyToMessageId || editMessageId) && (
                    <button onClick={() => { setReplyToMessageId(null); setEditMessageId(null); }} className="p-2 text-text-secondary hover:text-red-500 transition">✕</button>
                )}
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={inputPlaceholder}
                    className="flex-1 p-2 rounded bg-bg-secondary text-text-primary border border-border focus:outline-none focus:border-accent-lime"
                />
                <button onClick={handleSend} className="px-4 py-2 bg-accent-lime text-black rounded hover:bg-accent-yellow transition">Отправить</button>
            </div>

            {isMuteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsMuteModalOpen(false)}>
                    <div className="bg-bg-primary border border-border rounded-lg w-64 max-h-80 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="text-center p-3 border-b border-border font-medium">Выключить на время</div>
                        <div className="flex-1 overflow-y-auto">
                            {muteOptions.map(opt => (
                                <div
                                    key={opt.value}
                                    className={`px-4 py-3 text-center cursor-pointer hover:bg-bg-tertiary ${selectedMuteOption?.value === opt.value ? 'bg-accent-lime/20 border-l-2 border-accent-lime' : ''}`}
                                    onClick={() => {
                                        console.log(`Отключить на ${opt.label}`);
                                        setIsMuteModalOpen(false);
                                        setSelectedMuteOption(null);
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {contextMenuMessageId && contextMenuPosition && contextMenuMessageRect && (
                <MessageContextMenu
                    messageId={contextMenuMessageId}
                    position={contextMenuPosition}
                    messageRect={contextMenuMessageRect}
                    selectedText={contextMenuSelectedText}
                    messageText={contextMenuMessageText}
                    onClose={closeContextMenu}
                    onDelete={(id) => setDeletingMessageId(id)}
                />
            )}
            {pinMessageId && <PinMessageModal />}
            {deletingMessageId && (
                <DeleteConfirmModal
                    isOpen={!!deletingMessageId}
                    onClose={() => setDeletingMessageId(null)}
                    onConfirm={handleDeleteMessage}
                    count={1}
                    userName={chat?.type === 'dialog' ? chat?.displayTitle : undefined}
                />
            )}
        </div>
    );
};