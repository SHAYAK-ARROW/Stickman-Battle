// Reusable Modern Toast Notification
function showToast({ title, message, type = 'info', duration = 3500 }) {
    let container = document.getElementById('toast_container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast_container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const iconSymbols = { success: '✓', warning: '!', info: 'ℹ' };
    const iconChar = iconSymbols[type] || 'ℹ';

    toast.innerHTML = `
        <div class="toast-icon ${type}">${iconChar}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" title="Close">&times;</button>
    `;

    const closeToast = () => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('.toast-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeToast();
    });
    toast.addEventListener('click', closeToast);

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    if (duration > 0) {
        setTimeout(closeToast, duration);
    }
}

function start_game() {
    // Server creates the private room and issues the Player 1 invite token.
    setTimeout(() => {
        triggerColdBootNotice('coldboot_host_notice', '⚡ Waking up neural arena servers... (Spins up in ~20s if waking from sleep). Please wait!');
    }, 1200);
    window.location.href = "/player1";
}

const ARCADE_STAGES = {
    'rusher': 1,
    'turtle': 2,
    'weaver': 3,
    'duelist': 4,
    'berserker': 5,
    'apex': 6
};

function getUnlockedStage() {
    let serverUnlocked = 1;
    if (typeof window.SERVER_ARCADE_UNLOCKED === 'number') {
        serverUnlocked = window.SERVER_ARCADE_UNLOCKED;
    }
    try {
        const val = localStorage.getItem('stickman_arcade_unlocked');
        const localVal = val ? parseInt(val, 10) : 1;
        const effective = Math.max(serverUnlocked, localVal);
        
        // 🔒 Keep cookie synchronized with localStorage so server session never desyncs!
        document.cookie = "stickman_arcade_unlocked=" + effective + "; path=/; max-age=31536000; SameSite=Lax";
        
        // Background sync to server session if local is ahead
        if (effective > (window.SERVER_ARCADE_UNLOCKED || 1) && !window._progressionSynced) {
            window._progressionSynced = true;
            fetch('/api/sync_progression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unlocked: effective })
            }).then(r => r.json()).then(d => {
                if (d.success) window.SERVER_ARCADE_UNLOCKED = d.unlocked;
            }).catch(() => {});
        }
        return effective;
    } catch(e) {
        return serverUnlocked;
    }
}

// 🔒 Big Center-Screen Stage Locked Modal System
function showStageLockedModal(requiredStageNum, targetDiff) {
    const modal = document.getElementById('stage_locked_modal');
    if (!modal) {
        if (typeof showToast === 'function') {
            showToast({
                title: "Stage Locked! 🔒",
                message: `Defeat Stage ${requiredStageNum} in the Arcade Ladder first!`,
                type: "warning"
            });
        }
        return;
    }

    const stageNames = {
        1: 'Stage 1 (Byte Rusher)',
        2: 'Stage 2 (Iron Turtle)',
        3: 'Stage 3 (Wave Weaver)',
        4: 'Stage 4 (Shadow Duelist)',
        5: 'Stage 5 (Berserker Ronin)',
        6: 'Stage 6 (Apex Grandmaster)'
    };
    const reqText = stageNames[requiredStageNum] || `Stage ${requiredStageNum}`;
    const reqTextEl = document.getElementById('locked_modal_req_text');
    if (reqTextEl) reqTextEl.innerText = `Conquer ${reqText} first!`;

    const descEl = document.getElementById('locked_modal_desc');
    if (descEl && targetDiff) {
        const diffDisplay = targetDiff.charAt(0).toUpperCase() + targetDiff.slice(1);
        descEl.innerText = `The battle arena for [${diffDisplay}] is locked. Defeat the prerequisite arcade challenger to proceed!`;
    }

    const playBtn = document.getElementById('locked_play_req_btn');
    if (playBtn) {
        const stageRoutes = {
            1: '/bot/rusher',
            2: '/bot/turtle',
            3: '/bot/weaver',
            4: '/bot/duelist',
            5: '/bot/berserker',
            6: '/bot/apex'
        };
        playBtn.href = stageRoutes[requiredStageNum] || '/bot/rusher';
        playBtn.innerHTML = `⚔️ Battle ${reqText} ➔`;
    }

    modal.style.display = 'flex';
}

function closeStageLockedModal() {
    const modal = document.getElementById('stage_locked_modal');
    if (modal) modal.style.display = 'none';
}
window.showStageLockedModal = showStageLockedModal;
window.closeStageLockedModal = closeStageLockedModal;

function play_bot(difficulty) {
    if (difficulty === 'dummy') {
        window.location.href = "/bot/dummy";
        return;
    }
    if (difficulty === 'master' || difficulty === 'sace') {
        const level = window.saceAvatarLevel || localStorage.getItem('stickman_sace_avatar_level') || '3';
        window.location.href = "/bot/master?level=" + encodeURIComponent(level);
        return;
    }
    const stage = ARCADE_STAGES[difficulty];
    if (stage && stage > 1) {
        const unlocked = getUnlockedStage();
        if (stage > unlocked) {
            showStageLockedModal(stage - 1, difficulty);
            return;
        }
    }
    const valid = ['easy', 'hard', 'dummy', 'beginner', 'rusher', 'turtle', 'weaver', 'duelist', 'berserker', 'apex', 'master', 'sace'];
    const diff = valid.includes(difficulty) ? difficulty : 'easy';
    setTimeout(() => {
        triggerColdBootNotice('coldboot_bot_notice', '⚡ Launching arena bot simulator... Please wait!');
    }, 1200);
    window.location.href = "/bot/" + diff;
}

function play_quick_play() {
    const unlocked = getUnlockedStage();
    const stageMapping = {
        1: 'rusher',
        2: 'turtle',
        3: 'weaver',
        4: 'duelist',
        5: 'berserker',
        6: 'apex'
    };
    const target = stageMapping[Math.min(unlocked, 6)] || 'rusher';
    play_bot(target);
}
window.play_quick_play = play_quick_play;

