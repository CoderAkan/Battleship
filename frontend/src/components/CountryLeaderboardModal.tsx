import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { getCountryByCode } from '../utils/countries';

interface LeaderboardEntry {
    id: string;
    username: string;
    elo: number;
}

interface CountryLeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    countryCode: string;
    currentUserId: string;
}

const PAGE_SIZE = 10;

/**
 * Modal showing players from a single country, ranked by ELO descending,
 * paginated 10 per page. The current user's row is highlighted with a
 * white background when it appears on the visible page.
 *
 * Closes on backdrop click, Escape key, or the ✕ button.
 *
 * Data is fetched fresh every time the modal opens, and again whenever
 * the user changes page. Supabase's `.range()` API does the pagination
 * server-side, so we only ever pull 10 rows at a time.
 */
export const CountryLeaderboardModal = ({
    isOpen,
    onClose,
    countryCode,
    currentUserId,
}: CountryLeaderboardModalProps) => {
    const { language } = useGameStore();
    const country = getCountryByCode(countryCode);

    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const startRank = page * PAGE_SIZE + 1;

    // Fetch whenever the modal opens or the page changes.
    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        const fetchPage = async () => {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, count, error } = await supabase
                .from('profiles')
                .select('id, username, elo', { count: 'exact' })
                .eq('country', countryCode)
                .order('elo', { ascending: false })
                .range(from, to);

            if (cancelled) return;

            if (error) {
                console.error('Failed to fetch leaderboard:', error.message);
                setEntries([]);
                setTotalCount(0);
                return;
            }

            setEntries((data ?? []) as LeaderboardEntry[]);
            setTotalCount(count ?? 0);
        };

        fetchPage();
        return () => {
            cancelled = true;
        };
    }, [isOpen, page, countryCode]);

    // Reset to page 0 every time the modal opens, so reopening doesn't
    // leave us stranded on a stale page.
    useEffect(() => {
        if (isOpen) setPage(0);
    }, [isOpen]);

    // Close on Escape.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                            {language === 'en' ? 'Country Leaderboard' : 'Рейтинг страны'}
                        </p>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {country ? (
                                <>
                                    <span className="text-2xl leading-none">{country.flag}</span>
                                    <span>{country.name}</span>
                                </>
                            ) : (
                                <span>{countryCode}</span>
                            )}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-500 hover:text-white text-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Leaderboard list */}
                <ul className="divide-y divide-slate-800 border-y border-slate-800">
                    {entries.map((entry, idx) => {
                        const rank = startRank + idx;
                        const isCurrentUser = entry.id === currentUserId;
                        return (
                            <li
                                key={entry.id}
                                className={`flex items-center justify-between py-2.5 px-3 transition-colors ${
                                    isCurrentUser
                                        ? 'bg-white text-slate-900 font-semibold'
                                        : 'text-white'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span
                                        className={`font-mono font-bold text-sm w-8 shrink-0 ${
                                            isCurrentUser ? 'text-slate-900' : 'text-slate-500'
                                        }`}
                                    >
                                        #{rank}
                                    </span>
                                    <span className="truncate">{entry.username}</span>
                                </div>
                                <span
                                    className={`font-mono font-bold text-sm shrink-0 ml-2 ${
                                        isCurrentUser ? 'text-slate-900' : 'text-blue-400'
                                    }`}
                                >
                                    {entry.elo}
                                </span>
                            </li>
                        );
                    })}
                </ul>

                {/* Pagination footer */}
                <div className="flex items-center justify-between mt-5">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                    >
                        ← {language === 'en' ? 'Prev' : 'Назад'}
                    </button>
                    <p className="text-xs text-slate-500 font-mono">
                        {language === 'en' ? 'Page' : 'Стр.'} {page + 1} / {totalPages}
                    </p>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                    >
                        {language === 'en' ? 'Next' : 'Далее'} →
                    </button>
                </div>
            </div>
        </div>
    );
};
