import { Link } from "react-router-dom";
import { useGameStore } from "../../store/useGameStore";
import { translations } from "../../utils/translations";

export default function ErrorPage() {
    const { language, toggleLanguage } = useGameStore();
    const t = translations[language];

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center relative overflow-hidden">

            <div className="absolute top-4 right-4">
                <button
                    onClick={toggleLanguage}
                    className="px-3 py-1 border border-slate-500 rounded hover:bg-slate-700 transition-colors text-sm font-bold flex items-center gap-x-2"
                >
                    <span>{language === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                    <span>{language === 'ru' ? 'RU' : 'EN'}</span>
                </button>
            </div>

            <div className="max-w-3xl space-y-2">
                <h1 className="text-7xl font-black text-red-600 tracking-tighter drop-shadow-[0_0_20px_rgba(220,38,38,0.3)] leading-none">
                    404
                </h1>

                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight pb-4">
                    {language === 'en' ? 'LOST AT SEA' : 'ПОТЕРЯН В МОРЕ'}
                </h2>

                <p className="text-lg md:text-xl font-medium text-slate-400 max-w-md mx-auto">
                    {t.errorMessage}
                </p>

                <div className="pt-10">
                    <Link
                        to="/"
                        className="px-12 py-4 bg-white text-black hover:bg-blue-500 hover:text-white rounded-full font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-2xl"
                    >
                        {t.returnHome}
                    </Link>
                </div>
            </div>
        </div>
    );
}