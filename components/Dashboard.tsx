
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { UserCircle, Eye, EyeSlash, Calendar, Microphone, ChevronLeft } from './Icons';
import { streaksData, calendarSessionData } from '../constants';

// --- Helper Hook ---
const useClickOutside = (ref: React.RefObject<HTMLDivElement>, handler: () => void) => {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler();
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};


// --- Sub-components for Dashboard ---

const AccountControl = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [name, setName] = useState('Test Student');
    const [isCodeVisible, setIsCodeVisible] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);
    
    useClickOutside(accountRef, () => {
      if (isExpanded) {
        setIsExpanded(false);
      }
    });

    const contentVariants = {
        hidden: { opacity: 0, transition: { duration: 0.1 } },
        visible: { opacity: 1, transition: { duration: 0.3, delay: 0.25 } },
    };

    return (
        <div className="absolute top-4 right-4 z-20" ref={accountRef}>
            <motion.div layout className="relative">
                <AnimatePresence>
                    {isExpanded ? (
                        <motion.div
                            key="expanded-account"
                            className="w-[340px] p-2 bg-surface/80 backdrop-blur-2xl border border-purple-primary/20 rounded-[28px] shadow-2xl shadow-black/40 flex gap-2"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, type: 'spring' }}
                        >
                            {/* Left Blob */}
                            <div className="flex-1 p-3 bg-black/20 rounded-2xl">
                                <motion.div variants={contentVariants} initial="hidden" animate="visible" exit="hidden">
                                    <div className="flex items-center mb-2">
                                        <UserCircle className="w-6 h-6 text-purple-light" />
                                        <h3 className="ml-2 text-sm font-bold text-text-secondary">Student</h3>
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Student Name"
                                        className="bg-black/20 w-full rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-purple-light"
                                    />
                                </motion.div>
                            </div>

                            {/* Right Blob */}
                            <div className="flex-1 p-3 bg-black/20 rounded-2xl">
                                <motion.div variants={contentVariants} initial="hidden" animate="visible" exit="hidden">
                                     <h3 className="text-sm font-bold text-purple-light mb-2 h-6 flex items-center">Student Code</h3>
                                    <div className="flex items-center bg-black/20 rounded-lg px-3 py-2">
                                        <span className="flex-grow text-sm text-text-primary tabular-nums tracking-widest">
                                            {isCodeVisible ? '12345' : '•••••'}
                                        </span>
                                        <button
                                            onMouseDown={() => setIsCodeVisible(true)}
                                            onMouseUp={() => setIsCodeVisible(false)}
                                            onMouseLeave={() => setIsCodeVisible(false)}
                                            onTouchStart={() => setIsCodeVisible(true)}
                                            onTouchEnd={() => setIsCodeVisible(false)}
                                            aria-label="Show student code (press and hold)"
                                            className="focus:outline-none"
                                        >
                                            {isCodeVisible ? <EyeSlash className="w-5 h-5 text-text-muted"/> : <Eye className="w-5 h-5 text-text-muted"/>}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.button
                            key="collapsed-account"
                            onClick={() => setIsExpanded(true)}
                            className="w-12 h-12 bg-surface/80 backdrop-blur-2xl border border-purple-primary/20 rounded-full flex items-center justify-center shadow-lg shadow-black/30"
                            whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' }}
                            whileTap={{ scale: 0.95 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, type: 'spring' }}
                        >
                            <UserCircle className="w-6 h-6 text-text-secondary" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const AnimatedFlame: React.FC<{ sessions: number }> = ({ sessions }) => {
    const scale = useMemo(() => {
        if (sessions > 7) return 1.2;
        if (sessions > 4) return 1.0;
        return 0.8;
    }, [sessions]);

    return (
        <motion.div
            style={{ scale }}
            className="w-10 h-12 flex items-center justify-center"
        >
            <motion.svg viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <motion.path
                    d="M12 2C12 2 5 10 5 17C5 22 8.13 25 12 25C15.87 25 19 22 19 17C19 10 12 2 12 2Z"
                    fill="url(#flameGradient)"
                    stroke="#FF8E53"
                    strokeWidth="1.5"
                    animate={{
                        scaleY: [1, 1.05, 0.95, 1.02, 1],
                        scaleX: [1, 0.98, 1.02, 0.99, 1],
                        transformOrigin: '50% 90%',
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <defs>
                    <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#FF6B35" />
                    </linearGradient>
                </defs>
            </motion.svg>
        </motion.div>
    );
};

const WeeklyWaveform: React.FC<{ weeks: number[] }> = ({ weeks }) => {
    const createBarsForWeek = (count: number) => {
        const bars = [];
        const numBars = 9; // e.g., 9 bars for a nice spindle shape
        const peakHeight = Math.max(1, count * 10); // Base height on session count
        
        // Distribution of heights for the spindle shape (e.g., [0.2, 0.4, 0.7, 0.9, 1.0, 0.9, 0.7, 0.4, 0.2])
        const heightDistribution = Array.from({ length: numBars }, (_, i) => {
            const distanceFromCenter = Math.abs(i - Math.floor(numBars / 2));
            return 1.0 - (distanceFromCenter / (numBars / 2)) * 0.8;
        });

        for (let i = 0; i < numBars; i++) {
            const height = heightDistribution[i] * peakHeight;
            bars.push(
                <motion.div 
                    key={i}
                    className="w-[2px] rounded-full bg-white"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(2, height)}px` }}
                    transition={{ duration: 0.5, type: 'spring', stiffness: 100, delay: i * 0.03 }}
                />
            );
        }
        return bars;
    };

    return (
        <div className="flex justify-around items-end h-24 w-full bg-purple-primary/20 rounded-xl p-4">
            {weeks.map((count, index) => (
                <div key={index} className="text-center h-full flex flex-col items-center justify-end w-1/4">
                     <div className="flex items-end justify-center h-full w-full gap-px">
                        {createBarsForWeek(count)}
                    </div>
                    <p className="text-xs mt-2 text-text-muted font-bold">{index + 1}</p>
                </div>
            ))}
        </div>
    );
};

const StreaksWidget = () => {
    const [view, setView] = useState<'monthly' | 'weekly'>('monthly');
    const [selectedMonth, setSelectedMonth] = useState<typeof streaksData[0] | null>(null);

    const handleMonthClick = (monthData: typeof streaksData[0]) => {
        setSelectedMonth(monthData);
        setView('weekly');
    };
    
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const swipeThreshold = 50;
        if (info.offset.y < -swipeThreshold) { // Swipe Up
            setView('weekly');
        } else if (info.offset.y > swipeThreshold && view === 'weekly' && !selectedMonth) { // Swipe Down
            setView('monthly');
        }
    };

    const handleBack = () => {
        setSelectedMonth(null);
        setView('monthly');
    };

    const currentData = view === 'weekly' && selectedMonth ? selectedMonth.weeks : (view === 'weekly' ? streaksData[2].weeks : null); // Show Sep data if no month selected

    return (
        <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="bg-surface/80 backdrop-blur-md border border-purple-primary/20 rounded-2xl p-4 w-full max-w-md mx-auto cursor-grab active:cursor-grabbing"
        >
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold">Your Streaks</h2>
                 {(view === 'weekly') && (
                     <button onClick={handleBack} className="text-xs text-purple-light flex items-center hover:underline">
                        <ChevronLeft className="w-3 h-3 mr-1" />
                        Back to Months
                     </button>
                 )}
            </div>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={view + (selectedMonth?.month || '')}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, type: 'spring', stiffness: 100 }}
                >
                    {view === 'monthly' ? (
                        <div className="flex justify-around items-end h-24">
                            {streaksData.slice(0, 5).map((monthData) => (
                                <button key={monthData.month} onClick={() => handleMonthClick(monthData)} className="text-center group">
                                    <AnimatedFlame sessions={monthData.sessions} />
                                    <p className="text-xs mt-1 text-text-muted group-hover:text-white transition-colors">{monthData.month}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        currentData ? <WeeklyWaveform weeks={currentData} /> : <div className="h-24 flex items-center justify-center text-text-muted">Select a month to see details</div>
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}

const CalendarModal = ({ onClose }: { onClose: () => void }) => {
    const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1)); // October 2025

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };
    
    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 for Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`empty-${i}`} />);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const hasSession = calendarSessionData.includes(day) && month === 9 && year === 2025;
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

            days.push(
                <button
                    key={day}
                    onClick={() => console.log(`Selected date: ${day}`)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors text-sm ${
                        hasSession ? 'bg-purple-primary text-white font-bold' : isToday ? 'border-2 border-purple-light text-white' : 'hover:bg-purple-primary/20 text-text-secondary'
                    }`}
                >
                    {day}
                </button>
            );
        }
        return days;
    }, [currentDate]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface rounded-2xl p-4 w-full max-w-sm border border-white/10"
            >
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
                    <h3 className="font-bold text-lg">{`${monthName} ${year}`}</h3>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-white/10"><ChevronLeft className="w-5 h-5 rotate-180" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2 justify-items-center">
                    {calendarGrid}
                </div>
            </motion.div>
        </motion.div>
    );
};


