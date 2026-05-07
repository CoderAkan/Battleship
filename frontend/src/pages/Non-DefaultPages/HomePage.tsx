import { useGameStore } from '../../store/useGameStore';
import { SetupPage } from '../Non-DefaultPages/SetupPage';
import { BattlePage } from '../Non-DefaultPages/BattlePage';

const HomePage = () => {
    const phase = useGameStore((state) => state.phase);

    return (
        <main className="w-full min-h-screen">
            {phase === 'PLACING' && <SetupPage />}
            {(phase === 'BATTLE' || phase === 'RESULT') && <BattlePage />}
        </main>
    );
};

export default HomePage; // <--- MUST BE DEFAULT

// const HomePage = () => {
//     return <div className="text-white text-5xl p-20">IF YOU SEE THIS, ROUTER IS OK</div>;
// };
// export default HomePage;