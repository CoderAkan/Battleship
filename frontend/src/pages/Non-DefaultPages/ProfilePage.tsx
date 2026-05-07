import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabase';
import type { MatchRecord } from '../../types/user';

export const ProfilePage = () => {
    const { user, profile, countryRank, fetchCountryRank } = useAuthStore();
    const { language } = useGameStore();
    const t = translations[language];

    const [matches, setMatches] = useState<MatchRecord[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);

    useEffect(() => {
        if (profile) fetchCountryRank();
    }, [profile, fetchCountryRank]);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;
        const fetchMatches = async () => {
            setMatchesLoading(true);
            const { data, error } = await supabase
                .from('match_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (cancelled) return;

            if (error) {
                console.error('Failed to fetch match history:', error.message);
                setMatches([]);
            } else {
                setMatches((data ?? []) as MatchRecord[]);
            }
            setMatchesLoading(false);
        };

        fetchMatches();
        return () => {
            cancelled = true;
        };
    }, [user]);

    if (!user || !profile) {
        return (
            <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 flex flex-col items-center justify-center p-6 gap-6">
                <h2 className="text-2xl font-bold text-white">
                    {language === 'en' ? 'Not logged in' : 'Вы не вошли'}
                </h2>
                <Link
                    to="/"
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white transition-all"
                >
                    {t.returnHome}
                </Link>
            </div>
        );
    }

    const wins = profile.wins ?? 0;
    const losses = profile.losses ?? 0;
    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0';

    const totalShots = profile.total_shots ?? 0;
    const successfulHits = profile.successful_hits ?? 0;
    const hitRate = totalShots > 0 ? ((successfulHits / totalShots) * 100).toFixed(1) : '0.0';

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-[calc(100dvh-4rem)] bg-slate-950 text-white px-4 py-8 sm:py-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl sm:text-4xl font-bold text-white">
                        {language === 'en' ? 'Profile' : 'Профиль'}
                    </h1>
                </div>

                {/* Identity card */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-blue-600 flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shrink-0">
                        {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">
                            {profile.username}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">{user.email}</p>
                        {profile.country && (
                            <p className="text-slate-300 text-sm mt-2">
                                {language === 'en' ? 'Country' : 'Страна'}: {profile.country}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
                    <StatCard
                        label={language === 'en' ? 'ELO Rating' : 'Рейтинг ELO'}
                        value={profile.elo ?? 1000}
                    />
                    <StatCard
                        label={language === 'en' ? 'Country Rank' : 'Ранг в стране'}
                        value={countryRank !== null ? `#${countryRank}` : '—'}
                    />
                    <StatCard
                        label={language === 'en' ? 'Total Matches' : 'Всего матчей'}
                        value={totalMatches}
                    />
                    <StatCard
                        label={language === 'en' ? 'Wins' : 'Победы'}
                        value={wins}
                    />
                    <StatCard
                        label={language === 'en' ? 'Losses' : 'Поражения'}
                        value={losses}
                    />
                    <StatCard
                        label={language === 'en' ? 'Win Rate' : 'Процент побед'}
                        value={`${winRate}%`}
                    />
                    <StatCard
                        label={language === 'en' ? 'Hit Accuracy' : 'Точность'}
                        value={`${hitRate}%`}
                    />
                    <StatCard
                        label={language === 'en' ? 'Total Shots' : 'Всего выстрелов'}
                        value={totalShots}
                    />
                    <StatCard
                        label={language === 'en' ? 'Successful Hits' : 'Попадания'}
                        value={successfulHits}
                    />
                </div>

                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
                        {language === 'en' ? 'Recent Matches' : 'Последние матчи'}
                    </h3>

                    {matchesLoading ? (
                        <p className="text-slate-400 text-sm">
                            {language === 'en' ? 'Loading...' : 'Загрузка...'}
                        </p>
                    ) : matches.length === 0 ? (
                        <p className="text-slate-400 text-sm">
                            {language === 'en'
                                ? 'No matches played yet.'
                                : 'Матчи ещё не сыграны.'}
                        </p>
                    ) : (
                        <ul className="divide-y divide-slate-800">
                            {matches.map((match) => {
                                const isWin = match.result === 'win';
                                const accuracy =
                                    match.shots_fired > 0
                                        ? (
                                            (match.successful_hits / match.shots_fired) *
                                            100
                                        ).toFixed(0)
                                        : '0';

                                return (
                                    <li
                                        key={match.id}
                                        className="flex items-center justify-between py-3 gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span
                                                className={`shrink-0 w-12 text-xs font-black uppercase tracking-wider px-2 py-1 rounded text-center ${isWin
                                                    ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                                                    : 'bg-red-600/20 text-red-400 border border-red-600/40'
                                                    }`}
                                            >
                                                {isWin
                                                    ? language === 'en'
                                                        ? 'WIN'
                                                        : 'ПОБ'
                                                    : language === 'en'
                                                        ? 'LOSS'
                                                        : 'ПОР'}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm text-white font-medium truncate">
                                                    vs {match.opponent}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDate(match.created_at)} ·{' '}
                                                    {language === 'en'
                                                        ? `${accuracy}% accuracy`
                                                        : `точность ${accuracy}%`}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`shrink-0 font-mono font-bold text-sm ${match.elo_change >= 0
                                                ? 'text-green-400'
                                                : 'text-red-400'
                                                }`}
                                        >
                                            {match.elo_change >= 0 ? '+' : ''}
                                            {match.elo_change} ELO
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: string | number;
}

const StatCard = ({ label, value }: StatCardProps) => (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 sm:p-5 hover:border-slate-500 transition-colors">
        <p className="text-xs text-slate-400 mb-2">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
    </div>
);