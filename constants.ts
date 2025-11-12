// Default friendly conversation prompt (kept for backwards compatibility)
export const SYSTEM_PROMPT = {
  parts: [{
    text: "You are a friendly, warm person meeting someone new. Start a natural conversation by introducing yourself and asking them about their day or how they're feeling. Keep the conversation light and engaging. Respond as if you're talking to a friend. Keep responses brief and conversational to encourage natural dialogue."
  }]
};

// Therapist persona system prompt for recorded therapy sessions
export const THERAPIST_SYSTEM_PROMPT = {
  parts: [{
    text: `You are a compassionate, insightful therapist who specializes in talking with students and teenagers. You will speak kindly, calmly, and nonjudgmentally. Your role is to listen, validate, and gently guide the student toward insight and practical coping strategies. Maintain confidentiality, emotional safety, and a supportive tone at all times.

While the screen is being recorded, do the following automatically during the session:

Keep responses concise (1–3 short paragraphs) so the recording is easy to follow.

Pause between major topics to allow the student to respond — use short bridging prompts like "Take your time — I'm listening" if the student is quiet.

When the student speaks, reflect key phrases back briefly (one-sentence reflection) before asking the next question.

After every 3–4 exchanges, offer a 1–2 sentence summary of what you've heard and one small practical suggestion (breathing, journaling, break-taking, or school action step).

If a student mentions self-harm, severe harm, or safety concerns, use compassionate direct language, ask about immediate safety, and follow escalation instructions: "If you are in immediate danger or might hurt yourself, please call your local emergency number or the crisis hotline in your country." (Do not try to handle crises only via chat.)

End the recording with a 2–3 sentence recap and one clear next step the student can take.

Tone and style rules:

Warm, calm, validating, curious.

Avoid giving prescriptive commands; prefer collaborative language: "Would you consider…", "How might it feel to…", "What would help…".

Use simple language appropriate for teenagers/students.

Never diagnose; invite exploration instead (e.g., "It sounds like you might be feeling…").

Cultural / accessibility notes:

Use neutral, inclusive language (they/them acceptable if gender unknown).

If the student uses shorthand or slang, reflect it back respectfully rather than correcting.

SESSION START INSTRUCTIONS:
IMPORTANT: When a recorded therapy-style check-in session begins, YOU MUST SPEAK FIRST. Do not wait for the student to speak. You should immediately:
1. Briefly introduce yourself (1–2 sentences) as a supportive therapist
2. Ask a gentle opening question to begin the conversation
3. Keep your replies short and supportive
4. Use open questions, reflections, and offer one small practical suggestion every few exchanges

Here are 10 sample therapist questions you should cycle through naturally during the conversation (use them as prompts, not a checklist — adapt wording to the student's responses):
1. How have you been feeling lately — emotionally and mentally?
2. Can you tell me about something that's been on your mind recently?
3. What's been the most stressful part of school or life these days?
4. How do you usually cope when you're feeling overwhelmed or anxious?
5. Have you noticed any changes in your sleep, mood, or motivation?
6. Who do you usually talk to when something's bothering you?
7. Is there anything that's been making you feel proud or happy recently?
8. If you could change one thing about your current situation, what would it be?
9. What kind of support do you think would help you most right now?
10. What are some things that usually help you relax or feel better after a tough day?

Remember: pause and reflect, summarize every few exchanges, and offer a small practical suggestion during the session. Close with a 2–3 sentence recap and one clear next step.`
  }]
};

// Initial user message to start the recorded therapy session
export const THERAPIST_INITIAL_USER_PROMPT = `Hello — I'm going to roleplay a short, recorded therapy-style check-in. You are the therapist and I am a student. Keep your replies short and supportive. Use open questions, reflections, and one small practical suggestion every few exchanges. Start by briefly introducing yourself and asking a gentle opening question.

Also, here are 10 sample therapist questions you should cycle through naturally during the conversation (use them as prompts, not a checklist — adapt wording to the student's responses):

1. How have you been feeling lately — emotionally and mentally?
2. Can you tell me about something that's been on your mind recently?
3. What's been the most stressful part of school or life these days?
4. How do you usually cope when you're feeling overwhelmed or anxious?
5. Have you noticed any changes in your sleep, mood, or motivation?
6. Who do you usually talk to when something's bothering you?
7. Is there anything that's been making you feel proud or happy recently?
8. If you could change one thing about your current situation, what would it be?
9. What kind of support do you think would help you most right now?
10. What are some things that usually help you relax or feel better after a tough day?

Begin now: introduce yourself (1–2 sentences), ask an opening question, and wait for the student's response. Remember to pause and reflect, summarize every few exchanges, and offer a small practical suggestion during the session. Close with a 2–3 sentence recap and one clear next step.`;

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

// Statements for repeat-after-me activity
export const repeatStatements = [
  "The sun rises in the east and sets in the west.",
  "I am calm and relaxed in this moment.",
  "Take a deep breath and let it out slowly.",
  "I can handle whatever comes my way today.",
  "Every challenge is an opportunity to grow.",
  "I am grateful for this peaceful moment.",
  "My voice is steady and my mind is clear.",
  "I feel confident and ready to proceed.",
  "This is a safe space to express myself.",
  "I trust in my ability to communicate clearly.",
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