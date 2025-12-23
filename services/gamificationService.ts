/**
 * Gamification Service
 * Handles tier progression, accent color unlocking, and level-up detection
 */

import { MaterialTier, GamificationData, TierAccentColor } from '../types';
import { HybridStorageService } from './hybridStorageService';


// ===== Tier Definitions =====

export const MATERIAL_TIERS: MaterialTier[] = [
    {
        level: 1,
        name: 'Wood',
        tasksMin: 0,
        tasksMax: 5,
        accentColor: { primary: '#8B4513', secondary: '#A0522D', gradient: 'linear-gradient(135deg, #8B4513, #A0522D)' },
        iconName: 'TreeDeciduous',
    },
    {
        level: 2,
        name: 'Stone',
        tasksMin: 6,
        tasksMax: 15,
        accentColor: { primary: '#78716C', secondary: '#A8A29E', gradient: 'linear-gradient(135deg, #78716C, #A8A29E)' },
        iconName: 'Mountain',
    },
    {
        level: 3,
        name: 'Quartz',
        tasksMin: 16,
        tasksMax: 30,
        accentColor: { primary: '#C4B5FD', secondary: '#A78BFA', gradient: 'linear-gradient(135deg, #C4B5FD, #A78BFA)' },
        iconName: 'Sparkles',
    },
    {
        level: 4,
        name: 'Copper',
        tasksMin: 31,
        tasksMax: 50,
        accentColor: { primary: '#B87333', secondary: '#CD853F', gradient: 'linear-gradient(135deg, #B87333, #CD853F)' },
        iconName: 'Coins',
    },
    {
        level: 5,
        name: 'Bronze',
        tasksMin: 51,
        tasksMax: 75,
        accentColor: { primary: '#CD7F32', secondary: '#DAA520', gradient: 'linear-gradient(135deg, #CD7F32, #DAA520)' },
        iconName: 'Shield',
    },
    {
        level: 6,
        name: 'Iron',
        tasksMin: 76,
        tasksMax: 110,
        accentColor: { primary: '#4B5563', secondary: '#6B7280', gradient: 'linear-gradient(135deg, #4B5563, #6B7280)' },
        iconName: 'Sword',
    },
    {
        level: 7,
        name: 'Silver',
        tasksMin: 111,
        tasksMax: 155,
        accentColor: { primary: '#94A3B8', secondary: '#64748B', gradient: 'linear-gradient(135deg, #94A3B8, #64748B)' },
        iconName: 'Medal',
    },
    {
        level: 8,
        name: 'Gold',
        tasksMin: 156,
        tasksMax: 215,
        accentColor: { primary: '#FFD700', secondary: '#FFA500', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)' },
        iconName: 'Crown',
    },
    {
        level: 9,
        name: 'Obsidian',
        tasksMin: 216,
        tasksMax: 290,
        accentColor: { primary: '#9333EA', secondary: '#7C3AED', gradient: 'linear-gradient(135deg, #9333EA, #7C3AED)' },
        iconName: 'Flame',
    },
    {
        level: 10,
        name: 'Diamond',
        tasksMin: 291,
        tasksMax: null,
        accentColor: {
            primary: '#06B6D4',
            secondary: '#8B5CF6',
            gradient: 'linear-gradient(135deg, #06B6D4, #3B82F6, #8B5CF6)'
        },
        iconName: 'Gem',
    },
];

// ===== Helper Functions =====

/**
 * Calculate current tier based on completed tasks
 */
export function calculateTier(completedTasks: number): MaterialTier {
    for (let i = MATERIAL_TIERS.length - 1; i >= 0; i--) {
        if (completedTasks >= MATERIAL_TIERS[i].tasksMin) {
            return MATERIAL_TIERS[i];
        }
    }
    return MATERIAL_TIERS[0]; // Default to Wood
}

/**
 * Get progress towards next tier
 */
