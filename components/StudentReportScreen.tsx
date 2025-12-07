import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, FileText } from './Icons';
import GlassCard from './GlassCard';
import type { AnalysisData, Student } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Component as AiLoader } from '@/components/ui/ai-loader';

interface StudentReportScreenProps {
  student: Student;
  analysisData: AnalysisData;
  onBack: () => void;
}

const QUESTIONS = [
  "I have been feeling more anxious or stressed than usual lately.",
  "I find it difficult to relax or calm my mind.",
  "Please describe what situations or thoughts make you feel most stressed or anxious.",
  "What strategies or activities help you feel more relaxed or calm?",
  "Are you currently sick or experiencing any illness?"
];

// Fallback template generator (used while loading or on error)
const generateFallbackReport = (student: Student, analysisData: AnalysisData): string => {
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

  if (stressLevel >= 67) {
    report += `The student's stress level is **high** (${stressLevel.toFixed(1)}%), indicating significant stress that may require attention and support.\n\n`;
  } else if (stressLevel >= 34) {
    report += `The student's stress level is **moderate** (${stressLevel.toFixed(1)}%), suggesting some stress that should be monitored.\n\n`;
  } else {
    report += `The student's stress level is **low** (${stressLevel.toFixed(1)}%), indicating generally good stress management.\n\n`;
  }

  if (hasAnswers) {
    report += `### Questionnaire Responses Summary\n\n`;

    const responses: string[] = [];
    Object.entries(questionnaireAnswers).forEach(([index, answer]) => {
      const questionIndex = parseInt(index);
      if (questionIndex < QUESTIONS.length) {
        const question = QUESTIONS[questionIndex];
        responses.push(`**Q${questionIndex + 1}:** ${question}\n**Response:** ${answer}\n`);
      }
    });

    report += responses.join('\n') + '\n';
  }

  report += `### Recommendations\n\n`;
  report += `- Continue regular stress assessments\n`;
  report += `- Practice stress management techniques\n`;

  report += `\n---\n`;
  report += `*This report is generated based on voice stress analysis and questionnaire responses.*`;

  return report;
};

