// audio.js - Audio Management with Web Audio API + Lofi Synth Music

class AudioManager {
    constructor() {
        this.context = null;
        this.sounds = {};
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
        this.musicVolume = 0.25;
        this.sfxVolume = 0.5;

        // Lofi music state
        this.musicPlaying = false;
        this.musicNodes = {};
        this.bpm = 75; // Slow, chill tempo
        this.currentBeat = 0;
        this.nextNoteTime = 0;
        this.scheduleAheadTime = 0.1;
        this.lookahead = 25; // ms
        this.schedulerTimer = null;

        // Musical state - supports multiple tracks
        this.currentTrack = 0; // 0 = lofi, 1 = Take On Me style, 2 = Billie Jean style
        this.tracks = this.initializeTracks();
        this.currentChord = 0;
        this.beatsPerChord = 16;
    }

    initializeTracks() {
        return [
            { // Lofi (original)
                name: 'Lofi Space',
                bpm: 75,
                scale: [0, 2, 3, 5, 7, 9, 10], // Dorian
                baseNote: 48, // C3
                chordProgression: [
                    [0, 3, 5, 9],   // i7 (Cm7)
                    [5, 8, 10, 14], // IV7 (Fm7)
                    [3, 7, 10, 12], // III7 (EbM7)
                    [7, 10, 14, 17] // VII7 (BbM7)
                ],
                beatsPerChord: 16
            },
            { // Take On Me style
                name: 'Take On Me',
                bpm: 169, // Fast 80s tempo
                scale: [0, 2, 4, 5, 7, 9, 11], // Major scale
                baseNote: 57, // A3
                chordProgression: [
                    [0, 4, 7],      // A major
                    [9, 13, 16],    // F#m
                    [-3, 1, 4],     // D major
                    [2, 6, 9]       // E major
                ],
                beatsPerChord: 16
            },
            { // Billie Jean style
                name: 'Billie Jean',
                bpm: 117, // Medium funk tempo
                scale: [0, 2, 3, 5, 7, 8, 10], // Minor scale
                baseNote: 54, // F#3
                chordProgression: [
                    [0, 3, 7],      // F#m
                    [2, 5, 9],      // G#m  
                    [3, 7, 10],     // A major
                    [2, 5, 9]       // G#m (repeat)
                ],
                beatsPerChord: 8 // Faster chord changes
            }
        ];
    }

    get currentTrackData() {
        return this.tracks[this.currentTrack];
    }

    get scale() {
        return this.currentTrackData.scale;
    }

    get baseNote() {
        return this.currentTrackData.baseNote;
    }

    get chordProgression() {
        return this.currentTrackData.chordProgression;
    }

    get bpm() {
        return this.currentTrackData.bpm;
    }

