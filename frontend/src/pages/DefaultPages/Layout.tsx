import { Outlet } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../utils/translations';

const Layout = () => {
    const { language, toggleLanguage, phase } = useGameStore();
    const t = translations[language];

    const isBattleActive = phase === 'BATTLE' || phase === 'RESULT';

    return (
        <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
            {!isBattleActive && (
                <nav className="h-16 flex-none p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                    <span className="font-black tracking-tighter text-xl">{t.title}</span>
                    <button
                        onClick={toggleLanguage}
                        className="px-3 py-1 border gap-x-2 border-slate-500 rounded hover:bg-slate-700 transition-colors text-sm font-bold"
                    >
                        {language === 'ru' ? (<>🇷🇺&nbsp;RU</>) : (<>🇬🇧&nbsp;EN</>)}
                    </button>
                </nav>
            )}
            <main className="flex-1 relative overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;