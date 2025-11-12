import React, { useEffect } from 'react';
import type { AnalysisData } from '../types';
import GlassCard from './GlassCard';
import { ChevronLeft } from './Icons';
import { motion } from 'framer-motion';

interface PostAnalysisSuggestionsScreenProps {
  analysisData: AnalysisData;
  onBack: () => void;
  onClose: () => void;
}

const positiveAffirmations = [
  "Thank you for taking this step toward understanding yourself better",
  "We appreciate you taking time for your well-being today",
  "You took an important step today—we're proud of you",
  "You're on the right path to understanding your stress better",
  "Every session brings you closer to better self-awareness",
  "We're here to support you on your wellness journey",
  "You're taking control of your stress, one session at a time",
  "Every insight brings you closer to balance",
  "You've given yourself the gift of self-awareness today",
  "Small steps lead to meaningful change—you're making progress"
];

const getSuggestions = (stressLevel: number): { immediate: string[]; longTerm: string[]; nextSession: number } => {
  if (stressLevel < 34) {
    // Low stress
    return {
      immediate: [
        "Maintain your current positive routines",
        "Continue practicing mindfulness or meditation",
        "Stay connected with supportive friends or family"
      ],
      longTerm: [
        "Keep a regular sleep schedule (7-9 hours)",
        "Engage in regular physical activity you enjoy",
        "Practice gratitude journaling daily",
        "Maintain healthy social connections"
      ],
      nextSession: 14 // 2 weeks
    };
  } else if (stressLevel < 67) {
    // Moderate stress
    return {
      immediate: [
        "Take a 10-minute break to practice deep breathing",
        "Go for a short walk outside to clear your mind",
        "Listen to calming music or a guided meditation",
        "Drink some water and have a healthy snack"
      ],
      longTerm: [
        "Establish a consistent sleep routine",
        "Incorporate regular exercise (30 minutes, 3-4 times/week)",
        "Practice daily mindfulness or meditation (10-15 minutes)",
        "Set boundaries to protect your personal time",
        "Consider keeping a stress journal to identify patterns"
      ],
      nextSession: 7 // 1 week
    };
  } else {
    // High stress
    return {
      immediate: [
        "Find a quiet space and practice 5-10 minutes of deep breathing",
        "Take a warm shower or bath to help relax your body",
        "Listen to calming music or nature sounds",
        "Practice progressive muscle relaxation",
        "Reach out to a trusted friend, family member, or counselor"
      ],
      longTerm: [
        "Prioritize getting 7-9 hours of quality sleep each night",
        "Start with light exercise and gradually increase intensity",
        "Schedule regular breaks throughout your day",
        "Learn and practice stress management techniques",
        "Consider speaking with a mental health professional",
        "Reduce caffeine and alcohol intake",
        "Create a daily routine that includes self-care activities"
      ],
      nextSession: 3 // 3 days
    };
  }
};

const PostAnalysisSuggestionsScreen: React.FC<PostAnalysisSuggestionsScreenProps> = ({ 
  analysisData, 
  onBack,
  onClose 
}) => {
  const stressLevel = analysisData.stressLevel;
  const suggestions = getSuggestions(stressLevel);
  const affirmation = positiveAffirmations[Math.floor(Math.random() * positiveAffirmations.length)];

  // Save suggestions to localStorage for the todo list
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        const studentCode = parsedUserData.accountNumber;
        
        // Combine immediate and long-term suggestions
        const allSuggestions = [
          ...suggestions.immediate.map((s, idx) => ({
            id: `immediate-${idx}`,
            label: s,
            type: 'immediate' as const,
            completed: false
          })),
          ...suggestions.longTerm.map((s, idx) => ({
            id: `longterm-${idx}`,
            label: s,
            type: 'longterm' as const,
            completed: false
          }))
        ];

        // Save suggestions for this student
        const suggestionsKey = `suggestions_${studentCode}`;
        const suggestionsData = {
          stressLevel,
          suggestions: allSuggestions,
          date: new Date().toISOString(),
          nextSession: suggestions.nextSession
        };
        localStorage.setItem(suggestionsKey, JSON.stringify(suggestionsData));
        
        // Dispatch custom event to notify todo list to refresh
        window.dispatchEvent(new Event('suggestionsUpdated'));
      } catch (error) {
        console.error('Error saving suggestions:', error);
      }
    }
  }, [stressLevel, suggestions]);

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20 max-w-2xl mx-auto bg-background-primary/95 backdrop-blur-sm">
      <button 
        onClick={onBack} 
        className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <h1 className="text-lg font-medium text-white">Suggestions</h1>
      <div className="w-11 h-11" /> {/* Spacer for centering */}
    </header>
  );

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        staggerChildren: 0.1,
        duration: 0.4
      } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: 'spring', 
        stiffness: 200,
        damping: 20,
        duration: 0.4
      } 
    }
  };

  return (
    <div className="min-h-screen w-full p-4 pt-[80px] pb-10 max-w-2xl mx-auto">
      <Header />
      
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Top Section - Positive Affirmation */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5" variant="purple">
            <p className="text-lg font-medium text-white text-center leading-relaxed">
              {affirmation}
            </p>
          </GlassCard>
        </motion.div>

        {/* Middle Section - Personalized Suggestions */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 bg-surface/40 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-4">Personalized Suggestions</h2>
            
            {/* Immediate Actions */}
            <div className="mb-6">
              <h3 className="text-base font-semibold text-purple-light mb-3">Immediate Actions</h3>
              <ul className="space-y-2">
                {suggestions.immediate.map((suggestion, index) => (
                  <li key={index} className="flex items-start text-sm text-text-secondary">
                    <span className="text-purple-primary mr-2 mt-1">•</span>
                    <span className="flex-1">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Long-term Habits */}
            <div>
              <h3 className="text-base font-semibold text-purple-light mb-3">Long-term Wellness</h3>
              <ul className="space-y-2">
                {suggestions.longTerm.map((suggestion, index) => (
                  <li key={index} className="flex items-start text-sm text-text-secondary">
                    <span className="text-purple-primary mr-2 mt-1">•</span>
                    <span className="flex-1">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </motion.div>

        {/* Bottom Section - Next Session Recommendation */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-5 bg-surface/40 backdrop-blur-xl">
            <div className="text-center">
              <p className="text-base text-text-secondary mb-2" style={{ fontStyle: 'italic' }}>
                Recommended next session
              </p>
              <p className="text-2xl font-light text-white" style={{ fontStyle: 'italic' }}>
                in <span className="text-purple-primary font-semibold not-italic">
                  {suggestions.nextSession} {suggestions.nextSession === 1 ? 'day' : 'days'}
                </span>
              </p>
              {suggestions.nextSession >= 7 && (
                <p className="text-sm text-text-muted mt-1" style={{ fontStyle: 'italic' }}>
                  ({Math.floor(suggestions.nextSession / 7)} {Math.floor(suggestions.nextSession / 7) === 1 ? 'week' : 'weeks'})
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Close/Finish Button */}
        <motion.div variants={itemVariants} className="pt-4">
          <button 
            onClick={onClose}
            className="w-full h-14 rounded-2xl flex items-center justify-center font-medium text-white bg-gradient-to-r from-purple-dark to-purple-primary shadow-lg shadow-purple-dark/30 hover:scale-[1.02] transition-transform"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PostAnalysisSuggestionsScreen;

