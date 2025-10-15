
import React, { useCallback } from 'react';
import RecordingScreen from './RecordingScreen';
import type { AnalysisData } from '../types';
import { motion } from 'framer-motion';

interface VoiceAnalysisModalProps {
  onClose: () => void;
  onAnalysisReady: (data: AnalysisData) => void;
  baselineData: string | null;
}

const VoiceAnalysisModal: React.FC<VoiceAnalysisModalProps> = ({ 
  onClose, 
  onAnalysisReady,
  baselineData,
}) => {

  const handleAnalysisComplete = useCallback((data: AnalysisData) => {
    onAnalysisReady(data);
  }, [onAnalysisReady]);

  return (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-lg z-40 flex flex-col"
    >
        {/* Close button for the modal */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-2xl hover:bg-white/20"
            aria-label="Close voice analysis"
        >
            &times;
        </button>
        
        <RecordingScreen 
            onAnalysisComplete={handleAnalysisComplete} 
            baselineData={baselineData}
        />

    </motion.div>
  );
};

export default VoiceAnalysisModal;
