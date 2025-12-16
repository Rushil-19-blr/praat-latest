'use client';

import * as React from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import CompletionModal from '../CompletionModal';
import {
    Droplet,
    Moon,
    Footprints,
    Music,
    BookOpen,
    Wind,
    Utensils,
    Brain,
    Users,
    Sun,
    Sparkles,
    Smile,
    Coffee,
    Heart
} from 'lucide-react';

// --- Types ---
interface SuggestionItem {
    id: string;
    label: string;
    type: 'immediate' | 'longterm';
    completed: boolean;
}

interface FloatingWellbeingBarProps {
    className?: string;
    onTasksCompleted?: () => void;
}

// --- Constants ---
const defaultItems = [
    { id: 1, label: 'Drink 8 glasses of water', defaultChecked: false },
    { id: 2, label: 'Sleep 7-8 hours tonight', defaultChecked: false },
    { id: 3, label: 'Read 10 pages today', defaultChecked: false },
    { id: 4, label: 'Take a 10-minute walk', defaultChecked: false },
    { id: 5, label: 'Practice 5 minutes of meditation', defaultChecked: false },
    { id: 6, label: 'Eat a healthy meal', defaultChecked: false },
];

// --- Utilities (reused/adapted) ---
const convertSuggestionsToItems = (suggestions: SuggestionItem[]) => {
    const immediate = suggestions.filter(s => s.type === 'immediate');
    const longTerm = suggestions.filter(s => s.type === 'longterm');
    return [...immediate, ...longTerm].map((suggestion) => ({
        id: suggestion.id,
        label: suggestion.label,
        defaultChecked: suggestion.completed,
        suggestionId: suggestion.id
    }));
};

const getIconForSuggestion = (text: string) => {
    const t = text.toLowerCase();

    // Hydration
    if (t.includes('water') || t.includes('drink') || t.includes('hydrate'))
        return <Droplet className="w-5 h-5 text-cyan-400" />;

    // Sleep / Rest
    if (t.includes('sleep') || t.includes('rest') || t.includes('nap') || t.includes('bed') || t.includes('night'))
        return <Moon className="w-5 h-5 text-indigo-400" />;

    // Physical Activity
    if (t.includes('walk') || t.includes('run') || t.includes('exercise') || t.includes('stretch') || t.includes('yoga') || t.includes('move'))
        return <Footprints className="w-5 h-5 text-emerald-400" />;

    // Vocal / Voice
    if (t.includes('hum') || t.includes('sing') || t.includes('voice') || t.includes('throat') || t.includes('vocal') || t.includes('sigh'))
        return <Music className="w-5 h-5 text-rose-400" />;

    // Knowledge / Focus
    if (t.includes('read') || t.includes('book') || t.includes('study') || t.includes('learn') || t.includes('focus'))
        return <BookOpen className="w-5 h-5 text-amber-400" />;

    // Breathing
    if (t.includes('breath') || t.includes('lung') || t.includes('air') || t.includes('inhale') || t.includes('exhale'))
        return <Wind className="w-5 h-5 text-sky-400" />;

    // Diet
    if (t.includes('eat') || t.includes('meal') || t.includes('food') || t.includes('diet') || t.includes('fruit') || t.includes('veg'))
        return <Utensils className="w-5 h-5 text-orange-400" />;

    // Mental Health
    if (t.includes('meditate') || t.includes('calm') || t.includes('relax') || t.includes('mind') || t.includes('peace') || t.includes('gratitude'))
        return <Brain className="w-5 h-5 text-violet-400" />;

    // Social
    if (t.includes('friend') || t.includes('social') || t.includes('talk') || t.includes('family') || t.includes('call'))
        return <Users className="w-5 h-5 text-pink-400" />;

    // Nature / Outside
    if (t.includes('sun') || t.includes('outside') || t.includes('nature') || t.includes('fresh'))
        return <Sun className="w-5 h-5 text-yellow-400" />;

    // Happiness
    if (t.includes('smile') || t.includes('happy') || t.includes('laugh') || t.includes('joy'))
        return <Smile className="w-5 h-5 text-yellow-300" />;

    // Drinks
    if (t.includes('coffee') || t.includes('tea'))
        return <Coffee className="w-5 h-5 text-amber-700" />;

    // Default
    return <Sparkles className="w-5 h-5 text-yellow-200" />;
};

// --- SVG Filter for Ripple/Warp ---
const RippleFilter = () => (
    <svg className="hidden">
        <defs>
            <filter id="water-ripple" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
            </filter>
        </defs>
    </svg>
);

