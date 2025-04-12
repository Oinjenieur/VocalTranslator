/**
 * VocalTranslator Application
 * Main JavaScript file for handling the application logic
 */

// Global variables
let recorder = null;
let socket = null;
let isConnected = false;
let isTrainingMode = false;
let currentVoiceModel = null;
let voiceModels = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
    // Check browser compatibility
    if (!AudioRecorder.isRecordingSupported()) {
        showError("Your browser doesn't support audio recording. Please try Chrome, Firefox, or Edge.");
        return;
    }

    // Initialize UI elements
    initializeUIElements();
    
    // Initialize recorder
    try {
        recorder = new AudioRecorder({
            mimeType: 'audio/webm',
            sampleRate: 16000
        });
        
        await recorder.init();
        
        // Set recorder callbacks
        recorder.onStop = handleRecordingComplete;
        recorder.onRecordingStart = () => updateUIState('recording');
        recorder.onError = (error) => showError(`Recording error: ${error.message}`);
        
        // Enable recording button
        document.getElementById('recordButton').disabled = false;
        
        // Initialize WebSocket connection
        initializeWebSocket();
        
        // Load voice models
        loadVoiceModels();
        
    } catch (error) {
        showError(`Initialization error: ${error.message}`);
    }
}

/**
 * Initialize UI elements and event listeners
 */
function initializeUIElements() {
    // Get UI elements
    const recordButton = document.getElementById('recordButton');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const visualizer = document.getElementById('visualizer');
    const trainVoiceButton = document.getElementById('trainVoiceButton');
    const voiceModelSelect = document.getElementById('voiceModelSelect');
    
    // Record button event
    recordButton.addEventListener('click', toggleRecording);
    
    // Train voice button event
    if (trainVoiceButton) {
        trainVoiceButton.addEventListener('click', toggleVoiceTraining);
    }
    
    // Voice model selection event
    if (voiceModelSelect) {
        voiceModelSelect.addEventListener('change', (e) => {
            currentVoiceModel = e.target.value;
        });
    }
    
    // Update UI state initially
    updateUIState('idle');
}

/**
 * Initialize WebSocket connection
 */
function initializeWebSocket() {
    socket = io('http://localhost:5001');

    socket.on('connect', () => {
        console.log('WebSocket (Socket.IO) connected');
        isConnected = true;
        updateUIState('ready');
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        isConnected = false;
        updateUIState('idle');
        setTimeout(initializeWebSocket, 5000);
    });

    socket.on('transcription', (data) => {
        handleSocketMessage(data);
    });

    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        showError('Connection error. Please try again.');
    });
}



/**
 * Handle incoming socket messages
 * @param {Object} data - The message data
 */
function handleSocketMessage(data) {
    if (data.type === 'transcription') {
        // Handle real-time transcription/translation updates
        updateTranscriptionDisplay(data);
    } else if (data.type === 'translation_complete') {
        // Handle completed translation with audio
        handleTranslationComplete(data);
    } else if (data.type === 'voice_model_created') {
        // Handle voice model creation success
        handleVoiceModelCreated(data);
    } else if (data.type === 'error') {
        // Handle error message
        showError(data.message);
    } else if (data.type === 'recording_status') {
        // Update recording status
        updateRecordingStatus(data.status);
    }
}

/**
 * Toggle recording state
 */
function toggleRecording() {
    const recordButton = document.getElementById('recordButton');
    
    if (recorder.isRecording) {
        // Stop recording
        recorder.stop();
        recordButton.innerHTML = '<i class="fas fa-microphone"></i> Start Recording';
        recordButton.classList.remove('btn-danger');
        recordButton.classList.add('btn-primary');
        document.getElementById('visualizer').classList.remove('recording');
        updateUIState('translating');
    } else {
        // Start recording
        recordButton.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
        recordButton.classList.remove('btn-primary');
        recordButton.classList.add('btn-danger');
        document.getElementById('visualizer').classList.add('recording');
        
        // Get language settings
        const sourceLanguage = document.getElementById('sourceLanguage').value;
        const targetLanguage = document.getElementById('targetLanguage').value;
        
        // Prepare for recording
        if (isConnected) {
            // Notify server about recording start
            const startMsg = {
                action: 'start_recording',
                source_lang: sourceLanguage,
                target_lang: targetLanguage,
                voice_model: currentVoiceModel
            };
            
            socket.send(JSON.stringify(startMsg));
            
            // Start recording
            recorder.start();
        } else {
            showError('Not connected to server. Please wait or refresh the page.');
        }
    }
}

