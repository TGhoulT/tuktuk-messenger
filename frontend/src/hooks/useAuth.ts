import { authStore } from '../stores/authStore';

export const useAuth = () => {
    const user = authStore((state) => state.user);
    const accessToken = authStore((state) => state.accessToken);
    const sessionId = authStore((state) => state.sessionId);
    const logout = authStore((state) => state.logout);
    const setTokens = authStore((state) => state.setTokens);
    const setUser = authStore((state) => state.setUser);
    return { user, accessToken, sessionId, logout, setTokens, setUser };
};