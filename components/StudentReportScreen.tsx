import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText } from './Icons';
import GlassCard from './GlassCard';
import type { AnalysisData, Student } from '../types';
import type { QuestionnaireAnswers } from './PreRecordingQuestionnaire';

interface StudentReportScreenProps {
  student: Student;
  analysisData: AnalysisData;
  onBack: () => void;
}

const QUESTIONS = [
  "I have been feeling more anxious or stressed than usual lately.",
  "I find it difficult to relax or calm my mind.",
  "I have been experiencing trouble sleeping or changes in my sleep patterns.",
  "Are you currently sick or experiencing any illness?"
];

// Generate AI report based on questionnaire answers and stress data
const generateAIReport = (student: Student, analysisData: AnalysisData): string => {
  const questionnaireAnswers = analysisData.questionnaireAnswers || {};
  const stressLevel = analysisData.stressLevel;
  const hasAnswers = Object.keys(questionnaireAnswers).length > 0;

  let report = `## Student Report: ${student.name}\n\n`;
  report += `**Account ID:** ${student.code}\n`;
  report += `**Class:** ${student.class}-${student.section}\n`;
  report += `**Assessment Date:** ${new Date(analysisData.date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}\n\n`;

  report += `### Overall Stress Assessment\n\n`;
  
  if (stressLevel >= 70) {
    report += `The student's stress level is **high** (${stressLevel.toFixed(1)}%), indicating significant stress that may require attention and support.\n\n`;
  } else if (stressLevel >= 40) {
    report += `The student's stress level is **moderate** (${stressLevel.toFixed(1)}%), suggesting some stress that should be monitored.\n\n`;
  } else {
    report += `The student's stress level is **low** (${stressLevel.toFixed(1)}%), indicating generally good stress management.\n\n`;
  }

  if (hasAnswers) {
    report += `### Questionnaire Responses Summary\n\n`;
    
    // Analyze responses
    const responses: string[] = [];
    Object.entries(questionnaireAnswers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      if (questionIndex < QUESTIONS.length) {
        const question = QUESTIONS[questionIndex];
        responses.push(`**Q${questionIndex + 1}:** ${question}\n**Response:** ${answer}\n`);
      }
    });

    report += responses.join('\n') + '\n';

    // Generate insights based on answers
    report += `### Key Insights\n\n`;
    
    const stressIndicators: string[] = [];
    const positiveIndicators: string[] = [];

    // Check for stress indicators
    Object.entries(questionnaireAnswers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      if (questionIndex === 0) { // Anxiety question
        if (answer === 'Agree' || answer === 'Strongly Agree') {
          stressIndicators.push('Reports increased anxiety levels');
        }
      } else if (questionIndex === 1) { // Relaxation difficulty
        if (answer === 'Agree' || answer === 'Strongly Agree') {
          stressIndicators.push('Experiences difficulty relaxing');
        }
      } else if (questionIndex === 2) { // Sleep issues
        if (answer === 'Agree' || answer === 'Strongly Agree') {
          stressIndicators.push('Reports sleep pattern disturbances');
        }
      } else if (questionIndex === 3) { // Illness
        if (answer === 'Yes') {
          stressIndicators.push('Currently experiencing illness');
        }
      }
    });

    // Check for positive indicators
    Object.entries(questionnaireAnswers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      if (questionIndex < 3) {
        if (answer === 'Disagree' || answer === 'Strongly Disagree') {
          positiveIndicators.push('Shows resilience in stress-related areas');
        }
      }
    });

    if (stressIndicators.length > 0) {
      report += `**Areas of Concern:**\n`;
      stressIndicators.forEach(indicator => {
        report += `- ${indicator}\n`;
      });
      report += `\n`;
    }

    if (positiveIndicators.length > 0) {
      report += `**Positive Indicators:**\n`;
      positiveIndicators.forEach(indicator => {
        report += `- ${indicator}\n`;
      });
      report += `\n`;
    }

    // Correlation with stress level
    if (stressIndicators.length > 0 && stressLevel >= 50) {
      report += `**Analysis:** The student's self-reported stress indicators align with the measured stress level (${stressLevel.toFixed(1)}%). This consistency suggests the student is aware of their stress state and may benefit from targeted support strategies.\n\n`;
    } else if (stressIndicators.length === 0 && stressLevel < 40) {
      report += `**Analysis:** The student reports low stress indicators, which aligns with the measured stress level. This suggests good self-awareness and stress management.\n\n`;
    } else {
      report += `**Analysis:** There may be a discrepancy between self-reported stress and measured stress levels. Further observation and support may be beneficial.\n\n`;
    }
  } else {
    report += `### Questionnaire Data\n\n`;
    report += `No questionnaire responses were recorded for this assessment.\n\n`;
  }

  report += `### Recommendations\n\n`;
  
  if (stressLevel >= 70) {
    report += `- **Immediate Support:** Consider one-on-one check-in with the student\n`;
    report += `- **Monitoring:** Schedule regular follow-up assessments\n`;
    report += `- **Resources:** Provide access to stress management resources or counseling\n`;
    report += `- **Communication:** Reach out to parents/guardians if appropriate\n`;
  } else if (stressLevel >= 40) {
    report += `- **Monitoring:** Continue regular stress assessments\n`;
    report += `- **Support:** Offer stress management techniques and resources\n`;
    report += `- **Observation:** Monitor for any changes in behavior or academic performance\n`;
  } else {
    report += `- **Maintenance:** Continue current stress management practices\n`;
    report += `- **Encouragement:** Acknowledge the student's effective stress management\n`;
  }

  report += `\n---\n`;
  report += `*This report is generated based on voice stress analysis and questionnaire responses. It is intended to support educational decision-making and should not replace professional medical or psychological evaluation.*`;

  return report;
};

