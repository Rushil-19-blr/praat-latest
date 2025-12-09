import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from "@google/genai";
import { decode, encode, decodeAudioData } from '../utils/audio';
import { THERAPIST_SYSTEM_PROMPT, THERAPIST_INITIAL_USER_PROMPT } from '../constants';
import type { LiveSessionQuestion } from '../types';
import { generateId } from '../services/personalizationService';

export const useGeminiLive = (stream: MediaStream | null, muted: boolean = true) => {
    const [isConnected, setIsConnected] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(muted);
    const transcriptRef = useRef('');

    // Use ref for muted state so the audio processor can access the latest value
    const mutedRef = useRef(muted);
    const [lastAgentResponse, setLastAgentResponse] = useState<string>('');


    const sessionRef = useRef<any | null>(null);
    const prevMutedRef = useRef<boolean>(muted);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const silentGainRef = useRef<GainNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const shouldReconnectRef = useRef<boolean>(true);

    // Live session Q&A tracking
    const [liveSessionQA, setLiveSessionQA] = useState<LiveSessionQuestion[]>([]);
    const lastAIQuestionRef = useRef<string | null>(null);
    const userResponseAccumulatorRef = useRef<string>('');

    const cleanup = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (silentGainRef.current) {
            try { silentGainRef.current.disconnect(); } catch { }
            silentGainRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
        }
        setIsConnected(false);
    }, []);

    // Update isMuted state and ref when muted prop changes
    useEffect(() => {
        mutedRef.current = muted;
        setIsMuted(muted);
        // Attempt to resume contexts on unmute (user interaction just happened)
        if (!muted) {
            if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'running') {
                inputAudioContextRef.current.resume().catch(() => { });
            }
            if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'running') {
                outputAudioContextRef.current.resume().catch(() => { });
            }
        }

        // Detect transitions and inform the live session
        try {
            const wasMuted = prevMutedRef.current;
            if (sessionRef.current) {
                if (wasMuted && !muted) {
                    // Unmuted: start new buffer and ask for streaming response immediately
                    try { sessionRef.current.sendRealtimeInput({ event: 'input_audio_buffer.start' }); } catch { }
                    try { sessionRef.current.sendRealtimeInput({ event: 'response.create' }); } catch { }
                } else if (!wasMuted && muted) {
                    // Muted: commit current buffer and request a response
                    try { sessionRef.current.sendRealtimeInput({ event: 'input_audio_buffer.commit' }); } catch { }
                    try { sessionRef.current.sendRealtimeInput({ event: 'response.create' }); } catch { }
                }
            }
        } finally {
            prevMutedRef.current = muted;
        }
    }, [muted]);

    useEffect(() => {
        if (!stream) {
            cleanup();
            return;
        }

        let isCancelled = false;
        // Allow reconnects when we have a valid stream unless explicitly disabled via disconnect
        shouldReconnectRef.current = true;

        const connect = async () => {
            try {
                // Do not proceed if the component has unmounted.
                if (isCancelled) return;

                // Create a fresh instance each time to ensure the latest API key is used.
                const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY as string });

                if (sessionRef.current) return;

                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000, latencyHint: 'interactive' as any });
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000, latencyHint: 'interactive' as any });

                const sessionPromise = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                            if (isCancelled) return;
                            setIsConnected(true);
                            setError(null);

                            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                            mediaStreamSourceRef.current = source;
                            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(1024, 1, 1);
                            scriptProcessorRef.current = scriptProcessor;

                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                // Only send audio data if not muted (use ref to get current value)
                                if (!mutedRef.current) {
                                    try {
                                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                        const pcmBlob = createPcmBlob(inputData);
                                        sessionPromise.then((session) => {
<<<<<<< HEAD
                                            // rigorous check: active session, matching the promise, and not in cleanup
                                            if (sessionRef.current === session) {
                                                try {
                                                    session.sendRealtimeInput({ event: 'input_audio_buffer.append', media: pcmBlob });
                                                } catch (e) {
                                                    // transport errors can occur if session is transitioning
                                                }
=======
                                            try {
                                                session.sendRealtimeInput({ event: 'input_audio_buffer.append', media: pcmBlob });
                                            } catch (e) {
                                                // transport errors can occur if session is transitioning
>>>>>>> 772dfd6a6af92a3a2e89c8abfbfd0ef96497a84c
                                            }
                                        });
                                    } catch { }
                                }
                            };
                            // Connect through a silent gain node to keep the graph active without audible loopback
                            const silentGain = inputAudioContextRef.current!.createGain();
                            silentGain.gain.value = 0;
                            silentGainRef.current = silentGain;

                            source.connect(scriptProcessor);
                            scriptProcessor.connect(silentGain);
                            silentGain.connect(inputAudioContextRef.current!.destination);

                            // Request a streaming response to start the therapy session
                            // The system prompt includes instructions to introduce themselves and ask an opening question
                            try {
                                sessionPromise.then((session) => {
                                    try {
                                        // Request a response so the therapist can introduce themselves based on system instructions
                                        session.sendRealtimeInput({ event: 'response.create' });
                                    } catch { }
                                });
                            } catch { }
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            if (message.serverContent?.outputTranscription) {
                                transcriptRef.current += message.serverContent.outputTranscription.text;
                                setTranscript(transcriptRef.current);
                            }
                            if (message.serverContent?.turnComplete) {
                                const completedResponse = transcriptRef.current;
                                setLastAgentResponse(completedResponse);

                                // Check if AI asked a question (store for Q&A tracking)
                                if (completedResponse.includes('?')) {
                                    lastAIQuestionRef.current = completedResponse;
                                    userResponseAccumulatorRef.current = ''; // Reset user response
                                }

                                // If we have a pending question and user has responded, store the Q&A
                                if (lastAIQuestionRef.current && userResponseAccumulatorRef.current.trim()) {
                                    const qa: LiveSessionQuestion = {
                                        questionId: generateId(),
                                        questionText: lastAIQuestionRef.current,
                                        timestamp: new Date().toISOString(),
                                        studentAnswer: userResponseAccumulatorRef.current.trim()
                                    };
                                    setLiveSessionQA(prev => [...prev, qa]);
                                    console.log('[LiveQA] Captured Q&A:', qa);
                                    lastAIQuestionRef.current = null;
                                    userResponseAccumulatorRef.current = '';
                                }

                                transcriptRef.current = '';
                                setTranscript('');
                            }

                            // Track user input transcriptions (if available from speech-to-text)
                            if (message.serverContent?.inputTranscription) {
                                userResponseAccumulatorRef.current += message.serverContent.inputTranscription.text || '';
                            }

                            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData && outputAudioContextRef.current) {
                                const audioContext = outputAudioContextRef.current;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                                const audioBuffer = await decodeAudioData(decode(audioData), audioContext, 24000, 1);
                                const source = audioContext.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(audioContext.destination);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                            }
                        },
                        // FIX: The type of `e` was changed from `Error` to `ErrorEvent` to match the expected type for the `onerror` callback.
                        onerror: (e: ErrorEvent) => {
                            console.error('Gemini Live Error:', e);
                            if (e.message.includes("API key") || e.message.includes("entity was not found")) {
                                setError("Connection failed. Please verify your API key and try again.");
                            } else {
                                setError('A connection error occurred with the AI assistant.');
                            }
                            cleanup();
                        },
                        onclose: () => {
                            if (isCancelled) return;
                            setIsConnected(false);
                            cleanup();
                            // Try to reconnect shortly after close if stream still present and reconnects are allowed
                            if (!shouldReconnectRef.current) {
                                return;
                            }
                            setTimeout(() => {
                                if (!isCancelled && stream && !sessionRef.current) {
                                    // Best-effort resume contexts before reconnect
                                    try { inputAudioContextRef.current?.resume().catch(() => { }); } catch { }
                                    try { outputAudioContextRef.current?.resume().catch(() => { }); } catch { }
                                    // Avoid unbounded loops; connect will no-op if a session exists
                                    try {
                                        connect();
                                    } catch { }
                                }
                            }, 500);
                        },
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        outputAudioTranscription: {},
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                        },
                        systemInstruction: THERAPIST_SYSTEM_PROMPT,
                        inputAudioTranscription: {},
                    },
                });

                sessionRef.current = await sessionPromise;
            } catch (err) {
                console.error("Failed to start Gemini Live session:", err);
                if (err instanceof Error && (err.message.includes("API key") || err.message.includes("entity was not found"))) {
                    setError("Could not start AI assistant. Your API key might be invalid.");
                } else {
                    setError("Could not start AI assistant. Please check microphone permissions.");
                }
            }
        };

        connect();

        return () => {
            isCancelled = true;
            cleanup();
        };
    }, [stream, cleanup]);

    const createPcmBlob = (data: Float32Array): GenaiBlob => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const disconnect = useCallback(() => {
        // Prevent auto-reconnect and tear down resources
        shouldReconnectRef.current = false;
        cleanup();
    }, [cleanup]);

    const sendText = useCallback((text: string) => {
        if (sessionRef.current) {
            try {
                console.log('[sendText] Sending to Gemini:', text);
                // Use sendClientContent for text messages
                sessionRef.current.sendClientContent({
                    turns: text,
                    turnComplete: true
                });
            } catch (e) {
                console.error("[sendText] Failed to send text:", e);
            }
        } else {
            console.warn('[sendText] No active session');
        }
    }, []);

    // Clear live session Q&A (useful for new sessions)
    const clearLiveSessionQA = useCallback(() => {
        setLiveSessionQA([]);
        lastAIQuestionRef.current = null;
        userResponseAccumulatorRef.current = '';
    }, []);

    return { isConnected, transcript, error, isMuted, disconnect, lastAgentResponse, sendText, liveSessionQA, clearLiveSessionQA };
};
