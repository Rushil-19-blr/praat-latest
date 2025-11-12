import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight } from 'lucide-react';

interface PreRecordingQuestionnaireProps {
  onSubmit: (answers: QuestionnaireAnswers) => void;
  onBack: () => void;
}

export type ResponseOption = 
  | 'Strongly Disagree'
  | 'Disagree'
  | 'Neutral'
  | 'Agree'
  | 'Strongly Agree';

export interface QuestionAnswer {
  question: string;
  answer: ResponseOption | null;
}

export interface QuestionnaireAnswers {
  [questionIndex: number]: ResponseOption;
}

const QUESTIONS = [
  "I have been feeling more anxious or stressed than usual lately.",
  "I find it difficult to relax or calm my mind.",
  "I have been experiencing trouble sleeping or changes in my sleep patterns."
];

const RESPONSE_OPTIONS: ResponseOption[] = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree'
];

const PreRecordingQuestionnaire: React.FC<PreRecordingQuestionnaireProps> = ({ onSubmit, onBack }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [selectedAnswer, setSelectedAnswer] = useState<ResponseOption | null>(null);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;
  const currentSavedAnswer = answers[currentQuestionIndex];

  // Sync selectedAnswer with saved answer when question changes
  React.useEffect(() => {
    setSelectedAnswer(currentSavedAnswer || null);
  }, [currentQuestionIndex, currentSavedAnswer]);

  const handleAnswerChange = (answer: ResponseOption) => {
    setSelectedAnswer(answer);
    // Save answer immediately
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  };

  const handleNext = () => {
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
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen w-full bg-background-primary text-text-primary flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-primary/80 backdrop-blur-md border-b border-surface/50">
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
      <div className="flex-1 overflow-y-auto flex items-center">
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
                    {currentQuestion}
                  </h2>
                </div>

                {/* Answer Options */}
                <div className="space-y-3">
                  {RESPONSE_OPTIONS.map((option) => {
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
              disabled={!selectedAnswer}
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
                ${!selectedAnswer ? '' : currentQuestionIndex === 0 ? '' : ''}
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
