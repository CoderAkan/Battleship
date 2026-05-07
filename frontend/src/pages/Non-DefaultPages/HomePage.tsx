import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SetupPage } from '../Non-DefaultPages/SetupPage';
import { BattlePage } from '../Non-DefaultPages/BattlePage';
import { AuthModal } from '../../components/AuthModal';
import { translations } from '../../utils/translations';

const HomePage = () => {
    const { phase, setMode, setPhase, setBotDifficulty, language } = useGameStore();
    const { user } = useAuthStore();
    const t = translations[language];
    const navigate = useNavigate();

    const [authOpen, setAuthOpen] = useState(false);

    const handleOnlineClick = () => {
        if (!user) {
            // Not logged in — open the AuthModal. After successful auth the
            // user can click Online again.
            setAuthOpen(true);
            return;
        }
        navigate('/online');
    };

    if (phase === 'START_MENU') {
        return (
            <>
                <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] bg-slate-950 gap-8 p-4">
                    <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase">
                        {t.title}
                    </h1>

                    <div className="flex flex-col gap-4 w-full max-w-md">
                        {/* Vs Computer — three difficulty buttons */}
                        <div className="flex flex-col gap-2">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center">
                                {t.vsComputer}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        setMode('BOT');
                                        setBotDifficulty('easy');
                                        setPhase('PLACING');
                                    }}
                                    className="px-4 py-3 bg-green-900 hover:bg-green-700 text-white font-bold rounded-lg transition-all active:scale-95 uppercase text-sm tracking-wider"
                                >
                                    {t.easy}
                                </button>
                                <button
                                    onClick={() => {
                                        setMode('BOT');
                                        setBotDifficulty('medium');
                                        setPhase('PLACING');
                                    }}
                                    className="px-4 py-3 bg-yellow-900 hover:bg-yellow-700 text-white font-bold rounded-lg transition-all active:scale-95 uppercase text-sm tracking-wider"
                                >
                                    {t.medium}
                                </button>
                                <button
                                    onClick={() => {
                                        setMode('BOT');
                                        setBotDifficulty('hard');
                                        setPhase('PLACING');
                                    }}
                                    className="px-4 py-3 bg-red-900 hover:bg-red-700 text-white font-bold rounded-lg transition-all active:scale-95 uppercase text-sm tracking-wider"
                                >
                                    {t.hard}
                                </button>
                            </div>
                        </div>

                        {/* Local PvP */}
                        <button
                            onClick={() => {
                                setMode('MULTIPLAYER');
                                setPhase('PLACING');
                            }}
                            className="px-8 py-4 border border-slate-700 text-white font-bold rounded-lg hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-wider"
                        >
                            {t.localPvP}
                        </button>

                        {/* Online — different styling when logged out, but still clickable
                            so AuthModal can open. */}
                        <button
                            onClick={handleOnlineClick}
                            className={`px-8 py-4 font-bold rounded-lg transition-all active:scale-95 uppercase tracking-wider ${user
                                ? 'bg-purple-900 hover:bg-purple-700 text-white shadow-[0_4px_20px_rgba(168,85,247,0.3)]'
                                : 'bg-slate-900 text-slate-700 hover:bg-slate-700 border border-slate-700'
                                }`}
                        >
                            {t.online}
                            {!user && (
                                <span className="block text-[10px] font-medium mt-1 normal-case tracking-normal opacity-80">
                                    {t.loginRequired}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
            </>
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