const generateAIReportWithGemini = async (student: Student, analysisData: AnalysisData): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
    if (!apiKey) throw new Error('Gemini API key not found');

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' }, { apiVersion: 'v1beta' });

    const questionnaireAnswers = analysisData.questionnaireAnswers || {};
    const stressLevel = analysisData.stressLevel;

    // Format Q&A for the prompt (Context only)
    let qaText = "";
    Object.entries(questionnaireAnswers).forEach(([index, answer]) => {
      const qIdx = parseInt(index);
      if (qIdx < QUESTIONS.length) {
        qaText += `Q${qIdx + 1}: ${QUESTIONS[qIdx]}\nA: ${answer}\n\n`;
      }
    });

    const prompt = `
      You are an expert school counselor and psychologist writing a formal report for a TEACHER regarding a student named ${student.name}.
      
      STUDENT DETAILS:
      Name: ${student.name}
      Class: ${student.class}-${student.section}
      
      ASSESSMENT DATA:
      Voice Stress Level: ${stressLevel.toFixed(1)}% (Scale: 0-100, <34 Low, 34-66 Moderate, >=67 High)
      
      QUESTIONNAIRE RESPONSES (For your analysis only - do not list them):
      ${qaText || "No questionnaire responses provided."}
      
      INSTRUCTIONS:
      Generate 3 distinct sections of the report. Separate each section with the delimiter "|||".
      Write in the THIRD PERSON (e.g., "The student reports...", "He/She appears...").
      The tone should be professional, objective, and supportive, suitable for a teacher or counselor to read.
      
      SECTION 1: Overall Stress Assessment
      - Analyze the stress level and what it indicates about the student's current state.
      - Mention if the voice analysis aligns with their questionnaire responses (if any).
      
      SECTION 2: Key Observations & Insights
      - Synthesize the questionnaire answers into professional insights.
      - Highlight specific areas of concern (e.g., sleep, anxiety, illness) based on their answers.
      - Highlight positive indicators or resilience factors.
      - DO NOT list the questions and answers here. Just analyze them.
      
      SECTION 3: Recommendations for the Teacher
      - Provide 3-4 specific, actionable strategies the TEACHER can use to support this student in class.
      - Tailor these to the specific issues identified (e.g., if they can't relax, suggest quiet time; if they are ill, suggest leniency).
      
      OUTPUT FORMAT:
      [Content for Section 1]
      |||
      [Content for Section 2]
      |||
      [Content for Section 3]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const fullText = response.text();
    const parts = fullText.split('|||').map(p => p.trim());

    // Fallback if split fails
    const assessment = parts[0] || "Assessment not available.";
    const observations = parts[1] || "Observations not available.";
    const recommendations = parts[2] || "Recommendations not available.";

    // --- MANUAL CONSTRUCTION OF REPORT ---

    let report = `## Student Report: ${student.name}\n\n`;
    report += `**Account ID:** ${student.code}\n`;
    report += `**Class:** ${student.class}-${student.section}\n`;
    report += `**Assessment Date:** ${new Date(analysisData.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}\n\n`;

    report += `### Overall Stress Assessment\n\n`;
    report += `${assessment}\n\n`;

    // Inject Old Format Q&A List
    if (Object.keys(questionnaireAnswers).length > 0) {
      report += `### Questionnaire Responses Summary\n\n`;
      const responses: string[] = [];
      Object.entries(questionnaireAnswers).forEach(([index, answer]) => {
        const questionIndex = parseInt(index);
        if (questionIndex < QUESTIONS.length) {
          const question = QUESTIONS[questionIndex];
          // EXACT OLD FORMAT: **Qx:** Question\n**Response:** Answer
          responses.push(`**Q${questionIndex + 1}:** ${question}\n**Response:** ${answer}\n`);
        }
      });
      report += responses.join('\n') + '\n\n';
    }

    report += `### Key Observations\n\n`;
    report += `${observations}\n\n`;

    report += `### Recommendations\n\n`;
    report += `${recommendations}\n\n`;

    report += `\n---\n`;
    report += `*This report is generated based on voice stress analysis and questionnaire responses. It is intended to support educational decision-making and should not replace professional medical or psychological evaluation.*`;

    return report;

  } catch (error) {
    console.error("Error generating AI report:", error);
    return generateFallbackReport(student, analysisData);
  }
};

const StudentReportScreen: React.FC<StudentReportScreenProps> = ({ student, analysisData, onBack }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const lastAnalysisDateRef = useRef<string | null>(null);

  useEffect(() => {
    // Prevent duplicate generation
    if (analysisData.date === lastAnalysisDateRef.current && report) {
      return;
    }
    lastAnalysisDateRef.current = analysisData.date;

    const loadReport = async () => {
      setLoading(true);
      // Show fallback immediately while loading? Or just loader. Let's show loader.
      try {
        const aiReport = await generateAIReportWithGemini(student, analysisData);
        setReport(aiReport);
      } catch (e) {
        setReport(generateFallbackReport(student, analysisData));
      } finally {
        setLoading(false);
      }
    };

    loadReport();
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

      if (trimmed === '---') { // Check for horizontal rule FIRST
        flushParagraph();
        flushList();
        elements.push(
          <hr key={key++} className="my-6 border-t border-surface/50" />
        );
      } else if (trimmed.startsWith('##')) {
        flushParagraph();
        flushList();
        const title = trimmed.replace(/^#+\s*/, '').trim(); // Regex to handle ## or ###
        elements.push(
          <h2 key={key++} className="text-2xl font-bold text-white mt-8 mb-4">
            {title}
          </h2>
        );
      } else if (trimmed.startsWith('###')) {
        flushParagraph();
        flushList();
        const title = trimmed.replace(/^#+\s*/, '').trim();
        elements.push(
          <h3 key={key++} className="text-xl font-semibold text-white mt-6 mb-3">
            {title}
          </h3>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) { // Handle both - and * lists
        flushParagraph();
        const item = trimmed.replace(/^[-*]\s*/, '').trim();
        if (item) currentListItems.push(item); // Only add if not empty
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
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AiLoader />
                <p className="mt-4 text-text-secondary text-sm">Generating personalized report...</p>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none">
                {formatReportText(report)}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentReportScreen;