/**
 * Toggle voice training mode
 */
function toggleVoiceTraining() {
    const trainButton = document.getElementById('trainVoiceButton');
    const modelNameInput = document.getElementById('voiceModelName');
    console.log("===> toggle", isTrainingMode)
    if (isTrainingMode) {
        // Stop training recording
        recorder.stop();
        trainButton.innerHTML = 'Train Voice Model';
        trainButton.classList.remove('btn-danger');
        trainButton.classList.add('btn-primary');
        document.getElementById('trainingVisualizer').classList.remove('recording');
        isTrainingMode = false;
        
        // Model name validation
        const modelName = modelNameInput.value.trim();
        if (!modelName) {
            showError('Please enter a name for your voice model.');
            return;
        }
        
        updateUIState('processing');
    } else {
        // Start training mode
        trainButton.innerHTML = 'Stop Recording';
        trainButton.classList.remove('btn-primary');
        trainButton.classList.add('btn-danger');
        document.getElementById('trainingVisualizer').classList.add('recording');
        isTrainingMode = true;
        
        // Start recording for training
        recorder.start();
    }
}

/**
 * Handle completed recording
 * @param {Blob} audioBlob - The recorded audio as a blob
 */
function handleRecordingComplete(audioBlob) {
    console.log("===>", isTrainingMode)
    console.log("====? here", audioBlob)
    if (isTrainingMode) {
        // Handle voice model training
        submitVoiceTraining(audioBlob);
    } else {
        // Handle translation
        submitAudioForTranslation(audioBlob);
    }
}

/**
 * Submit audio for translation
 * @param {Blob} audioBlob - The audio blob to process
 */
function submitAudioForTranslation(audioBlob) {
    // If using WebSockets, send the audio for real-time processing
    if (isConnected && socket) {
        // Convert blob to array buffer for sending over WebSocket
        const reader = new FileReader();
        reader.onload = function() {
            const arrayBuffer = this.result;
            
            // Send the audio data to the server
            socket.send(arrayBuffer);
        };
        reader.readAsArrayBuffer(audioBlob);
    } else {
        // Fallback to standard fetch API
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('source_lang', document.getElementById('sourceLanguage').value);
        formData.append('target_lang', document.getElementById('targetLanguage').value);
        
        if (currentVoiceModel) {
            formData.append('voice_model', currentVoiceModel);
        }
        
        fetch('/translate_audio', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
                updateUIState('ready');
            } else {
                // Handle successful translation
                const translationData = {
                    type: 'translation_complete',
                    original_text: data.original_text,
                    translated_text: data.translated_text,
                    audio_url: data.audio_url
                };
                handleTranslationComplete(translationData);
            }
        })
        .catch(error => {
            showError(`Error submitting audio: ${error.message}`);
            updateUIState('ready');
        });
    }
}

/**
 * Submit audio for voice model training
 * @param {Blob} audioBlob - The audio sample for training
 */
function submitVoiceTraining(audioBlob) {
    const modelName = document.getElementById('voiceModelName').value.trim();
    
    if (!modelName) {
        showError('Please enter a name for your voice model.');
        updateUIState('ready');
        return;
    }
    
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('model_name', modelName);
    
    fetch('/train_voice_model', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
        } else {
            // Handle successful voice model creation
            handleVoiceModelCreated(data);
        }
        updateUIState('ready');
    })
    .catch(error => {
        showError(`Error training voice model: ${error.message}`);
        updateUIState('ready');
    });
}

