// Firebase Configuration for TRUE Framework
// This file handles Firebase integration for cloud persistence

class FirebaseStorage {
    constructor() {
        this.initialized = false;
        this.db = null;
        this.config = null;
        this.syncEnabled = false;
        this.lastSyncTime = null;
        this.syncInterval = null;
    }

    // Initialize Firebase with user's configuration
    async initialize(config) {
        console.log('🔥 FirebaseStorage.initialize called with:', config);
        
        if (this.initialized) {
            console.log('🔥 Firebase already initialized');
            return true;
        }

        try {
            console.log('🔥 Loading Firebase SDK...');
            // Dynamically load Firebase SDK
            if (!window.firebase) {
                await this.loadFirebaseSDK();
            }

            console.log('🔥 Initializing Firebase app...');
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(config);
            }

            console.log('🔥 Getting database reference...');
            this.db = firebase.database();
            this.config = config;
            this.initialized = true;
            
            console.log('✅ Firebase initialized successfully');
            console.log('🔥 Database reference:', this.db);
            return true;
        } catch (error) {
            console.error('❌ Firebase initialization error:', error);
            console.error('❌ Error details:', error.message, error.code);
            return false;
        }
    }

    // Load Firebase SDK dynamically
    async loadFirebaseSDK() {
        return new Promise((resolve, reject) => {
            // Check if already loading or loaded
            if (window.firebase) {
                resolve();
                return;
            }

            // Create script elements for Firebase
            const scripts = [
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
            ];

            let loadedCount = 0;
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => {
                    loadedCount++;
                    if (loadedCount === scripts.length) {
                        resolve();
                    }
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        });
    }

    // Save evaluations to Firebase with smart merging and limit
    async saveEvaluations(newEvaluations) {
        if (!this.initialized || !this.syncEnabled) return false;

        try {
            // Validate input
            if (!newEvaluations || !Array.isArray(newEvaluations)) {
                console.error('❌ Invalid evaluations data:', newEvaluations);
                return false;
            }
            
            console.log(`📥 Saving ${newEvaluations.length} evaluations to Firebase...`);
            
            // Get existing data from Firebase
            const existingData = await this.loadEvaluations();
            let mergedEvaluations = [];
            
            if (existingData && Array.isArray(existingData) && existingData.length > 0) {
                // Merge existing and new evaluations, avoiding duplicates
                mergedEvaluations = this.mergeEvaluations(existingData, newEvaluations);
                console.log(`🔄 Merged ${existingData.length} existing + ${newEvaluations.length} new = ${mergedEvaluations.length} total`);
            } else {
                // No existing data, use new evaluations
                mergedEvaluations = [...newEvaluations];
                console.log(`📝 No existing data, using ${newEvaluations.length} new evaluations`);
            }
            
            // Apply limit (keep most recent)
            const limitedEvaluations = this.limitEvaluations(mergedEvaluations, 500);
            const removedCount = mergedEvaluations.length - limitedEvaluations.length;
            
            // Add metadata
            const data = {
                evaluations: limitedEvaluations,
                lastUpdated: Date.now(),
                version: '1.0',
                totalCount: limitedEvaluations.length,
                removedCount: removedCount,
                lastSyncTimestamp: Date.now()
            };

            // Save to Firebase
            await this.db.ref('true_framework_evaluations').set(data);
            this.lastSyncTime = Date.now();
            
            if (removedCount > 0) {
                console.log(`🗑️ Removed ${removedCount} oldest evaluations to maintain 500 limit`);
                console.log(`✅ Saved ${limitedEvaluations.length} most recent evaluations to Firebase`);
            } else {
                console.log(`✅ Saved ${limitedEvaluations.length} evaluations to Firebase`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error saving to Firebase:', error);
            console.error('❌ Error details:', error.message);
            return false;
        }
    }
    
    // Merge existing and new evaluations, avoiding duplicates
    mergeEvaluations(existing, newEvals) {
        // Validate inputs
        if (!Array.isArray(existing) || !Array.isArray(newEvals)) {
            console.error('❌ Invalid arrays for merge:', { existing, newEvals });
            return Array.isArray(newEvals) ? [...newEvals] : [];
        }

        const merged = [...existing];
        const existingIds = new Set();

        // Build set of existing IDs, handling undefined/null
        existing.forEach(e => {
            if (e && e.id) {
                existingIds.add(e.id);
            }
        });

        for (const newEval of newEvals) {
            // Skip invalid evaluations
            if (!newEval || !newEval.id) {
                console.warn('⚠️ Skipping invalid evaluation:', newEval);
                continue;
            }

            if (!existingIds.has(newEval.id)) {
                merged.push(newEval);
                existingIds.add(newEval.id);
            } else {
                // Update existing evaluation if newer
                const existingIndex = merged.findIndex(e => e.id === newEval.id);
                if (existingIndex !== -1) {
                    const existingTimestamp = merged[existingIndex].timestamp || 0;
                    const newTimestamp = newEval.timestamp || 0;

                    if (newTimestamp > existingTimestamp) {
                        merged[existingIndex] = newEval;
                        console.log(`🔄 Updated evaluation ${newEval.id} with newer data`);
                    }
                }
            }
        }

        console.log(`📊 Merge result: ${existing.length} + ${newEvals.length} → ${merged.length} evaluations`);

        // Deduplicate by model name (case-insensitive) to prevent duplicate display names
        const deduplicated = this.deduplicateByModelName(merged);
        if (deduplicated.length < merged.length) {
            console.log(`🔄 Removed ${merged.length - deduplicated.length} duplicate model names`);
        }

        return deduplicated;
    }

    // Deduplicate evaluations by model name (case-insensitive)
    deduplicateByModelName(evaluations) {
        const uniqueByName = new Map();
        const evalCounts = new Map();

        // Process each evaluation
        evaluations.forEach(evaluation => {
            if (!evaluation || !evaluation.modelName) return;

            const modelKey = evaluation.modelName.toLowerCase().trim();
            const existing = uniqueByName.get(modelKey);

            // Accumulate eval counts
            const currentEvalCount = evaluation.evalCount || 1;
            evalCounts.set(modelKey, (evalCounts.get(modelKey) || 0) + currentEvalCount);

            // Keep evaluation with highest score, or latest timestamp if scores equal
            if (!existing ||
                evaluation.totalScore > existing.totalScore ||
                (evaluation.totalScore === existing.totalScore &&
                 (evaluation.timestamp || 0) > (existing.timestamp || 0))) {
                uniqueByName.set(modelKey, evaluation);
            }
        });

        // Update eval counts on the kept evaluations and normalize model names
        return Array.from(uniqueByName.values()).map(evaluation => {
            const modelKey = evaluation.modelName.toLowerCase().trim();
            const count = evalCounts.get(modelKey) || 1;
            evaluation.evalCount = Math.max(count, evaluation.evalCount || 1);
            // Ensure modelName is always stored in lowercase
            evaluation.modelName = modelKey;
            return evaluation;
        });
    }
    
    // Limit evaluations to the most recent N items
    limitEvaluations(evaluations, limit) {
        // Validate inputs
        if (!Array.isArray(evaluations)) {
            console.error('❌ Invalid evaluations array for limiting:', evaluations);
            return [];
        }
        
        if (!limit || limit <= 0) {
            console.error('❌ Invalid limit:', limit);
            return evaluations;
        }
        
        if (evaluations.length <= limit) {
            console.log(`📊 No limit needed: ${evaluations.length} evaluations <= ${limit} limit`);
            return evaluations;
        }
        
        // Filter out invalid evaluations before sorting
        const validEvaluations = evaluations.filter(e => e && typeof e === 'object');
        console.log(`📊 Filtered ${evaluations.length - validEvaluations.length} invalid evaluations`);
        
        // Sort by timestamp (most recent first) and take top N
        const sorted = validEvaluations
            .sort((a, b) => {
                const timeA = a.timestamp || 0;
                const timeB = b.timestamp || 0;
                return timeB - timeA; // Most recent first
            });
        
        const limited = sorted.slice(0, limit);
        
        // Log what was removed
        if (sorted.length > limit) {
            const removed = sorted.slice(limit);
            const oldestRemoved = removed[removed.length - 1];
            const newestKept = limited[limited.length - 1];
            
            console.log(`📊 Evaluation limit applied:`);
            console.log(`   - Kept: ${limited.length} most recent evaluations`);
            console.log(`   - Removed: ${removed.length} oldest evaluations`);
            
            if (newestKept && newestKept.timestamp && newestKept.modelName) {
                console.log(`   - Newest kept: ${new Date(newestKept.timestamp).toLocaleDateString()} - ${newestKept.modelName}`);
            }
            
            if (oldestRemoved && oldestRemoved.timestamp && oldestRemoved.modelName) {
                console.log(`   - Oldest removed: ${new Date(oldestRemoved.timestamp).toLocaleDateString()} - ${oldestRemoved.modelName}`);
            }
        }
        
        return limited;
    }

    // Load evaluations from Firebase
    async loadEvaluations() {
        if (!this.initialized) return null;

        try {
            const snapshot = await this.db.ref('true_framework_evaluations').once('value');
            const data = snapshot.val();
            
            if (data && data.evaluations) {
                console.log(`Loaded ${data.evaluations.length} evaluations from Firebase`);
                this.lastSyncTime = Date.now();
                return data.evaluations;
            }
            
            return null;
        } catch (error) {
            console.error('Error loading from Firebase:', error);
            return null;
        }
    }

    // Enable real-time sync
    enableSync(callback) {
        if (!this.initialized) return;

        this.syncEnabled = true;
        
        // Listen for changes
        this.db.ref('true_framework_evaluations').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.evaluations && callback) {
                // Notify about data limitation
                if (data.limited) {
                    console.log(`📊 Firebase data is limited to ${data.totalCount} most recent evaluations (was ${data.originalCount})`);
                }
                callback(data.evaluations);
            }
        });

        console.log('Firebase real-time sync enabled');
    }

    // Disable real-time sync
    disableSync() {
        if (!this.initialized) return;

        this.syncEnabled = false;
        this.db.ref('true_framework_evaluations').off();
        
        console.log('Firebase real-time sync disabled');
    }

    // Check connection status
    async checkConnection() {
        if (!this.initialized) return false;

        try {
            await this.db.ref('.info/connected').once('value');
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get sync status
    getSyncStatus() {
        return {
            initialized: this.initialized,
            syncEnabled: this.syncEnabled,
            lastSyncTime: this.lastSyncTime,
            connected: this.initialized ? true : false
        };
    }
    
    // Get storage statistics
    async getStorageStats() {
        if (!this.initialized) return null;
        
        try {
            const snapshot = await this.db.ref('true_framework_evaluations').once('value');
            const data = snapshot.val();
            
            if (!data || !data.evaluations) {
                return {
                    totalEvaluations: 0,
                    oldestEvaluation: null,
                    newestEvaluation: null,
                    storageSize: 'Unknown'
                };
            }
            
            const evaluations = data.evaluations;
            const timestamps = evaluations.map(e => e.timestamp || 0).filter(t => t > 0);
            
            const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : null;
            const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;
            
            return {
                totalEvaluations: evaluations.length,
                oldestEvaluation: oldestTimestamp ? new Date(oldestTimestamp).toLocaleDateString() : null,
                newestEvaluation: newestTimestamp ? new Date(newestTimestamp).toLocaleDateString() : null,
                storageSize: JSON.stringify(data).length + ' bytes',
                lastUpdated: data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : null,
                removedCount: data.removedCount || 0
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return null;
        }
    }

    // Clear all data from Firebase (use with caution!)
    async clearAllData() {
        if (!this.initialized) return false;

        try {
            await this.db.ref('true_framework_evaluations').remove();
            console.log('All Firebase data cleared');
            return true;
        } catch (error) {
            console.error('Error clearing Firebase data:', error);
            return false;
        }
    }
    
    // Clean up old evaluations to maintain limit
    async cleanupOldEvaluations(limit = 500) {
        if (!this.initialized) return false;
        
        try {
            const currentData = await this.loadEvaluations();
            if (!currentData || currentData.length <= limit) {
                console.log(`No cleanup needed: ${currentData?.length || 0} evaluations within limit of ${limit}`);
                return true;
            }
            
            const limitedData = this.limitEvaluations(currentData, limit);
            const removedCount = currentData.length - limitedData.length;
            
            const data = {
                evaluations: limitedData,
                lastUpdated: Date.now(),
                version: '1.0',
                totalCount: limitedData.length,
                removedCount: removedCount,
                cleanupTimestamp: Date.now()
            };
            
            await this.db.ref('true_framework_evaluations').set(data);
            console.log(`🧹 Cleanup completed: removed ${removedCount} old evaluations, kept ${limitedData.length}`);
            
            return true;
        } catch (error) {
            console.error('Error during cleanup:', error);
            return false;
        }
    }

    // Export actual Firebase configuration (not just template)
    static getConfigTemplate() {
        return {
            apiKey: "AIzaSyA6A-pAF02TDD3A6mBLDsUJ03e-cC3vVkk",
            authDomain: "studio-2124751200-d4c3c.firebaseapp.com",
            databaseURL: "https://studio-2124751200-d4c3-default-rtdb.firebaseio.com",
            projectId: "studio-2124751200-d4c3c",
            storageBucket: "studio-2124751200-d4c3c.firebasestorage.app",
            messagingSenderId: "851273346839",
            appId: "1:851273346839:web:5286ba5a7ba673c0b31152"
        };
    }
    
    // Get the actual Firebase configuration
    static getActualConfig() {
        return {
            apiKey: "AIzaSyA6A-pAF02TDD3A6mBLDsUJ03e-cC3vVkk",
            authDomain: "studio-2124751200-d4c3c.firebaseapp.com",
            databaseURL: "https://studio-2124751200-d4c3c-default-rtdb.firebaseio.com/",
            projectId: "studio-2124751200-d4c3c",
            storageBucket: "studio-2124751200-d4c3c.firebasestorage.app",
            messagingSenderId: "851273346839",
            appId: "1:851273346839:web:5286ba5a7ba673c0b31152"
        };
    }

    // Validate configuration
    static validateConfig(config) {
        const required = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
        return required.every(key => config[key] && config[key] !== '' && !config[key].includes('your-'));
    }
}

// Create global instance
window.firebaseStorage = new FirebaseStorage();