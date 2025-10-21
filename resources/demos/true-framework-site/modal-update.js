// This is the updated viewEvaluation function that should replace the existing one in app.js
// It makes the modal read-only by default with an Edit button to enable editing

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
                Total Score: <span id="modal-total-score">${evaluation.totalScore}</span>/30 | 
                Tier: <span id="modal-tier" class="tier-badge ${evaluation.tier.toLowerCase()}" style="display: inline-block; padding: 0.25rem 1rem; margin-left: 0.5rem;">${evaluation.tier}</span>
            </div>
        </div>
        
        <div class="modal-section">
            <h3>📊 Score Breakdown</h3>
            <div class="score-grid">
                <div class="score-item">
                    <div class="score-label">Transparent</div>
                    <div style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">
                        <span id="modal-score-transparent">${dimScores.transparent}</span>/10
                    </div>
                </div>
                <div class="score-item">
                    <div class="score-label">Reproducible</div>
                    <div style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">
                        <span id="modal-score-reproducible">${dimScores.reproducible}</span>/10
                    </div>
                </div>
                <div class="score-item">
                    <div class="score-label">Understandable</div>
                    <div style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">
                        <span id="modal-score-understandable">${dimScores.understandable}</span>/6
                    </div>
                </div>
                <div class="score-item">
                    <div class="score-label">Executable</div>
                    <div style="font-size: 1.5rem; color: var(--primary-color); font-weight: bold;">
                        <span id="modal-score-executable">${dimScores.executable}</span>/4
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
            <p><strong>Evaluation Date:</strong> ${new Date(evaluation.timestamp).toLocaleString()}</p>
            ${evaluation.modified && evaluation.modifiedDate ? `
                <div style="background: linear-gradient(90deg, rgba(251, 191, 36, 0.1) 0%, transparent 100%); padding: 0.75rem; border-left: 3px solid #fbbf24; border-radius: 6px; margin-top: 0.5rem;">
                    <p style="margin: 0; color: #fbbf24; font-weight: 600;">
                        ✏️ Manually Modified: ${new Date(evaluation.modifiedDate).toLocaleString()}
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
                <h3>✅ Detailed Criteria ${editMode ? '(Editing)' : ''}</h3>
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
        <div id="modal-actions" class="modal-actions" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid var(--border); display: flex; gap: 1rem; flex-wrap: wrap;">
            ${editMode ? `
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; width: 100%; justify-content: center;">
                    <button onclick="app.saveModalChanges();" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: white; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                        💾 Save Changes
                    </button>
                    <button onclick="app.cancelModalChanges();" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; color: white; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                        ❌ Cancel
                    </button>
                </div>
            ` : `
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; width: 100%; justify-content: center;">
                    <button onclick="app.enableModalEdit('${id}');" style="padding: 0.875rem 2rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: white; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                        ✏️ Edit Evaluation
                    </button>
                    <button onclick="app.exportSingleEvaluation('${evaluation.id}');" style="padding: 0.875rem 2rem; background: white; border: 2px solid var(--primary-color); color: var(--primary-color); border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                        📥 Export JSON
                    </button>
                    <button onclick="app.hideModal();" style="padding: 0.875rem 2rem; background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        Close
                    </button>
                </div>
            `}
        </div>
    `;
    
    // Show modal
    this.showModal(modalHTML);
}

// Add this new function to enable edit mode
enableModalEdit(id) {
    this.viewEvaluation(id, true);
}

// Update the cancelModalChanges function
cancelModalChanges() {
    if (!this.currentModalId || !this.modalOriginalState) return;
    
    // Restore original data
    const index = this.evaluations.findIndex(e => e.id === this.currentModalId);
    if (index !== -1) {
        this.evaluations[index] = JSON.parse(JSON.stringify(this.modalOriginalState));
    }
    
    // Re-render the modal in read-only mode
    this.viewEvaluation(this.currentModalId, false);
    
    this.showNotification('❌ Changes cancelled', 'info', 2000);
}

// Update saveModalChanges to return to read-only mode after saving
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
        evaluation.modified = true;
        evaluation.modifiedDate = Date.now();
    }
    
    // Save to storage
    this.saveEvaluations();
    this.renderLeaderboard();
    
    // Reset change tracking
    this.modalHasChanges = false;
    this.modalOriginalState = JSON.parse(JSON.stringify(evaluation));
    
    // Re-render the modal in read-only mode
    this.viewEvaluation(this.currentModalId, false);
    
    this.showNotification('✅ Changes saved successfully', 'success', 3000);
}