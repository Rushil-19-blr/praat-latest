import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FloatingWellbeingBar } from './ui/floating-wellbeing-bar';
import { GamifiedSolutionLibrary } from './ui/gamified-solution-library';
import StudentChatModal from './StudentChatModal';
import { MessageCircle, X } from './Icons';

import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
    onStartVoiceSession: () => void;
    onStartCalibration?: () => void;
    onSignOut?: () => void;
}

interface UserData {
    class?: number;
    section?: string;
    enrollment?: string;
    accountNumber?: string;
    password?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartVoiceSession, onStartCalibration, onSignOut }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string; type: 'immediate' | 'longterm'; completed: boolean }>>([]);
    const accountsButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // Load user data from localStorage
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            try {
                const parsed = JSON.parse(storedUserData);
                setUserData(parsed);
                
                // Load suggestions for gamified library
                const studentCode = parsed.accountNumber;
                if (studentCode) {
                    const suggestionsKey = `suggestions_${studentCode}`;
                    const savedSuggestions = localStorage.getItem(suggestionsKey);
                    if (savedSuggestions) {
                        const suggestionsData = JSON.parse(savedSuggestions);
                        if (suggestionsData.suggestions) {
                            const completionKey = `suggestions_completed_${studentCode}`;
                            const savedCompletion = localStorage.getItem(completionKey);
                            const completedMap = savedCompletion ? JSON.parse(savedCompletion) : {};
                            const suggestionsWithCompletion = suggestionsData.suggestions.map((s: any) => ({
                                ...s,
                                completed: completedMap[s.id] || false
                            }));
                            setSuggestions(suggestionsWithCompletion);
                        }
                    }
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
        
        // Listen for suggestions updates
        const handleSuggestionsUpdate = () => {
            const storedUserData = localStorage.getItem('userData');
            if (storedUserData) {
                try {
                    const parsed = JSON.parse(storedUserData);
                    const studentCode = parsed.accountNumber;
                    if (studentCode) {
                        const suggestionsKey = `suggestions_${studentCode}`;
                        const savedSuggestions = localStorage.getItem(suggestionsKey);
                        if (savedSuggestions) {
                            const suggestionsData = JSON.parse(savedSuggestions);
                            if (suggestionsData.suggestions) {
                                const completionKey = `suggestions_completed_${studentCode}`;
                                const savedCompletion = localStorage.getItem(completionKey);
                                const completedMap = savedCompletion ? JSON.parse(savedCompletion) : {};
                                const suggestionsWithCompletion = suggestionsData.suggestions.map((s: any) => ({
                                    ...s,
                                    completed: completedMap[s.id] || false
                                }));
                                setSuggestions(suggestionsWithCompletion);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error loading suggestions:', error);
                }
            }
        };
        
        window.addEventListener('suggestionsUpdated', handleSuggestionsUpdate);
        return () => window.removeEventListener('suggestionsUpdated', handleSuggestionsUpdate);
    }, []);

    const startSession = useCallback(() => {
        onStartVoiceSession();
    }, [onStartVoiceSession]);

    const logout = useCallback(() => {
        if (confirm('Are you sure you want to logout?')) {
            if (onSignOut) {
                onSignOut();
            } else {
                // Fallback if onSignOut is not provided
                window.location.href = 'signin.html';
            }
        }
    }, [onSignOut]);

    // Close modal when clicking outside
    const handleOutsideClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            setIsModalOpen(false);
        }
    }, []);

    const handleChatOpen = useCallback(() => {
        setIsChatOpen(true);
    }, []);

    const handleChatClose = useCallback(() => {
        setIsChatOpen(false);
    }, []);

    const toggleModal = useCallback(() => {
        setIsModalOpen(prev => !prev);
    }, []);

    // Memoize user display data
    const userDisplayData = useMemo(() => {
        if (!userData) return null;
        return {
            accountInfo: userData.class ? `Class ${userData.class}${userData.section ? ` - Section ${userData.section}` : ''}` : 'Student Account',
            accountCode: userData.accountNumber || '----',
            studentName: userData.enrollment || `Student ${userData.accountNumber}`,
            hasAccountNumber: !!userData.accountNumber
        };
    }, [userData]);

    return (
        <>
            <style>{`
                body {
                    margin: 0;
                    padding: 0;
                    background-color: transparent;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #ffffff;
                    min-height: 100vh;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 40px;
                    background-color: transparent;
                    width: 100%;
                }

                .header .flex {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .app-logo h1 {
                    margin: 0;
                    font-size: 36px;
                    font-weight: 700;
                    background: linear-gradient(135deg, #a855f7, #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .accounts-btn {
                    background: none;
                    border: 1px solid #333333;
                    border-radius: 50px;
                    padding: 12px;
                    color: #a0a0a0;
                    cursor: pointer;
                    transition: border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease;
                    position: relative;
                    z-index: 1001;
                }

                .accounts-btn:hover {
                    border-color: #a855f7;
                    color: #a855f7;
                }

                .accounts-btn.active {
                    border-color: #a855f7;
                    color: #a855f7;
                    background-color: rgba(168, 85, 247, 0.1);
                }

                .accounts-icon {
                    width: 20px;
                    height: 20px;
                    fill: currentColor;
                    stroke: currentColor;
                    transition: transform 0.3s ease;
                }

                .main-content {
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 40px;
                    padding-bottom: 100px;
                    max-width: 2000px;
                    margin: 0 auto;
                    width: 100%;
                    min-height: calc(100vh - 100px);
                }

                .calibration-section {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    z-index: 100;
                }



                .notification-dot {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 12px;
                    height: 12px;
                    background-color: #ef4444;
                    border-radius: 50%;
                    border: 2px solid #000000;
                    z-index: 10;
                }

                .accounts-btn {
                    position: relative;
                }

                .wellbeing-widget {
                    width: fit-content;
                    max-width: fit-content;
                }

                .session-section {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }

                .start-session-btn {
                    background: linear-gradient(135deg, #a855f7, #8b5cf6);
                    border: none;
                    border-radius: 50%; /* Fully round */
                    width: 250px;
                    height: 250px;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 30px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2);
                    position: relative;
                }
                
                .start-session-btn::before {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #a855f7, #8b5cf6);
                    opacity: 0.3;
                    filter: blur(12px);
                    z-index: -1;
                    animation: pulse-glow 2s ease-in-out infinite;
                }
                
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }

                .start-session-btn:hover {
                    transform: translateY(-2px) scale(1.05);
                    box-shadow: 0 15px 30px rgba(168, 85, 247, 0.4);
                }

                .calibration-btn {
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    border: none;
                    border-radius: 12px;
                    padding: 12px 20px;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4);
                    font-size: 15px;
                    font-weight: 600;
                    color: #000000;
                }

                .calibration-btn:hover {
                    transform: translateY(-2px) scale(1.05);
                    box-shadow: 0 8px 24px rgba(251, 191, 36, 0.5);
                }

                .voice-icon {
                    width: 125px;
                    height: 125px;
                    fill: #ffffff;
                }

                .calibration-icon {
                    width: 16px;
                    height: 16px;
                    fill: #000000;
                }

                .session-text {
                    font-size: 28px;
                    font-weight: 600;
                    color: #ffffff;
                    text-align: center;
                    margin-top: 10px;
                    text-shadow: 0 2px 10px rgba(168, 85, 247, 0.3);
                }


                /* Popup Styles */
                .modal-overlay {
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(2px);
                }

                .modal-content {
                    background: linear-gradient(135deg, #2a2a2a 0%, #1d1d1d 100%);
                    padding: 30px;
                    border-radius: 20px;
                    width: 320px;
                    border: 1px solid #444444;
                    position: fixed;
                    top: 80px;
                    right: 40px;
                    z-index: 1001;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }

                .close {
                    position: absolute;
                    right: 15px;
                    top: 15px;
                    color: #a0a0a0;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                }

                .close:hover {
                    color: #ffffff;
                }

                .account-info {
                    text-align: center;
                    margin-bottom: 20px;
                }

                .account-name {
                    font-size: 20px;
                    font-weight: 600;
                    color: #ffffff;
                    margin-bottom: 5px;
                }

                .account-code {
                    font-size: 14px;
                    color: #a0a0a0;
                    font-weight: 400;
                }

                .logout-btn {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    border: none;
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #ffffff;
                    cursor: pointer;
                    width: 100%;
                    transition: opacity 0.2s ease;
                }

                .logout-btn:hover {
                    opacity: 0.9;
                }
            `}</style>
            <div className="header">
                <div className="app-logo">
                    <h1>AWAAZ</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        className="accounts-btn"
                        onClick={handleChatOpen}
                        title="Messages"
                    >
                        <MessageCircle className="accounts-icon" />
                        <span className="notification-dot"></span>
                    </button>
                    <button
                        ref={accountsButtonRef}
                        className={`accounts-btn ${isModalOpen ? 'active' : ''}`}
                        onClick={toggleModal}
                    >
                        <motion.div
                            animate={{ rotate: isModalOpen ? 90 : 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            {isModalOpen ? (
                                <X className="accounts-icon" />
                            ) : (
                                <svg className="accounts-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            )}
                        </motion.div>
                    </button>
                </div>
            </div>

            <div className="main-content">
                <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md mx-auto">
                    <div className="session-section relative z-20 w-full flex flex-col items-center">
                        <button className="start-session-btn" onClick={startSession}>
                            <svg className="voice-icon" width="125" height="125" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                <path d="M256 32c-44.2 0-80 35.8-80 80v160c0 44.2 35.8 80 80 80s80-35.8 80-80V112c0-44.2-35.8-80-80-80z" fill="#ffffff" />
                                <path d="M128 240v32c0 70.7 57.3 128 128 128s128-57.3 128-128v-32c0-8.8 7.2-16 16-16s16 7.2 16 16v32c0 83.5-63.8 152.1-145.5 159.5V496h65.5c8.8 0 16 7.2 16 16s-7.2 16-16 16h-160c-8.8 0-16-7.2-16-16s7.2-16 16-16h65.5v-64.5C160.8 424.1 97 355.5 97 272v-32c0-8.8 7.2-16 16-16s16 7.2 16 16z" fill="#ffffff" />
                            </svg>
                        </button>
                        <div className="session-text">Start a Session</div>
                    </div>

                    {/* Floating Wellbeing Bar - Positioned below Start Session */}
                    <div className="w-full relative z-10">
                        <FloatingWellbeingBar />
                    </div>
                    
                    {/* Gamified Solution Library */}
                    {suggestions.length > 0 && (
                        <div className="w-full relative z-10 mt-6">
                            <GamifiedSolutionLibrary suggestions={suggestions} />
                        </div>
                    )}
                </div>

                {onStartCalibration && (
                    <div className="calibration-section">
                        <button
                            onClick={onStartCalibration}
                            className="calibration-btn"
                            title="Calibration"
                        >
                            <svg className="calibration-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                            </svg>
                            <span>Your Voice</span>
                        </button>
                    </div>
                )}
            </div>



            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            className="modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={handleOutsideClick}
                        />
                        <motion.div
                            className="modal-content"
                            initial={{
                                opacity: 0,
                                scale: 0.8,
                                y: -20,
                                x: 20
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                x: 0
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.8,
                                y: -20,
                                x: 20
                            }}
                            transition={{
                                duration: 0.3,
                                ease: [0.4, 0, 0.2, 1]
                            }}
                        >
                            <div className="account-info">
                                <div className="account-name">
                                    {userDisplayData?.accountInfo || 'Student Account'}
                                </div>
                                <div className="account-code">{userDisplayData?.accountCode || '----'}</div>
                            </div>
                            <button className="logout-btn" onClick={logout}>Logout</button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Student Chat Modal */}
            {userDisplayData?.hasAccountNumber && (
                <StudentChatModal
                    isOpen={isChatOpen}
                    onClose={handleChatClose}
                    studentId={userData!.accountNumber!}
                    studentName={userDisplayData.studentName}
                />
            )}
        </>
    );
};

export default Dashboard;