/**
 * One-Time Migration Script
 * 
 * Run this ONCE in the browser console to migrate all existing localStorage data to Firebase.
 * This will push all student accounts, analysis data, and settings to Firebase.
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire file
 * 3. Wait for "✅ Migration complete!" message
 */

(async function migrateToFirebase() {
    console.log('🔄 Starting localStorage → Firebase migration...');

    // Import the service (assuming it's available globally)
    const { HybridStorageService } = await import('./services/hybridStorageService');

    // List of keys to migrate
    const keysToMigrate = [
        'userData',
        'studentAccounts',
        'allStudentsData',
        'studentNicknames',
    ];

    // Find all keys that match patterns
    const allKeys = Object.keys(localStorage);
    const patternKeys = allKeys.filter(key =>
        key.startsWith('voiceBaseline_') ||
        key.startsWith('suggestions_') ||
        key.startsWith('awaaz_student_') ||
        key.startsWith('gamification_data_') ||
        key.startsWith('onboarding_state_') ||
        key.startsWith('awaaz_session_plans') ||
        key.startsWith('session_plans_')
    );

    const allKeysToMigrate = [...keysToMigrate, ...patternKeys];

    console.log(`📦 Found ${allKeysToMigrate.length} keys to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const key of allKeysToMigrate) {
        const value = localStorage.getItem(key);
        if (value) {
            try {
                // Parse and re-save to trigger Firebase sync
                const data = JSON.parse(value);
                HybridStorageService.set(key, data);
                console.log(`✅ Migrated: ${key}`);
                migrated++;
            } catch (error) {
                console.error(`❌ Failed to migrate ${key}:`, error);
                skipped++;
            }
        } else {
            skipped++;
        }
    }

    // Wait a bit for queue to populate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger sync
    console.log('📤 Syncing to Firebase...');
    await HybridStorageService.syncPending();

    console.log(`✅ Migration complete!`);
    console.log(`   - Migrated: ${migrated} keys`);
    console.log(`   - Skipped: ${skipped} keys`);
    console.log(`   - Check Firestore console to verify data`);
})();
