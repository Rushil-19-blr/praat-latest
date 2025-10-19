export const SYSTEM_PROMPT = {
  parts: [{
    text: "You are a friendly, warm person meeting someone new. Start a natural conversation by introducing yourself and asking them about their day or how they're feeling. Keep the conversation light and engaging. Respond as if you're talking to a friend."
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

export const formatBiomarkers = (data: any) => {
  // Helper function to safely get numeric values with defaults
  const getValue = (value: any, defaultValue: number = 0) => {
    return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  };

  // Extract biomarkers from nested structure or root level
  const biomarkers = data.inferred_biomarkers || data;
  
  return [
    {
      name: "F0 Mean",
      value: `${getValue(biomarkers.f0_mean || biomarkers.f0_mean_hz).toFixed(1)} Hz`,
      status: getValue(biomarkers.f0_mean || biomarkers.f0_mean_hz) > 200 ? 'red' : getValue(biomarkers.f0_mean || biomarkers.f0_mean_hz) > 150 ? 'orange' : 'green',
      detail: "Average pitch",
      explanation: "Higher values may indicate stress or tension",
      icon: 'SineWave' as const,
      normalizedValue: Math.min(getValue(biomarkers.f0_mean || biomarkers.f0_mean_hz) / 300, 1)
    },
    {
      name: "F0 Range",
      value: `${getValue(biomarkers.f0_range || biomarkers.f0_range_hz).toFixed(1)} Hz`,
      status: getValue(biomarkers.f0_range || biomarkers.f0_range_hz) < 50 ? 'red' : getValue(biomarkers.f0_range || biomarkers.f0_range_hz) < 100 ? 'orange' : 'green',
      detail: "Pitch variability",
      explanation: "Lower values may indicate monotone speech",
      icon: 'Range' as const,
      normalizedValue: Math.min(getValue(biomarkers.f0_range || biomarkers.f0_range_hz) / 200, 1)
    },
    {
      name: "Jitter",
      value: `${getValue(biomarkers.jitter || biomarkers.jitter_percent).toFixed(2)}%`,
      status: getValue(biomarkers.jitter || biomarkers.jitter_percent) > 1.0 ? 'red' : getValue(biomarkers.jitter || biomarkers.jitter_percent) > 0.5 ? 'orange' : 'green',
      detail: "Frequency perturbation",
      explanation: "Higher values indicate voice instability",
      icon: 'WavyLine' as const,
      normalizedValue: Math.min(getValue(biomarkers.jitter || biomarkers.jitter_percent) / 2, 1)
    },
    {
      name: "Shimmer",
      value: `${getValue(biomarkers.shimmer || biomarkers.shimmer_percent).toFixed(2)}%`,
      status: getValue(biomarkers.shimmer || biomarkers.shimmer_percent) > 5.0 ? 'red' : getValue(biomarkers.shimmer || biomarkers.shimmer_percent) > 2.5 ? 'orange' : 'green',
      detail: "Amplitude perturbation",
      explanation: "Higher values indicate voice instability",
      icon: 'Amplitude' as const,
      normalizedValue: Math.min(getValue(biomarkers.shimmer || biomarkers.shimmer_percent) / 10, 1)
    },
    {
      name: "HNR",
      value: `${getValue(biomarkers.hnr || biomarkers.hnr_db).toFixed(1)} dB`,
      status: getValue(biomarkers.hnr || biomarkers.hnr_db) < 10 ? 'red' : getValue(biomarkers.hnr || biomarkers.hnr_db) < 15 ? 'orange' : 'green',
      detail: "Harmonics-to-Noise Ratio",
      explanation: "Lower values indicate more noise in voice",
      icon: 'Signal' as const,
      normalizedValue: Math.min(getValue(biomarkers.hnr || biomarkers.hnr_db) / 30, 1)
    },
    {
      name: "F1",
      value: `${getValue(biomarkers.f1 || biomarkers.f1_hz).toFixed(0)} Hz`,
      status: 'green',
      detail: "First formant",
      explanation: "Vowel quality indicator",
      icon: 'Curve1' as const,
      normalizedValue: Math.min(getValue(biomarkers.f1 || biomarkers.f1_hz) / 1000, 1)
    },
    {
      name: "F2",
      value: `${getValue(biomarkers.f2 || biomarkers.f2_hz).toFixed(0)} Hz`,
      status: 'green',
      detail: "Second formant",
      explanation: "Vowel quality indicator",
      icon: 'Curve2' as const,
      normalizedValue: Math.min(getValue(biomarkers.f2 || biomarkers.f2_hz) / 2000, 1)
    },
    {
      name: "Speech Rate",
      value: `${getValue(biomarkers.speech_rate || biomarkers.speech_rate_wpm).toFixed(0)} WPM`,
      status: getValue(biomarkers.speech_rate || biomarkers.speech_rate_wpm) > 200 ? 'red' : getValue(biomarkers.speech_rate || biomarkers.speech_rate_wpm) > 150 ? 'orange' : 'green',
      detail: "Words per minute",
      explanation: "Speaking speed indicator",
      icon: 'Speedometer' as const,
      normalizedValue: Math.min(getValue(biomarkers.speech_rate || biomarkers.speech_rate_wpm) / 250, 1)
    }
  ];
};