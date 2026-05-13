import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../../store/useAuthStore';
import { useGameStore } from '../../store/useGameStore';
import { translations } from '../../utils/translations';
import { supabase } from '../../lib/supabase';
import { CountryPicker } from '../../components/CountryPicker';
import { CountryLeaderboardModal } from '../../components/CountryLeaderboardModal';
import { getCountryByCode } from '../../utils/countries';
import type { MatchRecord } from '../../types/user';

export const ProfilePage = () => {
    const { user, profile, countryRank, fetchCountryRank, fetchProfile } = useAuthStore();
    const { language } = useGameStore();
    const t = translations[language];

    const [matches, setMatches] = useState<MatchRecord[]>([]);
    const [matchesLoading, setMatchesLoading] = useState(false);

    // Inline edit state for country.
    const [editingCountry, setEditingCountry] = useState(false);
    const [savingCountry, setSavingCountry] = useState(false);

    // Country leaderboard modal.
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);

    // Refresh profile every time the page mounts, so stats are current.
    useEffect(() => {
        if (user) fetchProfile(user.id);
    }, [user, fetchProfile]);

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

    /**
     * Save the new country to Supabase. We re-fetch the profile afterwards
     * so the displayed flag + name + country rank all update together. If
     * the update fails we toast an error and keep the picker open so the
     * user can retry without losing their selection.
     */
    const handleCountryChange = async (newCode: string) => {
        if (!user || !profile) return;
        if (newCode === profile.country) {
            setEditingCountry(false);
            return;
        }

        setSavingCountry(true);
        const { error } = await supabase
            .from('profiles')
            .update({ country: newCode })
            .eq('id', user.id);

        if (error) {
            console.error('Failed to update country:', error.message);
            toast.error(language === 'ru' ? 'Не удалось сохранить страну' : 'Failed to save country');
            setSavingCountry(false);
            return;
        }

        await fetchProfile(user.id);
        toast.success(language === 'ru' ? 'Страна обновлена' : 'Country updated');
        setEditingCountry(false);
        setSavingCountry(false);
    };

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

    // Fall back to KZ defensively even though the DB now enforces NOT NULL.
    const currentCountryCode = profile.country ?? 'KZ';
    const currentCountry = getCountryByCode(currentCountryCode);

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
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-blue-600 flex items-center justify-center text-4xl sm:text-5xl font-bold text-white shrink-0">
                        {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center sm:text-left w-full">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white">
                            {profile.username}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">{user.email}</p>

                        {/* Country row — inline editable */}
                        <div className="mt-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                {language === 'en' ? 'Country' : 'Страна'}
                            </p>
                            {editingCountry ? (
                                <div className="flex items-center gap-2 max-w-sm">
                                    <div className="flex-1">
                                        <CountryPicker
                                            value={currentCountryCode}
                                            onChange={handleCountryChange}
                                            disabled={savingCountry}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setEditingCountry(false)}
                                        disabled={savingCountry}
                                        className="text-slate-400 hover:text-white text-sm px-2 py-1 transition-colors disabled:opacity-50"
                                        aria-label={language === 'en' ? 'Cancel' : 'Отмена'}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-white text-base flex items-center gap-2">
                                        {currentCountry ? (
                                            <>
                                                <span className="text-xl leading-none">{currentCountry.flag}</span>
                                                <span>{currentCountry.name}</span>
                                            </>
                                        ) : (
                                            <span className="text-slate-500">—</span>
                                        )}
                                    </span>
                                    <button
                                        onClick={() => setEditingCountry(true)}
                                        className="text-slate-400 hover:text-blue-400 text-sm transition-colors"
                                        aria-label={language === 'en' ? 'Edit country' : 'Изменить страну'}
                                    >
                                        ✏️
                                    </button>
                                </div>
                            )}
                        </div>
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
                        onClick={() => setLeaderboardOpen(true)}
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

            <CountryLeaderboardModal
                isOpen={leaderboardOpen}
                onClose={() => setLeaderboardOpen(false)}
                countryCode={currentCountryCode}
                currentUserId={user.id}
            />
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: string | number;
    /** Optional click handler. When provided, the card becomes interactive
     *  with a hover state and a pointer cursor. */
    onClick?: () => void;
}

const StatCard = ({ label, value, onClick }: StatCardProps) => {
    const interactive = !!onClick;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!interactive}
            className={`w-full text-left bg-slate-900 border border-slate-700 rounded-lg p-4 sm:p-5 transition-colors ${interactive
                ? 'hover:border-blue-500 hover:bg-slate-800/60 cursor-pointer'
                : 'hover:border-slate-500 cursor-default disabled:opacity-100'
                }`}
        >
            <p className="text-xs text-slate-400 mb-2">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
        </button>
    );
};