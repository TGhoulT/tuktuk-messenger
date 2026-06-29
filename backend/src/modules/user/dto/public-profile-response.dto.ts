export class PublicProfileResponseDto {
    id: string;
    username: string;
    avatarUrl?: string | null;
    lastSeen?: Date | string | null;
    bio?: string | null;
}