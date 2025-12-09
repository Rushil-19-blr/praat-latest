# AWAAZ Tech Stack & Services

A comprehensive list of all technologies, algorithms, and services used in the AWAAZ Voice Stress Analysis application.

---

## 🎤 Voice/Audio Analysis

### Core Libraries (Python Backend)

- **Praat/Parselmouth** `v0.4.4` - Core voice analysis engine for extracting acoustic features
- **SciPy** `v1.11.4` - Signal processing (periodogram, spectral analysis)
- **NumPy** `v1.24.3` - Numerical computations for audio feature extraction

### Acoustic Features Extracted

**Pitch & Voice Quality:**
- **F0 (Pitch)** - Fundamental frequency using `to_pitch_ac()` method (75Hz - 600Hz range)
- **Jitter** - Voice perturbation/instability (local jitter %)
- **Shimmer** - Amplitude perturbation (local shimmer %)
- **Formants (F1, F2)** - Vocal tract characteristics using Burg method

**Spectral Features:**
- **RMS** - Root Mean Square (energy/loudness level)
- **ZCR** - Zero Crossing Rate (noise/sibilance indicator)
- **Spectral Centroid** - Voice brightness measure
- **Spectral Flatness** - Tonality measure (geometric/arithmetic mean ratio)
- **MFCCs** - 13 Mel-Frequency Cepstral Coefficients (custom FFT implementation)

**Temporal Features:**
- **Speech Rate** - Words per minute (estimated from voiced frames)

---

## 🤖 AI & Generative Services

### Google Gemini AI

**Live Audio Model:**
- Model: `gemini-2.5-flash-native-audio-preview-09-2025`
- Voice: `Zephyr` (prebuilt neural voice)
- Purpose: Real-time AI therapy conversations, stress analysis
- Features: Bidirectional audio streaming, input/output transcription

**Standard API:**
- Package: `@google/generative-ai`
- Purpose: Report generation, personalized suggestions, AI summaries

---

## 🗣️ Text-to-Speech (TTS)

**Priority Order:**
1. **Google Translate TTS** (Primary) - Free, no API key required
2. **Microsoft Edge TTS** (Backup) - Neural voices, free
3. **Browser SpeechSynthesis API** (Fallback) - Native browser TTS

---

## 💬 Real-Time Messaging

- **Stream Chat SDK** `v9.25.0` - Real-time chat functionality
- **Stream Chat React** `v13.10.2` - React components for chat UI
- **Stream Chat Python** `v4.26.0` - Backend token generation

---

## 🖥️ Frontend Stack

### Core
- **React** `v18.2.0` - UI framework
- **TypeScript** `~5.8.2` - Type-safe JavaScript
- **Vite** `^6.2.0` - Build tool & dev server

### Styling & UI
- **TailwindCSS** `^4.1.16` - Utility-first CSS
- **Radix UI** - Accessible UI primitives (checkbox, label, slot)
- **Lucide React** `^0.548.0` - Icons
- **class-variance-authority** `^0.7.1` - Component variants
- **clsx** & **tailwind-merge** - Class utilities

### Animation
- **Framer Motion** `^11.2.10` - UI animations
- **Motion** `^12.23.24` - Additional motion effects
- **Canvas Confetti** `^1.9.4` - Celebration effects

### Utilities
- **date-fns** `^4.1.0` - Date utilities
- **jose** `^6.1.0` - JWT handling
- **OGL** `^1.0.11` - WebGL library

---

## ⚙️ Backend Stack

- **Python 3.x** - Backend language
- **Flask** `v3.0.0` - API server
- **Flask-CORS** `v4.0.0` - Cross-origin requests
- **Gunicorn** `v21.2.0` - Production WSGI server
- **python-dotenv** `v1.0.0` - Environment variables

---

## ☁️ Deployment

- **Vercel** - Frontend hosting
- **Render** - Backend hosting (recommended)

---

## 🔑 Environment Variables

### Frontend (`.env`)
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Backend
```env
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
```

---

## 📊 API Endpoints

- `GET /health` - Health check
- `POST /extract_features` - Extract voice features from audio
- `POST /stream-chat-token` - Generate Stream Chat JWT token

---

## 🔒 Security Notes

> ⚠️ Stream Chat credentials are currently hardcoded in `backend/app.py` - move to environment variables for production

> ⚠️ CORS accepts all origins (`*`) in development - restrict via `ALLOWED_ORIGINS` in production
