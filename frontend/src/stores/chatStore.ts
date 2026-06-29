import { create } from 'zustand';
import type { Chat } from '../types/chat.types';

export interface SearchResult {
    id: string;
    chatId: string;
    text: string;
    createdAt: string;
    senderId: string;
}

interface ChatState {
    chats: Chat[];
    currentChatId: string | null;
    isSearchOpen: boolean;
    targetMessageId: string | null;
    searchQuery: string | null;
    searchResults: SearchResult[];
    contextMenuMessageId: string | null;
    contextMenuPosition: { x: number; y: number } | null;
    contextMenuMessageRect: DOMRect | null;
    contextMenuSelectedText: string | null;
    contextMenuMessageText: string | null;
    selectedMessages: string[];
    isSelectionMode: boolean;
    replyToMessageId: string | null;
    editMessageId: string | null;
    pinMessageId: string | null;
    tempChat: { chatId: string; userId: string; username: string } | null;
    layoutVersion: 'z' | 'v';
    setChats: (chats: Chat[]) => void;
    addChat: (chat: Chat) => void;
    updateChat: (chatId: string, updates: Partial<Chat>) => void;
    removeChat: (chatId: string) => void;
    setCurrentChatId: (chatId: string | null) => void;
    setSearchOpen: (open: boolean) => void;
    setTargetMessageId: (id: string | null) => void;
    setSearchQuery: (q: string | null) => void;
    setSearchResults: (results: SearchResult[]) => void;
    clearSearchResults: () => void;
    openContextMenu: (messageId: string, position: { x: number; y: number }, messageRect: DOMRect, selectedText?: string, messageText?: string) => void;
    closeContextMenu: () => void;
    toggleMessageSelection: (messageId: string) => void;
    setSelectionMode: (active: boolean) => void;
    clearSelectedMessages: () => void;
    setReplyToMessageId: (id: string | null) => void;
    setEditMessageId: (id: string | null) => void;
    setPinMessageId: (id: string | null) => void;
    setTempChat: (temp: ChatState['tempChat']) => void;
    clearTempChat: () => void;
    setLayoutVersion: (version: 'z' | 'v') => void;
}

export const chatStore = create<ChatState>((set) => ({
    chats: [],
    currentChatId: null,
    isSearchOpen: false,
    targetMessageId: null,
    searchQuery: null,
    searchResults: [],
    contextMenuMessageId: null,
    contextMenuPosition: null,
    contextMenuMessageRect: null,
    contextMenuSelectedText: null,
    contextMenuMessageText: null,
    selectedMessages: [],
    isSelectionMode: false,
    replyToMessageId: null,
    editMessageId: null,
    pinMessageId: null,
    tempChat: null,
    setChats: (chats) => set({ chats }),
    addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
    updateChat: (chatId, updates) =>
        set((state) => ({
            chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
        })),
    removeChat: (chatId) =>
        set((state) => ({ chats: state.chats.filter((c) => c.id !== chatId) })),
    setCurrentChatId: (currentChatId) => set({ currentChatId }),
    setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
    setTargetMessageId: (targetMessageId) => set({ targetMessageId }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSearchResults: (searchResults) => set({ searchResults }),
    clearSearchResults: () => set({ searchResults: [], targetMessageId: null, searchQuery: null }),
    openContextMenu: (messageId, position, messageRect, selectedText, messageText) =>
        set({
            contextMenuMessageId: messageId,
            contextMenuPosition: position,
            contextMenuMessageRect: messageRect,
            contextMenuSelectedText: selectedText ?? null,
            contextMenuMessageText: messageText ?? null,
        }),
    closeContextMenu: () =>
        set({
            contextMenuMessageId: null,
            contextMenuPosition: null,
            contextMenuMessageRect: null,
            contextMenuSelectedText: null,
            contextMenuMessageText: null,
        }),
    toggleMessageSelection: (messageId) =>
        set((state) => {
            const already = state.selectedMessages.includes(messageId);
            const newSelection = already
                ? state.selectedMessages.filter((id) => id !== messageId)
                : [...state.selectedMessages, messageId];
            return {
                selectedMessages: newSelection,
                isSelectionMode: newSelection.length > 0,
            };
        }),
    setSelectionMode: (active) =>
        set({
            isSelectionMode: active,
            selectedMessages: active ? [] : [],
        }),
    clearSelectedMessages: () => set({ selectedMessages: [], isSelectionMode: false }),
    setReplyToMessageId: (id) => set({ replyToMessageId: id, editMessageId: null }),
    setEditMessageId: (id) => set({ editMessageId: id, replyToMessageId: null }),
    setPinMessageId: (pinMessageId) => set({ pinMessageId }),
    setTempChat: (tempChat) => set({ tempChat }),
    clearTempChat: () => set({ tempChat: null }),
    layoutVersion: (localStorage.getItem('layout-version') as 'z' | 'v') || 'z',
    setLayoutVersion: (version) => {
        localStorage.setItem('layout-version', version);
        set({ layoutVersion: version });
    },
}));