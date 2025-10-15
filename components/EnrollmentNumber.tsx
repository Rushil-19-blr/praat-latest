import React, { useState } from 'react';

interface EnrollmentNumberProps {
  onSubmit: (enrollmentNumber: string) => void;
}

const EnrollmentNumber: React.FC<EnrollmentNumberProps> = ({ onSubmit }) => {
  const [enrollmentNumber, setEnrollmentNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enrollmentNumber.trim()) {
      onSubmit(enrollmentNumber.trim());
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-800/50 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-fade-in-up backdrop-blur-sm">
      <div className="p-8 md:p-12 text-center">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Enrollment Number</h1>
        <p className="text-slate-400 mb-8">Please enter your assigned enrollment number.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={enrollmentNumber}
            onChange={(e) => setEnrollmentNumber(e.target.value)}
            className="w-full bg-slate-900/70 border-2 border-slate-700 rounded-lg text-white text-center text-2xl py-3 px-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200 placeholder:text-slate-500"
            placeholder="e.g., 123456"
            autoFocus
          />
          <button
            type="submit"
            disabled={!enrollmentNumber.trim()}
            className="w-full mt-8 py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-purple-500/20"
          >
            Submit
          </button>
        </form>
      </div>
      <div className="w-full h-2 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
       <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default EnrollmentNumber;