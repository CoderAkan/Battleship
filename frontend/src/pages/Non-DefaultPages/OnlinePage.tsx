import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { OnlineLobbyPage } from './OnlineLobbyPage';
import { OnlineSetupPage } from './OnlineSetupPage';
import { OnlineBattlePage } from './OnlineBattlePage';


export const OnlinePage = () => {
    const navigate = useNavigate();
    const { phase, opponentUsername, disconnect } = useMultiplayerStore();

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    const handleBackToHome = () => {
        disconnect();
        navigate('/');
    };

    // Lobby covers two states: pre-create-room AND post-create-room-but-pre-opponent.
    if (phase === 'WAITING' || !opponentUsername) {
        return <OnlineLobbyPage onBack={handleBackToHome} />;
    }

    if (phase === 'PLACING') {
        return <OnlineSetupPage />;
    }

    if (phase === 'BATTLE' || phase === 'RESULT') {
        return <OnlineBattlePage />;
    }

    return null;
};