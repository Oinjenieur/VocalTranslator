/**
 * AudioRecorder Class
 * Handles the audio recording functionality for the application
 */
class AudioRecorder {
    constructor(options = {}) {
        this.options = {
            mimeType: 'audio/webm',
            audioChannels: 1,
            sampleRate: 44100,
            bufferSize: 4096,
            ...options
        };
        
        this.mediaRecorder = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.audioProcessor = null;
        this.onDataAvailable = null;
        this.onStop = null;
        this.onError = null;
        this.onRecordingStart = null;
        this.onAudioProcess = null;
    }

    /**
     * Initializes the audio recording capabilities.
     * @returns {Promise} A promise that resolves when initialization is complete.
     */
    async init() {
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
        }

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: this.options.audioChannels,
                    sampleRate: this.options.sampleRate
                }
            });
            
            this.mediaStream = stream;
            this.initRecorder();
            
            return this;
        } catch (error) {
            if (this.onError) this.onError(error);
            throw error;
        }
    }

    /**
     * Initializes the MediaRecorder object.
     */
    initRecorder() {
        // Create audio source from the media stream
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // Create a script processor node to handle audio processing
        this.audioProcessor = this.audioContext.createScriptProcessor(
            this.options.bufferSize, 
            this.options.audioChannels, 
            this.options.audioChannels
        );
        
        // Connect the processor to the audio context destination
        source.connect(this.audioProcessor);
        this.audioProcessor.connect(this.audioContext.destination);
        
        // Handle audio processing
        this.audioProcessor.onaudioprocess = (e) => {
            if (!this.isRecording) return;
            
            // Send the raw audio data to the callback if defined
            if (this.onAudioProcess) {
                const inputBuffer = e.inputBuffer;
                const audioData = inputBuffer.getChannelData(0);
                this.onAudioProcess(audioData);
            }
        };
        
        // Create the media recorder
        try {
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: this.options.mimeType
            });
        } catch (e) {
            // Fallback to default mime type if the specified one is not supported
            this.mediaRecorder = new MediaRecorder(this.mediaStream);
        }
        
        // Set up event handlers
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
                if (this.onDataAvailable) {
                    this.onDataAvailable(event.data);
                }
            }
        };
        
        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
            this.audioChunks = [];
            if (this.onStop) {
                this.onStop(blob);
            }
        };
    }

    /**
     * Starts recording audio.
     */
    start() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.startTime = Date.now();
        this.audioChunks = [];
        
        this.mediaRecorder.start(100);  // Collect data every 100ms
        
        if (this.onRecordingStart) {
            this.onRecordingStart();
        }
    }

    /**
     * Stops recording audio.
     */
    stop() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    /**
     * Closes the audio recorder and releases resources.
     */
    close() {
        this.stop();
        
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * Gets the current recording duration in milliseconds.
     * @returns {number} Recording duration in ms.
     */
    getDuration() {
        if (!this.isRecording || !this.startTime) return 0;
        return Date.now() - this.startTime;
    }

    /**
     * Checks if the browser supports recording with the specified options.
     * @returns {boolean} True if recording is supported.
     */
    static isRecordingSupported() {
        return !!(navigator.mediaDevices && 
                 navigator.mediaDevices.getUserMedia && 
                 window.MediaRecorder);
    }
} 