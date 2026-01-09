// Debug script to check Firebase sync status
// Run this in the browser console to see what's happening

console.log('=== FIREBASE SYNC DEBUG ===');

// 1. Check if Firebase is configured
const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
};
console.log('Firebase Config:', firebaseConfig.apiKey ? '✅ Configured' : '❌ NOT CONFIGURED');

// 2. Check localStorage data
const allStudentsData = localStorage.getItem('allStudentsData');
const studentAccounts = localStorage.getItem('studentAccounts');
console.log('LocalStorage allStudentsData:', allStudentsData ? JSON.parse(allStudentsData) : 'EMPTY');
console.log('LocalStorage studentAccounts:', studentAccounts ? JSON.parse(studentAccounts) : 'EMPTY');

// 3. Check sync queue
const syncQueue = localStorage.getItem('_sync_queue');
console.log('Sync Queue:', syncQueue ? JSON.parse(syncQueue) : 'EMPTY');

// 4. Check if online
console.log('Network Status:', navigator.onLine ? '🌐 Online' : '📴 Offline');

console.log('=== END DEBUG ===');
