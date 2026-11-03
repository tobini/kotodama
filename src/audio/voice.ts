// Pronunciación con la síntesis de voz del navegador (necesita una voz japonesa instalada
// o disponible; Chrome y Edge suelen traerla).

let volume = 0.9;
let voice: SpeechSynthesisVoice | null = null;

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice() {
  voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('ja')) ?? null;
}

if (supported) {
  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

export function setVoiceVolume(value: number) {
  volume = value;
}

export function speak(text: string) {
  if (volume <= 0 || !supported || !voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  u.volume = volume;
  // Si se tipea rápido, cortamos la anterior para que no se acumule una cola.
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
