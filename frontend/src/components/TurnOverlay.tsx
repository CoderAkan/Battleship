import { useGameStore } from '../store/useGameStore';
import { translations } from '../utils/translations';

interface TurnOverlayProps {
    nextPlayer: string;
    onContinue: () => void;
}

export const TurnOverlay = ({ nextPlayer, onContinue }: TurnOverlayProps) => {
    const { language, toggleLanguage } = useGameStore();
    const t = translations[language];

    return (
        <div className="fixed inset-0 bg-slate-900 z-[200] flex flex-col items-center justify-center p-4 text-center">

            <div className="absolute top-4 right-4">
                <button
                    onClick={toggleLanguage}
                    className="px-3 py-1 border border-slate-500 rounded hover:bg-slate-700 transition-colors text-sm font-bold flex items-center gap-x-2 text-white"
                >
                    <span>{language === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                    <span>{language === 'ru' ? 'RU' : 'EN'}</span>
                </button>
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter animate-pulse mb-8">
                {t.passDevice}
            </h2>

            <div className="mb-12">
                <p className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-2">
                    {language === 'en' ? 'UP NEXT' : 'СЛЕДУЮЩИЙ'}
                </p>
                <p className="text-6xl font-black text-white uppercase">
                    {nextPlayer}
                </p>
            </div>

            <button
                onClick={onContinue}
                className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-xl transition-all transform active:scale-95 shadow-xl"
            >
                {t.continue}
            </button>
        </div>
    );
};