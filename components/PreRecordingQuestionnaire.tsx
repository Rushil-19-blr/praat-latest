import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, Mic } from 'lucide-react';
import { BeamsBackground } from './ui/beams-background';

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface PreRecordingQuestionnaireProps {
  onSubmit: (answers: QuestionnaireAnswers) => void;
  onBack: () => void;
}

export type ResponseOption = 
  | 'Strongly Disagree'
  | 'Disagree'
  | 'Neutral'
  | 'Agree'
  | 'Strongly Agree'
  | 'Yes'
  | 'No'
  | "I'm not sure";

export interface QuestionAnswer {
  question: string;
  answer: ResponseOption | null;
}

export interface QuestionnaireAnswers {
  [questionIndex: number]: ResponseOption | string;
}

interface Question {
  text: string;
  type: 'multiple-choice' | 'open-ended';
}

const QUESTIONS: Question[] = [
  { text: "I have been feeling more anxious or stressed than usual lately.", type: 'multiple-choice' },
  { text: "I find it difficult to relax or calm my mind.", type: 'multiple-choice' },
  { text: "Please describe what situations or thoughts make you feel most stressed or anxious.", type: 'open-ended' },
  { text: "What strategies or activities help you feel more relaxed or calm?", type: 'open-ended' },
  { text: "Are you currently sick or experiencing any illness?", type: 'multiple-choice' }
];

const RESPONSE_OPTIONS: ResponseOption[] = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree'
];

const SICK_QUESTION_OPTIONS: ResponseOption[] = [
  'Yes',
  'No',
  "I'm not sure"
];

