export interface Chat {
    id: string;
    type: 'dialog' | 'group' | 'channel' | 'saved' | 'system';
    title: string | null;
    avatarUrl: string | null;
    displayTitle?: string | null;
    isDialog?: boolean;
    participants: ChatParticipant[];
    lastMessage?: {
        id: string;
        type: string;
        text?: string | null;
        createdAt: string;
    } | null;
    unreadCount?: number;
    createdAt: string;
    updatedAt: string;
    lastActivityAt?: string | null;
    lastSeenDisplay?: string | null;
}

export interface ChatParticipant {
    id: string;
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'subscriber';
    status: 'pending' | 'accepted' | 'rejected';
    user?: {
        id: string;
        username: string;
        avatarUrl: string | null;
    };
}