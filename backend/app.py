from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import numpy as np
import scipy.signal as signal
import warnings
import os
from stream_chat import StreamChat
import parselmouth
import logging
from scipy.io import wavfile
from werkzeug.utils import secure_filename

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants for Audio Analysis
PITCH_FLOOR_HZ = 75.0      # Lower bound for human pitch (typically male)
PITCH_CEILING_HZ = 600.0   # Upper bound for human pitch (typically female/child)
TIME_STEP_S = 0.01         # 10ms time step for analysis
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB limit
ALLOWED_EXTENSIONS = {'wav', 'wave'}

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

warnings.filterwarnings('ignore')


app = Flask(__name__)

# Configure CORS - Allow all origins in development, or specify allowed origins via environment variable
# In production, set ALLOWED_ORIGINS to your Vercel domain, e.g., "https://your-app.vercel.app"
allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*')
if allowed_origins != '*':
    # Split by comma for multiple origins
    allowed_origins = [origin.strip() for origin in allowed_origins.split(',')]
CORS(app, origins=allowed_origins, supports_credentials=True)

# Stream Chat configuration
STREAM_API_KEY = os.environ.get('STREAM_API_KEY', "kt3cr78evu5y")
STREAM_API_SECRET = os.environ.get('STREAM_API_SECRET', "kpfebwva7mvhp3wwwv8cynfgeemdrf7wkrexszr8zhz4p8nj2gnjr5jy4tadsamb")

if not STREAM_API_KEY or not STREAM_API_SECRET:
    logger.error("Stream Chat credentials not configured in environment variables")
    # In a real production environment, you might want to raise an error here
    # raise ValueError("Stream Chat credentials not configured")

# Initialize Stream Chat server client
stream_client = StreamChat(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)


def compute_basic_features(samples: np.ndarray, sample_rate: int) -> dict:
	"""Compute RMS, ZCR, Spectral Centroid, Spectral Flatness from mono PCM samples."""
	# Ensure float64 for calculations
	x = samples.astype(np.float64)
	# RMS
	rms = float(np.sqrt(np.mean(np.square(x)))) if x.size > 0 else 0.0
	# ZCR
	zero_crossings = np.sum(np.abs(np.diff(np.signbit(x))))
	zcr = float(zero_crossings) / float(x.size - 1) if x.size > 1 else 0.0
	# Power spectrum for spectral features
	if x.size == 0:
		return {"rms": 0.0, "zcr": 0.0, "spectralCentroid": 0.0, "spectralFlatness": 0.0}
	# Use periodogram for stable estimate
	freqs, psd = signal.periodogram(x, fs=sample_rate, scaling="spectrum", window="hann")
	psd = np.maximum(psd, 1e-20)  # avoid log(0)
	# Spectral centroid
	centroid = float(np.sum(freqs * psd) / np.sum(psd)) if np.sum(psd) > 0 else 0.0
	# Spectral flatness (geometric mean / arithmetic mean)
	geom_mean = float(np.exp(np.mean(np.log(psd))))
	arith_mean = float(np.mean(psd)) if psd.size > 0 else 0.0
	flatness = float(geom_mean / arith_mean) if arith_mean > 0 else 0.0
	return {
		"rms": rms,
		"zcr": zcr,
		"spectralCentroid": centroid,
		"spectralFlatness": flatness,
	}