/**
 * Update the transcription display with real-time results
 * @param {Object} data - The transcription data
 */
function updateTranscriptionDisplay(data) {
    const textDisplay = document.getElementById('textDisplay');
    
    // Create or update transcription elements
    const transcriptionDiv = document.createElement('div');
    transcriptionDiv.className = 'transcription-item';
    
    // Original text (optional display)
    if (data.original_text) {
        const originalTextEl = document.createElement('div');
        originalTextEl.className = 'original-text';
        originalTextEl.textContent = data.original_text;
        transcriptionDiv.appendChild(originalTextEl);
    }
    
    // Translated text
    const translatedTextEl = document.createElement('div');
    translatedTextEl.className = 'translated-text';
    translatedTextEl.textContent = data.translated_text;
    transcriptionDiv.appendChild(translatedTextEl);
    
    // Add to display
    textDisplay.appendChild(transcriptionDiv);
    
    // Scroll to bottom
    textDisplay.scrollTop = textDisplay.scrollHeight;
}

/**
 * Handle completed translation with audio
 * @param {Object} data - The translation data including audio URL
 */
function handleTranslationComplete(data) {
    // Update text display first
    updateTranscriptionDisplay(data);
    
    // Play the translated audio if available
    if (data.audio_url) {
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.src = data.audio_url;
        audioPlayer.play();
    }
    
    // Update UI state
    updateUIState('ready');
}

/**
 * Handle voice model creation success
 * @param {Object} data - The voice model data
 */
function handleVoiceModelCreated(data) {
    // Show success message
    showMessage(`Voice model "${data.model_name}" created successfully!`);
    
    // Update voice models list
    loadVoiceModels();
    
    // Select the newly created model
    currentVoiceModel = data.model_name;
    
    // Reset the model name input
    document.getElementById('voiceModelName').value = '';
}

/**
 * Load available voice models from the server
 */
function loadVoiceModels() {
    fetch('/voices')
        .then(response => response.json())
        .then(data => {
            voiceModels = data.voices || [];
            updateVoiceModelsList();
        })
        .catch(error => {
            console.error('Error loading voice models:', error);
        });
}

/**
 * Update the voice models dropdown list
 */
function updateVoiceModelsList() {
    const voiceModelSelect = document.getElementById('voiceModelSelect');
    
    // Clear existing options
    voiceModelSelect.innerHTML = '<option value="">Select a voice model</option>';
    
    // Add voice models
    voiceModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        voiceModelSelect.appendChild(option);
    });
    
    // Select current model if it exists
    if (currentVoiceModel && voiceModels.includes(currentVoiceModel)) {
        voiceModelSelect.value = currentVoiceModel;
    }
    
    // Update voice models container if it exists
    updateVoiceModelsContainer();
}

/**
 * Update the voice models container with cards for each model
 */
function updateVoiceModelsContainer() {
    const container = document.getElementById('voiceModelsContainer');
    if (!container) return;
    
    // Clear existing cards
    container.innerHTML = '';
    
    if (voiceModels.length === 0) {
        container.innerHTML = '<p class="text-muted">No voice models available. Train your first voice model to get started.</p>';
        return;
    }
    
    // Create a card for each voice model
    voiceModels.forEach(model => {
        const card = document.createElement('div');
        card.className = 'voice-model-item';
        
        // Model name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'voice-model-name';
        nameSpan.textContent = model;
        
        // Controls
        const controls = document.createElement('div');
        controls.className = 'voice-model-controls';
        
        // Listen button
        const listenBtn = document.createElement('button');
        listenBtn.className = 'btn btn-sm btn-outline-primary';
        listenBtn.innerHTML = '<i class="fas fa-play"></i>';
        listenBtn.title = 'Listen to sample';
        listenBtn.onclick = () => playVoiceSample(model);
        
        // Use button
        const useBtn = document.createElement('button');
        useBtn.className = 'btn btn-sm btn-outline-success';
        useBtn.innerHTML = '<i class="fas fa-check"></i>';
        useBtn.title = 'Use this voice';
        useBtn.onclick = () => {
            currentVoiceModel = model;
            document.getElementById('voiceModelSelect').value = model;
            showMessage(`Now using voice model: ${model}`);
        };
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-outline-danger';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete this voice model';
        deleteBtn.onclick = () => deleteVoiceModel(model);
        
        // Add buttons to controls
        controls.appendChild(listenBtn);
        controls.appendChild(useBtn);
        controls.appendChild(deleteBtn);
        
        // Add elements to card
        card.appendChild(nameSpan);
        card.appendChild(controls);
        
        // Add card to container
        container.appendChild(card);
    });
}