    switchTrack(trackIndex) {
        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            const wasPlaying = this.musicPlaying;
            if (wasPlaying) {
                this.stopMusic();
            }
            this.currentTrack = trackIndex;
            this.beatsPerChord = this.currentTrackData.beatsPerChord;
            if (wasPlaying) {
                this.startMusic();
            }
        }
    }

    async init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            // Create master gain nodes
            this.musicGain = this.context.createGain();
            this.musicGain.gain.value = this.musicVolume;

            // Add gentle compression for warmth
            this.compressor = this.context.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 4;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;

            this.musicGain.connect(this.compressor);
            this.compressor.connect(this.context.destination);

            this.sfxGain = this.context.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.context.destination);

            // Create reverb for lofi spaciness
            this.reverb = await this.createReverb();

            // Generate SFX
            this.generateSounds();

            this.initialized = true;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
        }
    }

    async createReverb() {
        const duration = 2;
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.5));
            }
        }

        const convolver = this.context.createConvolver();
        convolver.buffer = buffer;
        return convolver;
    }

    // Convert MIDI note to frequency
    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // Get note from scale degree
    scaleNote(degree) {
        const octave = Math.floor(degree / 7);
        const noteInScale = ((degree % 7) + 7) % 7;
        return this.baseNote + octave * 12 + this.scale[noteInScale];
    }

    // Start lofi music
    startMusic() {
        if (!this.initialized || this.musicPlaying) return;

        this.musicPlaying = true;
        this.nextNoteTime = this.context.currentTime;
        this.currentBeat = 0;

        // Start scheduler
        this.schedulerTimer = setInterval(() => this.scheduler(), this.lookahead);

        // Add vinyl crackle for vibe
        this.playCrackle();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
        }
        if (this.crackleSource) {
            this.crackleSource.stop();
        }
    }

    playCrackle() {
        const duration = 5;
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            if (Math.random() < 0.00005) data[i] = (Math.random() * 2 - 1) * 0.15;
            else data[i] = (Math.random() * 2 - 1) * 0.002;
        }
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = this.context.createGain();
        gain.gain.value = 0.1;
        source.connect(gain);
        gain.connect(this.musicGain);
        source.start();
        this.crackleSource = source;
    }

    scheduler() {
        while (this.nextNoteTime < this.context.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.nextNoteTime);
            this.advanceBeat();
        }
    }

    advanceBeat() {
        const secondsPerBeat = 60.0 / this.bpm / 4; // 16th notes
        this.nextNoteTime += secondsPerBeat;
        this.currentBeat++;

        // Change chord every 16 beats
        if (this.currentBeat % this.beatsPerChord === 0) {
            this.currentChord = (this.currentChord + 1) % this.chordProgression.length;
        }
    }

    scheduleNote(beat, time) {
        const chord = this.chordProgression[this.currentChord];
        const beatInMeasure = beat % 16;

        if (this.currentTrack === 0) {
            // Lofi style (original)
            if (beatInMeasure === 0 || beatInMeasure === 8) {
                this.playBass(this.scaleNote(chord[0] - 7), time, 0.4);
            }
            if (beatInMeasure % 2 === 0) {
                this.playHiHat(time, 0.08 + Math.random() * 0.05);
            }
            if (beatInMeasure === 4 || beatInMeasure === 12) {
                this.playSnare(time, 0.15);
            }
            if (beatInMeasure === 0 || beatInMeasure === 6 || beatInMeasure === 10) {
                this.playChord(chord, time, 0.12);
            }
            if (Math.random() < 0.15 && beatInMeasure % 4 === 2) {
                const melodyNote = chord[Math.floor(Math.random() * chord.length)] + 12;
                this.playMelody(this.scaleNote(melodyNote), time, 0.1);
            }
        } else if (this.currentTrack === 1) {
            // Take On Me style - Arpeggiated synth
            if (beatInMeasure % 4 === 0) {
                this.playBass(this.scaleNote(chord[0] - 14), time, 0.3);
            }
            if (beatInMeasure % 2 === 0) {
                this.playHiHat(time, 0.12);
            }
            if (beatInMeasure === 4 || beatInMeasure === 12) {
                this.playSnare(time, 0.18);
            }
            // Arpeggiated chord
            const arpPattern = [0, 4, 8, 12];
            if (arpPattern.includes(beatInMeasure % 16)) {
                const noteIndex = arpPattern.indexOf(beatInMeasure % 16);
                const note = chord[noteIndex % chord.length];
                this.play80sSynth(this.scaleNote(note + 7), time, 0.15);
            }
        } else if (this.currentTrack === 2) {
            // Billie Jean style - Bass groove
            const bassPattern = [0, 1, 4, 6, 8, 9, 12, 14];
            if (bassPattern.includes(beatInMeasure)) {
                this.playBass(this.scaleNote(chord[0] - 14), time, 0.45);
            }
            if (beatInMeasure % 4 === 0) {
                this.playHiHat(time, 0.10);
            }
            if (beatInMeasure === 4 || beatInMeasure === 12) {
                this.playSnare(time, 0.20);
            }
            if (beatInMeasure === 0 || beatInMeasure === 8) {
                this.playChord(chord, time, 0.10);
            }
        }
    }

    play80sSynth(midi, time, volume) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = 'sawtooth'; // Classic 80s synth wave
        osc.frequency.value = this.midiToFreq(midi);

        filter.type = 'lowpass';
        filter.frequency.value = 2500;
        filter.Q.value = 2;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.005);
        gain.gain.setValueAtTime(volume, time + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playBass(midi, time, volume) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = this.midiToFreq(midi);

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playHiHat(time, volume) {
        const bufferSize = this.context.sampleRate * 0.05;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
        }

        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000 + Math.random() * 2000;

        const gain = this.context.createGain();
        gain.gain.value = volume;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        source.start(time);
    }

    playSnare(time, volume) {
        // Noise component
        const bufferSize = this.context.sampleRate * 0.15;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const envelope = Math.exp(-i / (bufferSize * 0.15));
            data[i] = (Math.random() * 2 - 1) * envelope;
        }

        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 1;

        const gain = this.context.createGain();
        gain.gain.value = volume;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        source.start(time);

        // Tone component
        const osc = this.context.createOscillator();
        const oscGain = this.context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.05);

        oscGain.gain.setValueAtTime(volume * 0.5, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        osc.connect(oscGain);
        oscGain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playChord(chordDegrees, time, volume) {
        chordDegrees.forEach((degree, i) => {
            const freq = this.midiToFreq(this.scaleNote(degree) + 12);

            // Two detuned oscillators for warmth
            for (let d = -1; d <= 1; d += 2) {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                const filter = this.context.createBiquadFilter();

                osc.type = 'triangle';
                osc.frequency.value = freq * (1 + d * 0.003); // Slight detune

                filter.type = 'lowpass';
                filter.frequency.value = 2000;
                filter.Q.value = 1;

                // Soft attack, medium release
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(volume * 0.5, time + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);

                if (this.reverb) {
                    const reverbGain = this.context.createGain();
                    reverbGain.gain.value = 0.3;
                    gain.connect(reverbGain);
                    reverbGain.connect(this.reverb);
                    this.reverb.connect(this.musicGain);
                }

                osc.start(time);
                osc.stop(time + 1);
            }
        });
    }

    playMelody(midi, time, volume) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = this.midiToFreq(midi);

        filter.type = 'lowpass';
        filter.frequency.value = 3000;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.6);
    }

    // ==== Sound Effects ====

    generateSounds() {
        this.sounds.laser = this.createLaserSound();
        this.sounds.explosion = this.createExplosionSound();
        this.sounds.shieldHit = this.createShieldHitSound();
        this.sounds.hullHit = this.createHullHitSound();
        this.sounds.engine = this.createEngineSound();
        this.sounds.dock = this.createDockSound();
    }

    createLaserSound() {
        const duration = 0.12;
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const frequency = 600 - t * 2500;
            const envelope = Math.exp(-t * 25);
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.25;
        }

        return buffer;
    }

    createExplosionSound() {
        const duration = 0.6;
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 4);
            const noise = (Math.random() * 2 - 1);
            const bass = Math.sin(2 * Math.PI * 50 * t) * Math.exp(-t * 2);
            data[i] = (noise * 0.4 + bass * 0.8) * envelope * 0.35;
        }

        return buffer;
    }

    createShieldHitSound() {
        const duration = 0.2;
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 15);
            const freq1 = 1000;
            const freq2 = 1500;
            data[i] = (Math.sin(2 * Math.PI * freq1 * t) +
                Math.sin(2 * Math.PI * freq2 * t) * 0.5) * envelope * 0.15;
        }

        return buffer;
    }

    createHullHitSound() {
        const duration = 0.25;
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 12);
            const noise = (Math.random() * 2 - 1);
            const impact = Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 25);
            data[i] = (noise * 0.25 + impact) * envelope * 0.25;
        }

        return buffer;
    }

    createEngineSound() {
        const duration = 1;
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const baseFreq = 70;
            const wave = Math.sin(2 * Math.PI * baseFreq * t) * 0.25 +
                Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.08 +
                (Math.random() * 2 - 1) * 0.03;
            data[i] = wave * 0.15;
        }

        return buffer;
    }

    createDockSound() {
        const duration = 0.5;
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const freq = 350 + Math.sin(t * 15) * 80;
            const envelope = Math.sin(Math.PI * t / duration);
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.15;
        }

        return buffer;
    }

    play(soundName, volume = 1) {
        if (!this.initialized || !this.sounds[soundName]) return;

        try {
            const source = this.context.createBufferSource();
            source.buffer = this.sounds[soundName];

            const gainNode = this.context.createGain();
            gainNode.gain.value = volume;

            source.connect(gainNode);
            gainNode.connect(this.sfxGain);

            source.start(0);
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.musicGain) {
            this.musicGain.gain.value = vol;
        }
    }

    setSfxVolume(vol) {
        this.sfxVolume = vol;
        if (this.sfxGain) {
            this.sfxGain.gain.value = vol;
        }
    }

    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }

        // Start music on first resume
        if (this.initialized && !this.musicPlaying) {
            this.startMusic();
        } else if (!this.initialized) {
            // Try to init if not already (should be done by init() but just in case)
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.init().then(() => this.startMusic());
        }
    }
}

// Create global instance
window.audioManager = new AudioManager();
