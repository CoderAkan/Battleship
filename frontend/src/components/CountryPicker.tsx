import { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, getCountryByCode, type Country } from '../utils/countries';

interface CountryPickerProps {
    /** Currently selected ISO 3166-1 alpha-2 code, e.g. 'KZ'. */
    value: string | null;
    /** Called with the new alpha-2 code when the user picks a country. */
    onChange: (code: string) => void;
    /** Placeholder shown when no country is selected. */
    placeholder?: string;
    /** Disables the picker. */
    disabled?: boolean;
    /** Optional className passed to the trigger button for layout tweaks. */
    className?: string;
}

/**
 * Searchable country dropdown.
 *
 * Closed: shows the selected country's flag + name (or a placeholder).
 * Open: shows a search input + scrollable filtered list.
 *
 * Search is case-insensitive substring match on the country's English name.
 * Click outside or press Escape to close without changing the selection.
 *
 * Pure visual component — doesn't touch Supabase or stores. Parent decides
 * what to do with the code on change.
 */
export const CountryPicker = ({
    value,
    onChange,
    placeholder = 'Select country',
    disabled = false,
    className = '',
}: CountryPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selected = getCountryByCode(value);

    // Filtered list — case-insensitive substring match.
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return COUNTRIES;
        return COUNTRIES.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q),
        );
    }, [query]);

    // Close on outside click.
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Focus the search field as soon as the panel opens.
    useEffect(() => {
        if (isOpen) {
            // Defer to next tick so the input exists in the DOM.
            setTimeout(() => searchInputRef.current?.focus(), 0);
        } else {
            setQuery('');
            setHighlightedIndex(0);
        }
    }, [isOpen]);

    // Keep the highlighted item in view as the user arrow-keys through.
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const el = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [highlightedIndex, isOpen]);

    // Reset highlight when the query changes so we always start at the top.
    useEffect(() => {
        setHighlightedIndex(0);
    }, [query]);

    const selectCountry = (country: Country) => {
        onChange(country.code);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const country = filtered[highlightedIndex];
            if (country) selectCountry(country);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((o) => !o)}
                className={`w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white outline-none transition-all hover:border-slate-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                <span className="flex items-center gap-2 truncate">
                    {selected ? (
                        <>
                            <span className="text-lg leading-none shrink-0">{selected.flag}</span>
                            <span className="truncate">{selected.name}</span>
                        </>
                    ) : (
                        <span className="text-slate-500">{placeholder}</span>
                    )}
                </span>
                <span className={`text-slate-400 text-xs ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-slate-800">
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search..."
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <ul
                        ref={listRef}
                        className="max-h-64 overflow-y-auto"
                        role="listbox"
                    >
                        {filtered.length === 0 ? (
                            <li className="px-3 py-3 text-center text-slate-500 text-sm">
                                No countries found
                            </li>
                        ) : (
                            filtered.map((country, idx) => {
                                const isSelected = value === country.code;
                                const isHighlighted = idx === highlightedIndex;
                                return (
                                    <li
                                        key={country.code}
                                        role="option"
                                        aria-selected={isSelected}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                        onClick={() => selectCountry(country)}
                                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${isHighlighted ? 'bg-blue-600/30' : ''
                                            } ${isSelected ? 'text-blue-400 font-semibold' : 'text-white'}`}
                                    >
                                        <span className="text-lg leading-none shrink-0">{country.flag}</span>
                                        <span className="truncate">{country.name}</span>
                                        <span className="ml-auto text-xs text-slate-500 shrink-0">
                                            {country.code}
                                        </span>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