export function getTierProgress(completedTasks: number): { current: number; max: number; percentage: number; nextTier: MaterialTier | null } {
    const currentTier = calculateTier(completedTasks);
    const nextTier = MATERIAL_TIERS.find(t => t.level === currentTier.level + 1) || null;

    if (!nextTier) {
        // Max tier reached
        return { current: completedTasks, max: completedTasks, percentage: 100, nextTier: null };
    }

    const tierStart = currentTier.tasksMin;
    const tierEnd = nextTier.tasksMin;
    const progress = completedTasks - tierStart;
    const range = tierEnd - tierStart;
    const percentage = Math.min((progress / range) * 100, 100);

    return { current: progress, max: range, percentage, nextTier };
}

/**
 * Check if user just leveled up
 */
export function checkTierUp(previousTasks: number, currentTasks: number): MaterialTier | null {
    const previousTier = calculateTier(previousTasks);
    const currentTier = calculateTier(currentTasks);

    if (currentTier.level > previousTier.level) {
        return currentTier;
    }
    return null;
}

/**
 * Get all unlocked accent colors based on current tier
 */
export function getUnlockedColors(currentTierLevel: number): MaterialTier[] {
    return MATERIAL_TIERS.filter(tier => tier.level <= currentTierLevel);
}

/**
 * Get tier by level
 */
export function getTierByLevel(level: number): MaterialTier | undefined {
    return MATERIAL_TIERS.find(t => t.level === level);
}

// ===== LocalStorage Management =====

const GAMIFICATION_KEY_PREFIX = 'gamification_data_';

/**
 * Get gamification data for a student
 */
export function getGamificationData(studentCode: string): GamificationData {
    try {
        const key = `${GAMIFICATION_KEY_PREFIX}${studentCode}`;
        const saved = HybridStorageService.get(key);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading gamification data:', error);
    }

    // Default data
    return {
        completedTasks: 0,
        currentTier: 1,
        selectedAccentTier: 1,
        lastTierShown: null,
    };
}

/**
 * Save gamification data for a student
 */
export function saveGamificationData(studentCode: string, data: GamificationData): void {
    try {
        const key = `${GAMIFICATION_KEY_PREFIX}${studentCode}`;
        HybridStorageService.set(key, data);
    } catch (error) {
        console.error('Error saving gamification data:', error);
    }
}

/**
 * Update completed tasks and check for tier up
 * Returns the new tier if leveled up, null otherwise
 */
export function updateCompletedTasks(studentCode: string, newTaskCount: number): MaterialTier | null {
    const data = getGamificationData(studentCode);
    const previousTasks = data.completedTasks;

    // Update task count
    data.completedTasks = newTaskCount;

    // Check for tier up
    const newTier = checkTierUp(previousTasks, newTaskCount);
    if (newTier) {
        data.currentTier = newTier.level;
    }

    // Save updated data
    saveGamificationData(studentCode, data);

    return newTier;
}

/**
 * Set selected accent color tier
 */
export function setSelectedAccentTier(studentCode: string, tierLevel: number): void {
    const data = getGamificationData(studentCode);

    // Only allow selecting unlocked tiers
    if (tierLevel <= data.currentTier) {
        data.selectedAccentTier = tierLevel;
        saveGamificationData(studentCode, data);
    }
}

/**
 * Apply accent color to document root
 */
export function applyAccentColor(tierLevel: number): void {
    const tier = getTierByLevel(tierLevel);
    if (!tier) return;

    const root = document.documentElement;
    root.style.setProperty('--accent-primary', tier.accentColor.primary);
    root.style.setProperty('--accent-secondary', tier.accentColor.secondary);
    root.style.setProperty('--accent-gradient', tier.accentColor.gradient);

    // Store in localStorage for persistence
    HybridStorageService.set('selected_accent_tier', tierLevel.toString());
}

/**
 * Load and apply saved accent color on app start
 */
export function loadSavedAccentColor(): void {
    try {
        const savedTier = HybridStorageService.get('selected_accent_tier');
        if (savedTier) {
            applyAccentColor(parseInt(savedTier, 10));
        }
    } catch (error) {
        console.error('Error loading saved accent color:', error);
    }
}