const PreRecordingQuestionnaire: React.FC<PreRecordingQuestionnaireProps> = ({ onSubmit, onBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [selectedAnswer, setSelectedAnswer] = useState<ResponseOption | null>(null);
  const [openEndedAnswer, setOpenEndedAnswer] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const finalTranscriptRef = useRef<string>('');
  const questionIndexRef = useRef<number>(currentQuestionIndex);
  const recognitionQuestionIndexRef = useRef<number>(-1);
  const isRecordingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const userStoppedRef = useRef<boolean>(false); // Track which question recognition is for

  // Keep question index ref in sync
  useEffect(() => {
    questionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;
  const isOpenEndedQuestion = currentQuestion.type === 'open-ended';
  const isSickQuestion = currentQuestion.text.includes('sick') || currentQuestion.text.includes('illness');
  const currentSavedAnswer = answers[currentQuestionIndex];
  const responseOptions = isSickQuestion ? SICK_QUESTION_OPTIONS : RESPONSE_OPTIONS;

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Only process results if recognition is for the current question
        if (recognitionQuestionIndexRef.current !== questionIndexRef.current) {
          return; // Ignore results from previous questions
        }

        // Process only NEW results (from resultIndex onwards)
        let newFinalTranscript = '';
        let interimTranscript = '';

        // Start from resultIndex to only get new results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newFinalTranscript += transcript + ' ';
          } else {
            // Only get the latest interim result
            if (i === event.results.length - 1) {
              interimTranscript = transcript;
            }
          }
        }

        // Append new final transcript to existing final transcript
        if (newFinalTranscript.trim()) {
          finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + newFinalTranscript).trim();
        }

        // Combine final transcript with interim
        const newText = finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');
        setOpenEndedAnswer(newText);
        
        // Save to answers state immediately (use ref to avoid stale closure)
        if (finalTranscriptRef.current) {
          setAnswers(prev => ({
            ...prev,
            [questionIndexRef.current]: finalTranscriptRef.current
          }));
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        isRecordingRef.current = false;
        isStartingRef.current = false;
        recognitionQuestionIndexRef.current = -1;
        // Don't restart on network errors to prevent loops
        if (event.error === 'network') {
          alert('Network error occurred. Please check your internet connection and try again.');
        }
      };

      recognition.onend = () => {
        const wasRecording = isRecordingRef.current;
        const userStopped = userStoppedRef.current;
        
        setIsRecording(false);
        isRecordingRef.current = false;
        isStartingRef.current = false;
        
        // Clear recognition question index when recognition ends
        if (recognitionQuestionIndexRef.current !== questionIndexRef.current) {
          // Recognition ended for a different question, ignore
          return;
        }
        
        // Final transcript is already saved via handleOpenEndedChange in onresult
        // Just ensure we have the final text without interim results
        if (finalTranscriptRef.current) {
          const finalText = finalTranscriptRef.current.trim();
          setOpenEndedAnswer(finalText);
        }
        
        // Auto-restart ONLY if user was actively recording and didn't manually stop
        if (wasRecording && !userStopped && recognitionQuestionIndexRef.current === questionIndexRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && 
                recognitionQuestionIndexRef.current === questionIndexRef.current && 
                !userStoppedRef.current &&
                !isStartingRef.current) {
              try {
                isStartingRef.current = true;
                recognitionRef.current.start();
                setIsRecording(true);
                isRecordingRef.current = true;
                isStartingRef.current = false;
              } catch (e) {
                // Silently fail - user can manually restart
                console.log('Auto-restart failed:', e);
                isStartingRef.current = false;
              }
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        userStoppedRef.current = true;
        isStartingRef.current = false;
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Sync answers when question changes and stop any active recording
  useEffect(() => {
    // Stop any active recording when question changes
    if ((isRecording || isRecordingRef.current) && recognitionRef.current) {
      userStoppedRef.current = true;
      isStartingRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      setIsRecording(false);
      isRecordingRef.current = false;
    }

    // Reset recognition question index
    recognitionQuestionIndexRef.current = -1;

    if (isOpenEndedQuestion) {
      const savedText = typeof currentSavedAnswer === 'string' ? currentSavedAnswer : '';
      setOpenEndedAnswer(savedText);
      // Reset transcript ref when switching to open-ended question
      finalTranscriptRef.current = savedText;
    } else {
      setSelectedAnswer((currentSavedAnswer as ResponseOption) || null);
      setOpenEndedAnswer('');
      finalTranscriptRef.current = '';
    }
  }, [currentQuestionIndex, currentSavedAnswer, isOpenEndedQuestion]);

  const handleAnswerChange = (answer: ResponseOption) => {
    setSelectedAnswer(answer);
    // Save answer immediately
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  };

  const handleOpenEndedChange = (text: string) => {
    setOpenEndedAnswer(text);
    // Save answer immediately
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: text
    }));
  };

  const startRecognition = () => {
    if (!recognitionRef.current || isStartingRef.current) {
      return;
    }

    isStartingRef.current = true;
    userStoppedRef.current = false;

    // Get existing saved answer for this question
    const currentSaved = answers[currentQuestionIndex];
    const existingText = typeof currentSaved === 'string' ? currentSaved : '';
    
    // Initialize transcript ref with existing answer (or empty)
    finalTranscriptRef.current = existingText;
    setOpenEndedAnswer(existingText);
    
    // Mark this recognition as for the current question
    recognitionQuestionIndexRef.current = currentQuestionIndex;

    try {
      recognitionRef.current.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      isStartingRef.current = false;
    } catch (e: any) {
      console.error('Failed to start recognition:', e);
      isStartingRef.current = false;
      
      // If already started error, try stopping first then restart
      if (e.message && e.message.includes('already started')) {
        try {
          recognitionRef.current.stop();
          // Try again after a delay
          setTimeout(() => {
            if (recognitionRef.current && recognitionQuestionIndexRef.current === currentQuestionIndex) {
              try {
                recognitionRef.current.start();
                setIsRecording(true);
                isRecordingRef.current = true;
              } catch (err) {
                console.error('Retry failed:', err);
                alert('Could not start speech recognition. Please try again.');
              }
            }
          }, 500);
        } catch (stopErr) {
          alert('Could not start speech recognition. Please refresh the page and try again.');
        }
      } else {
        alert('Could not start speech recognition. Please try again.');
      }
    }
  };

  const stopRecognition = () => {
    if (!recognitionRef.current) return;

    userStoppedRef.current = true;
    isStartingRef.current = false;
    
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.log('Error stopping recognition:', e);
    }
    
    setIsRecording(false);
    isRecordingRef.current = false;
    recognitionQuestionIndexRef.current = -1;
  };

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording || isRecordingRef.current) {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  const handleNext = () => {
    if (isOpenEndedQuestion) {
      if (!openEndedAnswer.trim()) return;
      
      // Ensure current answer is saved
      const updatedAnswers = {
        ...answers,
        [currentQuestionIndex]: openEndedAnswer.trim()
      };
      
      if (isLastQuestion) {
        // Submit on last question
        onSubmit(updatedAnswers);
      } else {
        // Save answer and move to next question
        setAnswers(updatedAnswers);
        setCurrentQuestionIndex(prev => prev + 1);
      }
    } else {
      if (!selectedAnswer) return;
      
      // Ensure current answer is saved
      const updatedAnswers = {
        ...answers,
        [currentQuestionIndex]: selectedAnswer
      };
      
      if (isLastQuestion) {
        // Submit on last question
        onSubmit(updatedAnswers);
      } else {
        // Save answer and move to next question
        setAnswers(updatedAnswers);
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen w-full bg-background-primary text-text-primary flex flex-col relative">
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }}>
        <BeamsBackground intensity="medium" className="!z-0" />
      </div>
      {/* Header */}
      <div className="sticky top-0 z-10 relative">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-primary"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Pre-Recording Assessment</h1>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-primary to-purple-light"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <p className="text-sm text-text-muted mt-2 text-center">
            Question {currentQuestionIndex + 1} of {QUESTIONS.length}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex items-center relative z-10">
        <div className="max-w-2xl mx-auto px-4 py-8 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {/* Question Card */}
              <div className="bg-background-secondary rounded-xl p-8 border-2 border-surface mb-8">
                <div className="flex items-start gap-4 mb-6">
                  <span className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-primary/20 text-purple-primary flex items-center justify-center text-lg font-semibold">
                    {currentQuestionIndex + 1}
                  </span>
                  <h2 className="text-xl font-semibold text-text-primary flex-1 pt-1 leading-relaxed">
                    {currentQuestion.text}
                  </h2>
                </div>

                {/* Multiple Choice Options */}
                {!isOpenEndedQuestion && (
                  <div className="space-y-3">
                    {responseOptions.map((option) => {
                      const isSelected = selectedAnswer === option;
                      
                      return (
                        <label
                          key={option}
                          onClick={() => handleAnswerChange(option)}
                          className={`
                            flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all
                            ${isSelected
                              ? 'bg-purple-primary/20 border-2 border-purple-primary shadow-lg shadow-purple-primary/20'
                              : 'bg-surface/50 border-2 border-transparent hover:bg-surface hover:border-purple-primary/30'
                            }
                          `}
                        >
                          <div className={`
                            flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                            ${isSelected
                              ? 'border-purple-primary bg-purple-primary scale-110'
                              : 'border-text-muted'
                            }
                          `}>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-3 h-3 rounded-full bg-white"
                              />
                            )}
                          </div>
                          <span className={`
                            text-base flex-1
                            ${isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}
                          `}>
                            {option}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Open-Ended Question Input */}
                {isOpenEndedQuestion && (
                  <div className="relative">
                    {/* Dialogue Box with Glowing Border Animation */}
                    <div className={`
                      relative rounded-xl border-2 transition-all duration-300 overflow-hidden
                      ${isRecording 
                        ? 'border-purple-primary shadow-[0_0_25px_rgba(139,92,246,0.6)]' 
                        : 'border-surface'
                      }
                    `}>
                      {/* Animated Glow Effect - Moving around edges */}
                      {isRecording && (
                        <>
                          {/* Top edge glow */}
                          <motion.div
                            className="absolute top-0 left-0 right-0 h-1"
                            style={{
                              backgroundColor: '#8B5CF6',
                              boxShadow: '0 0 10px rgba(139,92,246,0.8), 0 0 20px rgba(139,92,246,0.6)',
                            }}
                            animate={{
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />
                          {/* Right edge glow */}
                          <motion.div
                            className="absolute top-0 right-0 bottom-0 w-1"
                            style={{
                              backgroundColor: '#8B5CF6',
                              boxShadow: '0 0 10px rgba(139,92,246,0.8), 0 0 20px rgba(139,92,246,0.6)',
                            }}
                            animate={{
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: 0.375,
                              ease: 'easeInOut',
                            }}
                          />
                          {/* Bottom edge glow */}
                          <motion.div
                            className="absolute bottom-0 left-0 right-0 h-1"
                            style={{
                              backgroundColor: '#8B5CF6',
                              boxShadow: '0 0 10px rgba(139,92,246,0.8), 0 0 20px rgba(139,92,246,0.6)',
                            }}
                            animate={{
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: 0.75,
                              ease: 'easeInOut',
                            }}
                          />
                          {/* Left edge glow */}
                          <motion.div
                            className="absolute top-0 left-0 bottom-0 w-1"
                            style={{
                              backgroundColor: '#8B5CF6',
                              boxShadow: '0 0 10px rgba(139,92,246,0.8), 0 0 20px rgba(139,92,246,0.6)',
                            }}
                            animate={{
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: 1.125,
                              ease: 'easeInOut',
                            }}
                          />
                        </>
                      )}
                      
                      <div className="relative flex items-start gap-3 p-4 bg-background-primary rounded-xl z-10">
                        {/* Mic Button */}
                        <button
                          type="button"
                          onClick={handleToggleRecording}
                          className={`
                            flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                            transition-all duration-200
                            ${isRecording
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-surface hover:bg-surface/80 text-text-secondary hover:text-text-primary'
                            }
                          `}
                          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                        >
                          <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                        </button>
                        
                        {/* Textarea */}
                        <textarea
                          ref={textareaRef}
                          value={openEndedAnswer}
                          onChange={(e) => handleOpenEndedChange(e.target.value)}
                          placeholder="Type your answer here or click the mic to speak..."
                          className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none text-base leading-relaxed min-h-[120px]"
                          rows={5}
                        />
                      </div>
                    </div>
                    
                    {isRecording && (
                      <p className="text-sm text-purple-primary mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Listening... Speak your answer
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4">
            {/* Previous Button */}
            {currentQuestionIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 py-4 px-6 rounded-xl font-medium text-text-secondary bg-surface hover:bg-surface/80 transition-all duration-200 border border-surface/50"
              >
                Previous
              </button>
            )}

            {/* Next/Submit Button */}
            <button
              onClick={handleNext}
              disabled={isOpenEndedQuestion ? !openEndedAnswer.trim() : !selectedAnswer}
              className={`
                flex-1 py-4 px-6 rounded-xl font-semibold text-white
                flex items-center justify-center gap-2
                bg-gradient-to-r from-purple-primary to-purple-light
                hover:from-purple-light hover:to-purple-primary
                transition-all duration-200
                shadow-lg shadow-purple-primary/30
                hover:shadow-xl hover:shadow-purple-primary/40
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-[1.02] active:scale-[0.98]
              `}
            >
              {isLastQuestion ? (
                'Continue to Recording'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreRecordingQuestionnaire;
