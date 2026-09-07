/* Original offline arrangements. No recordings, streaming service or external audio. */
'use strict';

const MUSIC_STYLES = [
  { id: 'swing', name: 'Vegas Swing', bpm: 116, swing: 0.16 },
  { id: 'funk', name: 'Poolside Funk', bpm: 108, swing: 0.02 },
  { id: 'lounge', name: 'After Hours Lounge', bpm: 84, swing: 0.10 },
  { id: 'off', name: 'Off', bpm: 116, swing: 0 },
];
const MUSIC_CHORDS = [
  [50, 53, 57, 60], [50, 53, 57, 60], [55, 59, 62, 65], [55, 59, 62, 65],
  [48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [45, 49, 52, 55],
];
const MUSIC_MELODY = [
  [74,0,0,77,0,76,74,0], [72,0,69,0,0,72,74,0],
  [71,0,74,0,77,0,76,74], [71,0,69,0,67,0,0,0],
  [76,0,79,0,78,76,74,0], [72,0,0,69,0,67,69,0],
  [74,0,77,0,76,74,72,0], [73,0,76,0,0,73,69,0],
];

function readMusicSetting(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
}

const savedMusicStyle = readMusicSetting('vss-music-style', 'swing');
const savedMusicVolume = Number(readMusicSetting('vss-music-volume', '0.55'));
const music = {
  on: false, gain: null, timer: null, step: 0, nextT: 0, noise: null,
  style: MUSIC_STYLES.some(s => s.id === savedMusicStyle) ? savedMusicStyle : 'swing',
  volume: Number.isFinite(savedMusicVolume) ? Math.max(0, Math.min(1, savedMusicVolume)) : 0.55,
};

const midiF = (m) => 440 * Math.pow(2, (m - 69) / 12);

function musicLevel() { return muted || paused || music.style === 'off' ? 0 : music.volume * 0.55; }

function updateMusicLevel() {
  if (music.gain && ac) music.gain.gain.setTargetAtTime(musicLevel(), ac.currentTime, 0.04);
}

function syncMusicControls() {
  const style = MUSIC_STYLES.find(s => s.id === music.style);
  document.getElementById('music-style').value = music.style;
  document.getElementById('music-volume').value = Math.round(music.volume * 100);
  document.getElementById('music-btn').textContent = '♫ ' + style.name.toUpperCase();
  document.getElementById('music-btn').setAttribute('aria-label', 'Music: ' + style.name + '. Click to change style.');
}

function setMusicStyle(id) {
  if (!MUSIC_STYLES.some(s => s.id === id)) return;
  music.style = id;
  try { localStorage.setItem('vss-music-style', id); } catch (_) {}
  syncMusicControls();
  if (typeof phase !== 'undefined' && (phase === 'play' || phase === 'slots')) startMusic();
}

function setMusicVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return;
  music.volume = Math.max(0, Math.min(1, number));
  try { localStorage.setItem('vss-music-volume', String(music.volume)); } catch (_) {}
  syncMusicControls();
  updateMusicLevel();
}

function cycleMusic() {
  const i = MUSIC_STYLES.findIndex(s => s.id === music.style);
  setMusicStyle(MUSIC_STYLES[(i + 1) % MUSIC_STYLES.length].id);
}

function musicNote(midi, time, duration, voice, velocity = 0.12) {
  const a = ac, out = music.gain;
  if (!a || !out) return;
  const oscillator = a.createOscillator(), envelope = a.createGain(), filter = a.createBiquadFilter();
  oscillator.type = voice === 'brass' || voice === 'bass' ? 'sawtooth' : 'triangle';
  oscillator.frequency.setValueAtTime(midiF(midi), time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(voice === 'bass' ? 650 : voice === 'brass' ? 2100 : 3200, time);
  filter.Q.value = voice === 'brass' ? 1.5 : 0.5;
  if (voice === 'brass') filter.frequency.exponentialRampToValueAtTime(800, time + duration);
  const attack = voice === 'brass' ? 0.025 : 0.006;
  envelope.gain.setValueAtTime(0.0001, time);
  envelope.gain.linearRampToValueAtTime(velocity, time + attack);
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(filter); filter.connect(envelope); envelope.connect(out);
  oscillator.start(time); oscillator.stop(time + duration + 0.015);
  oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); };
}

