export async function webmBlobToWavMono16k(blob: Blob): Promise<Blob> {
	// Decode using WebAudio, resample to 16k mono, export 16-bit PCM WAV
	const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
	const arrayBuffer = await blob.arrayBuffer();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

	// Mixdown to mono
	const numInputChannels = audioBuffer.numberOfChannels;
	const length = audioBuffer.length;
	const mixdown = new Float32Array(length);
	for (let ch = 0; ch < numInputChannels; ch++) {
		const data = audioBuffer.getChannelData(ch);
		for (let i = 0; i < length; i++) mixdown[i] += data[i] / numInputChannels;
	}

	// Resample to 16000 Hz
	const srcRate = audioBuffer.sampleRate;
	const dstRate = 16000;
	const ratio = dstRate / srcRate;
	const dstLength = Math.round(length * ratio);
	const resampled = new Float32Array(dstLength);
	for (let i = 0; i < dstLength; i++) {
		const srcIndex = i / ratio;
		const i0 = Math.floor(srcIndex);
		const i1 = Math.min(i0 + 1, length - 1);
		const t = srcIndex - i0;
		resampled[i] = (1 - t) * mixdown[i0] + t * mixdown[i1];
	}

	// Convert to 16-bit PCM WAV
	const wavBuffer = encodeWavPCM16(resampled, dstRate);
	return new Blob([wavBuffer], { type: 'audio/wav' });
}

function encodeWavPCM16(samples: Float32Array, sampleRate: number): ArrayBuffer {
	const bytesPerSample = 2;
	const numChannels = 1;
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = samples.length * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	// RIFF header
	writeString(view, 0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true);
	writeString(view, 8, 'WAVE');

	// fmt chunk
	writeString(view, 12, 'fmt ');
	view.setUint32(16, 16, true); // PCM chunk size
	view.setUint16(20, 1, true); // PCM format
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, 16, true); // bits per sample

	// data chunk
	writeString(view, 36, 'data');
	view.setUint32(40, dataSize, true);

	// Write PCM samples
	let offset = 44;
	for (let i = 0; i < samples.length; i++, offset += 2) {
		let s = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
	}

	return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
	for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}


