'use client';

import * as React from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

interface StartSessionButtonProps {
    onStart: () => void;
    className?: string;
}

export const StartSessionButton: React.FC<StartSessionButtonProps> = ({ onStart, className }) => {
    const [isHolding, setIsHolding] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const HOLD_DURATION = 1500; // 1.5 seconds to fill
    const UPDATE_INTERVAL = 16; // ~60fps

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    React.useEffect(() => {
        if (progress >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (navigator.vibrate) navigator.vibrate(50);
            onStart();
            setProgress(0);
            setIsHolding(false);
        }
    }, [progress, onStart]);

    const startHolding = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
        // Only allow primary click
        if ('button' in e && e.button !== 0) return;

        setIsHolding(true);
        if (intervalRef.current) clearInterval(intervalRef.current);

        const startTime = Date.now();
        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
            setProgress(newProgress);
        }, UPDATE_INTERVAL);
    };

    const stopHolding = () => {
        setIsHolding(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setProgress(0);
    };

    // Calculate circumference for dashoffset
    // r = 88 (close to 45% of 200px or relative unit)
    // C = 2 * pi * 88 ~= 553
    const radius = 120; // Reduced from 135
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (progress / 100) * circumference;

    return (
        <div className={`relative flex flex-col items-center justify-center gap-8 ${className}`}>
            <div className="relative group touch-none">
                {/* Pulse Effect Background */}
                <div className={`absolute inset-0 rounded-full bg-purple-500/30 blur-2xl transition-all duration-500
                    ${isHolding ? 'scale-150 opacity-60' : 'scale-110 opacity-20 animate-pulse'}
                `} />

                {/* Progress Ring SVG */}
                <div className="absolute inset-[-20px] pointer-events-none z-0">
                    <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 200 200">
                        {/* Track */}
                        <circle
                            cx="100" cy="100" r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="4"
                        />
                        {/* Progress */}
                        <motion.circle
                            cx="100" cy="100" r={radius}
                            fill="none"
                            stroke="url(#gradient-stroke)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: dashOffset }}
                            transition={{ duration: 0.05, ease: "linear" }}
                        />
                        <defs>
                            <linearGradient id="gradient-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#c084fc" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Main Button */}
                <motion.button
                    onPointerDown={startHolding}
                    onPointerUp={stopHolding}
                    onPointerLeave={stopHolding}
                    onContextMenu={(e) => e.preventDefault()}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                        scale: isHolding ? 0.98 : 1,
                        boxShadow: isHolding
                            ? "0 0 60px rgba(168, 85, 247, 0.6), inset 0 0 30px rgba(255,255,255,0.2)"
                            : "0 25px 50px rgba(0,0,0,0.4), inset 0 0 0 rgba(255,255,255,0)",
                        width: 220, height: 220, // Reduced from 250px
                    }}
                    className={`
                        relative w-[220px] h-[220px] rounded-full z-10
                        bg-gradient-to-br from-[#db2777] via-[#9333ea] to-[#7c3aed]
                        flex items-center justify-center
                        border-8 border-white/10
                        shadow-2xl overflow-hidden
                        cursor-pointer select-none
                    `}
                    style={{
                        background: 'var(--accent-gradient, linear-gradient(135deg, #a855f7, #8b5cf6))'
                    }}
                >
                    {/* Inner Glass Shine */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent" />

                    {/* Voice Icon */}
                    <div className="relative z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]">
                        <Mic className="w-24 h-24 text-white" strokeWidth={1.5} />
                    </div>
                </motion.button>
            </div>

            {/* Functional & Instructional Text */}
            <div className="flex flex-col items-center gap-2 min-h-[60px] select-none">
                <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-md">
                    Start Session
                </h2>
                <motion.div
                    initial={{ opacity: 0.5 }}
                    animate={{
                        opacity: isHolding ? 1 : 0.5,
                        scale: isHolding ? 1.05 : 1,
                        color: isHolding ? "#e9d5ff" : "#a3a3a3"
                    }}
                    className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest"
                >
                    {isHolding && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
                    {isHolding ? 'HOLDING...' : 'HOLD TO START'}
                </motion.div>
            </div>
        </div>
    );
};