function updateArcadeLadderUI() {
    const unlocked = getUnlockedStage();

    // Dynamically update Quick Play subtitle with highest unlocked stage
    const qpSub = document.getElementById('quick_play_subtitle');
    if (qpSub) {
        const stageNames = {
            1: 'Stage 1 · Byte Rusher',
            2: 'Stage 2 · Iron Turtle',
            3: 'Stage 3 · Wave Weaver',
            4: 'Stage 4 · Shadow Duelist',
            5: 'Stage 5 · Berserker Ronin',
            6: 'Stage 6 · Apex Sovereign'
        };
        const currentName = stageNames[Math.min(unlocked, 6)] || `Stage ${unlocked}`;
        qpSub.innerText = `Continue Campaign: ${currentName}`;
    }

    const ladderGrid = document.querySelector('.arcade-ladder-grid');
    if (!ladderGrid) return;
    const buttons = ladderGrid.querySelectorAll('button');
    buttons.forEach((btn, idx) => {
        const stageNum = idx + 1;
        const arrow = btn.querySelector('.btn-arrow');
        if (stageNum > unlocked) {
            btn.style.opacity = '0.50';
            btn.style.filter = 'grayscale(0.4)';
            btn.title = `Locked: Defeat Stage ${stageNum - 1} to unlock`;
            if (arrow) arrow.innerText = '🔒';
        } else {
            btn.style.opacity = '1';
            btn.style.filter = 'none';
            btn.title = '';
            if (arrow) arrow.innerText = '→';
        }
    });
}

function setSaceAvatarLevel(level) {
    const lvl = parseInt(level, 10) || 3;
    window.saceAvatarLevel = lvl;
    try {
        localStorage.setItem('stickman_sace_avatar_level', lvl.toString());
    } catch(e) {}

    // Radio toggle logic: de-select others, activate chosen one
    for (let i = 1; i <= 3; i++) {
        const btn = document.getElementById('sace_avatar_btn_' + i);
        if (btn) {
            const numSpan = btn.querySelector('.avatar-num');
            if (i === lvl) {
                btn.classList.add('is-active');
                btn.setAttribute('aria-checked', 'true');
                btn.style.borderColor = 'rgba(245, 158, 11, 0.65)';
                btn.style.background = 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(168, 85, 247, 0.22) 100%)';
                btn.style.color = '#fbbf24';
                btn.style.fontWeight = '700';
                btn.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.25)';
                if (numSpan) {
                    numSpan.style.background = '#fbbf24';
                    numSpan.style.color = '#1e1b4b';
                    numSpan.style.fontWeight = '800';
                }
            } else {
                btn.classList.remove('is-active');
                btn.setAttribute('aria-checked', 'false');
                btn.style.borderColor = 'transparent';
                btn.style.background = 'transparent';
                btn.style.color = '#94a3b8';
                btn.style.fontWeight = '600';
                btn.style.boxShadow = 'none';
                if (numSpan) {
                    numSpan.style.background = 'rgba(255, 255, 255, 0.08)';
                    numSpan.style.color = '#94a3b8';
                    numSpan.style.fontWeight = '700';
                }
            }
        }
    }

    const titleEl = document.getElementById('sace_card_title');
    const descEl = document.getElementById('sace_card_desc');
    const badgeEl = document.getElementById('sace_card_badge');
    const subHeaderEl = document.getElementById('sace_section_intel');

    if (lvl === 1) {
        if (titleEl) titleEl.innerText = "👑 SACE Master Bot (Avatar 1)";
        if (badgeEl) badgeEl.innerText = "Apprentice";
        if (descEl) descEl.innerText = "2-Gram Memory · Very slow reactions · Easiest SACE level · Easier than Bot Ladder";
        if (subHeaderEl) subHeaderEl.innerText = "2-Gram Memory · Apprentice Level · Easiest";
    } else if (lvl === 2) {
        if (titleEl) titleEl.innerText = "👑 SACE Master Bot (Avatar 2)";
        if (badgeEl) badgeEl.innerText = "Tactical";
        if (descEl) descEl.innerText = "4-Gram Memory · Tactical pattern reads & sharper counters";
        if (subHeaderEl) subHeaderEl.innerText = "4-Gram Memory · Tactical Level";
    } else {
        if (titleEl) titleEl.innerText = "👑 SACE Master Bot (Avatar 3)";
        if (badgeEl) badgeEl.innerText = "Grandmaster";
        if (descEl) descEl.innerText = "Full 5-Gram Neural SACE AI · Learns habits & counters loops";
        if (subHeaderEl) subHeaderEl.innerText = "5-Gram Memory · Learns Your Code";
    }
}
window.setSaceAvatarLevel = setSaceAvatarLevel;

function initSaceAvatarSelection() {
    let savedLevel = 3;
    try {
        const val = localStorage.getItem('stickman_sace_avatar_level');
        if (val) savedLevel = parseInt(val, 10) || 3;
    } catch(e) {}
    setSaceAvatarLevel(savedLevel);
}

