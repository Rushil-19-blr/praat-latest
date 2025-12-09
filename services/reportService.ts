/**
 * Report Service
 * Auto-generates detailed counselor reports after session completion
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    CounselorReport,
    SessionData,
    StudentHistory,
} from '../types';
import { summarizeHistoryForAI, generateId } from './personalizationService';

// Generate counselor report immediately after session ends
export const generateCounselorReport = async (
    session: SessionData,
    history: StudentHistory | null
): Promise<CounselorReport> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY || '';

    if (!apiKey) {
        console.warn('[ReportService] No API key, using default report');
        return getDefaultReport(session);
    }

    try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const historySummary = summarizeHistoryForAI(history);

        const prompt = `Generate a detailed counselor report for a student wellbeing session.

SESSION DATA:
- Session ID: ${session.sessionId}
- Date: ${session.date}
- Stress Level: ${session.analysisData?.stressLevel || 'N/A'}%
- Voice Analysis Summary: ${session.analysisData?.aiSummary || 'N/A'}

PRE-ANALYSIS ANSWERS:
${JSON.stringify(session.preAnalysisAnswers?.answers || {}, null, 2)}

LIVE SESSION Q&A (what the student said during the conversation):
${session.liveSessionAnswers?.map(qa => `
Q: ${qa.questionText}
A: ${qa.studentAnswer}
`).join('\n') || 'No live Q&A recorded'}

STUDENT HISTORY:
${historySummary}

Generate a comprehensive counselor report with the following sections:
1. Pre-Analysis Summary: 2-3 sentences summarizing the pre-session check-in answers
2. Live Session Summary: Key themes and topics discussed during the session
3. Key Insights: 3-5 bullet points of important observations
4. Concern Areas: Any areas that may need attention (can be empty if none)
5. Recommendations: 2-3 specific follow-up actions for the counselor
6. Overall Assessment: A brief overall assessment of the student's wellbeing

Return ONLY valid JSON in this exact format:
{
  "preAnalysisSummary": "...",
  "liveSessionSummary": "...",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "concernAreas": ["concern1"] or [],
  "recommendations": ["rec1", "rec2"],
  "overallAssessment": "..."
}

Do not include markdown code blocks.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const reportData = JSON.parse(cleaned);

        return {
            sessionId: session.sessionId,
            generatedAt: new Date().toISOString(),
            preAnalysisSummary: reportData.preAnalysisSummary || '',
            liveSessionSummary: reportData.liveSessionSummary || '',
            keyInsights: reportData.keyInsights || [],
            concernAreas: reportData.concernAreas || [],
            recommendations: reportData.recommendations || [],
            overallAssessment: reportData.overallAssessment || '',
        };

    } catch (e) {
        console.error('[ReportService] Failed to generate report:', e);
        return getDefaultReport(session);
    }
};

// Default fallback report
const getDefaultReport = (session: SessionData): CounselorReport => {
    const stressLevel = session.analysisData?.stressLevel || 0;
    const stressCategory = stressLevel > 70 ? 'elevated' : stressLevel > 40 ? 'moderate' : 'low';

    return {
        sessionId: session.sessionId,
        generatedAt: new Date().toISOString(),
        preAnalysisSummary: `Student completed pre-session check-in on ${session.date}.`,
        liveSessionSummary: `Session conducted with voice analysis. Stress level detected: ${stressLevel}%.`,
        keyInsights: [
            `Overall stress level: ${stressCategory}`,
            `Session completed successfully`,
            'Voice biomarkers analyzed',
        ],
        concernAreas: stressLevel > 70 ? ['Elevated stress levels detected'] : [],
        recommendations: [
            'Continue regular check-ins',
            stressLevel > 60 ? 'Consider follow-up conversation' : 'Monitor progress',
        ],
        overallAssessment: `Student shows ${stressCategory} stress levels. Continue monitoring and provide support as needed.`,
    };
};

// Format report for display
export const formatReportForDisplay = (report: CounselorReport): string => {
    return `
## Counselor Report
**Generated:** ${new Date(report.generatedAt).toLocaleString()}

### Pre-Analysis Summary
${report.preAnalysisSummary}

### Live Session Summary
${report.liveSessionSummary}

### Key Insights
${report.keyInsights.map(i => `- ${i}`).join('\n')}

### Concern Areas
${report.concernAreas.length > 0 ? report.concernAreas.map(c => `- ⚠️ ${c}`).join('\n') : 'No significant concerns identified.'}

### Recommendations
${report.recommendations.map(r => `- ${r}`).join('\n')}

### Overall Assessment
${report.overallAssessment}
  `.trim();
};
