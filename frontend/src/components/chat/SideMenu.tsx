import React, { useEffect } from 'react';
import { chatStore } from '../../stores/chatStore';
import { themeStore } from '../../stores/themeStore';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsOpen: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, onSettingsOpen }) => {
    const chats = chatStore((state) => state.chats);
    const setCurrentChatId = chatStore((state) => state.setCurrentChatId);
    const { theme, toggleTheme } = themeStore();

    const savedChat = chats.find(c => c.type === 'saved');

    const handleSaved = () => {
        if (savedChat) {
            setCurrentChatId(savedChat.id);
            onClose();
        }
    };

    // Применяем класс темы к корневому элементу
    React.useEffect(() => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
    }, [theme]);

    // внутри компонента после других useEffect
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300" onClick={onClose} />
            )}
            <div className={`fixed top-0 left-0 h-full w-64 bg-bg-secondary border-r border-border z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-text-primary">Меню</h2>
                </div>
                <nav className="py-2">
                    <button onClick={() => { onSettingsOpen(); onClose(); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-text-primary hover:bg-bg-tertiary transition">
                        <svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
                            <circle cx="50" cy="30" r="15" />
                            <path d="M 22 76 C 22 55, 34 48, 50 48 C 66 48, 78 55, 78 76 A 11 11 0 0 1 67 87 L 33 87 A 11 11 0 0 1 22 76 Z" />
                        </svg>
                        <span>Мой профиль</span>
                    </button>
                    <button onClick={() => { onClose(); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-text-primary hover:bg-bg-tertiary transition">
                        <svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
                            <defs><mask id="group-mask"><rect width="100" height="100" fill="white" /><g fill="black" stroke="black" strokeWidth="6" strokeLinejoin="round"><circle cx="38" cy="35" r="14" /><path d="M 12 78 C 12 59, 23 52, 38 52 C 53 52, 64 59, 64 78 A 9 9 0 0 1 55 87 L 21 87 A 9 9 0 0 1 12 78 Z" /></g></mask></defs>
                            <g mask="url(#group-mask)" fill="currentColor"><circle cx="68" cy="45" r="11" /><path d="M 48 80 C 48 65, 56 59, 68 59 C 80 59, 88 65, 88 80 A 7 7 0 0 1 81 87 L 55 87 A 7 7 0 0 1 48 80 Z" /></g>
                            <g fill="currentColor"><circle cx="38" cy="35" r="14" /><path d="M 12 78 C 12 59, 23 52, 38 52 C 53 52, 64 59, 64 78 A 9 9 0 0 1 55 87 L 21 87 A 9 9 0 0 1 12 78 Z" /></g>
                        </svg>
                        <span>Создать группу</span>
                    </button>
                    <button onClick={() => { onClose(); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-text-primary hover:bg-bg-tertiary transition">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8a3 3 0 0 1 0 6" /><path d="M2 15v-4a2 2 0 0 1 2-2h4l5-4v16l-5-4H4a2 2 0 0 1-2-2z" />
                        </svg>
                        <span>Создать канал</span>
                    </button>
                    <button onClick={() => { onClose(); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-text-primary hover:bg-bg-tertiary transition">
                        <svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
                            <circle cx="50" cy="30" r="15" />
                            <path d="M 22 76 C 22 55, 34 48, 50 48 C 66 48, 78 55, 78 76 A 11 11 0 0 1 67 87 L 33 87 A 11 11 0 0 1 22 76 Z" />
                        </svg>
                        <span>Контакты</span>
                    </button>
                    {savedChat && (
                        <button onClick={handleSaved} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-text-primary hover:bg-bg-tertiary transition">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>Избранное</span>
                        </button>
                    )}
                    <button onClick={() => { onSettingsOpen(); onClose(); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-text-primary hover:bg-bg-tertiary transition">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <defs><mask id="settings-mask"><rect width="24" height="24" fill="white" /><circle cx="12" cy="12" r="3.0" fill="black" /><line x1="16.4" y1="7.5" x2="12.8" y2="11.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></mask></defs>
                            <path d="M19.4 15a4.5 4.5 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a4.5 4.5 0 0 0-1.82-.33 4.5 4.5 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A4.5 4.5 0 0 0 9 19.4a4.5 4.5 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A4.5 4.5 0 0 0 4.68 15a4.5 4.5 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A4.5 4.5 0 0 0 4.6 9a4.5 4.5 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A4.5 4.5 0 0 0 9 4.68a4.5 4.5 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a4.5 4.5 0 0 0 1 1.51 4.5 4.5 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A4.5 4.5 0 0 0 19.4 9a4.5 4.5 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a4.5 4.5 0 0 0-1.51 1z" mask="url(#settings-mask)" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                        </svg>
                        <span>Настройки</span>
                    </button>
                    {/* Переключатель темы */}
                    <button onClick={toggleTheme} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-text-primary hover:bg-bg-tertiary transition">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {theme === 'dark' ? (
                                // Иконка Луны (без лучей)
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            ) : (
                                // Иконка Солнца (круг + лучи сгруппированы вместе)
                                <>
                                    <circle cx="12" cy="12" r="5" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </>
                            )}
                        </svg>
                        <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
                    </button>
                </nav>
            </div>
        </>
    );
};

export default SideMenu;