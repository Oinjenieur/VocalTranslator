from flask import Flask, render_template, request, jsonify, send_file
from flask_socketio import SocketIO, emit
import speech_recognition as sr
from googletrans import Translator
import os
import uuid
import tempfile
import json
import torch
import numpy as np
import librosa
import soundfile as sf
from langdetect import detect
from gtts import gTTS
import logging
import time
from TTS.api import TTS
import shutil
from pathlib import Path

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
logging.basicConfig(level=logging.INFO)

# Initialize the recognizer
recognizer = sr.Recognizer()
# Initialize the translator
translator = Translator()

# Supported languages with ISO codes
LANGUAGES = {
    'en': 'English',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh-cn': 'Chinese',
    'ar': 'Arabic'
}

# Path for voice models storage
VOICE_MODELS_PATH = os.path.join(os.path.dirname(__file__), "voice_models")
os.makedirs(VOICE_MODELS_PATH, exist_ok=True)

# Initialize TTS system
try:
    tts_system = TTS("tts_models/en/ljspeech/tacotron2-DDC")
    logging.info("TTS system initialized successfully")
except Exception as e:
    logging.error(f"Error initializing TTS system: {e}")
    tts_system = None

# Store user voice models
user_voice_models = {}

@app.route('/')
def index():
    return render_template('index.html', languages=LANGUAGES)

@app.route('/voices')
def list_voices():
    """List available trained voice models"""
    voices = []
    if os.path.exists(VOICE_MODELS_PATH):
        voices = [f for f in os.listdir(VOICE_MODELS_PATH) if os.path.isdir(os.path.join(VOICE_MODELS_PATH, f))]
    return jsonify({"voices": voices})

@socketio.on('start_recording')
def handle_start_recording(data):
    """Handle start of audio recording"""
    logging.info("Start recording")
    emit('recording_started', {'status': 'recording'})

@socketio.on('audio_data')
def handle_audio_data(data):
    """Process audio data for real-time transcription"""
    try:
        audio_data = data.get('audio')
        source_lang = data.get('source_lang', 'auto')
        target_lang = data.get('target_lang', 'en')
        
        # Save the audio data to a temporary file
        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_audio.write(audio_data)
        temp_audio.close()
        
        # Process audio for transcription
        with sr.AudioFile(temp_audio.name) as source:
            audio = recognizer.record(source)
            
            # Speech recognition
            if source_lang == 'auto':
                text = recognizer.recognize_google(audio)
                detected_lang = detect(text)
                source_lang = detected_lang
            else:
                text = recognizer.recognize_google(audio, language=source_lang)
            
            # Translation
            if source_lang != target_lang:
                translation = translator.translate(text, src=source_lang, dest=target_lang)
                translated_text = translation.text
            else:
                translated_text = text
            
            # Send the transcription and translation in real-time
            emit('transcription', {
                'original_text': text,
                'translated_text': translated_text,
                'source_lang': source_lang
            })
            
            # Clean up
            os.unlink(temp_audio.name)
            
    except sr.UnknownValueError:
        emit('error', {'message': 'Could not understand audio'})
    except sr.RequestError as e:
        emit('error', {'message': f'Error from speech recognition service: {e}'})
    except Exception as e:
        logging.error(f"Error processing audio: {str(e)}")
        emit('error', {'message': f'Error processing audio: {str(e)}'})

