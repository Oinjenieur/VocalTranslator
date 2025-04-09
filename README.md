# VocalTranslator

A real-time speech translation application with voice cloning capabilities. This application enables audio-to-audio and audio-to-text translation in multiple languages while preserving the user's voice characteristics in the translated output.

## Features

- Real-time audio-to-audio translation
- Simultaneous audio-to-text transcription
- Voice cloning with custom voice model training and reuse
- Support for multiple languages
- Intuitive and user-friendly interface
- WebSocket-based real-time communication

## Requirements

- Python 3.9+ (3.10 recommended)
- FFmpeg (for audio processing)
- GPU recommended for optimal performance with voice cloning

## Installation

### Windows

1. Clone the repository:
   ```
   git clone https://github.com/Oinjenieur/VocalTranslator.git
   cd VocalTranslator
   ```

2. Run the setup script to install dependencies:
   ```
   setup.bat
   ```

3. Start the application:
   ```
   run.bat
   ```

4. Access the application in your browser at `http://localhost:5000`

### Linux/macOS

1. Clone the repository:
   ```
   git clone https://github.com/Oinjenieur/VocalTranslator.git
   cd VocalTranslator
   ```

2. Make the install script executable and run it:
   ```
   chmod +x install.sh
   ./install.sh
   ```

3. Activate the virtual environment:
   ```
   source venv/bin/activate
   ```

4. Start the application:
   ```
   python app.py
   ```

5. Access the application in your browser at `http://localhost:5000`

### Docker (Recommended for Production)

1. Build and run using Docker Compose:
   ```
   docker-compose up -d
   ```

2. Access the application in your browser at `http://localhost:5000`

## Usage Instructions

### Training Your Voice Model

1. In the "Voice Training" section, enter a name for your voice model.
2. Click "Train Voice Model" and start speaking clearly for at least 30 seconds.
3. Click the button again to stop recording and process your voice model.
4. Once training completes, your voice model will be available for selection.

### Translating Speech

1. Select the source language (or use auto-detect) and target language.
2. Choose a voice model from the dropdown (if you've created one).
3. Click "Start Recording" and speak in the source language.
4. Click "Stop Recording" when finished.
5. The application will process your speech, display the original and translated text, and play back the translation in your voice.

## Deployment Options

### Docker Hub

Pre-built Docker images are available at [Docker Hub](https://hub.docker.com/u/oinjedock):

```
docker pull oinjedock/vocaltranslator:latest
docker run -p 5000:5000 oinjedock/vocaltranslator:latest
```

### Local Deployment

For local deployment without Docker, use the provided installation scripts:
- Windows: `setup.bat`
- Linux/macOS: `install.sh`

### Production Deployment

For production environments, consider:
1. Using Docker with proper volume mapping for voice models
2. Setting up a reverse proxy (Nginx/Apache) for HTTPS
3. Using a production WSGI server like Gunicorn

## Technical Architecture

- **Frontend**: HTML, CSS, JavaScript with WebSockets for real-time communication
- **Backend**: Flask with Flask-SocketIO for real-time processing
- **Speech Recognition**: SpeechRecognition library with Google's API
- **Machine Translation**: Google Translate API via googletrans
- **Text-to-Speech**: TTS (Coqui) with voice cloning capabilities
- **Voice Cloning**: Custom voice embedding extraction and TTS conditioning

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 