function musicDrum(kind, time, velocity) {
  const a = ac, out = music.gain;
  if (!a || !out) return;
  const envelope = a.createGain();
  envelope.gain.setValueAtTime(velocity, time);
  const duration = kind === 'kick' ? 0.16 : kind === 'snare' ? 0.13 : 0.045;
  envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  if (kind === 'kick') {
    const o = a.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(125, time); o.frequency.exponentialRampToValueAtTime(42, time + duration);
    o.connect(envelope); envelope.connect(out); o.start(time); o.stop(time + duration);
    o.onended = () => { o.disconnect(); envelope.disconnect(); };
  } else {
    if (!music.noise) {
      music.noise = a.createBuffer(1, Math.ceil(a.sampleRate * 0.2), a.sampleRate);
      const data = music.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = a.createBufferSource(), filter = a.createBiquadFilter();
    source.buffer = music.noise; filter.type = 'highpass';
    filter.frequency.value = kind === 'snare' ? 1600 : 7200;
    source.connect(filter); filter.connect(envelope); envelope.connect(out);
    source.start(time); source.stop(time + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }
}

function scheduleMusicStep(style, step, time) {
  const beat = 60 / style.bpm, sixteenth = beat / 4;
  const s = step % 16, bar = Math.floor(step / 16), phrase = bar % 8;
  const chord = MUSIC_CHORDS[phrase];
  // Swing eighth-note offbeats; bar lengths remain exact.
  const when = time + (s % 4 === 2 ? style.swing * beat : 0);
  const lounge = style.id === 'lounge', funk = style.id === 'funk';
  const intensity = phase === 'slots' || phase === 'detour' ? 0.65 : 1;
  if (s === 0 || s === 8 || (funk && s === 11)) musicDrum('kick', when, (lounge ? 0.24 : 0.42) * intensity);
  if (s === 4 || s === 12) musicDrum('snare', when, (lounge ? 0.045 : 0.10) * intensity);
  if (s % 2 === 0) musicDrum('hat', when, (s % 4 === 2 ? 0.07 : 0.035) * intensity);
  if (s === 15 && bar % 4 === 3 && !lounge) musicDrum('snare', when, 0.06 * intensity);

  // Walking bass for swing, syncopated octave bass for funk, held roots for lounge.
  const bassSteps = lounge ? [0, 10] : funk ? [0, 3, 6, 8, 11, 14] : [0, 4, 8, 12];
  const index = bassSteps.indexOf(s);
  if (index >= 0) {
    const tones = funk ? [chord[0]-12,chord[0],chord[2]-12,chord[0]-12,chord[3]-12,chord[0]]
      : [chord[0]-12,chord[2]-12,chord[3]-12,chord[1]-12];
    musicNote(tones[index % tones.length], when, beat * (lounge ? 1.7 : funk ? 0.30 : 0.7), 'bass', 0.15 * intensity);
  }

  const chordSteps = lounge ? [0, 10] : funk ? [2, 7, 10, 15] : [2, 10];
  if (chordSteps.includes(s)) {
    for (const note of chord.slice(1)) musicNote(note + 12, when, beat * (lounge ? 2.2 : 0.6), 'keys', (lounge ? 0.045 : 0.06) * intensity);
  }
  // Two melody bars alternate with two answer bars; the second eight bars add variation.
  if (s % 2 === 0 && (bar % 4 < 2 || lounge)) {
    let note = MUSIC_MELODY[phrase][s / 2];
    if (note && bar % 16 >= 8 && s === 12) note += 12;
    if (note) musicNote(note, when, sixteenth * (lounge ? 5 : 2.7), lounge ? 'keys' : funk ? 'keys' : 'brass', (lounge ? 0.08 : 0.105) * intensity);
  } else if (s === 6 || s === 14) {
    musicNote(chord[2] + 12, when, beat * 0.5, 'keys', 0.07 * intensity);
  }
}

function schedMusic() {
  const a = ac;
  if (!a || !music.on) return;
  updateMusicLevel();
  if (paused || muted || music.style === 'off' || a.state === 'suspended') {
    music.nextT = a.currentTime + 0.08;
    return;
  }
  // Background tabs may throttle timers; skip missed beats instead of bursting them at once.
  if (music.nextT < a.currentTime - 0.1) music.nextT = a.currentTime + 0.04;
  const style = MUSIC_STYLES.find(s => s.id === music.style);
  let scheduled = 0;
  while (music.nextT < a.currentTime + 0.18 && scheduled++ < 8) {
    scheduleMusicStep(style, music.step++, music.nextT);
    music.nextT += 60 / style.bpm / 4;
  }
}

function startMusic() {
  stopMusic();
  if (music.style === 'off') return;
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') a.resume().catch(() => {});
  music.gain = a.createGain();
  music.gain.gain.value = musicLevel();
  music.gain.connect(a.destination);
  music.step = 0; music.nextT = a.currentTime + 0.05;
  music.on = true;
  schedMusic();
  music.timer = setInterval(schedMusic, 60);
}

function stopMusic() {
  if (music.timer) clearInterval(music.timer);
  music.timer = null; music.on = false;
  if (music.gain) { try { music.gain.disconnect(); } catch (_) {} }
  music.gain = null;
}
