import type { RawBiomarkerData, Biomarker } from './types';

// Helper to normalize a value within a given range
const normalize = (value: number, min: number, max: number): number => {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

export const formatBiomarkers = (data: RawBiomarkerData): Biomarker[] => [
  { name: 'Pitch (F0)', value: `${data.f0_mean.toFixed(0)} Hz`, status: data.f0_mean > 150 ? 'orange' : 'green', detail: '↑18 Hz vs. baseline', explanation: 'This measures your average vocal pitch. An elevated F0, like yours, is often associated with increased tension in the vocal cords—a common physiological response to psychological stress.', icon: 'SineWave', normalizedValue: normalize(data.f0_mean, 130, 180) },
  { name: 'Pitch Range', value: `${data.f0_range.toFixed(0)} Hz`, status: data.f0_range > 75 ? 'red' : 'orange', detail: '↑35% from baseline', explanation: 'This is the span between the lowest and highest pitch in your speech. A wider range can indicate heightened emotional arousal or anxiety, as stress can affect vocal control.', icon: 'Range', normalizedValue: normalize(data.f0_range, 40, 100) },
  { name: 'Jitter', value: `${data.jitter.toFixed(2)}%`, status: data.jitter > 1.0 ? 'orange' : 'green', detail: 'vs. normal (<1.0%)', explanation: 'Jitter measures the frequency variation between vocal cord vibrations. High jitter can indicate stress, while abnormally low jitter might suggest a strained speech pattern.', icon: 'WavyLine', normalizedValue: normalize(data.jitter, 0, 2) },
  { name: 'Shimmer', value: `${data.shimmer.toFixed(2)}%`, status: data.shimmer > 3.5 ? 'orange' : 'green', detail: 'vs. normal (<3.5%)', explanation: 'Shimmer relates to the variation in vocal amplitude. Unusually high shimmer can point to vocal instability linked to stress.', icon: 'Amplitude', normalizedValue: normalize(data.shimmer, 0, 6) },
  { name: 'Voice Quality (HNR)', value: `${data.hnr.toFixed(1)} dB`, status: data.hnr < 18 ? 'red' : data.hnr < 20 ? 'orange' : 'green', detail: 'vs. optimal (>20 dB)', explanation: 'The Harmonics-to-Noise Ratio contrasts clear tonal sound with breathiness. A lower HNR suggests a more "breathy" voice, which can occur when stress affects breathing patterns and vocal stability.', icon: 'Signal', normalizedValue: normalize(data.hnr, 10, 25)},
  { name: 'Formant F1', value: `${data.f1.toFixed(0)} Hz`, status: data.f1 > 750 ? 'red' : 'orange', detail: '↑12% from baseline', explanation: 'Formants are resonant frequencies of the vocal tract. An elevated F1 is linked to changes in mouth and pharynx shape due to muscle tension, often a subconscious reaction to stress.', icon: 'Curve1', normalizedValue: normalize(data.f1, 650, 850) },
  { name: 'Formant F2', value: `${data.f2.toFixed(0)} Hz`, status: data.f2 > 1500 ? 'red' : 'orange', detail: '↑22% from baseline', explanation: 'The second formant (F2) is related to tongue position and articulation. Significant deviation from your baseline can indicate less precise speech, a cognitive side-effect of stress.', icon: 'Curve2', normalizedValue: normalize(data.f2, 1200, 1600) },
  { name: 'Speech Rate', value: `${data.speech_rate.toFixed(0)} WPM`, status: data.speech_rate > 165 ? 'orange' : 'green', detail: 'vs. avg (140-160)', explanation: 'This is the speed of your speech. An increased rate is a classic indicator of anxiety or pressure, as the speaker may be rushing their thoughts or experiencing a flight-or-fight response.', icon: 'Speedometer', normalizedValue: normalize(data.speech_rate, 130, 190) },
];

export const streaksData = [
    { month: 'Jul', sessions: 2, weeks: [1, 0, 1, 0] },
    { month: 'Aug', sessions: 5, weeks: [2, 1, 1, 1] },
    { month: 'Sep', sessions: 8, weeks: [2, 2, 3, 1] },
    { month: 'Oct', sessions: 3, weeks: [0, 1, 2, 0] },
    { month: 'Nov', sessions: 6, weeks: [1, 2, 1, 2] },
    { month: 'Dec', sessions: 4, weeks: [1, 1, 2, 0] },
];

export const calendarSessionData = [2, 5, 8, 12, 15, 18, 22, 25];

export const calibrationQuotes = [
  "Do more things that make you forget to look at your phone.",
  "The best way to predict the future is to create it.",
  "Believe you can and you're halfway there.",
  "The only way to do great work is to love what you do.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "It does not matter how slowly you go as long as you do not stop.",
  "Everything you’ve ever wanted is on the other side of fear.",
  "Strive not to be a success, but rather to be of value.",
  "The journey of a thousand miles begins with a single step.",
  "What you get by achieving your goals is not as important as what you become by achieving your goals.",
  "Your limitation is only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "The harder you work for something, the greater you'll feel when you achieve it."
];