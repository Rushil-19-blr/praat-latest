import React, { useState, useRef } from 'react';

interface SignInScreenProps {
  onSignIn: (code: string, password: string, userType: 'student' | 'teacher') => void;
  onCreateAccount: () => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ onSignIn, onCreateAccount }) => {
  const [code, setCode] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeString = code.join('');
    
    if (codeString.length !== 4) {
      alert('Please enter a 4-digit code');
      return;
    }
    
    if (!password) {
      alert('Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      await onSignIn(codeString, password, userType);
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      margin: 0,
      padding: 0,
      backgroundColor: '#000000',
      fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #333333'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: 600,
            margin: 0,
            background: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Voice Analyser
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Type Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#a0a0a0', fontWeight: 500 }}>
              Login As
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setUserType('student')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: userType === 'student' ? '#a855f7' : '#1a1a1a',
                  border: `2px solid ${userType === 'student' ? '#a855f7' : '#333333'}`,
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setUserType('teacher')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: userType === 'teacher' ? '#a855f7' : '#1a1a1a',
                  border: `2px solid ${userType === 'teacher' ? '#a855f7' : '#333333'}`,
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Teacher
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#a0a0a0', fontWeight: 500 }}>
              {userType === 'teacher' ? 'Admin Code' : '4-Digit Code'}
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '8px' }}>
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
                  style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #333333',
                    borderRadius: '8px',
                    fontSize: '24px',
                    textAlign: 'center',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#a855f7';
                    e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <label style={{ fontSize: '14px', color: '#a0a0a0', fontWeight: 500 }}>
              {userType === 'teacher' ? 'Admin Password' : 'Password'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={userType === 'teacher' ? 'Enter admin password' : 'Enter your password'}
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '12px',
                  padding: '12px 40px 12px 16px',
                  fontSize: '16px',
                  color: '#ffffff',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#a855f7';
                  e.target.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#333333';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
              <button
                type="button"
                onClick={togglePassword}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#666666',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              marginTop: '10px',
              opacity: isLoading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(168, 85, 247, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #333333'
        }}>
          <p style={{ margin: 0, color: '#a0a0a0', fontSize: '14px' }}>
            Don't have an account?{' '}
            <button
              onClick={onCreateAccount}
              style={{
                color: '#a855f7',
                textDecoration: 'none',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
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