@app.route('/translate_audio', methods=['POST'])
def translate_audio():
    """Process complete audio file for translation and voice cloning"""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    source_lang = request.form.get('source_lang', 'auto')
    target_lang = request.form.get('target_lang', 'en')
    voice_model = request.form.get('voice_model', None)
    
    # Save the audio file temporarily
    temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    audio_file.save(temp_audio.name)
    temp_audio.close()
    
    try:
        with sr.AudioFile(temp_audio.name) as source:
            audio_data = recognizer.record(source)
            
            # Speech recognition
            if source_lang == 'auto':
                text = recognizer.recognize_google(audio_data)
                detected_lang = detect(text)
                source_lang = detected_lang
            else:
                text = recognizer.recognize_google(audio_data, language=source_lang)
            
            # Translation
            if source_lang != target_lang:
                translation = translator.translate(text, src=source_lang, dest=target_lang)
                translated_text = translation.text
            else:
                translated_text = text
            
            # Generate translated audio output
            output_filename = f"static/audio/output_{uuid.uuid4()}.wav"
            os.makedirs(os.path.dirname(output_filename), exist_ok=True)
            
            if voice_model and voice_model in user_voice_models and tts_system:
                # Use voice cloning model if available
                voice_model_path = os.path.join(VOICE_MODELS_PATH, voice_model)
                try:
                    # Use the TTS system with the cloned voice
                    tts_system.tts_to_file(
                        text=translated_text,
                        file_path=output_filename,
                        speaker_wav=os.path.join(voice_model_path, "reference.wav"),
                        language=target_lang
                    )
                except Exception as voice_error:
                    logging.error(f"Voice cloning error: {voice_error}")
                    # Fallback to standard TTS
                    tts = gTTS(text=translated_text, lang=target_lang)
                    tts.save(output_filename)
            else:
                # Use standard TTS
                tts = gTTS(text=translated_text, lang=target_lang)
                tts.save(output_filename)
            
            return jsonify({
                'original_text': text,
                'translated_text': translated_text,
                'source_lang': source_lang,
                'target_lang': target_lang,
                'audio_url': '/' + output_filename
            })
    
    except sr.UnknownValueError:
        return jsonify({'error': 'Could not understand audio'}), 400
    except sr.RequestError as e:
        return jsonify({'error': f'Error from speech recognition service: {e}'}), 500
    except Exception as e:
        logging.error(f"Error: {str(e)}")
        return jsonify({'error': f'Error processing: {str(e)}'}), 500
    finally:
        # Clean up
        if os.path.exists(temp_audio.name):
            os.unlink(temp_audio.name)

@app.route('/train_voice_model', methods=['POST'])
def train_voice_model():
    """Train a voice model for the user"""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio training file provided'}), 400
    
    audio_file = request.files['audio']
    model_name = request.form.get('model_name', f"voice_model_{uuid.uuid4()}")
    
    # Create directory for this voice model
    model_dir = os.path.join(VOICE_MODELS_PATH, model_name)
    os.makedirs(model_dir, exist_ok=True)
    
    # Save reference audio
    reference_path = os.path.join(model_dir, "reference.wav")
    audio_file.save(reference_path)
    
    try:
        # Process audio for voice modeling
        y, sr = librosa.load(reference_path, sr=22050)
        
        # Normalize audio
        y = librosa.util.normalize(y)
        sf.write(reference_path, y, sr)
        
        # Store model reference
        user_voice_models[model_name] = {
            'path': model_dir,
            'created': time.time()
        }
        
        # Create model metadata
        with open(os.path.join(model_dir, "metadata.json"), 'w') as f:
            json.dump({
                'created': time.strftime('%Y-%m-%d %H:%M:%S'),
                'sample_rate': sr,
                'duration': librosa.get_duration(y=y, sr=sr)
            }, f)
        
        return jsonify({
            'success': True,
            'model_name': model_name,
            'message': 'Voice model trained successfully'
        })
        
    except Exception as e:
        # Clean up on error
        if os.path.exists(model_dir):
            shutil.rmtree(model_dir)
        logging.error(f"Error training voice model: {str(e)}")
        return jsonify({'error': f'Error training voice model: {str(e)}'}), 500

@app.route('/delete_voice_model/<model_name>', methods=['DELETE'])
def delete_voice_model(model_name):
    """Delete a voice model"""
    model_dir = os.path.join(VOICE_MODELS_PATH, model_name)
    
    if not os.path.exists(model_dir):
        return jsonify({'error': 'Voice model not found'}), 404
    
    try:
        # Remove the model directory
        shutil.rmtree(model_dir)
        
        # Remove from dictionary if present
        if model_name in user_voice_models:
            del user_voice_models[model_name]
            
        return jsonify({
            'success': True,
            'message': f'Voice model {model_name} deleted successfully'
        })
        
    except Exception as e:
        logging.error(f"Error deleting voice model: {str(e)}")
        return jsonify({'error': f'Error deleting voice model: {str(e)}'}), 500

@app.route('/sample_voice/<model_name>', methods=['GET'])
def get_voice_sample(model_name):
    """Get a sample of the trained voice"""
    model_dir = os.path.join(VOICE_MODELS_PATH, model_name)
    reference_path = os.path.join(model_dir, "reference.wav")
    
    if not os.path.exists(reference_path):
        return jsonify({'error': 'Voice sample not found'}), 404
        
    return send_file(reference_path, mimetype='audio/wav')

@socketio.on('disconnect')
def handle_disconnect():
    logging.info('Client disconnected')

if __name__ == '__main__':
    # Create folders if they don't exist
    os.makedirs('static/audio', exist_ok=True)
    os.makedirs(VOICE_MODELS_PATH, exist_ok=True)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True) 