// ── Dynamic 20-Card Tactical Deck ─────────────────────────────
const TACTICAL_FEATURE_DECK = [
    {
        icon: "⚡",
        title: "Python Battle Logic",
        desc: "Program attacks, dashes, jumps, crouches, and shields with real-time sensory feedback."
    },
    {
        icon: "📐",
        title: "Trigonometric Spells",
        desc: "Cast <code>sin_wave(power)</code> or <code>math.sin()</code> spells directly in Python using trigonometry as your weapon."
    },
    {
        icon: "🤖",
        title: "Autonomous AI Practice",
        desc: "Duel humanized AI bots calibrated with realistic decision delays so every victory feels earned."
    },
    {
        icon: "🛡️",
        title: "Tactical Guard Break",
        desc: "Execute <code>heavy_attack()</code> when the opponent is blocking to crush their heater shield and deal guaranteed damage."
    },
    {
        icon: "💨",
        title: "Panic Hotkey Dodge",
        desc: "Cornered? Press <code>Alt + D</code> or call <code>dodge()</code> to leap backward out of lethal enemy sword range instantly."
    },
    {
        icon: "🌊",
        title: "Trig Sine Wave Shock",
        desc: "Summon a sweeping energy arc with <code>sin_wave(amplitude=50, frequency=2)</code> to hit crouching foes from a distance."
    },
    {
        icon: "🔮",
        title: "Cosecant Defense Dome",
        desc: "Project an overhead golden energy canopy with <code>cosec_dome()</code> to deflect thrown swords and falling attacks."
    },
    {
        icon: "🛡️",
        title: "Secant Kinetic Barrier",
        desc: "Raise a glowing parabolic energy wall with <code>sec_barrier()</code> that completely neutralizes oncoming projectile spells."
    },
    {
        icon: "⚔️",
        title: "Blade Throw & Boomerang",
        desc: "Use <code>throw_sword()</code> to pierce distant enemies—your enchanted blade flies right back to your stickman's hand."
    },
    {
        icon: "🥋",
        title: "Duck & Crouch Counter",
        desc: "Duck low with <code>crouch()</code> to let high horizontal slashes miss harmlessly, then punish during enemy recovery."
    },
    {
        icon: "🧠",
        title: "SACE Neural Master",
        desc: "The Apex Bot tracks your last 5 actions with an n-gram memory model. Switch between jump slashes and dashes to break its reads!"
    },
    {
        icon: "⚡",
        title: "1-Click Panic Shield",
        desc: "Under heavy fire? Hit <code>Alt + S</code> for an instant emergency shield without writing a single line of loop code."
    },
    {
        icon: "🎯",
        title: "Sensory Distance Reflex",
        desc: "Write <code>if get_enemy_distance() &lt; 80: block()</code> to execute frame-perfect parries the moment the enemy lunges."
    },
    {
        icon: "💥",
        title: "Trig Fusion Collision",
        desc: "When <code>sin_wave</code> and <code>cos_wave</code> collide at midpoint, an explosive tangent spike erupts across the arena!"
    },
    {
        icon: "🗡️",
        title: "Mid-Air Spell Slicing",
        desc: "Time your <code>throw_sword()</code> into an incoming energy wave to slice it in half and destroy it in mid-flight."
    },
    {
        icon: "🧱",
        title: "Cotangent Wall Trap",
        desc: "Erect a vertical <code>cot_wall()</code> behind a charging enemy to cut off their retreat and trap them in your combo."
    },
    {
        icon: "🏃",
        title: "Long Jump Mobility",
        desc: "Call <code>long_jump(steps=3, power=6)</code> to vault high over energy projectiles and land directly behind your opponent."
    },
    {
        icon: "⚡",
        title: "Stamina & Energy Management",
        desc: "Watch your ⚡ stamina bar. Spamming heavy spells depletes your reserve, leaving you vulnerable to counter-attacks."
    },
    {
        icon: "📁",
        title: "10-Slot Strategy Vault",
        desc: "Store and hot-swap up to 10 distinct Python combat routines directly in the battle interface using the Strategy Vault."
    },
    {
        icon: "🏆",
        title: "Cryptographic Anti-Cheat",
        desc: "Every solo arcade victory is validated by an HMAC-SHA256 server token, ensuring all 6 rank milestones are 100% earned."
    }
];

function initRandomFeatureDeck() {
    const grid = document.getElementById('features_cards_grid');
    if (!grid) return;

    // Pick 3 distinct random cards from the 20-card deck
    const indices = [];
    while (indices.length < 3) {
        const rand = Math.floor(Math.random() * TACTICAL_FEATURE_DECK.length);
        if (!indices.includes(rand)) indices.push(rand);
    }

    grid.innerHTML = indices.map(idx => {
        const card = TACTICAL_FEATURE_DECK[idx];
        return `
            <div class="feature-item">
                <div class="feature-icon">${card.icon}</div>
                <h4>${card.title}</h4>
                <p>${card.desc}</p>
            </div>
        `;
    }).join('');
}

// ── Graceful Offline & Online Network Toast ───────────────────
function showNetworkToast(isOnline) {
    let toast = document.getElementById('network_status_toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'network_status_toast';
        toast.className = 'network-status-toast';
        document.body.appendChild(toast);
    }

    if (!isOnline) {
        toast.className = 'network-status-toast is-visible';
        toast.innerHTML = '<span>📶</span> <span>You are currently offline. Check your network — local practice &amp; code are safe.</span>';
    } else {
        toast.className = 'network-status-toast is-visible is-online';
        toast.innerHTML = '<span>⚡</span> <span>Back Online! Reconnected to battle servers.</span>';
        setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 3200);
    }
}

function initNetworkStatusListeners() {
    window.addEventListener('offline', () => showNetworkToast(false));
    window.addEventListener('online', () => showNetworkToast(true));
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        showNetworkToast(false);
    }
}

