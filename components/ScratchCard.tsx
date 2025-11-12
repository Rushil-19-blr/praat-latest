import React, { useState } from 'react';
import { ScratchToReveal } from './ui/scratch-to-reveal';

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
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto animate-fade-in p-4">
      <h1 className="text-4xl font-bold text-slate-100 mb-2">Your Account Number</h1>
      <p className="text-slate-400 mb-8 text-center">Scratch the card below to reveal your unique 4-digit ID.</p>
      
      <ScratchToReveal
        width={600}
        height={300}
        minScratchPercentage={70}
        className="flex items-center justify-center overflow-hidden rounded-2xl border-2 border-purple-500/80 bg-slate-900 shadow-2xl"
        onScratchComplete={handleScratchComplete}
        gradientColors={["#7C3AED", "#8B5CF6", "#A855F7"]}
      >
        <span className="text-7xl font-bold tracking-[0.2em] text-white">{accountNumber}</span>
      </ScratchToReveal>

      <p className="text-sm text-slate-500 mt-8 text-center">Remember this 4-digit number - it's your unique account ID.</p>
      
      <div className="w-full max-w-sm mt-8">
        <button
          onClick={onComplete}
          disabled={!isRevealed}
          className={`w-full py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all duration-500 shadow-lg shadow-purple-500/20 ${
            isRevealed 
              ? 'opacity-100 pointer-events-auto animate-fade-in-up' 
              : 'opacity-0 pointer-events-none'
          }`}
        >
          Proceed
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ScratchCard;