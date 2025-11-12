import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { webmBlobToWavMono16k } from '../utils/audio';
import { extractFeaturesWithPraat } from '../services/praat';
import { useGeminiLive } from '../hooks/useGeminiLive';
import type { AnalysisData, RecordingState, RawBiomarkerData } from '../types';
import { formatBiomarkers, repeatStatements } from '../constants';
import GlassCard from './GlassCard';
import { ChevronLeft, QuestionMarkCircle, Microphone, MicrophoneWithWaves } from './Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { VoicePoweredOrb } from './ui/voice-powered-orb';
import { speakText, stopSpeech, isSpeaking } from '../services/textToSpeech';

interface RecordingScreenProps {
  onAnalysisComplete: (data: AnalysisData) => void;
  baselineData: string | null;
  audioBlob?: Blob | null;
}

const RecordingScreen: React.FC<RecordingScreenProps> = ({ 
  onAnalysisComplete,
  baselineData,
  audioBlob
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Mode toggle state ('ai' | 'repeat')
  const [mode, setMode] = useState<'ai' | 'repeat'>('ai');
  
  // Multi-clip recording state
  const [audioClips, setAudioClips] = useState<Blob[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Repeat mode state
  const [currentStatementIndex, setCurrentStatementIndex] = useState(0);
  const [isPlayingStatement, setIsPlayingStatement] = useState(false);

  // Gemini Live integration - only active in 'ai' mode and unmuted
  const shouldUseGemini = mode === 'ai';
  const { isConnected: geminiConnected, transcript: geminiTranscript, error: geminiError, isMuted: geminiMuted, disconnect: disconnectGemini } = useGeminiLive(shouldUseGemini ? stream : null, false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const allClipsRef = useRef<Blob[]>([]); // Keep ref to always have latest clips
  
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
      if (timerRef.current) clearTimeout(timerRef.current as any);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopSpeech(); // Clean up TTS on unmount
    };
  }, [getMicrophonePermission, stream]);

  // Clean up TTS and disconnect Gemini when switching modes
  useEffect(() => {
    if (mode === 'ai') {
      stopSpeech();
      setIsPlayingStatement(false);
    } else {
      disconnectGemini();
    }
  }, [mode, disconnectGemini]);

  // Play current statement when in repeat mode and session is active
  const playCurrentStatement = useCallback(async () => {
    if (mode !== 'repeat' || isPlayingStatement || isSpeaking()) return;
    
    const statement = repeatStatements[currentStatementIndex];
    if (!statement) return;
    
    setIsPlayingStatement(true);
    try {
      await speakText(statement, { rate: 0.9, pitch: 1.0, volume: 1.0 });
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsPlayingStatement(false);
    }
  }, [mode, currentStatementIndex, isPlayingStatement]);

  // Move to next statement after recording in repeat mode
  useEffect(() => {
    if (mode === 'repeat' && recordingState === 'IDLE' && isSessionActive && audioClips.length > 0) {
      // Auto-play next statement after a short delay
      const timer = setTimeout(() => {
        const nextIndex = (currentStatementIndex + 1) % repeatStatements.length;
        setCurrentStatementIndex(nextIndex);
        
        // Wait a bit more before playing
        setTimeout(() => {
          const statement = repeatStatements[nextIndex];
          if (statement) {
            setIsPlayingStatement(true);
            speakText(statement, { rate: 0.9, pitch: 1.0, volume: 1.0 })
              .then(() => setIsPlayingStatement(false))
              .catch(() => setIsPlayingStatement(false));
          }
        }, 500);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [recordingState, isSessionActive, audioClips.length, mode, currentStatementIndex]);

  // Handle pre-recorded audio (if routed from elsewhere)
  useEffect(() => {
    if (audioBlob) {
      setRecordingState('ANALYZING');
      analyzeAudioWithPraatAndGemini(audioBlob);
    }
  }, [audioBlob]);

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

    // Start session if not already active
    if (!isSessionActive) {
      setIsSessionActive(true);
      // Reset clips for new session
      allClipsRef.current = [];
      setAudioClips([]);
      // Reset statement index in repeat mode
      if (mode === 'repeat') {
        setCurrentStatementIndex(0);
        // Play first statement in repeat mode
        setTimeout(() => {
          const statement = repeatStatements[0];
          if (statement) {
            setIsPlayingStatement(true);
            speakText(statement, { rate: 0.9, pitch: 1.0, volume: 1.0 })
              .then(() => setIsPlayingStatement(false))
              .catch(() => setIsPlayingStatement(false));
          }
        }, 500);
      }
    }

    // Create new MediaRecorder for this clip
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log('Data available, size:', event.data.size);
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

      const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY);
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' });
      
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
      
      const response = await model.generateContent(prompt);
      const responseText = response.response.text();
      
      // Clean to valid JSON (handles fenced code blocks)
      let cleanedText = (responseText || '').trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      if (!cleanedText) {
        throw new Error('Empty response from Gemini API');
      }

      let resultJson: RawBiomarkerData;
      try {
        resultJson = JSON.parse(cleanedText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
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
      mediaRecorderRef.current.onstop = () => {
        console.log('Stop event fired, chunks collected:', audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          console.error('No audio chunks captured!');
          setRecordingState('IDLE');
          return;
        }
        
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Recording stopped, blob size:', blob.size);
        
        // Update both state and ref
        allClipsRef.current = [...allClipsRef.current, blob];
        console.log('Total clips in ref:', allClipsRef.current.length);
        console.log('All clip sizes:', allClipsRef.current.map(c => c.size));
        
        setAudioClips(prev => {
          const updated = [...prev, blob];
          console.log('Total clips in state:', updated.length);
          return updated;
        });
        setRecordingState('IDLE');
      };
      
      mediaRecorderRef.current.stop();
    }
  };
  
  const combineAudioClips = async (clips: Blob[]): Promise<Blob> => {
    // Create audio context for combining
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Decode all clips to AudioBuffers
    const audioBuffers: AudioBuffer[] = [];
    for (const clip of clips) {
      const arrayBuffer = await clip.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers.push(audioBuffer);
    }
    
    // Calculate total length
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const sampleRate = audioBuffers[0].sampleRate;
    const numberOfChannels = audioBuffers[0].numberOfChannels;
    
    // Create combined buffer
    const combinedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);
    
    // Copy all clips into combined buffer
    let offset = 0;
    for (const buffer of audioBuffers) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        combinedBuffer.getChannelData(channel).set(channelData, offset);
      }
      offset += buffer.length;
    }
    
    // Convert combined buffer to WAV blob
    const wavBlob = audioBufferToWavBlob(combinedBuffer);
    audioContext.close();
    
    return wavBlob;
  };
  
  const audioBufferToWavBlob = (audioBuffer: AudioBuffer): Blob => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    
    const data = audioBuffer.getChannelData(0);
    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    
    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    const volume = 1;
    let index = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      index += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const endSession = async () => {
    // Disconnect Gemini Live immediately when ending the session
    try { disconnectGemini(); } catch {}
    // Use ref to get the most up-to-date clips
    const clipsToAnalyze = allClipsRef.current;
    if (clipsToAnalyze.length === 0) return;
    
    setRecordingState('ANALYZING');
    
    try {
      console.log('Ending session with', clipsToAnalyze.length, 'clips from ref');
      console.log('State has', audioClips.length, 'clips');
      
      // Properly combine audio clips
      const combinedWavBlob = await combineAudioClips(clipsToAnalyze);
      console.log('Combined WAV blob size:', combinedWavBlob.size);
      
      // Convert to mono 16kHz for analysis
      const wavBlob = await webmBlobToWavMono16k(combinedWavBlob);
      const featuresForAnalysis = await extractFeaturesWithPraat(wavBlob, 'http://localhost:8000');
      
      const featuresString = `
      - RMS (energy/loudness): ${featuresForAnalysis.rms.toFixed(4)}
      - ZCR (noise/sibilance): ${featuresForAnalysis.zcr.toFixed(4)}
      - Spectral Centroid (brightness): ${featuresForAnalysis.spectralCentroid.toFixed(2)}
      - Spectral Flatness (tonality): ${featuresForAnalysis.spectralFlatness.toFixed(4)}
      - MFCCs (spectral shape): [${featuresForAnalysis.mfcc.map((c: number) => c.toFixed(2)).join(', ')}]
      `;
      
      const baselineString = baselineData ? `The user's personal CALM BASELINE voice features are: ${JSON.stringify(JSON.parse(baselineData), null, 2)}` : "No personal baseline is available. Analyze based on general population data.";

      const ai = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY);
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' });
      
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
      
      const response = await model.generateContent(prompt);
      const responseText = response.response.text();
      
      // Clean to valid JSON (handles fenced code blocks)
      let cleanedText = (responseText || '').trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      if (!cleanedText) {
        throw new Error('Empty response from Gemini API');
      }

      let resultJson: RawBiomarkerData;
      try {
        resultJson = JSON.parse(cleanedText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from Gemini: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      const analysisResult: AnalysisData = {
          stressLevel: resultJson.stress_level,
          biomarkers: formatBiomarkers(resultJson),
          confidence: resultJson.confidence,
          snr: resultJson.snr,
          audioUrl: URL.createObjectURL(combinedWavBlob),
          aiSummary: resultJson.ai_summary,
      };

      // Reset session state
      setIsSessionActive(false);
      allClipsRef.current = [];
      setAudioClips([]);
      
      setRecordingState('COMPLETE');
      onAnalysisComplete(analysisResult);
    } catch (error) {
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

  const statusText = {
    IDLE: audioBlob ? "Processing recorded conversation..." : isSessionActive ? (mode === 'repeat' ? "Hold to repeat after me" : "Hold to record another clip") : (mode === 'repeat' ? "Hold to start repeat session" : "Hold to record your voice"),
    RECORDING: mode === 'repeat' ? "Recording... Repeat after me" : "Recording... Speak naturally",
    ANALYZING: "Analyzing voice patterns...",
    COMPLETE: "Analysis complete",
    ERROR: "Analysis failed. Tap to retry.",
  };

  const statusColor = { IDLE: "text-text-muted", RECORDING: "text-purple-light", ANALYZING: "text-orange-light", COMPLETE: "text-success-green", ERROR: "text-error-red" } as const;
  const headerText = "Voice Stress Analysis";

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-[90px] flex items-center justify-between px-4 z-10 max-w-2xl mx-auto bg-background-primary/95 backdrop-blur-sm">
        <div className="w-11 h-11" />
        <div className="text-center flex-1">
            <h1 className="text-lg font-medium text-white">{headerText}</h1>
            <div className="h-0.5 w-1/2 mx-auto bg-purple-primary" />
            {/* Mode Toggle */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                onClick={() => setMode('ai')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  mode === 'ai'
                    ? 'bg-purple-primary text-white'
                    : 'bg-neutral-800/50 text-gray-400 hover:bg-neutral-700/50'
                }`}
              >
                AI
              </button>
              <button
                onClick={() => setMode('repeat')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  mode === 'repeat'
                    ? 'bg-purple-primary text-white'
                    : 'bg-neutral-800/50 text-gray-400 hover:bg-neutral-700/50'
                }`}
              >
                Repeat
              </button>
            </div>
        </div>
        <button onClick={() => setShowHelp(true)} className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
            <QuestionMarkCircle className="w-5 h-5 text-white" />
        </button>
    </header>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 pt-[100px] pb-[60px] relative overflow-hidden">
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

        <div className="relative flex items-center justify-center my-10 h-[280px] w-[280px]">
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
                disabled={recordingState === 'ANALYZING' || !!permissionError && recordingState !== 'ERROR' || (audioBlob && recordingState === 'IDLE')}
                className={`w-[180px] h-[180px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${recordingState === 'ANALYZING' ? 'bg-orange-primary/15' : recordingState === 'ERROR' ? 'bg-error-red/15' : recordingState === 'RECORDING' ? 'bg-purple-primary/30' : 'bg-purple-primary/15'} backdrop-blur-xl z-10`}
                whileHover={(recordingState === 'IDLE' || recordingState === 'ERROR') && !audioBlob ? { scale: 1.05, boxShadow: '0 0 40px rgba(139, 92, 246, 0.6)' } : {}}
                whileTap={(recordingState === 'IDLE' || recordingState === 'ERROR') && !audioBlob ? { scale: 0.95 } : {}}
                animate={{ 
                    boxShadow: recordingState === 'IDLE' ? '0 0 30px rgba(139, 92, 246, 0.4)' : 
                              recordingState === 'ERROR' ? '0 0 30px rgba(239, 68, 68, 0.4)' : 
                              recordingState === 'RECORDING' ? '0 0 50px rgba(139, 92, 246, 0.8)' :
                              '0 12px 40px rgba(139, 92, 246, 0.3)',
                    scale: recordingState === 'RECORDING' ? 1 : 1
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

        {/* AI Mode - Gemini Live Overlay */}
        {mode === 'ai' && (
          <div className="w-full max-w-sm mx-auto mt-6">
            <GlassCard className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">AI Assistant</h3>
                <div className="flex items-center space-x-2">
                  <Microphone className={`w-4 h-4 ${geminiMuted ? 'text-red-400' : 'text-green-400'}`} />
                  <span className="text-xs text-gray-300">
                    {geminiMuted ? 'Muted' : 'Live'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <motion.div 
                    animate={{ scale: geminiConnected ? [1, 1.2, 1] : 1 }} 
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className={`w-2 h-2 rounded-full ${geminiConnected ? 'bg-green-400' : 'bg-yellow-400'}`}
                  />
                  <p className="text-xs text-gray-300">
                    {geminiConnected ? (geminiMuted ? "Connected (Muted)" : "Listening...") : "Connecting..."}
                  </p>
                </div>
                
                {geminiConnected && !geminiTranscript && !geminiMuted && !geminiError && (
                  <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-400/30">
                    <p className="text-sm text-white text-center">
                      Say hello to begin the conversation
                    </p>
                  </div>
                )}
                
                {geminiTranscript && !geminiMuted && (
                  <div className="bg-black/20 rounded-lg p-2">
                    <p className="text-xs text-gray-300">{geminiTranscript}</p>
                  </div>
                )}
                
                {geminiError && (
                  <div className="bg-red-500/20 rounded-lg p-2">
                    <p className="text-xs text-red-400">{geminiError}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Repeat Mode - Statement Overlay */}
        {mode === 'repeat' && (
          <div className="w-full max-w-sm mx-auto mt-6">
            <GlassCard className="p-4">
              <div className="text-center space-y-3">
                <h3 className="text-sm font-medium text-white mb-3">Repeat After Me</h3>
                
                {isPlayingStatement && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2 mb-2"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                    <span className="text-xs text-purple-300">Speaking...</span>
                  </motion.div>
                )}
                
                <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-400/30 min-h-[80px] flex items-center justify-center">
                  <p className="text-base text-white leading-relaxed">
                    {repeatStatements[currentStatementIndex]}
                  </p>
                </div>
                
                {!isPlayingStatement && isSessionActive && recordingState === 'IDLE' && (
                  <button
                    onClick={playCurrentStatement}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all text-sm mt-2"
                  >
                    Play Statement Again
                  </button>
                )}
                
                <p className="text-xs text-gray-400 mt-2">
                  Statement {currentStatementIndex + 1} of {repeatStatements.length}
                </p>
              </div>
            </GlassCard>
          </div>
        )}

        {/* End Session Button */}
        <AnimatePresence>
          {isSessionActive && audioClips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-sm mx-auto mt-4"
            >
              <GlassCard className="p-3">
                <div className="text-center">
                  <p className="text-sm text-white mb-3">
                    {audioClips.length} clip{audioClips.length !== 1 ? 's' : ''} recorded
                  </p>
                  <button
                    onClick={endSession}
                    disabled={recordingState === 'ANALYZING'}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg shadow-purple-500/20"
                  >
                    {recordingState === 'ANALYZING' ? 'Analyzing...' : 'End Session & Analyze'}
                  </button>
                </div>
              </GlassCard>
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


