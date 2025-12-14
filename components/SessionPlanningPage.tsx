/**
 * Session Planning Page
 * Allows counselors to customize pre-session questions and set AI focus topics
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, X, HelpCircle, Target, MessageSquare } from 'lucide-react';
import { BeamsBackground } from './ui/beams-background';
import GlassCard from './GlassCard';
import type {
    SessionPlan,
    CounselorQuestion,
    CounselorQuestionType,
    PreAnalysisCategory,
    FocusIntensity
} from '../types';
import {
    getSessionPlan,
    saveSessionPlan,
    generateAndSavePlan,
    deleteSessionPlan,
    createEmptyPlan,
    createEmptyQuestion,
    generateQuestionsByTopic,
    QUESTION_TYPE_LABELS,
    CATEGORY_LABELS,
    MCQ_TEMPLATES,
} from '../services/planningService';

// Animation variants
const MotionDiv = motion.div as any;

interface SessionPlanningPageProps {
    studentId: string;
    studentName?: string;
    onBack: () => void;
    onSave: () => void;
}

const SessionPlanningPage: React.FC<SessionPlanningPageProps> = ({
    studentId,
    studentName,
    onBack,
    onSave,
}) => {
    const [plan, setPlan] = useState<SessionPlan | null>(null);
    const [showTypeSelector, setShowTypeSelector] = useState<string | null>(null);
    const [showCategorySelector, setShowCategorySelector] = useState<string | null>(null);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

    // AI Generation State
    const [templateTab, setTemplateTab] = useState<'templates' | 'ai'>('templates');
    const [aiTopic, setAiTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load existing plan or create new one
    useEffect(() => {
        const existingPlan = getSessionPlan(studentId);
        if (existingPlan) {
            setPlan(existingPlan);
        } else {
            setPlan(createEmptyPlan(studentId, studentName));
        }
    }, [studentId, studentName]);

    const handleAddQuestion = () => {
        if (!plan) return;
        const newQuestion = createEmptyQuestion('general');
        setPlan({
            ...plan,
            customQuestions: [...plan.customQuestions, newQuestion],
        });
        setHasChanges(true);
    };

    const handleAddTemplate = (template: typeof MCQ_TEMPLATES[0]) => {
        if (!plan) return;
        const newQuestion = createEmptyQuestion('general');
        newQuestion.text = template.text;
        newQuestion.type = 'multiple-choice';
        newQuestion.options = [...template.options];

        setPlan({
            ...plan,
            customQuestions: [...plan.customQuestions, newQuestion],
        });
        setShowTemplateSelector(false);
        setHasChanges(true);
    };

    const handleRemoveQuestion = (questionId: string) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.filter(q => q.id !== questionId),
        });
        setHasChanges(true);
    };

    const handleQuestionTextChange = (questionId: string, text: string) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q =>
                q.id === questionId ? { ...q, text } : q
            ),
        });
        setHasChanges(true);
    };

    const handleQuestionTypeChange = (questionId: string, type: CounselorQuestionType) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q =>
                q.id === questionId ? { ...q, type, options: type === 'multiple-choice' ? ['', ''] : undefined } : q
            ),
        });
        setShowTypeSelector(null);
        setHasChanges(true);
    };

    const handleQuestionCategoryChange = (questionId: string, category: PreAnalysisCategory) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q =>
                q.id === questionId ? { ...q, category } : q
            ),
        });
        setShowCategorySelector(null);
        setHasChanges(true);
    };

    const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q => {
                if (q.id !== questionId || !q.options) return q;
                const newOptions = [...q.options];
                newOptions[optionIndex] = value;
                return { ...q, options: newOptions };
            }),
        });
        setHasChanges(true);
    };

    const handleAddOption = (questionId: string) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q => {
                if (q.id !== questionId || !q.options || q.options.length >= 6) return q;
                return { ...q, options: [...q.options, ''] };
            }),
        });
        setHasChanges(true);
    };

    const handleRemoveOption = (questionId: string, optionIndex: number) => {
        if (!plan) return;
        setPlan({
            ...plan,
            customQuestions: plan.customQuestions.map(q => {
                if (q.id !== questionId || !q.options || q.options.length <= 2) return q;
                return { ...q, options: q.options.filter((_, i) => i !== optionIndex) };
            }),
        });
        setHasChanges(true);
    };

    const handleFocusTopicChange = (focusTopic: string) => {
        if (!plan) return;
        setPlan({ ...plan, focusTopic });
        setHasChanges(true);
    };

    const handleFocusIntensityChange = (focusIntensity: FocusIntensity) => {
        if (!plan) return;
        setPlan({ ...plan, focusIntensity });
        setHasChanges(true);
    };

    const handleTogglePersistence = () => {
        if (!plan) return;
        setPlan({ ...plan, useForNextSessionOnly: !plan.useForNextSessionOnly });
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!plan) return;
        setIsSaving(true);
        try {
            await generateAndSavePlan({ ...plan, isActive: true });
            setHasChanges(false);
            onSave();
        } catch (e) {
            console.error("Failed to save", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateQuestions = async () => {
        if (!aiTopic.trim()) return;
        setIsGenerating(true);
        try {
            const questions = await generateQuestionsByTopic(aiTopic, 3);
            if (plan) {
                // Map to CounselorQuestion type
                const counselorQuestions: CounselorQuestion[] = questions.map(q => ({
                    id: q.id,
                    text: q.text,
                    type: q.type === 'multiple-choice' ? 'multiple-choice' :
                        q.type === 'yes-no' ? 'yes-no' : 'scale-1-5',
                    category: q.category,
                    options: q.options,
                    createdAt: new Date().toISOString()
                }));

                setPlan({
                    ...plan,
                    customQuestions: [...plan.customQuestions, ...counselorQuestions]
                });
                setHasChanges(true);
                setShowTemplateSelector(false);
                setAiTopic('');
            }
        } catch (e) {
            console.error("Failed to generate questions", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClearPlan = () => {
        deleteSessionPlan(studentId);
        setPlan(createEmptyPlan(studentId, studentName));
        setHasChanges(true);
    };

    if (!plan) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-primary">
                <div className="text-text-muted">Loading...</div>
            </div>
        );
    }

    const validQuestionCount = plan.customQuestions.filter(q => q.text.trim() !== '').length;
    const remainingAIQuestions = Math.max(0, 5 - validQuestionCount);

    return (
        <div className="min-h-screen w-full bg-background-primary text-text-primary flex flex-col relative">
            {/* Background */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <BeamsBackground intensity="medium" className="!z-0" />
            </div>

            {/* Header */}
            <div className="sticky top-0 z-20 backdrop-blur-md bg-transparent border-b border-white/5">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-primary"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold">Plan Session</h1>
                                <p className="text-sm text-text-muted">
                                    for {studentName || studentId}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasChanges && (
                                <span className="text-xs text-orange-400">Unsaved changes</span>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all duration-300 border ${hasChanges && !isSaving
                                    ? 'bg-gradient-to-r from-purple-primary to-purple-light text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] border-purple-400/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:border-purple-400/50 hover:scale-105'
                                    : 'bg-surface/50 text-text-muted cursor-not-allowed border-white/5'
                                    }`}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Plan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto relative z-10">
                <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

                    {/* Custom Questions Section */}
                    <GlassCard
                        className={`p-6 transition-all duration-200 ${(showTypeSelector || showCategorySelector) ? 'relative z-20' : 'relative z-10'}`}
                        variant="purple"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-purple-primary/20 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-purple-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Custom Pre-Session Questions</h2>
                                <p className="text-sm text-text-muted">
                                    Set specific questions to ask before the AI session
                                </p>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-4">
                            <AnimatePresence>
                                {plan.customQuestions.map((question, index) => (
                                    <MotionDiv
                                        key={question.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                        className={`bg-surface/30 rounded-xl p-4 border border-white/10 relative transition-all duration-200 ${(showTypeSelector === question.id || showCategorySelector === question.id)
                                            ? 'z-20 border-purple-primary/30 shadow-lg'
                                            : 'z-0'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-primary/30 text-purple-primary flex items-center justify-center text-sm font-medium">
                                                {index + 1}
                                            </span>
                                            <div className="flex-1 space-y-3">
                                                {/* Question Text */}
                                                <textarea
                                                    value={question.text}
                                                    onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                                                    placeholder="Enter your question..."
                                                    className="w-full bg-surface/50 border border-white/10 rounded-lg p-3 text-white placeholder-text-muted resize-none focus:border-purple-primary/50 focus:outline-none transition-colors"
                                                    rows={2}
                                                />

                                                {/* Question Settings */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Type Selector */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowTypeSelector(showTypeSelector === question.id ? null : question.id)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-surface/50 border border-white/10 rounded-lg text-sm text-text-secondary hover:border-purple-primary/30 transition-colors"
                                                        >
                                                            <span>{QUESTION_TYPE_LABELS[question.type]?.icon}</span>
                                                            <span>{QUESTION_TYPE_LABELS[question.type]?.label}</span>
                                                        </button>

                                                        {showTypeSelector === question.id && (
                                                            <div className="absolute top-full left-0 mt-2 w-56 bg-background-secondary border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                                                {Object.entries(QUESTION_TYPE_LABELS).map(([type, info]) => (
                                                                    <button
                                                                        key={type}
                                                                        onClick={() => handleQuestionTypeChange(question.id, type as CounselorQuestionType)}
                                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-purple-primary/10 transition-colors ${question.type === type ? 'bg-purple-primary/20 text-purple-primary' : 'text-text-secondary'
                                                                            }`}
                                                                    >
                                                                        <span className="text-lg">{info.icon}</span>
                                                                        <div>
                                                                            <div className="font-medium">{info.label}</div>
                                                                            <div className="text-xs text-text-muted">{info.description}</div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Category Selector */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowCategorySelector(showCategorySelector === question.id ? null : question.id)}
                                                            className={`flex items-center gap-2 px-3 py-1.5 bg-surface/50 border border-white/10 rounded-lg text-sm hover:border-purple-primary/30 transition-colors ${CATEGORY_LABELS[question.category]?.color || 'text-text-secondary'}`}
                                                        >
                                                            {CATEGORY_LABELS[question.category]?.label || 'Category'}
                                                        </button>

                                                        {showCategorySelector === question.id && (
                                                            <div className="absolute top-full left-0 mt-2 w-40 bg-background-secondary border border-white/10 rounded-xl shadow-xl z-30 overflow-hidden">
                                                                {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
                                                                    <button
                                                                        key={cat}
                                                                        onClick={() => handleQuestionCategoryChange(question.id, cat as PreAnalysisCategory)}
                                                                        className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-purple-primary/10 transition-colors ${info.color}`}
                                                                    >
                                                                        {info.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Multiple Choice Options */}
                                                {question.type === 'multiple-choice' && question.options && (
                                                    <div className="space-y-2 mt-3 pl-4 border-l-2 border-purple-primary/30">
                                                        <p className="text-xs text-text-muted">Response Options:</p>
                                                        {question.options.map((option, optIndex) => (
                                                            <div key={optIndex} className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={option}
                                                                    onChange={(e) => handleOptionChange(question.id, optIndex, e.target.value)}
                                                                    className="flex-1 bg-surface/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-text-muted focus:border-purple-primary/50 focus:outline-none transition-colors"
                                                                    placeholder={`Option ${optIndex + 1}`}
                                                                />
                                                                {question.options!.length > 2 && (
                                                                    <button
                                                                        onClick={() => handleRemoveOption(question.id, optIndex)}
                                                                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {question.options.length < 6 && (
                                                            <button
                                                                onClick={() => handleAddOption(question.id)}
                                                                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                                            >
                                                                + Add Option
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleRemoveQuestion(question.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                title="Remove question"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </MotionDiv>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Add Buttons */}
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={handleAddQuestion}
                                className="flex-1 py-3 border-2 border-dashed border-purple-primary/30 rounded-xl text-purple-primary hover:bg-purple-primary/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Add Custom Question
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                                    className="h-full px-6 border-2 border-dashed border-blue-400/30 rounded-xl text-blue-400 hover:bg-blue-400/10 transition-colors flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                    Use Template
                                </button>

                                {showTemplateSelector && (
                                    <div className="absolute bottom-full right-0 mb-2 w-80 bg-background-secondary border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-white/10">
                                        <div className="flex border-b border-white/10">
                                            <button
                                                onClick={() => setTemplateTab('templates')}
                                                className={`flex-1 p-3 text-sm font-medium transition-colors ${templateTab === 'templates' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                                            >
                                                Templates
                                            </button>
                                            <button
                                                onClick={() => setTemplateTab('ai')}
                                                className={`flex-1 p-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${templateTab === 'ai' ? 'bg-purple-primary/20 text-purple-300' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                                            >
                                                <div className="w-3 h-3 rounded-full bg-purple-primary/50 animate-pulse" />
                                                AI Generate
                                            </button>
                                        </div>

                                        {templateTab === 'templates' ? (
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                <div className="p-3">
                                                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Select a Template</h4>
                                                    <div className="space-y-1">
                                                        {MCQ_TEMPLATES.map((template, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => handleAddTemplate(template)}
                                                                className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group"
                                                            >
                                                                <div className="text-sm text-white mb-1 group-hover:text-purple-300 transition-colors">{template.text}</div>
                                                                <div className="text-xs text-text-muted truncate">{template.options.join(', ')}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
                                                        What topic to focus on?
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={aiTopic}
                                                        onChange={(e) => setAiTopic(e.target.value)}
                                                        placeholder="e.g. Exam Stress, Friendships"
                                                        className="w-full bg-surface/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:border-purple-primary/50 focus:outline-none transition-colors"
                                                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateQuestions()}
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleGenerateQuestions}
                                                    disabled={!aiTopic.trim() || isGenerating}
                                                    className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${!aiTopic.trim() || isGenerating
                                                            ? 'bg-surface/50 text-text-muted cursor-not-allowed'
                                                            : 'bg-purple-primary hover:bg-purple-600 text-white shadow-lg shadow-purple-primary/20'
                                                        }`}
                                                >
                                                    {isGenerating ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />
                                                            Generate Questions
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Questions Info */}
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-start gap-2">
                                <HelpCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-blue-300">
                                    {validQuestionCount === 0 ? (
                                        "No questions added yet. AI will generate all 5 personalized questions."
                                    ) : validQuestionCount >= 5 ? (
                                        "You've added 5+ questions. Only your custom questions will be used."
                                    ) : (
                                        <>You've added {validQuestionCount} question{validQuestionCount !== 1 ? 's' : ''}. AI will generate {remainingAIQuestions} complementary question{remainingAIQuestions !== 1 ? 's' : ''} on the same topics.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Focus Topic Section */}
                    <GlassCard className="p-6" variant="base">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-orange-primary/20 flex items-center justify-center">
                                <Target className="w-5 h-5 text-orange-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Session Focus Topic</h2>
                                <p className="text-sm text-text-muted">
                                    Guide the AI to explore a specific topic during the conversation
                                </p>
                            </div>
                        </div>

                        {/* Focus Topic Input */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-2">
                                    What topic should the AI focus on? (optional)
                                </label>
                                <input
                                    type="text"
                                    value={plan.focusTopic}
                                    onChange={(e) => handleFocusTopicChange(e.target.value)}
                                    placeholder="e.g., exam anxiety, peer relationships, sleep issues..."
                                    className="w-full bg-surface/50 border border-white/10 rounded-lg p-3 text-white placeholder-text-muted focus:border-orange-primary/50 focus:outline-none transition-colors"
                                />
                            </div>

                            {/* Focus Intensity */}
                            {plan.focusTopic && (
                                <MotionDiv
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-3"
                                >
                                    <label className="block text-sm text-text-secondary">
                                        How strongly should the AI focus on this topic?
                                    </label>
                                    <div className="flex gap-2">
                                        {(['gentle', 'moderate', 'focused'] as FocusIntensity[]).map((intensity) => (
                                            <button
                                                key={intensity}
                                                onClick={() => handleFocusIntensityChange(intensity)}
                                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${plan.focusIntensity === intensity
                                                    ? 'bg-orange-primary text-white shadow-lg shadow-orange-primary/30'
                                                    : 'bg-surface/50 text-text-secondary hover:bg-surface hover:text-white border border-white/10'
                                                    }`}
                                            >
                                                <div className="capitalize">{intensity}</div>
                                                <div className="text-xs mt-1 opacity-70">
                                                    {intensity === 'gentle' && 'Light suggestion'}
                                                    {intensity === 'moderate' && 'Regular guidance'}
                                                    {intensity === 'focused' && 'Primary focus'}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </MotionDiv>
                            )}

                            {/* Example Topics */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-xs text-text-muted">Suggestions:</span>
                                {['academic pressure', 'friendships', 'sleep problems', 'family dynamics', 'self-esteem'].map((topic) => (
                                    <button
                                        key={topic}
                                        onClick={() => handleFocusTopicChange(topic)}
                                        className="px-2 py-1 text-xs bg-surface/30 text-text-secondary rounded-md hover:bg-surface hover:text-white transition-colors"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Plan Settings */}
                    <GlassCard className="p-6" variant="base">
                        <h3 className="text-lg font-semibold text-white mb-4">Plan Settings</h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={plan.useForNextSessionOnly}
                                    onChange={handleTogglePersistence}
                                    className="w-5 h-5 rounded border-white/20 bg-surface/50 text-purple-primary focus:ring-purple-primary"
                                />
                                <div>
                                    <div className="text-white">One-time Plan (Auto-delete)</div>
                                    <div className="text-xs text-text-muted">
                                        Plan will be verified and deleted after one session
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Clear Plan Button */}
                        <button
                            onClick={handleClearPlan}
                            className="mt-6 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                        >
                            Clear All & Start Fresh
                        </button>
                    </GlassCard>

                </div>
            </div>
        </div>
    );
};

export default SessionPlanningPage;
