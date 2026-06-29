import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../../api/user';
import { useAuth } from '../../hooks/useAuth';

const PrivacyRow: React.FC<{
    title: string;
    field: string;
    value: string;
    onChange: (field: string, value: string) => void;
}> = ({ title, field, value, onChange }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm">{title}</span>
        <select
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            className="bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-white"
        >
            <option value="everyone">Все</option>
            <option value="contacts">Мои контакты</option>
            <option value="nobody">Никто</option>
        </select>
    </div>
);

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<'account' | 'privacy'>('account');

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
    const [bio, setBio] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        if (profile) {
            setName(profile.username);
            setBio(profile.bio || '');
            setUsername(profile.username);
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

    const handleSaveProfile = () => {
        updateProfileMutation.mutate({ username, bio });
    };

    const handlePrivacyChange = (field: string, value: string) => {
        if (!settings) return;
        const newPrivacy = { ...settings.privacy, [field]: value };
        updateSettingsMutation.mutate({ privacy: newPrivacy });
    };

    if (profileLoading || settingsLoading) return <div className="p-4 text-white">Загрузка...</div>;

    return (
        <div className="flex flex-col h-full bg-bg-primary text-white">
            <div className="h-14 px-4 border-b border-border flex items-center">
                <button onClick={() => window.history.back()} className="mr-4 text-accent-lime">←</button>
                <h2 className="text-lg font-semibold">Настройки</h2>
            </div>
            <div className="flex border-b border-border">
                <button
                    onClick={() => setTab('account')}
                    className={`flex-1 py-3 text-center ${tab === 'account' ? 'border-b-2 border-accent-lime text-accent-lime' : 'text-text-secondary'}`}
                >
                    Мой аккаунт
                </button>
                <button
                    onClick={() => setTab('privacy')}
                    className={`flex-1 py-3 text-center ${tab === 'privacy' ? 'border-b-2 border-accent-lime text-accent-lime' : 'text-text-secondary'}`}
                >
                    Конфиденциальность
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {tab === 'account' && profile && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm text-text-secondary">Имя</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                maxLength={30}
                                className="w-full mt-1 p-2 rounded bg-bg-secondary border border-border text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-text-secondary">Имя пользователя</label>
                            <div className="flex items-center mt-1">
                                <span className="text-text-secondary">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    maxLength={32}
                                    className="flex-1 p-2 rounded bg-bg-secondary border border-border text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-text-secondary">О себе</label>
                            <textarea
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                maxLength={150}
                                rows={3}
                                className="w-full mt-1 p-2 rounded bg-bg-secondary border border-border text-white"
                            />
                            <p className="text-xs text-text-secondary mt-1">{bio.length}/150</p>
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={updateProfileMutation.isLoading}
                            className="w-full py-2 bg-accent-lime text-black rounded font-semibold hover:bg-accent-yellow transition"
                        >
                            {updateProfileMutation.isLoading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                )}

                {tab === 'privacy' && settings && (
                    <div className="space-y-4">
                        <PrivacyRow title="Время захода" field="lastSeen" value={settings.privacy?.lastSeen || 'everyone'} onChange={handlePrivacyChange} />
                        <PrivacyRow title="Фотографии профиля" field="profilePhoto" value={settings.privacy?.profilePhoto || 'everyone'} onChange={handlePrivacyChange} />
                        <PrivacyRow title="Пересылка сообщений" field="forwardMessages" value={settings.privacy?.forwardMessages || 'everyone'} onChange={handlePrivacyChange} />
                        <PrivacyRow title="Сообщения" field="messages" value={settings.privacy?.messages || 'everyone'} onChange={handlePrivacyChange} />
                        <PrivacyRow title="О себе" field="bio" value={settings.privacy?.bio || 'everyone'} onChange={handlePrivacyChange} />
                        <PrivacyRow title="Сохранённая музыка" field="favoriteMusic" value={settings.privacy?.favoriteMusic || 'everyone'} onChange={handlePrivacyChange} />
                        <PrivacyRow title="Группы и каналы" field="invites" value={settings.privacy?.invites || 'everyone'} onChange={handlePrivacyChange} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;