// ── Live Autonomous Stickman Sparring Hero Canvas ────────────────
function initLobbySparringAnimation() {
    const canvas = document.getElementById('lobby_sparring_canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId = null;
    let cssWidth = 800;
    let cssHeight = 160;

    // Handle High-DPI screens
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        cssWidth = rect.width || 800;
        cssHeight = rect.height || 160;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        if (ctx.resetTransform) ctx.resetTransform();
        ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const groundY = 125;
    const blueColor = '#38bdf8';
    const blueBlade = '#0ea5e9';
    const redColor = '#f43f5e';
    const redBlade = '#e11d48';

    // Particle system
    const sparks = [];
    const floatingTexts = [];
    const shockwaves = [];

    function addSparks(x, y, count, primaryColor, altColor) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.9;
            const speed = 2.0 + Math.random() * 5.5;
            sparks.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.2,
                color: Math.random() > 0.4 ? primaryColor : (Math.random() > 0.5 ? altColor : '#fef08a'),
                size: 1.5 + Math.random() * 2.2,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    function addShockwave(x, y, color) {
        shockwaves.push({
            x,
            y,
            radius: 4,
            maxRadius: 48,
            color: color || '#fef08a',
            alpha: 0.95
        });
    }

    function addFloatingText(x, y, text, color) {
        floatingTexts.push({
            text,
            x,
            y,
            vy: -1.4,
            alpha: 1,
            color: color || '#fbbf24'
        });
    }

    function playAudio(action) {
        try {
            if (!window.AudioEngine) return;
            if (action === 'clash' && window.AudioEngine.playSwordClash) window.AudioEngine.playSwordClash();
            else if (action === 'shield' && window.AudioEngine.playShieldBlock) window.AudioEngine.playShieldBlock();
            else if (action === 'hit' && window.AudioEngine.playDamageHit) window.AudioEngine.playDamageHit();
            else if (action === 'wave' && window.AudioEngine.playWaveClash) window.AudioEngine.playWaveClash();
            else if (action === 'kipup' && window.AudioEngine.playDodge) window.AudioEngine.playDodge();
        } catch (_) {}
    }

    // Fighters state with dynamic base positioning and kinematic ragdoll physics
    const blueFighter = {
        name: 'Blue',
        dir: 1, // Facing right
        x: 320,
        y: groundY,
        baseX: 320,
        vx: 0,
        vy: 0,
        color: blueColor,
        bladeColor: blueBlade,
        swordAngle: 0.35,
        shieldAlpha: 0,
        crouch: 0,
        action: 'idle',
        toppleAngle: 0,
        toppleAngVel: 0,
        toppleState: 'upright', // 'upright' | 'falling' | 'dazed' | 'recovering'
        toppleDir: 1,
        toppleTimer: 0,
        isDragged: false
    };

    const redFighter = {
        name: 'Red',
        dir: -1, // Facing left
        x: 480,
        y: groundY,
        baseX: 480,
        vx: 0,
        vy: 0,
        color: redColor,
        bladeColor: redBlade,
        swordAngle: -0.35,
        shieldAlpha: 0,
        crouch: 0,
        action: 'idle',
        toppleAngle: 0,
        toppleAngVel: 0,
        toppleState: 'upright',
        toppleDir: -1,
        toppleTimer: 0,
        isDragged: false
    };

    function updateFighterOrientations() {
        if (blueFighter.baseX <= redFighter.baseX) {
            blueFighter.dir = 1;
            redFighter.dir = -1;
        } else {
            blueFighter.dir = -1;
            redFighter.dir = 1;
        }
    }

    function initFighterPositions() {
        blueFighter.baseX = Math.round(cssWidth * 0.34);
        blueFighter.x = blueFighter.baseX;
        redFighter.baseX = Math.round(cssWidth * 0.66);
        redFighter.x = redFighter.baseX;
        updateFighterOrientations();
    }
    initFighterPositions();

    function knockFighterOver(f, fallDir) {
        f.toppleState = 'falling';
        f.toppleDir = fallDir || (f.dir * -1);
        f.toppleAngVel = f.toppleDir * 0.16;
        f.vx = f.toppleDir * 3.8;
        f.action = 'toppled';
        f.shieldAlpha = 0;
        playAudio('hit');

        const pokeLabels = ['💫 OOF!', '😵 WHOA!', '🤸 TIMBER!', '💥 POKED!'];
        const chosen = pokeLabels[Math.floor(Math.random() * pokeLabels.length)];
        addFloatingText(f.x, groundY - 45, chosen, f.color);

        // Opponent reacts to the knockdown
        const opponent = f === blueFighter ? redFighter : blueFighter;
        if (opponent.toppleState === 'upright') {
            const taunts = ['😏 HAH!', '⚔️ TOO EASY!', '⚡ DOWN!', '🎯 GOT \'EM!'];
            addFloatingText(opponent.x, groundY - 45, taunts[Math.floor(Math.random() * taunts.length)], opponent.color);
            opponent.swordAngle = opponent.dir * -0.6; // Brandish blade in triumph
        }
    }

    function triggerManualClash(clickX, clickY) {
        addSparks(clickX, clickY, 32, blueColor, redColor);
        addShockwave(clickX, clickY, '#fef08a');
        playAudio('wave');

        const labels = ['⚔️ CLASH!', '🛡️ PARRY!', '⚡ COUNTER!', '💥 SHOCKWAVE!'];
        const chosen = labels[Math.floor(Math.random() * labels.length)];
        addFloatingText(clickX, clickY - 18, chosen, '#fbbf24');

        // Radial knockback on fighters
        [blueFighter, redFighter].forEach(f => {
            if (f.toppleState !== 'upright') return;
            const dx = f.x - clickX;
            const dist = Math.abs(dx);
            const force = Math.max(12, 34 - dist * 0.12);
            const pushDir = dx >= 0 ? 1 : -1;
            f.vx += pushDir * force;
            f.action = 'recoil';
            f.shieldAlpha = 0.9;
        });
    }

    // ── Mouse & Touch Ragdoll / Stand Placement Handlers ────────────
    let dragTarget = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let isActualDrag = false;

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function hitTestFighter(f, px, py) {
        if (f.toppleState === 'upright') {
            const dx = px - f.x;
            const dy = py - (groundY - 30);
            return Math.abs(dx) <= 42 && dy >= -48 && dy <= 45;
        } else {
            const lyingX = f.x + f.toppleDir * 28;
            return Math.abs(px - lyingX) <= 50 && Math.abs(py - groundY) <= 38;
        }
    }

    function onPointerDown(e) {
        const { x, y } = getCanvasCoords(e);
        dragStartX = x;
        dragStartY = y;
        lastPointerX = x;
        lastPointerY = y;
        isActualDrag = false;

        if (hitTestFighter(blueFighter, x, y)) {
            dragTarget = blueFighter;
        } else if (hitTestFighter(redFighter, x, y)) {
            dragTarget = redFighter;
        } else {
            dragTarget = null;
        }

        if (dragTarget) {
            dragTarget.isDragged = true;
            canvas.style.cursor = 'grabbing';
        }
    }

    function onPointerMove(e) {
        const { x, y } = getCanvasCoords(e);

        if (dragTarget) {
            const dist = Math.hypot(x - dragStartX, y - dragStartY);
            if (dist > 6) isActualDrag = true;

            const deltaX = x - lastPointerX;
            dragTarget.vx = deltaX;
            dragTarget.x = Math.max(40, Math.min(cssWidth - 40, x));
            dragTarget.y = Math.min(groundY, Math.max(30, y));

            // Ragdoll dangle tilt while dragged
            if (dragTarget.y < groundY - 10) {
                dragTarget.toppleAngle = (deltaX * 0.08) - (dragTarget.dir * 0.2);
            }

            lastPointerX = x;
            lastPointerY = y;
        } else {
            const hoverBlue = hitTestFighter(blueFighter, x, y);
            const hoverRed = hitTestFighter(redFighter, x, y);
            canvas.style.cursor = (hoverBlue || hoverRed) ? 'grab' : 'crosshair';
        }
    }

    function releaseDraggedFighter(f) {
        if (!f) return;
        f.isDragged = false;
        canvas.style.cursor = 'grab';

        if (isActualDrag) {
            // Check if user forcefully flung the fighter
            if (Math.abs(f.vx) > 6.5) {
                // High speed toss -> tumble and roll
                knockFighterOver(f, f.vx >= 0 ? 1 : -1);
            } else {
                // Gentle release -> LAND ON FEET AND STAND AT NEW POSITION!
                f.toppleState = 'upright';
                f.toppleAngle = 0;
                f.toppleAngVel = 0;
                f.y = groundY;
                f.crouch = 12; // Athletic crouch landing
                f.action = 'idle';
                f.vx = 0;
                f.vy = 0;
                f.baseX = Math.max(50, Math.min(cssWidth - 50, f.x));
                f.x = f.baseX;
                addSparks(f.x, groundY - 2, 9, f.color, '#ffffff');
                playAudio('kipup');
                addFloatingText(f.x, groundY - 45, '🥋 STAND!', f.color);
                updateFighterOrientations();
                choreographyTimer = 0;
                choreographyPhase = 0; // Brief stance pause at new spot
            }
        }
        dragTarget = null;
        isActualDrag = false;
    }

    function onPointerUp(e) {
        if (dragTarget) {
            releaseDraggedFighter(dragTarget);
        }
    }

    function onCanvasClick(e) {
        if (isActualDrag) {
            isActualDrag = false;
            return;
        }
        const { x, y } = getCanvasCoords(e);
        if (hitTestFighter(blueFighter, x, y)) {
            const fallDir = (x < blueFighter.x) ? 1 : -1;
            knockFighterOver(blueFighter, fallDir);
        } else if (hitTestFighter(redFighter, x, y)) {
            const fallDir = (x < redFighter.x) ? 1 : -1;
            knockFighterOver(redFighter, fallDir);
        } else {
            triggerManualClash(x, y);
        }
        isActualDrag = false;
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('click', onCanvasClick);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) onPointerDown(e);
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
        if (dragTarget) {
            releaseDraggedFighter(dragTarget);
        } else if (!isActualDrag && e.changedTouches && e.changedTouches[0]) {
            const rect = canvas.getBoundingClientRect();
            const tx = e.changedTouches[0].clientX - rect.left;
            const ty = e.changedTouches[0].clientY - rect.top;
            if (hitTestFighter(blueFighter, tx, ty)) {
                knockFighterOver(blueFighter, tx < blueFighter.x ? 1 : -1);
            } else if (hitTestFighter(redFighter, tx, ty)) {
                knockFighterOver(redFighter, tx < redFighter.x ? 1 : -1);
            } else {
                triggerManualClash(tx, ty);
            }
        }
        isActualDrag = false;
    });
    window.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) onPointerMove(e);
    }, { passive: true });

    // ── Draw stylized kinematic stickman with ragdoll support ───────
    function drawStickman(f) {
        const x = f.x;
        const y = f.y;
        const dir = f.dir;
        const crouchY = f.crouch;

        ctx.save();

        // Ragdoll rotation transformation around feet pivot
        if (f.toppleAngle !== 0) {
            ctx.translate(x, groundY);
            ctx.rotate(f.toppleAngle);
            ctx.translate(-x, -groundY);
        }

        ctx.strokeStyle = f.color;
        ctx.fillStyle = f.color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Neon Glow
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 10;

        // Head
        ctx.beginPath();
        ctx.arc(x, y - 56 + crouchY, 11, 0, Math.PI * 2);
        ctx.fill();

        // Dazed spinning stars when knocked flat
        if (f.toppleState === 'dazed') {
            ctx.save();
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = '#fef08a';
            ctx.shadowBlur = 8;
            const starOrbit = performance.now() * 0.006;
            for (let s = 0; s < 3; s++) {
                const sAngle = starOrbit + (s * Math.PI * 2 / 3);
                const starX = x + Math.cos(sAngle) * 16;
                const starY = (y - 56 + crouchY) + Math.sin(sAngle) * 7 - 8;
                ctx.beginPath();
                ctx.arc(starX, starY, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Spine / Torso
        ctx.beginPath();
        ctx.moveTo(x, y - 45 + crouchY);
        ctx.lineTo(x, y - 18 + crouchY);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        if (f.toppleState === 'falling' || f.toppleState === 'dazed') {
            // Limp tuck
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x - 8 * dir, y - 10);
            ctx.lineTo(x - 14 * dir, y - 2);
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x + 6 * dir, y - 12);
            ctx.lineTo(x + 10 * dir, y - 4);
        } else if (f.crouch > 5) {
            // Low crouch guard
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x - 14 * dir, y - 8);
            ctx.lineTo(x - 18 * dir, y);
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x + 12 * dir, y - 8);
            ctx.lineTo(x + 16 * dir, y);
        } else {
            // Athletic combat stance
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x - 12 * dir, y);
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x + 12 * dir, y);
        }
        ctx.stroke();

        // Arms & Katana
        const shoulderX = x;
        const shoulderY = y - 40 + crouchY;

        let handX = x + (18 * dir);
        let handY = y - 32 + crouchY;

        if (f.action === 'slash' || f.action === 'lunge') {
            handX = x + (32 * dir);
            handY = y - 38 + crouchY;
        } else if (f.action === 'parry') {
            handX = x + (14 * dir);
            handY = y - 44 + crouchY;
        } else if (f.action === 'recoil') {
            handX = x - (10 * dir);
            handY = y - 26 + crouchY;
        } else if (f.toppleState === 'dazed' || f.toppleState === 'falling') {
            handX = x + (12 * dir);
            handY = y - 18 + crouchY;
        }

        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Katana Blade
        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(f.swordAngle);

        // Hilt
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -6);
        ctx.stroke();

        // Crossguard
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(4, -6);
        ctx.stroke();

        // Glowing Blade
        ctx.strokeStyle = f.bladeColor;
        ctx.shadowColor = f.bladeColor;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(0, -38);
        ctx.stroke();

        // White core highlight
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(0, -36);
        ctx.stroke();

        ctx.restore();

        // Energy Parry Shield Arc
        if (f.shieldAlpha > 0.05) {
            ctx.save();
            ctx.strokeStyle = f.color;
            ctx.shadowColor = f.color;
            ctx.shadowBlur = 16;
            ctx.globalAlpha = Math.min(1, f.shieldAlpha);
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(x + 22 * dir, y - 35, 25, -Math.PI * 0.45, Math.PI * 0.45, dir < 0);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }

    let choreographyTimer = 0;
    let choreographyPhase = 0;

    function renderLoop() {
        if (document.hidden) {
            animFrameId = requestAnimationFrame(renderLoop);
            return;
        }

        const W = cssWidth;
        const H = cssHeight;

        // Clear canvas
        ctx.clearRect(0, 0, W, H);

        // Floor reflection gradient
        ctx.save();
        const floorGrad = ctx.createLinearGradient(0, groundY, 0, H);
        floorGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
        floorGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.04)');
        floorGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, groundY, W, H - groundY);

        // Neon ground line
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(30, groundY);
        ctx.lineTo(W - 30, groundY);
        ctx.stroke();
        ctx.restore();

        const blueBaseX = Math.round(W * blueFighter.baseXRatio);
        const redBaseX = Math.round(W * redFighter.baseXRatio);
        const midX = Math.round(W * 0.5);

        // ── Ragdoll Physics & Ninja Kip-Up State Machine ────────────
        [blueFighter, redFighter].forEach(f => {
            if (f.isDragged) return; // Handled in pointermove

            if (f.toppleState === 'falling') {
                f.toppleAngle += f.toppleAngVel;
                f.toppleAngVel += f.toppleDir * 0.018; // Angular gravity
                f.x += f.vx;
                f.vx *= 0.88;
                f.x = Math.max(50, Math.min(W - 50, f.x));

                const targetFlat = f.toppleDir * (Math.PI * 0.47);
                if (Math.abs(f.toppleAngle) >= Math.abs(targetFlat)) {
                    f.toppleAngle = targetFlat;
                    f.toppleAngVel = -f.toppleAngVel * 0.32; // Floor bounce
                    addSparks(f.x + f.toppleDir * 24, groundY - 2, 7, '#94a3b8', f.color);

                    if (Math.abs(f.toppleAngVel) < 0.03) {
                        f.toppleState = 'dazed';
                        f.toppleTimer = 50; // ~0.8s on floor
                    }
                }
            } else if (f.toppleState === 'dazed') {
                f.toppleTimer--;
                f.toppleAngle = f.toppleDir * (Math.PI * 0.47) + Math.sin(f.toppleTimer * 0.3) * 0.03;
                if (f.toppleTimer <= 0) {
                    f.toppleState = 'recovering';
                    f.toppleTimer = 22; // 22 frames ninja kip-up
                    f.action = 'spring_recovery';
                    playAudio('kipup');
                    const recoveryCheers = ['🥷 KIP-UP!', '⚡ UP!', '⚔️ READY!'];
                    addFloatingText(f.x, groundY - 45, recoveryCheers[Math.floor(Math.random() * recoveryCheers.length)], f.color);
                }
            } else if (f.toppleState === 'recovering') {
                f.toppleTimer--;
                const prog = 1 - (f.toppleTimer / 22);
                f.y = groundY - Math.sin(prog * Math.PI) * 26; // High ninja spring hop
                f.toppleAngle = (1 - prog) * f.toppleDir * (Math.PI * 0.47);
                if (f.toppleTimer <= 0) {
                    f.toppleAngle = 0;
                    f.y = groundY;
                    f.crouch = 12; // Athletic crouch landing
                    f.toppleState = 'upright';
                    f.action = 'idle';
                    f.baseX = Math.max(50, Math.min(W - 50, f.x));
                    updateFighterOrientations();
                    addSparks(f.x, groundY - 2, 8, f.color, '#ffffff');
                }
            } else if (f.toppleState === 'upright') {
                // Return to upright stance
                f.crouch *= 0.88;
                f.x += f.vx;
                f.vx *= 0.84;
                f.x = Math.max(50, Math.min(W - 50, f.x));
            }
        });

        // ── Autonomous Close-Quarters Blade Combat Choreography ─────
        // Choreography only progresses if both fighters are upright & not dragged
        const bothUpright = (blueFighter.toppleState === 'upright' && !blueFighter.isDragged &&
                             redFighter.toppleState === 'upright' && !redFighter.isDragged);

        if (bothUpright) {
            choreographyTimer++;

            // Dynamic left/right fighter detection based on current positions
            const leftF = (blueFighter.baseX <= redFighter.baseX) ? blueFighter : redFighter;
            const rightF = (blueFighter.baseX <= redFighter.baseX) ? redFighter : blueFighter;
            leftF.dir = 1;
            rightF.dir = -1;

            // 4 Distinct High-Impact Combat Sequences with tight punchy timing
            const phaseDurations = [50, 95, 95, 115];
            if (choreographyTimer > (phaseDurations[choreographyPhase] || 90)) {
                choreographyTimer = 0;
                choreographyPhase = (choreographyPhase + 1) % 4;
            }

            if (choreographyPhase === 0) {
                // Sequence 0: Tactical Combat Footwork & Feint Bounces
                const bounce = Math.sin(choreographyTimer * 0.1) * 2.8;
                leftF.x += (leftF.baseX + Math.sin(choreographyTimer * 0.06) * 6 - leftF.x) * 0.1;
                leftF.y = groundY + bounce;
                leftF.swordAngle = 0.35 + Math.sin(choreographyTimer * 0.08) * 0.18;
                leftF.shieldAlpha *= 0.85;

                rightF.x += (rightF.baseX - Math.sin(choreographyTimer * 0.06) * 6 - rightF.x) * 0.1;
                rightF.y = groundY + bounce;
                rightF.swordAngle = -0.35 - Math.sin(choreographyTimer * 0.08) * 0.18;
                rightF.shieldAlpha *= 0.85;

            } else if (choreographyPhase === 1) {
                // Sequence 1: Left Fighter Overhead Lunge & Physical Cross-Blade Lock
                const contactDist = 48; // Close-quarters body spacing where 38px blades cross
                const strikeTargetX = rightF.baseX - contactDist;
                const clashX = (strikeTargetX + 30 + rightF.baseX - 14) * 0.5;
                const clashY = groundY - 38;

                if (choreographyTimer < 35) {
                    // Left dashes all the way in to 48px striking contact
                    const prog = choreographyTimer / 35;
                    leftF.x = leftF.baseX + (strikeTargetX - leftF.baseX) * prog;
                    leftF.swordAngle = 0.35 + prog * 1.0; // Raising sword high
                    leftF.action = 'lunge';

                    rightF.swordAngle = -0.35 - prog * 0.5; // High parry guard
                    rightF.shieldAlpha = prog * 0.95;
                    rightF.action = 'parry';

                    if (choreographyTimer === 34) {
                        // EXACT BLADE COLLISION IMPACT!
                        addSparks(clashX, clashY, 28, leftF.color, rightF.color);
                        addShockwave(clashX, clashY, '#ffffff');
                        playAudio('clash');
                        addFloatingText(clashX, clashY - 20, '⚔️ BLADE LOCK!', '#fbbf24');
                    }
                } else if (choreographyTimer < 68) {
                    // Physical blade lock struggle (blades physically touching and vibrating with sparks)
                    leftF.x = strikeTargetX;
                    const lockJitter = Math.sin(choreographyTimer * 1.6) * 0.09;
                    leftF.swordAngle = 1.35 + lockJitter;
                    rightF.swordAngle = -0.85 - lockJitter;
                    leftF.action = 'slash';
                    rightF.action = 'parry';
                    rightF.shieldAlpha = 0.85;

                    if (choreographyTimer % 8 === 0) {
                        addSparks(clashX, clashY, 3, '#fef08a', leftF.color);
                    }
                } else if (choreographyTimer === 68) {
                    // Right fighter pushes back with a shield bash
                    leftF.vx = -5.2;
                    leftF.action = 'recoil';
                    addSparks(clashX, clashY, 12, rightF.color, '#ffffff');
                    playAudio('shield');
                } else {
                    // Recoil return to base positions
                    leftF.x += (leftF.baseX - leftF.x) * 0.08;
                    rightF.x += (rightF.baseX - rightF.x) * 0.08;
                    leftF.swordAngle += (0.35 - leftF.swordAngle) * 0.08;
                    rightF.swordAngle += (-0.35 - rightF.swordAngle) * 0.08;
                    rightF.shieldAlpha *= 0.88;
                }

            } else if (choreographyPhase === 2) {
                // Sequence 2: Right Fighter Low Sweep & Left Fighter Aerial Leap Deflect
                const contactDist = 48;
                const sweepTargetX = leftF.baseX + contactDist;
                const clashX = (sweepTargetX + leftF.baseX) * 0.5;
                const clashY = groundY - 36;

                if (choreographyTimer < 35) {
                    const prog = choreographyTimer / 35;
                    // Right dashes low into close range
                    rightF.x = rightF.baseX - (rightF.baseX - sweepTargetX) * prog;
                    rightF.crouch = prog * 14;
                    rightF.swordAngle = -0.35 - prog * 1.1; // Low sweep
                    rightF.action = 'lunge';

                    // Left leap-dodges into the air
                    leftF.y = groundY - Math.sin(prog * Math.PI) * 30;
                    leftF.swordAngle = 0.35 + prog * 1.1; // Slashes downward from air
                    leftF.action = 'slash';

                    if (choreographyTimer === 34) {
                        // Mid-air blade collision
                        addSparks(clashX, clashY, 28, rightF.color, leftF.color);
                        addShockwave(clashX, clashY, leftF.color);
                        playAudio('clash');
                        addFloatingText(clashX, clashY - 20, '⚡ AIR DEFLECT!', '#38bdf8');
                    }
                } else if (choreographyTimer < 70) {
                    leftF.y += (groundY - leftF.y) * 0.12;
                    leftF.crouch = 8;
                    rightF.crouch *= 0.9;
                    rightF.x = sweepTargetX;
                    rightF.shieldAlpha = 0.85;
                } else {
                    leftF.y = groundY;
                    leftF.x += (leftF.baseX - leftF.x) * 0.08;
                    rightF.x += (rightF.baseX - rightF.x) * 0.08;
                    leftF.swordAngle += (0.35 - leftF.swordAngle) * 0.08;
                    rightF.swordAngle += (-0.35 - rightF.swordAngle) * 0.08;
                    rightF.shieldAlpha *= 0.88;
                }

            } else if (choreographyPhase === 3) {
                // Sequence 3: High-Speed 3-Hit Flurry & Mutual Heavy Recoil
                const meetMidX = (leftF.baseX + rightF.baseX) * 0.5;
                const leftClashX = meetMidX - 24;
                const rightClashX = meetMidX + 24;
                const clashX = meetMidX;

                if (choreographyTimer < 25) {
                    // Both rush directly into 48px body-to-body clash
                    const prog = choreographyTimer / 25;
                    leftF.x = leftF.baseX + (leftClashX - leftF.baseX) * prog;
                    rightF.x = rightF.baseX - (rightF.baseX - rightClashX) * prog;
                    leftF.swordAngle = 0.35 + prog * 0.9;
                    rightF.swordAngle = -0.35 - prog * 0.9;

                } else if (choreographyTimer < 45) {
                    // Hit 1: High Clash
                    leftF.x = leftClashX;
                    rightF.x = rightClashX;
                    leftF.swordAngle = 1.25;
                    rightF.swordAngle = -1.25;
                    if (choreographyTimer === 26) {
                        addSparks(clashX, groundY - 44, 20, leftF.color, rightF.color);
                        playAudio('clash');
                        addFloatingText(clashX, groundY - 60, '⚔️ CLASH!', '#fbbf24');
                    }
                } else if (choreographyTimer < 65) {
                    // Hit 2: Low Counter Parry
                    leftF.crouch = 8;
                    rightF.crouch = 8;
                    leftF.swordAngle = 0.8;
                    rightF.swordAngle = -0.8;
                    if (choreographyTimer === 46) {
                        addSparks(clashX, groundY - 26, 20, rightF.color, leftF.color);
                        playAudio('clash');
                        addFloatingText(clashX, groundY - 60, '🛡️ PARRY!', '#f43f5e');
                    }
                } else if (choreographyTimer < 90) {
                    // Hit 3: Heavy Mutual Thrust Shockwave
                    if (choreographyTimer === 66) {
                        addSparks(clashX, groundY - 36, 36, '#ffffff', '#fbbf24');
                        addShockwave(clashX, groundY - 36, '#ffffff');
                        playAudio('wave');
                        addFloatingText(clashX, groundY - 60, '💥 CROSS-COUNTER!', '#fbbf24');

                        // Recoil blast blows both fighters backward
                        leftF.vx = -5.8;
                        rightF.vx = 5.8;
                        leftF.shieldAlpha = 0.85;
                        rightF.shieldAlpha = 0.85;
                    }
                } else {
                    // Return to dynamic base stances
                    leftF.crouch *= 0.88;
                    rightF.crouch *= 0.88;
                    leftF.x += (leftF.baseX - leftF.x) * 0.08;
                    rightF.x += (rightF.baseX - rightF.x) * 0.08;
                    leftF.swordAngle += (0.35 - leftF.swordAngle) * 0.08;
                    rightF.swordAngle += (-0.35 - rightF.swordAngle) * 0.08;
                    leftF.shieldAlpha *= 0.88;
                    rightF.shieldAlpha *= 0.88;
                }
            }
        }

        // Draw Shadows below fighters
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(blueFighter.x, groundY + 2, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(redFighter.x, groundY + 2, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw Fighters
        drawStickman(blueFighter);
        drawStickman(redFighter);

        // Update & Render Shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += 2.4;
            sw.alpha *= 0.91;
            if (sw.alpha < 0.02 || sw.radius >= sw.maxRadius) {
                shockwaves.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = sw.alpha;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Update & Render Sparks
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.16;
            s.alpha -= s.decay;

            if (s.alpha <= 0 || s.y > groundY + 5) {
                sparks.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.fillStyle = s.color;
            ctx.globalAlpha = Math.max(0, s.alpha);
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Update & Render Floating Texts
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.022;

            if (ft.alpha <= 0) {
                floatingTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.font = 'bold 12px "DM Sans", -apple-system, sans-serif';
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 10;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        animFrameId = requestAnimationFrame(renderLoop);
    }

    animFrameId = requestAnimationFrame(renderLoop);
}

function triggerColdBootNotice(elementId, msg) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerText = msg || "⚡ Connecting to battle server... (Spins up in ~20s if waking from sleep)";
    el.style.display = "block";
}

document.addEventListener('DOMContentLoaded', () => {
    updateArcadeLadderUI();
    initSaceAvatarSelection();
    initRandomFeatureDeck();
    initNetworkStatusListeners();
    initLobbySparringAnimation();
});

function join_custom_room() {
    const input = document.getElementById("room_input");
    const value = input ? input.value.trim() : "";
    if (value && value.includes("?token=")) {
        // Private invite link: preserve the tokenized URL.
        window.location.href = value;
    } else if (value) {
        // Public room-code join: the server assigns the open Player 2 slot.
        const roomCode = value.split('/').pop().split('?')[0].trim();
        window.location.href = "/room/" + encodeURIComponent(roomCode);
    } else {
        showToast({
            title: "Room Code Required",
            message: "Enter a valid room code (e.g. room_a1b2c3) or paste Player 1's invite link.",
            type: "warning"
        });
    }
}
