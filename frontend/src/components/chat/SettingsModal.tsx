import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../api/user';
import { useAuth } from '../../hooks/useAuth';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Описания для пунктов приватности
const privacyDescriptions: Record<string, string> = {
    lastSeen: 'Кто видит время последнего захода',
    profilePhoto: 'Кто видит фото в моём профиле',
    forwardMessages: 'Кто может ссылаться на мой аккаунт при пересылке сообщений',
    messages: 'Кто может отправлять мне сообщения',
    bio: 'Кто видит раздел "О себе" в моём профиле',
    favoriteMusic: 'Кто видит мою сохранённую музыку',
    invites: 'Кто может приглашать меня в группы и каналы',
};

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

const privacyOptions = [
    { value: 'everyone', label: 'Все' },
    { value: 'contacts', label: 'Мои контакты' },
    { value: 'nobody', label: 'Никто' },
];

// Компонент строки в главном меню
const MenuRow: React.FC<{
    label: string;
    value?: string;
    onClick: () => void;
}> = ({ label, value, onClick }) => (
    <div
        onClick={onClick}
        className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-bg-secondary transition"
    >
        <span className="text-sm text-text-primary">{label}</span>
        <div className="flex items-center gap-2">
            {value && <span className="text-sm text-accent-lime">{value}</span>}
            <svg className="w-4 h-4 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
            </svg>
        </div>
    </div>
);

