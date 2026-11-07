// Voice notes: recorded on the phone, turned into a small WAV and read into a note by the `scan`
// function (Gemini). Only the text is kept; the recording is never stored.

/** Longest recording, so the upload stays small. */
export const MAX_SECONDS = 180

/** Start recording from the microphone. Resolves to a stop function that gives back the audio. */
export async function startRecording(): Promise<{ stop: () => Promise<Blob>; cancel: () => void }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const rec = new MediaRecorder(stream)
  const parts: Blob[] = []
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data)
  rec.start()
  const end = () => stream.getTracks().forEach((t) => t.stop())
  return {
    stop: () => new Promise<Blob>((done) => {
      rec.onstop = () => {
        end()
        done(new Blob(parts, { type: rec.mimeType }))
      }
      rec.stop()
    }),
    cancel: () => {
      rec.onstop = end
      if (rec.state !== 'inactive') rec.stop()
      else end()
    },
  }
}

/** The recording as 16 kHz mono WAV in base64, a format Gemini always reads. */
export async function toWavBase64(blob: Blob): Promise<string> {
  const ctx = new AudioContext()
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
  void ctx.close()
  const rate = 16000
  const length = Math.min(Math.ceil(decoded.duration * rate), MAX_SECONDS * rate)
  const offline = new OfflineAudioContext(1, length, rate)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start()
  const pcm = (await offline.startRendering()).getChannelData(0)

  const buf = new ArrayBuffer(44 + pcm.length * 2)
  const v = new DataView(buf)
  const text = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  text(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); text(8, 'WAVE')
  text(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  text(36, 'data'); v.setUint32(40, pcm.length * 2, true)
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true)

  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
