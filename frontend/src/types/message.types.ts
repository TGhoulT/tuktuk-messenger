export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
    id: string;
    clientMessageId?: string;
    chatId: string;
    sender?: {
        id: string;
        username: string;
    };
    type: 'text' | 'file' | 'media' | 'voice' | 'sticker' | 'forward';
    text: string | null;
    file: {
        id: string;
        url: string;
        mimeType: string;
    } | null;
    mediaGroupId: string | null;
    isMediaGroup: boolean;
    forwardInfo: {
        fromUserId: string;
        fromUsername: string;
        fromChatId: string;
        hideSender?: boolean;
        hideCaption?: boolean;
    } | null;
    reactions: Record<string, number>;
    createdAt: string;
    updatedAt: string;
    status: MessageStatus;
}