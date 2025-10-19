import React, { useState } from 'react';

interface DashboardProps {
  onStartVoiceSession: () => void;
  onSignOut?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartVoiceSession, onSignOut }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #ffffff;
                    min-height: 100vh;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 40px;
                    background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
                    border-bottom: 1px solid #333333;
                }

                .app-logo h1 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
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
                }

                .streaks-widget {
                    background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
                    border-radius: 20px;
                    padding: 30px;
                    width: 100%;
                    max-width: 600px;
                    border: 1px solid #333333;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }

                .streaks-title {
                    text-align: center;
                    margin-bottom: 20px;
                    font-size: 20px;
                    font-weight: 600;
                    color: #ffffff;
                }

                .streaks-container {
                    display: flex;
                    justify-content: space-around;
                    align-items: flex-end;
                    height: 120px;
                    gap: 10px;
                }

                .streak-month {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                }

                .month-label {
                    font-size: 12px;
                    color: #a0a0a0;
                    margin-bottom: 5px;
                }

                .flame {
                    font-size: 28px; /* Base size increased for better visibility */
                    transition: transform 0.3s ease;
                    animation: flicker 1.5s infinite alternate;
                }

                .flame.small { font-size: 24px; }
                .flame.medium { font-size: 36px; }
                .flame.large { font-size: 48px; }

                @keyframes flicker {
                    0% { transform: scale(1) rotate(-2deg); opacity: 0.8; }
                    50% { transform: scale(1.05) rotate(1deg); opacity: 1; }
                    100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
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
                    width: 100px;
                    height: 100px;
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

                .voice-icon {
                    width: 50px;
                    height: 50px;
                    fill: #ffffff;
                }

                .session-text {
                    font-size: 18px;
                    font-weight: 600;
                    color: #ffffff;
                    text-align: center;
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
                    font-size: 24px;
                    font-weight: 600;
                    color: #ffffff;
                    margin-bottom: 5px;
                }

                .account-code {
                    font-size: 18px;
                    color: #a0a0a0;
                    font-weight: 500;
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
                <div className="streaks-widget">
                    <div className="streaks-title">Your Streaks</div>
                    <div className="streaks-container">
                        <div className="streak-month">
                            <div className="month-label">Jun</div>
                            <div className="flame small">🔥</div>
                        </div>
                        <div className="streak-month">
                            <div className="month-label">Jul</div>
                            <div className="flame medium">🔥</div>
                        </div>
                        <div className="streak-month">
                            <div className="month-label">Aug</div>
                            <div className="flame large">🔥</div>
                        </div>
                        <div className="streak-month">
                            <div className="month-label">Sep</div>
                            <div className="flame medium">🔥</div>
                        </div>
                        <div className="streak-month">
                            <div className="month-label">Oct</div>
                            <div className="flame small">🔥</div>
                        </div>
                    </div>
                </div>

                <div className="session-section">
                    <button className="start-session-btn" onClick={startSession}>
                        <svg className="voice-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1" y="18" width="2" height="6" rx="1" fill="#ffffff"/>
                            <rect x="3.5" y="12" width="2" height="12" rx="1" fill="#ffffff"/>
                            <rect x="6" y="15" width="2" height="9" rx="1" fill="#ffffff"/>
                            <rect x="8.5" y="9" width="2" height="15" rx="1" fill="#ffffff"/>
                            <rect x="11" y="12" width="2" height="12" rx="1" fill="#ffffff"/>
                            <rect x="13.5" y="15" width="2" height="9" rx="1" fill="#ffffff"/>
                            <rect x="16" y="12" width="2" height="12" rx="1" fill="#ffffff"/>
                            <rect x="18.5" y="18" width="2" height="6" rx="1" fill="#ffffff"/>
                        </svg>
                    </button>
                    <div className="session-text">Start a Session</div>
                </div>
            </div>

            <div id="accountsModal" className="modal" onClick={handleOutsideClick}>
                <div className="modal-content">
                    <span className="close" onClick={closeModal}>&times;</span>
                    <div className="account-info">
                        <div className="account-name">John Doe</div>
                        <div className="account-code">1234</div>
                    </div>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
            </div>
        </>
    );
};

export default Dashboard;