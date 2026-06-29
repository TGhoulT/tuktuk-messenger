import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi } from '../../api/auth';

interface RegisterForm {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
}

export const Register = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (data: RegisterForm) => {
        if (data.password !== data.confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }
        setIsLoading(true);
        try {
            await authApi.register({ email: data.email, username: data.username, password: data.password });
            navigate('/login');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            if (msg?.includes('already exists')) {
                setError('Пользователь с таким email или username уже существует');
            } else if (msg?.includes('password')) {
                setError('Пароль слишком простой (минимум 6 символов)');
            } else if (msg?.includes('email')) {
                setError('Некорректный email');
            } else {
                setError('Ошибка регистрации. Попробуйте позже.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-primary">
            <div className="bg-secondary p-8 rounded-2xl w-full max-w-md border border-border">
                <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-[#D4F03B] to-[#FFEA00] bg-clip-text text-transparent">
                    Тук-Тук
                </h1>
                <p className="text-center text-gray-400 mb-6">Регистрация</p>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            {...register('email', { required: 'Email обязателен' })}
                            className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border text-text-primary focus:outline-none focus:border-[--accent-lime] transition"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Username"
                            {...register('username', { required: 'Username обязателен', minLength: { value: 3, message: 'Минимум 3 символа' } })}
                            className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border text-text-primary focus:outline-none focus:border-[--accent-lime] transition"
                        />
                        {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Пароль"
                            {...register('password', { required: 'Пароль обязателен', minLength: { value: 6, message: 'Минимум 6 символов' } })}
                            className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border text-text-primary focus:outline-none focus:border-[--accent-lime] transition"
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Подтверждение пароля"
                            {...register('confirmPassword', { required: 'Подтвердите пароль' })}
                            className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border text-text-primary focus:outline-none focus:border-[--accent-lime] transition"
                        />
                        {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
                    </div>
                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-[#D4F03B] to-[#FFEA00] text-black font-semibold rounded-xl hover:opacity-90 transition"
                    >
                        {isLoading ? 'Загрузка...' : 'Зарегистрироваться'}
                    </button>
                    <p className="text-center text-gray-400 text-sm">
                        Уже есть аккаунт? <a href="/login" className="text-[#D4F03B] hover:underline">Войти</a>
                    </p>
                </form>
            </div>
        </div>
    );
};