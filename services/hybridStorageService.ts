/**
 * Hybrid Storage Service
 * 
 * Provides a unified storage API that:
 * 1. Always writes to localStorage first (primary, offline-first)
 * 2. Queues writes for Firebase sync when available
 * 3. Handles sync retries with exponential backoff
 * 4. Provides sync status tracking
 */

import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection as fbCollection, getDocs } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig';
import {
    addToSyncQueue,
    getPendingItems,
    removeFromSyncQueue,
    updateQueueItemStatus,
    getSyncStatusForKey,
    getPendingCount,
    clearSyncQueue,
} from './syncQueueService';

// Keys that should be synced to Firebase
const SYNCABLE_KEYS = [
    'userData',
    'studentAccounts',
    'allStudentsData',
    'voiceBaseline',
    'session_plans',
    'awaaz_session_plans',
    'gamification',
    'onboarding_state',
    'awaaz_student',         // Student history from personalizationService
    'suggestions',           // AI suggestions from PostAnalysisSuggestionsScreen
    'studentNicknames',      // Teacher-assigned student nicknames
];

// Check if a key should be synced to Firebase
function isSyncableKey(key: string): boolean {
    return SYNCABLE_KEYS.some(syncKey =>
        key === syncKey || key.startsWith(`${syncKey}_`)
    );
}

// Firebase connectivity state
let isOnline = navigator.onLine;
let firebaseAvailable = isFirebaseConfigured();

// Listen for online/offline events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('🌐 Network online - triggering sync');
        HybridStorageService.syncPending();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('📴 Network offline');
    });
}

// Dispatch sync status change event
function dispatchSyncStatusChange() {
    window.dispatchEvent(new CustomEvent('syncStatusChanged', {
        detail: {
            pendingCount: getPendingCount(),
            isOnline: isOnline && firebaseAvailable,
        }
    }));
}

// Get the current user code for Firebase path
function getCurrentUserCode(): string | null {
    try {
        const userData = localStorage.getItem('userData');
        if (userData) {
            const parsed = JSON.parse(userData);
            return parsed.accountNumber || null;
        }
    } catch (error) {
        console.error('Error getting user code:', error);
    }
    return null;
}

// Get Firestore document path for a key
// NEW STRUCTURE: All user data in users/{userCode} as a single document with fields
function getFirestorePath(key: string, userCode: string): { collection: string; docId: string; field?: string } {
    // Extract user code from key if it contains one (e.g., voiceBaseline_1234 → 1234)
    const extractUserCode = (k: string, prefix: string): string => {
        if (k.startsWith(prefix)) {
            return k.replace(prefix, '');
        }
        return userCode;
    };

    // User-specific keys - all stored in users/{extractedUserCode}
    if (key.startsWith('voiceBaseline_')) {
        const code = extractUserCode(key, 'voiceBaseline_');
        return { collection: 'users', docId: code, field: 'voiceBaseline' };
    }
    if (key.startsWith('onboarding_state_')) {
        const code = extractUserCode(key, 'onboarding_state_');
        return { collection: 'users', docId: code, field: 'onboarding' };
    }
    if (key.startsWith('gamification_data_')) {
        const code = extractUserCode(key, 'gamification_data_');
        return { collection: 'users', docId: code, field: 'gamification' };
    }
    if (key.startsWith('awaaz_student_')) {
        const code = extractUserCode(key, 'awaaz_student_');
        return { collection: 'users', docId: code, field: 'studentHistory' };
    }
    if (key.startsWith('suggestions_')) {
        const code = extractUserCode(key, 'suggestions_');
        return { collection: 'users', docId: code, field: 'suggestions' };
    }
    if (key.startsWith('session_plans_') || key.startsWith('awaaz_session_plans')) {
        // Session plans use the current user code
        return { collection: 'users', docId: userCode, field: 'sessionPlans' };
    }

    // Current user's profile data
    if (key === 'userData') {
        return { collection: 'users', docId: userCode, field: 'profile' };
    }

    // Global data that affects all users (teacher settings)
    if (key === 'studentNicknames') {
        return { collection: 'settings', docId: 'teacher', field: 'nicknames' };
    }

    // DEPRECATED: These are replaced by user-centric structure
    // Keeping for backward compatibility during migration
    if (key === 'allStudentsData' || key === 'studentAccounts') {
        console.warn(`[HybridStorage] ${key} is deprecated. Use per-user structure.`);
        return { collection: 'deprecated', docId: key };
    }

    // Default: store in user's document
    return { collection: 'users', docId: userCode, field: key };
}


export const HybridStorageService = {
    /**
     * Set a value in storage (localStorage + Firebase queue)
     */
    set(key: string, value: any): void {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

        // Always write to localStorage first
        try {
            localStorage.setItem(key, stringValue);
        } catch (error) {
            console.error(`Error writing to localStorage for key ${key}:`, error);
            // If localStorage fails (e.g., quota exceeded), we still try to queue for Firebase
        }

        // Queue for Firebase sync if it's a syncable key
        if (isSyncableKey(key) && firebaseAvailable) {
            addToSyncQueue(key, stringValue);
            dispatchSyncStatusChange();

            // Attempt immediate sync if online
            if (isOnline) {
                this.syncPending();
            }
        }
    },

    /**
     * Get a value from localStorage (primary source of truth)
     */
    get(key: string): string | null {
        return localStorage.getItem(key);
    },

    /**
     * Get and parse a JSON value from localStorage
     */
    getJSON<T>(key: string): T | null {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        try {
            return JSON.parse(raw) as T;
        } catch (error) {
            console.error(`Error parsing JSON for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Remove a value from storage
     */
    remove(key: string): void {
        localStorage.removeItem(key);

        // TODO: Queue deletion for Firebase if needed
    },

    /**
     * Check if the service is online and Firebase is available
     */
    isOnline(): boolean {
        return isOnline && firebaseAvailable;
    },

    /**
     * Get sync status for a specific key
     */
    getSyncStatus(key: string): 'synced' | 'pending' | 'syncing' | 'failed' {
        if (!firebaseAvailable || !isSyncableKey(key)) {
            return 'synced'; // Not a syncable key, consider it synced
        }
        return getSyncStatusForKey(key);
    },

    /**
     * Get overall sync status
     */
    getOverallSyncStatus(): { pending: number; isOnline: boolean } {
        return {
            pending: getPendingCount(),
            isOnline: isOnline && firebaseAvailable,
        };
    },

    /**
     * Sync all pending items to Firebase
     */
    async syncPending(): Promise<void> {
        if (!db || !isOnline) return;

        const pendingItems = getPendingItems();
        if (pendingItems.length === 0) return;

        console.log(`📤 Syncing ${pendingItems.length} pending items to Firebase...`);

        for (const item of pendingItems) {
            try {
                updateQueueItemStatus(item.id, 'syncing');

                const userCode = getCurrentUserCode();
                if (!userCode && !['allStudentsData', 'studentAccounts'].includes(item.key)) {
                    // Skip user-specific data if no user is logged in
                    continue;
                }

                const { collection, docId, field } = getFirestorePath(item.key, userCode || 'anonymous');
                const docRef = doc(db, collection, docId);

                let data: any;
                try {
                    data = JSON.parse(item.value);
                } catch {
                    data = item.value;
                }

                // Use field-based update if a field is specified
                if (field) {
                    await setDoc(docRef, {
                        [field]: data,
                        [`${field}_updatedAt`]: serverTimestamp(),
                        lastUpdated: serverTimestamp(),
                    }, { merge: true });
                } else {
                    // Fallback for deprecated paths
                    await setDoc(docRef, {
                        data,
                        updatedAt: serverTimestamp(),
                        localTimestamp: item.timestamp,
                    }, { merge: true });
                }

                removeFromSyncQueue(item.id);
                console.log(`✅ Synced: ${item.key} -> ${collection}/${docId}${field ? `.${field}` : ''}`);
            } catch (error) {
                console.error(`❌ Failed to sync ${item.key}:`, error);
                updateQueueItemStatus(item.id, 'pending', true);
            }
        }

        dispatchSyncStatusChange();
    },

    /**
     * Pull data from Firebase for a specific key
     */
    async pullFromFirebase(key: string): Promise<any | null> {
        if (!db || !isOnline) return null;

        try {
            const userCode = getCurrentUserCode();
            if (!userCode && !['allStudentsData', 'studentAccounts'].includes(key)) {
                return null;
            }

            const { collection, docId, field } = getFirestorePath(key, userCode || 'anonymous');
            const docRef = doc(db, collection, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const firebaseData = docSnap.data();
                // If a field is specified, return that field's data
                if (field) {
                    return firebaseData[field] || null;
                }
                // Fallback for deprecated paths
                return firebaseData.data || null;
            }
        } catch (error) {
            console.error(`Error pulling ${key} from Firebase:`, error);
        }

        return null;
    },

    /**
     * Merge Firebase data with local data (Firebase wins for newer timestamps)
     */
    async syncFromFirebase(key: string): Promise<boolean> {
        const firebaseData = await this.pullFromFirebase(key);
        if (!firebaseData) return false;

        // For now, just update localStorage if Firebase has data
        // More sophisticated conflict resolution can be added later
        const localData = this.getJSON(key);

        if (!localData) {
            // No local data, use Firebase data
            localStorage.setItem(key, JSON.stringify(firebaseData));
            return true;
        }

        // TODO: Implement timestamp-based conflict resolution
        // For now, we prefer local data (offline-first)
        return false;
    },

    /**
     * Sync all data on login
     */
    async syncOnLogin(): Promise<void> {
        if (!db || !isOnline) return;

        console.log('🔄 Syncing data on login...');

        // First, push any pending local changes
        await this.syncPending();

        // Then, pull any missing data from Firebase
        const userCode = getCurrentUserCode();
        if (userCode) {
            for (const key of SYNCABLE_KEYS) {
                // Try to sync user-specific keys
                const userKey = key.includes('_') ? key : `${key}_${userCode}`;
                await this.syncFromFirebase(userKey);
            }
        }
    },

    /**
     * Force sync all data before logout
     */
    async syncOnLogout(): Promise<void> {
        if (!db || !isOnline) return;

        console.log('📤 Force syncing before logout...');
        await this.syncPending();
    },

    /**
     * Initialize the service and start sync if online
     */
    initialize(): void {
        console.log(`🚀 HybridStorageService initialized (Firebase: ${firebaseAvailable ? 'enabled' : 'disabled'})`);

        if (firebaseAvailable && isOnline) {
            // Sync pending items on startup
            setTimeout(() => this.syncPending(), 1000);
        }

        dispatchSyncStatusChange();
    },

    /**
     * Clear all synced and pending data
     */
    clearAll(): void {
        // Clear sync queue
        clearSyncQueue();

        // Clear localStorage (handled by existing storageUtils)
        dispatchSyncStatusChange();
    },

    /**
     * Get all users from Firebase (for teacher dashboard)
     * Returns user profiles with their data
     */
    async getAllUsers(): Promise<any[]> {
        if (!db || !isOnline) {
            console.log('📂 Firebase unavailable, using localStorage for allStudentsData');
            const localData = this.getJSON('allStudentsData');
            return Array.isArray(localData) ? localData : [];
        }

        try {
            console.log('📥 Fetching all users from Firebase...');
            const usersCollection = fbCollection(db, 'users');
            const querySnapshot = await getDocs(usersCollection);

            const users: any[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // Build user object from the consolidated structure
                const user = {
                    accountNumber: docSnap.id,
                    ...data.profile,
                    voiceBaseline: data.voiceBaseline,
                    onboarding: data.onboarding,
                    gamification: data.gamification,
                    studentHistory: data.studentHistory,
                    sessionPlans: data.sessionPlans,
                    suggestions: data.suggestions,
                    lastUpdated: data.lastUpdated,
                };
                users.push(user);
            });

            console.log(`✅ Fetched ${users.length} users from Firebase`);
            return users;
        } catch (error) {
            console.error('Error fetching users from Firebase:', error);
            // Fallback to localStorage
            const localData = this.getJSON('allStudentsData');
            return Array.isArray(localData) ? localData : [];
        }
    },

    /**
     * Get a specific user's data from Firebase
     */
    async getUser(userCode: string): Promise<any | null> {
        if (!db || !isOnline) {
            return null;
        }

        try {
            const docRef = doc(db, 'users', userCode);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    accountNumber: docSnap.id,
                    ...data.profile,
                    voiceBaseline: data.voiceBaseline,
                    onboarding: data.onboarding,
                    gamification: data.gamification,
                    studentHistory: data.studentHistory,
                    sessionPlans: data.sessionPlans,
                    suggestions: data.suggestions,
                    lastUpdated: data.lastUpdated,
                };
            }
        } catch (error) {
            console.error(`Error fetching user ${userCode} from Firebase:`, error);
        }

        return null;
    },

    /**
     * ONE-TIME MIGRATION: Migrate all localStorage data to unified Firestore structure
     */
    async migrateLegacyData(): Promise<void> {
        if (!db || !isOnline) {
            console.error('❌ Cannot migrate: Firebase is offline');
            return;
        }

        console.log('🚀 Starting legacy data migration...');
        let count = 0;

        // 1. Migrate allStudentsData (Split into individual users)
        const allStudentsStr = localStorage.getItem('allStudentsData');
        if (allStudentsStr) {
            try {
                const students = JSON.parse(allStudentsStr);
                console.log(`📦 processesing ${students.length} students from allStudentsData...`);

                for (const student of students) {
                    const { code, analysisHistory, ...profile } = student;

                    if (!code) continue;

                    const docRef = doc(db, 'users', code);
                    await setDoc(docRef, {
                        profile: { ...profile, code }, // Ensure code is in profile too
                        studentHistory: analysisHistory || [],
                        lastUpdated: serverTimestamp(),
                        migrationSource: 'allStudentsData'
                    }, { merge: true });

                    console.log(`   ✅ Migrated student: ${code}`);
                    count++;
                }
            } catch (e) {
                console.error('Error migrating allStudentsData:', e);
            }
        }

        // 2. Migrate individual keys (voiceBaseline, etc.)
        const keys = Object.keys(localStorage);
        for (const key of keys) {
            if (key === 'allStudentsData' || key === 'studentAccounts' || key === 'userData') continue;

            const userCodeMatch = key.match(/_(.+)$/); // Extract code from key_CODE
            const userCode = userCodeMatch ? userCodeMatch[1] : null;

            if (userCode) {
                // Reuse getFirestorePath logic by calling set
                // But we need to handle specific keys that might not match exact structure
                // The 'set' method automatically queues it, but here we want direct write?
                // queue is safer.
                const value = localStorage.getItem(key);
                if (value) {
                    try {
                        const parsed = JSON.parse(value);
                        this.set(key, parsed); // Add to sync queue
                        console.log(`   Detailed key queued: ${key}`);
                        count++;
                    } catch { }
                }
            }
        }

        // 3. Migrate nicknames
        const nicknamesStr = localStorage.getItem('studentNicknames');
        if (nicknamesStr) {
            try {
                const nicknames = JSON.parse(nicknamesStr);
                await this.set('studentNicknames', nicknames);
                console.log('   ✅ Queued nicknames migration');
            } catch { }
        }

        // Force sync the queue
        await this.syncPending();
        console.log('✨ Migration complete! synchronized', count, 'items.');
    },
};

// Auto-initialize on module load
HybridStorageService.initialize();

export default HybridStorageService;