export const FloatingWellbeingBar: React.FC<FloatingWellbeingBarProps> = ({ className, onTasksCompleted }) => {
    // --- State & Logic (mostly matching PlayfulTodoList) ---
    const loadAllItems = React.useCallback(() => {
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                const parsedUserData = JSON.parse(userData);
                const studentCode = parsedUserData.accountNumber;
                const suggestionsKey = `suggestions_${studentCode}`;
                const savedSuggestions = localStorage.getItem(suggestionsKey);
                if (savedSuggestions) {
                    const suggestionsData = JSON.parse(savedSuggestions);
                    if (suggestionsData.suggestions && suggestionsData.suggestions.length > 0) {
                        const completionKey = `suggestions_completed_${studentCode}`;
                        const savedCompletion = localStorage.getItem(completionKey);
                        const completedMap = savedCompletion ? JSON.parse(savedCompletion) : {};
                        const suggestionsWithCompletion = suggestionsData.suggestions.map((s: SuggestionItem) => ({
                            ...s,
                            completed: completedMap[s.id] || false
                        }));
                        const items = convertSuggestionsToItems(suggestionsWithCompletion);
                        if (items.length > 0) return items;
                    }
                }
            } catch (error) { console.error(error); }
        }
        return defaultItems;
    }, []);

    const getCurrentBatch = React.useCallback(() => {
        const allItems = loadAllItems();
        const userData = localStorage.getItem('userData');
        if (!userData) return allItems.slice(0, 4);

        try {
            const parsedUserData = JSON.parse(userData);
            const studentCode = parsedUserData.accountNumber;
            const batchKey = `suggestions_current_batch_${studentCode}`;
            const shownKey = `suggestions_shown_${studentCode}`;

            // 1. Check for existing active batch (RETURN IT REGARDLESS OF COMPLETION)
            const savedBatch = localStorage.getItem(batchKey);
            if (savedBatch) {
                const currentBatchIds = JSON.parse(savedBatch);
                const currentBatchItems = allItems.filter(item => {
                    const itemId = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
                    return currentBatchIds.includes(itemId);
                });

                if (currentBatchItems.length > 0) return currentBatchItems;
            }

            // 2. Generate NEW batch (Only if no saved batch exists)
            const savedShown = localStorage.getItem(shownKey);
            const shownSet = savedShown ? new Set(JSON.parse(savedShown)) : new Set();
            const unshownItems = allItems.filter(item => {
                const itemId = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
                return !shownSet.has(itemId);
            });

            let nextBatchItems = unshownItems.length > 0 ? unshownItems.slice(0, 4) : allItems.slice(0, 4);
            if (unshownItems.length === 0) try { localStorage.removeItem(shownKey); } catch { }

            const nextBatchIds = nextBatchItems.map(item => 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString());
            localStorage.setItem(batchKey, JSON.stringify(nextBatchIds));
            nextBatchIds.forEach(id => shownSet.add(id));
            localStorage.setItem(shownKey, JSON.stringify([...shownSet]));

            return nextBatchItems;
        } catch { return allItems.slice(0, 4); }
    }, [loadAllItems]);

    const [displayedItems, setDisplayedItems] = React.useState(() => getCurrentBatch());
    const [checked, setChecked] = React.useState<boolean[]>(() => {
        // Initial checked state logic
        const initialItems = getCurrentBatch();
        const userData = localStorage.getItem('userData');
        if (userData && initialItems.length > 0) {
            try {
                const parsed = JSON.parse(userData);
                const code = parsed.accountNumber;
                const saved = localStorage.getItem(`suggestions_completed_${code}`);
                const map = saved ? JSON.parse(saved) : {};
                return initialItems.map(item => {
                    const id = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
                    return map[id] || false;
                });
            } catch { }
        }
        return initialItems.map(i => !!i.defaultChecked);
    });

    const [expandedId, setExpandedId] = React.useState<string | number | null>(null);
    const [showCompletionModal, setShowCompletionModal] = React.useState(false);
    const isUpdatingBatch = React.useRef(false);
    const isInitialMount = React.useRef(true);

    // --- Effects ---
    // Save completion state
    React.useEffect(() => {
        if (isInitialMount.current || isUpdatingBatch.current) {
            isInitialMount.current = false;
            return;
        }
        const userData = localStorage.getItem('userData');
        if (userData && displayedItems.length > 0) {
            try {
                const parsed = JSON.parse(userData);
                const code = parsed.accountNumber;
                const key = `suggestions_completed_${code}`;
                const saved = localStorage.getItem(key);
                const map = saved ? JSON.parse(saved) : {};

                displayedItems.forEach((item, idx) => {
                    const id = 'suggestionId' in item ? (item.suggestionId as string) : item.id.toString();
                    map[id] = checked[idx];
                });
                localStorage.setItem(key, JSON.stringify(map));

                if (checked.every(c => c === true) && displayedItems.length > 0) {
                    if (onTasksCompleted) onTasksCompleted();
                    setTimeout(() => setShowCompletionModal(true), 800);
                }
            } catch (e) { console.error(e); }
        }
    }, [checked, displayedItems, onTasksCompleted]);

    const handleToggle = (idx: number) => {
        setChecked(prev => {
            const next = [...prev];
            next[idx] = !next[idx];
            return next;
        });
    };

    const loadNextBatch = () => {
        setShowCompletionModal(false);
        setTimeout(() => {
            isUpdatingBatch.current = true;

            // Explicitly rotate batch
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    const code = parsed.accountNumber;
                    localStorage.removeItem(`suggestions_current_batch_${code}`);
                } catch { }
            }

            const next = getCurrentBatch();
            setDisplayedItems(next);
            setChecked(next.map(() => false)); // Reset checks for new batch (or load real state if needed)
            // Actually, we should load real state, but for a new batch usually it's false
            setTimeout(() => { isUpdatingBatch.current = false; }, 100);
        }, 300);
    };

    return (
        <div className={`w-full max-w-md mx-auto relative ${className}`}>
            <RippleFilter />

            {/* Header Section */}
            <div className="flex items-center justify-between px-1 mb-3">
                <h2 className="text-white/90 text-lg font-semibold tracking-tight">Daily Wellness Tasks</h2>
            </div>

            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {displayedItems.map((item, idx) => {
                        const isChecked = checked[idx];
                        const isExpanded = expandedId === item.id;

                        return (
                            <TaskCard
                                key={item.id}
                                item={item}
                                isChecked={isChecked}
                                isExpanded={isExpanded}
                                onToggle={() => handleToggle(idx)}
                                onExpand={() => setExpandedId(isExpanded ? null : item.id)}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>

            <CompletionModal isOpen={showCompletionModal} onClose={loadNextBatch} />
        </div>
    );
};

// --- Sub-component for individual task ---
interface TaskCardProps {
    item: any;
    isChecked: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onExpand: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ item, isChecked, isExpanded, onToggle, onExpand }) => {
    const controls = useAnimation();
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        if (isChecked) {
            controls.start({
                scale: [1, 1.05, 1],
                filter: ["url(#water-ripple)", "none"],
                transition: { duration: 0.6, ease: "easeOut" }
            });
        }
    }, [isChecked, controls]);

    const handleMouseDown = () => {
        longPressTimer.current = setTimeout(() => {
            if (!isChecked) {
                onToggle(); // Long press to complete
                // Trigger haptic feedback if available (mobile)
                if (navigator.vibrate) navigator.vibrate(50);
            }
        }, 500);
    };

    const handleMouseUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    return (
        <motion.div
            layout
            className={`
        relative overflow-hidden rounded-2xl backdrop-blur-2xl border transition-all duration-300
        ${isChecked ? 'bg-blue-500/10 border-blue-400/20' : 'bg-blue-950/[0.02] border-white/5 hover:bg-blue-900/10'}
      `}
            style={{
                width: '100%',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={controls}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            {/* Ripple/Glow Effect Container */}
            {isChecked && (
                <motion.div
                    layoutId={`ripple-${item.id}`}
                    className="absolute inset-0 bg-blue-500/5 z-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                />
            )}

            <div className="relative z-10 p-4 flex items-center justify-between gap-4">
                {/* Check Circle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle();
                    }}
                    className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0
            ${isChecked ? 'border-blue-400 bg-blue-400' : 'border-white/30 hover:border-white/60'}
          `}
                >
                    {isChecked && (
                        <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3.5 h-3.5 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="20 6 9 17 4 12" />
                        </motion.svg>
                    )}
                </button>

                {/* Text Content */}
                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={onExpand}
                >
                    <div className="relative">
                        <motion.p
                            layout="position"
                            className={`text-sm text-white font-medium leading-relaxed ${isChecked ? 'line-through opacity-50' : ''}`}
                        >
                            {isExpanded ? item.label : (
                                <span className="block truncate pr-8">{item.label}</span>
                            )}
                        </motion.p>

                        {/* Runthrough Text Blur Effect (only when collapsed) */}
                        {!isExpanded && !isChecked && (
                            <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-blue-900/0 via-blue-900/0 to-transparent pointer-events-none" />
                        )}
                    </div>
                </div>

                {/* Illustration Placeholder (Dynamic) */}
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    {getIconForSuggestion(item.label)}
                </div>
            </div>
        </motion.div>
    );
};
