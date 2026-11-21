// ==============================================================================
// ⚔️ STICKMAN BATTLE - PROCEDURAL WEB AUDIO ENGINE (V4 Dynamic Action & Visceral SFX)
// Features:
// 1. Dual-Mode Dynamic BGM: Relaxing Lobby Lo-Fi Pad <-> High-Octane Cyberpunk Battle Beat (124 BPM)
// 2. Visceral Punchy SFX: Razor-sharp steel blade clash with noise friction + 808 Sub-Bass Impact
// 3. Anti-Fatigue Pitch Jitter Engine (every sword strike & swing sounds distinct)
// 4. Critical HP Tension Heartbeat (rhythmic lub-dub when <= 2 HP)
// 5. Tactical Emergency Defense Activation sound (Alt+S Shield / Alt+D Dodge)
// 6. Zero External Assets (100% Procedural Web Audio API, Zero CORS, Zero Download Latency)
// 7. Full Local Volume Sliders & Storage Persistence with Auto-Wakeup
// ==============================================================================

(function() {
    'use strict';

    // Safe Storage helper (Edge Tracking Prevention Proof)
    function safeGet(key, defaultVal) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const val = window.localStorage.getItem(key);
                return val !== null ? val : defaultVal;
            }
        } catch (e) {}
        return defaultVal;
    }

    function safeSet(key, val) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, val);
            }
        } catch (e) {}
    }

    let audioCtx = null;
    let masterBgmGain = null;
    let masterSfxGain = null;

    // Preferences & Volumes (Defaults: BGM = 70%, SFX = 80%)
    let bgmEnabled = safeGet('sb_bgm_enabled', '1') !== '0';
    let sfxEnabled = safeGet('sb_sfx_enabled', '1') !== '0';
    let bgmVolume = parseFloat(safeGet('sb_bgm_vol', '0.70'));
    let sfxVolume = parseFloat(safeGet('sb_sfx_vol', '0.80'));

    // BGM State & Mode
    let isBgmPlaying = false;
    let bgmMode = (typeof document !== 'undefined' && document.getElementById('gui_screen')) ? 'battle' : 'lobby'; // 'lobby' (ambient pad) or 'battle' (cyberpunk action beat)
    let bgmTimer = null;
    let battleBeatTimer = null;
    let bgmStep = 0;
    let battleStep = 0;
    let hasUserInteracted = false;

    // Random Pitch Jitter Helper (±range around base value, e.g. 0.08 = ±8%)
    function getJitter(range) {
        const r = range || 0.08;
        return 1.0 + (Math.random() * (r * 2) - r);
    }

    // Audible Relaxing Lo-Fi Ambient Chord Progression for Lobby (Cmaj7 -> Am7 -> Fmaj7 -> G7)
    const CHORD_PROGRESSION = [
        [261.63, 329.63, 392.00, 493.88], // C4, E4, G4, B4 (Cmaj7)
        [220.00, 261.63, 329.63, 392.00], // A3, C4, E4, G4 (Am7)
        [174.61, 220.00, 261.63, 329.63], // F3, A3, C4, E4 (Fmaj7)
        [196.00, 246.94, 293.66, 349.23]  // G3, B3, D4, F4 (G7)
    ];
    const SPARKLE_NOTES = [523.25, 659.25, 783.99, 1046.50, 1174.66];

    // Battle Driving Bassline Notes (C2 -> Eb2 -> F2 -> G2 -> Bb1 -> C2)
    const BATTLE_BASS_NOTES = [
        65.41, 65.41, 77.78, 65.41, 87.31, 77.78, 98.00, 87.31,
        65.41, 65.41, 58.27, 65.41, 77.78, 87.31, 98.00, 116.54
    ];

    function getAudioContext(forceCreate) {
        if (document.hidden && !forceCreate) {
            return null;
        }
        if (!audioCtx) {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return null;
                audioCtx = new AudioContextClass();

                // Master BGM Gain (volume controlled)
                masterBgmGain = audioCtx.createGain();
                const initBgmGain = bgmEnabled ? 0.35 * bgmVolume : 0;
                masterBgmGain.gain.setValueAtTime(initBgmGain, audioCtx.currentTime);
                masterBgmGain.connect(audioCtx.destination);

                // Master SFX Gain (volume controlled)
                masterSfxGain = audioCtx.createGain();
                const initSfxGain = sfxEnabled ? 0.65 * sfxVolume : 0;
                masterSfxGain.gain.setValueAtTime(initSfxGain, audioCtx.currentTime);
                masterSfxGain.connect(audioCtx.destination);
            } catch (e) {
                return null;
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            if (!document.hidden && (hasUserInteracted || forceCreate)) {
                audioCtx.resume().catch(() => {});
            }
        }
        return audioCtx;
    }

    // --- 1. LOBBY AMBIENT DRONE & CHORD ENGINE ---
    let droneOsc1 = null;
    let droneOsc2 = null;
    let droneFilter = null;
    let droneGain = null;
    let activeChordOscs = [];
    let activeChordGain = null;
    let sparkleTimer = null;

    function startDronePad() {
        if (!bgmEnabled || document.hidden || bgmMode === 'battle') return;
        const ctx = getAudioContext(true);
        if (!ctx || droneOsc1) return;

        try {
            droneFilter = ctx.createBiquadFilter();
            droneFilter.type = 'lowpass';
            droneFilter.frequency.setValueAtTime(320, ctx.currentTime);
            droneFilter.Q.setValueAtTime(0.6, ctx.currentTime);

            droneGain = ctx.createGain();
            droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
            droneGain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2.0);

            droneOsc1 = ctx.createOscillator();
            droneOsc1.type = 'sine';
            droneOsc1.frequency.setValueAtTime(130.81, ctx.currentTime); // C3 root

            droneOsc2 = ctx.createOscillator();
            droneOsc2.type = 'triangle';
            droneOsc2.frequency.setValueAtTime(196.00, ctx.currentTime); // G3 5th
            droneOsc2.detune.setValueAtTime(3, ctx.currentTime);

            droneOsc1.connect(droneFilter);
            droneOsc2.connect(droneFilter);
            droneFilter.connect(droneGain);
            droneGain.connect(masterBgmGain);

            droneOsc1.start();
            droneOsc2.start();
        } catch (e) {}
    }

    function stopDronePad(immediate) {
        if (droneGain && audioCtx) {
            const oldOsc1 = droneOsc1;
            const oldOsc2 = droneOsc2;
            const oldGain = droneGain;
            const oldFilter = droneFilter;
            droneOsc1 = null;
            droneOsc2 = null;
            droneGain = null;
            droneFilter = null;

            if (immediate) {
                try {
                    oldGain.gain.cancelScheduledValues(audioCtx.currentTime);
                    oldGain.gain.setValueAtTime(0, audioCtx.currentTime);
                } catch (e) {}
                try { oldOsc1 && oldOsc1.stop(); oldOsc1 && oldOsc1.disconnect(); } catch (e) {}
                try { oldOsc2 && oldOsc2.stop(); oldOsc2 && oldOsc2.disconnect(); } catch (e) {}
                try { oldFilter && oldFilter.disconnect(); } catch (e) {}
                try { oldGain && oldGain.disconnect(); } catch (e) {}
            } else {
                try {
                    oldGain.gain.cancelScheduledValues(audioCtx.currentTime);
                    oldGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
                    setTimeout(() => {
                        try { oldOsc1 && oldOsc1.stop(); oldOsc1 && oldOsc1.disconnect(); } catch (e) {}
                        try { oldOsc2 && oldOsc2.stop(); oldOsc2 && oldOsc2.disconnect(); } catch (e) {}
                        try { oldFilter && oldFilter.disconnect(); } catch (e) {}
                        try { oldGain && oldGain.disconnect(); } catch (e) {}
                    }, 350);
                } catch (e) {}
            }
        }
    }

    function playAmbientChord(freqs, duration) {
        if (!duration) duration = 5.5;
        const ctx = getAudioContext(true);
        if (!ctx || !bgmEnabled || document.hidden || bgmMode === 'battle') return;

        activeChordOscs.forEach(o => {
            try { o.stop(); o.disconnect(); } catch (e) {}
        });
        activeChordOscs = [];
        if (activeChordGain) {
            try { activeChordGain.disconnect(); } catch (e) {}
            activeChordGain = null;
        }

        const chordGain = ctx.createGain();
        activeChordGain = chordGain;
        chordGain.gain.setValueAtTime(0.001, ctx.currentTime);
        chordGain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 1.0);
        chordGain.gain.setValueAtTime(0.28, ctx.currentTime + 2.8);
        chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        filter.Q.setValueAtTime(0.7, ctx.currentTime);

        chordGain.connect(filter);
        filter.connect(masterBgmGain);

        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            osc.type = idx === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.detune.setValueAtTime((idx % 2 === 0 ? -4 : 4), ctx.currentTime);

            osc.connect(chordGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
            activeChordOscs.push(osc);
            osc.onended = () => {
                const i = activeChordOscs.indexOf(osc);
                if (i !== -1) activeChordOscs.splice(i, 1);
            };
        });

        if (Math.random() > 0.3) {
            if (sparkleTimer) clearTimeout(sparkleTimer);
            sparkleTimer = setTimeout(() => {
                if (!bgmEnabled || !audioCtx || document.hidden || bgmMode === 'battle') return;
                playSparkleBell();
            }, 1000 + Math.random() * 1200);
        }
    }

    function playSparkleBell() {
        const ctx = getAudioContext(true);
        if (!ctx || !bgmEnabled || document.hidden || bgmMode === 'battle') return;
        const note = SPARKLE_NOTES[Math.floor(Math.random() * SPARKLE_NOTES.length)];
        const bellGain = ctx.createGain();
        bellGain.gain.setValueAtTime(0.001, ctx.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.05);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, ctx.currentTime);

        osc.connect(bellGain);
        bellGain.connect(masterBgmGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.3);
    }

    function lobbyBgmLoop() {
        if (!bgmEnabled || document.hidden || bgmMode !== 'lobby') {
            return;
        }
        isBgmPlaying = true;
        const chord = CHORD_PROGRESSION[bgmStep % CHORD_PROGRESSION.length];
        bgmStep++;
        playAmbientChord(chord, 5.5);
        bgmTimer = setTimeout(lobbyBgmLoop, 3200);
    }

    // --- 2. HIGH-OCTANE CYBERPUNK BATTLE BEAT SEQUENCER (124 BPM) ---
    // 124 BPM -> 1 Beat = ~484ms, 16th note step = ~121ms
    const STEP_INTERVAL_MS = 121;

    function playSynthesizedKick(ctx, now) {
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            // Heavy 808-style downward pitch punch
            osc.frequency.setValueAtTime(145, now);
            osc.frequency.exponentialRampToValueAtTime(36, now + 0.09);

            gain.gain.setValueAtTime(0.72, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(masterBgmGain);
            osc.start(now);
            osc.stop(now + 0.20);
        } catch (e) {}
    }

    function playSynthesizedHiHat(ctx, now, isAccent) {
        try {
            const dur = isAccent ? 0.05 : 0.03;
            const bufferSize = Math.floor(ctx.sampleRate * dur);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(isAccent ? 7500 : 8800, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(isAccent ? 0.22 : 0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterBgmGain);
            noise.start(now);
        } catch (e) {}
    }

    function playSynthesizedBassNote(ctx, now, freq) {
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, now);
            filter.frequency.exponentialRampToValueAtTime(180, now + 0.11);
            filter.Q.setValueAtTime(2.2, now);

            gain.gain.setValueAtTime(0.42, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterBgmGain);

            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {}
    }

    function battleBeatStep() {
        if (!bgmEnabled || document.hidden || bgmMode !== 'battle') {
            return;
        }
        isBgmPlaying = true;
        const ctx = getAudioContext(true);
        if (ctx) {
            const now = ctx.currentTime;
            const step16 = battleStep % 16;

            // Kick on beats 0, 4, 8, 12 (4-on-the-floor rhythm)
            if (step16 % 4 === 0) {
                playSynthesizedKick(ctx, now);
            }

            // Hi-hats on off-beats & fast groove
            if (step16 % 2 === 0) {
                playSynthesizedHiHat(ctx, now, step16 % 4 === 2);
            } else if (step16 === 14 || step16 === 15) {
                // Roll into next bar
                playSynthesizedHiHat(ctx, now, false);
            }

            // Driving synth bass note on every 16th step
            const bassFreq = BATTLE_BASS_NOTES[step16];
            playSynthesizedBassNote(ctx, now, bassFreq);
        }

        battleStep++;
        battleBeatTimer = setTimeout(battleBeatStep, STEP_INTERVAL_MS);
    }

    function setBgmMode(newMode) {
        if (newMode !== 'lobby' && newMode !== 'battle') return;
        console.log(`🎵 Switching BGM mode from [${bgmMode}] to [${newMode}]`);
        bgmMode = newMode;

        if (bgmMode === 'battle') {
            // Stop lobby ambient cleanly
            if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
            if (sparkleTimer) { clearTimeout(sparkleTimer); sparkleTimer = null; }
            stopDronePad(false);
            battleStep = 0;
            if (battleBeatTimer) clearTimeout(battleBeatTimer);
            if (bgmEnabled && !document.hidden) {
                battleBeatStep();
            }
        } else {
            // Transition back to lobby ambient
            if (battleBeatTimer) { clearTimeout(battleBeatTimer); battleBeatTimer = null; }
            startDronePad();
            if (bgmTimer) clearTimeout(bgmTimer);
            if (bgmEnabled && !document.hidden) {
                lobbyBgmLoop();
            }
        }
    }

    function startBGM() {
        if (!bgmEnabled || document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx) return;
        // In the arena, ensure battle beat is active
        if (typeof document !== 'undefined' && document.getElementById('gui_screen')) {
            bgmMode = 'battle';
        }
        if (masterBgmGain) {
            masterBgmGain.gain.cancelScheduledValues(ctx.currentTime);
            masterBgmGain.gain.setValueAtTime(0.40 * bgmVolume, ctx.currentTime);
        }
        if (bgmMode === 'battle') {
            if (!battleBeatTimer) battleBeatStep();
        } else {
            startDronePad();
            if (!isBgmPlaying) lobbyBgmLoop();
        }
    }

    function stopBGM(immediate) {
        isBgmPlaying = false;
        if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
        if (battleBeatTimer) { clearTimeout(battleBeatTimer); battleBeatTimer = null; }
        if (sparkleTimer) { clearTimeout(sparkleTimer); sparkleTimer = null; }

        activeChordOscs.forEach(o => {
            try { o.stop(); o.disconnect(); } catch (e) {}
        });
        activeChordOscs = [];
        if (activeChordGain) {
            try { activeChordGain.disconnect(); } catch (e) {}
            activeChordGain = null;
        }
        stopDronePad(immediate !== false);

        if (audioCtx && masterBgmGain) {
            try {
                masterBgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
                masterBgmGain.gain.setValueAtTime(0, audioCtx.currentTime);
            } catch (e) {}
        }
    }

    // --- 3. HIGH-IMPACT COMBAT SFX (PUNCHY, METALLIC & CRISP) ---

    // 1. Sword Swing (Fast Aerodynamic Blade Whoosh)
    function playSwordSwing() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;

        const jitter = getJitter(0.12);
        const duration = 0.14;

        try {
            const bufferSize = Math.floor(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1350 * jitter, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(320 * jitter, ctx.currentTime + duration);
            filter.Q.setValueAtTime(2.8, ctx.currentTime);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.48, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterSfxGain);

            noise.start(ctx.currentTime);
        } catch (e) {}
    }

    // 2. Sword Clash (Razor-Sharp Steel Scrape + Ringing Inharmonic Partials)
    function playSwordClash() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;

        const jitter = getJitter(0.09);
        const now = ctx.currentTime;

        try {
            // Layer 1: Metallic contact friction scrape (ultra-fast noise transient)
            const noiseDur = 0.035;
            const bufferSize = Math.floor(ctx.sampleRate * noiseDur);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(3200 * jitter, now);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.45, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterSfxGain);
            noise.start(now);

            // Layer 2: Real Inharmonic Steel Partials (1880Hz, 2640Hz, 3850Hz, 4920Hz)
            const freqs = [1880, 2640, 3850, 4920];
            freqs.forEach((baseFreq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = idx === 0 ? 'triangle' : 'sine';
                const f = baseFreq * jitter;
                osc.frequency.setValueAtTime(f, now);
                osc.frequency.exponentialRampToValueAtTime(f * 0.94, now + 0.35);

                const vol = idx === 0 ? 0.55 : (0.35 / (idx + 1));
                gain.gain.setValueAtTime(vol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(now);
                osc.stop(now + 0.38);
            });
        } catch (e) {}
    }

    // 3. Shield Block (Solid Iron/Wood Impact Thump + Metallic Deflection Ring)
    function playShieldBlock() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;

        const jitter = getJitter(0.08);
        const now = ctx.currentTime;

        try {
            // 1. Solid body impact thump
            const bodyOsc = ctx.createOscillator();
            const bodyGain = ctx.createGain();
            bodyOsc.type = 'triangle';
            bodyOsc.frequency.setValueAtTime(220 * jitter, now);
            bodyOsc.frequency.exponentialRampToValueAtTime(45 * jitter, now + 0.20);
            bodyGain.gain.setValueAtTime(0.72, now);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
            bodyOsc.connect(bodyGain);
            bodyGain.connect(masterSfxGain);
            bodyOsc.start(now);
            bodyOsc.stop(now + 0.22);

            // 2. High iron plate contact ping
            const plateOsc = ctx.createOscillator();
            const plateGain = ctx.createGain();
            plateOsc.type = 'sine';
            plateOsc.frequency.setValueAtTime(1240 * jitter, now);
            plateOsc.frequency.exponentialRampToValueAtTime(480 * jitter, now + 0.16);
            plateGain.gain.setValueAtTime(0.50, now);
            plateGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            plateOsc.connect(plateGain);
            plateGain.connect(masterSfxGain);
            plateOsc.start(now);
            plateOsc.stop(now + 0.18);
        } catch (e) {}
    }

    // 3.5. Shield Break (Heavy Cleave + Violent Metallic Shatter)
    function playShieldBreak() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const jitter = getJitter(0.08);
        const now = ctx.currentTime;

        try {
            // Visceral crushing sub thump
            const subOsc = ctx.createOscillator();
            const subGain = ctx.createGain();
            subOsc.type = 'sawtooth';
            subOsc.frequency.setValueAtTime(160 * jitter, now);
            subOsc.frequency.exponentialRampToValueAtTime(28 * jitter, now + 0.32);
            subGain.gain.setValueAtTime(0.82, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            subOsc.connect(subGain);
            subGain.connect(masterSfxGain);
            subOsc.start(now);
            subOsc.stop(now + 0.34);

            // Dissonant shattering metal shards
            [1300, 1950, 2800].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq * jitter, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.55 * jitter, now + 0.38);
                gain.gain.setValueAtTime(0.45 / (idx + 1), now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(now);
                osc.stop(now + 0.40);
            });
        } catch (e) {}
    }

    // 4. Damage Hit (Crisp Cutting Flesh Slice vs Heavy 808 Visceral Cleave)
    function playDamageHit(isHeavy) {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;

        const jitter = getJitter(0.10);
        const now = ctx.currentTime;

        try {
            if (isHeavy) {
                // Heavy Cleave: 808 Sub-bass drop + Impact Crunch
                const sub = ctx.createOscillator();
                const subGain = ctx.createGain();
                sub.type = 'sine';
                sub.frequency.setValueAtTime(145 * jitter, now);
                sub.frequency.exponentialRampToValueAtTime(28 * jitter, now + 0.30);
                subGain.gain.setValueAtTime(0.88, now);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
                sub.connect(subGain);
                subGain.connect(masterSfxGain);
                sub.start(now);
                sub.stop(now + 0.32);

                // Mid crunch saw
                const mid = ctx.createOscillator();
                const midGain = ctx.createGain();
                const midFilter = ctx.createBiquadFilter();
                mid.type = 'sawtooth';
                mid.frequency.setValueAtTime(260 * jitter, now);
                mid.frequency.exponentialRampToValueAtTime(45 * jitter, now + 0.22);
                midFilter.type = 'lowpass';
                midFilter.frequency.setValueAtTime(950, now);
                midGain.gain.setValueAtTime(0.70, now);
                midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                mid.connect(midFilter);
                midFilter.connect(midGain);
                midGain.connect(masterSfxGain);
                mid.start(now);
                mid.stop(now + 0.24);
            } else {
                // Light Hit: Fast sharp blade slice + mid thump
                const sliceDur = 0.08;
                const bufferSize = Math.floor(ctx.sampleRate * sliceDur);
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1900 * jitter, now);
                filter.frequency.exponentialRampToValueAtTime(450 * jitter, now + sliceDur);
                filter.Q.setValueAtTime(2.2, now);

                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.60, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + sliceDur);

                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(masterSfxGain);
                noise.start(now);

                // Body thump
                const thump = ctx.createOscillator();
                const thumpGain = ctx.createGain();
                thump.type = 'triangle';
                thump.frequency.setValueAtTime(220 * jitter, now);
                thump.frequency.exponentialRampToValueAtTime(50 * jitter, now + 0.16);
                thumpGain.gain.setValueAtTime(0.65, now);
                thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                thump.connect(thumpGain);
                thumpGain.connect(masterSfxGain);
                thump.start(now);
                thump.stop(now + 0.18);
            }
        } catch (e) {}
    }

    // 4.5. Barrier Deflect (Harmonic Sci-Fi Shield Ping)
    function playBarrierDeflect() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const jitter = getJitter(0.07);
        const now = ctx.currentTime;
        try {
            [1250, 1850].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq * jitter, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.5 * jitter, now + 0.22);
                gain.gain.setValueAtTime(0.38 / (idx + 1), now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(now);
                osc.stop(now + 0.25);
            });
        } catch (e) {}
    }

    // 4.6. Trig Fusion (Detonation Shockwave)
    function playTrigFusion() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;
        try {
            const sub = ctx.createOscillator();
            const subGain = ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(160, now);
            sub.frequency.exponentialRampToValueAtTime(28, now + 0.45);
            subGain.gain.setValueAtTime(0.85, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            sub.connect(subGain);
            subGain.connect(masterSfxGain);
            sub.start(now);
            sub.stop(now + 0.48);

            const flare = ctx.createOscillator();
            const flareGain = ctx.createGain();
            flare.type = 'sawtooth';
            flare.frequency.setValueAtTime(750, now);
            flare.frequency.exponentialRampToValueAtTime(100, now + 0.30);
            flareGain.gain.setValueAtTime(0.48, now);
            flareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
            flare.connect(flareGain);
            flareGain.connect(masterSfxGain);
            flare.start(now);
            flare.stop(now + 0.32);
        } catch (e) {}
    }

    // 4.7. Wave Clash (Opposing Wave Mid-Air Dissipation)
    function playWaveClash() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.20);
            gain.gain.setValueAtTime(0.52, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {}
    }

    // 4.8. Spell Slice (Thrown Blade Slicing Magic Energy)
    function playSpellSlice() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2100, now);
            osc.frequency.exponentialRampToValueAtTime(700, now + 0.16);
            gain.gain.setValueAtTime(0.50, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    // 4.9. Sword Catch
    function playSwordCatch() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(280, now + 0.10);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(now);
            osc.stop(now + 0.11);
        } catch (e) {}
    }

    // 5. Trig Spells (Sci-Fi Laser / Wave)
    function playSpell(type) {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;

        if (type === 'sin_wave') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(940, now + 0.28);
            gain.gain.setValueAtTime(0.48, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(now);
            osc.stop(now + 0.32);
        } else if (type === 'cos_wave') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1020, now);
            osc.frequency.exponentialRampToValueAtTime(310, now + 0.28);
            gain.gain.setValueAtTime(0.48, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(now);
            osc.stop(now + 0.32);
        } else if (type === 'tan_spike') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(95, now);
            osc.frequency.exponentialRampToValueAtTime(680, now + 0.22);
            gain.gain.setValueAtTime(0.55, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(now);
            osc.stop(now + 0.26);
        } else if (type === 'throw_sword') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.linearRampToValueAtTime(850, now + 0.10);
            osc.frequency.linearRampToValueAtTime(380, now + 0.22);
            gain.gain.setValueAtTime(0.44, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(now);
            osc.stop(now + 0.28);
        }
    }

    // 6. Dodge / Quick Dash Whoosh
    function playDodge() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const jitter = getJitter(0.10);
        const now = ctx.currentTime;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(480 * jitter, now);
            osc.frequency.exponentialRampToValueAtTime(160 * jitter, now + 0.14);
            gain.gain.setValueAtTime(0.42, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    // 7. Tactical Click (Distinct High-Pitch Double Chime)
    function playClick() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        [880, 1320].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.04));
            gain.gain.setValueAtTime(0.35, ctx.currentTime + (idx * 0.04));
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx * 0.04) + 0.07);
            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime + (idx * 0.04));
            osc.stop(ctx.currentTime + (idx * 0.04) + 0.08);
        });
    }

    // 8. Match Start: Heavy War Drum Boom & Brassy Gong (Ready... FIGHT!)
    function playMatchStart() {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;

        try {
            // Sub War Drum Boom (130Hz -> 32Hz)
            const drum = ctx.createOscillator();
            const drumGain = ctx.createGain();
            drum.type = 'sine';
            drum.frequency.setValueAtTime(130, now);
            drum.frequency.exponentialRampToValueAtTime(32, now + 0.40);
            drumGain.gain.setValueAtTime(0.85, now);
            drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            drum.connect(drumGain);
            drumGain.connect(masterSfxGain);
            drum.start(now);
            drum.stop(now + 0.48);

            // Brassy Gong Overtone
            [380, 760].forEach((freq, i) => {
                const gong = ctx.createOscillator();
                const gongGain = ctx.createGain();
                gong.type = 'triangle';
                gong.frequency.setValueAtTime(freq, now);
                gong.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.65);
                gongGain.gain.setValueAtTime(0.35 / (i + 1), now);
                gongGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
                gong.connect(gongGain);
                gongGain.connect(masterSfxGain);
                gong.start(now);
                gong.stop(now + 0.70);
            });
        } catch (e) {}

        // Automatically trigger battle beat mode for BGM!
        setBgmMode('battle');
    }

    // 9. Game Over (Dramatic K.O. Boom + Fanfare or Defeat Tone)
    function playGameOver(isWinner) {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;

        try {
            // Massive K.O. Impact Sub-drop
            const koSub = ctx.createOscillator();
            const koGain = ctx.createGain();
            koSub.type = 'sine';
            koSub.frequency.setValueAtTime(120, now);
            koSub.frequency.exponentialRampToValueAtTime(25, now + 0.60);
            koGain.gain.setValueAtTime(0.90, now);
            koGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
            koSub.connect(koGain);
            koGain.connect(masterSfxGain);
            koSub.start(now);
            koSub.stop(now + 0.70);
        } catch (e) {}

        // Transition back to lobby ambient BGM
        setBgmMode('lobby');

        const notes = isWinner ? [523.25, 659.25, 783.99, 1046.50] : [440.00, 392.00, 349.23, 261.63];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                if (document.hidden || !sfxEnabled || !audioCtx) return;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = isWinner ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.45, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.55);
            }, 250 + idx * 160);
        });
    }

    // 10. Low HP Tension Heartbeat (Rhythmic Sub-bass lub-dub when <= 2 HP)
    let lastHeartbeatTime = 0;
    function playHeartbeat() {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;

        try {
            // First beat: Lub (62Hz -> 32Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(62, now);
            osc1.frequency.exponentialRampToValueAtTime(32, now + 0.12);
            gain1.gain.setValueAtTime(0.55, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc1.connect(gain1);
            gain1.connect(masterSfxGain);
            osc1.start(now);
            osc1.stop(now + 0.15);

            // Second beat: Dub (55Hz -> 28Hz, 130ms later)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(55, now + 0.13);
            osc2.frequency.exponentialRampToValueAtTime(28, now + 0.25);
            gain2.gain.setValueAtTime(0.48, now + 0.13);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
            osc2.connect(gain2);
            gain2.connect(masterSfxGain);
            osc2.start(now + 0.13);
            osc2.stop(now + 0.28);
        } catch (e) {}
    }

    function checkHeartbeat() {
        const now = Date.now();
        // Throttle heartbeat to every 1050ms
        if (now - lastHeartbeatTime >= 1050) {
            lastHeartbeatTime = now;
            playHeartbeat();
        }
    }

    // 11. Tactical Emergency Panic Action (Alt+S Shield / Alt+D Dodge)
    function playEmergencyPanic(action) {
        if (document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || !sfxEnabled) return;
        const now = ctx.currentTime;

        try {
            if (action === 'shield') {
                // High-tech power-barrier hum
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1400, now + 0.18);
                gain.gain.setValueAtTime(0.55, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(now);
                osc.stop(now + 0.24);
                playShieldBlock();
            } else {
                // High-speed phase dodge
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(750, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);
                gain.gain.setValueAtTime(0.40, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(now);
                osc.stop(now + 0.18);
                playDodge();
            }
        } catch (e) {}
    }

    // --- CONTROLS & VOLUME ADJUSTMENT ---
    function updateUI() {
        const bgmBtn = document.getElementById('bgm_toggle_btn');
        const bgmIcon = document.getElementById('bgm_icon');
        const bgmText = document.getElementById('bgm_text');
        if (bgmBtn) {
            bgmBtn.classList.toggle('is-active', bgmEnabled && bgmVolume > 0);
            bgmBtn.classList.toggle('is-muted', !bgmEnabled || bgmVolume === 0);
        }
        if (bgmIcon) bgmIcon.innerText = (bgmEnabled && bgmVolume > 0) ? '🎵' : '🔇';
        if (bgmText) bgmText.innerText = (bgmEnabled && bgmVolume > 0) ? 'Music' : 'Music: Off';

        const bgmSlider = document.getElementById('bgm_volume_slider');
        if (bgmSlider) {
            bgmSlider.value = bgmEnabled ? Math.round(bgmVolume * 100) : 0;
        }

        const sfxBtn = document.getElementById('sfx_toggle_btn');
        const sfxIcon = document.getElementById('sfx_icon');
        const sfxText = document.getElementById('sfx_text');
        if (sfxBtn) {
            sfxBtn.classList.toggle('is-active', sfxEnabled && sfxVolume > 0);
            sfxBtn.classList.toggle('is-muted', !sfxEnabled || sfxVolume === 0);
        }
        if (sfxIcon) sfxIcon.innerText = (sfxEnabled && sfxVolume > 0) ? '🔊' : '🔈';
        if (sfxText) sfxText.innerText = (sfxEnabled && sfxVolume > 0) ? 'SFX' : 'SFX: Off';

        const sfxSlider = document.getElementById('sfx_volume_slider');
        if (sfxSlider) {
            sfxSlider.value = sfxEnabled ? Math.round(sfxVolume * 100) : 0;
        }
    }

    function toggleBGM() {
        hasUserInteracted = true;
        const ctx = getAudioContext(true);
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        bgmEnabled = !bgmEnabled;
        safeSet('sb_bgm_enabled', bgmEnabled ? '1' : '0');
        if (bgmEnabled) {
            if (bgmVolume === 0) bgmVolume = 0.70;
            startBGM();
            playClick();
        } else {
            stopBGM(true);
        }
        updateUI();
        console.log("🎵 BGM toggled:", bgmEnabled ? "ON" : "OFF");
    }

    function setBGMVolume(val) {
        hasUserInteracted = true;
        const ctx = getAudioContext(true);
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        const numericVal = parseFloat(val);
        bgmVolume = Math.max(0, Math.min(1, numericVal / 100));
        safeSet('sb_bgm_vol', bgmVolume.toFixed(2));

        if (bgmVolume > 0 && !bgmEnabled) {
            bgmEnabled = true;
            safeSet('sb_bgm_enabled', '1');
            startBGM();
        } else if (bgmVolume === 0 && bgmEnabled) {
            bgmEnabled = false;
            safeSet('sb_bgm_enabled', '0');
            stopBGM(true);
        } else if (bgmEnabled && masterBgmGain && audioCtx) {
            masterBgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterBgmGain.gain.setValueAtTime(0.35 * bgmVolume, audioCtx.currentTime);
            if (!isBgmPlaying) startBGM();
        } else if (!bgmEnabled && masterBgmGain && audioCtx) {
            masterBgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterBgmGain.gain.setValueAtTime(0, audioCtx.currentTime);
        }
        updateUI();
    }

    function toggleSFX() {
        hasUserInteracted = true;
        const ctx = getAudioContext(true);
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        sfxEnabled = !sfxEnabled;
        safeSet('sb_sfx_enabled', sfxEnabled ? '1' : '0');
        if (masterSfxGain && audioCtx) {
            masterSfxGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.65 * sfxVolume : 0, audioCtx.currentTime);
        }
        updateUI();
        if (sfxEnabled) {
            playClick();
        }
        console.log("🔊 SFX toggled:", sfxEnabled ? "ON" : "OFF");
    }

    function setSFXVolume(val) {
        hasUserInteracted = true;
        const ctx = getAudioContext(true);
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        const numericVal = parseFloat(val);
        sfxVolume = Math.max(0, Math.min(1, numericVal / 100));
        safeSet('sb_sfx_vol', sfxVolume.toFixed(2));

        if (sfxVolume > 0 && !sfxEnabled) {
            sfxEnabled = true;
            safeSet('sb_sfx_enabled', '1');
        } else if (sfxVolume === 0 && sfxEnabled) {
            sfxEnabled = false;
            safeSet('sb_sfx_enabled', '0');
        }
        if (masterSfxGain && audioCtx) {
            masterSfxGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.65 * sfxVolume : 0, audioCtx.currentTime);
        }
        updateUI();
        if (sfxEnabled) playClick();
    }

    // Browser Autoplay Policy: One-Touch Seamless Auto-Wakeup
    const UNLOCK_EVENTS = ['click', 'pointerdown', 'mousedown', 'keydown', 'touchstart', 'focus'];

    function handleFirstUserGesture() {
        if (document.hidden) return;
        hasUserInteracted = true;
        const ctx = getAudioContext(true);
        if (ctx) {
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    console.log("🔊 AudioContext successfully unlocked on first user touch!");
                    if (bgmEnabled && !isBgmPlaying && !document.hidden) {
                        startBGM();
                    }
                }).catch(() => {});
            } else if (bgmEnabled && !isBgmPlaying && !document.hidden) {
                startBGM();
            }
        }

        UNLOCK_EVENTS.forEach(evt => {
            try {
                window.removeEventListener(evt, handleFirstUserGesture, { capture: true });
                document.removeEventListener(evt, handleFirstUserGesture, { capture: true });
            } catch (e) {}
        });
    }

    UNLOCK_EVENTS.forEach(evt => {
        try {
            window.addEventListener(evt, handleFirstUserGesture, { capture: true, passive: true });
            document.addEventListener(evt, handleFirstUserGesture, { capture: true, passive: true });
        } catch (e) {}
    });

    let wasBgmPlayingBeforeHide = false;

    function handleAudioVisibility(isHidden) {
        if (isHidden) {
            wasBgmPlayingBeforeHide = isBgmPlaying;
            stopBGM(true);
            if (masterBgmGain && audioCtx) {
                try {
                    masterBgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
                    masterBgmGain.gain.setValueAtTime(0, audioCtx.currentTime);
                } catch (e) {}
            }
            if (masterSfxGain && audioCtx) {
                try {
                    masterSfxGain.gain.cancelScheduledValues(audioCtx.currentTime);
                    masterSfxGain.gain.setValueAtTime(0, audioCtx.currentTime);
                } catch (e) {}
            }
            if (audioCtx && audioCtx.state === 'running') {
                audioCtx.suspend().catch(() => {});
            }
        } else {
            if (audioCtx && audioCtx.state === 'suspended' && hasUserInteracted) {
                audioCtx.resume().then(() => {
                    if (masterSfxGain) {
                        masterSfxGain.gain.cancelScheduledValues(audioCtx.currentTime);
                        masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.65 * sfxVolume : 0, audioCtx.currentTime);
                    }
                    if (masterBgmGain) {
                        masterBgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
                        masterBgmGain.gain.setValueAtTime(bgmEnabled ? 0.35 * bgmVolume : 0, audioCtx.currentTime);
                    }
                    if (bgmEnabled && (wasBgmPlayingBeforeHide || !isBgmPlaying)) {
                        startBGM();
                    }
                }).catch(() => {});
            } else if (bgmEnabled && !isBgmPlaying) {
                if (masterBgmGain && audioCtx) {
                    masterBgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
                    masterBgmGain.gain.setValueAtTime(0.35 * bgmVolume, audioCtx.currentTime);
                }
                startBGM();
            }
        }
    }

    document.addEventListener('visibilitychange', () => {
        handleAudioVisibility(!!document.hidden);
    });
    window.addEventListener('pagehide', () => {
        handleAudioVisibility(true);
    });
    window.addEventListener('pageshow', () => {
        handleAudioVisibility(!!document.hidden);
    });
    window.addEventListener('beforeunload', () => {
        handleAudioVisibility(true);
    });

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof document !== 'undefined' && document.getElementById('gui_screen')) {
            bgmMode = 'battle';
        }
        updateUI();
    });

    console.log("🔊 Stickman Battle Audio Engine loaded. BGM:", bgmEnabled ? "ON" : "OFF", "| SFX:", sfxEnabled ? "ON" : "OFF");

    // Global Audio Engine API
    window.AudioEngine = {
        handleFirstUserGesture: handleFirstUserGesture,
        startBGM: startBGM,
        stopBGM: stopBGM,
        toggleBGM: toggleBGM,
        setBGMVolume: setBGMVolume,
        setBgmMode: setBgmMode,
        toggleSFX: toggleSFX,
        setSFXVolume: setSFXVolume,
        playSwordSwing: playSwordSwing,
        playSwordClash: playSwordClash,
        playShieldBlock: playShieldBlock,
        playShieldBreak: playShieldBreak,
        playDamageHit: playDamageHit,
        playBarrierDeflect: playBarrierDeflect,
        playTrigFusion: playTrigFusion,
        playWaveClash: playWaveClash,
        playSpellSlice: playSpellSlice,
        playSwordCatch: playSwordCatch,
        playSpell: playSpell,
        playDodge: playDodge,
        playClick: playClick,
        playMatchStart: playMatchStart,
        playGameOver: playGameOver,
        playHeartbeat: playHeartbeat,
        checkHeartbeat: checkHeartbeat,
        playEmergencyPanic: playEmergencyPanic,
        isBGMEnabled: () => bgmEnabled,
        isSFXEnabled: () => sfxEnabled
    };
})();