const StudentReportScreen: React.FC<StudentReportScreenProps> = ({ student, analysisData, onBack }) => {
  const [report, setReport] = useState<string>('');

  useEffect(() => {
    const generatedReport = generateAIReport(student, analysisData);
    setReport(generatedReport);
  }, [student, analysisData]);

  const formatReportText = (text: string) => {
    // Convert markdown-like formatting to JSX
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentParagraph: string[] = [];
    let currentListItems: string[] = [];
    let key = 0;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ');
        if (paragraphText.trim()) {
          elements.push(
            <p key={key++} className="mb-4 text-text-secondary leading-relaxed">
              {formatInlineText(paragraphText)}
            </p>
          );
        }
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (currentListItems.length > 0) {
        elements.push(
          <ul key={key++} className="mb-4 ml-6 space-y-2 list-disc">
            {currentListItems.map((item, idx) => (
              <li key={idx} className="text-text-secondary">
                {formatInlineText(item)}
              </li>
            ))}
          </ul>
        );
        currentListItems = [];
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('##')) {
        flushParagraph();
        flushList();
        const title = trimmed.replace('##', '').trim();
        elements.push(
          <h2 key={key++} className="text-2xl font-bold text-white mt-8 mb-4">
            {title}
          </h2>
        );
      } else if (trimmed.startsWith('###')) {
        flushParagraph();
        flushList();
        const title = trimmed.replace('###', '').trim();
        elements.push(
          <h3 key={key++} className="text-xl font-semibold text-white mt-6 mb-3">
            {title}
          </h3>
        );
      } else if (trimmed.startsWith('-')) {
        flushParagraph();
        const item = trimmed.replace('-', '').trim();
        currentListItems.push(item);
      } else if (trimmed === '---') {
        flushParagraph();
        flushList();
        elements.push(
          <hr key={key++} className="my-6 border-t border-surface/50" />
        );
      } else if (trimmed === '') {
        flushParagraph();
        flushList();
      } else {
        flushList();
        currentParagraph.push(trimmed);
      }
    });
    
    flushParagraph();
    flushList();
    return elements;
  };

  const formatInlineText = (text: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    let key = 0;

    // Handle **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={key++} className="text-white font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className="min-h-screen w-full bg-background-primary">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20 max-w-2xl mx-auto">
        <button 
          onClick={onBack} 
          className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-primary" />
          <h1 className="text-lg font-medium text-white">Student Report</h1>
        </div>
        <div className="w-11" /> {/* Spacer for centering */}
      </header>

      {/* Content */}
      <div className="pt-[80px] pb-10 px-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-6 md:p-8">
            <div className="prose prose-invert max-w-none">
              {formatReportText(report)}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentReportScreen;

