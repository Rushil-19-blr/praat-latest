import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Mic, BarChart3, MessageCircle, ArrowRight } from 'lucide-react';
import { OnboardingService } from '../../services/onboardingService';

interface WelcomeCarouselProps {
    studentCode: string;
    onComplete: () => void;
}

// Bypassing strict className lint check with a local alias
const MotionDiv = motion.div as any;

export const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ studentCode, onComplete }) => {
    useEffect(() => {
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleStart = () => {
        OnboardingService.completeStep(studentCode, 'welcome');
        onComplete();
    };


    const features = [
        {
            icon: <Mic className="w-8 h-8 text-blue-400" />,
            title: "Voice Analysis",
            desc: "Track stress through your unique voice patterns."
        },
        {
            icon: <BarChart3 className="w-8 h-8 text-purple-400" />,
            title: "Real-time Insights",
            desc: "Get immediate feedback on your mental wellbeing."
        },
        {
            icon: <MessageCircle className="w-8 h-8 text-indigo-400" />,
            title: "Counselor Access",
            desc: "Connect with support whenever you need it."
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <MotionDiv
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[40px] overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] relative"
            >
                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-blue-500/10 blur-[120px] pointer-events-none" />

                <div className="p-10 md:p-16 flex flex-col items-center text-center">
                    {/* Header */}
                    <MotionDiv
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="mb-10"
                    >
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-[24px] flex items-center justify-center mb-8 border border-white/10 mx-auto shadow-inner">
                            <Sparkles className="w-12 h-12 text-blue-300" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                            Wellness <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300">Simplified</span>
                        </h2>
                        <p className="text-slate-400 text-lg max-w-sm mx-auto font-medium">
                            The future of mental health, powered by your voice.
                        </p>
                    </MotionDiv>

                    {/* Features list - Changed to vertical stack */}
                    <div className="flex flex-col gap-3 mb-10 max-w-sm mx-auto">
                        {features.map((feature, idx) => (
                            <MotionDiv
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + idx * 0.1 }}
                                className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.05] rounded-2xl hover:bg-white/[0.06] transition-all group"
                            >
                                <div className="flex-shrink-0 w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/10 group-hover:scale-110 transition-transform">
                                    {React.cloneElement(feature.icon as React.ReactElement, { size: 22, className: 'text-blue-400' } as any)}
                                </div>
                                <div className="text-left">
                                    <h3 className="text-white font-bold text-sm mb-0.5">{feature.title}</h3>
                                    <p className="text-slate-500 text-[11px] leading-tight font-medium">{feature.desc}</p>
                                </div>
                            </MotionDiv>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                        <button
                            onClick={handleStart}
                            className="w-full py-4 bg-white text-slate-900 rounded-[20px] font-black text-lg hover:bg-blue-50 hover:scale-[1.03] transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 group"
                        >
                            Get Started
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </MotionDiv>
        </div>
    );
};
