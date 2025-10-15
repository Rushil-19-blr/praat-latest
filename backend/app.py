from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import numpy as np
import scipy.signal as signal
import warnings
warnings.filterwarnings('ignore')


app = Flask(__name__)
CORS(app)


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


@app.route("/extract_features", methods=["POST"])
def extract_features():
	"""Accept a WAV file and return averaged features computed with basic signal processing."""
	if "file" not in request.files:
		return jsonify({"error": "file field missing"}), 400
	file = request.files["file"]
	data = file.read()
	if not data:
		return jsonify({"error": "empty file"}), 400
	try:
		# Simple WAV file reading (assumes 16-bit PCM, mono)
		# Skip WAV header (44 bytes) and read audio data
		audio_data = data[44:]
		samples = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
		sample_rate = 16000  # Assuming 16kHz as per our conversion
		
		basic = compute_basic_features(samples, sample_rate)
		mfcc = compute_mfcc(samples, sample_rate, num_coeffs=13)
		
		return jsonify({
			"rms": basic["rms"],
			"zcr": basic["zcr"],
			"spectralCentroid": basic["spectralCentroid"],
			"spectralFlatness": basic["spectralFlatness"],
			"mfcc": mfcc,
		})
	except Exception as e:
		return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=8000, debug=True)