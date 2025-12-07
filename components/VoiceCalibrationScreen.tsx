import React, { useState, useEffect, useRef, useCallback } from 'react';
import { webmBlobToWavMono16k } from '../utils/audio';
import { extractFeaturesWithPraat } from '../services/praat';
import type { RecordingState } from '../types';
import GlassCard from './GlassCard';
import { ChevronLeft, QuestionMarkCircle, Microphone, MicrophoneFilled } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { VoicePoweredOrb } from './ui/voice-powered-orb';
import { BeamsBackground } from './ui/beams-background';
import CalibrationSuccessPopup from './CalibrationSuccessPopup';
import { resetSensitivityState } from '../utils/sensitivityAdaptation';

interface VoiceCalibrationScreenProps {
  onCalibrationComplete: (baselineJson: string) => void;
  onClose: () => void;
}

const VoiceCalibrationScreen: React.FC<VoiceCalibrationScreenProps> = ({ 
  onCalibrationComplete,
  onClose
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  // Check if baseline exists on mount
  useEffect(() => {
    const storedBaseline = localStorage.getItem('voiceBaseline');
    setHasBaseline(!!storedBaseline);
  }, []);

  const getMicrophonePermission = useCallback(async () => {
    if (stream) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 44100, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: false }
      });
      setStream(mediaStream);
      setPermissionError(null);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionError("Microphone access denied. Please enable it in your browser settings.");
        } else {
          setPermissionError("Could not access microphone. Please check your device.");
        }
      }
    }
  }, [stream]);

  useEffect(() => {
    getMicrophonePermission();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearTimeout(timerRef.current as any);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [getMicrophonePermission, stream]);

  const drawWaveform = useCallback(() => {
    if (recordingState !== 'RECORDING' || !analyserRef.current || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
    ctx.fillRect(0, 0, width, height);

    const numBars = 32;
    const barWidth = width / numBars - 2;
    
    const barHeights = new Array(numBars).fill(0);
    const sliceWidth = Math.floor(dataArray.length / numBars);

    for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < sliceWidth; j++) {
            const index = i * sliceWidth + j;
            sum += Math.abs(dataArray[index] - 128);
        }
        barHeights[i] = (sum / sliceWidth) / 128.0;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#A855F7');
    gradient.addColorStop(0.5, '#8B5CF6');
    gradient.addColorStop(1, '#7C3AED');
    ctx.fillStyle = gradient;

    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + 2);
      const barHeight = Math.max(4, barHeights[i] * (height - 8));
      const centerY = height / 2;
      ctx.fillRect(x, centerY - barHeight/2, barWidth, barHeight);
    }

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, [recordingState]);

  const startRecording = () => {
    if (!stream || recordingState !== 'IDLE') return;

    setPermissionError(null);
    setRecordingState('RECORDING');
    setRecordingDuration(0);
    audioChunksRef.current = [];

    // Create new MediaRecorder for this clip
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    
    // Start with a timeslice to ensure data is captured regularly
    mediaRecorderRef.current.start(100); // Collect data every 100ms
    
    // Create audio context for visualization (only if not exists or closed)
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 512;
    analyserRef.current.smoothingTimeConstant = 0.8;
    source.connect(analyserRef.current);
    
    animationFrameRef.current = requestAnimationFrame(drawWaveform);

    // Start duration counter
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };
  
  const processAndSaveBaseline = async (audioBlob: Blob) => {
    try {
      setRecordingState('ANALYZING');
      
      // Convert to WAV format
      const wavBlob = await webmBlobToWavMono16k(audioBlob);
      
      // Extract features using Praat
      const features = await extractFeaturesWithPraat(wavBlob, 'http://localhost:8000');
      
      // Print extracted Praat features to console
      console.log('=== Praat Extracted Features (Calibration) ===');
      console.log('Basic Features:');
      console.log('  RMS (energy/loudness):', features.rms);
      console.log('  ZCR (noise/sibilance):', features.zcr);
      console.log('  Spectral Centroid (brightness):', features.spectralCentroid);
      console.log('  Spectral Flatness (tonality):', features.spectralFlatness);
      console.log('  MFCCs (spectral shape):', features.mfcc);
      console.log('\nPraat Advanced Features (Real Extractions):');
      console.log('  F0 Mean (pitch):', features.f0_mean, 'Hz');
      console.log('  F0 Range:', features.f0_range, 'Hz');
      console.log('  Jitter:', features.jitter, '%');
      console.log('  Shimmer:', features.shimmer, '%');
      console.log('  F1 (First Formant):', features.f1, 'Hz');
      console.log('  F2 (Second Formant):', features.f2, 'Hz');
      console.log('  Speech Rate:', features.speech_rate, 'WPM');
      console.log('Full Features Object:', JSON.stringify(features, null, 2));
      console.log('==============================================');
      
      // Save baseline features including Praat biomarkers
      const baselineData = {
        // Basic features (for backwards compatibility)
        rms: features.rms,
        zcr: features.zcr,
        spectralCentroid: features.spectralCentroid,
        spectralFlatness: features.spectralFlatness,
        mfcc: features.mfcc,
        // Praat advanced features (for stress analysis)
        f0_mean: features.f0_mean || 0,
        f0_range: features.f0_range || 0,
        jitter: features.jitter || 0,
        shimmer: features.shimmer || 0,
        f1: features.f1 || 0,
        f2: features.f2 || 0,
        speech_rate: features.speech_rate || 0,
        timestamp: new Date().toISOString()
      };
      
      const baselineJson = JSON.stringify(baselineData);
      localStorage.setItem('voiceBaseline', baselineJson);
      
      // Reset adaptive sensitivity state when new baseline is created
      // This ensures sensitivity starts conservative for the new baseline
      resetSensitivityState();
      
      setHasBaseline(true);
      setRecordingState('COMPLETE');
      
      // Show success popup
      setTimeout(() => {
        setShowSuccessPopup(true);
      }, 500);
    } catch (error) {
      console.error("Calibration Error:", error);
      setRecordingState('ERROR');
      if (error instanceof Error) {
        if (error.message.includes('Not enough clear speech')) {
          setPermissionError("We couldn't detect clear speech. Please try speaking a bit louder and closer to your device.");
        } else if (error.message.includes('Backend')) {
          setPermissionError("Our analysis service is temporarily unavailable. Please try again in a moment.");
        } else {
          setPermissionError("Something went wrong during calibration. Please try recording again.");
        }
      } else {
        setPermissionError("An unexpected error occurred. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          setRecordingState('IDLE');
          return;
        }
        
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (blob.size > 2000) {
          processAndSaveBaseline(blob);
        } else {
          setRecordingState('ERROR');
          setPermissionError("Recording too short. Please record a longer sample.");
        }
      };
      
      mediaRecorderRef.current.stop();
    }
  };

  const statusText = {
    IDLE: hasBaseline ? "Press and hold to re-calibrate" : "Press and hold to record your baseline",
    RECORDING: "Recording... Speak naturally",
    ANALYZING: "Processing baseline features...",
    COMPLETE: "Baseline saved successfully!",
    ERROR: "Calibration failed. Tap to retry.",
  };

  const statusColor = { 
    IDLE: "text-text-muted", 
    RECORDING: "text-purple-light", 
    ANALYZING: "text-orange-light", 
    COMPLETE: "text-success-green", 
    ERROR: "text-error-red" 
  } as const;
  
  const headerText = "Voice Calibration";

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-[90px] flex items-center justify-between px-4 z-10 max-w-2xl mx-auto">
        <button onClick={onClose} className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
            <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="text-center flex-1">
            <h1 className="text-lg font-medium text-white">{headerText}</h1>
            <div className="h-0.5 w-1/2 mx-auto bg-purple-primary" />
        </div>
        <button onClick={() => setShowHelp(true)} className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
            <QuestionMarkCircle className="w-5 h-5 text-white" />
        </button>
    </header>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 pt-[100px] pb-[60px] relative overflow-hidden">
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none'
        }}>
          <BeamsBackground intensity="medium" className="!z-0" />
        </div>
        <Header />
        
        <GlassCard className="w-full max-w-sm mx-auto p-4 z-10 relative" variant="purple">
            <div className="text-center">
                {recordingState === 'RECORDING' && (
                    <p className="text-2xl font-mono text-white tabular-nums">
                        {`00:${recordingDuration.toString().padStart(2, '0')}`}
                    </p>
                )}
                <p className={`text-sm mt-1 transition-colors duration-300 ${statusColor[recordingState]}`}>
                    {statusText[recordingState]}
                </p>
                {recordingState === 'RECORDING' && (
                    <p className="text-xs text-text-muted mt-2">
                        Release when finished speaking
                    </p>
                )}
                {recordingState === 'COMPLETE' && (
                    <p className="text-xs text-success-green mt-2">
                        Your baseline has been saved. You can re-calibrate anytime.
                    </p>
                )}
            </div>
        </GlassCard>

        <div className="relative flex items-center justify-center my-10 h-[280px] w-[280px] z-10">
            {/* Voice Powered Orb - replaces the purple ring */}
            <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden z-0">
                <VoicePoweredOrb
                    enableVoiceControl={recordingState === 'RECORDING'}
                    externalAudioStream={stream}
                    hue={0}
                    voiceSensitivity={2.5}
                    maxRotationSpeed={1.5}
                    maxHoverIntensity={1.0}
                    className="w-full h-full"
                />
            </div>

            <motion.button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={recordingState === 'ANALYZING' || !!permissionError && recordingState !== 'ERROR'}
                className={`w-[180px] h-[180px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${recordingState === 'ANALYZING' ? 'bg-orange-primary/15' : recordingState === 'ERROR' ? 'bg-error-red/15' : recordingState === 'RECORDING' ? 'bg-purple-primary/30' : recordingState === 'COMPLETE' ? 'bg-success-green/15' : 'bg-purple-primary/15'} backdrop-blur-xl z-10`}
                whileHover={(recordingState === 'IDLE' || recordingState === 'ERROR') ? { scale: 1.05, boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' } : {}}
                whileTap={(recordingState === 'IDLE' || recordingState === 'ERROR') ? { scale: 0.95 } : {}}
                animate={{ 
                    boxShadow: recordingState === 'IDLE' ? '0 0 30px rgba(139, 92, 246, 0.4)' : 
                              recordingState === 'ERROR' ? '0 0 30px rgba(239, 68, 68, 0.4)' : 
                              recordingState === 'RECORDING' ? '0 0 50px rgba(139, 92, 246, 0.8)' :
                              recordingState === 'COMPLETE' ? '0 0 30px rgba(34, 197, 94, 0.4)' :
                              '0 12px 40px rgba(139, 92, 246, 0.3)',
                    scale: recordingState === 'RECORDING' ? 1 : 1
                }}
            >
                <motion.div animate={{ scale: recordingState === 'RECORDING' ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.8, repeat: recordingState === 'RECORDING' ? Infinity : 0 }}>
                    <MicrophoneFilled className="w-16 h-16 text-white" />
                </motion.div>
            </motion.button>
        </div>
        
        <AnimatePresence>
            {recordingState === 'RECORDING' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-[60px] w-full max-w-xs" >
                    <canvas ref={waveformCanvasRef} width="280" height="80" className="mx-auto rounded-xl"></canvas>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showHelp && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHelp(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-center justify-center p-4" >
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full" >
                        <GlassCard className="p-5 max-w-md mx-auto">
                            <div className="text-center">
                                <MicrophoneFilled className="w-7 h-7 text-purple-primary mx-auto mb-2" />
                                <h3 className="text-base font-bold text-white mb-2">Voice Calibration</h3>
                                <ol className="text-sm text-text-muted space-y-1 text-left">
                                    <li>1. Find a quiet, relaxed environment</li>
                                    <li>2. Press and hold the button to start recording</li>
                                    <li>3. Speak naturally for 10-15 seconds</li>
                                    <li>4. Your baseline voice features will be saved</li>
                                    <li>5. You can re-calibrate anytime you want</li>
                                </ol>
                                <p className="text-xs text-text-muted mt-4">
                                    This baseline will be used as a reference for future voice analysis.
                                </p>
                            </div>
                        </GlassCard>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {permissionError && <div className="fixed bottom-0 left-0 right-0 p-4 bg-error-red/80 text-center text-white text-sm z-50">{permissionError}</div>}
        
        {/* Calibration Success Popup */}
        <CalibrationSuccessPopup
          isOpen={showSuccessPopup}
          onContinue={() => {
            setShowSuccessPopup(false);
            const baselineJson = localStorage.getItem('voiceBaseline');
            if (baselineJson) {
              onCalibrationComplete(baselineJson);
            }
          }}
        />
    </div>
  );
};

export default VoiceCalibrationScreen;

