import React from 'react';
import type { Student } from '../types';
import { ChevronLeft, Share } from './Icons';
import AnalysisResultsScreen from './AnalysisResultsScreen';


// --- Main Student Detail Screen ---
interface StudentDetailScreenProps {
  student: Student;
  onBack: () => void;
  isTeacherView?: boolean;
}

const StudentDetailScreen: React.FC<StudentDetailScreenProps> = ({ student, onBack, isTeacherView = false }) => {
    const latestAnalysis = student.analysisHistory[student.analysisHistory.length - 1];

    return (
        <div className="min-h-screen w-full bg-background-primary">
            <header className="fixed top-0 left-0 right-0 h-[60px] flex items-center justify-between px-4 z-20 max-w-2xl mx-auto">
                <button onClick={onBack} className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-medium text-white">{student.name}</h1>
                    <p className="text-sm text-text-muted font-mono">{student.code}</p>
                </div>
                <button className="glass-base w-11 h-11 rounded-full flex items-center justify-center transition-all hover:bg-purple-primary/20">
                    <Share className="w-5 h-5 text-white" />
                </button>
            </header>
            
            <AnalysisResultsScreen 
                analysisData={latestAnalysis}
                onNewRecording={() => {}} // Empty function for teacher view
                onClose={onBack}
                isTeacherView={isTeacherView}
            />
        </div>
    );
};

export default StudentDetailScreen;