def extract_praat_features(samples: np.ndarray, sample_rate: int) -> dict:
	"""Extract advanced voice features using Praat/Parselmouth."""
	try:
		# Create Praat Sound object from numpy array
		sound = parselmouth.Sound(samples, sampling_frequency=sample_rate)
		duration = sound.duration
		
		# Extract Pitch (F0)
		pitch = sound.to_pitch_ac(
			time_step=TIME_STEP_S,
			pitch_floor=PITCH_FLOOR_HZ, 
			pitch_ceiling=PITCH_CEILING_HZ
		)
		
		# Get F0 statistics
		f0_values = []
		f0_mean = 0.0
		f0_std = 0.0
		f0_min = 0.0
		f0_max = 0.0
		f0_range = 0.0
		
		if pitch:
			# Extract F0 values (excluding unvoiced frames)
			for t in np.arange(0, duration, TIME_STEP_S):
				f0 = pitch.get_value_at_time(t)
				if f0 is not None and f0 > 0:
					f0_values.append(f0)
			
			if len(f0_values) > 0:
				f0_array = np.array(f0_values)
				f0_mean = float(np.mean(f0_array))
				f0_std = float(np.std(f0_array))
				f0_min = float(np.min(f0_array))
				f0_max = float(np.max(f0_array))
				f0_range = f0_max - f0_min
			else:
				f0_mean = 0.0
				f0_range = 0.0
		else:
			f0_mean = 0.0
			f0_range = 0.0
		
		# Extract Formants (F1, F2)
		formant = sound.to_formant_burg(
			time_step=TIME_STEP_S,
			max_number_of_formants=5.0,
			maximum_formant=5500.0
		)
		
		f1_values = []
		f2_values = []
		f1_mean = 0.0
		f2_mean = 0.0
		
		if formant:
			for t in np.arange(0, duration, TIME_STEP_S):
				f1 = formant.get_value_at_time(formant_number=1, time=t)
				f2 = formant.get_value_at_time(formant_number=2, time=t)
				if f1 is not None and f1 > 0:
					f1_values.append(f1)
				if f2 is not None and f2 > 0:
					f2_values.append(f2)
			
			if len(f1_values) > 0:
				f1_mean = float(np.mean(f1_values))
			if len(f2_values) > 0:
				f2_mean = float(np.mean(f2_values))
		
		# Extract PointProcess (pulses) for jitter and shimmer
		point_process = None
		jitter = 0.0
		shimmer = 0.0
		
		try:
			# Create PointProcess using Praat script
			point_process = parselmouth.praat.call(sound, "To PointProcess (periodic, cc)", PITCH_FLOOR_HZ, PITCH_CEILING_HZ)
			
			if point_process:
				n_pulses = parselmouth.praat.call(point_process, "Get number of points")
				
				# Calculate Jitter (local, absolute)
				if n_pulses > 1:
					try:
						jitter = parselmouth.praat.call(point_process, "Get jitter (local)", 0.0, duration, 0.0001, 0.02, 1.3)
						jitter = float(jitter * 100.0)  # Convert to percentage
					except:
						jitter = 0.0
					
					# Calculate Shimmer (local, relative)
					try:
						shimmer = parselmouth.praat.call([sound, point_process], "Get shimmer (local)", 0.0, duration, 0.0001, 0.02, 1.3, 1.6)
						shimmer = float(shimmer * 100.0)  # Convert to percentage
					except:
						shimmer = 0.0
		except Exception as e:
			logger.warning(f"Could not extract jitter/shimmer: {str(e)}")
			jitter = 0.0
			shimmer = 0.0
		
		# Estimate speech rate (rough estimate based on voiced segments)
		speech_rate = 0.0
		if len(f0_values) > 0:
			# Estimate based on voiced frames and duration
			# Rough approximation: assume average word length
			voiced_frames = len(f0_values)
			voiced_duration = voiced_frames * TIME_STEP_S
			# Estimate words per minute (rough heuristic)
			words_estimate = voiced_duration / 0.5  # Assume ~0.5 seconds per word average
			speech_rate = float((words_estimate / duration) * 60) if duration > 0 else 0.0
			# Clamp to reasonable range
			speech_rate = max(80, min(200, speech_rate))
		
		return {
			"f0_mean": f0_mean,
			"f0_range": f0_range,
			"jitter": jitter,
			"shimmer": shimmer,
			"f1": f1_mean,
			"f2": f2_mean,
			"speech_rate": speech_rate,
		}
	except Exception as e:
		logger.error(f"Error in Praat extraction: {str(e)}", exc_info=True)
		# Return defaults if Praat extraction fails
		return {
			"f0_mean": 0.0,
			"f0_range": 0.0,
			"jitter": 0.0,
			"shimmer": 0.0,
			"f1": 0.0,
			"f2": 0.0,
			"speech_rate": 0.0,
		}


