/**
 * Play silent audio during long-running tasks to reduce browser tab throttling.
 * Browsers throttle background tabs (setTimeout ~1s, deprioritize JS), but are
 * less aggressive with tabs that appear to be "playing media."
 * Triggered by user gesture (e.g. Generate PDF click), so autoplay is allowed.
 */
let audioContext: AudioContext | null = null;
let source: OscillatorNode | null = null;

export function startKeepAliveAudio(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    audioContext = new Ctx();
    const gain = audioContext.createGain();
    gain.gain.value = 0;
    const oscillator = audioContext.createOscillator();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(0);
    source = oscillator;
  } catch {
    // Ignore if audio is not supported or blocked
  }
}

export function stopKeepAliveAudio(): void {
  try {
    source?.stop();
    source = null;
    audioContext?.close();
    audioContext = null;
  } catch {
    // Ignore
  }
}
