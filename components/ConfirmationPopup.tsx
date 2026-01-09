import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';

// HACK: Cast motion components to 'any' to bypass type errors.
const MotionDiv = motion.div as any;

interface ConfirmationPopupProps {
  classNumber: number;
  section: string;
  onConfirm: () => void;
  onRetry: () => void;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({ classNumber, section, onConfirm, onRetry }) => {
  return (
    <MotionDiv
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4"
    >
      <GlassCard className="w-full max-w-sm p-8 md:p-10 !rounded-[32px] border-white/10 shadow-2xl text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
          <span className="text-3xl">🎯</span>
        </div>

        <h2 className="text-2xl font-black tracking-widest text-white uppercase italic mb-3 drop-shadow-sm">VERIFY IDENTITY</h2>
        <div className="text-[11px] font-bold text-white/60 mb-8 uppercase tracking-[0.15em] leading-relaxed max-w-[260px]">
          You have selected <br />
          <span className="text-purple-300 text-sm block mt-2 mb-1 shadow-purple-500/50 drop-shadow-sm">Class {classNumber}</span>
          <span className="text-white/30 text-[9px] mx-2 tracking-widest">— TO —</span>
          <span className="text-indigo-300 text-sm block mt-1 shadow-indigo-500/50 drop-shadow-sm">Section {section}</span>
        </div>

        <div className="flex w-full gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white/80 hover:bg-white/5 active:scale-95 transition-all duration-200"
          >
            Retry
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.95] ring-1 ring-white/20 transition-all duration-300"
          >
            Confirm
          </button>
        </div>
      </GlassCard>
    </MotionDiv>

  );
};

export default ConfirmationPopup;