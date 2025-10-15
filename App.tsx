
import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import VoiceAnalysisModal from './components/VoiceAnalysisModal';
import AnalysisResultsScreen from './components/AnalysisResultsScreen';
import CalibrationScreen from './components/CalibrationScreen';
import { AnimatePresence, motion } from 'framer-motion';
import type { AnalysisData } from './types';

type AppState = 'DASHBOARD' | 'RECORDING' | 'CALIBRATION_FLOW' | 'RESULTS';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('DASHBOARD');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [baselineData, setBaselineData] = useState<string | null>(null);

  useEffect(() => {
    const storedBaseline = localStorage.getItem('voiceBaseline');
    if (storedBaseline) {
      setBaselineData(storedBaseline);
    }
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
