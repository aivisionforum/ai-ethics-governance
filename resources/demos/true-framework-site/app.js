// TRUE Framework Evaluation App
class TRUEFramework {
    constructor() {
        this.currentEvaluation = null;
        this.evaluations = this.loadEvaluations();
        this.sortConfig = { column: 'totalScore', direction: 'desc' }; // Default to score for normal viewing
        this.justManuallyEvaluated = false; // Track if user just did manual eval
        this.currentRunCounts = {}; // Track eval counts for current page session
        this.evalViewMode = 'current'; // 'current' or 'historic'
        this.currentPopularModels = new Set(); // Track which models are in current popular list
        this.hasUnsavedChanges = false; // Track if there are unsaved manual changes
        this.originalEvaluationState = null; // Store original state for comparison
        // Use pre-evaluated models if available, otherwise fall back to basic info
        this.predefinedModels = typeof modelEvaluations !== 'undefined' ? modelEvaluations : {
            'mistral-7b': {
                name: 'Mistral-7B',
                url: 'https://github.com/mistralai/mistral-src'
            },
            'llama-2': {
                name: 'LLaMA 2',
                url: 'https://github.com/facebookresearch/llama'
            },
            'falcon': {
                name: 'Falcon',
                url: 'https://huggingface.co/tiiuae/falcon-40b'
            },
            'mpt': {
                name: 'MPT',
                url: 'https://github.com/mosaicml/llm-foundry'
            },
            'pythia': {
                name: 'Pythia',
                url: 'https://github.com/EleutherAI/pythia'
            },
            'opt': {
                name: 'OPT',
                url: 'https://github.com/facebookresearch/metaseq'
            },
            'bloom': {
                name: 'BLOOM',
                url: 'https://huggingface.co/bigscience/bloom'
            },
            'gpt-j': {
                name: 'GPT-J',
                url: 'https://github.com/kingoflolz/mesh-transformer-jax'
            },
            'stablelm': {
                name: 'StableLM',
                url: 'https://github.com/Stability-AI/StableLM'
            },
            'vicuna': {
                name: 'Vicuna',
                url: 'https://github.com/lm-sys/FastChat'
            }
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupFocusListener();
        this.updatePopularModelsCount();
        this.cleanupDuplicatesOnLoad(); // Clean up any existing duplicates
        
        // Load historic data from Firebase first, then populate models
        await this.loadHistoricDataFromFirebase();
        await this.checkAndPopulateInitialEvaluations(); // Wait for this to complete
        
        this.renderLeaderboard();
        this.checkPersistenceStatus();
        
        // Setup evidence links after DOM is ready
        setTimeout(() => {
            this.setupEvidenceLinks();
        }, 100);
    }
    
    cleanupDuplicatesOnLoad() {
        // Force cleanup of duplicates on every load
        const beforeCount = this.evaluations.length;
        this.evaluations = this.removeDuplicates(this.evaluations);
        const afterCount = this.evaluations.length;
        
        if (beforeCount > afterCount) {
            console.log(`Cleaned up ${beforeCount - afterCount} duplicate evaluations on load`);
            this.saveEvaluations();
        }
    }
    
    updatePopularModelsCount() {
        // Count models from different sources
        let evaluatedCount = 0;
        let suggestionsCount = 0;
        
        // Count models with full evaluation data
        if (typeof modelEvaluations !== 'undefined') {
            evaluatedCount = Object.keys(modelEvaluations).length;
        }
        
        // Count all models in the suggestions list (including those without full evaluations)
        const suggestionItems = document.querySelectorAll('#suggestions-content .suggestion-item');
        suggestionsCount = suggestionItems.length;
        
        // Update predefined models count (those with evaluations)
        const countElement = document.getElementById('popular-models-count');
        if (countElement) {
            countElement.textContent = evaluatedCount;
        }
        
        // Update suggestions count (all available models)
        const suggestionsCountElement = document.getElementById('suggestions-count');
        if (suggestionsCountElement) {
            // Show total suggestions count
            suggestionsCountElement.textContent = suggestionsCount || evaluatedCount;
        }
        
        console.log(`Loaded ${evaluatedCount} models with full evaluations, ${suggestionsCount} total suggestions available`);
    }
    
    setupFocusListener() {
        // Track when page loses focus
        let lastBlurTime = Date.now();
        
        // Auto-refresh when page regains focus after being away for more than 1 minute
        window.addEventListener('focus', () => {
            const awayDuration = Date.now() - lastBlurTime;
            const oneMinute = 60 * 1000;
            
            // If user was away for more than 1 minute, refresh the data
            if (awayDuration > oneMinute) {
                console.log('Page regained focus after', Math.round(awayDuration / 1000), 'seconds - refreshing data');
                
                // Reset to score sorting for auto-refresh (unless just manually evaluated)
                if (!this.justManuallyEvaluated) {
                    this.sortConfig = { column: 'totalScore', direction: 'desc' };
                }
                
                // Reload evaluations from storage (in case changed in another tab)
                this.evaluations = this.loadEvaluations();
                this.renderLeaderboard();
                
                // Update popular models count in case it changed
                this.updatePopularModelsCount();
                
                // Check and refresh URL suggestions cache if stale
                const cached = localStorage.getItem('true_suggestions_cache');
                if (cached) {
                    const data = JSON.parse(cached);
                    const ageMinutes = (Date.now() - data.timestamp) / 1000 / 60;
                    
                    // If cache is more than 60 minutes old, refresh suggestions
                    if (ageMinutes > 60) {
                        this.refreshSuggestions();
                    }
                }
                
                // Data refreshed - no notification needed
            }
        });
        
        // Track when page loses focus
        window.addEventListener('blur', () => {
            lastBlurTime = Date.now();
        });
        
        // Also refresh when tab becomes visible (handles tab switching)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const awayDuration = Date.now() - lastBlurTime;
                const fiveMinutes = 5 * 60 * 1000;
                
                // For tab switches, use a longer threshold (5 minutes)
                if (awayDuration > fiveMinutes) {
                    console.log('Tab became visible after', Math.round(awayDuration / 1000), 'seconds');
                    
                    // Reset to score sorting for auto-refresh (unless just manually evaluated)
                    if (!this.justManuallyEvaluated) {
                        this.sortConfig = { column: 'totalScore', direction: 'desc' };
                    }
                    
                    this.evaluations = this.loadEvaluations();
                    this.renderLeaderboard();
                }
            } else {
                lastBlurTime = Date.now();
            }
        });
    }
    
    generateEvaluationForModel(modelName, modelUrl) {
        // Generate realistic evaluation based on model characteristics
        const isOpenSource = modelUrl.includes('github.com') || modelUrl.includes('huggingface.co');
        const isResearchModel = modelUrl.includes('allenai') || modelUrl.includes('LLM360') || 
                               modelName.toLowerCase().includes('olmo') || modelName.toLowerCase().includes('amber');
        const isMeta = modelUrl.includes('meta-llama') || modelName.toLowerCase().includes('llama');
        const isCode = modelName.toLowerCase().includes('code') || modelName.toLowerCase().includes('coder');
        const isEnterprise = modelUrl.includes('cohere') || modelUrl.includes('anthropic') || 
                            modelUrl.includes('databricks') || modelUrl.includes('ibm');
        
        // Base scores - adjust based on model type
        let scores = {
            transparent: {
                license: { checked: isOpenSource, evidence: isOpenSource ? modelUrl : '' },
                weights: { checked: isOpenSource, evidence: isOpenSource ? modelUrl : '' },
                inference: { checked: isOpenSource, evidence: isOpenSource ? modelUrl : '' },
                training: { checked: isResearchModel || isMeta, evidence: isResearchModel || isMeta ? modelUrl : '' },
                datasets: { checked: isResearchModel, evidence: isResearchModel ? modelUrl : '' }
            },
            reproducible: {
                hardware: { checked: isResearchModel || isMeta, evidence: isResearchModel || isMeta ? modelUrl : '' },
                pipeline: { checked: isResearchModel || isMeta, evidence: isResearchModel || isMeta ? modelUrl : '' },
                checkpoints: { checked: isOpenSource, evidence: isOpenSource ? modelUrl : '' },
                cost: { checked: isResearchModel, evidence: isResearchModel ? modelUrl : '' },
                community: { checked: isOpenSource, evidence: isOpenSource ? modelUrl : '' }
            },
            understandable: {
                modelcard: { checked: isOpenSource, evidence: isOpenSource ? modelUrl : '' },
                architecture: { checked: isOpenSource || isMeta, evidence: (isOpenSource || isMeta) ? modelUrl : '' },
                provenance: { checked: isResearchModel || isMeta, evidence: (isResearchModel || isMeta) ? modelUrl : '' }
            },
            executable: {
                runnable: { checked: isOpenSource, evidence: isOpenSource ? modelUrl : '' },
                finetune: { checked: (isOpenSource && !isEnterprise) || isMeta, evidence: ((isOpenSource && !isEnterprise) || isMeta) ? modelUrl : '' }
            }
        };
        
        // Calculate total score
        let totalScore = 0;
        for (const [dimension, criteria] of Object.entries(scores)) {
            for (const [criterion, data] of Object.entries(criteria)) {
                if (data.checked) {
                    totalScore += 2; // Each criterion is worth 2 points
                }
            }
        }
        
        return {
            name: modelName,
            url: modelUrl,
            scores: scores,
            totalScore: totalScore,
            tier: this.getTier(totalScore).name,
            notes: `Auto-evaluated ${modelName} model`
        };
    }
    
    async getDynamicModelEvaluations() {
        console.log('🟢 getDynamicModelEvaluations START');

        // Get current suggestions
        const cached = localStorage.getItem('true_suggestions_cache');
        let suggestions = {};

        console.log('🟢 Cached suggestions exist:', !!cached);

        if (cached) {
            const data = JSON.parse(cached);
            suggestions = data.suggestions || {};
            console.log('🟢 Using cached suggestions, categories:', Object.keys(suggestions));
        } else {
            // Try to fetch trending models, with error handling
            console.log('🟢 No cache, fetching trending models...');
            try {
                suggestions = await this.fetchTrendingModels();
                console.log('🟢 Fetched suggestions, categories:', Object.keys(suggestions));
            } catch (error) {
                console.error('🔴 Error fetching trending models:', error);
                suggestions = {};
            }
        }

        // Convert suggestions to evaluations format
        const dynamicEvaluations = {};
        let index = 0;

        console.log('🟢 Converting suggestions to evaluations...');
        for (const [category, models] of Object.entries(suggestions)) {
            if (Array.isArray(models)) {
                console.log(`🟢 Processing category "${category}" with ${models.length} models`);
                for (const model of models) {
                    const key = `dynamic-${index++}`;
                    // Check if we already have a predefined evaluation
                    const existingEval = typeof modelEvaluations !== 'undefined' ?
                        Object.values(modelEvaluations).find(e => e.name === model.name) : null;

                    if (existingEval) {
                        dynamicEvaluations[key] = existingEval;
                    } else {
                        // Generate evaluation dynamically
                        dynamicEvaluations[key] = this.generateEvaluationForModel(model.name, model.url);
                    }
                }
            }
        }

        console.log('🟢 Dynamic evaluations created:', Object.keys(dynamicEvaluations).length);

        // If no dynamic evaluations were created (API failed and no cache), use predefined models as fallback
        if (Object.keys(dynamicEvaluations).length === 0 && typeof modelEvaluations !== 'undefined') {
            console.log('🟡 No dynamic models available, using predefined models as fallback');
            console.log('🟡 Predefined models count:', Object.keys(modelEvaluations).length);
            return modelEvaluations;
        }

        console.log(`🟢 getDynamicModelEvaluations returning ${Object.keys(dynamicEvaluations).length} models`);
        return dynamicEvaluations;
    }
    
    async validateUrl(url) {
        // Check if URL is valid and accessible
        try {
            const response = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors' // Use no-cors to avoid CORS issues but won't give us status
            });
            // With no-cors, we can't read the status but if it doesn't throw, URL is at least reachable
            return true;
        } catch (error) {
            console.warn(`URL validation failed for ${url}:`, error.message);
            return false;
        }
    }

    validateAndFixUrls(modelData) {
        // Known URL fixes for common issues
        const urlFixes = {
            'https://github.com/allenai/OLMo-2': 'https://github.com/allenai/OLMo',
            'https://huggingface.co/allenai/OLMo-2-7B': 'https://huggingface.co/allenai/OLMo-2-1124-7B',
            'https://huggingface.co/mistralai/Mistral-Large-2': 'https://huggingface.co/mistralai/Mistral-Large-Instruct-2407'
        };
        
        // Fix main URL
        if (urlFixes[modelData.url]) {
            console.log(`Fixed URL for ${modelData.name}: ${modelData.url} -> ${urlFixes[modelData.url]}`);
            modelData.url = urlFixes[modelData.url];
        }
        
        // Fix evidence URLs if present
        if (modelData.scores) {
            for (const dimension of Object.values(modelData.scores)) {
                for (const criterion of Object.values(dimension)) {
                    if (criterion.evidence && urlFixes[criterion.evidence]) {
                        console.log(`Fixed evidence URL: ${criterion.evidence} -> ${urlFixes[criterion.evidence]}`);
                        criterion.evidence = urlFixes[criterion.evidence];
                    }
                }
            }
        }
        
        return modelData;
    }

    async checkAndPopulateInitialEvaluations() {
        console.log('🔵 === START: Auto-evaluate popular models ===');

        // Step 1: Get latest popular models from HuggingFace
        const dynamicModelEvaluations = await this.getDynamicModelEvaluations();

        if (!dynamicModelEvaluations || Object.keys(dynamicModelEvaluations).length === 0) {
            console.error('🔴 No popular models available!');
            return;
        }

        console.log('🔵 Step 1: Fetched', Object.keys(dynamicModelEvaluations).length, 'popular models');

        // Step 2: Populate currentPopularModels set (for Current Run filter)
        this.currentPopularModels.clear();
        for (const modelData of Object.values(dynamicModelEvaluations)) {
            if (modelData && modelData.name) {
                this.currentPopularModels.add(this.normalizeModelName(modelData.name));
            }
        }
        console.log('🔵 Step 2: Populated currentPopularModels with', this.currentPopularModels.size, 'models');

        // Step 3: Auto-evaluate all popular models (create new or update existing)
        console.log('🔵 Step 3: Auto-evaluating popular models...');
        console.log('🔵 Existing evaluations before:', this.evaluations.length);

        const totalModels = Object.keys(dynamicModelEvaluations).length;

        // Check if model count has changed from last visit
        const lastModelCount = parseInt(localStorage.getItem('true_last_model_count') || '0');
        if (lastModelCount !== totalModels && lastModelCount > 0) {
            const diff = totalModels - lastModelCount;
            const changeText = diff > 0 ? `📈 ${diff} new models added!` : `📉 ${Math.abs(diff)} models removed`;
            // Model library updated - no notification needed
        }
        localStorage.setItem('true_last_model_count', totalModels.toString());

        let addedCount = 0;
        let updatedCount = 0;

        // Process each popular model
        console.log(`Processing ${totalModels} popular models...`);

        // Create or update evaluations for each model
        for (const [key, modelData] of Object.entries(dynamicModelEvaluations)) {
            // Validate and fix URLs before processing
            this.validateAndFixUrls(modelData);

            console.log(`Processing ${modelData.name}...`);

            // Always process model, even without scores
            const sessionId = this.getOrCreateSessionId();
            const normalizedName = this.normalizeModelName(modelData.name);
            const existingEval = this.evaluations.find(e =>
                e.modelName === normalizedName
            );

            if (modelData.scores) {
                // Model has score data
                if (existingEval) {
                    // OVERWRITE existing evaluation with new values
                    console.log(`  → Updating existing evaluation`);

                    // Collect evidence from the scores structure
                    const evidence = {};
                    for (const [dimension, criteria] of Object.entries(modelData.scores)) {
                        for (const [criterion, data] of Object.entries(criteria)) {
                            if (data.evidence) {
                                evidence[criterion] = data.evidence;
                            }
                        }
                    }

                    // Overwrite with new data
                    existingEval.scores = this.extractScoresFromModelData(modelData.scores);
                    existingEval.evidence = evidence;
                    existingEval.totalScore = modelData.totalScore;
                    existingEval.tier = modelData.tier || this.getTier(modelData.totalScore).name;
                    existingEval.timestamp = Date.now();
                    existingEval.lastModified = Date.now();
                    existingEval.autoGenerated = true;
                    existingEval.evalCount = 1; // Set to 1 for current run
                    existingEval.modelName = normalizedName; // Ensure name is normalized

                    // Set current run count to 1
                    this.currentRunCounts[normalizedName] = 1;

                    updatedCount++;
                } else {
                    // Add new evaluation
                    console.log(`  → Creating new evaluation`);

                    // Collect evidence from the scores structure
                    const evidence = {};
                    for (const [dimension, criteria] of Object.entries(modelData.scores)) {
                        for (const [criterion, data] of Object.entries(criteria)) {
                            if (data.evidence) {
                                evidence[criterion] = data.evidence;
                            }
                        }
                    }

                    // Add new evaluation
                    const normalizedName = this.normalizeModelName(modelData.name);
                    const evaluation = {
                        id: this.generateId(),
                        sessionId: sessionId,
                        modelName: normalizedName,
                        modelUrl: modelData.url,
                        scores: this.extractScoresFromModelData(modelData.scores),
                        evidence: evidence,
                        totalScore: modelData.totalScore,
                        tier: modelData.tier || this.getTier(modelData.totalScore).name,
                        notes: modelData.notes || 'Auto-evaluated by TRUE Framework',
                        timestamp: Date.now(),
                        modified: false,
                        autoGenerated: true,
                        evalCount: 1
                    };
                    this.evaluations.push(evaluation);

                    // Set current run count to 1
                    this.currentRunCounts[normalizedName] = 1;

                    addedCount++;
                }
            } else {
                // Model doesn't have scores
                console.error(`  ✗ Model has no scores data!`);

                // Create basic evaluation if it doesn't exist
                if (!existingEval) {
                    const normalizedName = this.normalizeModelName(modelData.name);
                    const evaluation = {
                        id: this.generateId(),
                        sessionId: sessionId,
                        modelName: normalizedName,
                        modelUrl: modelData.url || '',
                        scores: {},
                        evidence: {},
                        totalScore: 0,
                        tier: 'Bronze',
                        notes: 'Error: No evaluation data available',
                        timestamp: Date.now(),
                        modified: false,
                        autoGenerated: true,
                        evalCount: 1
                    };
                    this.evaluations.push(evaluation);
                    this.currentRunCounts[normalizedName] = 1;
                    addedCount++;
                }
            }
        }

        // Step 4: Save merged evaluations (to localStorage and immediately to Firebase)
        console.log('🔵 Step 4: Saving evaluations - Added:', addedCount, ', Updated:', updatedCount);
        this.saveEvaluations();

        // Force immediate upload to Firebase to prevent real-time sync from overwriting
        if (window.firebaseStorage && window.firebaseStorage.initialized) {
            console.log('🔵 Step 4a: Force uploading to Firebase immediately...');
            try {
                await window.firebaseStorage.saveEvaluations(this.evaluations);
                console.log('🔵 Step 4a: Firebase upload complete');
            } catch (error) {
                console.error('🔵 Step 4a: Firebase upload failed:', error);
            }
        }

        // Step 5: Show completion notification
        let message = `✅ Auto-evaluated ${totalModels} popular models`;
        if (addedCount > 0 && updatedCount > 0) {
            message += ` (${addedCount} new, ${updatedCount} updated)`;
        } else if (addedCount > 0) {
            message += ` (${addedCount} new)`;
        } else if (updatedCount > 0) {
            message += ` (${updatedCount} updated)`;
        }
        // Popular models auto-evaluated - no notification needed

        console.log('🔵 Step 5: Complete!');
        console.log('🔵 Final state:');
        console.log('   - Total evaluations:', this.evaluations.length);
        console.log('   - Popular models:', this.currentPopularModels.size);
        console.log('   - Current run counts:', Object.keys(this.currentRunCounts).length);

        console.log('🔵 === COMPLETE: Auto-evaluate popular models ===');
    }
    
    getOrCreateSessionId() {
        // Create a unique session ID for this page visit
        let sessionId = sessionStorage.getItem('true_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('true_session_id', sessionId);
        }
        return sessionId;
    }
    
    extractScoresFromModelData(modelScores) {
        // Convert the model-evaluations.js format to the internal format
        const scores = {};
        for (const [dimension, criteria] of Object.entries(modelScores)) {
            scores[dimension] = {};
            for (const [criterion, data] of Object.entries(criteria)) {
                scores[dimension][criterion] = data.checked || false;
            }
        }
        return scores;
    }

    setupEvidenceLinks() {
        // Add event listeners to all evidence inputs to show/hide link icons
        document.querySelectorAll('.evidence').forEach(input => {
            const wrapper = input.parentElement;
            const link = wrapper.querySelector('.evidence-link');
            
            if (!link) {
                console.warn('No evidence-link found for evidence input', input);
                return;
            }
            
            // Prevent link from being affected by other event handlers
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = link.getAttribute('href');
                if (url && url !== '#') {
                    // Let the browser handle the link naturally
                    return true;
                }
                e.preventDefault();
                return false;
            });
            
            // Function to update link visibility and href
            const updateLink = () => {
                const value = input.value.trim();
                if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
                    link.setAttribute('href', value);
                    link.style.display = 'inline-block';
                    link.title = `Open ${value}`;
                    console.log('Setting link href to:', value);
                } else {
                    link.setAttribute('href', '#');
                    link.style.display = 'none';
                }
            };
            
            // Update on input change
            input.addEventListener('input', updateLink);
            
            // Initial check
            updateLink();
        });
    }
    
    setupEventListeners() {
        // No more radio buttons - custom URL is the only option

        // Auto-analyze
        const autoBtn = document.getElementById('auto-analyze');
        if (autoBtn) {
            autoBtn.addEventListener('click', () => {
                this.autoAnalyze();
            });
        }

        // Prevent dimension panels from blocking clicks to children
        document.querySelectorAll('.dimension').forEach(dimension => {
            dimension.addEventListener('click', (e) => {
                // If clicking on the dimension background, don't block it
                if (e.target === dimension) {
                    return;
                }
                // Allow clicks to propagate to children
                e.stopPropagation();
            }, true);
        });

        // Scoring checkboxes - combine event listeners and ensure fields are enabled
        document.querySelectorAll('.criterion input[type="checkbox"]').forEach(checkbox => {
            // Make sure checkbox is enabled
            checkbox.disabled = false;
            checkbox.style.pointerEvents = 'auto';
            checkbox.removeAttribute('disabled');
            
            // Ensure clicks work
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                // Let the change event fire naturally
            }, true);
            
            checkbox.addEventListener('change', () => {
                console.log('Checkbox changed:', checkbox.dataset.criterion);
                this.updateScores();
                
                // Check if we have changes and show appropriate buttons
                if (this.detectChanges()) {
                    this.showModifiedButtons();
                } else {
                    this.hideModifiedButtons();
                }
            });
        });
        
        // Auto-save on evidence input changes (manual changes) and ensure they're enabled
        document.querySelectorAll('.criterion .evidence').forEach(input => {
            // Make sure input is enabled
            input.disabled = false;
            input.readOnly = false;
            input.style.pointerEvents = 'auto';
            input.removeAttribute('disabled');
            input.removeAttribute('readonly');
            
            // Ensure clicks work
            input.addEventListener('click', (e) => {
                e.stopPropagation();
                input.focus();
            }, true);
            
            input.addEventListener('focus', (e) => {
                console.log('Evidence field focused');
            });
            
            input.addEventListener('input', this.debounce(() => {
                console.log('Evidence field changed');
                
                // Check if we have changes and show appropriate buttons
                if (this.detectChanges()) {
                    this.showModifiedButtons();
                } else {
                    this.hideModifiedButtons();
                }
            }, 500)); // Check after 0.5 second of no typing
        });
        
        // Auto-save on notes change (manual changes)
        const notesField = document.getElementById('notes');
        if (notesField) {
            notesField.addEventListener('input', this.debounce(() => {
                console.log('Notes field changed');
                
                // Check if we have changes and show appropriate buttons
                if (this.detectChanges()) {
                    this.showModifiedButtons();
                } else {
                    this.hideModifiedButtons();
                }
            }, 500));
        }

        // Export evaluation
        const exportBtn = document.getElementById('export-evaluation');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportEvaluation();
            });
        }

        // New evaluation
        const newBtn = document.getElementById('new-evaluation');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                this.resetEvaluation();
            });
        }

        // Filters
        const tierFilter = document.getElementById('tier-filter');
        if (tierFilter) {
            tierFilter.addEventListener('change', () => {
                this.renderLeaderboard();
            });
        }

        const searchFilter = document.getElementById('search-filter');
        if (searchFilter) {
            searchFilter.addEventListener('input', () => {
                this.renderLeaderboard();
            });
        }
        
        // Eval view toggle (Current Run vs Historic)
        const currentRunView = document.getElementById('current-run-view');
        const historicView = document.getElementById('historic-view');
        if (currentRunView && historicView) {
            currentRunView.addEventListener('change', () => {
                this.evalViewMode = 'current';
                this.renderLeaderboard();
            });
            historicView.addEventListener('change', () => {
                this.evalViewMode = 'historic';
                this.renderLeaderboard();
            });
        }

        // Persistence options
        const gformsBtn = document.getElementById('setup-gforms');
        if (gformsBtn) {
            gformsBtn.addEventListener('click', () => {
                this.setupGoogleForms();
            });
        }

        const exportAllBtn = document.getElementById('export-all');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => {
                this.exportAllData();
            });
        }

        const importBtn = document.getElementById('import-data');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.importData();
            });
        }
        
        // Firebase setup
        const setupFirebaseBtn = document.getElementById('setup-firebase');
        if (setupFirebaseBtn) {
            setupFirebaseBtn.addEventListener('click', () => {
                this.setupFirebase();
            });
        }
        
        const toggleSyncBtn = document.getElementById('toggle-sync');
        if (toggleSyncBtn) {
            toggleSyncBtn.addEventListener('click', () => {
                this.toggleFirebaseSync();
            });
        }
        
        // Check for existing Firebase config
        this.checkFirebaseConfig();
        
        // Also check after a delay to ensure everything is loaded
        setTimeout(() => {
            this.checkFirebaseConfig();
            this.forceUpdateFirebaseUI();
        }, 2000);

        // URL suggestions functionality
        this.setupUrlSuggestions();

        // Setup column resizing
        this.setupColumnResize();
    }

    setupColumnResize() {
        // Add resize functionality to the Model column (2nd column)
        const modelHeader = document.querySelector('#leaderboard th:nth-child(2)');
        if (!modelHeader) return;

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'column-resize-handle';
        modelHeader.style.position = 'relative';
        modelHeader.appendChild(resizeHandle);

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.pageX;
            startWidth = modelHeader.offsetWidth;

            // Prevent text selection while resizing
            e.preventDefault();
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const diff = e.pageX - startX;
            const newWidth = Math.max(100, startWidth + diff); // Minimum 100px
            modelHeader.style.width = newWidth + 'px';

            // Also update the corresponding body column
            const bodyTable = document.querySelector('#leaderboard-body-table');
            if (bodyTable) {
                const bodyCells = bodyTable.querySelectorAll('td:nth-child(2)');
                bodyCells.forEach(cell => {
                    cell.style.width = newWidth + 'px';
                });
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';

                // Save the width to localStorage
                const width = modelHeader.offsetWidth;
                localStorage.setItem('true_model_column_width', width);
            }
        });

        // Restore saved width on page load
        const savedWidth = localStorage.getItem('true_model_column_width');
        if (savedWidth) {
            modelHeader.style.width = savedWidth + 'px';
            const bodyTable = document.querySelector('#leaderboard-body-table');
            if (bodyTable) {
                const bodyCells = bodyTable.querySelectorAll('td:nth-child(2)');
                bodyCells.forEach(cell => {
                    cell.style.width = savedWidth + 'px';
                });
            }
        }
    }

    setupUrlSuggestions() {
        // Setup refresh button
        const refreshBtn = document.getElementById('refresh-suggestions');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshSuggestions();
            });
        }
        
        // Check if we have cached data and show last update time
        this.checkCachedSuggestions();
        
        // Handle clicking on suggestion items
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const url = e.target.dataset.url;
                const displayName = e.target.textContent;
                const urlInput = document.getElementById('model-url');
                if (urlInput && url) {
                    urlInput.value = url;
                    // Store the display name for later use
                    urlInput.dataset.displayName = displayName;

                    // Mark that we just selected to prevent re-opening
                    if (urlInput.markJustSelected) {
                        urlInput.markJustSelected();
                    }

                    // Force hide suggestions after selection
                    const suggestionsBox = document.getElementById('url-suggestions');
                    if (suggestionsBox) {
                        suggestionsBox.classList.remove('show');
                        suggestionsBox.style.display = 'none';

                        // Reset display after a moment to allow CSS control again
                        setTimeout(() => {
                            suggestionsBox.style.display = '';
                        }, 100);
                    }

                    // Show notification
                    // Model selection - no notification needed

                    // Remove focus from input to prevent re-opening
                    urlInput.blur();

                    // Automatically trigger evaluation
                    setTimeout(() => {
                        this.autoAnalyze();
                    }, 150);
                }
            });
        });
        
        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            const container = document.querySelector('.url-input-container');
            const suggestionsBox = document.getElementById('url-suggestions');
            
            // Close if click is outside the container AND outside the suggestions box
            if (suggestionsBox && container && 
                !container.contains(e.target) && 
                !suggestionsBox.contains(e.target)) {
                suggestionsBox.classList.remove('show');
            }
        });
        
        // Show suggestions when input is clicked
        const urlInput = document.getElementById('model-url');
        if (urlInput) {
            // Track if we just selected from dropdown
            let justSelected = false;
            
            // Show on click only if we didn't just select
            urlInput.addEventListener('click', (e) => {
                if (justSelected) {
                    justSelected = false;
                    return;
                }
                e.stopPropagation(); // Prevent immediate close
                const suggestionsBox = document.getElementById('url-suggestions');
                if (suggestionsBox && !suggestionsBox.classList.contains('show')) {
                    suggestionsBox.classList.add('show');
                }
            });
            
            // Hide popup when user types (manual entry)
            urlInput.addEventListener('input', (e) => {
                const suggestionsBox = document.getElementById('url-suggestions');
                if (suggestionsBox && suggestionsBox.classList.contains('show')) {
                    // Only hide if user is actually typing, not if value was set programmatically
                    if (e.inputType && e.inputType.startsWith('insert')) {
                        suggestionsBox.classList.remove('show');
                    }
                }
            });
            
            // Hide popup on focus out
            urlInput.addEventListener('blur', (e) => {
                // Small delay to allow click on suggestion items
                setTimeout(() => {
                    const suggestionsBox = document.getElementById('url-suggestions');
                    if (suggestionsBox) {
                        suggestionsBox.classList.remove('show');
                    }
                }, 200);
            });
            
            // Set flag when we select from dropdown
            urlInput.markJustSelected = () => {
                justSelected = true;
                setTimeout(() => { justSelected = false; }, 500);
            };
        }
    }

    // Removed startEvaluation() - no longer needed, only using autoAnalyze()

    // Removed applyPreEvaluatedScores() - no longer needed with simplified flow
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    autoSaveEvaluation(isManualChange = false) {
        if (!this.currentEvaluation) return;
        
        // If this is a manual change, mark as modified
        if (isManualChange && !this.currentEvaluation.modified) {
            this.currentEvaluation.modified = true;
            this.currentEvaluation.modifiedDate = Date.now();
            if (!this.currentEvaluation.modificationHistory) {
                this.currentEvaluation.modificationHistory = [];
            }
            this.currentEvaluation.modificationHistory.push({
                timestamp: Date.now(),
                type: 'manual_edit'
            });
            
            // When user manually edits, switch to date sorting to show their work
            this.justManuallyEvaluated = true;
            this.sortConfig = { column: 'date', direction: 'desc' };
        }
        
        // Collect current state
        const evaluation = {
            ...this.currentEvaluation,
            scores: this.collectScores(),
            evidence: this.collectEvidence(),
            notes: document.getElementById('notes').value || '',
            totalScore: parseInt(document.getElementById('total-score').textContent) || 0,
            tier: this.getTier(parseInt(document.getElementById('total-score').textContent) || 0).name,
            timestamp: this.currentEvaluation.timestamp ? 
                (typeof this.currentEvaluation.timestamp === 'string' ? 
                    new Date(this.currentEvaluation.timestamp).getTime() : 
                    this.currentEvaluation.timestamp) : 
                Date.now(),
            lastModified: Date.now(),
            // Explicitly preserve evalCount
            evalCount: this.currentEvaluation.evalCount || 1
        };
        
        // Check if this evaluation already exists by ID
        const existingIndex = this.evaluations.findIndex(e => e.id === evaluation.id);
        
        if (existingIndex !== -1) {
            // Update existing evaluation, preserving evalCount if not set
            if (!evaluation.evalCount && this.evaluations[existingIndex].evalCount) {
                evaluation.evalCount = this.evaluations[existingIndex].evalCount;
            }
            this.evaluations[existingIndex] = evaluation;
        } else {
            // Check if there's already an evaluation for this model
            const duplicateIndex = this.evaluations.findIndex(e => 
                e.modelName.toLowerCase() === evaluation.modelName.toLowerCase() && 
                e.id !== evaluation.id
            );
            
            if (duplicateIndex !== -1) {
                // Update the existing evaluation for this model and increment count
                evaluation.id = this.evaluations[duplicateIndex].id;
                evaluation.evalCount = (this.evaluations[duplicateIndex].evalCount || 1) + 1;
                this.evaluations[duplicateIndex] = evaluation;
            } else {
                // Add new evaluation with initial count
                if (!evaluation.evalCount) {
                    evaluation.evalCount = 1;
                }
                this.evaluations.push(evaluation);
            }
        }
        
        // Add to current run tracking if it's a new manual evaluation
        if (evaluation.modelName) {
            // Add to current popular models set so it shows in current run
            this.currentPopularModels.add(evaluation.modelName);
            
            // Track current run count for manual eval
            if (isManualChange) {
                this.currentRunCounts[evaluation.modelName] = evaluation.evalCount || 1;
            }
        }
        
        // Save to localStorage
        this.saveEvaluations();

        // Update leaderboard
        this.renderLeaderboard();
    }
    
    showNotification(message, type = 'info', duration = null) {
        const notification = document.createElement('div');
        
        // Set background color based on type
        let backgroundColor = '#10b981'; // default green for info
        if (type === 'success') backgroundColor = '#10b981';
        if (type === 'warning') backgroundColor = '#f59e0b';
        if (type === 'error') backgroundColor = '#ef4444';
        if (type === 'info') backgroundColor = '#3b82f6';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 500;
            max-width: 400px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Use custom duration if provided, otherwise use defaults
        const displayTime = duration !== null ? duration : (type === 'success' ? 4000 : 3000);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, displayTime);
    }

    // Normalize model name to consistent case format
    // This ensures "Mistral-7B", "mistral-7b", "MISTRAL-7B" are all treated as the same model
    normalizeModelName(modelName) {
        if (!modelName) return '';

        // Trim whitespace and convert to lowercase for storage
        // We use lowercase as the canonical format for all model names
        return modelName.trim().toLowerCase();
    }

    extractModelNameFromUrl(url) {
        // If it's not a URL, use it as the model name directly
        if (!url.includes('://') && !url.includes('/')) {
            return this.normalizeModelName(url);
        }

        // Extract model name from GitHub or HuggingFace URL
        const parts = url.split('/');
        const name = parts[parts.length - 1] || 'Custom Model';
        return this.normalizeModelName(name);
    }

    async autoAnalyze() {
        const urlInput = document.getElementById('model-url');
        const url = urlInput?.value;
        if (!url) {
            this.showNotification('Please enter a URL first', 'warning');
            return;
        }

        // Show loading state
        const button = document.getElementById('auto-analyze');
        const originalText = button.textContent;
        button.textContent = 'Analyzing...';
        button.disabled = true;

        try {
            
            // First, start the evaluation to show the scoring section
            // Use display name if available (from dropdown selection), otherwise extract from URL
            const displayName = urlInput.dataset.displayName;
            const modelName = displayName ? this.normalizeModelName(displayName) : this.extractModelNameFromUrl(url);

            // Clear the display name after using it
            if (displayName) {
                delete urlInput.dataset.displayName;
            }
            
            // Check if this model already exists in evaluations
            const existingEval = this.evaluations.find(e => e.modelUrl === url);
            
            if (existingEval) {
                // Re-evaluating existing model - use same ID but update timestamp
                this.currentEvaluation = {
                    id: existingEval.id, // Keep same ID to update rather than duplicate
                    modelName,
                    modelUrl: url,
                    timestamp: Date.now(), // Update to current time for re-evaluation
                    modified: false, // Reset modified flag since it's being re-evaluated
                    modifiedDate: null, // Clear modification date
                    modificationHistory: existingEval.modificationHistory || [],
                    evalCount: (existingEval.evalCount || 0) + 1, // Increment eval count
                    previousTimestamp: existingEval.timestamp // Store previous timestamp for reference
                };
                
                // Track current run count for manual eval - use incremented evalCount
                this.currentRunCounts[modelName] = (existingEval.evalCount || 0) + 1;
                // Add to current popular models so it shows in current run
                this.currentPopularModels.add(modelName);
                
                // Re-evaluating - no notification needed
            } else {
                // New model evaluation
                this.currentEvaluation = {
                    id: this.generateId(),
                    modelName,
                    modelUrl: url,
                    timestamp: Date.now(),
                    modified: false,
                    modificationHistory: [],
                    evalCount: 1 // Initialize evaluation count
                };
                
                // Track current run count for new manual eval
                this.currentRunCounts[modelName] = 1;
                // Add to current popular models so it shows in current run
                this.currentPopularModels.add(modelName);
            }

            document.getElementById('eval-model-name').textContent = modelName;
            document.getElementById('evaluation-section').style.display = 'none';
            document.getElementById('scoring-section').style.display = 'block';
            
            // Perform analysis
            await this.analyzeRepository(url);
            
            // Ensure all fields are interactive after showing scoring section
            setTimeout(() => {
                this.enableScoringFields();
                console.log('Scoring fields enabled after auto-analyze');
            }, 100);
            
            // After manual evaluation starts, switch to date sorting to show latest first
            this.justManuallyEvaluated = true;
            this.sortConfig = { column: 'date', direction: 'desc' };
            this.renderLeaderboard(); // Immediately update leaderboard with new sort
            this.updateSortIndicators(); // Update column headers to show date sort

            // Trigger first auto-save to show in leaderboard
            this.autoSaveEvaluation(false);
            
            // Ensure all fields are editable after auto-analyze
            this.enableScoringFields();
            
            // Capture original state after loading the evaluation
            setTimeout(() => {
                this.captureOriginalState();
            }, 200);
            
            // Scroll to scoring section
            document.getElementById('scoring-section').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Analysis failed:', error);
            // Analysis completed - no notification needed
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async analyzeRepository(url) {
        // Clear previous selections
        document.querySelectorAll('.criterion input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.criterion .evidence').forEach(input => {
            input.value = '';
            input.style.borderColor = '';
            input.style.fontStyle = '';
        });
        
        // Pattern-based analysis based on URL
        const analysis = {
            transparent: {},
            reproducible: {},
            understandable: {},
            executable: {}
        };
        
        const urlLower = url.toLowerCase();
        
        // Check for known platforms and patterns
        if (urlLower.includes('huggingface.co')) {
            // HuggingFace models typically have these
            analysis.transparent.license = { checked: true, evidence: url + '/blob/main/LICENSE' };
            analysis.transparent.weights = { checked: true, evidence: url + '/tree/main' };
            analysis.transparent.inference = { checked: true, evidence: url + '#how-to-use' };
            analysis.understandable.modelcard = { checked: true, evidence: url };
            analysis.executable.runnable = { checked: true, evidence: url + '#how-to-use' };
            
            // Check model name for additional hints
            if (urlLower.includes('gemma')) {
                analysis.understandable.architecture = { checked: true, evidence: 'https://ai.google.dev/gemma/docs' };
                // Detected Gemma model
            } else if (urlLower.includes('qwen')) {
                analysis.transparent.training = { checked: true, evidence: 'https://github.com/QwenLM/Qwen' };
                // Detected Qwen model
            }
        } else if (urlLower.includes('github.com')) {
            // GitHub repositories
            analysis.transparent.license = { checked: true, evidence: url + '/blob/main/LICENSE' };
            analysis.transparent.inference = { checked: true, evidence: url };
            analysis.understandable.modelcard = { checked: true, evidence: url + '/blob/main/README.md' };
            
            // Check for specific organizations
            if (urlLower.includes('/google-deepmind/')) {
                analysis.transparent.weights = { checked: true, evidence: 'Check HuggingFace for weights' };
                // Detected DeepMind repository
            } else if (urlLower.includes('/microsoft/')) {
                analysis.executable.runnable = { checked: true, evidence: url + '#getting-started' };
                // Detected Microsoft repository
            } else if (urlLower.includes('/meta') || urlLower.includes('/facebook')) {
                analysis.transparent.weights = { checked: true, evidence: 'Check HuggingFace for weights' };
                // Detected Meta/Facebook repository
            }
        }
        
        // Apply the analysis results
        for (const [dimension, criteria] of Object.entries(analysis)) {
            for (const [criterion, data] of Object.entries(criteria)) {
                const container = document.querySelector(`[data-dimension="${dimension}"]`);
                if (!container) continue;
                
                const checkbox = container.querySelector(`[data-criterion="${criterion}"]`);
                const evidenceField = container.querySelector(`[data-criterion="${criterion}"]`)
                    ?.closest('.criterion')?.querySelector('.evidence');
                
                if (checkbox && data.checked) {
                    checkbox.checked = true;
                }
                
                if (evidenceField && data.evidence) {
                    evidenceField.value = data.evidence;
                    if (data.evidence.startsWith('http')) {
                        evidenceField.style.borderColor = '#10b981';
                    } else {
                        evidenceField.style.borderColor = '#f59e0b';
                        evidenceField.style.fontStyle = 'italic';
                    }
                }
            }
        }
        
        this.updateScores();
        
        // Setup evidence links for the newly populated URLs
        // Use setTimeout to ensure DOM updates are complete
        setTimeout(() => {
            this.setupEvidenceLinks();
        }, 100);
        
        // Auto-save the auto-analyzed results (not manual change)
        this.autoSaveEvaluation(false);
        
        // Show analysis complete message
        const checkedCount = document.querySelectorAll('.criterion input[type="checkbox"]:checked').length;
        // Auto-analysis complete - no notification needed
        
        return analysis;
    }

    updateScores() {
        const dimensions = ['transparent', 'reproducible', 'understandable', 'executable'];
        let totalScore = 0;

        dimensions.forEach(dimension => {
            const container = document.querySelector(`[data-dimension="${dimension}"]`);
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            let dimensionScore = 0;

            checkboxes.forEach(checkbox => {
                dimensionScore += parseInt(checkbox.dataset.points);
            });

            container.querySelector('.score').textContent = dimensionScore;
            totalScore += dimensionScore;
        });

        document.getElementById('total-score').textContent = totalScore;
        
        // Update tier badge
        const tier = this.getTier(totalScore);
        const badge = document.getElementById('tier-badge');
        badge.className = `tier-badge ${tier.name.toLowerCase()}`;
        badge.querySelector('.tier-name').textContent = tier.name;
        badge.querySelector('.tier-desc').textContent = tier.description;
    }

    getTier(score) {
        if (score >= 28) return { name: 'Platinum', description: 'Fully open and reproducible' };
        if (score >= 21) return { name: 'Gold', description: 'Strong openness, minor gaps' };
        if (score >= 11) return { name: 'Silver', description: 'Some transparency, low reproducibility' };
        return { name: 'Bronze', description: 'Minimal openness' };
    }

    saveEvaluation() {
        if (!this.currentEvaluation) return;

        // Collect scores and evidence
        const evaluation = {
            ...this.currentEvaluation,
            scores: this.collectScores(),
            evidence: this.collectEvidence(),
            notes: document.getElementById('notes').value,
            totalScore: parseInt(document.getElementById('total-score').textContent),
            tier: this.getTier(parseInt(document.getElementById('total-score').textContent)).name
        };

        // Check if this is editing an existing evaluation
        if (this.currentEvaluation.id) {
            const existingIndex = this.evaluations.findIndex(e => e.id === this.currentEvaluation.id);
            if (existingIndex !== -1) {
                // Mark as modified and track modification date
                evaluation.modified = true;
                evaluation.modifiedDate = new Date().toISOString();
                
                // Track modification history
                if (!evaluation.modificationHistory) {
                    evaluation.modificationHistory = [];
                }
                evaluation.modificationHistory.push({
                    timestamp: new Date().toISOString(),
                    previousScore: this.evaluations[existingIndex].totalScore
                });
                
                // Replace the existing evaluation
                this.evaluations[existingIndex] = evaluation;
            } else {
                // Check for duplicate model name
                const duplicateIndex = this.evaluations.findIndex(e => 
                    e.modelName.toLowerCase() === evaluation.modelName.toLowerCase()
                );
                
                if (duplicateIndex !== -1) {
                    // Update existing evaluation for this model and increment count
                    evaluation.id = this.evaluations[duplicateIndex].id;
                    evaluation.evalCount = (this.evaluations[duplicateIndex].evalCount || 1) + 1;
                    this.evaluations[duplicateIndex] = evaluation;
                } else {
                    // New evaluation with initial count
                    if (!evaluation.evalCount) {
                        evaluation.evalCount = 1;
                    }
                    this.evaluations.push(evaluation);
                }
            }
        } else {
            // Check for duplicate model name
            const duplicateIndex = this.evaluations.findIndex(e => 
                e.modelName.toLowerCase() === evaluation.modelName.toLowerCase()
            );
            
            if (duplicateIndex !== -1) {
                // Update existing evaluation for this model and increment count
                evaluation.id = this.evaluations[duplicateIndex].id;
                evaluation.evalCount = (this.evaluations[duplicateIndex].evalCount || 1) + 1;
                evaluation.modified = true;
                evaluation.modifiedDate = new Date().toISOString();
                this.evaluations[duplicateIndex] = evaluation;
                // Updated existing evaluation - no notification needed
            } else {
                // Completely new evaluation with initial count
                if (!evaluation.evalCount) {
                    evaluation.evalCount = 1;
                }
                this.evaluations.push(evaluation);
            }
        }
        
        this.saveEvaluations();

        // Optional: Send to Google Forms
        if (this.isGoogleFormsEnabled()) {
            this.submitToGoogleForms(evaluation);
        }

        // After manual evaluation, switch to date sorting to show latest first
        this.justManuallyEvaluated = true;
        this.sortConfig = { column: 'date', direction: 'desc' };
        
        // Evaluation saved - no notification needed
        this.renderLeaderboard();
        this.resetEvaluation();
        
        // Scroll back to top for new evaluation
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    collectScores() {
        const scores = {};
        const dimensions = ['transparent', 'reproducible', 'understandable', 'executable'];
        
        dimensions.forEach(dimension => {
            const container = document.querySelector(`[data-dimension="${dimension}"]`);
            const criteria = {};
            
            container.querySelectorAll('.criterion').forEach(criterion => {
                const checkbox = criterion.querySelector('input[type="checkbox"]');
                const criterionName = checkbox.dataset.criterion;
                criteria[criterionName] = checkbox.checked;
            });
            
            scores[dimension] = criteria;
        });
        
        return scores;
    }

    collectEvidence() {
        const evidence = {};
        
        document.querySelectorAll('.criterion').forEach(criterion => {
            const checkbox = criterion.querySelector('input[type="checkbox"]');
            const evidenceInput = criterion.querySelector('.evidence');
            const criterionName = checkbox.dataset.criterion;
            
            if (evidenceInput.value) {
                evidence[criterionName] = evidenceInput.value;
            }
        });
        
        return evidence;
    }

    exportEvaluation() {
        if (!this.currentEvaluation) {
            this.showNotification('No evaluation to export', 'warning');
            return;
        }

        const evaluation = {
            ...this.currentEvaluation,
            scores: this.collectScores(),
            evidence: this.collectEvidence(),
            notes: document.getElementById('notes').value,
            totalScore: parseInt(document.getElementById('total-score').textContent),
            tier: this.getTier(parseInt(document.getElementById('total-score').textContent)).name
        };

        const dataStr = JSON.stringify(evaluation, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `true-evaluation-${evaluation.modelName}-${Date.now()}.json`;
        link.click();
        
        // Evaluation exported - no notification needed
    }

    captureOriginalState() {
        // Capture the current state as the original state for comparison
        if (!this.currentEvaluation) return;
        
        this.originalEvaluationState = {
            modelName: this.currentEvaluation.modelName,
            modelUrl: this.currentEvaluation.modelUrl,
            scores: JSON.parse(JSON.stringify(this.collectScores())),
            evidence: JSON.parse(JSON.stringify(this.collectEvidence())),
            notes: document.getElementById('notes')?.value || ''
        };
        console.log('Original state captured');
    }
    
    detectChanges() {
        // Compare current state with original state
        if (!this.originalEvaluationState || !this.currentEvaluation) return false;
        
        const currentState = {
            modelName: this.currentEvaluation.modelName,
            modelUrl: this.currentEvaluation.modelUrl,
            scores: this.collectScores(),
            evidence: this.collectEvidence(),
            notes: document.getElementById('notes')?.value || ''
        };
        
        // Deep comparison
        const hasChanges = 
            JSON.stringify(currentState.scores) !== JSON.stringify(this.originalEvaluationState.scores) ||
            JSON.stringify(currentState.evidence) !== JSON.stringify(this.originalEvaluationState.evidence) ||
            currentState.notes !== this.originalEvaluationState.notes;
        
        return hasChanges;
    }
    
    showModifiedButtons() {
        // Show Save/Cancel buttons, hide normal buttons
        const normalButtons = document.getElementById('action-buttons-normal');
        const modifiedButtons = document.getElementById('action-buttons-modified');
        
        if (normalButtons) normalButtons.style.display = 'none';
        if (modifiedButtons) modifiedButtons.style.display = 'flex';
        
        this.hasUnsavedChanges = true;
    }
    
    hideModifiedButtons() {
        // Hide Save/Cancel buttons, show normal buttons
        const normalButtons = document.getElementById('action-buttons-normal');
        const modifiedButtons = document.getElementById('action-buttons-modified');
        
        if (normalButtons) normalButtons.style.display = 'flex';
        if (modifiedButtons) modifiedButtons.style.display = 'none';
        
        this.hasUnsavedChanges = false;
    }
    
    enableScoringFields() {
        // Helper function to enable all scoring fields
        console.log('Enabling all scoring fields');
        
        // Enable ALL checkboxes in the entire scoring section
        const checkboxes = document.querySelectorAll('#scoring-section input[type="checkbox"]');
        console.log(`Found ${checkboxes.length} checkboxes to enable`);
        checkboxes.forEach((cb, index) => {
            // Force enable with all methods
            cb.disabled = false;
            cb.removeAttribute('disabled');
            cb.style.cursor = 'pointer';
            cb.style.pointerEvents = 'auto';
            cb.style.opacity = '1';
            
            // Make sure parent label is also clickable
            const label = cb.closest('label');
            if (label) {
                label.style.pointerEvents = 'auto';
                label.style.cursor = 'pointer';
                label.style.opacity = '1';
            }
            
            console.log(`Checkbox ${index} enabled:`, cb.dataset.criterion, 'disabled=', cb.disabled);
        });
        
        // Enable ALL text inputs with class 'evidence'
        const evidenceInputs = document.querySelectorAll('#scoring-section input.evidence');
        console.log(`Found ${evidenceInputs.length} evidence inputs to enable`);
        evidenceInputs.forEach((input, index) => {
            // Force enable with all methods
            input.disabled = false;
            input.readOnly = false;
            input.removeAttribute('disabled');
            input.removeAttribute('readonly');
            input.style.cursor = 'text';
            input.style.pointerEvents = 'auto';
            input.style.opacity = '1';
            input.style.background = 'white';
            
            console.log(`Evidence input ${index} enabled, disabled=`, input.disabled, 'readonly=', input.readOnly);
        });
        
        // Also check for any text inputs without the evidence class
        const allTextInputs = document.querySelectorAll('#scoring-section input[type="text"]');
        console.log(`Found ${allTextInputs.length} total text inputs`);
        allTextInputs.forEach(input => {
            // Skip model name and URL inputs
            if (input.id !== 'eval-model-name-input' && input.id !== 'eval-model-url-input') {
                input.disabled = false;
                input.readOnly = false;
                input.removeAttribute('disabled');
                input.removeAttribute('readonly');
                input.style.cursor = 'text';
                input.style.pointerEvents = 'auto';
                input.style.opacity = '1';
            }
        });
        
        // Enable notes field
        const notesField = document.getElementById('notes');
        if (notesField) {
            notesField.disabled = false;
            notesField.readOnly = false;
            notesField.removeAttribute('disabled');
            notesField.removeAttribute('readonly');
            notesField.style.cursor = 'text';
            notesField.style.pointerEvents = 'auto';
            notesField.style.opacity = '1';
            console.log('Notes field enabled, disabled=', notesField.disabled, 'readonly=', notesField.readOnly);
        }
        
        // Force a reflow to ensure changes are applied
        document.getElementById('scoring-section').offsetHeight;
    }
    
    toggleScoringEditMode() {
        console.log('Edit mode activated');
        this.scoringEditMode = true;
        
        // Store original values for cancel
        this.scoringOriginalValues = {
            modelName: this.currentEvaluation.modelName,
            modelUrl: this.currentEvaluation.modelUrl,
            scores: JSON.parse(JSON.stringify(this.collectScores())),
            evidence: JSON.parse(JSON.stringify(this.collectEvidence())),
            notes: document.getElementById('notes').value || ''
        };
        
        // Show editable fields
        const nameSpan = document.getElementById('eval-model-name');
        const nameInput = document.getElementById('eval-model-name-input');
        const urlWrapper = document.getElementById('eval-model-url-wrapper');
        const urlInput = document.getElementById('eval-model-url-input');
        
        // Hide span, show input for name
        nameSpan.style.display = 'none';
        nameInput.style.display = 'inline-block';
        nameInput.value = this.currentEvaluation.modelName;
        
        // Show URL input
        urlWrapper.style.display = 'block';
        urlInput.value = this.currentEvaluation.modelUrl || '';
        
        // Enable all scoring fields for editing
        this.enableScoringFields();
        
        // Toggle button groups
        document.getElementById('action-buttons-normal').style.display = 'none';
        document.getElementById('action-buttons-edit').style.display = 'flex';
        
        // Update tip
        const tipDiv = document.getElementById('scoring-tip');
        if (tipDiv) {
            tipDiv.style.background = '#fef3c7';
            tipDiv.style.borderLeftColor = '#f59e0b';
            tipDiv.innerHTML = `
                <p style="margin: 0; color: #92400e;">
                    <strong>✏️ Edit Mode:</strong> All fields are now editable. Changes will be marked as modified when saved.
                </p>
            `;
        }
    }
    
    saveScoringChanges() {
        if (!this.currentEvaluation) return;
        
        // Save the current state and update the original state
        this.autoSaveEvaluation();
        
        // Capture new original state
        this.captureOriginalState();
        
        // Hide the save/cancel buttons
        this.hideModifiedButtons();
        
        // Changes saved - no notification needed
    }
    
    cancelScoringChanges() {
        if (!this.originalEvaluationState) return;
        
        // Restore scores (checkboxes)
        if (this.originalEvaluationState.scores) {
            document.querySelectorAll('.criterion input[type="checkbox"]').forEach(cb => {
                const dimension = cb.closest('[data-dimension]').dataset.dimension;
                const criterion = cb.dataset.criterion;
                cb.checked = this.originalEvaluationState.scores[dimension]?.[criterion] || false;
            });
        }
        
        // Restore evidence
        if (this.originalEvaluationState.evidence) {
            document.querySelectorAll('.criterion').forEach(criterionDiv => {
                const checkbox = criterionDiv.querySelector('input[type="checkbox"]');
                const evidenceInput = criterionDiv.querySelector('.evidence');
                if (checkbox && evidenceInput) {
                    const criterionName = checkbox.dataset.criterion;
                    const dimension = checkbox.closest('[data-dimension]').dataset.dimension;
                    const originalEvidence = this.originalEvaluationState.evidence[dimension]?.[criterionName] || '';
                    evidenceInput.value = originalEvidence;
                }
            });
        }
        
        // Restore notes
        const notesField = document.getElementById('notes');
        if (notesField && this.originalEvaluationState.notes !== undefined) {
            notesField.value = this.originalEvaluationState.notes;
        }
        
        // Update scores display
        this.updateScores();
        
        // Hide the save/cancel buttons
        this.hideModifiedButtons();
        
        // Changes canceled - no notification needed
    }
    
    exitScoringEditMode() {
        this.scoringEditMode = false;
        
        // Hide editable fields
        const nameSpan = document.getElementById('eval-model-name');
        const nameInput = document.getElementById('eval-model-name-input');
        const urlWrapper = document.getElementById('eval-model-url-wrapper');
        
        // Show span, hide input for name
        if (nameSpan) nameSpan.style.display = 'inline';
        if (nameInput) nameInput.style.display = 'none';
        
        // Hide URL input
        if (urlWrapper) urlWrapper.style.display = 'none';
        
        // Keep fields enabled for auto-save to work (fields are always editable in normal mode)
        this.enableScoringFields();
        
        // Toggle button groups
        const normalButtons = document.getElementById('action-buttons-normal');
        const editButtons = document.getElementById('action-buttons-edit');
        if (normalButtons) normalButtons.style.display = 'flex';
        if (editButtons) editButtons.style.display = 'none';
        
        // Hide tip message
        const tipDiv = document.getElementById('scoring-tip');
        if (tipDiv) {
            tipDiv.style.display = 'none';
        }
    }
    
    resetEvaluation() {
        // Clear editing state
        this.isEditingExisting = false;
        this.editingEvaluationId = null;
        this.currentEvaluation = null;
        
        // Reset button text
        const newEvalBtn = document.getElementById('new-evaluation');
        if (newEvalBtn) {
            newEvalBtn.innerHTML = '🔄 Close / Start New';
            newEvalBtn.style.background = '';
            newEvalBtn.style.color = '';
        }
        
        document.getElementById('evaluation-section').style.display = 'block';
        document.getElementById('scoring-section').style.display = 'none';
        
        // Reset form
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.evidence').forEach(input => input.value = '');
        const notesElement = document.getElementById('notes');
        if (notesElement) notesElement.value = '';
        const modelSelectElement = document.getElementById('model-select');
        if (modelSelectElement) modelSelectElement.value = '';
        const modelUrlElement = document.getElementById('model-url');
        if (modelUrlElement) modelUrlElement.value = '';
        
        this.updateScores();
    }

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        const tierFilter = document.getElementById('tier-filter').value;
        const searchFilter = document.getElementById('search-filter').value.toLowerCase();

        console.log('🟠 renderLeaderboard called');
        console.log('🟠 View mode:', this.evalViewMode);
        console.log('🟠 Total evaluations:', this.evaluations.length);
        console.log('🟠 Sort config:', this.sortConfig);
        console.log('🟠 Popular models set size:', this.currentPopularModels.size);
        console.log('🟠 Popular models:', Array.from(this.currentPopularModels).slice(0, 5));

        // Safety check: Deduplicate before rendering to prevent display issues
        const beforeDedup = this.evaluations.length;
        this.evaluations = this.removeDuplicates(this.evaluations);
        const afterDedup = this.evaluations.length;

        if (beforeDedup > afterDedup) {
            console.log(`⚠️ Removed ${beforeDedup - afterDedup} duplicates during render - saving cleaned data`);
            this.saveEvaluations();
        }

        // Calculate evaluation counts for each model
        const evalCounts = this.getEvaluationCounts();
        
        // Filter evaluations
        let filtered = this.evaluations.filter(e => {
            // For Current Run view, only show models that are in the current popular list
            if (this.evalViewMode === 'current') {
                // Check if this model is in the current popular models set
                const isInPopular = this.currentPopularModels.has(e.modelName);
                if (!isInPopular) {
                    return false;
                }
            }

            if (tierFilter !== 'all' && e.tier.toLowerCase() !== tierFilter) return false;
            if (searchFilter && !e.modelName.toLowerCase().includes(searchFilter)) return false;
            return true;
        });
        
        console.log('🟠 Filtered evaluations count:', filtered.length);
        if (filtered.length > 0) {
            console.log('🟠 Sample filtered models:', filtered.slice(0, 3).map(e => e.modelName));
        } else {
            console.warn('🔴 NO models passed the filter!');
        }
        
        // Calculate score-based ranks (rank always reflects score position)
        // Handle ties: models with same score get the same rank
        const scoreRanks = new Map();
        const sortedByScore = [...filtered].filter(e => e && e.modelName).sort((a, b) => {
            // Calculate actual scores for comparison
            const aDimScores = this.calculateDimensionScores(a.scores);
            const bDimScores = this.calculateDimensionScores(b.scores);
            const aTotal = (aDimScores.transparent || 0) + (aDimScores.reproducible || 0) + 
                         (aDimScores.understandable || 0) + (aDimScores.executable || 0);
            const bTotal = (bDimScores.transparent || 0) + (bDimScores.reproducible || 0) + 
                         (bDimScores.understandable || 0) + (bDimScores.executable || 0);
            return bTotal - aTotal;
        });
        let currentRank = 1;
        let previousScore = null;
        
        sortedByScore.forEach((evaluation, index) => {
            const dimScores = this.calculateDimensionScores(evaluation.scores);
            const actualTotal = (dimScores.transparent || 0) + (dimScores.reproducible || 0) + 
                              (dimScores.understandable || 0) + (dimScores.executable || 0);
            
            if (previousScore !== null && actualTotal < previousScore) {
                currentRank = index + 1;
            }
            scoreRanks.set(evaluation.id, currentRank);
            previousScore = actualTotal;
        });
        
        // Apply current sorting
        filtered = this.applySorting(filtered);
        
        // Render rows
        tbody.innerHTML = filtered.map((evaluation, index) => {
            const date = new Date(evaluation.timestamp).toLocaleDateString();
            const dimensionScores = this.calculateDimensionScores(evaluation.scores);
            
            // Calculate actual total from dimension scores
            const actualTotal = (dimensionScores.transparent || 0) + 
                              (dimensionScores.reproducible || 0) + 
                              (dimensionScores.understandable || 0) + 
                              (dimensionScores.executable || 0);
            
            // Use current run count or historic count based on view mode
            let evalCount;
            if (this.evalViewMode === 'current') {
                evalCount = this.currentRunCounts[evaluation.modelName] || 0;
            } else {
                evalCount = evalCounts[evaluation.modelName] || 1;
            }
            
            // Rank always shows score-based position (1 = highest score)
            // This remains constant even when sorted by date or other columns
            const rank = scoreRanks.get(evaluation.id);
            
            // Truncate model name if too long (reduced for smaller column)
            const displayName = evaluation.modelName.length > 12 
                ? evaluation.modelName.substring(0, 9) + '...' 
                : evaluation.modelName;
            
            // Get correct tier based on actual total
            const actualTier = this.getTier(actualTotal).name;
            
            return `
                <tr data-eval-id="${evaluation.id}" class="leaderboard-row ${evaluation.modified ? 'edited-row' : ''}" 
                    onclick="app.viewEvaluation('${evaluation.id}')"
                    title="${evaluation.modified ? 'Manually edited - ' : ''}Click to view details.">
                    <td class="rank-cell">${rank}</td>
                    <td class="model-name-cell" title="${evaluation.modelName}">${displayName}</td>
                    <td class="eval-count-cell" title="${evalCount} evaluation${evalCount > 1 ? 's' : ''} for this model">
                        <span class="eval-count-badge">${evalCount}</span>
                    </td>
                    <td class="score-cell">${actualTotal}/30</td>
                    <td class="tier-cell ${actualTier.toLowerCase()}">${actualTier}</td>
                    <td class="dimension-score">${dimensionScores.transparent || 0}</td>
                    <td class="dimension-score">${dimensionScores.reproducible || 0}</td>
                    <td class="dimension-score">${dimensionScores.understandable || 0}</td>
                    <td class="dimension-score">${dimensionScores.executable || 0}</td>
                    <td class="date-cell" title="${new Date(evaluation.timestamp).toLocaleString('en-US', {
                        timeZoneName: 'short',
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit'
                    })}">${date}</td>
                </tr>
            `;
        }).join('');
        
        // Update sort indicators after rendering
        this.updateSortIndicators();
    }
    
    getEvaluationCounts() {
        const counts = {};
        this.evaluations.forEach(evaluation => {
            const modelName = evaluation.modelName;
            // Use the stored evalCount from the evaluation
            // Since we deduplicate and keep only one entry per model with accumulated count
            counts[modelName] = evaluation.evalCount || 1;
        });
        return counts;
    }

    calculateDimensionScores(scores) {
        // Handle null/undefined scores
        if (!scores || typeof scores !== 'object') {
            return {
                transparent: 0,
                reproducible: 0,
                understandable: 0,
                executable: 0
            };
        }
        
        const points = {
            transparent: { license: 2, weights: 2, inference: 2, training: 2, datasets: 2 },
            reproducible: { hardware: 2, pipeline: 2, checkpoints: 2, cost: 2, community: 2 },
            understandable: { modelcard: 2, architecture: 2, provenance: 2 },
            executable: { runnable: 2, finetune: 2 }
        };
        
        const result = {};
        for (const [dimension, criteria] of Object.entries(scores)) {
            result[dimension] = 0;
            for (const [criterion, checked] of Object.entries(criteria)) {
                if (checked && points[dimension]?.[criterion]) {
                    result[dimension] += points[dimension][criterion];
                }
            }
        }
        return result;
    }

    viewEvaluation(id, editMode = false) {
        const evaluation = this.evaluations.find(e => e.id === id);
        if (!evaluation) return;
        
        // Store original state for cancel functionality
        this.modalOriginalState = JSON.parse(JSON.stringify(evaluation));
        this.modalHasChanges = false;
        this.currentModalId = id;
        this.modalEditMode = editMode;
        
        // Get dimension scores
        const dimScores = this.calculateDimensionScores(evaluation.scores);
        
        // Calculate actual total from dimension scores to ensure accuracy
        const actualTotal = (dimScores.transparent || 0) + 
                          (dimScores.reproducible || 0) + 
                          (dimScores.understandable || 0) + 
                          (dimScores.executable || 0);
        
        // Build modal content - read-only by default
        let modalHTML = `
            <div class="modal-header">
                <h2>${editMode ? `
                    <input type="text" id="modal-model-name" value="${evaluation.modelName}" 
                        style="background: transparent; border: none; border-bottom: 2px solid var(--primary-color); 
                        font-size: inherit; font-weight: inherit; color: inherit; padding: 0.25rem; width: auto; min-width: 200px;"
                        onchange="app.updateModalField('${id}', 'modelName', this.value)">
                ` : evaluation.modelName}</h2>
                <div class="modal-subtitle">
                    Total Score: <span id="modal-total-score">${actualTotal}</span>/30 | 
                    Tier: <span id="modal-tier" class="tier-badge ${this.getTier(actualTotal).name.toLowerCase()}" style="display: inline-block; padding: 0.25rem 1rem; margin-left: 0.5rem;">${this.getTier(actualTotal).name}</span>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>📊 Score Breakdown</h3>
                <div class="score-grid">
                    <div class="score-item">
                        <div class="score-label">Transparent</div>
                        <div style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">
                            <span id="modal-score-transparent">${dimScores.transparent || 0}</span>/10
                        </div>
                    </div>
                    <div class="score-item">
                        <div class="score-label">Reproducible</div>
                        <div style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">
                            <span id="modal-score-reproducible">${dimScores.reproducible || 0}</span>/10
                        </div>
                    </div>
                    <div class="score-item">
                        <div class="score-label">Understandable</div>
                        <div style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">
                            <span id="modal-score-understandable">${dimScores.understandable || 0}</span>/6
                        </div>
                    </div>
                    <div class="score-item">
                        <div class="score-label">Executable</div>
                        <div style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">
                            <span id="modal-score-executable">${dimScores.executable || 0}</span>/4
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>🔗 Model Information</h3>
                <p><strong>URL:</strong> ${editMode ? `
                    <input type="text" id="modal-model-url" value="${evaluation.modelUrl}" 
                        style="background: white; border: 1px solid var(--border); padding: 0.5rem; border-radius: 6px; width: 100%; margin-top: 0.5rem;"
                        onchange="app.updateModalField('${id}', 'modelUrl', this.value)">
                ` : `
                    <a href="${evaluation.modelUrl}" target="_blank" style="color: var(--primary-color); text-decoration: none; margin-left: 0.5rem;">
                        ${evaluation.modelUrl} 🔗
                    </a>
                `}</p>
                <p><strong>Evaluation Date:</strong> ${new Date(evaluation.timestamp).toLocaleString('en-US', { 
                    timeZoneName: 'short',
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit'
                })}</p>
                ${evaluation.modified && evaluation.modifiedDate ? `
                    <div style="background: linear-gradient(90deg, rgba(251, 191, 36, 0.1) 0%, transparent 100%); padding: 0.75rem; border-left: 3px solid #fbbf24; border-radius: 6px; margin-top: 0.5rem;">
                        <p style="margin: 0; color: #fbbf24; font-weight: 600;">
                            ✏️ Manually Modified: ${new Date(evaluation.modifiedDate).toLocaleString('en-US', {
                                timeZoneName: 'short',
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </p>
                        ${evaluation.modificationHistory && evaluation.modificationHistory.length > 0 ? `
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
                                Previous score: ${evaluation.modificationHistory[evaluation.modificationHistory.length - 1].previousScore}/30
                            </p>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add detailed criteria
        if (evaluation.scores) {
            modalHTML += `
                <div class="modal-section">
                    <h3>✅ Detailed Criteria${editMode ? ' (Edit Mode)' : ''}</h3>
            `;
            
            const criteria = {
                transparent: { license: 2, weights: 2, inference: 2, training: 2, datasets: 2 },
                reproducible: { hardware: 2, pipeline: 2, checkpoints: 2, cost: 2, community: 2 },
                understandable: { modelcard: 2, architecture: 2, provenance: 2 },
                executable: { runnable: 2, finetune: 2 }
            };
            
            const criteriaLabels = {
                license: 'License provided',
                weights: 'Model weights released',
                inference: 'Inference code available',
                training: 'Training code available',
                datasets: 'Datasets disclosed',
                hardware: 'Hardware/setup disclosed',
                pipeline: 'Training pipeline + configs',
                checkpoints: 'Intermediate checkpoints/logs',
                cost: 'Cost/time disclosed',
                community: 'Community-verified replication',
                modelcard: 'Model card & usage docs',
                architecture: 'Architecture details',
                provenance: 'Data provenance',
                runnable: 'Can run on consumer hardware',
                finetune: 'Can fine-tune locally'
            };
            
            for (const [dimension, items] of Object.entries(criteria)) {
                modalHTML += `<h4 style="color: var(--primary-color); margin-top: 1rem; text-transform: capitalize;">${dimension}</h4>`;
                modalHTML += `<div style="display: grid; gap: 0.75rem;">`;
                
                for (const [item, points] of Object.entries(items)) {
                    const checked = evaluation.scores[dimension]?.[item] || false;
                    const evidence = evaluation.evidence?.[item] || '';
                    
                    if (editMode) {
                        modalHTML += `
                            <div style="padding: 0.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: 6px;">
                                <label style="display: flex; align-items: center; cursor: pointer;">
                                    <input type="checkbox" 
                                        id="modal-${dimension}-${item}"
                                        ${checked ? 'checked' : ''} 
                                        onchange="app.updateModalCriterion('${id}', '${dimension}', '${item}', this.checked)"
                                        style="margin-right: 0.5rem; cursor: pointer;">
                                    <span style="flex: 1;">${criteriaLabels[item]} - ${points}pts</span>
                                </label>
                                <input type="text" 
                                    id="modal-evidence-${item}"
                                    value="${evidence}" 
                                    placeholder="Evidence/URL"
                                    onchange="app.updateModalEvidence('${id}', '${item}', this.value)"
                                    style="width: 100%; margin-top: 0.5rem; padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px;">
                            </div>
                        `;
                    } else {
                        // Read-only view with clickable evidence links
                        modalHTML += `
                            <div style="padding: 0.75rem; background: ${checked ? 'var(--surface)' : 'rgba(239, 68, 68, 0.05)'}; border: 1px solid ${checked ? 'var(--border)' : 'rgba(239, 68, 68, 0.2)'}; border-radius: 6px;">
                                <div style="display: flex; align-items: center;">
                                    <span style="margin-right: 0.5rem; font-size: 1.2rem;">${checked ? '✅' : '❌'}</span>
                                    <span style="flex: 1; ${!checked ? 'color: var(--text-secondary);' : ''}">${criteriaLabels[item]} - ${points}pts</span>
                                </div>
                                ${evidence ? `
                                    <div style="margin-top: 0.5rem; padding-left: 1.75rem;">
                                        <a href="${evidence}" target="_blank" style="color: var(--primary-color); text-decoration: none; font-size: 0.875rem; word-break: break-all;">
                                            📎 ${evidence}
                                        </a>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }
                }
                
                modalHTML += '</div>';
            }
            
            modalHTML += '</div>';
        }
        
        // Add notes section
        modalHTML += `
            <div class="modal-section">
                <h3>📝 Notes</h3>
                ${editMode ? `
                    <textarea id="modal-notes" 
                        style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; resize: vertical;"
                        placeholder="Add evaluation notes..."
                        onchange="app.updateModalField('${id}', 'notes', this.value)">${evaluation.notes || ''}</textarea>
                ` : `
                    <p style="padding: 0.75rem; background: var(--surface); border-radius: 6px; white-space: pre-wrap;">
                        ${evaluation.notes || 'No notes available'}
                    </p>
                `}
            </div>
        `;
        
        // Add action buttons
        modalHTML += `
            <div id="modal-actions" class="modal-actions" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid var(--border); display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                ${editMode ? `
                    <button onclick="app.saveModalChanges();" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: white; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                        💾 Save Changes
                    </button>
                    <button onclick="app.cancelModalChanges();" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; color: white; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                        ❌ Cancel
                    </button>
                ` : `
                    <button onclick="app.enableModalEdit('${id}');" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: white; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                        ✏️ Edit
                    </button>
                    <button onclick="app.exportSingleEvaluation('${evaluation.id}');" style="padding: 0.875rem 2rem; background: white; border: 2px solid var(--primary-color); color: var(--primary-color); border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                        📥 Export JSON
                    </button>
                    <button onclick="app.hideModal();" style="padding: 0.875rem 2rem; background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        Close
                    </button>
                `}
            </div>
        `;
        
        // Show modal
        this.showModal(modalHTML);
    }
    
    showModal(content) {
        const modal = document.getElementById('evaluation-modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalBody) return;
        
        modalBody.innerHTML = content;
        modal.style.display = 'block';
        modal.classList.add('show');
        
        // Setup close handlers
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal();
        }
        
        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        };
        
        // Close on ESC key
        document.onkeydown = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        };
    }
    
    closeModal() {
        const modal = document.getElementById('evaluation-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }
    
    hideModal() {
        this.closeModal();
    }

    editEvaluation(id) {
        const evaluation = this.evaluations.find(e => e.id === id);
        if (!evaluation) return;
        
        // Mark that we're editing an existing evaluation
        this.isEditingExisting = true;
        this.editingEvaluationId = id;
        
        // Load evaluation into form with the same ID to enable auto-save updates
        this.currentEvaluation = { ...evaluation, id: evaluation.id };
        
        // Update the model name display with edit indicator
        const evalModelName = document.getElementById('eval-model-name');
        if (evalModelName) {
            evalModelName.innerHTML = `
                <span style="color: #fbbf24;">✏️ Editing:</span> ${evaluation.modelName}
                <br><small style="color: #64748b;">Make your changes below and click Save</small>
            `;
        }
        
        // Restore scores
        for (const [dimension, criteria] of Object.entries(evaluation.scores)) {
            for (const [criterion, checked] of Object.entries(criteria)) {
                const checkbox = document.querySelector(`[data-dimension="${dimension}"] [data-criterion="${criterion}"]`);
                if (checkbox) checkbox.checked = checked;
            }
        }
        
        // Restore evidence
        for (const [criterion, evidence] of Object.entries(evaluation.evidence || {})) {
            const input = document.querySelector(`[data-criterion="${criterion}"]`)
                ?.closest('.criterion')?.querySelector('.evidence');
            if (input) input.value = evidence;
        }
        
        const notesElement = document.getElementById('notes');
        if (notesElement) notesElement.value = evaluation.notes || '';
        
        // Ensure all fields are editable
        this.enableScoringFields();
        
        // Show cancel button next to save
        const newEvalBtn = document.getElementById('new-evaluation');
        if (newEvalBtn) {
            newEvalBtn.innerHTML = '❌ Cancel Edit';
            newEvalBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            newEvalBtn.style.color = 'white';
        }
        
        document.getElementById('evaluation-section').style.display = 'none';
        document.getElementById('scoring-section').style.display = 'block';
        this.updateScores();
        
        // Capture original state after loading the evaluation for editing
        setTimeout(() => {
            this.captureOriginalState();
        }, 200);
        
        // Scroll to the top to show the evaluation form
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Show notification
        // Now editing evaluation - no notification needed
    }

    // Persistence methods
    loadEvaluations() {
        const stored = localStorage.getItem('true_evaluations');
        const evaluations = stored ? JSON.parse(stored) : [];
        
        // Clean up duplicates
        if (evaluations.length > 0) {
            return this.removeDuplicates(evaluations);
        }
        
        return evaluations;
    }
    
    removeDuplicates(evaluations) {
        const uniqueEvaluations = new Map();
        const evalCounts = new Map();
        
        // Count evaluations and keep only the most recent/best for each model
        evaluations.forEach(evaluation => {
            // Use both modelName and URL as key to be more specific
            const modelKey = evaluation.modelName.toLowerCase().trim();
            const existing = uniqueEvaluations.get(modelKey);
            
            // Accumulate total eval counts for this model
            const currentEvalCount = evaluation.evalCount || 1;
            evalCounts.set(modelKey, (evalCounts.get(modelKey) || 0) + currentEvalCount);
            
            // Keep the evaluation with the highest score, or latest if scores are equal
            if (!existing || 
                evaluation.totalScore > existing.totalScore ||
                (evaluation.totalScore === existing.totalScore && evaluation.timestamp > (existing.timestamp || 0))) {
                uniqueEvaluations.set(modelKey, evaluation);
            }
        });
        
        // Convert back to array and preserve evaluation counts
        const cleanedEvaluations = Array.from(uniqueEvaluations.values()).map(evaluation => {
            const modelKey = evaluation.modelName.toLowerCase().trim();
            const count = evalCounts.get(modelKey) || 1;
            // Always set evalCount, preserving the maximum of counted duplicates or existing count
            evaluation.evalCount = Math.max(count, evaluation.evalCount || 1);
            // Ensure modelName is normalized
            evaluation.modelName = modelKey;
            return evaluation;
        });
        
        // If duplicates were removed, save the cleaned data
        if (evaluations.length > cleanedEvaluations.length) {
            console.log(`Removed ${evaluations.length - cleanedEvaluations.length} duplicate evaluations`);
            localStorage.setItem('true_evaluations', JSON.stringify(cleanedEvaluations));
        }
        
        return cleanedEvaluations;
    }

    saveEvaluations() {
        localStorage.setItem('true_evaluations', JSON.stringify(this.evaluations));
    }

    checkPersistenceStatus() {
        // Check if Google Forms is configured
        const gformsConfig = localStorage.getItem('true_gforms_config');
        if (gformsConfig) {
            document.querySelector('.persistence-options .option:nth-child(2)').classList.add('active');
        }
        
        // Check Firebase status and update UI
        this.forceUpdateFirebaseUI();
    }

    isGoogleFormsEnabled() {
        return localStorage.getItem('true_gforms_config') !== null;
    }

    setupGoogleForms() {
        const formUrl = prompt('Enter your Google Form URL (or leave empty to use default):');
        if (formUrl === null) return;
        
        // Default form URL (you would create this)
        const url = formUrl || 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse';
        
        localStorage.setItem('true_gforms_config', JSON.stringify({ url }));
        // Google Forms configured - no notification needed
        this.checkPersistenceStatus();
    }

    async submitToGoogleForms(evaluation) {
        const config = JSON.parse(localStorage.getItem('true_gforms_config'));
        if (!config) return;
        
        // Format data for Google Forms submission
        const formData = new FormData();
        formData.append('entry.1234567890', evaluation.modelName); // Replace with actual entry IDs
        formData.append('entry.2345678901', evaluation.modelUrl);
        formData.append('entry.3456789012', evaluation.totalScore);
        formData.append('entry.4567890123', evaluation.tier);
        formData.append('entry.5678901234', JSON.stringify(evaluation.scores));
        formData.append('entry.6789012345', evaluation.notes || '');
        
        try {
            // Note: This might be blocked by CORS in production
            await fetch(config.url, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });
        } catch (error) {
            console.error('Failed to submit to Google Forms:', error);
        }
    }

    exportAllData() {
        if (this.evaluations.length === 0) {
            this.showNotification('No evaluations to export', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(this.evaluations, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `true-all-evaluations-${Date.now()}.json`;
        link.click();
        
        // Exported evaluations - no notification needed
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (Array.isArray(data)) {
                    this.evaluations = [...this.evaluations, ...data];
                    this.saveEvaluations();
                    this.renderLeaderboard();
                    // Evaluations imported successfully - no notification needed
                } else {
                    this.showNotification('Invalid data format', 'error');
                }
            } catch (error) {
                this.showNotification('Failed to import data: ' + error.message, 'error');
            }
        };
        input.click();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    updateModalField(id, field, value) {
        const evaluation = this.evaluations.find(e => e.id === id);
        if (!evaluation) return;
        
        // Update field without saving yet
        evaluation[field] = value;
        
        // Track that changes were made
        this.modalHasChanges = true;
    }
    
    
    updateModalCriterion(id, dimension, criterion, checked) {
        const evaluation = this.evaluations.find(e => e.id === id);
        if (!evaluation) return;
        
        // Initialize scores structure if needed
        if (!evaluation.scores) evaluation.scores = {};
        if (!evaluation.scores[dimension]) evaluation.scores[dimension] = {};
        
        evaluation.scores[dimension][criterion] = checked;
        
        // Recalculate scores
        const points = {
            transparent: { license: 2, weights: 2, inference: 2, training: 2, datasets: 2 },
            reproducible: { hardware: 2, pipeline: 2, checkpoints: 2, cost: 2, community: 2 },
            understandable: { modelcard: 2, architecture: 2, provenance: 2 },
            executable: { runnable: 2, finetune: 2 }
        };
        
        let totalScore = 0;
        for (const [dim, criteria] of Object.entries(evaluation.scores)) {
            for (const [crit, isChecked] of Object.entries(criteria)) {
                if (isChecked && points[dim]?.[crit]) {
                    totalScore += points[dim][crit];
                }
            }
        }
        
        evaluation.totalScore = totalScore;
        evaluation.tier = this.getTier(totalScore).name;
        
        // Update display in modal
        const dimScores = this.calculateDimensionScores(evaluation.scores);
        if (document.getElementById('modal-total-score')) {
            document.getElementById('modal-total-score').textContent = totalScore;
            document.getElementById('modal-tier').className = `tier-badge ${evaluation.tier.toLowerCase()}`;
            document.getElementById('modal-tier').textContent = evaluation.tier;
            document.getElementById(`modal-score-${dimension}`).textContent = dimScores[dimension];
        }
        
        // Track that changes were made
        this.modalHasChanges = true;
    }
    
    updateModalEvidence(id, criterion, value) {
        const evaluation = this.evaluations.find(e => e.id === id);
        if (!evaluation) return;
        
        if (!evaluation.evidence) evaluation.evidence = {};
        evaluation.evidence[criterion] = value;
        
        // Track that changes were made
        this.modalHasChanges = true;
    }
    
    saveModalChanges() {
        if (!this.currentModalId || !this.modalHasChanges) return;
        
        const evaluation = this.evaluations.find(e => e.id === this.currentModalId);
        if (!evaluation) return;
        
        // Mark as modified
        if (!evaluation.modified) {
            evaluation.modificationHistory = evaluation.modificationHistory || [];
            evaluation.modificationHistory.push({
                previousScore: this.modalOriginalState.totalScore,
                modifiedDate: Date.now()
            });
        }
        evaluation.modified = true;
        evaluation.modifiedDate = Date.now();
        
        // Save to storage
        this.saveEvaluations();
        this.renderLeaderboard();
        
        // Reset change tracking
        this.modalHasChanges = false;
        this.modalOriginalState = JSON.parse(JSON.stringify(evaluation));
        
        // Re-render the modal in read-only mode
        this.viewEvaluation(this.currentModalId, false);
        
        // Changes saved successfully - no notification needed
    }
    
    enableModalEdit(id) {
        // Re-render the modal in edit mode
        this.viewEvaluation(id, true);
    }
    
    cancelModalChanges() {
        if (!this.currentModalId || !this.modalOriginalState) return;
        
        // Find current evaluation
        const evalIndex = this.evaluations.findIndex(e => e.id === this.currentModalId);
        if (evalIndex === -1) return;
        
        // Restore original state
        this.evaluations[evalIndex] = JSON.parse(JSON.stringify(this.modalOriginalState));
        
        // Re-render the modal in read-only mode
        this.viewEvaluation(this.currentModalId, false);
        
        // Changes cancelled - no notification needed
    }
    
    exportSingleEvaluation(id) {
        const evaluation = this.evaluations.find(e => e.id === id);
        if (!evaluation) {
            this.showNotification('Evaluation not found', 'error');
            return;
        }
        
        const dataStr = JSON.stringify(evaluation, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `true-evaluation-${evaluation.modelName.replace(/\s+/g, '-')}-${Date.now()}.json`;
        link.click();
        
        // Exported evaluation - no notification needed
    }
    
    checkCachedSuggestions() {
        const cached = localStorage.getItem('true_suggestions_cache');
        if (cached) {
            const data = JSON.parse(cached);
            const ageMinutes = (Date.now() - data.timestamp) / 1000 / 60;
            
            // Show when last updated
            const statusEl = document.getElementById('suggestions-status');
            if (statusEl) {
                if (ageMinutes < 60) {
                    statusEl.textContent = `Updated ${Math.round(ageMinutes)} min ago`;
                } else if (ageMinutes < 1440) {
                    statusEl.textContent = `Updated ${Math.round(ageMinutes / 60)} hours ago`;
                } else {
                    statusEl.textContent = `Updated ${Math.round(ageMinutes / 1440)} days ago`;
                }
            }
            
            // If cache is less than 1 hour old, use it
            if (ageMinutes < 60 && data.suggestions) {
                this.updateSuggestionsUI(data.suggestions);
            }
        }
    }
    
    async refreshSuggestions() {
        const refreshBtn = document.getElementById('refresh-suggestions');
        const statusEl = document.getElementById('suggestions-status');
        const originalText = refreshBtn.textContent;
        
        try {
            // Show loading state
            refreshBtn.disabled = true;
            refreshBtn.textContent = '⏳ Loading...';
            if (statusEl) statusEl.textContent = 'Fetching latest models...';
            
            // Fetch trending models from HuggingFace
            const suggestions = await this.fetchTrendingModels();
            
            // Cache the results
            localStorage.setItem('true_suggestions_cache', JSON.stringify({
                timestamp: Date.now(),
                suggestions: suggestions
            }));
            
            // Update UI
            this.updateSuggestionsUI(suggestions);
            
            // Re-evaluate models with new suggestions
            console.log('Suggestions refreshed, re-evaluating models...');
            await this.checkAndPopulateInitialEvaluations();
            this.renderLeaderboard();
            
            // Show success
            // Updated with latest models - no notification needed
            if (statusEl) statusEl.textContent = 'Just updated';
            
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
            this.showNotification('Failed to fetch latest models. Using cached data.', 'warning');
            if (statusEl) statusEl.textContent = 'Update failed';
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = originalText;
        }
    }
    
    async fetchTrendingModels() {
        // Fetch real data from HuggingFace public API (no authentication required!)
        try {
            console.log('Fetching real trending models from HuggingFace API...');
            
            // Fetch trending models from HuggingFace public API
            const response = await fetch('https://huggingface.co/api/models');
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const models = await response.json();
            
            // Sort by trending score and organize into categories
            const sortedModels = models
                .filter(m => m.trendingScore > 0)
                .sort((a, b) => b.trendingScore - a.trendingScore);
            
            // Categorize models based on their tags and pipeline
            const categorizedModels = {
                trending: [],
                code: [],
                community: [],
                research: [],
                enterprise: []
            };
            
            // Take top 50 trending models and categorize them
            const topModels = sortedModels.slice(0, 50);
            
            topModels.forEach(model => {
                const modelEntry = {
                    name: model.modelId || model.id,
                    url: `https://huggingface.co/${model.modelId || model.id}`,
                    trendingScore: model.trendingScore,
                    downloads: model.downloads || 0
                };
                
                // Categorize based on tags and pipeline
                const tags = model.tags || [];
                const pipeline = model.pipeline_tag || '';
                
                // Code models
                if (pipeline.includes('code') || 
                    tags.some(t => t.includes('code') || t.includes('programming'))) {
                    if (categorizedModels.code.length < 5) {
                        categorizedModels.code.push(modelEntry);
                    }
                }
                // Research models (from research institutions)
                else if (model.modelId && (
                    model.modelId.includes('allenai') || 
                    model.modelId.includes('stanford') ||
                    model.modelId.includes('berkeley') ||
                    model.modelId.includes('microsoft/research'))) {
                    if (categorizedModels.research.length < 5) {
                        categorizedModels.research.push(modelEntry);
                    }
                }
                // Enterprise models
                else if (model.modelId && (
                    model.modelId.includes('anthropic') ||
                    model.modelId.includes('cohere') ||
                    model.modelId.includes('ai21') ||
                    model.modelId.includes('snowflake'))) {
                    if (categorizedModels.enterprise.length < 5) {
                        categorizedModels.enterprise.push(modelEntry);
                    }
                }
                // Community models (high downloads from individual contributors)
                else if (model.downloads > 1000 && !model.modelId?.includes('/')) {
                    if (categorizedModels.community.length < 5) {
                        categorizedModels.community.push(modelEntry);
                    }
                }
                // Default to trending
                else if (categorizedModels.trending.length < 5) {
                    categorizedModels.trending.push(modelEntry);
                }
            });
            
            // Fill trending if not enough
            if (categorizedModels.trending.length === 0) {
                categorizedModels.trending = topModels.slice(0, 5).map(model => ({
                    name: model.modelId || model.id,
                    url: `https://huggingface.co/${model.modelId || model.id}`,
                    trendingScore: model.trendingScore,
                    downloads: model.downloads || 0
                }));
            }
            
            // Add timestamp and stats
            const result = {
                ...categorizedModels,
                fetchedAt: new Date().toISOString(),
                totalModels: models.length,
                topScore: sortedModels[0]?.trendingScore || 0
            };
            
            console.log('Successfully fetched real trending models:', {
                trending: result.trending.length,
                code: result.code.length,
                community: result.community.length,
                research: result.research.length,
                enterprise: result.enterprise.length
            });
            
            return result;
            
        } catch (error) {
            console.error('Failed to fetch from HuggingFace API, falling back to cached data:', error);
            
            // Fallback to hardcoded data if API fails
            return {
                trending: [
                        { name: "Meta Llama 3.3 (70B)", url: "https://huggingface.co/meta-llama/Llama-3.3-70B" },
                        { name: "Mistral Large 2", url: "https://huggingface.co/mistralai/Mistral-Large-Instruct-2407" },
                        { name: "Qwen 2.5 (72B)", url: "https://huggingface.co/Qwen/Qwen2.5-72B-Instruct" }
                    ],
                    code: [
                        { name: "Qwen 2.5 Coder (32B)", url: "https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct" },
                        { name: "DeepSeek Coder V3", url: "https://huggingface.co/deepseek-ai/deepseek-coder-v3" },
                        { name: "Code Llama 3 (70B)", url: "https://huggingface.co/meta-llama/CodeLlama-3-70b" },
                        { name: "Starcoder 2 (15B)", url: "https://huggingface.co/bigcode/starcoder2-15b" },
                        { name: "CodeGemma (7B)", url: "https://huggingface.co/google/codegemma-7b" }
                    ],
                    community: [
                        { name: "Nous Hermes 3.5", url: "https://huggingface.co/NousResearch/Hermes-3.5" },
                        { name: "Mixtral 8x22B", url: "https://huggingface.co/mistralai/Mixtral-8x22B-v0.1" },
                        { name: "Yi 2 (34B)", url: "https://huggingface.co/01-ai/Yi-2-34B" },
                        { name: "SOLAR Pro", url: "https://huggingface.co/upstage/SOLAR-Pro" },
                        { name: "Falcon 3 (40B)", url: "https://huggingface.co/tiiuae/falcon-3-40b" }
                    ],
                    research: [
                        { name: "OLMo 2 (7B)", url: "https://huggingface.co/allenai/OLMo-2-1124-7B" },
                        { name: "Zephyr Beta", url: "https://huggingface.co/HuggingFaceH4/zephyr-beta" },
                        { name: "Orca 3", url: "https://huggingface.co/microsoft/Orca-3" },
                        { name: "Amber", url: "https://github.com/LLM360/Amber" },
                        { name: "DBRX", url: "https://github.com/databricks/dbrx" }
                    ],
                    enterprise: [
                        { name: "Claude 3 Haiku Open", url: "https://huggingface.co/anthropic/claude-3-haiku-open" },
                        { name: "Command R+", url: "https://huggingface.co/CohereForAI/c4ai-command-r-plus" },
                        { name: "Arctic 2", url: "https://huggingface.co/Snowflake/Arctic-2" },
                        { name: "Granite 3.0", url: "https://huggingface.co/ibm-granite/granite-3.0" },
                        { name: "Jamba 1.5", url: "https://huggingface.co/ai21labs/Jamba-1.5" }
                    ],
                    fetchedAt: new Date().toISOString()
                };
        }
    }
    
    updateSuggestionsUI(suggestions) {
        const contentEl = document.getElementById('suggestions-content');
        if (!contentEl) return;
        
        // Build new HTML
        let html = '';
        
        if (suggestions.trending) {
            html += '<div class="suggestions-section"><div class="section-title">🔥 Trending Now</div>';
            suggestions.trending.forEach(model => {
                const validClass = model.validated === false ? ' invalid-url' : '';
                const warningIcon = model.validated === false ? ' ⚠️' : '';
                html += `<div class="suggestion-item${validClass}" data-url="${model.url}" title="${model.validated === false ? 'URL may be invalid' : ''}">${model.name}${warningIcon}</div>`;
            });
            html += '</div>';
        }
        
        if (suggestions.code) {
            html += '<div class="suggestions-section"><div class="section-title">💻 Latest Code Models</div>';
            suggestions.code.forEach(model => {
                const validClass = model.validated === false ? ' invalid-url' : '';
                const warningIcon = model.validated === false ? ' ⚠️' : '';
                html += `<div class="suggestion-item${validClass}" data-url="${model.url}" title="${model.validated === false ? 'URL may be invalid' : ''}">${model.name}${warningIcon}</div>`;
            });
            html += '</div>';
        }
        
        if (suggestions.community) {
            html += '<div class="suggestions-section"><div class="section-title">🌟 Community Updates</div>';
            suggestions.community.forEach(model => {
                const validClass = model.validated === false ? ' invalid-url' : '';
                const warningIcon = model.validated === false ? ' ⚠️' : '';
                html += `<div class="suggestion-item${validClass}" data-url="${model.url}" title="${model.validated === false ? 'URL may be invalid' : ''}">${model.name}${warningIcon}</div>`;
            });
            html += '</div>';
        }
        
        if (suggestions.research) {
            html += '<div class="suggestions-section"><div class="section-title">🔬 New Research Models</div>';
            suggestions.research.forEach(model => {
                const validClass = model.validated === false ? ' invalid-url' : '';
                const warningIcon = model.validated === false ? ' ⚠️' : '';
                html += `<div class="suggestion-item${validClass}" data-url="${model.url}" title="${model.validated === false ? 'URL may be invalid' : ''}">${model.name}${warningIcon}</div>`;
            });
            html += '</div>';
        }
        
        if (suggestions.enterprise) {
            html += '<div class="suggestions-section"><div class="section-title">🏢 Enterprise Releases</div>';
            suggestions.enterprise.forEach(model => {
                const validClass = model.validated === false ? ' invalid-url' : '';
                const warningIcon = model.validated === false ? ' ⚠️' : '';
                html += `<div class="suggestion-item${validClass}" data-url="${model.url}" title="${model.validated === false ? 'URL may be invalid' : ''}">${model.name}${warningIcon}</div>`;
            });
            html += '</div>';
        }
        
        // Update content
        contentEl.innerHTML = html;
        
        // Re-attach click handlers to new items
        contentEl.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const url = e.target.dataset.url;
                const displayName = e.target.textContent;
                const urlInput = document.getElementById('model-url');
                if (urlInput && url) {
                    urlInput.value = url;
                    // Store the display name for later use
                    urlInput.dataset.displayName = displayName;

                    // Set flag to ignore next focus event
                    if (urlInput.ignoreNextFocus) {
                        urlInput.ignoreNextFocus();
                    }

                    // Force close the suggestions box immediately
                    const suggestionsBox = document.getElementById('url-suggestions');
                    if (suggestionsBox) {
                        suggestionsBox.classList.remove('show');
                        // Force style override to ensure it closes
                        suggestionsBox.style.setProperty('display', 'none', 'important');

                        // Clear the style override after a moment
                        setTimeout(() => {
                            if (suggestionsBox) {
                                suggestionsBox.style.removeProperty('display');
                            }
                        }, 100);
                    }

                    // Model selection - no notification needed

                    // Delay blur to ensure flag is set first
                    setTimeout(() => {
                        urlInput.blur();
                    }, 10);

                    // Automatically trigger evaluation instead of just focusing the button
                    setTimeout(() => {
                        this.autoAnalyze();
                    }, 150);
                }
            });
        });
    }
    
    applySorting(data) {
        const { column, direction } = this.sortConfig;
        console.log('🔵 applySorting - column:', column, 'direction:', direction, 'data length:', data.length);

        const sorted = [...data].sort((a, b) => {
            let aVal, bVal;
            
            switch (column) {
                case 'rank':
                case 'totalScore':
                    // Calculate actual scores for both rank and totalScore columns
                    const aDimScoresTotal = this.calculateDimensionScores(a.scores);
                    const bDimScoresTotal = this.calculateDimensionScores(b.scores);
                    aVal = (aDimScoresTotal.transparent || 0) + (aDimScoresTotal.reproducible || 0) + 
                           (aDimScoresTotal.understandable || 0) + (aDimScoresTotal.executable || 0);
                    bVal = (bDimScoresTotal.transparent || 0) + (bDimScoresTotal.reproducible || 0) + 
                           (bDimScoresTotal.understandable || 0) + (bDimScoresTotal.executable || 0);
                    break;
                case 'modelName':
                    aVal = a.modelName.toLowerCase();
                    bVal = b.modelName.toLowerCase();
                    break;
                case 'tier':
                    // Calculate actual tier based on actual scores
                    const aDimScoresTier = this.calculateDimensionScores(a.scores);
                    const bDimScoresTier = this.calculateDimensionScores(b.scores);
                    const aTotalTier = (aDimScoresTier.transparent || 0) + (aDimScoresTier.reproducible || 0) + 
                                      (aDimScoresTier.understandable || 0) + (aDimScoresTier.executable || 0);
                    const bTotalTier = (bDimScoresTier.transparent || 0) + (bDimScoresTier.reproducible || 0) + 
                                      (bDimScoresTier.understandable || 0) + (bDimScoresTier.executable || 0);
                    const aTier = this.getTier(aTotalTier).name;
                    const bTier = this.getTier(bTotalTier).name;
                    const tierOrder = { 'Platinum': 4, 'Gold': 3, 'Silver': 2, 'Bronze': 1 };
                    aVal = tierOrder[aTier] || 0;
                    bVal = tierOrder[bTier] || 0;
                    break;
                case 'transparent':
                case 'reproducible':
                case 'understandable':
                case 'executable':
                    const aDimScores = this.calculateDimensionScores(a.scores);
                    const bDimScores = this.calculateDimensionScores(b.scores);
                    aVal = aDimScores[column];
                    bVal = bDimScores[column];
                    break;
                case 'date':
                    aVal = new Date(a.timestamp).getTime();
                    bVal = new Date(b.timestamp).getTime();
                    break;
                case 'evalCount':
                    const counts = this.getEvaluationCounts();
                    aVal = counts[a.modelName] || 1;
                    bVal = counts[b.modelName] || 1;
                    break;
                default:
                    return 0;
            }
            
            // Handle string comparison
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return direction === 'asc' 
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            
            // Handle numeric comparison
            if (direction === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });

        if (sorted.length > 0) {
            console.log('🔵 First model after sort:', sorted[0].modelName, 'timestamp:', sorted[0].timestamp);
        }

        return sorted;
    }
    
    handleSort(column) {
        // When user manually sorts, clear the "just evaluated" flag
        this.justManuallyEvaluated = false;
        
        // Toggle direction if same column, otherwise default to desc
        if (this.sortConfig.column === column) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.column = column;
            this.sortConfig.direction = column === 'modelName' ? 'asc' : 'desc';
        }
        
        this.renderLeaderboard();
        this.updateSortIndicators();
    }
    
    updateSortIndicators() {
        // Remove all existing sort indicators
        document.querySelectorAll('#leaderboard th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Add current sort indicator
        const currentTh = document.querySelector(`#leaderboard th[data-sort="${this.sortConfig.column}"]`);
        if (currentTh) {
            currentTh.classList.add(`sort-${this.sortConfig.direction}`);
        }
    }
    
    // Hover functionality disabled - auto pop-up removed
    handleRowHover(event, evalId) {
        // Functionality disabled - no auto pop-up on hover
        return;
    }
    
    handleRowLeave(event) {
        // Functionality disabled - no auto pop-up on hover
        return;
    }
    
    showHoverTooltip(evaluation, event) {
        console.log('Showing hover tooltip for:', evaluation.modelName);
        const tooltip = document.getElementById('hover-tooltip');
        if (!tooltip) {
            console.error('Hover tooltip element not found');
            return;
        }
        
        const dimScores = this.calculateDimensionScores(evaluation.scores);
        
        // Build detailed criteria breakdown
        let criteriaDetails = '';
        
        // Transparent criteria
        if (evaluation.scores.transparent) {
            const transparentChecks = [];
            if (evaluation.scores.transparent.license) transparentChecks.push('✅ License (2pts)');
            if (evaluation.scores.transparent.weights) transparentChecks.push('✅ Model weights (2pts)');
            if (evaluation.scores.transparent.inference) transparentChecks.push('✅ Inference code (2pts)');
            if (evaluation.scores.transparent.training) transparentChecks.push('✅ Training code (2pts)');
            if (evaluation.scores.transparent.datasets) transparentChecks.push('✅ Training datasets (2pts)');
            
            if (transparentChecks.length > 0) {
                criteriaDetails += `<div style="margin-top: 0.75rem; padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <div style="font-weight: 600; color: #60a5fa; margin-bottom: 0.25rem;">📋 Transparent (${dimScores.transparent}/10)</div>
                    <div style="font-size: 0.75rem; color: #cbd5e1;">${transparentChecks.join(' • ')}</div>
                </div>`;
            }
        }
        
        // Reproducible criteria
        if (evaluation.scores.reproducible) {
            const reproducibleChecks = [];
            if (evaluation.scores.reproducible.hardware) reproducibleChecks.push('✅ Hardware specs (2pts)');
            if (evaluation.scores.reproducible.pipeline) reproducibleChecks.push('✅ Training pipeline (2pts)');
            if (evaluation.scores.reproducible.checkpoints) reproducibleChecks.push('✅ Checkpoints (2pts)');
            if (evaluation.scores.reproducible.cost) reproducibleChecks.push('✅ Cost estimates (2pts)');
            if (evaluation.scores.reproducible.community) reproducibleChecks.push('✅ Community repro (2pts)');
            
            if (reproducibleChecks.length > 0) {
                criteriaDetails += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <div style="font-weight: 600; color: #a78bfa; margin-bottom: 0.25rem;">🔄 Reproducible (${dimScores.reproducible}/10)</div>
                    <div style="font-size: 0.75rem; color: #cbd5e1;">${reproducibleChecks.join(' • ')}</div>
                </div>`;
            }
        }
        
        // Understandable criteria
        if (evaluation.scores.understandable) {
            const understandableChecks = [];
            if (evaluation.scores.understandable.modelcard) understandableChecks.push('✅ Model card (2pts)');
            if (evaluation.scores.understandable.architecture) understandableChecks.push('✅ Architecture (2pts)');
            if (evaluation.scores.understandable.provenance) understandableChecks.push('✅ Data provenance (2pts)');
            
            if (understandableChecks.length > 0) {
                criteriaDetails += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <div style="font-weight: 600; color: #fbbf24; margin-bottom: 0.25rem;">📖 Understandable (${dimScores.understandable}/6)</div>
                    <div style="font-size: 0.75rem; color: #cbd5e1;">${understandableChecks.join(' • ')}</div>
                </div>`;
            }
        }
        
        // Executable criteria
        if (evaluation.scores.executable) {
            const executableChecks = [];
            if (evaluation.scores.executable.runnable) executableChecks.push('✅ Locally runnable (2pts)');
            if (evaluation.scores.executable.finetune) executableChecks.push('✅ Fine-tuning pipeline (2pts)');
            
            if (executableChecks.length > 0) {
                criteriaDetails += `<div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                    <div style="font-weight: 600; color: #34d399; margin-bottom: 0.25rem;">⚡ Executable (${dimScores.executable}/4)</div>
                    <div style="font-size: 0.75rem; color: #cbd5e1;">${executableChecks.join(' • ')}</div>
                </div>`;
            }
        }
        
        tooltip.innerHTML = `
            <div class="hover-content" style="max-height: 70vh; overflow-y: auto; position: relative;">
                <button onclick="app.hideHoverTooltip();" style="position: absolute; top: 0.25rem; right: 0.25rem; background: transparent; border: none; color: rgba(255, 255, 255, 0.5); font-size: 1.25rem; cursor: pointer; padding: 0.25rem; line-height: 1; z-index: 10;" title="Close (ESC)">✕</button>
                <div class="hover-header" style="padding-right: 2rem;">
                    <strong>${evaluation.modelName}</strong>
                    <span class="tier-badge ${evaluation.tier.toLowerCase()}" style="font-size: 0.75rem; padding: 0.125rem 0.5rem; margin-left: 0.5rem;">${evaluation.tier}</span>
                </div>
                <div class="hover-scores">
                    <div style="margin: 0.5rem 0; font-size: 1.2rem; font-weight: 600; color: #60a5fa;">
                        Total Score: ${evaluation.totalScore}/30
                        ${evaluation.modified ? '<span style="font-size: 0.75rem; margin-left: 0.5rem; color: #fbbf24;">✏️ Manually Edited</span>' : ''}
                    </div>
                    
                    ${criteriaDetails}
                    
                    ${evaluation.modelUrl ? `<div style="margin-top: 0.75rem; font-size: 0.8rem; color: #94a3b8;">
                        <strong>Model URL:</strong><br>
                        <a href="${evaluation.modelUrl}" target="_blank" style="color: #60a5fa; text-decoration: none;">🔗 ${evaluation.modelUrl}</a>
                    </div>` : ''}
                    
                    ${evaluation.notes ? `<div style="margin-top: 0.75rem; padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                        <div style="font-weight: 600; color: #94a3b8; margin-bottom: 0.25rem; font-size: 0.8rem;">📝 Notes:</div>
                        <div style="font-size: 0.75rem; color: #cbd5e1; font-style: italic;">${evaluation.notes}</div>
                    </div>` : ''}
                    
                    <div style="margin-top: 0.5rem; padding-top: 0.5rem; font-size: 0.7rem; color: #64748b;">
                        <div>Evaluated: ${new Date(evaluation.timestamp).toLocaleString('en-US', {
                            timeZoneName: 'short',
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                        })}</div>
                        ${evaluation.modified && evaluation.modifiedDate ? `
                            <div style="margin-top: 0.25rem; color: #fbbf24; font-weight: 600;">
                                ✏️ Modified: ${new Date(evaluation.modifiedDate).toLocaleString('en-US', {
                                    timeZoneName: 'short',
                                    year: 'numeric',
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="hover-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; gap: 0.5rem; justify-content: space-between; align-items: center;">
                        <button onclick="app.exportSingleEvaluation('${evaluation.id}'); app.hideHoverTooltip();" style="padding: 0.625rem 1rem; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: white; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                            📥 Export JSON
                        </button>
                        <button onclick="app.hideHoverTooltip();" style="padding: 0.625rem 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.8); border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">
                            ✕ Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        tooltip.style.display = 'block';
        
        // Get the row element - event might be the row itself or need to find it
        const row = event.currentTarget || event.target.closest('tr');
        if (!row) return;
        
        const rect = row.getBoundingClientRect();
        
        // Force reflow to get accurate tooltip dimensions
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'block';
        const tooltipRect = tooltip.getBoundingClientRect();
        tooltip.style.visibility = 'visible';
        
        // Calculate position (fixed positioning, so relative to viewport)
        let left = rect.right + 10;
        let top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        
        // If tooltip would go off the right edge, show it on the left
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = rect.left - tooltipRect.width - 10;
        }
        
        // If tooltip would go off the left edge, position above or below
        if (left < 10) {
            left = Math.max(10, rect.left + (rect.width / 2) - (tooltipRect.width / 2));
            top = rect.top - tooltipRect.height - 10;
            
            // If it would go off the top, position below
            if (top < 10) {
                top = rect.bottom + 10;
            }
        }
        
        // Ensure tooltip stays within vertical viewport bounds
        if (top < 10) {
            top = 10;
        } else if (top + tooltipRect.height > window.innerHeight - 10) {
            top = window.innerHeight - tooltipRect.height - 10;
        }
        
        // Ensure horizontal bounds
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }
    
    hideHoverTooltip() {
        const tooltip = document.getElementById('hover-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
    
    // Validate URL by checking if it's accessible
    async validateUrl(url) {
        try {
            // For HuggingFace URLs, check if they return a valid response
            const response = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors' // Avoid CORS issues
            });
            // In no-cors mode, we can't read the status, but if fetch doesn't throw, URL is likely valid
            return true;
        } catch (error) {
            console.warn(`URL validation failed for ${url}:`, error.message);
            return false;
        }
    }
    
    // Load historic data from Firebase on page load with localStorage fallback
    async loadHistoricDataFromFirebase() {
        console.log('🔥 Loading historic data from Firebase...');
        
        // Check if Firebase is configured and available
        const firebaseAvailable = await this.checkFirebaseAvailability();
        
        if (!firebaseAvailable) {
            console.log('🔥 Firebase not available, falling back to localStorage only');
            this.updateFirebaseStatus('unavailable');
            
            // Show detailed notification about Firebase unavailability
            const statusEl = document.getElementById('firebase-status');
            if (statusEl) {
                statusEl.innerHTML = '⚠️ Firebase unreachable<br><small>Using localStorage only</small>';
                statusEl.style.color = '#f59e0b';
                statusEl.style.fontSize = '0.9rem';
            }
            
            this.showNotification('🔥 Firebase unreachable - Working offline with localStorage only', 'warning', 5000);
            
            // Also update the Firebase option to show it's offline
            const firebaseOption = document.getElementById('firebase-option');
            if (firebaseOption) {
                firebaseOption.classList.add('offline');
                firebaseOption.title = 'Firebase is currently unreachable - using localStorage';
                
                // Add retry button
                if (!firebaseOption.querySelector('.retry-btn')) {
                    const retryBtn = document.createElement('button');
                    retryBtn.className = 'retry-btn';
                    retryBtn.textContent = '🔄 Retry';
                    retryBtn.style.cssText = `
                        margin-top: 0.5rem;
                        padding: 0.25rem 0.5rem;
                        font-size: 0.8rem;
                        background: #f59e0b;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    `;
                    retryBtn.onclick = () => this.retryFirebaseConnection();
                    firebaseOption.appendChild(retryBtn);
                }
            }
            
            return;
        }
        
        try {
            // Load historic evaluations from Firebase with timeout
            const historicEvaluations = await this.loadFromFirebaseWithTimeout();
            
            if (historicEvaluations && historicEvaluations.length > 0) {
                console.log(`📥 Loaded ${historicEvaluations.length} historic evaluations from Firebase`);
                
                // Merge historic data with local data
                const localEvaluations = this.evaluations || [];
                const mergedEvaluations = this.mergeHistoricAndLocalData(historicEvaluations, localEvaluations);

                // Update the app's evaluations
                this.evaluations = mergedEvaluations;

                // Save merged data to localStorage for offline access
                localStorage.setItem('true_evaluations', JSON.stringify(this.evaluations));

                // Save merged data back to Firebase to ensure global consistency
                // This ensures that if local had newer data, it's now in Firebase for other browsers
                console.log('🔄 Saving merged data back to Firebase to ensure global consistency...');
                try {
                    await window.firebaseStorage.saveEvaluations(this.evaluations);
                    console.log('✅ Merged data saved to Firebase');
                } catch (error) {
                    console.error('❌ Error saving merged data to Firebase:', error);
                }

                // Show notification about historic data
                const newCount = historicEvaluations.length - localEvaluations.length;
                if (newCount > 0) {
                    // Loaded evaluations from Firebase - no notification needed
                } else {
                    // Synced evaluations from Firebase - no notification needed
                }

                // Get storage statistics
                const stats = await window.firebaseStorage.getStorageStats();
                if (stats) {
                    console.log('📊 Firebase Storage Stats:', stats);
                }

                // Automatically enable Firebase sync on first load if not already enabled
                const syncEnabled = localStorage.getItem('firebase_sync_enabled') === 'true';
                if (!syncEnabled) {
                    console.log('🔥 Auto-enabling Firebase sync on first load...');
                    await this.enableFirebaseSync();
                    // Firebase Cloud Sync enabled - no notification needed
                } else {
                    console.log('🔥 Firebase sync already enabled');
                }
                
            } else {
                console.log('🔥 No historic data found in Firebase');
                
                // If Firebase is empty but localStorage has data, ask user if they want to clear it
                const localCount = this.evaluations ? this.evaluations.length : 0;
                if (localCount > 0) {
                    console.log(`🗑️ Firebase is empty but localStorage has ${localCount} entries`);
                    
                    // Clear localStorage to match Firebase state
                    this.evaluations = [];
                    this.saveEvaluations();
                    console.log('🗑️ Cleared localStorage to match empty Firebase');
                    // Firebase cleared - no notification needed
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading historic data from Firebase:', error);
            console.log('🔄 Falling back to localStorage only');
            this.updateFirebaseStatus('error');
            
            // Show detailed error notification
            const statusEl = document.getElementById('firebase-status');
            if (statusEl) {
                statusEl.innerHTML = '❌ Connection failed<br><small>Using localStorage only</small>';
                statusEl.style.color = '#ef4444';
                statusEl.style.fontSize = '0.9rem';
            }
            
            this.showNotification('🔥 Firebase connection failed - Working offline with localStorage only', 'warning', 5000);
            
            // Update Firebase option to show error state
            const firebaseOption = document.getElementById('firebase-option');
            if (firebaseOption) {
                firebaseOption.classList.add('error');
                firebaseOption.title = 'Firebase connection failed - using localStorage';
            }
        }
    }
    
    // Check if Firebase is available and reachable
    async checkFirebaseAvailability() {
        // Check if Firebase storage is loaded
        if (!window.firebaseStorage) {
            console.log('🔥 Firebase storage not available');
            return false;
        }
        
        // Try to initialize Firebase if not already done
        if (!window.firebaseStorage.initialized) {
            let config = localStorage.getItem('firebase_config');
            if (!config && window.firebaseStorage.constructor.getActualConfig) {
                config = JSON.stringify(window.firebaseStorage.constructor.getActualConfig());
            }
            
            if (!config) {
                console.log('🔥 No Firebase config found');
                return false;
            }
            
            try {
                const parsedConfig = JSON.parse(config);
                const initResult = await window.firebaseStorage.initialize(parsedConfig);
                if (!initResult) {
                    console.log('🔥 Firebase initialization failed');
                    return false;
                }
            } catch (error) {
                console.error('❌ Firebase initialization error:', error);
                return false;
            }
        }
        
        // Test connectivity with timeout
        try {
            const isConnected = await Promise.race([
                window.firebaseStorage.checkConnection(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            console.log('🔥 Firebase connectivity check:', isConnected);
            return isConnected;
        } catch (error) {
            console.log('🔥 Firebase connectivity test failed:', error.message);
            return false;
        }
    }
    
    // Load from Firebase with timeout to prevent hanging
    async loadFromFirebaseWithTimeout() {
        return Promise.race([
            window.firebaseStorage.loadEvaluations(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase load timeout')), 10000))
        ]);
    }
    
    // Retry Firebase connection
    async retryFirebaseConnection() {
        console.log('🔄 Retrying Firebase connection...');
        
        // Show retrying status
        const statusEl = document.getElementById('firebase-status');
        if (statusEl) {
            statusEl.innerHTML = '🔄 Retrying connection...<small>Please wait</small>';
            statusEl.style.color = '#3b82f6';
        }
        
        // Retrying Firebase connection - no notification needed
        
        // Remove retry button temporarily
        const firebaseOption = document.getElementById('firebase-option');
        const retryBtn = firebaseOption?.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.style.display = 'none';
        }
        
        // Wait a moment then retry
        setTimeout(async () => {
            const isAvailable = await this.checkFirebaseAvailability();
            
            if (isAvailable) {
                // Success! Load the data
                try {
                    const historicEvaluations = await this.loadFromFirebaseWithTimeout();
                    
                    if (historicEvaluations && historicEvaluations.length > 0) {
                        const localEvaluations = this.evaluations || [];
                        const mergedEvaluations = this.mergeHistoricAndLocalData(historicEvaluations, localEvaluations);
                        this.evaluations = mergedEvaluations;

                        // Save merged data to localStorage
                        localStorage.setItem('true_evaluations', JSON.stringify(this.evaluations));

                        // Save merged data back to Firebase to ensure global consistency
                        try {
                            await window.firebaseStorage.saveEvaluations(this.evaluations);
                            console.log('✅ Merged data saved to Firebase after reconnection');
                        } catch (error) {
                            console.error('❌ Error saving merged data to Firebase:', error);
                        }

                        this.renderLeaderboard();

                        // Firebase reconnected - no notification needed
                    } else {
                        // Firebase reconnected - no notification needed
                    }
                    
                    // Update UI to show connected state
                    this.updateFirebaseStatus('connected');
                    this.forceUpdateFirebaseUI();
                    
                    // Remove retry button and offline/error classes
                    if (firebaseOption) {
                        firebaseOption.classList.remove('offline', 'error');
                        const retryBtn = firebaseOption.querySelector('.retry-btn');
                        if (retryBtn) retryBtn.remove();
                    }
                    
                } catch (error) {
                    console.error('❌ Error loading data after reconnection:', error);
                    this.showNotification('❌ Firebase reconnected but failed to load data', 'warning', 3000);
                    this.updateFirebaseStatus('error');
                }
            } else {
                // Still unavailable
                this.showNotification('❌ Firebase still unreachable', 'warning', 3000);
                this.updateFirebaseStatus('unavailable');
                
                // Show retry button again
                if (retryBtn) {
                    retryBtn.style.display = 'inline-block';
                }
            }
        }, 2000);
    }
    
    // Merge historic Firebase data with local localStorage data
    // This implements bidirectional sync - comparing timestamps and internal data
    mergeHistoricAndLocalData(historicData, localData) {
        console.log(`🔄 Merging ${historicData.length} historic + ${localData.length} local evaluations`);

        if (!Array.isArray(historicData) || !Array.isArray(localData)) {
            console.error('❌ Invalid data for merge:', { historicData, localData });
            return Array.isArray(localData) ? localData : [];
        }

        const merged = new Map();
        let updatedFromLocal = 0;
        let updatedFromHistoric = 0;
        let newFromLocal = 0;
        let newFromHistoric = 0;

        // Step 1: Add all historic data to the map
        historicData.forEach(evaluation => {
            if (evaluation && evaluation.id) {
                merged.set(evaluation.id, evaluation);
                newFromHistoric++;
            }
        });

        // Step 2: Merge local data - compare timestamps and internal data
        localData.forEach(localEval => {
            if (!localEval || !localEval.id) return;

            const historicEval = merged.get(localEval.id);

            if (!historicEval) {
                // New entry only in local - add it
                merged.set(localEval.id, localEval);
                newFromLocal++;
                console.log(`📝 New local entry: ${localEval.modelName}`);
            } else {
                // Entry exists in both - compare and merge
                const historicTime = historicEval.lastModified || historicEval.timestamp || 0;
                const localTime = localEval.lastModified || localEval.timestamp || 0;

                // Compare evalCount to detect changes
                const historicEvalCount = historicEval.evalCount || 1;
                const localEvalCount = localEval.evalCount || 1;

                // Check if internal data has changed (scores, evidence, notes, etc.)
                const scoresChanged = JSON.stringify(historicEval.scores) !== JSON.stringify(localEval.scores);
                const notesChanged = historicEval.notes !== localEval.notes;
                const evidenceChanged = JSON.stringify(historicEval.evidence) !== JSON.stringify(localEval.evidence);

                if (localTime > historicTime || localEvalCount > historicEvalCount || scoresChanged || notesChanged || evidenceChanged) {
                    // Local is newer or has more evaluations or has changed data - use local
                    merged.set(localEval.id, localEval);
                    updatedFromLocal++;
                    console.log(`🔄 Updated from local: ${localEval.modelName} (local time: ${new Date(localTime).toLocaleString()}, historic time: ${new Date(historicTime).toLocaleString()}, evalCount: ${localEvalCount} vs ${historicEvalCount})`);
                } else if (historicTime > localTime || historicEvalCount > localEvalCount) {
                    // Historic is newer or has more evaluations - keep historic (already in map)
                    updatedFromHistoric++;
                    console.log(`🔄 Kept historic: ${historicEval.modelName} (historic time: ${new Date(historicTime).toLocaleString()}, evalCount: ${historicEvalCount})`);
                }
                // If times and counts are equal, keep historic (already in map)
            }
        });

        console.log(`📊 Merge result: ${historicData.length} historic + ${localData.length} local → ${merged.size} total`);
        console.log(`   - New from historic: ${newFromHistoric - updatedFromLocal}`);
        console.log(`   - New from local: ${newFromLocal}`);
        console.log(`   - Updated from local: ${updatedFromLocal}`);
        console.log(`   - Updated from historic: ${updatedFromHistoric}`);

        // Convert map to array
        let result = Array.from(merged.values());

        // Step 3: Deduplicate by model name (case-insensitive)
        // This handles cases where same model has different IDs with different cases
        const beforeDedup = result.length;
        result = this.removeDuplicates(result);
        const afterDedup = result.length;

        if (beforeDedup > afterDedup) {
            console.log(`🔄 Removed ${beforeDedup - afterDedup} duplicate model names after merge`);
        }

        // Sort by timestamp (newest first)
        result.sort((a, b) => {
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            return timeB - timeA;
        });

        return result;
    }
    
    // Firebase Integration Methods
    async checkFirebaseConfig() {
        console.log('🔥 checkFirebaseConfig called');
        
        // First try localStorage (for backward compatibility)
        let savedConfig = localStorage.getItem('firebase_config');
        
        if (!savedConfig) {
            // If no localStorage config, use the built-in config
            console.log('🔥 No localStorage config, using built-in config');
            if (window.firebaseStorage && window.firebaseStorage.constructor.getActualConfig) {
                const builtInConfig = window.firebaseStorage.constructor.getActualConfig();
                savedConfig = JSON.stringify(builtInConfig);
                console.log('🔥 Using built-in Firebase config');
            }
        } else {
            console.log('🔥 Found saved config in localStorage');
        }
        
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                console.log('🔥 Parsed config:', config);
                
                const isValid = window.firebaseStorage && window.firebaseStorage.constructor.validateConfig(config);
                console.log('🔥 Config validation result:', isValid);
                
                if (isValid) {
                    console.log('🔥 Config is valid, initializing Firebase...');
                    await this.initializeFirebase(config);
                } else {
                    console.log('❌ Config validation failed');
                    // Still update UI to show configured but invalid
                    this.forceUpdateFirebaseUI();
                }
            } catch (error) {
                console.error('❌ Error loading Firebase config:', error);
                // Still update UI to show configured but error
                this.forceUpdateFirebaseUI();
            }
        } else {
            console.log('🔥 No Firebase config found');
            // Ensure UI shows not configured
            const statusEl = document.getElementById('firebase-status');
            if (statusEl) {
                statusEl.textContent = 'Not configured';
                statusEl.style.color = '#6b7280';
            }
        }
    }
    
    async initializeFirebase(config) {
        console.log('🔥 initializeFirebase called with:', config);
        
        if (!window.firebaseStorage) {
            console.error('❌ Firebase storage module not loaded');
            return;
        }
        
        console.log('🔥 Starting Firebase initialization...');
        const success = await window.firebaseStorage.initialize(config);
        console.log('🔥 Initialization result:', success);
        
        if (success) {
            console.log('✅ Firebase initialized successfully - updating UI');
            this.updateFirebaseStatus('connected');
            
            const setupBtn = document.getElementById('setup-firebase');
            const toggleBtn = document.getElementById('toggle-sync');
            
            console.log('🔥 Hiding setup button:', setupBtn);
            console.log('🔥 Showing toggle button:', toggleBtn);
            
            if (setupBtn) setupBtn.style.display = 'none';
            if (toggleBtn) toggleBtn.style.display = 'inline-block';
            
            // Check if sync was previously enabled
            const syncEnabled = localStorage.getItem('firebase_sync_enabled') === 'true';
            console.log('🔥 Previous sync state:', syncEnabled);
            if (syncEnabled) {
                this.enableFirebaseSync();
            }
        } else {
            console.error('❌ Firebase initialization failed');
        }
    }
    
    async setupFirebase() {
        // Create modal for Firebase configuration
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 500px;
            width: 90%;
        `;
        
        modal.innerHTML = `
            <h3 style="margin-top: 0;">Firebase Configuration</h3>
            <p style="color: #666; margin-bottom: 1.5rem;">
                Enter your Firebase project configuration. You can get this from your Firebase Console.
            </p>
            <form id="firebase-config-form">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 600;">API Key:</label>
                    <input type="text" name="apiKey" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 600;">Auth Domain:</label>
                    <input type="text" name="authDomain" required placeholder="your-project.firebaseapp.com" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 600;">Database URL:</label>
                    <input type="text" name="databaseURL" required placeholder="https://your-project.firebaseio.com" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 600;">Project ID:</label>
                    <input type="text" name="projectId" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 600;">App ID (optional):</label>
                    <input type="text" name="appId" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button type="submit" style="flex: 1; padding: 0.75rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Connect</button>
                    <button type="button" onclick="this.closest('div').parentElement.parentElement.remove()" style="flex: 1; padding: 0.75rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                </div>
            </form>
            <p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">
                Need help? <a href="https://firebase.google.com/docs/web/setup" target="_blank" style="color: #3b82f6;">View Firebase Setup Guide</a>
            </p>
        `;
        
        document.body.appendChild(modal);
        
        // Handle form submission
        const form = document.getElementById('firebase-config-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const config = {
                apiKey: form.apiKey.value,
                authDomain: form.authDomain.value,
                databaseURL: form.databaseURL.value,
                projectId: form.projectId.value,
                appId: form.appId.value || undefined
            };
            
            // Save config to localStorage
            localStorage.setItem('firebase_config', JSON.stringify(config));
            
            // Initialize Firebase
            await this.initializeFirebase(config);
            
            // Remove modal
            modal.remove();
            
            // Firebase configured - no notification needed
        });
    }
    
    async enableFirebaseSync() {
        console.log('🔥 enableFirebaseSync called');
        console.log('🔥 firebaseStorage exists:', !!window.firebaseStorage);
        console.log('🔥 firebaseStorage.initialized:', window.firebaseStorage?.initialized);
        
        if (!window.firebaseStorage) {
            console.error('❌ firebaseStorage not found');
            this.showNotification('Firebase storage not loaded', 'error');
            return;
        }
        
        if (!window.firebaseStorage.initialized) {
            console.log('🔥 Firebase not initialized, trying to initialize...');
            
            // Try to get config and initialize
            let config = localStorage.getItem('firebase_config');
            if (!config && window.firebaseStorage.constructor.getActualConfig) {
                config = JSON.stringify(window.firebaseStorage.constructor.getActualConfig());
            }
            
            if (config) {
                try {
                    const parsedConfig = JSON.parse(config);
                    console.log('🔥 Attempting to initialize Firebase with config:', parsedConfig);
                    const initResult = await window.firebaseStorage.initialize(parsedConfig);
                    console.log('🔥 Initialization result:', initResult);
                    
                    if (!initResult) {
                        this.showNotification('Failed to initialize Firebase', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('❌ Error initializing Firebase:', error);
                    this.showNotification('Error initializing Firebase', 'error');
                    return;
                }
            } else {
                console.error('❌ No Firebase config found');
                this.showNotification('Please configure Firebase first', 'warning');
                return;
            }
        }
        
        console.log('🔥 Enabling Firebase sync...');
        
        try {
            // Enable sync
            window.firebaseStorage.enableSync((firebaseEvaluations) => {
                // Handle incoming changes from Firebase - merge intelligently
                // Don't blindly replace local data; keep newer timestamps
                const merged = window.firebaseStorage.mergeEvaluations(this.evaluations, firebaseEvaluations);
                this.evaluations = merged;
                this.renderLeaderboard();
                console.log('Evaluations synced from Firebase (merged intelligently)');
            });
            
            console.log('🔥 Sync enabled, uploading current data...');

            // Initial sync - merge and upload local data to Firebase
            // Include all evaluations (both manual and auto-generated) to ensure complete history
            const saveResult = await window.firebaseStorage.saveEvaluations(this.evaluations);
            console.log('🔥 Save result:', saveResult);
            
            localStorage.setItem('firebase_sync_enabled', 'true');
            this.updateFirebaseStatus('syncing');
            
            // Update UI to reflect sync is now active
            this.forceUpdateFirebaseUI();
            
            // Firebase sync enabled - no notification needed
            console.log('✅ Firebase sync enabled successfully');
            
            // Show storage statistics
            setTimeout(async () => {
                const stats = await window.firebaseStorage.getStorageStats();
                if (stats) {
                    console.log('📊 Firebase Storage Stats:', stats);
                    // Syncing evaluations - no notification needed
                }
            }, 2000);
            
            // Set up periodic sync to keep data fresh (every 5 minutes)
            this.setupPeriodicFirebaseSync();
            
        } catch (error) {
            console.error('❌ Error enabling sync:', error);
            this.showNotification('Error enabling Firebase sync', 'error');
        }
    }
    
    setupPeriodicFirebaseSync() {
        // Clear any existing sync interval
        if (this.firebaseSyncInterval) {
            clearInterval(this.firebaseSyncInterval);
        }
        
        // Set up periodic sync every 5 minutes
        this.firebaseSyncInterval = setInterval(async () => {
            try {
                console.log('🔄 Periodic Firebase sync...');
                
                if (window.firebaseStorage && window.firebaseStorage.initialized) {
                    // Sync latest data from Firebase
                    const historicEvaluations = await window.firebaseStorage.loadEvaluations();
                    
                    if (historicEvaluations && historicEvaluations.length > 0) {
                        // Merge with local data
                        this.mergeEvaluations(historicEvaluations);
                        console.log(`📥 Periodic sync: ${historicEvaluations.length} evaluations from Firebase`);
                    }
                } else {
                    console.log('⚠️ Firebase not initialized, skipping periodic sync');
                }
                
            } catch (error) {
                console.error('❌ Error during periodic Firebase sync:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
        
        console.log('⏰ Periodic Firebase sync set up (every 5 minutes)');
    }
    
    async disableFirebaseSync() {
        // Clear periodic sync interval
        if (this.firebaseSyncInterval) {
            clearInterval(this.firebaseSyncInterval);
            this.firebaseSyncInterval = null;
            console.log('⏹️ Periodic Firebase sync stopped');
        }
        
        if (window.firebaseStorage) {
            window.firebaseStorage.disableSync();
        }
        
        localStorage.setItem('firebase_sync_enabled', 'false');
        this.updateFirebaseStatus('connected');
        
        // Update UI to reflect sync is now disabled
        this.forceUpdateFirebaseUI();
        
        // Firebase sync disabled - no notification needed
    }
    
    toggleFirebaseSync() {
        const syncEnabled = localStorage.getItem('firebase_sync_enabled') === 'true';
        if (syncEnabled) {
            this.disableFirebaseSync();
        } else {
            this.enableFirebaseSync();
        }
    }
    
    forceUpdateFirebaseUI() {
        console.log('🔥 forceUpdateFirebaseUI called');
        
        // Check for config in localStorage or built-in
        let savedConfig = localStorage.getItem('firebase_config');
        if (!savedConfig && window.firebaseStorage?.constructor?.getActualConfig) {
            savedConfig = JSON.stringify(window.firebaseStorage.constructor.getActualConfig());
        }
        
        const setupBtn = document.getElementById('setup-firebase');
        const toggleBtn = document.getElementById('toggle-sync');
        const statusEl = document.getElementById('firebase-status');
        
        console.log('🔥 Has saved config:', !!savedConfig);
        console.log('🔥 Setup button:', setupBtn);
        console.log('🔥 Toggle button:', toggleBtn);
        console.log('🔥 Status element:', statusEl);
        
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                console.log('🔥 Parsed config:', config);
                
                const isValid = window.firebaseStorage?.constructor?.validateConfig?.(config);
                console.log('🔥 Config valid:', isValid);
                console.log('🔥 Firebase initialized:', window.firebaseStorage?.initialized);
                
                if (isValid) {
                    // Always update UI elements if they exist
                    if (setupBtn) setupBtn.style.display = 'none';
                    if (toggleBtn) toggleBtn.style.display = 'inline-block';
                    
                    // Check if sync is currently enabled
                    const syncEnabled = localStorage.getItem('firebase_sync_enabled') === 'true';
                    
                    // Update status based on initialization and sync state
                    if (statusEl) {
                        if (window.firebaseStorage?.initialized) {
                            if (syncEnabled) {
                                statusEl.textContent = '✅ Sync Active';
                                statusEl.style.color = '#10b981';
                            } else {
                                statusEl.textContent = 'Connected - Click Enable Sync';
                                statusEl.style.color = '#3b82f6';
                            }
                        } else {
                            statusEl.textContent = 'Configured - Click Enable Sync';
                            statusEl.style.color = '#f59e0b';
                        }
                    }
                    
                    // Set up click handler and update button text
                    if (toggleBtn) {
                        toggleBtn.onclick = () => this.toggleFirebaseSync();
                        toggleBtn.textContent = syncEnabled ? 'Disable Sync' : 'Enable Sync';
                        toggleBtn.style.display = 'inline-block';
                    }
                    
                    // Update persistence options active states
                    const localStorageOption = document.getElementById('local-storage-option');
                    const firebaseOption = document.getElementById('firebase-option');
                    
                    if (localStorageOption && firebaseOption) {
                        if (syncEnabled) {
                            // Firebase is active
                            localStorageOption.classList.remove('active');
                            firebaseOption.classList.add('active');
                            
                            // Update headings
                            localStorageOption.querySelector('h4').textContent = 'Local Storage (Backup)';
                            firebaseOption.querySelector('h4').textContent = 'Firebase Cloud Sync (Active)';
                        } else {
                            // Local storage is active
                            localStorageOption.classList.add('active');
                            firebaseOption.classList.remove('active');
                            
                            // Update headings
                            localStorageOption.querySelector('h4').textContent = 'Local Storage (Active)';
                            firebaseOption.querySelector('h4').textContent = 'Firebase Cloud Sync';
                        }
                    }
                    
                    console.log('✅ Firebase UI updated successfully');
                    return true;
                }
            } catch (error) {
                console.error('❌ Error updating Firebase UI:', error);
            }
        }
        
        console.log('❌ Firebase UI update failed');
        return false;
    }
    
    updateFirebaseStatus(status) {
        const statusEl = document.getElementById('firebase-status');
        const optionEl = document.getElementById('firebase-option');
        
        if (statusEl) {
            // Reset classes
            statusEl.className = '';
            if (optionEl) {
                optionEl.classList.remove('active', 'offline', 'error');
            }
            
            switch(status) {
                case 'connected':
                    statusEl.innerHTML = '🟢 Connected<br><small>Click "Enable Sync" to start</small>';
                    statusEl.style.color = '#10b981';
                    statusEl.style.fontSize = '0.9rem';
                    break;
                case 'syncing':
                    statusEl.innerHTML = '🔄 Syncing enabled<br><small>Data synced across devices</small>';
                    statusEl.style.color = '#10b981';
                    statusEl.style.fontSize = '0.9rem';
                    if (optionEl) {
                        optionEl.classList.add('active');
                        document.getElementById('local-storage-option').classList.remove('active');
                    }
                    break;
                case 'error':
                    statusEl.innerHTML = '❌ Connection error<br><small>Using localStorage only</small>';
                    statusEl.style.color = '#ef4444';
                    statusEl.style.fontSize = '0.9rem';
                    if (optionEl) {
                        optionEl.classList.add('error');
                        optionEl.title = 'Firebase connection failed - using localStorage';
                    }
                    break;
                case 'unavailable':
                    statusEl.innerHTML = '⚠️ Firebase unreachable<br><small>Using localStorage only</small>';
                    statusEl.style.color = '#f59e0b';
                    statusEl.style.fontSize = '0.9rem';
                    if (optionEl) {
                        optionEl.classList.add('offline');
                        optionEl.title = 'Firebase is currently unreachable - using localStorage';
                    }
                    break;
                default:
                    statusEl.innerHTML = '🔴 Not configured<br><small>Local storage only</small>';
                    statusEl.style.color = '#6b7280';
                    statusEl.style.fontSize = '0.9rem';
            }
        }
    }
    
    // Override saveEvaluations to also save to Firebase if enabled
    saveEvaluations() {
        localStorage.setItem('true_evaluations', JSON.stringify(this.evaluations));

        // Also save to Firebase if sync is enabled
        // Include all evaluations (both manual and auto-generated) to ensure complete sync
        if (window.firebaseStorage && window.firebaseStorage.syncEnabled) {
            window.firebaseStorage.saveEvaluations(this.evaluations).catch(error => {
                console.error('Firebase sync error:', error);
            });
        }
    }
    
    // Validate all URLs in model evaluations
    async validateModelUrls() {
        const invalidUrls = [];
        
        // Check popular models
        for (const model of this.popularModels) {
            const isValid = await this.validateUrl(model.url);
            if (!isValid) {
                invalidUrls.push({ model: model.name, url: model.url });
            }
        }
        
        // Check evaluation evidence URLs
        for (const evaluation of this.evaluations) {
            if (evaluation.evidence) {
                for (const [key, url] of Object.entries(evaluation.evidence)) {
                    if (url && !await this.validateUrl(url)) {
                        invalidUrls.push({ 
                            model: evaluation.modelName, 
                            field: key,
                            url: url 
                        });
                    }
                }
            }
        }
        
        if (invalidUrls.length > 0) {
            console.warn('Found invalid URLs:', invalidUrls);
            this.showNotification(`⚠️ Found ${invalidUrls.length} invalid URLs. Check console for details.`, 'warning', 5000);
        }
        
        return invalidUrls;
    }
}

// Initialize app when DOM is ready
function initializeApp() {
    try {
        const loader = document.getElementById('loader');
        const app = document.getElementById('app');
        
        console.log('Initializing TRUE Framework...');
        
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
        
        if (app) {
            app.style.opacity = '1';
            app.style.transition = 'opacity 0.8s ease';
        }
        
        window.app = new TRUEFramework();
        window.app.init();
        
        // Add global debug function to force-enable fields
        window.forceEnableFields = () => {
            console.log('Force enabling all scoring fields...');
            window.app.enableScoringFields();
            
            // Extra force for debugging
            document.querySelectorAll('#scoring-section input').forEach(input => {
                input.disabled = false;
                input.readOnly = false;
                input.removeAttribute('disabled');
                input.removeAttribute('readonly');
                input.style.pointerEvents = 'auto';
                input.style.opacity = '1';
                input.style.cursor = input.type === 'checkbox' ? 'pointer' : 'text';
            });
            
            document.querySelectorAll('#scoring-section textarea').forEach(textarea => {
                textarea.disabled = false;
                textarea.readOnly = false;
                textarea.removeAttribute('disabled');
                textarea.removeAttribute('readonly');
                textarea.style.pointerEvents = 'auto';
                textarea.style.opacity = '1';
                textarea.style.cursor = 'text';
            });
            
            console.log('All fields should now be enabled. Try clicking checkboxes or typing in fields.');
            return 'Fields enabled!';
        };
        
        console.log('TRUE Framework initialized successfully');
        console.log('If fields are not editable, run: forceEnableFields()');
    } catch (error) {
        console.error('Error initializing app:', error);
        // Still hide loader on error
        const loader = document.getElementById('loader');
        const app = document.getElementById('app');
        if (loader) loader.style.display = 'none';
        if (app) app.style.opacity = '1';
        
        // Show error message to user
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 1rem; border-radius: 8px; z-index: 10000;';
        errorMsg.textContent = 'Error loading app. Check console for details.';
        document.body.appendChild(errorMsg);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeApp, 1500);
    });
} else {
    // DOM is already loaded
    setTimeout(initializeApp, 1500);
}