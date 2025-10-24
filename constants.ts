export const SYSTEM_PROMPT = {
  parts: [{
    text: "You are a friendly, warm person meeting someone new. Start a natural conversation by introducing yourself and asking them about their day or how they're feeling. Keep the conversation light and engaging. Respond as if you're talking to a friend. Keep responses brief and conversational to encourage natural dialogue."
  }]
};

export const calibrationQuotes = [
  "The quick brown fox jumps over the lazy dog.",
  "A journey of a thousand miles begins with a single step.",
  "The early bird catches the worm.",
  "Practice makes perfect.",
  "Where there's a will, there's a way.",
  "The pen is mightier than the sword.",
  "Actions speak louder than words.",
  "Better late than never.",
  "Don't count your chickens before they hatch.",
  "Every cloud has a silver lining.",
  "Fortune favors the bold.",
  "Good things come to those who wait.",
  "Honesty is the best policy.",
  "It's never too late to learn.",
  "Knowledge is power.",
  "Life is what you make it.",
  "No pain, no gain.",
  "Opportunity knocks but once.",
  "Patience is a virtue.",
  "Quality over quantity.",
  "Rome wasn't built in a day.",
  "Slow and steady wins the race.",
  "The best is yet to come.",
  "Time heals all wounds.",
  "United we stand, divided we fall.",
  "Variety is the spice of life.",
  "When in Rome, do as the Romans do.",
  "You can't have your cake and eat it too.",
  "A picture is worth a thousand words.",
  "Beauty is in the eye of the beholder."
];

import type { Biomarker } from './types';

export const formatBiomarkers = (data: any): Biomarker[] => {
  // Helper function to safely get numeric values with defaults
  const getValue = (value: any, defaultValue: number = 0) => {
    return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  };

  // Extract biomarkers from nested structure or root level
  const biomarkers = data.inferred_biomarkers || data;
  
  const f0Mean = getValue(biomarkers.f0_mean || biomarkers.f0_mean_hz);
  const f0MeanStatus: Biomarker['status'] = f0Mean > 200 ? 'red' : f0Mean > 150 ? 'orange' : 'green';
  const f0Range = getValue(biomarkers.f0_range || biomarkers.f0_range_hz);
  const f0RangeStatus: Biomarker['status'] = f0Range < 50 ? 'red' : f0Range < 100 ? 'orange' : 'green';
  const jitter = getValue(biomarkers.jitter || biomarkers.jitter_percent);
  const jitterStatus: Biomarker['status'] = jitter > 1.0 ? 'red' : jitter > 0.5 ? 'orange' : 'green';
  const shimmer = getValue(biomarkers.shimmer || biomarkers.shimmer_percent);
  const shimmerStatus: Biomarker['status'] = shimmer > 5.0 ? 'red' : shimmer > 2.5 ? 'orange' : 'green';
  const hnr = getValue(biomarkers.hnr || biomarkers.hnr_db);
  const hnrStatus: Biomarker['status'] = hnr < 10 ? 'red' : hnr < 15 ? 'orange' : 'green';
  const f1 = getValue(biomarkers.f1 || biomarkers.f1_hz);
  const f2 = getValue(biomarkers.f2 || biomarkers.f2_hz);
  const speechRate = getValue(biomarkers.speech_rate || biomarkers.speech_rate_wpm);
  const speechRateStatus: Biomarker['status'] = speechRate > 200 ? 'red' : speechRate > 150 ? 'orange' : 'green';

  return [
    {
      name: "F0 Mean",
      value: `${f0Mean.toFixed(1)} Hz`,
      status: f0MeanStatus,
      detail: "Average pitch",
      explanation: "Higher values may indicate stress or tension",
      icon: 'SineWave' as const,
      normalizedValue: Math.min(f0Mean / 300, 1)
    },
    {
      name: "F0 Range",
      value: `${f0Range.toFixed(1)} Hz`,
      status: f0RangeStatus,
      detail: "Pitch variability",
      explanation: "Lower values may indicate monotone speech",
      icon: 'Range' as const,
      normalizedValue: Math.min(f0Range / 200, 1)
    },
    {
      name: "Jitter",
      value: `${jitter.toFixed(2)}%`,
      status: jitterStatus,
      detail: "Frequency perturbation",
      explanation: "Higher values indicate voice instability",
      icon: 'WavyLine' as const,
      normalizedValue: Math.min(jitter / 2, 1)
    },
    {
      name: "Shimmer",
      value: `${shimmer.toFixed(2)}%`,
      status: shimmerStatus,
      detail: "Amplitude perturbation",
      explanation: "Higher values indicate voice instability",
      icon: 'Amplitude' as const,
      normalizedValue: Math.min(shimmer / 10, 1)
    },
    {
      name: "HNR",
      value: `${hnr.toFixed(1)} dB`,
      status: hnrStatus,
      detail: "Harmonics-to-Noise Ratio",
      explanation: "Lower values indicate more noise in voice",
      icon: 'Signal' as const,
      normalizedValue: Math.min(hnr / 30, 1)
    },
    {
      name: "F1",
      value: `${f1.toFixed(0)} Hz`,
      status: 'green',
      detail: "First formant",
      explanation: "Vowel quality indicator",
      icon: 'Curve1' as const,
      normalizedValue: Math.min(f1 / 1000, 1)
    },
    {
      name: "F2",
      value: `${f2.toFixed(0)} Hz`,
      status: 'green',
      detail: "Second formant",
      explanation: "Vowel quality indicator",
      icon: 'Curve2' as const,
      normalizedValue: Math.min(f2 / 2000, 1)
    },
    {
      name: "Speech Rate",
      value: `${speechRate.toFixed(0)} WPM`,
      status: speechRateStatus,
      detail: "Words per minute",
      explanation: "Speaking speed indicator",
      icon: 'Speedometer' as const,
      normalizedValue: Math.min(speechRate / 250, 1)
    }
  ];
};