// --- Main Dashboard Component ---

interface DashboardProps {
  onStartVoiceSession: () => void;
  onStartCalibration: () => void;
  hasBaseline: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartVoiceSession, onStartCalibration, hasBaseline }) => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 space-y-8 bg-background-primary text-text-primary">
            <AccountControl />

            <div className="w-full max-w-md flex flex-col items-center justify-center flex-grow">
                <StreaksWidget />

                <div className="text-center w-full mt-12 mb-6">
                    <motion.button
                        onClick={onStartVoiceSession}
                        className="w-48 h-48 bg-purple-primary rounded-full flex items-center justify-center shadow-lg shadow-purple-primary/30"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Microphone className="w-20 h-20 text-white" />
                    </motion.button>
                    <p className="mt-6 text-lg text-text-secondary font-medium">Start Voice Session</p>
                    
                    <div className="mt-8">
                        <AnimatePresence>
                            {!hasBaseline && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="px-4 py-3 rounded-xl bg-orange-primary/10 border border-orange-primary/30 max-w-xs mx-auto"
                                >
                                    <p className="text-sm text-orange-light">
                                        Calibration recommended for best results.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button 
                            onClick={onStartCalibration} 
                            className="mt-4 text-base font-medium text-purple-light py-2 px-4 rounded-lg hover:bg-purple-primary/10 transition-colors"
                        >
                            <span className="border-b-2 border-purple-primary/70 group-hover:border-purple-primary">
                               {hasBaseline ? 'Re-calibrate Voice' : 'Calibrate Voice'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 right-4 z-20">
                <motion.button
                    onClick={() => setIsCalendarOpen(true)}
                    className="w-12 h-12 bg-surface/80 backdrop-blur-md border border-purple-primary/20 rounded-full flex flex-col items-center justify-center text-xs"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="font-bold text-base -mb-1">{new Date().getDate()}</span>
                    <span className="text-text-muted">{new Date().toLocaleString('default', { month: 'short' })}</span>
                </motion.button>
            </div>

            <AnimatePresence>
                {isCalendarOpen && <CalendarModal onClose={() => setIsCalendarOpen(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;