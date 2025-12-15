import React, { useState, useRef } from 'react';
import { BeamsBackground } from './ui/beams-background';
import { SpinnerIcon } from './icons';

interface SignInScreenProps {
  onSignIn: (code: string, password: string, userType: 'student' | 'teacher') => void;
  onCreateAccount: () => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ onSignIn, onCreateAccount }) => {
  const [code, setCode] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [sliderKey, setSliderKey] = useState(0);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const codeString = code.join('');

    if (codeString.length !== 4) {
      setError('Please enter a 4-digit code');
      setSliderKey(prev => prev + 1); // Reset slider
      return;
    }

    if (!password) {
      setError('Please enter your password');
      setSliderKey(prev => prev + 1); // Reset slider
      return;
    }

    setIsLoading(true);
    try {
      await onSignIn(codeString, password, userType);
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Sign in failed. Please check your credentials.');
      setSliderKey(prev => prev + 1); // Reset slider on error
    } finally {
      setIsLoading(false);
    }
  };

  const getGlassmorphicEffect = () => {
    return 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-lg';
  };

  const getInputBorder = (hasError: boolean) => {
    return hasError
      ? 'border-2 border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
      : 'border-2 border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30';
  };

  return (
    <div className="fixed inset-0 m-0 p-0 bg-transparent font-sans flex justify-center items-center min-h-screen w-full text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <BeamsBackground intensity="medium" />
      </div>
      <div
        className={`
        ${getGlassmorphicEffect()}
        rounded-2xl p-10 shadow-2xl w-full max-w-md border border-white/10
        relative z-10
      `}
      >
        <div className="text-center mb-8">
          <h1
            className="
            text-white text-3xl font-semibold m-0
            bg-gradient-to-r from-purple-500 to-indigo-600
            bg-clip-text text-transparent
          "
          >
            AWAAZ
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* User Type Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400 font-medium">
              Login As
            </label>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setUserType('student')}
                className={`
                  flex-1 py-3 px-4 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200
                  ${userType === 'student' ? 'bg-purple-600 border-2 border-purple-600' : 'bg-gray-800 border-2 border-gray-700'}
                `}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setUserType('teacher')}
                className={`
                  flex-1 py-3 px-4 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200
                  ${userType === 'teacher' ? 'bg-purple-600 border-2 border-purple-600' : 'bg-gray-800 border-2 border-gray-700'}
                `}
              >
                Teacher
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400 font-medium">
              {userType === 'teacher' ? 'Admin Code' : '4-Digit Code'}
            </label>
            <div className="flex justify-between gap-2 mt-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (codeInputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  pattern="[0-9]"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className={`
                    w-16 h-16 bg-gray-800 rounded-lg text-2xl text-center text-white
                    outline-none transition-all duration-200
                    ${getInputBorder(!!error && code.join('').length !== 4)}
                  `}
                  required
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 relative">
            <label className="text-sm text-gray-400 font-medium">
              {userType === 'teacher' ? 'Admin Password' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={userType === 'teacher' ? 'Enter admin password' : 'Enter your password'}
                className={`
                  bg-gray-800 rounded-xl py-3 pr-10 pl-4 text-base text-white
                  outline-none transition-all duration-200 w-full box-border
                  ${getInputBorder(!!error && !password)}
                `}
                required
              />
              <button
                type="button"
                onClick={togglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-gray-500 cursor-pointer text-xl"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-xl text-white font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-purple-500/30 flex items-center justify-center"
          >
            {isLoading ? <SpinnerIcon /> : `Sign in as ${userType === 'teacher' ? 'Teacher' : 'Student'}`}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-gray-700">
          <p className="m-0 text-gray-400 text-sm">
            Don't have an account?{' '}
            <button
              onClick={onCreateAccount}
              className="text-purple-500 no-underline font-semibold bg-none border-none cursor-pointer text-sm hover:underline"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInScreen;

