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

            {/* Top */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute bg-black/70 pointer-events-auto"
                style={{ top: 0, left: 0, right: 0, height: targetRect.top }}
            />
            {/* Bottom */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute bg-black/70 pointer-events-auto"
                style={{ top: targetRect.bottom, left: 0, right: 0, bottom: 0 }}
            />
            {/* Left */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute bg-black/70 pointer-events-auto"
                style={{ top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height }}
            />
            {/* Right */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute bg-black/70 pointer-events-auto"
                style={{ top: targetRect.top, left: targetRect.right, right: 0, height: targetRect.height }}
            />

            {/* Glowing Border around Target */}
            <motion.div
                className="absolute border-4 border-yellow-400 rounded-xl pointer-events-none"
                style={{
                    top: targetRect.top - 4,
                    left: targetRect.left - 4,
                    width: targetRect.width + 8,
                    height: targetRect.height + 8
                }}
                animate={{
                    boxShadow: ["0 0 0px rgba(250, 204, 21, 0)", "0 0 20px rgba(250, 204, 21, 0.6)", "0 0 0px rgba(250, 204, 21, 0)"],
                    scale: [1, 1.02, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
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
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white text-slate-900 p-5 rounded-xl shadow-2xl border border-slate-200"
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{title}</h3>
                        <button onClick={handleSkip} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>
                    <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-end items-center">
                        <button
                            onClick={handleSkip}
                            className="text-xs text-slate-400 font-medium underline hover:text-slate-600"
                        >
                            Skip Tour
                        </button>
                        <button
                            onClick={onComplete}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                        >
                            {actionLabel}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
