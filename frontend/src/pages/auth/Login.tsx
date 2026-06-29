import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi } from '../../api/auth';
import { authStore } from '../../stores/authStore';

interface LoginForm {
    identifier: string;
    password: string;
}

export const Login = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const setTokens = authStore((state) => state.setTokens);
    const setUser = authStore((state) => state.setUser);

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        try {
            const res = await authApi.login({ emailOrUsername: data.identifier, password: data.password });
            setTokens(res.data.accessToken, res.data.refreshToken, res.data.sessionId);
            setUser(res.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Неверный логин или пароль');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-primary">
            <div className="bg-secondary p-8 rounded-2xl w-full max-w-md border border-border">
                <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-[#D4F03B] to-[#FFEA00] bg-clip-text text-transparent">
                    Тук-Тук
                </h1>
                <p className="text-center text-gray-400 mb-6">Вход в аккаунт</p>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Email или Username"
                            {...register('identifier', { required: 'Введите email или username' })}
                            className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border text-text-primary focus:outline-none focus:border-[#D4F03B] transition"
                        />
                        {errors.identifier && <p className="text-red-500 text-sm mt-1">{errors.identifier.message}</p>}
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Пароль"
                            {...register('password', { required: 'Введите пароль' })}
                            className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border text-text-primary focus:outline-none focus:border-[#D4F03B] transition"
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                    </div>
                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-[#D4F03B] to-[#FFEA00] text-black font-semibold rounded-xl hover:opacity-90 transition"
                    >
                        {isLoading ? 'Загрузка...' : 'Войти'}
                    </button>
                    <p className="text-center text-gray-400 text-sm">
                        Нет аккаунта? <a href="/register" className="text-[#D4F03B] hover:underline">Зарегистрироваться</a>
                    </p>
                </form>
            </div>
        </div>
    );
};