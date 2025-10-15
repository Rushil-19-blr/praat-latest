
export type ScreenState = 'RECORDING' | 'RESULTS';
export type RecordingState = 'IDLE' | 'RECORDING' | 'ANALYZING' | 'COMPLETE' | 'ERROR';

export interface Biomarker {
  name: string;
  value: string;
  status: 'green' | 'orange' | 'red';
  detail: string;
  explanation: string;
  icon: 'SineWave' | 'Range' | 'WavyLine' | 'Amplitude' | 'Signal' | 'Curve1' | 'Curve2' | 'Speedometer';
  normalizedValue: number; // Value from 0 to 1 for visualizations
}

export interface AnalysisData {
  stressLevel: number;
  biomarkers: Biomarker[];
  confidence: number;
  snr: number;
  audioUrl: string;
  aiSummary: string;
}

export interface RawBiomarkerData {
  stress_level: number;
  f0_mean: number;
  f0_range: number;
  jitter: number;
  shimmer: number;
  hnr: number;
  f1: number;
  f2: number;
  speech_rate: number;
  confidence: number;
  snr: number;
  ai_summary: string;
}