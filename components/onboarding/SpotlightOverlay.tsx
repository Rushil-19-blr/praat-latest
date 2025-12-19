'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { OnboardingService } from '../../services/onboardingService';

interface SpotlightOverlayProps {
    targetId: string; // ID of the element to highlight
    title: string;
    message: string;
    onComplete: () => void;
    onSkip: () => void;
    actionLabel?: string;
    studentCode: string;
}

export const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({
    targetId,
    title,
    message,
    onComplete,
    onSkip,
    actionLabel = "Next",
    studentCode
}) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });

    useEffect(() => {
        const updatePosition = () => {
            const element = document.getElementById(targetId);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);

                // Calculate logic for tooltip placement (defaulting to below for now)
                // This can be enhanced to auto-detect best side
                setTooltipPosition({
                    top: rect.bottom + 20,
                    left: rect.left + (rect.width / 2) - 150 // Center align roughly
                });
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);

        // Polling in case of layout shifts
        const interval = setInterval(updatePosition, 500);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
            clearInterval(interval);
        };
    }, [targetId]);

    const handleSkip = () => {
        OnboardingService.skipOnboarding(studentCode);
        onSkip();
    };

    if (!targetRect) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
            {/* Dark Overlay with cutout using multiple divs approach or SVG mask. 
                Using simplistic 4-div approach for robust click-through prevention on overlay but access to target. 
            */}

            {/* 4-div approach for robust click-through prevention on overlay but access to target. */}
            {/* Tapping anywhere on these divs will complete the spotlight. */}

            {/* Top */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute bg-black/90 backdrop-blur-md pointer-events-auto cursor-pointer"
                style={{ top: 0, left: 0, right: 0, height: targetRect.top }}
                onClick={onComplete}
            />
            {/* Bottom */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute bg-black/90 backdrop-blur-md pointer-events-auto cursor-pointer"
                style={{ top: targetRect.bottom, left: 0, right: 0, bottom: 0 }}
                onClick={onComplete}
            />
            {/* Left */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute bg-black/90 backdrop-blur-md pointer-events-auto cursor-pointer"
                style={{ top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height }}
                onClick={onComplete}
            />
            {/* Right */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute bg-black/90 backdrop-blur-md pointer-events-auto cursor-pointer"
                style={{ top: targetRect.top, left: targetRect.right, right: 0, height: targetRect.height }}
                onClick={onComplete}
            />

            {/* White Circular/Rounded Border around Target */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: 1,
                    boxShadow: [
                        "0 0 0px 0px rgba(255, 255, 255, 0)",
                        "0 0 20px 4px rgba(255, 255, 255, 0.4)",
                        "0 0 0px 0px rgba(255, 255, 255, 0)"
                    ]
                }}
                className="absolute border-4 border-white rounded-2xl pointer-events-none z-50"
                style={{
                    top: targetRect.top - 8,
                    left: targetRect.left - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16
                }}
                transition={{
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.3 }
                }}
            />

            {/* Tooltip Bubble */}
            <div
                className="absolute pointer-events-auto flex flex-col items-center"
                style={{
                    top: tooltipPosition.top,
                    left: Math.max(20, Math.min(window.innerWidth - 320, tooltipPosition.left)),
                    width: 300
                }}
            >
                {/* Arrow pointing up */}
                <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white mb-[-1px]" />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white text-slate-900 p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200"
                >
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-extrabold text-xl text-blue-600">{title}</h3>
                        <button onClick={handleSkip} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-slate-600 mb-6 text-base leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-4 justify-end items-center">
                        <button
                            onClick={handleSkip}
                            className="text-sm text-slate-400 font-semibold underline hover:text-slate-500"
                        >
                            Skip
                        </button>
                        <button
                            onClick={onComplete}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/25"
                        >
                            {actionLabel}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
