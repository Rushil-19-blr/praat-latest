import React, { useState, useEffect } from 'react';
import { Component as PlayfulTodoList } from './ui/playful-todolist';
import StudentChatModal from './StudentChatModal';
import { MessageCircle } from './Icons';
import NotificationPanel from './NotificationPanel';
import { LiquidButton } from './ui/liquid-button';
import StudentChatModal from './StudentChatModal';
import { MessageCircle } from './Icons';
import NotificationPanel from './NotificationPanel';
import { LiquidButton } from './ui/liquid-button';

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
    const [userData, setUserData] = useState<UserData | null>(null);

    useEffect(() => {
        // Load user data from localStorage
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            try {
                const parsed = JSON.parse(storedUserData);
                setUserData(parsed);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }, []);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const startSession = () => {
        onStartVoiceSession();
        alert('Starting a new voice analysis session!');
    };

    const logout = () => {
        if (confirm('Are you sure you want to logout?')) {
            if (onSignOut) {
                onSignOut();
            } else {
                // Fallback if onSignOut is not provided
                window.location.href = 'signin.html';
            }
        }
    };

    // Close modal when clicking outside
    const handleOutsideClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            closeModal();
        }
    };

    return (
        <>
            <style>{`
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #000000;
                    font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
                    color: #ffffff;
                    min-height: 100vh;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 40px;
                    background-color: #000000;
                }

                .app-logo h1 {
                    margin: 0;
                    font-size: 24px;
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
                    transition: border-color 0.2s ease, color 0.2s ease;
                }

                .accounts-btn:hover {
                    border-color: #a855f7;
                    color: #a855f7;
                }

                .accounts-icon {
                    width: 20px;
                    height: 20px;
                    fill: currentColor;
                }

                .main-content {
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 40px;
                    padding-bottom: 100px;
                }

                .calibration-section {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 100;
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
                    width: 150px;
                    height: 150px;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 20px rgba(168, 85, 247, 0.3);
                }

                .start-session-btn:hover {
                    transform: translateY(-2px) scale(1.05);
                    box-shadow: 0 15px 30px rgba(168, 85, 247, 0.4);
                }

                .calibration-btn {
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    border: none;
                    border-radius: 12px;
                    padding: 8px 16px;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
                    font-size: 14px;
                    font-weight: 600;
                    color: #000000;
                }

                .calibration-btn:hover {
                    transform: translateY(-1px) scale(1.02);
                    box-shadow: 0 6px 16px rgba(251, 191, 36, 0.4);
                }

                .voice-icon {
                    width: 75px;
                    height: 75px;
                    fill: #ffffff;
                }

                .calibration-icon {
                    width: 16px;
                    height: 16px;
                    fill: #000000;
                }

                .session-text {
                    font-size: 18px;
                    font-weight: 600;
                    color: #ffffff;
                    text-align: center;
                    margin-top: 10px;
                }


                /* Popup Styles */
                .modal {
                    display: ${isModalOpen ? 'block' : 'none'};
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(5px);
                }

                .modal-content {
                    background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
                    margin: 15% auto;
                    padding: 30px;
                    border-radius: 20px;
                    width: 90%;
                    max-width: 400px;
                    border: 1px solid #333333;
                    position: relative;
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
                    <h1>Voice Analyser</h1>
                </div>
                <button className="accounts-btn" onClick={openModal}>
                    <svg className="accounts-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                </button>
            </div>

            <div className="main-content">
                <div className="wellbeing-widget">
                    <PlayfulTodoList />
                </div>

                <div className="session-section">
                    <button className="start-session-btn" onClick={startSession}>
                        <svg className="voice-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="75" height="75">
                            {/* 9 vertical bars in symmetrical equalizer pattern - pink/magenta color */}
                            {/* Left side: medium, medium-tall, tall, very tall */}
                            <rect x="2" y="14" width="2" height="6" rx="1" fill="#f472b6" />
                            <rect x="4.5" y="11" width="2" height="9" rx="1" fill="#f472b6" />
                            <rect x="7" y="8" width="2" height="12" rx="1" fill="#f472b6" />
                            <rect x="9.5" y="5" width="2" height="15" rx="1" fill="#f472b6" />
                            {/* Center bar: tallest */}
                            <rect x="12" y="3" width="2" height="18" rx="1" fill="#f472b6" />
                            {/* Right side: very tall, tall, medium-tall, medium */}
                            <rect x="14.5" y="5" width="2" height="15" rx="1" fill="#f472b6" />
                            <rect x="17" y="8" width="2" height="12" rx="1" fill="#f472b6" />
                            <rect x="19.5" y="11" width="2" height="9" rx="1" fill="#f472b6" />
                            <rect x="22" y="14" width="2" height="6" rx="1" fill="#f472b6" />
                        </svg>
                    </button>
                    <div className="session-text">Start a Session</div>
                </div>
            </div>

            {onStartCalibration && (
                <div className="calibration-section">
                    <button className="calibration-btn" onClick={onStartCalibration}>
                        <svg className="calibration-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17.3 11c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                        </svg>
                        <span>Calibrate</span>
                    </button>
                </div>
            )}

            <div id="accountsModal" className="modal" onClick={handleOutsideClick}>
                <div className="modal-content">
                    <span className="close" onClick={closeModal}>&times;</span>
                    <div className="account-info">
                        <div className="account-name">
                            {userData?.class ? `Class ${userData.class}${userData.section ? ` - Section ${userData.section}` : ''}` : 'Student Account'}
                        </div>
                        <div className="account-code">{userData?.accountNumber || '----'}</div>
                    </div>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
            </div>
        </>
    );
};

export default Dashboard;