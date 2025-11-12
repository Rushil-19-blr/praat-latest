import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Student, RiskLevel } from '../types';
import { UserCircle, ChevronLeft } from './Icons';
import GlassCard from './GlassCard';

// HACK: Cast motion components to 'any' to bypass type errors.
const MotionDiv = motion.div as any;

// --- Sparkline Chart Component ---
const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
    if (data.length < 2) {
        return <div className="w-full h-full bg-white/5 rounded-md" />;
    }
    const width = 100;
    const height = 30;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;

    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d - min) / range) * height;
            return `${x},${y}`;
        })
        .join(' ');

    const isTrendingUp = data[data.length - 1] > data[0];

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
             <defs>
                <linearGradient id="sparkline-gradient-red" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="sparkline-gradient-green" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill={isTrendingUp ? "url(#sparkline-gradient-red)" : "url(#sparkline-gradient-green)"}
                points={`0,${height} ${points} ${width},${height}`}
            />
            <polyline
                fill="none"
                stroke={isTrendingUp ? "#EF4444" : "#22C55E"}
                strokeWidth="2"
                points={points}
            />
        </svg>
    );
};


// --- Student Widget Component ---
const StudentWidget: React.FC<{ student: Student; onClick: () => void }> = ({ student, onClick }) => {
    const latestAnalysis = student.analysisHistory[student.analysisHistory.length - 1];
    const stressHistory = student.analysisHistory.map(a => a.stressLevel);

    return (
        <motion.div
            onClick={onClick}
            className="cursor-pointer"
            whileHover={{ scale: 1.03, y: -5 }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            <GlassCard className="p-4 flex items-center justify-between" variant="base">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-background-primary rounded-xl">
                        <span className="text-2xl font-bold text-text-primary">{latestAnalysis.stressLevel}</span>
                        <span className="text-xs font-medium text-text-muted">%</span>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-base font-semibold text-text-primary">{student.code}</p>
                        <p className="text-sm font-normal text-text-muted">{student.name} • {student.class}{student.section}</p>
                    </div>
                </div>
                <div className="w-24 h-10">
                    <Sparkline data={stressHistory} />
                </div>
            </GlassCard>
        </motion.div>
    );
};


// --- High Risk Alerts Component ---
const HighRiskAlerts: React.FC<{ students: Student[], onSelectStudent: (id: string) => void }> = ({ students, onSelectStudent }) => {
    const highRiskStudents = students.filter(s => {
        const latestStress = s.analysisHistory[s.analysisHistory.length - 1].stressLevel;
        return latestStress >= 75; // Only show high risk (75%+)
    })
        .sort((a, b) => b.analysisHistory[b.analysisHistory.length-1].stressLevel - a.analysisHistory[a.analysisHistory.length-1].stressLevel);

    if(highRiskStudents.length === 0) return null;

    const getRiskColor = (stressLevel: number) => {
        if (stressLevel >= 90) return 'bg-error-red/20 border-error-red/50';
        if (stressLevel >= 75) return 'bg-orange-warning/20 border-orange-warning/50';
        return 'bg-yellow-500/20 border-yellow-500/50';
    };

    return (
        <div className="mb-8">
            <h2 className="text-sm font-bold uppercase text-text-muted tracking-wider mb-4 px-2">High-Risk Students Alert</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                {highRiskStudents.map(student => {
                    const latestStress = student.analysisHistory[student.analysisHistory.length - 1].stressLevel;
                    return (
                        <motion.div
                            key={student.code}
                            onClick={() => onSelectStudent(student.code)}
                            className={`flex-shrink-0 w-32 h-24 p-3 rounded-xl border-2 cursor-pointer ${getRiskColor(latestStress)}`}
                            whileHover={{ y: -4, scale: 1.02 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <p className="text-base font-semibold text-text-primary mb-1">{student.code}</p>
                            <p className="text-xs font-normal text-text-secondary mb-2 truncate">{student.name}</p>
                            <p className="text-2xl font-bold text-text-primary text-right">{latestStress}%</p>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

interface ClassSummary {
    id: string;
    name: string;
    studentCount: number;
    averageStress: number;
    students: Student[];
}

// --- Main Teacher Dashboard Component ---
interface TeacherDashboardProps {
    students: Student[];
    onSelectStudent: (studentId: string) => void;
    onSignOut: () => void;
    onRefresh: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ students, onSelectStudent, onSignOut, onRefresh }) => {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    const classSummaries = useMemo<ClassSummary[]>(() => {
        const classes = new Map<string, { totalStress: number; studentList: Student[] }>();
        
        students.forEach(student => {
            const classId = `${student.class}-${student.section}`;
            if (!classes.has(classId)) {
                classes.set(classId, { totalStress: 0, studentList: [] });
            }
            const classData = classes.get(classId)!;
            classData.studentList.push(student);
            classData.totalStress += student.analysisHistory[student.analysisHistory.length - 1].stressLevel;
        });

        return Array.from(classes.entries()).map(([id, data]) => ({
            id,
            name: `Class ${id.replace('-', ' ')}`,
            studentCount: data.studentList.length,
            averageStress: Math.round(data.totalStress / data.studentList.length),
            students: data.studentList
        })).sort((a,b) => a.id.localeCompare(b.id));

    }, [students]);

    const selectedClass = useMemo(() => {
        return classSummaries.find(c => c.id === selectedClassId) || null;
    }, [selectedClassId, classSummaries]);
        
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.07 } }
    };
    
    const pageTransition = {
        type: "tween",
        ease: "anticipate",
        duration: 0.5
    };
    
    const pageVariants = {
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 50 }
    };

    return (
        <div className="min-h-screen w-full p-4 max-w-2xl mx-auto">
            <header className="flex items-center justify-between pt-4 pb-6">
                 <div className="flex items-center gap-2">
                    {selectedClassId && (
                        <motion.button 
                            onClick={() => setSelectedClassId(null)} 
                            className="w-10 h-10 bg-surface rounded-full flex items-center justify-center hover:bg-surface/80 transition-colors"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                        >
                            <ChevronLeft className="w-5 h-5 text-text-secondary" />
                        </motion.button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">
                            {selectedClass ? selectedClass.name : 'Dashboard'}
                        </h1>
                        <p className="text-sm font-normal text-text-muted mt-1">
                            {selectedClass ? `${selectedClass.studentCount} Students` : 'Student Stress Overview'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        className="w-10 h-10 bg-surface rounded-full flex items-center justify-center hover:bg-purple-primary/20 transition-colors cursor-pointer"
                        onClick={onRefresh}
                        title="Refresh Data"
                    >
                        <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <button 
                        className="w-12 h-12 bg-surface rounded-full flex items-center justify-center hover:bg-purple-primary/20 transition-colors cursor-pointer"
                        onClick={() => {
                            if (window.confirm('Are you sure you want to sign out?')) {
                                onSignOut();
                            }
                        }}
                        title="Sign Out"
                    >
                        <UserCircle className="w-6 h-6 text-text-secondary" />
                    </button>
                </div>
            </header>

            <main>
                <AnimatePresence mode="wait">
                    {!selectedClass ? (
                         <MotionDiv
                            key="class-grid"
                            variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
                         >
                            <h2 className="text-sm font-bold uppercase text-text-muted tracking-wider mb-4 px-2">All Classes</h2>
                            {classSummaries.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                                        <UserCircle className="w-8 h-8 text-text-muted" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-text-primary mb-2">No Students Yet</h3>
                                    <p className="text-sm font-normal text-text-muted mb-4">Students will appear here once they complete their first voice analysis session.</p>
                                    <button 
                                        onClick={onRefresh}
                                        className="px-4 py-2 bg-purple-primary text-white rounded-lg hover:bg-purple-dark transition-colors text-sm font-medium"
                                    >
                                        Refresh Data
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {classSummaries.map(summary => (
                                        <motion.div
                                            key={summary.id}
                                            onClick={() => setSelectedClassId(summary.id)}
                                            className="cursor-pointer"
                                            whileHover={{ scale: 1.03, y: -5 }}
                                            transition={{ type: 'spring', stiffness: 300 }}
                                        >
                                            <GlassCard className="p-5 flex flex-col justify-between h-32" variant="purple">
                                                <h3 className="text-lg font-bold text-purple-light">{summary.name}</h3>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-text-secondary">{summary.studentCount} Students</p>
                                                    <p className="text-sm font-normal text-text-muted">Avg {summary.averageStress}% Stress</p>
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </MotionDiv>
                    ) : (
                         <MotionDiv
                            key="student-list"
                            variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
                            className="space-y-8"
                         >
                            <HighRiskAlerts students={selectedClass.students} onSelectStudent={onSelectStudent} />

                            <div>
                                 <h2 className="text-sm font-bold uppercase text-text-muted tracking-wider mb-4 px-2">All Students in Class</h2>
                                <MotionDiv
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-4"
                                >
                                    {selectedClass.students.map(student => (
                                        <StudentWidget 
                                            key={student.code} 
                                            student={student}
                                            onClick={() => onSelectStudent(student.code)}
                                        />
                                    ))}
                                </MotionDiv>
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default TeacherDashboard;
