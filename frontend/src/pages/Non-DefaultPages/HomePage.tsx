import { useGameStore } from '../../store/useGameStore';
import { SetupPage } from '../Non-DefaultPages/SetupPage';
import { BattlePage } from '../Non-DefaultPages/BattlePage';
import { translations } from '../../utils/translations';

const HomePage = () => {
    const { phase, setMode, setPhase, setBotDifficulty, language } = useGameStore();
    const t = translations[language];

    if (phase === 'START_MENU') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] bg-slate-950 gap-6 p-4">
                <h1 className="text-4xl font-bold text-white">{t.homePageHeading}</h1>
                <div className="flex flex-col gap-3 w-full max-w-md">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest text-center">
                        {t.vsComputer}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => { setMode('BOT'); setBotDifficulty('easy'); setPhase('PLACING'); }}
                            className="px-4 py-3 bg-green-900 hover:bg-green-700 text-white font-bold rounded-lg transition-all"
                        >
                            {t.easy}
                        </button>
                        <button
                            onClick={() => { setMode('BOT'); setBotDifficulty('medium'); setPhase('PLACING'); }}
                            className="px-4 py-3 bg-yellow-900 hover:bg-yellow-700 text-white font-bold rounded-lg transition-all"
                        >
                            {t.medium}
                        </button>
                        <button
                            onClick={() => { setMode('BOT'); setBotDifficulty('hard'); setPhase('PLACING'); }}
                            className="px-4 py-3 bg-red-900 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
                        >
                            {t.hard}
                        </button>
                    </div>
                    <button
                        onClick={() => { setMode('MULTIPLAYER'); setPhase('PLACING'); }}
                        className="px-8 py-4 border border-slate-700 text-white font-bold rounded-lg hover:bg-slate-800 transition-all mt-2"
                    >
                        {t.localPvP}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {phase === 'PLACING' && <SetupPage />}
            {(phase === 'BATTLE' || phase === 'RESULT') && <BattlePage />}
        </>
    );
};

export default HomePage;