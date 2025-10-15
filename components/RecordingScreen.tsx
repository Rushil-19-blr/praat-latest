
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { webmBlobToWavMono16k } from '../utils/audio';
import { extractFeaturesWithPraat } from '../services/praat';
import type { AnalysisData, RecordingState, RawBiomarkerData } from '../types';
import { formatBiomarkers } from '../constants';
import GlassCard from './GlassCard';
import { ChevronLeft, QuestionMarkCircle, Microphone, MicrophoneWithWaves } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';

interface RecordingScreenProps {
  onAnalysisComplete: (data: AnalysisData) => void;
  baselineData: string | null;
}

const RecordingScreen: React.FC<RecordingScreenProps> = ({ 
  onAnalysisComplete,
  baselineData
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);


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
      if (timerRef.current) clearTimeout(timerRef.current);
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
    
    // Clear with a subtle background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
    ctx.fillRect(0, 0, width, height);

    // Create a more sophisticated waveform visualization
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

    // Create animated gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#A855F7');
    gradient.addColorStop(0.5, '#8B5CF6');
    gradient.addColorStop(1, '#7C3AED');
    ctx.fillStyle = gradient;

    // Draw bars with smooth animation
    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + 2);
      const barHeight = Math.max(4, barHeights[i] * (height - 8));
      const centerY = height / 2;
      
      // Draw from center outward for better visual effect
      ctx.fillRect(x, centerY - barHeight/2, barWidth, barHeight);
    }

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, [recordingState]);

  const startRecording = () => {
    if (!stream || (recordingState !== 'IDLE' && recordingState !== 'ERROR')) return;

    setPermissionError(null);
    setRecordingState('RECORDING');
    setRecordingDuration(0);
    audioChunksRef.current = [];

    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current.addEventListener("dataavailable", event => {
      audioChunksRef.current.push(event.data);
    });
    
    mediaRecorderRef.current.start();
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  
  const analyzeAudioWithPraatAndGemini = async (audioBlob: Blob) => {
    try {
      const wavBlob = await webmBlobToWavMono16k(audioBlob);
      const featuresForAnalysis = await extractFeaturesWithPraat(wavBlob, 'http://localhost:8000');
      
      const featuresString = `
      - RMS (energy/loudness): ${featuresForAnalysis.rms.toFixed(4)}
      - ZCR (noise/sibilance): ${featuresForAnalysis.zcr.toFixed(4)}
      - Spectral Centroid (brightness): ${featuresForAnalysis.spectralCentroid.toFixed(2)}
      - Spectral Flatness (tonality): ${featuresForAnalysis.spectralFlatness.toFixed(4)}
      - MFCCs (spectral shape): [${featuresForAnalysis.mfcc.map((c: number) => c.toFixed(2)).join(', ')}]
      `;
      
      const baselineString = baselineData ? `The user's personal CALM BASELINE voice features are: ${JSON.stringify(JSON.parse(baselineData), null, 2)}` : "No personal baseline is available. Analyze based on general population data.";

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const prompt = `You are a world-class expert in Voice Stress Analysis (VSA). I have two sets of acoustic features from a voice sample: a potential calm baseline, and the current sample. Your task is to compare them to determine the stress level.

      ${baselineString}

      The CURRENT voice sample's features (extracted using Praat phonetics analysis) are:
      ${featuresString}

      Based on this data, perform these tasks:
      1.  **Compare and Infer Biomarkers**: Critically compare the CURRENT features to the BASELINE (if available). Based on the *differences*, estimate plausible values for the following VSA biomarkers. Stress often manifests as *deviations* from a baseline (e.g., higher RMS and spectral centroid -> higher F0). If no baseline is available, use general population norms.
          - f0_mean (Hz): Avg pitch.
          - f0_range (Hz): Pitch variability.
          - jitter (%): Frequency perturbation.
          - shimmer (%): Amplitude perturbation.
          - hnr (dB): Harmonics-to-Noise Ratio.
          - f1 (Hz), f2 (Hz): Formants.
          - speech_rate (WPM): Words per minute.
      2.  **Determine Stress Level**: Based on the deviation from baseline, provide an overall stress level (0-100). A larger deviation implies higher stress.
      3.  **Provide Confidence & SNR**: Give a confidence score for your analysis (%) and an estimated Signal-to-Noise Ratio (SNR, in dB).
      4.  **Write AI Summary**: Write a concise summary (2-3 sentences) explaining the results, referencing the comparison to the baseline if one was used.

      Your output MUST be a single, valid JSON object with no other text. Use the exact keys from the schema.`;
      
      const responseSchema = { type: Type.OBJECT, properties: { stress_level: { type: Type.NUMBER }, f0_mean: { type: Type.NUMBER }, f0_range: { type: Type.NUMBER }, jitter: { type: Type.NUMBER }, shimmer: { type: Type.NUMBER }, hnr: { type: Type.NUMBER }, f1: { type: Type.NUMBER }, f2: { type: Type.NUMBER }, speech_rate: { type: Type.NUMBER }, confidence: { type: Type.NUMBER }, snr: { type: Type.NUMBER }, ai_summary: { type: Type.STRING }}};
      
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json', responseSchema: responseSchema },
      });

      const resultJson: RawBiomarkerData = JSON.parse(response.text);
      const analysisResult: AnalysisData = {
          stressLevel: resultJson.stress_level,
          biomarkers: formatBiomarkers(resultJson),
          confidence: resultJson.confidence,
          snr: resultJson.snr,
          audioUrl: URL.createObjectURL(audioBlob),
          aiSummary: resultJson.ai_summary,
      };

      setRecordingState('COMPLETE');
      onAnalysisComplete(analysisResult);
    } catch (error) {
      console.error("Analysis Error:", error);
      setRecordingState('ERROR');
      if (error instanceof Error) {
        if (error.message.includes('Not enough clear speech')) {
          setPermissionError("We couldn't detect clear speech. Please try speaking a bit louder and closer to your device.");
        } else if (error.message.includes('Backend')) {
          setPermissionError("Our analysis service is temporarily unavailable. Please try again in a moment.");
        } else {
          setPermissionError("Something went wrong during analysis. Please try recording again.");
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
      mediaRecorderRef.current.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordingState('ANALYZING');
        analyzeAudioWithPraatAndGemini(audioBlob);
      });
      mediaRecorderRef.current.stop();
    }
  };
  
  const statusText = {
    IDLE: "Hold to record your voice",
    RECORDING: "Recording... Speak naturally",
    ANALYZING: "Analyzing voice patterns...",
    COMPLETE: "Analysis complete",
    ERROR: "Analysis failed. Tap to retry.",
  };

  const statusColor = { IDLE: "text-text-muted", RECORDING: "text-purple-light", ANALYZING: "text-orange-light", COMPLETE: "text-success-green", ERROR: "text-error-red" };
  const headerText = "Voice Stress Analysis";

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-10 max-w-2xl mx-auto">
        <div className="w-11 h-11" />
        <div className="text-center">
            <h1 className="text-lg font-medium text-white">{headerText}</h1>
            <div className="h-0.5 w-1/2 mx-auto bg-purple-primary" />
        </div>
        <button onClick={() => setShowHelp(true)} className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
            <QuestionMarkCircle className="w-5 h-5 text-white" />
        </button>
    </header>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 pt-[80px] pb-[60px] relative overflow-hidden">
        <Header />
        
        <GlassCard className="w-full max-w-sm mx-auto p-4 z-10" variant="purple">
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
            </div>
        </GlassCard>

        <div className="relative flex items-center justify-center my-10 h-[240px] w-[240px]">
          <AnimatePresence>
            {recordingState === 'ANALYZING' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" >
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 36}deg)` }} animate={{ rotate: 360 + i * 36 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: i * 0.15, }} >
                    <div className="absolute top-0 left-1/2 -ml-1 h-1/2 w-2 origin-bottom">
                      <div className="h-6 w-2 rounded bg-gradient-to-b from-orange-primary to-orange-light"></div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

            <svg className="absolute inset-0" viewBox="0 0 240 240">
                <circle cx="120" cy="120" r="117" stroke={recordingState === 'ERROR' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(139, 92, 246, 0.4)'} strokeWidth="3" fill="none" />
                 {recordingState === 'RECORDING' && (
                    <motion.circle cx="120" cy="120" r="117" stroke="url(#progress-gradient)" strokeWidth="6" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 10, ease: 'linear' }} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                )}
                <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#A855F7" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                </defs>
            </svg>

            <motion.button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={recordingState === 'ANALYZING' || !!permissionError && recordingState !== 'ERROR'}
                className={`w-[200px] h-[200px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${recordingState === 'ANALYZING' ? 'bg-orange-primary/15' : recordingState === 'ERROR' ? 'bg-error-red/15' : recordingState === 'RECORDING' ? 'bg-purple-primary/30' : 'bg-purple-primary/15'} backdrop-blur-xl`}
                whileHover={(recordingState === 'IDLE' || recordingState === 'ERROR') ? { scale: 1.05, boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' } : {}}
                whileTap={(recordingState === 'IDLE' || recordingState === 'ERROR') ? { scale: 0.95 } : {}}
                animate={{ 
                    boxShadow: recordingState === 'IDLE' ? '0 0 30px rgba(139, 92, 246, 0.4)' : 
                              recordingState === 'ERROR' ? '0 0 30px rgba(239, 68, 68, 0.4)' : 
                              recordingState === 'RECORDING' ? '0 0 50px rgba(139, 92, 246, 0.8)' :
                              '0 12px 40px rgba(139, 92, 246, 0.3)',
                    scale: recordingState === 'RECORDING' ? 1.1 : 1
                }}
            >
                <motion.div animate={{ scale: recordingState === 'RECORDING' ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.8, repeat: recordingState === 'RECORDING' ? Infinity : 0 }}>
                    <Microphone className="w-16 h-16 text-white" />
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
                                <MicrophoneWithWaves className="w-7 h-7 text-purple-primary mx-auto mb-2" />
                                <h3 className="text-base font-bold text-white mb-2">How it Works</h3>
                                <ol className="text-sm text-text-muted space-y-1">
                                    <li>1. Find a quiet, relaxed environment</li>
                                    <li>2. Tap the button to start recording</li>
                                    <li>3. Speak calmly and naturally for 10s</li>
                                    <li>4. Your results will be compared to your baseline</li>
                                </ol>
                            </div>
                        </GlassCard>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {permissionError && <div className="fixed bottom-0 left-0 right-0 p-4 bg-error-red/80 text-center text-white text-sm z-50">{permissionError}</div>}
    </div>
  );
};

export default RecordingScreen;
