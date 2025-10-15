import React, { useState, useRef, useMemo } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from './icons/index';

interface PasswordSetupProps {
  accountNumber: string;
  onSubmit: (password: string) => void;
}

const PasswordSetup: React.FC<PasswordSetupProps> = ({ accountNumber, onSubmit }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pinJoined = useMemo(() => pin.join(''), [pin]);
  const isPinCorrect = useMemo(() => pinJoined === accountNumber, [pinJoined, accountNumber]);
  const isPasswordValid = useMemo(() => password.length >= 6, [password]);
  const doPasswordsMatch = useMemo(() => password === confirmPassword, [password, confirmPassword]);

  const isFormValid = isPinCorrect && isPasswordValid && doPasswordsMatch;

  // Individual digit validation
  const getDigitValidation = (index: number) => {
    if (pin[index] === '') return 'neutral';
    return pin[index] === accountNumber[index] ? 'correct' : 'incorrect';
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    // Allow only single digits
    if (/^[0-9]?$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      if (value && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSubmit(password);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-in-up">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 backdrop-blur-sm">
          <label className="block text-sm font-medium text-slate-300 mb-4">Re-enter your 4-digit Account Number</label>
          <div className="flex items-center gap-4 relative pr-12">
            {pin.map((digit, i) => {
              const validation = getDigitValidation(i);
              const getBorderColor = () => {
                if (validation === 'correct') return 'border-green-500';
                if (validation === 'incorrect') return 'border-red-500';
                return 'border-slate-600';
              };
              const getTextColor = () => {
                if (validation === 'correct') return 'text-green-400';
                if (validation === 'incorrect') return 'text-red-400';
                return 'text-white';
              };
              const getBgColor = () => {
                if (validation === 'correct') return 'bg-green-900/20';
                if (validation === 'incorrect') return 'bg-red-900/20';
                return 'bg-slate-900/50';
              };
              
              return (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(e, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  className={`w-full aspect-square text-3xl text-center rounded-lg border-2 ${getBorderColor()} ${getBgColor()} ${getTextColor()} focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200`}
                />
              );
            })}
            <div className={`absolute -right-2 top-1/2 -translate-y-1/2 text-green-400 transition-opacity duration-300 ${isPinCorrect ? 'opacity-100' : 'opacity-0'}`}>
              <CheckCircleIcon />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 backdrop-blur-sm">
          <label className="block text-sm font-medium text-slate-300 mb-4">Set Your Password</label>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><LockIcon /></span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-slate-900/50 border-2 border-slate-600 rounded-lg text-white py-3.5 pl-12 pr-12 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200 placeholder:text-slate-500"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <div className="relative">
             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><LockIcon /></span>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter Password"
              className="w-full bg-slate-900/50 border-2 border-slate-600 rounded-lg text-white py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200 placeholder:text-slate-500"
            />
          </div>
          {!isPasswordValid && password.length > 0 && <p className="text-red-400 text-xs mt-2 ml-1">Password must be at least 6 characters long.</p>}
          {!doPasswordsMatch && confirmPassword.length > 0 && <p className="text-red-400 text-xs mt-2 ml-1">Passwords do not match.</p>}
        </div>
        
        <button
          type="submit"
          disabled={!isFormValid}
          className="w-full py-4 px-6 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-purple-500/30"
        >
          Create Account
        </button>
      </form>
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

export default PasswordSetup;