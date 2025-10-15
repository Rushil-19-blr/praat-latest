export type PraatFeatures = {
	rms: number;
	zcr: number;
	spectralCentroid: number;
	spectralFlatness: number;
	mfcc: number[];
};

export async function extractFeaturesWithPraat(wavBlob: Blob, baseUrl = "http://localhost:8000"): Promise<PraatFeatures> {
	const form = new FormData();
	form.append('file', wavBlob, 'audio.wav');
	const res = await fetch(`${baseUrl}/extract_features`, { method: 'POST', body: form });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Praat extraction failed: ${res.status} ${text}`);
	}
	return await res.json();
}


