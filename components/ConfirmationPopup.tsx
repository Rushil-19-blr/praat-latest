import React from 'react';

interface ConfirmationPopupProps {
  classNumber: number;
  section: string;
  onConfirm: () => void;
  onRetry: () => void;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({ classNumber, section, onConfirm, onRetry }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800/80 rounded-2xl p-8 border border-slate-700 shadow-2xl text-center max-w-sm mx-auto animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white mb-4">Confirm Selection</h2>
        <p className="text-slate-300 text-lg mb-8">
          You selected: <span className="font-bold text-purple-400">Class {classNumber}, Section {section}</span>
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onRetry}
            className="px-8 py-3 rounded-xl text-white font-semibold bg-slate-700 hover:bg-slate-600 transition-colors duration-200"
          >
            Retry
          </button>
          <button
            onClick={onConfirm}
            className="px-8 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-purple-500/20"
          >
            Confirm
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ConfirmationPopup;