import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

const SYNC_QUEUE_KEY = 'awaaz_sync_queue';

interface SyncItem {
    id: string;
    key: string;
    data: any;
    timestamp: number;
    collection: string;
    userId: string;
}

export const StorageService = {
    /**
     * Set item in Hybrid Storage (Local First, Firebase Async)
     */
    async setItem(key: string, data: any, userId: string, collectionName: string = 'state') {
        const timestamp = Date.now();

        // Ensure data is an object before spreading to prevent index-based keys (e.g. "0": "{", "1": "f")
        let processedData: any;
        if (typeof data === 'string') {
            try {
                // Try to parse if it's a JSON string
                processedData = JSON.parse(data);
            } catch (e) {
                // If not JSON, wrap it
                processedData = { value: data };
            }
        } else if (data === null || typeof data !== 'object' || Array.isArray(data)) {
            processedData = { value: data };
        } else {
            processedData = { ...data };
        }

        const dataWithMeta = {
            ...processedData,
            _updatedAt: timestamp,
            _userId: userId
        };

        // 1. Save to Local Storage immediately
        try {
            localStorage.setItem(key, JSON.stringify(dataWithMeta));
        } catch (e) {
            console.error('Local Storage error:', e);
        }

        // 2. Try to sync to Firebase
        try {
            if (navigator.onLine) {
                const docRef = doc(db, "users", userId, collectionName, key);
                await setDoc(docRef, dataWithMeta, { merge: true });
                console.log(`Synced ${key} to Firebase`);
            } else {
                this.addToSyncQueue(key, dataWithMeta, userId, collectionName);
            }
        } catch (e) {
            console.warn(`Firebase sync failed for ${key}, queuing for later.`, e);
            this.addToSyncQueue(key, dataWithMeta, userId, collectionName);
        }

        // Dispatch event for UI
        this.notifySyncStatus();
    },

    /**
     * Get item from Hybrid Storage (Local First)
     */
    getItem<T>(key: string): T | null {
        const localData = localStorage.getItem(key);
        if (localData) {
            try {
                return JSON.parse(localData) as T;
            } catch (e) {
                console.error(`Error parsing local data for ${key}:`, e);
            }
        }
        return null;
    },

    /**
     * Sync from Firebase (Overwrite local if newer)
     */
    async pullFromFirebase(userId: string, collections: string[] = ['state', 'analysis']) {
        if (!navigator.onLine) return;

        for (const coll of collections) {
            try {
                const q = query(collection(db, "users", userId, coll));
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((docSnap) => {
                    const remoteData = docSnap.data() as any;
                    const localKey = docSnap.id;
                    const localData = this.getItem(localKey) as any;

                    // Conflict Resolution: Only update if remote is newer or local is missing
                    if (!localData || (remoteData._updatedAt > (localData._updatedAt || 0))) {
                        localStorage.setItem(localKey, JSON.stringify(remoteData));
                        console.log(`Updated local storage for ${localKey} from Firebase`);
                    }
                });
            } catch (e) {
                console.error(`Error pulling collection ${coll}:`, e);
            }
        }
    },

    /**
     * Add item to the offline sync queue
     */
    addToSyncQueue(key: string, data: any, userId: string, collection: string) {
        const queue = this.getSyncQueue();
        const newItem: SyncItem = {
            id: `${key}_${Date.now()}`,
            key,
            data,
            timestamp: Date.now(),
            collection,
            userId
        };

        // Replace any existing pending sync for the same key to avoid redundant writes
        const filteredQueue = queue.filter(item => item.key !== key);
        filteredQueue.push(newItem);

        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filteredQueue));
        this.notifySyncStatus();
    },

    /**
     * Process the offline sync queue
     */
    async processSyncQueue() {
        if (!navigator.onLine) return;

        const queue = this.getSyncQueue();
        if (queue.length === 0) return;

        console.log(`Processing sync queue (${queue.length} items)...`);
        const remainingItems: SyncItem[] = [];

        for (const item of queue) {
            try {
                const docRef = doc(db, "users", item.userId, item.collection, item.key);
                await setDoc(docRef, item.data, { merge: true });
                console.log(`Successfully synced queued item: ${item.key}`);
            } catch (e) {
                console.error(`Failed to sync queued item ${item.key}:`, e);
                remainingItems.push(item);
            }
        }

        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingItems));
        this.notifySyncStatus();
    },

    getSyncQueue(): SyncItem[] {
        const stored = localStorage.getItem(SYNC_QUEUE_KEY);
        return stored ? JSON.parse(stored) : [];
    },


    notifySyncStatus() {
        const queue = this.getSyncQueue();
        window.dispatchEvent(new CustomEvent('awaaz_sync_status', {
            detail: {
                isOnline: navigator.onLine,
                pendingItems: queue.length
            }
        }));
    },

    /**
     * Remove item from local storage
     */
    removeItem(key: string, userId: string, collectionName: string = 'state'): void {
        localStorage.removeItem(key);
        // Optionally: sync deletion to Firebase if needed. 
        // For now, we mainly use this for local session cleanup.
    }
};

// Auto-sync listeners
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        StorageService.processSyncQueue();
        StorageService.notifySyncStatus();
    });
    window.addEventListener('offline', () => {
        StorageService.notifySyncStatus();
    });
}
