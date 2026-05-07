import { useGameStore } from '../../store/useGameStore';
import { SetupPage } from '../Non-DefaultPages/SetupPage';
import { BattlePage } from '../Non-DefaultPages/BattlePage';

const HomePage = () => {
    const { phase, setMode, setPhase } = useGameStore();

    if (phase === 'START_MENU') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] bg-slate-950 gap-6 p-4">
                <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Battleship</h1>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none sm:w-auto">
                    <button
                        onClick={() => { setMode('BOT'); setPhase('PLACING'); }}
                        className="px-8 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-all"
                    >
                        Vs Computer
                    </button>
                    <button
                        onClick={() => { setMode('MULTIPLAYER'); setPhase('PLACING'); }}
                        className="px-8 py-4 border border-slate-700 text-white font-bold rounded-lg hover:bg-slate-800 transition-all"
                    >
                        Local PvP
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