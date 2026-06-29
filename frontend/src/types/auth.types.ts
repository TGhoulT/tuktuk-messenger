export interface User {
    id: string;
    email: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
}

export interface LoginCredentials {
    emailOrUsername: string;
    password: string;
    sessionLifetimeDays?: number;
}

export interface RegisterData {
    email: string;
    username: string;
    password: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
}