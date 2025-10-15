import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisData, Biomarker } from '../types';
import GlassCard from './GlassCard';
import { ChevronLeft, Share, Info, Play, Pause, Bookmark, Microphone, getBiomarkerIcon } from './Icons';
import { motion, animate, AnimatePresence, type Variants } from 'framer-motion';

interface AnalysisResultsScreenProps {
  analysisData: AnalysisData;
  onNewRecording: () => void;
  onClose: () => void;
}

const StressIndicator: React.FC<{ stressLevel: number }> = ({ stressLevel }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = stressLevel / 100;

  useEffect(() => {
    const controls = animate(0, stressLevel, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (value) => setDisplayValue(value),
    });
    return () => controls.stop();
  }, [stressLevel]);

  const getBadge = () => {
    if (stressLevel < 34) return { text: 'Low Stress', bg: 'bg-success-green/20', text_color: 'text-success-green' };
    if (stressLevel < 67) return { text: 'Moderate Stress', bg: 'bg-orange-warning/20', text_color: 'text-orange-warning' };
    return { text: 'High Stress', bg: 'bg-error-red/20', text_color: 'text-error-red' };
  };
  const badge = getBadge();

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[240px] h-[240px]">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="progress-gradient-stress" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="none" stroke="#262626" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#progress-gradient-stress)"
            strokeWidth="6"
            strokeLinecap="round"
            pathLength="1"
            initial={{ strokeDasharray: "1", strokeDashoffset: 1 }}
            animate={{ strokeDashoffset: 1 - percentage }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="font-sans font-thin text-7xl text-white">
            {displayValue.toFixed(0)}<span className="text-4xl text-white/80">%</span>
          </h1>
          <p className="text-sm text-text-muted mt-1">Stress Level</p>
        </div>
      </div>
      <div className={`mt-4 px-5 py-2 rounded-full backdrop-blur-sm ${badge.bg}`}>
        <p className={`font-medium ${badge.text_color}`}>{badge.text}</p>
      </div>
    </div>
  );
};


const SpectrogramCard: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!audioUrl || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        let audioContext: AudioContext;
        let source: AudioBufferSourceNode;
        let animationFrameId: number;

        const generateSpectrogram = async () => {
            try {
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const response = await fetch(audioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.5;

                source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(analyser);

                const frequencyData = new Uint8Array(analyser.frequencyBinCount);
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);

                const maxFreq = 8000;
                const sampleRate = audioBuffer.sampleRate;
                const binsToShow = Math.floor((maxFreq / (sampleRate / 2)) * analyser.frequencyBinCount);

                const getColor = (value: number) => {
                    const percent = value / 255;
                    let r, g, b;
                    if (percent < 0.25) { const factor = percent / 0.25; r = 0; g = 0; b = 100 * factor; } 
                    else if (percent < 0.5) { const factor = (percent - 0.25) / 0.25; r = 255 * factor; g = 0; b = 100 - (100 * factor); } 
                    else if (percent < 0.75) { const factor = (percent - 0.5) / 0.25; r = 255; g = 255 * factor; b = 0; } 
                    else { const factor = (percent - 0.75) / 0.25; r = 255; g = 255; b = 255 * factor; }
                    return `rgb(${r},${g},${b})`;
                };
                
                source.start();
                const startTime = audioContext.currentTime;
                let lastX = -1;

                function draw() {
                    animationFrameId = requestAnimationFrame(draw);
                    const elapsedTime = audioContext.currentTime - startTime;
                    if (elapsedTime >= audioBuffer.duration) {
                        cancelAnimationFrame(animationFrameId); return;
                    }
                    const currentX = Math.floor((elapsedTime / audioBuffer.duration) * canvasWidth);
                    if (currentX > lastX) {
                        analyser.getByteFrequencyData(frequencyData);
                        const sliceWidth = currentX - lastX;
                        for (let i = 0; i < binsToShow; i++) {
                            const y = canvasHeight - (i / binsToShow) * canvasHeight;
                            const barHeight = canvasHeight / binsToShow;
                            ctx.fillStyle = getColor(frequencyData[i]);
                            ctx.fillRect(lastX, y - barHeight, sliceWidth, barHeight);
                        }
                        lastX = currentX;
                    }
                }
                draw();
            } catch (error) { console.error("Error generating spectrogram:", error); }
        };

        generateSpectrogram();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (source) source.disconnect();
            if (audioContext && audioContext.state !== 'closed') audioContext.close();
        };
    }, [audioUrl]);


    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) { audioRef.current.pause(); } 
        else { audioRef.current.currentTime = 0; setProgress(0); audioRef.current.play(); }
        setIsPlaying(!isPlaying);
      }
    };
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleTimeUpdate = () => { if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100); };
        const handleEnded = () => { setIsPlaying(false); setProgress(0); };
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    return (
        <GlassCard className="p-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">Voice Spectrogram</h2>
                <Info className="w-5 h-5 text-purple-primary" />
            </div>
            <div className="relative">
                <canvas ref={canvasRef} width="400" height="200" className="w-full h-auto rounded-lg bg-black"></canvas>
            </div>
            <div className="flex items-center gap-4 mt-2">
                <audio ref={audioRef} src={audioUrl}></audio>
                <button onClick={togglePlay} className="glass-base w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center hover:bg-purple-primary/20">
                    {isPlaying ? <Pause className="w-5 h-5 text-white"/> : <Play className="w-5 h-5 text-white"/>}
                </button>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-dark to-purple-light" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs text-text-muted">10.0s</span>
            </div>
        </GlassCard>
    );
};

