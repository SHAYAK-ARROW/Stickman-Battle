// ==============================================================================
// ⚔️ STICKMAN BATTLE - PROCEDURAL WEB AUDIO ENGINE (V2 High-Fidelity & Audible)
// Features:
// 1. Dual Independent Channels: Audible Relaxing Lo-Fi BGM + Punchy Combat SFX
// 2. 100% Zero-Dependency Web Audio API (Zero MP3 assets, 0ms latency)
// 3. Tuned Frequencies for Laptop & Mobile Speakers (300Hz - 2500Hz)
// 4. Safe Storage (Edge Tracking Prevention Proof) & Instant Autoplay Unlocking
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

    // Preferences (Defaults: BGM = true, SFX = true)
    let bgmEnabled = safeGet('sb_bgm_enabled', '1') !== '0';
    let sfxEnabled = safeGet('sb_sfx_enabled', '1') !== '0';

    // BGM State
    let isBgmPlaying = false;
    let bgmTimer = null;
    let bgmStep = 0;
    let hasUserInteracted = false;

    // Audible Relaxing Lo-Fi Ambient Chord Progression (Cmaj7 -> Am7 -> Fmaj7 -> G7)
    // Frequencies tuned between 220Hz and 880Hz so laptop speakers project them clearly
    const CHORD_PROGRESSION = [
        [261.63, 329.63, 392.00, 493.88], // C4, E4, G4, B4 (Cmaj7)
        [220.00, 261.63, 329.63, 392.00], // A3, C4, E4, G4 (Am7)
        [174.61, 220.00, 261.63, 329.63], // F3, A3, C4, E4 (Fmaj7)
        [196.00, 246.94, 293.66, 349.23]  // G3, B3, D4, F4 (G7)
    ];

    const SPARKLE_NOTES = [523.25, 659.25, 783.99, 1046.50, 1174.66];

    function getAudioContext(forceCreate) {
        if (!audioCtx) {
            if (!hasUserInteracted && !forceCreate) {
                return null;
            }
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return null;
            audioCtx = new AudioContextClass();

            // Master BGM Gain (audible and soothing: 0.30)
            masterBgmGain = audioCtx.createGain();
            masterBgmGain.gain.setValueAtTime(bgmEnabled ? 0.30 : 0.0001, audioCtx.currentTime);
            masterBgmGain.connect(audioCtx.destination);

            // Master SFX Gain (punchy and crisp: 0.55)
            masterSfxGain = audioCtx.createGain();
            masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.55 : 0.0001, audioCtx.currentTime);
            masterSfxGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended' && (hasUserInteracted || forceCreate)) {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    // --- RELAXING AMBIENT BACKGROUND MUSIC ENGINE ---
    function playAmbientChord(freqs, duration) {
        if (!duration) duration = 4.0;
        const ctx = getAudioContext(true);
        if (!ctx || !bgmEnabled) return;

        const chordGain = ctx.createGain();
        chordGain.gain.setValueAtTime(0.001, ctx.currentTime);
        chordGain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.8); // Smooth attack
        chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Smooth release

        // Lowpass filter at 1200Hz keeps sound warm without muffling out of laptop speaker range
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
            osc.detune.setValueAtTime((idx % 2 === 0 ? -5 : 5), ctx.currentTime);

            osc.connect(chordGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        });

        // Gentle sparkle chime
        if (Math.random() > 0.3) {
            setTimeout(() => {
                if (!bgmEnabled || !audioCtx) return;
                playSparkleBell();
            }, 1000 + Math.random() * 1200);
        }
    }

    function playSparkleBell() {
        const ctx = getAudioContext(true);
        if (!ctx || !bgmEnabled) return;
        const note = SPARKLE_NOTES[Math.floor(Math.random() * SPARKLE_NOTES.length)];
        const bellGain = ctx.createGain();
        bellGain.gain.setValueAtTime(0.001, ctx.currentTime);
        bellGain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.05);
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
        if (!bgmEnabled) {
            isBgmPlaying = false;
            return;
        }
        isBgmPlaying = true;
        const chord = CHORD_PROGRESSION[bgmStep % CHORD_PROGRESSION.length];
        bgmStep++;
        playAmbientChord(chord, 4.2);
        bgmTimer = setTimeout(bgmLoop, 3800);
    }

    function startBGM() {
        if (!bgmEnabled) return;
        const ctx = getAudioContext(true);
        if (!ctx) return;
        if (masterBgmGain) {
            masterBgmGain.gain.cancelScheduledValues(ctx.currentTime);
            masterBgmGain.gain.setValueAtTime(0.30, ctx.currentTime);
        }
        if (!isBgmPlaying) {
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
            masterBgmGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
        }
    }

    // --- AUDIBLE COMBAT ACTION SFX ---

    // 1. Sword Swing (Crisp Swoosh)
    function playSwordSwing() {
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

    // 8. Match Start Chime (440Hz -> 880Hz Ready Bell)
    function playMatchStart() {
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        [523.25, 783.99].forEach((freq, i) => {
            setTimeout(() => {
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
        const ctx = getAudioContext();
        if (!ctx || !sfxEnabled) return;
        const notes = isWinner ? [523.25, 659.25, 783.99, 1046.50] : [440.00, 392.00, 349.23, 261.63];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
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
            masterSfxGain.gain.setValueAtTime(sfxEnabled ? 0.55 : 0.0001, audioCtx.currentTime);
        }
        updateUI();
        if (sfxEnabled) {
            playClick();
        }
        console.log("🔊 SFX toggled:", sfxEnabled ? "ON" : "OFF");
    }

    // Browser Autoplay Policy: resume AudioContext and start BGM on first user gesture
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
