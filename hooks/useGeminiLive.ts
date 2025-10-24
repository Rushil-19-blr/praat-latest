import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from "@google/genai";
import { decode, encode, decodeAudioData } from '../utils/audio';

export const useGeminiLive = (stream: MediaStream | null) => {
    const [isConnected, setIsConnected] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const transcriptRef = useRef('');

    const sessionRef = useRef<any | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);

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
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
        }
        setIsConnected(false);
    }, []);

    useEffect(() => {
        if (!stream) {
            cleanup();
            return;
        }

        let isCancelled = false;
        
        const connect = async () => {
            try {
                // Do not proceed if the component has unmounted.
                if (isCancelled) return;

                // Create a fresh instance each time to ensure the latest API key is used.
                const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY as string });

                if (sessionRef.current) return;

                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                
                const sessionPromise = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                            if (isCancelled) return;
                            setIsConnected(true);
                            setError(null);
                            
                            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                            mediaStreamSourceRef.current = source;
                            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                            scriptProcessorRef.current = scriptProcessor;

                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob = createPcmBlob(inputData);
                                sessionPromise.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(scriptProcessor);
                            scriptProcessor.connect(inputAudioContextRef.current!.destination);
                        },
                        onmessage: async (message: LiveServerMessage) => {
                           if (message.serverContent?.outputTranscription) {
                               transcriptRef.current += message.serverContent.outputTranscription.text;
                               setTranscript(transcriptRef.current);
                           }
                           if (message.serverContent?.turnComplete) {
                               transcriptRef.current = '';
                               setTranscript('');
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
                        },
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        outputAudioTranscription: {},
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                        },
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

    return { isConnected, transcript, error };
};
