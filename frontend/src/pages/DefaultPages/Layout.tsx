import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { translations } from '../../utils/translations';
import { AuthModal } from '../../components/AuthModal';
import { Footer } from '../../components/Footer';

const Layout = () => {
    const { language, toggleLanguage, phase } = useGameStore();
    const { user, profile, signOut } = useAuthStore();
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    const t = translations[language];
    const isBattleActive = phase === 'BATTLE' || phase === 'RESULT';

    return (
        <div className="min-h-[100dvh] flex flex-col bg-slate-900 text-white">
            {!isBattleActive && (
                <nav className="h-16 z-[100] flex-none p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <Link
                        to="/"
                        className="font-black tracking-tighter text-xl uppercase italic text-blue-500 hover:text-blue-400 transition-colors"
                    >
                        {t.title}
                    </Link>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleLanguage}
                            className="px-3 py-1 border border-slate-500 rounded hover:bg-slate-700 transition-colors text-sm font-bold"
                        >
                            {language === 'ru' ? '🇷🇺 RU' : '🇬🇧 EN'}
                        </button>

                        {user ? (
                            <div className="flex items-center gap-6">
                                <Link
                                    to="/profile"
                                    className="text-xs font-bold text-slate-300 hover:text-blue-400 transition-colors"
                                >
                                    {profile?.username}
                                </Link>
                                <button
                                    onClick={signOut}
                                    className="text-[11px] text-slate-400 hover:text-white font-bold uppercase transition-colors"
                                >
                                    {language === 'ru' ? 'Выйти' : 'Log Out'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAuthOpen(true)}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                {language === 'ru' ? 'Вход' : 'Login'}
                            </button>
                        )}
                    </div>
                </nav>
            )}

            <main className="flex-1 relative">
                <Outlet />
            </main>

            <Footer />

            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </div>
    );
};

export default Layout;