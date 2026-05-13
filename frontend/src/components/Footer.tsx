import { useGameStore } from '../store/useGameStore';

/**
 * Site footer. Hidden during BATTLE and RESULT phases to keep the game
 * screen distraction-free, matching the nav-bar's hide-during-game behavior
 * in Layout.
 *
 * Content is intentionally light — copyright, credit, two contact links.
 * No internal navigation here; that's the nav's job.
 */
export const Footer = () => {
    const { phase, language } = useGameStore();
    const isBattleActive = phase === 'BATTLE' || phase === 'RESULT';

    if (isBattleActive) return null;

    const year = new Date().getFullYear();

    return (
        <footer className="shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-4 sm:py-5">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs text-slate-500">
                <span>
                    © {year} {language === 'en' ? 'Battleship' : 'Морской бой'}
                </span>
                <span className="hidden sm:inline text-slate-700">·</span>
                <span>
                    {language === 'en' ? 'Built by' : 'Создатель'} Kaiyrbay Akanseri
                </span>
                <span className="hidden sm:inline text-slate-700">·</span>
                <a
                    href="mailto:akanserikaiyrbay@gmail.com"
                    className="hover:text-blue-400 transition-colors"
                >
                    akanserikaiyrbay@gmail.com
                </a>
                <span className="hidden sm:inline text-slate-700">·</span>
                <a
                    href="https://github.com/CoderAkan/Battleship"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                >
                    <span>GitHub</span>
                    <span aria-hidden="true">↗</span>
                </a>
            </div>
        </footer>
    );
};