// Компонент детального экрана приватности
const PrivacyDetail: React.FC<{
    title: string;
    field: string;
    value: string;
    description: string;
    onBack: () => void;
    onSave: (field: string, value: string) => void;
}> = ({ title, field, value, description, onBack, onSave }) => {
    const [selected, setSelected] = useState(value);

    const handleSave = () => {
        onSave(field, selected);
        onBack();
    };

    return (
        <div className="animate-fade-slide-up space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="text-text-secondary hover:text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            </div>
            <p className="text-sm text-text-secondary">{description}</p>
            <div className="space-y-2">
                {privacyOptions.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setSelected(opt.value)}
                        className={`w-full flex items-center gap-3 py-2 px-3 rounded hover:bg-bg-tertiary transition ${selected === opt.value ? 'text-accent-lime' : 'text-text-primary'
                            }`}
                    >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === opt.value ? 'border-accent-lime' : 'border-text-secondary'
                            }`}>
                            {selected === opt.value && (
                                <div className="w-3 h-3 rounded-full bg-accent-lime" />
                            )}
                        </div>
                        <span className="text-sm">{opt.label}</span>
                    </button>
                ))}
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-sm bg-bg-tertiary text-text-primary rounded hover:bg-bg-secondary transition"
                >
                    Отмена
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm bg-accent-lime text-black rounded hover:bg-accent-yellow transition"
                >
                    Сохранить
                </button>
            </div>
        </div>
    );
};

// Мини-меню "Редактирование имени"
const EditNameModal: React.FC<{
    initialName: string;
    initialSurname: string;
    onSave: (name: string, surname: string) => void;
    onClose: () => void;
}> = ({ initialName, initialSurname, onSave, onClose }) => {
    const [name, setName] = useState(initialName);
    const [surname, setSurname] = useState(initialSurname);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const surnameInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        onSave(name, surname);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-bg-primary border border-border rounded-lg w-[90%] max-w-sm p-6 shadow-xl animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-text-primary mb-4">Редактирование имени</h3>
                <div className="space-y-4">
                    {/* Поле Имя */}
                    <div className="relative">
                        <label className="absolute -top-2 left-3 bg-bg-primary px-1 text-xs text-text-secondary transition-all">
                            Имя
                        </label>
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={30}
                            className="w-full p-3 rounded bg-bg-tertiary border border-border text-text-primary focus:border-accent-lime focus:outline-none"
                            onFocus={() => nameInputRef.current?.previousElementSibling?.classList.add('text-accent-lime')}
                            onBlur={() => nameInputRef.current?.previousElementSibling?.classList.remove('text-accent-lime')}
                        />
                    </div>
                    {/* Поле Фамилия */}
                    <div className="relative">
                        <label className="absolute -top-2 left-3 bg-bg-primary px-1 text-xs text-text-secondary transition-all">
                            Фамилия
                        </label>
                        <input
                            ref={surnameInputRef}
                            type="text"
                            value={surname}
                            onChange={e => setSurname(e.target.value)}
                            maxLength={30}
                            className="w-full p-3 rounded bg-bg-tertiary border border-border text-text-primary focus:border-accent-lime focus:outline-none"
                            onFocus={() => surnameInputRef.current?.previousElementSibling?.classList.add('text-accent-lime')}
                            onBlur={() => surnameInputRef.current?.previousElementSibling?.classList.remove('text-accent-lime')}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-bg-tertiary text-text-primary rounded hover:bg-bg-secondary transition"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm bg-accent-lime text-black rounded hover:bg-accent-yellow transition"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

// Мини-меню "Имя пользователя"
const EditUsernameModal: React.FC<{
    initialUsername: string;
    onSave: (username: string) => void;
    onClose: () => void;
}> = ({ initialUsername, onSave, onClose }) => {
    const [username, setUsername] = useState(initialUsername);
    const [status, setStatus] = useState<'idle' | 'available' | 'taken'>('idle');
    const [validationError, setValidationError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Проверка username
    const checkUsername = useCallback(async (val: string) => {
        // Если поле пустое – не показываем статус
        if (val.length === 0) {
            setStatus('idle');
            setValidationError(null);
            return;
        }

        // Если совпадает с исходным – сразу "доступно"
        if (val === initialUsername) {
            setStatus('available');
            setValidationError(null);
            return;
        }

        // Проверка минимальной длины (для непустого поля)
        if (val.length > 0 && val.length < 5) {
            setValidationError('Слишком короткое имя пользователя');
            setStatus('idle');
            return;
        }

        // Проверка символов и позиционирования подчёркивания
        const startsOrEndsWithUnderscore = val.startsWith('_') || val.endsWith('_');
        const hasDoubleUnderscore = val.includes('__');
        const hasInvalidChars = !/^[a-zA-Z0-9_]+$/.test(val);

        if (startsOrEndsWithUnderscore || hasDoubleUnderscore || hasInvalidChars) {
            setValidationError('Некорректное имя пользователя');
            setStatus('idle');
            return;
        }

        setValidationError(null);

        // Запрос на сервер
        try {
            const res = await userApi.checkUsername(val);
            setStatus(res.data.available ? 'available' : 'taken');
        } catch (err) {
            setStatus('idle');
        }
    }, [initialUsername]);

    // Дебаунс (500 мс)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (username.length === 0) {
            setStatus('idle');
            setValidationError(null);
            return;
        }
        debounceRef.current = setTimeout(() => checkUsername(username), 500);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [username, checkUsername]);

    const handleSave = () => {
        if (!validationError && status !== 'taken' && username.length >= 5) {
            onSave(username);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-bg-primary border border-border rounded-lg w-[90%] max-w-sm p-6 shadow-xl animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-text-primary mb-1">Имя пользователя</h3>
                <p className="text-xs text-text-secondary mb-4">
                    Вы можете выбрать публичное имя пользователя. Другие пользователи смогут найти Вас по такому имени и связаться.
                </p>
                <div className="relative">
                    <label className="absolute -top-2 left-3 bg-bg-primary px-1 text-xs text-text-secondary transition-all">
                        @username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        maxLength={32}
                        className="w-full p-3 rounded bg-bg-tertiary border border-border text-text-primary focus:border-accent-lime focus:outline-none"
                    />
                </div>

                {/* Статус доступности */}
                {status !== 'idle' && (
                    <div
                        className={`mt-2 text-sm transition-all duration-300 ${status === 'available' ? 'text-accent-lime' : 'text-red-500'
                            }`}
                    >
                        {status === 'available'
                            ? 'Это имя пользователя доступно.'
                            : 'Это имя пользователя уже занято.'}
                    </div>
                )}
                {validationError && (
                    <div className="mt-2 text-sm text-red-500">{validationError}</div>
                )}

                <p className="text-xs text-text-secondary mt-3">
                    Можно использовать символы <b>a-z, 0-9 и _</b>. Минимальная длина ссылки — <b>5 символов</b>.
                </p>
                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-bg-tertiary text-text-primary rounded hover:bg-bg-secondary transition"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={status === 'taken' || !!validationError || username.length < 5}
                        className="px-4 py-2 text-sm bg-accent-lime text-black rounded hover:bg-accent-yellow transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

const AccountDetail: React.FC<{
    profile: any;
    onBack: () => void;
    onEditName: () => void;
    onEditUsername: () => void;
}> = ({ profile, onBack, onEditName, onEditUsername }) => {
    const [bio, setBio] = useState(profile?.bio || '');
    const [isOnline] = useState(navigator.onLine);

    const queryClient = useQueryClient();
    const updateProfileMutation = useMutation({
        mutationFn: (data: any) => userApi.updateMe(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        },
    });

    const handleSaveBio = () => {
        updateProfileMutation.mutate({ bio });
    };

    // Формируем отображаемое имя: Имя + Фамилия, если есть
    const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.username;
    const statusText = isOnline
        ? 'в сети'
        : (profile?.lastSeen ? getLastSeenStatus(profile.lastSeen) : 'был(а) недавно');

    return (
        <div className="overflow-hidden">
            <div className="animate-slide-in-right-subtle p-4 space-y-6">
                {/* Шапка с кнопкой назад и заголовком */}
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-text-secondary hover:text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h3 className="text-lg font-semibold text-text-primary">Информация</h3>
                </div>

                {/* Аватар */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-bg-tertiary flex items-center justify-center text-white text-2xl font-semibold">
                        {(profile?.firstName || profile?.username || '?')[0].toUpperCase()}
                    </div>
                </div>

                {/* Имя и статус */}
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-text-primary">
                        {displayName}
                    </h2>
                    <p className={`text-sm ${isOnline ? 'text-accent-lime' : 'text-text-secondary'}`}>
                        {statusText}
                    </p>
                </div>

                {/* Строки для перехода к редактированию */}
                <div className="divide-y divide-border">
                    <MenuRow
                        label="Имя"
                        value={displayName || profile?.username}
                        onClick={onEditName}
                    />
                    <MenuRow
                        label="Имя пользователя"
                        value={`@${profile?.username}`}
                        onClick={onEditUsername}
                    />
                </div>

                {/* Блок "О себе" */}
                <div>
                    <label className="text-sm text-text-secondary mb-1 block">О себе</label>
                    <div className="relative">
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            maxLength={150}
                            rows={2}
                            placeholder="Любые подробности, например: возраст, род занятий или город."
                            className="w-full p-3 rounded bg-bg-tertiary border border-border text-text-primary focus:border-accent-lime focus:outline-none placeholder-text-secondary resize-none"
                        />
                        <span className="absolute bottom-2 right-3 text-xs text-text-secondary">
                            {bio.length}/150
                        </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                        Пример: 52 года, танкист из Стерлитамака.
                    </p>
                    <div className="w-full flex justify-end">
                        <button
                            onClick={handleSaveBio}
                            disabled={updateProfileMutation.isPending}
                            className="mt-2 px-4 py-2 bg-accent-lime text-black rounded text-sm hover:bg-accent-yellow transition"
                        >
                            {updateProfileMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

    );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [privacyDetailField, setPrivacyDetailField] = useState<string | null>(null);
    const [showEditName, setShowEditName] = useState(false);
    const [showEditUsername, setShowEditUsername] = useState(false);
    const [showAccountDetail, setShowAccountDetail] = useState(false);
    const [copyNotification, setCopyNotification] = useState(false);

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['userProfile', user?.id],
        queryFn: () => userApi.getMe().then(res => res.data),
        enabled: !!user,
    });

    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['userSettings', user?.id],
        queryFn: () => userApi.getSettings().then(res => res.data),
        enabled: !!user,
    });

    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [bio, setBio] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        if (profile) {
            setName(profile.firstName || profile.username);
            setSurname(profile.lastName || '');
            setUsername(profile.username);
            setBio(profile.bio || '');
        }
    }, [profile]);

    const updateProfileMutation = useMutation({
        mutationFn: (data: any) => userApi.updateMe(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
        },
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (data: any) => userApi.updateSettings(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userSettings', user?.id] });
        },
    });

    const handleSaveProfile = (firstName: string, lastName: string) => {
        updateProfileMutation.mutate({ firstName, lastName });
    };

    const handleSaveUsername = (newUsername: string) => {
        updateProfileMutation.mutate({ username: newUsername });
    };

    const handleSaveBio = () => {
        updateProfileMutation.mutate({ bio });
    };

    const handlePrivacySave = (field: string, value: string) => {
        if (!settings) return;
        const newPrivacy = { ...settings.privacy, [field]: value };
        updateSettingsMutation.mutate({ privacy: newPrivacy });
    };

    // Копирование ссылки на профиль
    const handleCopyUsername = useCallback(() => {
        if (!profile?.username) return;
        const link = `https://t.me/${profile.username}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopyNotification(true);
            setTimeout(() => setCopyNotification(false), 2000);
        });
    }, [profile]);

    // Esc – закрытие меню с учётом вложенности
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            if (showEditName || showEditUsername) {
                setShowEditName(false);
                setShowEditUsername(false);
            } else if (privacyDetailField) {
                setPrivacyDetailField(null);
            } else if (showAccountDetail) {
                setShowAccountDetail(false);
            } else {
                onClose();
            }
        }
    }, [showEditName, showEditUsername, privacyDetailField, showAccountDetail, onClose]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown, { capture: true });
            return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
        }
    }, [isOpen, handleKeyDown]);

    // Сброс при закрытии
    useEffect(() => {
        if (!isOpen) {
            setPrivacyDetailField(null);
            setShowEditName(false);
            setShowEditUsername(false);
            setShowAccountDetail(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const privacyValue = settings?.privacy?.[privacyDetailField || ''] || 'everyone';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-bg-primary border border-border rounded-lg w-[90%] max-w-lg max-h-[80vh] flex flex-col shadow-xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Заголовок */}
                {!showAccountDetail && (
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-text-primary">Настройки</h2>
                        <button onClick={onClose} className="text-text-secondary hover:text-white transition">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Профиль (аватарка + имя + @username) */}
                {!privacyDetailField && !showEditName && !showEditUsername && !showAccountDetail && (
                    <div className="p-4 border-b border-border flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-bg-tertiary flex items-center justify-center text-white font-semibold text-xl">
                            {(profile?.firstName || profile?.username || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-text-primary truncate">
                                {profile?.firstName || profile?.username}
                            </div>
                            <div
                                onClick={handleCopyUsername}
                                className="text-xs text-text-secondary hover:underline cursor-pointer truncate"
                            >
                                @{profile?.username}
                            </div>
                        </div>
                        {copyNotification && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded transition-opacity">
                                Ссылка скопирована
                            </div>
                        )}
                    </div>
                )}

                {/* Содержимое */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {profileLoading || settingsLoading ? (
                        <div className="text-center text-text-secondary p-4">Загрузка...</div>
                    ) : showEditName || showEditUsername ? (
                        null
                    ) : showAccountDetail ? (
                        <AccountDetail
                            profile={profile}
                            onBack={() => setShowAccountDetail(false)}
                            onEditName={() => setShowEditName(true)}
                            onEditUsername={() => setShowEditUsername(true)}
                        />
                    ) : privacyDetailField ? (
                        <div className="p-4">
                            <PrivacyDetail
                                title={privacyDescriptions[privacyDetailField] || privacyDetailField}
                                field={privacyDetailField}
                                value={privacyValue}
                                description={`Выберите, ${privacyDescriptions[privacyDetailField]?.toLowerCase()}`}
                                onBack={() => setPrivacyDetailField(null)}
                                onSave={handlePrivacySave}
                            />
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {/* Мой аккаунт */}
                            <MenuRow
                                label="Мой аккаунт"
                                onClick={() => setShowAccountDetail(true)}
                            />

                            {/* Конфиденциальность */}
                            <div className="py-2 px-4 text-xs text-text-secondary font-medium">Конфиденциальность</div>
                            <MenuRow
                                label="Время захода"
                                value={privacyOptions.find(o => o.value === (settings?.privacy?.lastSeen || 'everyone'))?.label}
                                onClick={() => setPrivacyDetailField('lastSeen')}
                            />
                            <MenuRow
                                label="Фотографии профиля"
                                value={privacyOptions.find(o => o.value === (settings?.privacy?.profilePhoto || 'everyone'))?.label}
                                onClick={() => setPrivacyDetailField('profilePhoto')}
                            />
                            <MenuRow
                                label="Пересылка сообщений"
                                value={privacyOptions.find(o => o.value === (settings?.privacy?.forwardMessages || 'everyone'))?.label}
                                onClick={() => setPrivacyDetailField('forwardMessages')}
                            />
                            <MenuRow
                                label="Сообщения"
                                value={privacyOptions.find(o => o.value === (settings?.privacy?.messages || 'everyone'))?.label}
                                onClick={() => setPrivacyDetailField('messages')}
                            />
                            <MenuRow
                                label="О себе"
                                value={privacyOptions.find(o => o.value === (settings?.privacy?.bio || 'everyone'))?.label}
                                onClick={() => setPrivacyDetailField('bio')}
                            />
                            <MenuRow
                                label="Сохранённая музыка"
                                value={privacyOptions.find(o => o.value === (settings?.privacy?.favoriteMusic || 'everyone'))?.label}
                                onClick={() => setPrivacyDetailField('favoriteMusic')}
                            />
                            <MenuRow
                                label="Группы и каналы"
                                value={privacyOptions.find(o => o.value === (settings?.privacy?.invites || 'everyone'))?.label}
                                onClick={() => setPrivacyDetailField('invites')}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Мини-модалки */}
            {showEditName && (
                <EditNameModal
                    initialName={name}
                    initialSurname={surname}
                    onSave={(firstName, lastName) => {
                        setName(firstName);
                        setSurname(lastName);
                        handleSaveProfile(firstName, lastName);
                    }}
                    onClose={() => setShowEditName(false)}
                />
            )}
            {showEditUsername && (
                <EditUsernameModal
                    initialUsername={username}
                    onSave={handleSaveUsername}
                    onClose={() => setShowEditUsername(false)}
                />
            )}
        </div>
    );
};

export default SettingsModal;