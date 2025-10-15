
import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import VoiceAnalysisModal from './components/VoiceAnalysisModal';
import AnalysisResultsScreen from './components/AnalysisResultsScreen';
import CalibrationScreen from './components/CalibrationScreen';
import ConnectTheDots from './components/ConnectTheDots';
import ConfirmationPopup from './components/ConfirmationPopup';
import EnrollmentNumber from './components/EnrollmentNumber';
import ScratchCard from './components/ScratchCard';
import PasswordSetup from './components/PasswordSetup';
import SuccessPopup from './components/SuccessPopup';
import { AnimatePresence, motion } from 'framer-motion';
import type { AnalysisData } from './types';

type AppState = 'SIGNUP' | 'CONFIRMATION' | 'ENROLLMENT' | 'SCRATCH_CARD' | 'PASSWORD_SETUP' | 'SUCCESS' | 'DASHBOARD' | 'RECORDING' | 'CALIBRATION_FLOW' | 'RESULTS';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SIGNUP');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [baselineData, setBaselineData] = useState<string | null>(null);
  
  // Signup flow state
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [enrollmentNumber, setEnrollmentNumber] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const storedBaseline = localStorage.getItem('voiceBaseline');
    if (storedBaseline) {
      setBaselineData(storedBaseline);
    }
    
    // Always start with signup flow (removed localStorage check)
    // Users will always see the signup flow on reload
  }, []);

  // Signup flow handlers
  const handleClassSectionConnect = useCallback((classNum: number, section: string) => {
    setSelectedClass(classNum);
    setSelectedSection(section);
    setShowConfirmation(true);
  }, []);

  const handleConfirmationConfirm = useCallback(() => {
    setShowConfirmation(false);
    setAppState('ENROLLMENT');
  }, []);

  const handleConfirmationRetry = useCallback(() => {
    setShowConfirmation(false);
    setSelectedClass(null);
    setSelectedSection(null);
  }, []);

  const handleEnrollmentSubmit = useCallback((enrollment: string) => {
    setEnrollmentNumber(enrollment);
    // Generate a 4-digit account number based on enrollment
    const accountNum = Math.floor(1000 + Math.random() * 9000).toString();
    setAccountNumber(accountNum);
    setAppState('SCRATCH_CARD');
  }, []);

  const handleScratchCardComplete = useCallback(() => {
    setAppState('PASSWORD_SETUP');
  }, []);

  const handlePasswordSetupComplete = useCallback((password: string) => {
    // Store signup data
    localStorage.setItem('isSignedUp', 'true');
    localStorage.setItem('userData', JSON.stringify({
      class: selectedClass,
      section: selectedSection,
      enrollment: enrollmentNumber,
      accountNumber: accountNumber,
      password: password
    }));
    setAppState('SUCCESS');
  }, [selectedClass, selectedSection, enrollmentNumber, accountNumber]);

  const handleSuccessProceed = useCallback(() => {
    setAppState('DASHBOARD');
  }, []);

  const handleStartSession = useCallback(() => setAppState('RECORDING'), []);
  const handleStartCalibration = useCallback(() => setAppState('CALIBRATION_FLOW'), []);
  
  const handleCloseModal = useCallback(() => setAppState('DASHBOARD'), []);

  const handleAnalysisComplete = useCallback((data: AnalysisData) => {
    const { aiSummary, ...rest } = data;
    setAnalysisData({ ...rest, aiSummary });
    setAppState('RESULTS');
  }, []);
  
  const handleCalibrationComplete = useCallback((baselineJson: string) => {
    localStorage.setItem('voiceBaseline', baselineJson);
    setBaselineData(baselineJson);
    setAppState('DASHBOARD');
  }, []);

  const handleResultsClose = useCallback(() => {
    setAnalysisData(null);
    setAppState('DASHBOARD');
  }, []);
  
  const handleNewRecordingFromResults = useCallback(() => {
    setAnalysisData(null);
    setAppState('RECORDING');
  }, []);

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.4, ease: 'easeInOut' }
  };

  return (
    <div className="min-h-screen w-full bg-background-primary overflow-hidden relative">
      <AnimatePresence initial={false}>
        {/* Signup Flow Components */}
        {appState === 'SIGNUP' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex items-center justify-center pt-16"
          >
            <ConnectTheDots 
              onConnect={handleClassSectionConnect}
              isEnabled={true}
            />
          </motion.div>
        )}

        {appState === 'ENROLLMENT' && (
          <motion.div
            key="enrollment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex items-center justify-center pt-16"
          >
            <EnrollmentNumber onSubmit={handleEnrollmentSubmit} />
          </motion.div>
        )}

        {appState === 'SCRATCH_CARD' && (
          <motion.div
            key="scratch-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex items-center justify-center pt-16"
          >
            <ScratchCard 
              accountNumber={accountNumber}
              onComplete={handleScratchCardComplete}
            />
          </motion.div>
        )}

        {appState === 'PASSWORD_SETUP' && (
          <motion.div
            key="password-setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full flex items-center justify-center pt-16"
          >
            <PasswordSetup 
              accountNumber={accountNumber}
              onSubmit={handlePasswordSetupComplete}
            />
          </motion.div>
        )}

        {appState === 'DASHBOARD' && (
           <motion.div
             key="dashboard"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.3 }}
             className="w-full h-full"
           >
            <Dashboard 
              onStartVoiceSession={handleStartSession} 
              onStartCalibration={handleStartCalibration}
              hasBaseline={!!baselineData}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Components */}
      <AnimatePresence>
        {showConfirmation && selectedClass && selectedSection && (
          <ConfirmationPopup
            classNumber={selectedClass}
            section={selectedSection}
            onConfirm={handleConfirmationConfirm}
            onRetry={handleConfirmationRetry}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'SUCCESS' && (
          <SuccessPopup
            accountNumber={accountNumber}
            onProceed={handleSuccessProceed}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {appState === 'RECORDING' && (
          <VoiceAnalysisModal 
            onClose={handleCloseModal} 
            onAnalysisReady={handleAnalysisComplete}
            baselineData={baselineData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'CALIBRATION_FLOW' && (
          <CalibrationScreen 
            onClose={handleCloseModal} 
            onComplete={handleCalibrationComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'RESULTS' && analysisData && (
          <motion.div
            key="results-page"
            className="fixed inset-0 z-50 bg-background-primary overflow-y-auto"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
          >
            <AnalysisResultsScreen 
              analysisData={analysisData} 
              onNewRecording={handleNewRecordingFromResults}
              onClose={handleResultsClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
