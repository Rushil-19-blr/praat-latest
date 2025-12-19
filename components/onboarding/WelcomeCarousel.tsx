'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Mic, Activity, Trophy, X } from 'lucide-react';
import { OnboardingService } from '../../services/onboardingService';

interface WelcomeCarouselProps {
    studentCode: string;
    onComplete: () => void;
}

const SLIDES = [
    {
        id: 0,
        title: "Voice-Powered Stress Relief",
        body: "We analyze your voice to track stress levels and guide you through personalized wellness activities.",
        icon: <Mic className="w-16 h-16 text-white" />,
        color: "from-purple-500 to-indigo-600"
    },
    {
        id: 1,
        title: "Quick Voice Calibration",
        body: "First, we'll learn your unique voice patterns. This helps us give you accurate stress insights.",
        icon: <Activity className="w-16 h-16 text-white" />,
        color: "from-blue-500 to-cyan-500"
    },
    {
        id: 2,
        title: "Earn Rewards as You Progress",
        body: "Complete tasks to unlock badges and level up from Wood to Diamond—each tier unlocks new app colors!",
        icon: <Trophy className="w-16 h-16 text-white" />,
        color: "from-yellow-500 to-orange-500"
    }
];

export const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ studentCode, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
        } else {
            // Finish
            OnboardingService.completeStep(studentCode, 'welcome');
            onComplete();
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSkip = () => {
        OnboardingService.skipOnboarding(studentCode);
        onComplete();
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.8
        })
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative">

                {/* Skip Button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-medium z-20 underline"
                >
                    Skip Tour
                </button>

                <div className="relative min-h-[600px] flex flex-col">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                            }}
                            className="absolute inset-0 flex flex-col items-center p-8 text-center"
                        >
                            {/* Visual Area (55%) */}
                            <div className={`w-full flex-[1.2] flex items-center justify-center rounded-3xl mb-10 bg-gradient-to-br ${SLIDES[currentIndex].color} shadow-2xl relative overflow-hidden group`}>
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {SLIDES[currentIndex].icon}
                                </motion.div>
                            </div>

                            {/* Text Area (35%) */}
                            <div className="w-full mb-10 px-4">
                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-3xl font-extrabold text-white mb-4 tracking-tight"
                                >
                                    {SLIDES[currentIndex].title}
                                </motion.h2>
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-slate-300 text-lg leading-relaxed max-w-md mx-auto"
                                >
                                    {SLIDES[currentIndex].body}
                                </motion.p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation (10%) */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-slate-900/50 backdrop-blur-sm border-t border-slate-800 flex items-center justify-between z-10">
                    <div className="flex gap-2">
                        {SLIDES.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${idx === currentIndex ? 'bg-white' : 'bg-slate-600'}`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-4">
                        {currentIndex > 0 && (
                            <button
                                onClick={handleBack}
                                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            {currentIndex === SLIDES.length - 1 ? 'Get Started!' : 'Next'}
                            {currentIndex < SLIDES.length - 1 && <ArrowRight size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
