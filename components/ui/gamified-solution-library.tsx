'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Flame, Award, Sparkles } from 'lucide-react';

interface GamifiedSolutionLibraryProps {
    className?: string;
    suggestions?: Array<{ id: string; label: string; type: 'immediate' | 'longterm'; completed: boolean }>;
}

interface PointsData {
    totalPoints: number;
    streak: number;
    completedTasks: number;
    badges: string[];
}

export const GamifiedSolutionLibrary: React.FC<GamifiedSolutionLibraryProps> = ({ className, suggestions = [] }) => {
    const [pointsData, setPointsData] = React.useState<PointsData>(() => {
        // Load from localStorage
        const userData = localStorage.getItem('userData');
        if (!userData) return { totalPoints: 0, streak: 0, completedTasks: 0, badges: [] };
        
        try {
            const parsed = JSON.parse(userData);
            const studentCode = parsed.accountNumber;
            const pointsKey = `gamification_points_${studentCode}`;
            const saved = localStorage.getItem(pointsKey);
            return saved ? JSON.parse(saved) : { totalPoints: 0, streak: 0, completedTasks: 0, badges: [] };
        } catch {
            return { totalPoints: 0, streak: 0, completedTasks: 0, badges: [] };
        }
    });

    const [showCelebration, setShowCelebration] = React.useState(false);

    // Calculate points, streaks, and completed tasks from ALL completed tasks
    const calculateGamificationData = React.useCallback(() => {
        const userData = localStorage.getItem('userData');
        if (!userData) return;

        try {
            const parsed = JSON.parse(userData);
            const studentCode = parsed.accountNumber;
            const completionKey = `suggestions_completed_${studentCode}`;
            const saved = localStorage.getItem(completionKey);
            const completedMap = saved ? JSON.parse(saved) : {};

            // Count ALL completed tasks (not just current suggestions)
            const allCompletedTaskIds = Object.keys(completedMap).filter(id => completedMap[id] === true);
            const completedTasksCount = allCompletedTaskIds.length;

            // Calculate total points: 10 points per completed task
            const totalPoints = completedTasksCount * 10;

            // Calculate streak: check if at least one task was completed today
            const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const streakCompletionKey = `streak_completions_${studentCode}`;
            const streakCompletionDates = localStorage.getItem(streakCompletionKey);
            let completionDates: Record<string, string> = streakCompletionDates ? JSON.parse(streakCompletionDates) : {};

            // Remove completion dates for tasks that are no longer completed
            // (Preserve dates for tasks that are still completed)
            Object.keys(completionDates).forEach(taskId => {
                if (!allCompletedTaskIds.includes(taskId)) {
                    delete completionDates[taskId];
                }
            });
            
            // Save updated completion dates (only removes, preserves existing dates)
            localStorage.setItem(streakCompletionKey, JSON.stringify(completionDates));

            // Check if any task was completed today
            const tasksCompletedToday = Object.values(completionDates).filter(date => date === todayDate).length > 0;

            // Calculate streak
            const streakKey = `streak_data_${studentCode}`;
            const savedStreakData = localStorage.getItem(streakKey);
            let streakData = savedStreakData ? JSON.parse(savedStreakData) : { currentStreak: 0, lastStreakDate: null };

            // Update streak only if at least one task was completed today
            if (tasksCompletedToday) {
                const lastDate = streakData.lastStreakDate;
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (!lastDate) {
                    // First time completing a task - start streak
                    streakData = { currentStreak: 1, lastStreakDate: todayDate };
                } else if (lastDate === todayDate) {
                    // Already counted today - keep streak as is (don't increment again)
                    // Do nothing, streak remains the same
                } else if (lastDate === yesterdayStr) {
                    // Consecutive day - increment streak
                    streakData = { 
                        currentStreak: (streakData.currentStreak || 0) + 1, 
                        lastStreakDate: todayDate 
                    };
                } else {
                    // Gap in completion - streak broken, start new streak
                    streakData = { currentStreak: 1, lastStreakDate: todayDate };
                }
                localStorage.setItem(streakKey, JSON.stringify(streakData));
            }

            const currentStreak = streakData.currentStreak || 0;

            // Award badges
            const savedBadges = pointsData.badges || [];
            const badges = [...savedBadges];
            if (totalPoints >= 100 && !badges.includes('centurion')) badges.push('centurion');
            if (currentStreak >= 7 && !badges.includes('week_warrior')) badges.push('week_warrior');
            if (completedTasksCount >= 10 && !badges.includes('task_master')) badges.push('task_master');

            const newPointsData = {
                totalPoints,
                streak: currentStreak,
                completedTasks: completedTasksCount,
                badges
            };

            // Only update if data actually changed
            if (JSON.stringify(newPointsData) !== JSON.stringify(pointsData)) {
                setPointsData(newPointsData);
                const pointsKey = `gamification_points_${studentCode}`;
                localStorage.setItem(pointsKey, JSON.stringify(newPointsData));
                
                // Show celebration for new achievements or streak increases
                if (badges.length > savedBadges.length || currentStreak > (pointsData.streak || 0)) {
                    setShowCelebration(true);
                    setTimeout(() => setShowCelebration(false), 3000);
                }
            }
        } catch (error) {
            console.error('Error calculating gamification data:', error);
        }
    }, [pointsData]);

    // Recalculate when suggestions change or on mount
    React.useEffect(() => {
        calculateGamificationData();
    }, [calculateGamificationData]);

    // Listen for task completion updates
    React.useEffect(() => {
        const handleCompletionUpdate = () => {
            // Small delay to ensure localStorage is updated
            setTimeout(() => {
                calculateGamificationData();
            }, 100);
        };

        // Listen for custom events
        window.addEventListener('suggestionsUpdated', handleCompletionUpdate);
        window.addEventListener('taskCompleted', handleCompletionUpdate);
        
        // Also poll periodically to catch any direct localStorage changes
        const interval = setInterval(() => {
            calculateGamificationData();
        }, 2000);

        return () => {
            window.removeEventListener('suggestionsUpdated', handleCompletionUpdate);
            window.removeEventListener('taskCompleted', handleCompletionUpdate);
            clearInterval(interval);
        };
    }, [calculateGamificationData]);

    const badgeIcons: Record<string, React.ReactNode> = {
        centurion: <Trophy className="w-5 h-5 text-yellow-400" />,
        week_warrior: <Flame className="w-5 h-5 text-orange-400" />,
        task_master: <Award className="w-5 h-5 text-purple-400" />,
    };

    const badgeLabels: Record<string, string> = {
        centurion: 'Centurion',
        week_warrior: 'Week Warrior',
        task_master: 'Task Master',
    };

    return (
        <div className={`w-full max-w-md mx-auto relative ${className}`}>
            <AnimatePresence>
                {showCelebration && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, -10, 0],
                            }}
                            transition={{ duration: 0.6, repeat: 2 }}
                            className="text-6xl"
                        >
                            🎉
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                        <h2 className="text-xl font-bold text-white">Achievement Center</h2>
                    </div>
                </div>

                {/* Points and Streak Display */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {/* Total Points */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-purple-500/20 rounded-xl p-4 border border-purple-400/30 text-center"
                    >
                        <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">{pointsData.totalPoints}</div>
                        <div className="text-xs text-purple-300 mt-1">Points</div>
                    </motion.div>

                    {/* Streak */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-orange-500/20 rounded-xl p-4 border border-orange-400/30 text-center"
                    >
                        <Flame className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">{pointsData.streak}</div>
                        <div className="text-xs text-orange-300 mt-1">Day Streak</div>
                    </motion.div>

                    {/* Completed Tasks */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-blue-500/20 rounded-xl p-4 border border-blue-400/30 text-center"
                    >
                        <Zap className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-white">{pointsData.completedTasks}</div>
                        <div className="text-xs text-blue-300 mt-1">Tasks Completed</div>
                    </motion.div>
                </div>

                {/* Badges Section */}
                {pointsData.badges.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-purple-300 mb-3 uppercase tracking-wider">Badges Earned</h3>
                        <div className="flex flex-wrap gap-3">
                            {pointsData.badges.map((badge) => (
                                <motion.div
                                    key={badge}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className="bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-xl p-3 border border-purple-400/50 flex items-center gap-2"
                                >
                                    {badgeIcons[badge]}
                                    <span className="text-sm font-medium text-white">{badgeLabels[badge]}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between text-xs text-purple-300 mb-2">
                        <span>Progress to next level</span>
                        <span>{pointsData.totalPoints % 100}/100</span>
                    </div>
                    <div className="w-full bg-purple-900/30 rounded-full h-3 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(pointsData.totalPoints % 100)}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                        />
                    </div>
                </div>

                {/* Motivational Message */}
                {pointsData.streak > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 p-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30"
                    >
                        <p className="text-sm text-white text-center">
                            🔥 {pointsData.streak} day streak! Keep it up!
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};