def compute_mfcc(samples: np.ndarray, sample_rate: int, num_coeffs: int = 13) -> list[float]:
	"""Compute MFCCs using scipy FFT and mel filterbank."""
	try:
		# Simple MFCC-like features using FFT and mel-scale approximation
		fft = np.fft.fft(samples)
		magnitude = np.abs(fft[:len(fft)//2])
		
		# Simple mel-like filterbank approximation
		mfccs = []
		for i in range(num_coeffs):
			start = int((i * len(magnitude)) / num_coeffs)
			end = int(((i + 1) * len(magnitude)) / num_coeffs)
			coeff = float(np.mean(magnitude[start:end])) if end > start else 0.0
			mfccs.append(coeff)
		
		return mfccs
	except:
		# Fallback to zeros if computation fails
		return [0.0] * num_coeffs


@app.route("/health", methods=["GET"])  # simple health check
def health():
	return jsonify({"status": "ok"})


@app.route("/stream-chat-token", methods=["POST"])
def generate_stream_token():
	"""Generate a Stream Chat JWT token for a user."""
	try:
		data = request.get_json()
		if not data or "userId" not in data:
			return jsonify({"error": "userId is required"}), 400
		
		userId = data["userId"]
		userName = data.get("userName", f"User {userId}")
		
		# Create or update user in Stream Chat
		logger.info(f"Generating Stream token for user: {userId}")
		stream_client.update_user({
			"id": userId,
			"name": userName,
		})
		
		# Generate JWT token
		token = stream_client.create_token(userId)
		
		return jsonify({
			"token": token,
			"userId": userId,
			"userName": userName
		})
	except Exception as e:
		logger.error(f"Error generating Stream token: {str(e)}", exc_info=True)
		return jsonify({"error": str(e)}), 500


@app.route("/extract_features", methods=["POST"])
def extract_features():
	"""Accept a WAV file and return features computed with Praat/Parselmouth."""
	if "file" not in request.files:
		logger.warning("Upload attempt without 'file' field")
		return jsonify({"error": "file field missing"}), 400
	
	file = request.files["file"]
	
	# Extension validation
	if file.filename == '' or not allowed_file(file.filename):
		logger.warning(f"Invalid file type or empty filename: {file.filename}")
		return jsonify({"error": "Invalid file type. Only WAV files are allowed."}), 400

	# File size validation
	file.seek(0, 2)  # Seek to end
	size = file.tell()
	file.seek(0)     # Reset to beginning
	
	if size > MAX_FILE_SIZE:
		logger.warning(f"File too large: {size} bytes")
		return jsonify({"error": f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024)}MB"}), 413

	data = file.read()
	if not data:
		logger.warning("Empty file uploaded")
		return jsonify({"error": "empty file"}), 400

	try:
		# Robust WAV file reading using scipy
		# This handles different bit depths and sample rates
		sample_rate, samples = wavfile.read(io.BytesIO(data))
		
		# Log info about the file
		logger.info(f"Processing audio: {file.filename}, SR: {sample_rate}, Shape: {samples.shape}, Dtype: {samples.dtype}")

		# Normalize bit depth to float32 range [-1, 1]
		if samples.dtype == np.int16:
			samples = samples.astype(np.float32) / 32768.0
		elif samples.dtype == np.int32:
			samples = samples.astype(np.float32) / 2147483648.0
		elif samples.dtype == np.uint8:
			samples = (samples.astype(np.float32) - 128.0) / 128.0
		elif samples.dtype == np.float32:
			pass # Already float32
		else:
			# If it's already float but maybe scaled differently or unknown int
			samples = samples.astype(np.float32)
			if np.max(np.abs(samples)) > 1.0:
				samples /= np.max(np.abs(samples))

		# Handle stereo (convert to mono)
		if len(samples.shape) > 1:
			logger.info(f"Converting stereo to mono for {file.filename}")
			samples = samples.mean(axis=1)
		
		# Compute basic features (RMS, ZCR, Spectral features, MFCC)
		basic = compute_basic_features(samples, sample_rate)
		mfcc = compute_mfcc(samples, sample_rate, num_coeffs=13)
		
		# Extract advanced Praat features (F0, jitter, shimmer, formants)
		praat_features = extract_praat_features(samples, sample_rate)
		
		# Debug log the results
		logger.info(f"Features extracted successfully for {file.filename}")
		
		# Return combined features
		return jsonify({
			# Basic features
			"rms": basic["rms"],
			"zcr": basic["zcr"],
			"spectralCentroid": basic["spectralCentroid"],
			"spectralFlatness": basic["spectralFlatness"],
			"mfcc": mfcc,
			# Praat advanced features
			"f0_mean": praat_features["f0_mean"],
			"f0_range": praat_features["f0_range"],
			"jitter": praat_features["jitter"],
			"shimmer": praat_features["shimmer"],
			"f1": praat_features["f1"],
			"f2": praat_features["f2"],
			"speech_rate": praat_features["speech_rate"],
		})
	except Exception as e:
		logger.error(f"Error in extract_features: {str(e)}", exc_info=True)
		return jsonify({"error": f"Audio processing failed: {str(e)}"}), 500


if __name__ == "__main__":
	# Disable Flask's automatic .env loading to avoid encoding issues
	import os
	os.environ['FLASK_SKIP_DOTENV'] = '1'
	
	app.run(host="0.0.0.0", port=8000, debug=True)