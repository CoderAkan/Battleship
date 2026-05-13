import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';
import { toast } from 'react-toastify';
import { CountryPicker } from './CountryPicker';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [country, setCountry] = useState<string>('KZ');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { setUser, fetchProfile } = useAuthStore();
    const { language, toggleLanguage } = useGameStore();

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username: username, country } },
                });
                if (signUpError) throw signUpError;

                if (data.user) {
                    setUser(data.user);
                    await fetchProfile(data.user.id);
                    toast.success(language === 'ru' ? 'Проверьте почту!' : 'Check your email!');
                }
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                if (data.user) await fetchProfile(data.user.id);
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-lg p-6 shadow-2xl">

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                        {isSignUp
                            ? (language === 'ru' ? 'Регистрация' : 'Registration')
                            : (language === 'ru' ? 'Вход' : 'Login')}
                    </h2>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={toggleLanguage}
                            className="text-xs font-bold px-2 py-1 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-white transition-colors"
                        >
                            {language === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
                        </button>
                        <button onClick={onClose} className="text-slate-500 hover:text-white text-lg ml-2">✕</button>
                    </div>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <>
                            <input
                                type="text" required
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500 transition-all"
                                placeholder={language === 'ru' ? 'Имя пользователя' : 'Username'}
                                value={username} onChange={(e) => setUsername(e.target.value)}
                            />

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    {language === 'ru' ? 'Страна' : 'Country'}
                                </label>
                                <CountryPicker
                                    value={country}
                                    onChange={setCountry}
                                />
                            </div>
                        </>
                    )}

                    <input
                        type="email" required
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500 transition-all"
                        placeholder="Email"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        type="password" required
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500 transition-all"
                        placeholder={language === 'ru' ? 'Пароль' : 'Password'}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && (
                        <p className="text-red-500 text-xs mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded uppercase transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading
                            ? '...'
                            : isSignUp
                                ? (language === 'ru' ? 'Зарегистрироваться' : 'Sign Up')
                                : (language === 'ru' ? 'Войти' : 'Login')}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="w-full mt-6 text-slate-400 hover:text-blue-400 text-xs font-medium transition-colors"
                >
                    {isSignUp
                        ? (language === 'ru' ? 'Уже есть аккаунт? Войти' : 'Have an account? Login')
                        : (language === 'ru' ? 'Нет аккаунта? Регистрация' : 'No account? Sign Up')}
                </button>
            </div>
        </div>
    );
};