/**
 * Play a sample of a voice model
 * @param {string} modelName - The name of the voice model to sample
 */
function playVoiceSample(modelName) {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = `/sample_voice/${modelName}`;
    audioPlayer.play();
}

/**
 * Delete a voice model
 * @param {string} modelName - The name of the voice model to delete
 */
function deleteVoiceModel(modelName) {
    if (!confirm(`Are you sure you want to delete the voice model "${modelName}"?`)) {
        return;
    }
    
    fetch(`/delete_voice_model/${modelName}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
        } else {
            showMessage(`Voice model "${modelName}" deleted successfully.`);
            
            // If the deleted model was the current one, reset current model
            if (currentVoiceModel === modelName) {
                currentVoiceModel = null;
                document.getElementById('voiceModelSelect').value = '';
            }
            
            // Reload voice models
            loadVoiceModels();
        }
    })
    .catch(error => {
        showError(`Error deleting voice model: ${error.message}`);
    });
}

/**
 * Update the UI state based on the current application state
 * @param {string} state - The state to update to ('idle', 'recording', 'translating', 'processing', 'ready')
 */
function updateUIState(state) {
    const statusIndicator = document.getElementById('statusIndicator');
    const recordButton = document.getElementById('recordButton');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // Remove all status classes
    statusIndicator.className = 'status-indicator';
    const statusDot = statusIndicator.querySelector('.status-dot');
    statusDot.className = 'status-dot';
    
    // Update based on state
    switch (state) {
        case 'idle':
            statusDot.classList.add('idle');
            statusIndicator.querySelector('.status-text').textContent = 'Disconnected';
            recordButton.disabled = true;
            loadingSpinner.style.display = 'none';
            break;
            
        case 'ready':
            statusDot.classList.add('ready');
            statusIndicator.querySelector('.status-text').textContent = 'Ready';
            recordButton.disabled = false;
            loadingSpinner.style.display = 'none';
            break;
            
        case 'recording':
            statusDot.classList.add('recording');
            statusIndicator.querySelector('.status-text').textContent = 'Recording...';
            recordButton.disabled = false;
            loadingSpinner.style.display = 'none';
            break;
            
        case 'translating':
            statusDot.classList.add('translating');
            statusIndicator.querySelector('.status-text').textContent = 'Translating...';
            recordButton.disabled = true;
            loadingSpinner.style.display = 'block';
            break;
            
        case 'processing':
            statusDot.classList.add('translating');
            statusIndicator.querySelector('.status-text').textContent = 'Processing...';
            recordButton.disabled = true;
            loadingSpinner.style.display = 'block';
            break;
    }
}

/**
 * Update recording status based on server feedback
 * @param {string} status - The recording status
 */
function updateRecordingStatus(status) {
    const recordingStatus = document.getElementById('recordingStatus');
    
    if (status === 'recording') {
        recordingStatus.textContent = 'Recording in progress...';
        recordingStatus.className = 'text-danger';
    } else if (status === 'processing') {
        recordingStatus.textContent = 'Processing audio...';
        recordingStatus.className = 'text-warning';
    } else {
        recordingStatus.textContent = '';
    }
}

/**
 * Show an error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

/**
 * Show a success/info message to the user
 * @param {string} message - The message to display
 */
function showMessage(message) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 3000);
} 