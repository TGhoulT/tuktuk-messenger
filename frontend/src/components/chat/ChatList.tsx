import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { chatStore, type SearchResult } from '../../stores/chatStore';
import { useAuth } from '../../hooks/useAuth';
import { searchApi } from '../../api/search';
import SideMenu from './SideMenu';
import SettingsModal from './SettingsModal';

// Генерация инициалов
const getInitials = (displayTitle: string | null | undefined, isDialog?: boolean): string => {
    if (!displayTitle) return '?';
    const words = displayTitle.trim().split(/\s+/);
    if (isDialog || words.length === 1) {
        return words[0][0].toUpperCase();
    }
    return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
};

// Генерация цвета по ID
const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 70%)`;
};

// Подсветка целого слова
const highlightWord = (text: string, query: string, isActive?: boolean): React.ReactNode => {
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
                        <span key={i} className={isActive ? 'text-black' : 'text-accent-lime'}>
                            {part.value}
                        </span>
                    );
                }
                return part.value;
            })}
        </>
    );
};

// Иконка для "Мои чаты"
const AllChatsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
        <mask id="cutoutMaskFront" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
            <rect x="0" y="0" width="32" height="32" fill="white" />
            <path d="M4 12 C4 5.5 7.5 3 13 3 C18.5 3 22 5.5 22 12 C22 18.5 18.5 21 13 21 H 8 C 5 21 4 24 4 24 V 12 Z" fill="currentColor" stroke="black" strokeWidth="3" strokeLinejoin="miter" strokeLinecap="square" />
        </mask>
        <path d="M29 17 C29 11.5 25.5 9 20 9 C14.5 9 11 11.5 11 17 C11 22.5 14.5 25 20 25 H 25 C 28 25 29 28 29 28 V 17 Z" fill="currentColor" mask="url(#cutoutMaskFront)" />
        <path d="M4 12 C4 5.5 7.5 3 13 3 C18.5 3 22 5.5 22 12 C22 18.5 18.5 21 13 21 H 8 C 5 21 4 24 4 24 V 12 Z" fill="currentCOlor" />
    </svg>
);

// SVG иконка выхода
const ExitIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="20" height="20" fill="currentColor">
        <defs>
            <mask id="ring-cutout">
                <rect width="100" height="100" fill="white" />
                <rect x="38" y="0" width="24" height="50" fill="black" />
            </mask>
        </defs>
        <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="14" mask="url(#ring-cutout)" />
        <path d="M 43.5 9 L 56.5 9 L 56.5 34.5 C 54 34.5, 52 32.5, 50 32.5 C 48 32.5, 46 34.5, 43.5 34.5 Z" fill="currentColor" />
        <circle cx="50" cy="50" r="14" fill="currentColor" />
    </svg>
);

interface GlobalSearchResult {
    type: 'user' | 'group' | 'channel';
    id: string;
    username?: string;
    title?: string;
    avatarUrl?: string | null;
}

export const ChatList: React.FC = () => {
    const {
        chats,
        currentChatId,
        setCurrentChatId,
        isSearchOpen,
        setSearchOpen,
        targetMessageId,
        setTargetMessageId,
        setSearchQuery,
        setSearchResults: setStoreSearchResults,
        clearSearchResults,
    } = chatStore();
    const { logout } = useAuth();

    const [sideMenuOpen, setSideMenuOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [skipConfirm, setSkipConfirm] = useState(() => localStorage.getItem('exit-skip-confirm') === 'true');

    // Поиск сообщений (существующий)
    const [searchQuery, setSearchQueryLocal] = useState('');
    const [searchScope, setSearchScope] = useState<'current' | 'global'>(
        currentChatId ? 'current' : 'global'
    );
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [showScopeMenu, setShowScopeMenu] = useState(false);

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchEndRef = useRef<HTMLDivElement | null>(null);
    const scopeMenuRef = useRef<HTMLDivElement>(null);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);

    // Глобальный поиск (пользователи / каналы)
    const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
    const [globalQuery, setGlobalQuery] = useState('');
    const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([]);
    const [isGlobalFetching, setIsGlobalFetching] = useState(false);
    const globalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const globalInputRef = useRef<HTMLInputElement>(null);

    // Недавние (из localStorage)
    const [recentSearches, setRecentSearches] = useState<GlobalSearchResult[]>(() => {
        try {
            const saved = localStorage.getItem('recent-searches');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('recent-searches', JSON.stringify(recentSearches));
    }, [recentSearches]);

    const addToRecent = (item: GlobalSearchResult) => {
        setRecentSearches(prev => {
            const filtered = prev.filter(r => !(r.type === item.type && r.id === item.id));
            return [item, ...filtered].slice(0, 20); // макс 20 недавних
        });
    };

    const clearRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem('recent-searches');
    };

    // Дебаунс глобального поиска
    const handleGlobalSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setGlobalResults([]);
            return;
        }
        setIsGlobalFetching(true);
        try {
            const res = await searchApi.searchGlobal(query.trim());
            const results: GlobalSearchResult[] = [
                ...res.data.users.map((u: any) => ({ ...u, type: 'user' })),
                ...res.data.chats.map((c: any) => ({ ...c, type: c.type })),
            ];
            setGlobalResults(results);
        } catch (err) {
            console.error('Global search error', err);
        } finally {
            setIsGlobalFetching(false);
        }
    }, []);

    useEffect(() => {
        if (globalDebounceRef.current) clearTimeout(globalDebounceRef.current);
        globalDebounceRef.current = setTimeout(() => handleGlobalSearch(globalQuery), 300);
        return () => {
            if (globalDebounceRef.current) clearTimeout(globalDebounceRef.current);
        };
    }, [globalQuery, handleGlobalSearch]);

    const handleGlobalResultClick = async (result: GlobalSearchResult) => {
        addToRecent(result);
        if (result.type === 'user') {
            // Ищем существующий диалог с этим пользователем
            const existingDialog = chats.find(c =>
                c.type === 'dialog' &&
                c.participants?.some(p => p.userId === result.id)
            );
            if (existingDialog) {
                // Открываем существующий чат
                setCurrentChatId(existingDialog.id);
            } else {
                // Создаём временный чат
                const tempId = `temp-user-${result.id}`;
                chatStore.getState().setTempChat({
                    chatId: tempId,
                    userId: result.id,
                    username: result.username || result.id,
                });
                chatStore.getState().setCurrentChatId(tempId);
            }
        } else {
            // Для групп/каналов – проверяем, есть ли уже такой чат
            const existingChat = chats.find(c => c.id === result.id);
            if (existingChat) {
                setCurrentChatId(result.id);
            } else {
                console.log('Необходимо вступить в чат', result.id);
            }
        }
        closeGlobalSearch();
    };

    const openGlobalSearch = () => {
        setGlobalSearchOpen(true);
        setTimeout(() => globalInputRef.current?.focus(), 10);
    };

    const closeGlobalSearch = () => {
        setGlobalSearchOpen(false);
        setGlobalQuery('');
        setGlobalResults([]);
    };

    // Синхронизация searchResults
    useEffect(() => {
        setStoreSearchResults(searchResults);
    }, [searchResults, setStoreSearchResults]);

    useEffect(() => {
        localStorage.setItem('exit-skip-confirm', String(skipConfirm));
    }, [skipConfirm]);

    const [isLoupeAnimating, setIsLoupeAnimating] = useState(false);
    useEffect(() => {
        if (isSearchOpen) {
            setIsLoupeAnimating(true);
            const timer = setTimeout(() => setIsLoupeAnimating(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [isSearchOpen]);

    useEffect(() => {
        if (isSearchOpen) {
            setSearchScope(currentChatId ? 'current' : 'global');
        }
    }, [isSearchOpen, currentChatId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (scopeMenuRef.current && !scopeMenuRef.current.contains(e.target as Node)) {
                setShowScopeMenu(false);
            }
        };
        if (showScopeMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showScopeMenu]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (globalSearchOpen) {
                    closeGlobalSearch();
                } else if (isSearchOpen) {
                    if (showScopeMenu) {
                        setShowScopeMenu(false);
                    } else {
                        setSearchOpen(false);
                        setSearchQueryLocal('');
                        setSearchResults([]);
                        setNextCursor(null);
                        clearSearchResults();
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen, showScopeMenu, setSearchOpen, clearSearchResults, globalSearchOpen]);

    const fetchSearch = useCallback(
        async (query: string, scope: 'current' | 'global', cursor?: string) => {
            if (!query.trim()) {
                setSearchResults([]);
                setNextCursor(null);
                return;
            }
            const chatId: string | undefined = (scope === 'current' && currentChatId) ? currentChatId : undefined;
            try {
                if (!cursor) setIsFetching(true);
                else setIsFetchingMore(true);

                const res = await searchApi.searchMessages({
                    q: query.trim(),
                    chatId,
                    limit: 20,
                    cursor,
                });
                const newMessages = res.data.messages;
                if (cursor) {
                    setSearchResults(prev => [...prev, ...newMessages]);
                } else {
                    setSearchResults(newMessages);
                }
                setNextCursor(res.data.nextCursor);
            } catch (err) {
                console.error('Search error', err);
            } finally {
                setIsFetching(false);
                setIsFetchingMore(false);
            }
        },
        [currentChatId]
    );

    useEffect(() => {
        if (!isSearchOpen) return;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setSearchResults([]);
            setNextCursor(null);
            fetchSearch(searchQuery, searchScope);
        }, 300);
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchQuery, searchScope, isSearchOpen, fetchSearch]);

    useEffect(() => {
        if (!searchEndRef.current || !nextCursor || isFetchingMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextCursor && !isFetchingMore) {
                    fetchSearch(searchQuery, searchScope, nextCursor);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(searchEndRef.current);
        return () => observer.disconnect();
    }, [nextCursor, isFetchingMore, searchQuery, searchScope, fetchSearch]);

    const getChatInfo = useCallback(
        (chatId: string) => {
            const chat = chats.find(c => c.id === chatId);
            return {
                title: chat?.displayTitle || chat?.title || 'Чат',
                avatarUrl: chat?.avatarUrl,
            };
        },
        [chats]
    );

    const handleExitClick = () => {
        if (skipConfirm) logout();
        else setShowConfirm(true);
    };

    const handleConfirmLogout = () => {
        setShowConfirm(false);
        logout();
    };

    const handleResultClick = (chatId: string, messageId: string) => {
        setSearchQuery(searchQuery);
        setTargetMessageId(messageId);
        setCurrentChatId(chatId);
        setNextCursor(null);
    };

    const currentChat = useMemo(() => chats.find(c => c.id === currentChatId), [chats, currentChatId]);
    const currentChatAvatar = currentChat?.avatarUrl;
    const currentChatInitials = getInitials(currentChat?.displayTitle, currentChat?.type === 'dialog');

    return (
        <aside className="w-80 bg-bg-secondary border-r border-border flex flex-col relative">
            {/* Заголовок с поиском (если не открыт глобальный поиск и не открыт поиск сообщений) */}
            {!isSearchOpen && !globalSearchOpen && (
                <div className="h-14 px-4 border-b border-border flex items-center justify-between gap-3">
                    <button
                        onClick={() => setSideMenuOpen(true)}
                        className="p-1 rounded hover:bg-bg-tertiary transition text-text-secondary hover:text-text-primary focus:outline-none flex-shrink-0"
                        title="Меню"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    <div className="flex-1">
                        <div
                            onClick={openGlobalSearch}
                            className="w-full py-2 px-4 rounded-full bg-bg-tertiary text-text-secondary text-sm border border-border cursor-pointer hover:border-accent-lime transition-colors"
                        >
                            Поиск
                        </div>
                    </div>

                    <div className="relative inline-flex group flex-shrink-0">
                        <button
                            onClick={handleExitClick}
                            className="p-1 rounded hover:bg-bg-tertiary transition text-text-secondary hover:text-red-500 focus:outline-none"
                        >
                            <ExitIcon />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                            Выйти
                        </span>
                    </div>
                </div>
            )}

            {/* Экран глобального поиска */}
            {globalSearchOpen && (
                <div className="flex flex-col h-full">
                    <div className="h-14 px-4 border-b border-border flex items-center">
                        <input
                            ref={globalInputRef}
                            type="text"
                            value={globalQuery}
                            onChange={(e) => setGlobalQuery(e.target.value)}
                            placeholder="Поиск пользователей и каналов..."
                            className="flex-1 bg-transparent text-text-primary outline-none text-sm placeholder-text-secondary"
                        />
                        <button onClick={closeGlobalSearch} className="ml-2 text-text-secondary hover:text-white">
                            ✕
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!globalQuery.trim() ? (
                            <>
                                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                                    <span className="text-xs text-text-secondary font-medium">Недавние</span>
                                    {recentSearches.length > 0 && (
                                        <button onClick={clearRecent} className="text-xs text-accent-lime hover:underline">
                                            Очистить
                                        </button>
                                    )}
                                </div>
                                {recentSearches.map((item, idx) => {
                                    const initials = item.type === 'user'
                                        ? (item.username?.[0] || '?').toUpperCase()
                                        : (item.title?.[0] || item.username?.[0] || '?').toUpperCase();
                                    const bgColor = stringToColor(item.id);
                                    return (
                                        <div
                                            key={`${item.type}-${item.id}-${idx}`}
                                            onClick={() => handleGlobalResultClick(item)}
                                            className="flex items-center gap-3 p-3 border-b border-border hover:bg-bg-tertiary cursor-pointer transition"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden flex-shrink-0"
                                                style={{ backgroundColor: bgColor }}
                                            >
                                                {item.avatarUrl ? (
                                                    <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    initials
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-text-primary truncate">
                                                    {item.title || item.username}
                                                </div>
                                                {item.type === 'user' && item.username && (
                                                    <div className="text-xs text-text-secondary">@{item.username}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {recentSearches.length === 0 && (
                                    <div className="p-4 text-center text-text-secondary text-sm">Нет недавних запросов</div>
                                )}
                            </>
                        ) : (
                            <>
                                {isGlobalFetching ? (
                                    <div className="p-4 text-center text-text-secondary text-sm">Поиск...</div>
                                ) : globalResults.length === 0 ? (
                                    <div className="p-4 text-center text-text-secondary text-sm">Ничего не найдено</div>
                                ) : (
                                    globalResults.map((item, idx) => {
                                        const initials = item.type === 'user'
                                            ? (item.username?.[0] || '?').toUpperCase()
                                            : (item.title?.[0] || item.username?.[0] || '?').toUpperCase();
                                        const bgColor = stringToColor(item.id);
                                        return (
                                            <div
                                                key={`${item.type}-${item.id}-${idx}`}
                                                onClick={() => handleGlobalResultClick(item)}
                                                className="flex items-center gap-3 p-3 border-b border-border hover:bg-bg-tertiary cursor-pointer transition"
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden flex-shrink-0"
                                                    style={{ backgroundColor: bgColor }}
                                                >
                                                    {item.avatarUrl ? (
                                                        <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        initials
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm text-text-primary truncate">
                                                        {item.title || item.username}
                                                    </div>
                                                    {item.type === 'user' && item.username && (
                                                        <div className="text-xs text-text-secondary">@{item.username}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Поиск сообщений (isSearchOpen) */}
            {isSearchOpen && (
                <>
                    <div className="h-14 px-4 border-b border-border flex items-center">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQueryLocal(e.target.value)}
                            placeholder="Поиск сообщений..."
                            autoFocus
                            className="flex-1 bg-transparent text-text-primary outline-none text-sm placeholder-text-secondary"
                        />
                        <button
                            onClick={() => {
                                setSearchOpen(false);
                                setSearchQueryLocal('');
                                setSearchResults([]);
                                setNextCursor(null);
                                clearSearchResults();
                            }}
                            className="ml-2 text-text-primary hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="px-4 py-1.5 border-b border-border text-xs text-text-secondary">
                        Поиск в чате:
                    </div>

                    <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-sm">
                        <div className="relative" ref={scopeMenuRef}>
                            <button
                                onClick={() => setShowScopeMenu(!showScopeMenu)}
                                className="flex items-center gap-2 text-text-primary hover:text-accent-lime"
                            >
                                {searchScope === 'current' && currentChat ? (
                                    <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-xs overflow-hidden">
                                        {currentChatAvatar ? (
                                            <img src={currentChatAvatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            currentChatInitials
                                        )}
                                    </div>
                                ) : (
                                    <AllChatsIcon />
                                )}
                                <span>{searchScope === 'current' ? 'Этот чат' : 'Мои чаты'}</span>
                                <svg className="w-3 h-3" viewBox="0 0 10 6" fill="currentColor">
                                    <path d="M0 0l5 6 5-6z" />
                                </svg>
                            </button>
                            <div
                                className={`absolute top-full left-0 mt-1 w-40 bg-bg-primary border border-border rounded shadow-lg z-50 py-1 transition-all duration-200 transform ${showScopeMenu ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                                    }`}
                            >
                                <div
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary flex items-center gap-2 ${searchScope === 'current' ? 'text-accent-lime' : ''}`}
                                    onClick={() => { setSearchScope('current'); setShowScopeMenu(false); }}
                                >
                                    {currentChat ? (
                                        <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-xs overflow-hidden">
                                            {currentChatAvatar ? (
                                                <img src={currentChatAvatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                currentChatInitials
                                            )}
                                        </div>
                                    ) : (
                                        <AllChatsIcon />
                                    )}
                                    <span>Этот чат</span>
                                </div>
                                <div
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-bg-tertiary flex items-center gap-2 ${searchScope === 'global' ? 'text-accent-lime' : ''}`}
                                    onClick={() => { setSearchScope('global'); setShowScopeMenu(false); }}
                                >
                                    <AllChatsIcon />
                                    <span>Мои чаты</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {searchQuery.trim() === '' ? (
                            <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className={`w-12 h-12 mb-4 opacity-50 ${isLoupeAnimating ? 'animate-bounce' : ''}`}
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <p className="text-sm">Поиск по сообщениям</p>
                            </div>
                        ) : isFetching && searchResults.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-text-secondary">
                                <p className="text-sm">Поиск...</p>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center text-text-secondary mt-10 text-sm">Ничего не найдено</div>
                        ) : (
                            <>
                                {searchResults.map((msg, idx) => {
                                    const { title, avatarUrl } = getChatInfo(msg.chatId);
                                    const initials = getInitials(title, false);
                                    const bgColor = stringToColor(msg.chatId);
                                    const isActive = msg.id === targetMessageId;

                                    return (
                                        <div
                                            key={msg.id + '-' + idx}
                                            className={`flex items-center gap-3 p-3 border-b border-border cursor-pointer transition-colors ${isActive
                                                ? 'bg-accent-lime text-black'
                                                : 'hover:bg-bg-tertiary'
                                                }`}
                                            onClick={() => handleResultClick(msg.chatId, msg.id)}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm overflow-hidden"
                                                style={{ backgroundColor: bgColor }}
                                            >
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    initials
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-sm font-medium truncate ${isActive ? 'text-black' : 'text-text-primary'}`}>
                                                    {title}
                                                </div>
                                                <div className={`text-xs truncate mt-0.5 ${isActive ? 'text-black' : 'text-text-secondary'}`}>
                                                    {highlightWord(msg.text, searchQuery, isActive)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {nextCursor && (
                                    <div ref={searchEndRef} className="py-2 text-center text-text-secondary text-xs">
                                        {isFetchingMore ? 'Загрузка...' : ''}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Список чатов (когда не открыт ни глобальный поиск, ни поиск сообщений) */}
            {!isSearchOpen && !globalSearchOpen && (
                <div className="flex-1 overflow-y-auto">
                    {chats.map((chat) => {
                        const initials = getInitials(chat.displayTitle, chat.isDialog);
                        const bgColor = stringToColor(chat.id);
                        return (
                            <div
                                key={chat.id}
                                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${currentChatId === chat.id ? 'bg-accent-lime text-black' : 'hover:bg-bg-tertiary'}`}
                                onClick={() => {
                                    if (currentChatId !== chat.id) setCurrentChatId(chat.id);
                                }}
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm overflow-hidden"
                                    style={{ backgroundColor: bgColor }}
                                >
                                    {chat.avatarUrl ? (
                                        <img src={chat.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 relative">
                                    {/* Заголовок чата с отступом справа, чтобы не перекрывать бейдж */}
                                    <div className="font-medium truncate pr-12">
                                        {chat.displayTitle || chat.title || 'Чат'}
                                    </div>
                                    {/* Последнее сообщение тоже с отступом */}
                                    <div className="text-sm text-text-secondary truncate pr-12">
                                        {chat.lastMessage
                                            ? chat.lastMessage.text ||
                                            (chat.lastMessage.type === 'sticker' ? 'Стикер' :
                                                chat.lastMessage.type === 'file' || chat.lastMessage.type === 'media' ? 'Файл' : 'Сообщение')
                                            : 'Нет сообщений'}
                                    </div>

                                    {/* Бейдж непрочитанных – красный, белый текст, круг/овал */}
                                    {chat.unreadCount !== undefined && chat.unreadCount !== null && chat.unreadCount > 0 && (
                                        <div
                                            className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full h-5 ${chat.unreadCount < 10 ? 'w-5' : 'px-2 min-w-[20px]'
                                                } leading-none`}
                                        >
                                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConfirm(false)}>
                    <div className="bg-bg-primary border border-border rounded-lg p-6 w-80" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-3">Подтверждение выхода</h3>
                        <p className="text-sm text-text-secondary mb-4">Вы уверены, что хотите выйти из аккаунта?</p>
                        <div className="flex items-center mb-5">
                            <input type="checkbox" id="skip-confirm" checked={skipConfirm} onChange={e => setSkipConfirm(e.target.checked)} />
                            <label htmlFor="skip-confirm" className="ml-2 text-sm text-text-secondary cursor-pointer">Больше не спрашивать</label>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm bg-bg-tertiary rounded hover:bg-bg-secondary">Отмена</button>
                            <button onClick={handleConfirmLogout} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Выйти</button>
                        </div>
                    </div>
                </div>
            )}
            <SideMenu
                isOpen={sideMenuOpen}
                onClose={() => setSideMenuOpen(false)}
                onSettingsOpen={() => setSettingsModalOpen(true)}
            />
            <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
        </aside>
    );
};