import { useGameStore } from '../store/useGameStore';
import { translations } from '../utils/translations';

interface TurnOverlayProps {
    nextPlayer: string;
    onContinue: () => void;
}

export const TurnOverlay = ({ nextPlayer, onContinue }: TurnOverlayProps) => {
    const { language } = useGameStore();
    const t = translations[language];

    return (
        <div className="fixed inset-0 bg-slate-900 z-[200] flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-8">
                <h2 className="text-5xl font-black text-white tracking-tighter animate-pulse">
                    {t.passDevice}
                </h2>

                <div className="space-y-2">
                    <p className="text-blue-400 font-bold uppercase tracking-widest text-sm">
                        {language === 'en' ? 'UP NEXT' : 'СЛЕДУЮЩИЙ'}
                    </p>
                    <p className="text-6xl font-black text-white uppercase">
                        {nextPlayer}
                    </p>
                </div>

                <button
                    onClick={onContinue}
                    className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-xl transition-all transform hover:scale-105 active:scale-95 shadow-xl"
                >
                    {t.continue}
                </button>
            </div>
        </div>
    );
};