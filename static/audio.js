// ==============================================================================
// ⚔️ STICKMAN BATTLE - PROCEDURAL WEB AUDIO ENGINE
// Features:
// 1. Dual Independent Channels: Relaxing Ambient Lo-Fi BGM + Combat SFX
// 2. 100% Zero-Dependency Web Audio API (Zero MP3 assets, 0ms lag, no network bandwidth)
// 3. Independent Mute/Unmute Controls with localStorage Persistence
// 4. Smooth Fade Envelopes & Browser Autoplay Handling
// ==============================================================================

(function() {
    'use strict';

    // Safe Storage helper (prevents crash when browser Tracking Prevention blocks storage)
    function safeGet(key, defaultVal) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const val = window.localStorage.getItem(key);
                return val !== null ? val : defaultVal;
            }
        } catch (e) {
            console.warn("Storage access restricted by browser tracking prevention; using in-memory default.");
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

    // Preferences (Defaults: BGM = true, SFX = true)
    let bgmEnabled = safeGet('sb_bgm_enabled', '1') !== '0';
    let sfxEnabled = safeGet('sb_sfx_enabled', '1') !== '0';

    // BGM State
    let isBgmPlaying = false;
    let bgmTimer = null;
    let bgmStep = 0;

    // Relaxing Lo-Fi Ambient Chord Progression (Hz)
    // Cmaj9 -> Am9 -> Fmaj7 -> Gsus4/add9
    // Chords are soft, warm, pentatonic, and soothing for coding focus
    const CHORD_PROGRESSION = [
        [130.81, 196.00, 246.94, 293.66, 329.63], // C3, G3, B3, D4, E4
        [110.00, 164.81, 220.00, 261.63, 329.63], // A2, E3, A3, C4, E4
        [87.31, 130.81, 174.61, 220.00, 261.63],  // F2, C3, F3, A3, C4
        [98.00, 146.83, 196.00, 246.94, 293.66]   // G2, D3, G3, B3, D4
    ];

    // Ambient Sparkle Bell scale (C pentatonic higher register)
    const SPARKLE_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

    let hasUserInteracted = false;

    function getAudioContext(forceCreate) {
        if (!audioCtx) {
            if (!hasUserInteracted && !forceCreate) {
                return null; // Avoid browser autoplay warning before first user gesture
            }
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return null;
            audioCtx = new AudioContextClass();

            // Master BGM Gain (very gentle, quiet volume for relaxing background)
            masterBgmGain = audioCtx.createGain();
            masterBgmGain.gain.setValueAtTime(bgmEnabled ? 0.08 : 0.0, audioCtx.currentTime);
            masterBgmGain.connect(audioCtx.destination);

            // Master SFX Gain (crisp, tactile)
            masterSfxGain = audioCtx.createGain();
            masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.22 : 0.0, audioCtx.currentTime);
            masterSfxGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended' && (hasUserInteracted || forceCreate)) {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    // --- RELAXING AMBIENT BACKGROUND MUSIC ENGINE ---
    function playAmbientChord(freqs, duration) {
        if (!duration) duration = 4.2;
        const ctx = getAudioContext();
        if (!ctx || !bgmEnabled) return;

        const chordGain = ctx.createGain();
        chordGain.gain.setValueAtTime(0.001, ctx.currentTime);
        chordGain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 1.2); // Soft slow attack
        chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Long release

        // Warm Lowpass Filter (eliminates high harshness)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        filter.Q.setValueAtTime(0.8, ctx.currentTime);

        chordGain.connect(filter);
        filter.connect(masterBgmGain);

        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            osc.type = idx === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            // Slight detune for warm analog chorus feeling
            osc.detune.setValueAtTime((idx % 2 === 0 ? -4 : 4), ctx.currentTime);

            osc.connect(chordGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        });

        // Occasional gentle sparkle bell note
        if (Math.random() > 0.35) {
            setTimeout(() => {
                if (!bgmEnabled || !audioCtx) return;
                playSparkleBell();
            }, 1200 + Math.random() * 1200);
        }
    }

    function playSparkleBell() {
        const ctx = getAudioContext();
        if (!ctx || !bgmEnabled) return;
        const note = SPARKLE_NOTES[Math.floor(Math.random() * SPARKLE_NOTES.length)];
        const bellGain = ctx.createGain();
        bellGain.gain.setValueAtTime(0.001, ctx.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.08);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, ctx.currentTime);

        osc.connect(bellGain);
        bellGain.connect(masterBgmGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
    }

    function bgmLoop() {
        if (!bgmEnabled) {
            isBgmPlaying = false;
            return;
        }
        isBgmPlaying = true;
        const chord = CHORD_PROGRESSION[bgmStep % CHORD_PROGRESSION.length];
        bgmStep++;
        playAmbientChord(chord, 4.4);
        bgmTimer = setTimeout(bgmLoop, 4000);
    }

    function startBGM() {
        if (!bgmEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;
        if (!isBgmPlaying) {
            if (masterBgmGain) {
                masterBgmGain.gain.cancelScheduledValues(ctx.currentTime);
                masterBgmGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.4);
            }
            bgmLoop();
        }
    }

    function stopBGM() {
        isBgmPlaying = false;
        if (bgmTimer) {
            clearTimeout(bgmTimer);
            bgmTimer = null;
        }
        if (audioCtx && masterBgmGain) {
            masterBgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterBgmGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.3);
        }
    }

    // --- COMBAT SFX (ACTION SOUNDS) ---

    // 1. Sword Swing (Airy Swoosh)
    function playSwordSwing() {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const duration = 0.12;

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
            filter.frequency.setValueAtTime(750, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + duration);
            filter.Q.setValueAtTime(3.0, ctx.currentTime);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(masterSfxGain);

            noise.start(ctx.currentTime);
        } catch (e) {
            // Audio context edge case fallback
        }
    }

    // 2. Sword Clash (Metallic Ping / Ring)
    function playSwordClash() {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        [1760, 2200, 3150].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.92, ctx.currentTime + 0.28);

            const vol = idx === 0 ? 0.22 : 0.14;
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        });
    }

    // 3. Shield Block (Solid Thud)
    function playShieldBlock() {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.32, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(masterSfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    }

    // 4. Damage Hit (Punch Impact)
    function playDamageHit() {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, ctx.currentTime);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterSfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.16);
    }

    // 5. Trig Spells
    function playSpell(type) {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;

        if (type === 'sin_wave') {
            // Rising smooth oscillating chirp
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.25);

            gain.gain.setValueAtTime(0.24, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'cos_wave') {
            // Descending overhead beam
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(750, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.25);

            gain.gain.setValueAtTime(0.24, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'tan_spike') {
            // Ground burst thump + upward crack
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(65, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.18);

            gain.gain.setValueAtTime(0.28, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.24);
        } else if (type === 'throw_sword') {
            // Boomerang metallic whoosh
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
            osc.frequency.linearRampToValueAtTime(350, ctx.currentTime + 0.2);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);

            osc.connect(gain);
            gain.connect(masterSfxGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        }
    }

    // 6. Dodge / Quick Dash
    function playDodge() {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(masterSfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    }

    // 7. Tactical Click / Run Click
    function playClick() {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(masterSfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.04);
    }

    // 8. Match Start Chime
    function playMatchStart() {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        [440, 660].forEach((freq, i) => {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                gain.gain.setValueAtTime(0.2, ctx.currentTime);
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
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const notes = isWinner ? [523.25, 659.25, 783.99, 1046.50] : [392.00, 349.23, 311.13, 261.63];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = isWinner ? 'triangle' : 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                gain.gain.setValueAtTime(0.24, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

                osc.connect(gain);
                gain.connect(masterSfxGain);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.55);
            }, idx * 180);
        });
    }

    // --- CONTROLS & TOGGLES ---
    function updateUI() {
        const bgmBtn = document.getElementById('bgm_toggle_btn');
        const bgmIcon = document.getElementById('bgm_icon');
        const bgmText = document.getElementById('bgm_text');
        if (bgmBtn) {
            bgmBtn.classList.toggle('is-active', bgmEnabled);
            bgmBtn.classList.toggle('is-muted', !bgmEnabled);
        }
        if (bgmIcon) bgmIcon.innerText = bgmEnabled ? '🎵' : '🔇';
        if (bgmText) bgmText.innerText = bgmEnabled ? 'Music' : 'Music: Off';

        const sfxBtn = document.getElementById('sfx_toggle_btn');
        const sfxIcon = document.getElementById('sfx_icon');
        const sfxText = document.getElementById('sfx_text');
        if (sfxBtn) {
            sfxBtn.classList.toggle('is-active', sfxEnabled);
            sfxBtn.classList.toggle('is-muted', !sfxEnabled);
        }
        if (sfxIcon) sfxIcon.innerText = sfxEnabled ? '🔊' : '🔈';
        if (sfxText) sfxText.innerText = sfxEnabled ? 'SFX' : 'SFX: Off';
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
            startBGM();
        } else {
            stopBGM();
        }
        updateUI();
        playClick();
        console.log("🎵 BGM toggled:", bgmEnabled ? "ON" : "OFF");
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
            masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.22 : 0.0, audioCtx.currentTime);
        }
        updateUI();
        if (sfxEnabled) {
            playClick();
        }
        console.log("🔊 SFX toggled:", sfxEnabled ? "ON" : "OFF");
    }

    // Browser Autoplay Policy: resume AudioContext and start BGM on first user touch/click/key
    function handleFirstUserGesture() {
        hasUserInteracted = true;
        const ctx = getAudioContext(true);
        if (ctx) {
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    console.log("🔊 AudioContext successfully unlocked!");
                    if (bgmEnabled && !isBgmPlaying) {
                        startBGM();
                    }
                }).catch(() => {});
            } else if (bgmEnabled && !isBgmPlaying) {
                startBGM();
            }
        }
    }

    ['click', 'pointerdown', 'keydown', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, handleFirstUserGesture, { passive: true });
        document.addEventListener(evt, handleFirstUserGesture, { passive: true });
    });

    document.addEventListener('DOMContentLoaded', updateUI);

    console.log("🔊 Stickman Battle Audio Engine loaded. BGM:", bgmEnabled ? "ON" : "OFF", "| SFX:", sfxEnabled ? "ON" : "OFF");

    // Global Audio Engine API
    window.AudioEngine = {
        toggleBGM: toggleBGM,
        toggleSFX: toggleSFX,
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