const AISummaryCard: React.FC<{ summary: string }> = ({ summary }) => (
    <GlassCard className="p-5" variant="purple">
        <h3 className="text-lg font-bold text-white mb-2">AI Generated Summary</h3>
        <p className="text-sm text-text-secondary">{summary}</p>
    </GlassCard>
);

const ProgressArc: React.FC<{ progress: number, status: 'green' | 'orange' | 'red' }> = ({ progress, status }) => {
  const statusColors = {
    green: '#22C55E',
    orange: '#FF8E53',
    red: '#EF4444'
  };

  return (
    <svg className="absolute top-4 right-4 w-10 h-10" viewBox="0 0 36 36">
      <path
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.1"
        strokeWidth="3"
      />
      <motion.path
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke={statusColors[status]}
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ strokeDasharray: '0, 100' }}
        animate={{ strokeDasharray: `${progress * 100}, 100` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
};


const BiomarkerWidget: React.FC<{ biomarker: Biomarker, isExpanded?: boolean, onClick?: () => void }> = ({ biomarker, isExpanded = false, onClick }) => {
    const Icon = getBiomarkerIcon(biomarker.icon);
    const statusClasses = {
        red: 'border-error-red/30 shadow-error-red/20',
        orange: 'border-orange-primary/30 shadow-orange-primary/20',
        green: 'border-white/10'
    };
    
    const explanationVariants = {
        hidden: { opacity: 0, height: 0, marginTop: 0 },
        visible: { 
            opacity: 1, 
            height: 'auto', 
            marginTop: '1rem',
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const, delay: 0.25 }
        }
    };

    return (
        <motion.div
            layoutId={biomarker.name}
            onClick={onClick}
            className={`relative flex flex-col bg-surface/60 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl shadow-black/30 border ${statusClasses[biomarker.status]} ${!isExpanded ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-purple-primary/30 cursor-pointer' : ''} ${isExpanded ? 'w-[90vw] max-w-md mx-auto' : 'w-full'}`}
        >
            <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-start">
                    <Icon className="w-8 h-8" />
                    {!isExpanded && <ProgressArc progress={biomarker.normalizedValue} status={biomarker.status} />}
                </div>
                
                <div className="flex-grow" />

                <div>
                    <p className="text-sm font-medium text-white/90 uppercase tracking-widest">{biomarker.name}</p>
                    <div className="flex items-baseline mt-1">
                        <p className="text-4xl font-light text-white tracking-[-1px]">{biomarker.value.split(' ')[0]}</p>
                        <p className="text-lg font-light text-text-muted ml-1">{biomarker.value.split(' ')[1] || '%'}</p>
                    </div>
                </div>
            </div>

            <motion.div
                className="overflow-hidden"
                variants={explanationVariants}
                animate={isExpanded ? 'visible' : 'hidden'}
                initial={false}
            >
                <div className="my-4 border-t border-white/10"></div>
                <h3 className="text-base font-bold text-purple-light uppercase tracking-wider">What this means</h3>
                <p className="text-sm text-text-secondary mt-2">{biomarker.explanation}</p>
            </motion.div>
        </motion.div>
    );
};


const AnalysisResultsScreen: React.FC<AnalysisResultsScreenProps> = ({ analysisData, onNewRecording, onClose }) => {
  const [selectedBiomarker, setSelectedBiomarker] = useState<Biomarker | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const acousticBiomarkers = analysisData.biomarkers.slice(0, 5);
  const articulationBiomarkers = analysisData.biomarkers.slice(5);

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20 max-w-2xl mx-auto">
        <button onClick={onClose} className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
            <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-medium text-white">Analysis Results</h1>
        <button className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
            <Share className="w-5 h-5 text-white" />
        </button>
    </header>
  );

  return (
    <div className="min-h-screen w-full p-4 pt-[80px] pb-10 max-w-2xl mx-auto">
        <Header />
        <motion.div
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
            <motion.div variants={itemVariants}>
              <StressIndicator stressLevel={analysisData.stressLevel} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <SpectrogramCard audioUrl={analysisData.audioUrl} />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <AISummaryCard summary={analysisData.aiSummary} />
            </motion.div>

            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-bold text-white mb-4">Acoustic Measures</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {acousticBiomarkers.map(bm => (
                        <BiomarkerWidget key={bm.name} biomarker={bm} onClick={() => setSelectedBiomarker(bm)} />
                    ))}
                </div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <h2 className="text-xl font-bold text-white mb-4">Articulation Measures</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {articulationBiomarkers.map(bm => (
                         <BiomarkerWidget key={bm.name} biomarker={bm} onClick={() => setSelectedBiomarker(bm)} />
                    ))}
                </div>
            </motion.div>
            
            <motion.div className="space-y-4 pt-4" variants={itemVariants}>
                 <button className="w-full h-14 rounded-2xl flex items-center justify-center font-bold text-white bg-gradient-to-r from-purple-dark to-purple-primary shadow-lg shadow-purple-dark/30 hover:scale-[1.02] transition-transform">
                    <Bookmark className="w-5 h-5 mr-2"/> Save to History
                </button>
                 <button onClick={onNewRecording} className="w-full h-14 rounded-2xl flex items-center justify-center font-medium text-white glass-base border-purple-primary border hover:bg-purple-primary/20 transition-colors">
                    <Microphone className="w-5 h-5 mr-2 text-purple-primary"/> Record Another Sample
                </button>
            </motion.div>
        </motion.div>
        
        <AnimatePresence>
          {selectedBiomarker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              onClick={() => setSelectedBiomarker(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div onClick={(e) => e.stopPropagation()}>
                <BiomarkerWidget biomarker={selectedBiomarker} isExpanded={true} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

    </div>
  );
};

export default AnalysisResultsScreen;