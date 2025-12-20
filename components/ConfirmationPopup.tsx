import React from 'react';
import GlassCard from './GlassCard';
import { cn } from '../lib/utils';

interface ConfirmationPopupProps {
  classNumber: number;
  section: string;
  onConfirm: () => void;
  onRetry: () => void;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({ classNumber, section, onConfirm, onRetry }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-sm p-8 md:p-10 !rounded-[32px] border-white/10 shadow-2xl text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
          <span className="text-3xl">🎯</span>
        </div>

        <h2 className="text-2xl font-black tracking-widest text-white uppercase italic mb-2">VERIFY IDENTITY</h2>
        <p className="text-[10px] font-bold text-white/40 mb-10 uppercase tracking-[0.2em] leading-relaxed">
          You have selected <span className="text-purple-400">Class {classNumber}</span>, <span className="text-indigo-400">Section {section}</span>.
        </p>

        <div className="flex w-full gap-3">
          <button
            onClick={onRetry}
            className="flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-wider text-white/40 hover:text-white/60 hover:bg-white/5 transition-all duration-200"
          >
            Retry
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Confirm
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default ConfirmationPopup;