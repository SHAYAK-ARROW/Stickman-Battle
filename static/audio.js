// ==============================================================================
// ⚔️ STICKMAN BATTLE - PROCEDURAL WEB AUDIO ENGINE (V3 Seamless & Volume Control)
// Features:
// 1. Dual Independent Channels: Audible Relaxing Lo-Fi BGM + Punchy Combat SFX
// 2. Seamless Gapless Crossfade (Zero awkward pauses between chord progressions)
// 3. Smooth Volume Sliders with localStorage Persistence
// 4. Global Availability (Home Lobby + Battle Arena)
// 5. Safe Storage (Edge Tracking Prevention Proof) & Instant Autoplay Unlocking
// ==============================================================================

(function() {
    'use strict';

    // Safe Storage helper
    function safeGet(key, defaultVal) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const val = window.localStorage.getItem(key);
                return val !== null ? val : defaultVal;
            }
        } catch (e) {
            // Edge Tracking Prevention or sandboxed storage exception
        }
        return defaultVal;
    }

    function safeSet(key, val) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, val);
            }
        } catch (e) {
            // Ignored
        }
    }

    let audioCtx = null;
    let masterBgmGain = null;
    let masterSfxGain = null;

    // Preferences & Volumes (Defaults: BGM = 70%, SFX = 80%)
    let bgmEnabled = safeGet('sb_bgm_enabled', '1') !== '0';
    let sfxEnabled = safeGet('sb_sfx_enabled', '1') !== '0';
    let bgmVolume = parseFloat(safeGet('sb_bgm_vol', '0.70'));
    let sfxVolume = parseFloat(safeGet('sb_sfx_vol', '0.80'));

    // BGM State
    let isBgmPlaying = false;
    let bgmTimer = null;
    let bgmStep = 0;
    let hasUserInteracted = false;

    // Audible Relaxing Lo-Fi Ambient Chord Progression (Cmaj7 -> Am7 -> Fmaj7 -> G7)
    const CHORD_PROGRESSION = [
        [261.63, 329.63, 392.00, 493.88], // C4, E4, G4, B4 (Cmaj7)
        [220.00, 261.63, 329.63, 392.00], // A3, C4, E4, G4 (Am7)
        [174.61, 220.00, 261.63, 329.63], // F3, A3, C4, E4 (Fmaj7)
        [196.00, 246.94, 293.66, 349.23]  // G3, B3, D4, F4 (G7)
    ];

    const SPARKLE_NOTES = [523.25, 659.25, 783.99, 1046.50, 1174.66];

    function getAudioContext(forceCreate) {
        if (document.hidden && !forceCreate) {
            return null;
        }
        if (!audioCtx) {
            if (!hasUserInteracted && !forceCreate) {
                return null;
            }
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
            const initSfxGain = sfxEnabled ? 0.60 * sfxVolume : 0;
            masterSfxGain.gain.setValueAtTime(initSfxGain, audioCtx.currentTime);
            masterSfxGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended' && (hasUserInteracted || forceCreate)) {
            if (!document.hidden) {
                audioCtx.resume().catch(() => {});
            }
        }
        return audioCtx;
    }

    // --- RELAXING AMBIENT BACKGROUND MUSIC ENGINE ---
    // Seamless Gapless Crossfading: duration 5.5s, step timer 3.2s
    let droneOsc1 = null;
    let droneOsc2 = null;
    let droneFilter = null;
    let droneGain = null;
    let activeChordOscs = [];
    let activeChordGain = null;
    let sparkleTimer = null;

    // Parallel "straight line" ambient drone / synth pad (warm root & fifth grounding bed)
    function startDronePad() {
        if (!bgmEnabled || document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx || droneOsc1) return;

        try {
            droneFilter = ctx.createBiquadFilter();
            droneFilter.type = 'lowpass';
            droneFilter.frequency.setValueAtTime(320, ctx.currentTime);
            droneFilter.Q.setValueAtTime(0.6, ctx.currentTime);

            droneGain = ctx.createGain();
            droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
            // Gentle fade-in over 2.0s to a subtle background grounding bed
            droneGain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2.0);

            droneOsc1 = ctx.createOscillator();
            droneOsc1.type = 'sine';
            droneOsc1.frequency.setValueAtTime(130.81, ctx.currentTime); // C3 root

            droneOsc2 = ctx.createOscillator();
            droneOsc2.type = 'triangle';
            droneOsc2.frequency.setValueAtTime(196.00, ctx.currentTime); // G3 5th
            droneOsc2.detune.setValueAtTime(3, ctx.currentTime); // Gentle chorus width

            droneOsc1.connect(droneFilter);
            droneOsc2.connect(droneFilter);
            droneFilter.connect(droneGain);
            droneGain.connect(masterBgmGain);

            droneOsc1.start();
            droneOsc2.start();
        } catch (e) {
            console.warn("Drone pad initialization skipped:", e);
        }
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
        if (!ctx || !bgmEnabled || document.hidden) return;

        // Clean up any lingering chord oscillators before starting next step
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
        chordGain.gain.exponentialRampToValueAtTime(0.30, ctx.currentTime + 1.0); // Gentle 1s swell
        chordGain.gain.setValueAtTime(0.30, ctx.currentTime + 2.8); // Steady sustain
        chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Smooth decay

        // Warm Lowpass Filter (keeps warm chiptune warmth, no harsh high buzz)
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

        // Gentle sparkle bell
        if (Math.random() > 0.3) {
            if (sparkleTimer) clearTimeout(sparkleTimer);
            sparkleTimer = setTimeout(() => {
                if (!bgmEnabled || !audioCtx || document.hidden) return;
                playSparkleBell();
            }, 1000 + Math.random() * 1200);
        }
    }

    function playSparkleBell() {
        const ctx = getAudioContext(true);
        if (!ctx || !bgmEnabled || document.hidden) return;
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

    function bgmLoop() {
        if (!bgmEnabled || document.hidden) {
            isBgmPlaying = false;
            return;
        }
        isBgmPlaying = true;
        const chord = CHORD_PROGRESSION[bgmStep % CHORD_PROGRESSION.length];
        bgmStep++;
        playAmbientChord(chord, 5.5);
        // Start next chord at 3.2s to smoothly crossfade over the decaying chord! Zero gap!
        bgmTimer = setTimeout(bgmLoop, 3200);
    }

    function startBGM() {
        if (!bgmEnabled || document.hidden) return;
        const ctx = getAudioContext(true);
        if (!ctx) return;
        if (masterBgmGain) {
            masterBgmGain.gain.cancelScheduledValues(ctx.currentTime);
            masterBgmGain.gain.setValueAtTime(0.38 * bgmVolume, ctx.currentTime);
        }
        startDronePad();
        if (!isBgmPlaying) {
            bgmLoop();
        }
    }

    function stopBGM(immediate) {
        isBgmPlaying = false;
        if (bgmTimer) {
            clearTimeout(bgmTimer);
            bgmTimer = null;
        }
        if (sparkleTimer) {
            clearTimeout(sparkleTimer);
            sparkleTimer = null;
        }
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

    // --- AUDIBLE COMBAT ACTION SFX ---

    // 1. Sword Swing (Crisp Swoosh)
    function playSwordSwing() {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const duration = 0.15;

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
            filter.frequency.setValueAtTime(950, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + duration);
            filter.Q.setValueAtTime(2.5, ctx.currentTime);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.40, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterSfxGain);

            noise.start(ctx.currentTime);
        } catch (e) {}
    }

    // 2. Sword Clash (Loud Ringing Metallic Clang)
    function playSwordClash() {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        [1760, 2400, 3200].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.9, ctx.currentTime + 0.32);

            const vol = idx === 0 ? 0.45 : 0.25;
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.35);
        });
    }

    // 3. Shield Block (Solid Punchy Thud)
    function playShieldBlock() {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.55, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(masterSfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
    }

    // 4. Damage Hit (Crisp Punch Impact)
    function playDamageHit() {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.18);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);

        gain.gain.setValueAtTime(0.60, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterSfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    }

    // 5. Trig Spells (Sci-Fi Laser / Wave)
    function playSpell(type) {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;

        if (type === 'sin_wave') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.28);

            gain.gain.setValueAtTime(0.45, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.32);
        } else if (type === 'cos_wave') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(980, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.28);

            gain.gain.setValueAtTime(0.45, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.32);
        } else if (type === 'tan_spike') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.22);

            gain.gain.setValueAtTime(0.50, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.26);
        } else if (type === 'throw_sword') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
            osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.22);

            gain.gain.setValueAtTime(0.40, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.26);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.28);
        }
    }

    // 6. Dodge / Quick Dash
    function playDodge() {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(masterSfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.14);
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

    // 8. Match Start Chime (523Hz -> 783Hz Ready Bell)
    function playMatchStart() {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        [523.25, 783.99].forEach((freq, i) => {
            setTimeout(() => {
                if (document.hidden || !sfxEnabled) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                gain.gain.setValueAtTime(0.40, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.38);
            }, i * 160);
        });
    }

    // 9. Game Over (Victory / Defeat)
    function playGameOver(isWinner) {
        if (document.hidden) return;
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const notes = isWinner ? [523.25, 659.25, 783.99, 1046.50] : [440.00, 392.00, 349.23, 261.63];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                if (document.hidden || !sfxEnabled) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = isWinner ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                gain.gain.setValueAtTime(0.45, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.55);
            }, idx * 180);
        });
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
            masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.60 * sfxVolume : 0, audioCtx.currentTime);
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
            masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.60 * sfxVolume : 0, audioCtx.currentTime);
        }
        updateUI();
        if (sfxEnabled) playClick();
    }

    // Browser Autoplay Policy: resume AudioContext and start BGM on first user gesture
    function handleFirstUserGesture() {
        if (document.hidden) return; // Do not unlock or resume on clicks while tab is hidden/closing!
        hasUserInteracted = true;
        const ctx = getAudioContext(true);
        if (ctx) {
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    console.log("🔊 AudioContext successfully unlocked!");
                    if (bgmEnabled && !isBgmPlaying && !document.hidden) {
                        startBGM();
                    }
                }).catch(() => {});
            } else if (bgmEnabled && !isBgmPlaying && !document.hidden) {
                startBGM();
            }
        }
    }

    ['click', 'pointerdown', 'keydown', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, handleFirstUserGesture, { passive: true });
        document.addEventListener(evt, handleFirstUserGesture, { passive: true });
    });

    let wasBgmPlayingBeforeHide = false;

    // Complete Audio Mute/Teardown on Tab Switch or Minimize
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
                        masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.60 * sfxVolume : 0, audioCtx.currentTime);
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

    // Handle tab close or page navigation
    window.addEventListener('pagehide', () => {
        handleAudioVisibility(true);
    });
    window.addEventListener('pageshow', () => {
        handleAudioVisibility(!!document.hidden);
    });
    window.addEventListener('beforeunload', () => {
        handleAudioVisibility(true);
    });

    document.addEventListener('DOMContentLoaded', updateUI);

    console.log("🔊 Stickman Battle Audio Engine loaded. BGM:", bgmEnabled ? "ON" : "OFF", "| SFX:", sfxEnabled ? "ON" : "OFF");

    // Global Audio Engine API
    window.AudioEngine = {
        handleFirstUserGesture: handleFirstUserGesture,
        startBGM: startBGM,
        stopBGM: stopBGM,
        toggleBGM: toggleBGM,
        setBGMVolume: setBGMVolume,
        toggleSFX: toggleSFX,
        setSFXVolume: setSFXVolume,
        playSwordSwing: playSwordSwing,
        playSwordClash: playSwordClash,
        playShieldBlock: playShieldBlock,
        playDamageHit: playDamageHit,
        playSpell: playSpell,
        playDodge: playDodge,
        playClick: playClick,
        playMatchStart: playMatchStart,
        playGameOver: playGameOver,
        isBGMEnabled: () => bgmEnabled,
        isSFXEnabled: () => sfxEnabled
    };
})();
