/**
 * Sync Queue Service
 * 
 * Manages a queue of pending operations to sync with Firebase.
 * Uses localStorage as the queue storage for simplicity and reliability.
 * Implements exponential backoff for retry attempts.
 */

export interface SyncQueueItem {
    id: string;
    key: string;
    value: string;
    timestamp: number;
    retryCount: number;
    lastRetry: number | null;
    status: 'pending' | 'syncing' | 'failed';
}

const SYNC_QUEUE_KEY = '_sync_queue';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 30000; // 30 seconds

/**
 * Get the exponential backoff delay for a given retry count
 */
function getBackoffDelay(retryCount: number): number {
    const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
    // Add jitter (±10%) to prevent thundering herd
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
}

/**
 * Get all items in the sync queue
 */
export function getSyncQueue(): SyncQueueItem[] {
    try {
        const raw = localStorage.getItem(SYNC_QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Error reading sync queue:', error);
        return [];
    }
}

/**
 * Save the sync queue to localStorage
 */
function saveSyncQueue(queue: SyncQueueItem[]): void {
    try {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('Error saving sync queue:', error);
    }
}

/**
 * Add an item to the sync queue
 */
export function addToSyncQueue(key: string, value: string): string {
    const queue = getSyncQueue();

    // Check if there's already a pending item for this key
    const existingIndex = queue.findIndex(
        item => item.key === key && item.status !== 'failed'
    );

    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem: SyncQueueItem = {
        id,
        key,
        value,
        timestamp: Date.now(),
        retryCount: 0,
        lastRetry: null,
        status: 'pending',
    };

    if (existingIndex !== -1) {
        // Replace existing pending item with new data
        queue[existingIndex] = { ...newItem, id: queue[existingIndex].id };
    } else {
        queue.push(newItem);
    }

    saveSyncQueue(queue);
    return id;
}

/**
 * Update an item's status in the queue
 */
export function updateQueueItemStatus(
    id: string,
    status: SyncQueueItem['status'],
    incrementRetry = false
): void {
    const queue = getSyncQueue();
    const index = queue.findIndex(item => item.id === id);

    if (index !== -1) {
        queue[index].status = status;
        if (incrementRetry) {
            queue[index].retryCount++;
            queue[index].lastRetry = Date.now();
        }
        saveSyncQueue(queue);
    }
}

/**
 * Remove an item from the queue (called after successful sync)
 */
export function removeFromSyncQueue(id: string): void {
    const queue = getSyncQueue();
    const filtered = queue.filter(item => item.id !== id);
    saveSyncQueue(filtered);
}

/**
 * Get pending items that are ready to retry
 */
export function getPendingItems(): SyncQueueItem[] {
    const queue = getSyncQueue();
    const now = Date.now();

    return queue.filter(item => {
        if (item.status === 'syncing') return false;
        if (item.retryCount >= MAX_RETRIES) return false;

        if (item.lastRetry) {
            const delay = getBackoffDelay(item.retryCount);
            if (now - item.lastRetry < delay) return false;
        }

        return true;
    });
}

/**
 * Get the count of pending sync items
 */
export function getPendingCount(): number {
    const queue = getSyncQueue();
    return queue.filter(
        item => item.status !== 'failed' || item.retryCount < MAX_RETRIES
    ).length;
}

/**
 * Clear all failed items from the queue
 */
export function clearFailedItems(): void {
    const queue = getSyncQueue();
    const filtered = queue.filter(
        item => item.status !== 'failed' || item.retryCount < MAX_RETRIES
    );
    saveSyncQueue(filtered);
}

/**
 * Clear the entire sync queue
 */
export function clearSyncQueue(): void {
    localStorage.removeItem(SYNC_QUEUE_KEY);
}

/**
 * Get sync status for a specific key
 */
export function getSyncStatusForKey(key: string): 'synced' | 'pending' | 'syncing' | 'failed' {
    const queue = getSyncQueue();
    const item = queue.find(item => item.key === key);

    if (!item) return 'synced';
    if (item.retryCount >= MAX_RETRIES) return 'failed';
    return item.status;
}
