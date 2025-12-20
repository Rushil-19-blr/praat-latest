import React, { useState } from 'react';
import { ScratchToReveal } from './ui/scratch-to-reveal';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';

interface ScratchCardProps {
  accountNumber: string;
  onComplete: () => void;
}

const ScratchCard: React.FC<ScratchCardProps> = ({ accountNumber, onComplete }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleScratchComplete = () => {
    setIsRevealed(true);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-[440px] mx-auto p-6 animate-in fade-in zoom-in-95 duration-500">
      <GlassCard className="w-full p-8 md:p-10 !rounded-[40px] border-white/10 shadow-3xl text-center">
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic mb-2">SECRET REVEAL</h1>
        <p className="text-[10px] font-black text-white/20 mb-8 uppercase tracking-[0.2em] leading-relaxed">
          Scratch the panel below to <span className="text-purple-400">Unlock</span> your unique ID.
        </p>

        <div className="flex justify-center mb-6 p-1.5 bg-black/40 rounded-[32px] border border-white/5 shadow-inner">
          <ScratchToReveal
            width={280}
            height={160}
            minScratchPercentage={70}
            className="flex items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-black/60 shadow-2xl"
            onScratchComplete={handleScratchComplete}
            gradientColors={["#a855f7", "#6366f1", "#4f46e5"]}
          >
            <span className="text-5xl font-black tracking-[0.2em] text-white bg-gradient-to-br from-white to-white/60 bg-clip-text">
              {accountNumber}
            </span>
          </ScratchToReveal>
        </div>

        <p className="text-[9px] font-bold text-white/10 uppercase tracking-[0.2em] mb-8 max-w-[200px] mx-auto">
          This 4-digit security code is your permanent access credential.
        </p>

        <button
          onClick={onComplete}
          disabled={!isRevealed}
          className={cn(
            "w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 shadow-2xl",
            isRevealed
              ? "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-500/30 opacity-100 translate-y-0 hover:scale-[1.02] active:scale-[0.98]"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          Secure & Proceed
        </button>
      </GlassCard>
    </div>
  );
};

export default ScratchCard;