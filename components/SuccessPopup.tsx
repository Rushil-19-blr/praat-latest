import React from 'react';
import { motion } from 'framer-motion';

interface SuccessPopupProps {
  accountNumber: string;
  onProceed: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ accountNumber, onProceed }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative bg-slate-800 rounded-2xl p-8 border border-green-500/30 shadow-2xl text-center max-w-md mx-auto overflow-hidden"
      >
        <div 
          className="absolute inset-0 bg-repeat bg-center opacity-5"
          style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a78bfa' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}>
        </div>
        <div className="relative">
            <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Account Created!</h2>
            <p className="text-slate-300 text-md mb-6">
              Your account number is <span className="font-bold text-lg text-purple-400 tracking-widest bg-slate-700 px-3 py-1.5 rounded-md inline-block">{accountNumber}</span>.
            </p>
            <p className="text-slate-400 text-sm mb-8">
                You can now use this number to log in.
            </p>
            <button
              onClick={onProceed}
              className="w-full py-3 px-6 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-purple-500/20"
            >
              Get Started
            </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessPopup;