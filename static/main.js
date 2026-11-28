// --- GOOGLE ANALYTICS (GA4) TELEMETRY HELPER ---
function trackGameEvent(eventName, params = {}) {
    const isLocal = Boolean(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.protocol === 'file:'
    );
    if (isLocal) {
        console.log(`%c[GA4 Local Dev (Untracked)] ${eventName}`, 'color: #00e5ff; font-weight: bold;', params);
        return;
    }
    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, {
                app_name: 'StickmanBattle',
                timestamp: Date.now(),
                ...params
            });
            console.log(`[GA4 Tracked] ${eventName}`, params);
        }
    } catch (err) {
        console.warn('[GA4] Event tracking skipped:', err);
    }
}
window.trackGameEvent = trackGameEvent;

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
    trackGameEvent('lobby_host_pvp');
    // Server creates the private room and issues the Player 1 invite token.
    setTimeout(() => {
        triggerColdBootNotice('coldboot_host_notice', '⚡ Waking up arena servers... (Ready in ~20s if waking from sleep). Please wait!');
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
    trackGameEvent('lobby_start_bot', { difficulty: diff, stage: stage || 1 });
    setTimeout(() => {
        triggerColdBootNotice('coldboot_bot_notice', '⚡ Launching arena bot simulator... Please wait!');
    }, 1200);
    window.location.href = "/bot/" + diff;
}

function play_quick_play() {
    const unlocked = getUnlockedStage();
    trackGameEvent('lobby_quick_play', { unlocked_stage: unlocked });
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
        if (descEl) descEl.innerText = "Slow reaction speed · Forgives mistakes · Perfect starting dojo";
        if (subHeaderEl) subHeaderEl.innerText = "Apprentice Dojo · Forgives Mistakes";
    } else if (lvl === 2) {
        if (titleEl) titleEl.innerText = "👑 SACE Master Bot (Avatar 2)";
        if (badgeEl) badgeEl.innerText = "Tactical";
        if (descEl) descEl.innerText = "Reads repetitive loops · Punishes predictable attack chains";
        if (subHeaderEl) subHeaderEl.innerText = "Tactical Duelist · Punishes Whiffs";
    } else {
        if (titleEl) titleEl.innerText = "👑 SACE Master Bot (Avatar 3)";
        if (badgeEl) badgeEl.innerText = "Grandmaster";
        if (descEl) descEl.innerText = "Learns your combat habits live · Parries attack loops · Phase 2 Enrage!";
        if (subHeaderEl) subHeaderEl.innerText = "Adaptive Brain · Studies Your Code";
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

// ── Live Autonomous Stickman Sparring Open Arena Stage (Full-Hero Unbounded Physics) ────
function initLobbySparringAnimation() {
    const canvas = document.getElementById('lobby_sparring_canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId = null;
    let cssWidth = 1200;
    let cssHeight = 460;
    let groundY = 408;
    const minHeadRoomY = 74; // Ensures stickman head (y - 56, r=11 -> top at y - 67) and raised sword never clip at canvas top

    // Handle High-DPI screens and dynamic container size
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        cssWidth = Math.max(600, Math.round(rect.width || 1200));
        cssHeight = Math.max(380, Math.round(rect.height || 460));
        groundY = Math.round(cssHeight - 52);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        if (ctx.resetTransform) ctx.resetTransform();
        ctx.scale(dpr, dpr);

        if (blueFighter && !blueFighter.isDragged && blueFighter.toppleState === 'upright') {
            blueFighter.y = groundY;
        }
        if (redFighter && !redFighter.isDragged && redFighter.toppleState === 'upright') {
            redFighter.y = groundY;
        }
    }

    const blueColor = '#38bdf8';
    const blueBlade = '#0ea5e9';
    const redColor = '#f43f5e';
    const redBlade = '#e11d48';

    // Particle & effect systems
    const sparks = [];
    const floatingTexts = [];
    const shockwaves = [];

    function addSparks(x, y, count, primaryColor, altColor) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.9;
            const speed = 2.0 + Math.random() * 6.0;
            sparks.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.4,
                color: Math.random() > 0.4 ? primaryColor : (Math.random() > 0.5 ? altColor : '#fef08a'),
                size: 1.5 + Math.random() * 2.4,
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
            maxRadius: 52,
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

    // Dynamic fighters with authentic kinetic velocity and positioning
    const blueFighter = {
        name: 'Blue',
        dir: 1,
        x: 440,
        y: groundY,
        baseX: 440,
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
        toppleState: 'upright',
        toppleDir: 1,
        toppleTimer: 0,
        isDragged: false
    };

    const redFighter = {
        name: 'Red',
        dir: -1,
        x: 760,
        y: groundY,
        baseX: 760,
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
        const midX = Math.round(cssWidth * 0.5);
        blueFighter.baseX = midX - 160;
        blueFighter.x = blueFighter.baseX;
        blueFighter.y = groundY;
        redFighter.baseX = midX + 160;
        redFighter.x = redFighter.baseX;
        redFighter.y = groundY;
        updateFighterOrientations();
    }

    resizeCanvas();
    initFighterPositions();
    window.addEventListener('resize', resizeCanvas);

    function triggerManualClash(clickX, clickY) {
        addSparks(clickX, clickY, 32, blueColor, redColor);
        addShockwave(clickX, clickY, '#fef08a');
        playAudio('wave');

        const labels = ['⚔️ CLASH!', '🛡️ PARRY!', '⚡ COUNTER!', '💥 SHOCKWAVE!'];
        const chosen = labels[Math.floor(Math.random() * labels.length)];
        addFloatingText(clickX, clickY - 18, chosen, '#fbbf24');

        // Radial knockback impulse on fighters (engine.py physics)
        [blueFighter, redFighter].forEach(f => {
            if (f.toppleState !== 'upright') return;
            const dx = f.x - clickX;
            const dist = Math.abs(dx);
            const force = Math.max(6, 20 - dist * 0.04);
            const pushDir = dx >= 0 ? 1 : -1;
            f.vx += pushDir * force;
            f.action = 'recoil';
            f.shieldAlpha = 0.9;
        });
    }

    // ── Mouse & Touch Ragdoll Drag, Fling Toss & Stand Handlers ────────
    let dragTarget = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let isActualDrag = false;
    let pointerHistory = [];

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
        const dx = Math.abs(px - f.x);
        const dy = py - f.y;
        return dx <= 46 && dy >= -82 && dy <= 16;
    }

    function onPointerDown(e) {
        const { x, y } = getCanvasCoords(e);
        dragStartX = x;
        dragStartY = y;
        lastPointerX = x;
        lastPointerY = y;
        isActualDrag = false;
        pointerHistory = [{ x, y, t: performance.now() }];

        if (hitTestFighter(blueFighter, x, y)) {
            dragTarget = blueFighter;
        } else if (hitTestFighter(redFighter, x, y)) {
            dragTarget = redFighter;
        } else {
            dragTarget = null;
        }

        if (dragTarget) {
            dragTarget.isDragged = true;
            dragTarget.toppleState = 'upright';
            dragTarget.toppleAngle = 0;
            dragTarget.action = 'idle';
            dragTarget.crouch = 0;
            dragTarget.vx = 0;
            dragTarget.vy = 0;
            canvas.style.cursor = 'grabbing';
        }
    }

    function onPointerMove(e) {
        const { x, y } = getCanvasCoords(e);

        if (dragTarget) {
            const dist = Math.hypot(x - dragStartX, y - dragStartY);
            if (dist > 3) isActualDrag = true;

            const now = performance.now();
            pointerHistory.push({ x, y, t: now });
            if (pointerHistory.length > 5) pointerHistory.shift();

            const deltaX = x - lastPointerX;
            dragTarget.vx = deltaX;
            dragTarget.x = Math.max(36, Math.min(cssWidth - 36, x));
            dragTarget.y = Math.min(groundY, Math.max(minHeadRoomY, y));

            // Dynamic dangle tilt when lifted high into the sky
            if (dragTarget.y < groundY - 10) {
                dragTarget.toppleAngle = deltaX * 0.04;
            } else {
                dragTarget.toppleAngle = 0;
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

        // Calculate release fling velocity over recent motion
        let flingVx = 0;
        let flingVy = 0;
        if (pointerHistory.length >= 2) {
            const first = pointerHistory[0];
            const last = pointerHistory[pointerHistory.length - 1];
            const dt = Math.max(16, last.t - first.t);
            flingVx = ((last.x - first.x) / dt) * 16.6;
            flingVy = ((last.y - first.y) / dt) * 16.6;
        }

        const flingSpeed = Math.hypot(flingVx, flingVy);

        if (isActualDrag && flingSpeed >= 5.5) {
            // 💥 HIGH SPEED FLING TOSS! Tumbles through air, rolls on floor, then springs back up!
            f.vx = Math.max(-18, Math.min(18, flingVx));
            f.vy = Math.max(-13, Math.min(8, flingVy));
            f.toppleState = 'falling';
            f.toppleDir = (f.vx >= 0) ? 1 : -1;
            f.toppleAngVel = f.toppleDir * 0.18;
            f.action = 'toppled';
            addFloatingText(f.x, f.y - 45, '🤸 FLUNG!', f.color);
            playAudio('hit');
        } else {
            // 🥋 GENTLE DROP: Lands smoothly on feet at new dropped location!
            f.toppleState = 'upright';
            f.toppleAngle = 0;
            f.toppleAngVel = 0;
            f.baseX = Math.max(60, Math.min(cssWidth - 60, f.x));
            f.x = f.baseX;
            f.y = groundY;
            f.crouch = 10; // Athletic crouch landing dip
            f.action = 'idle';
            f.vx = 0;
            f.vy = 0;

            addSparks(f.x, groundY - 2, 9, f.color, '#ffffff');
            playAudio('kipup');
            addFloatingText(f.x, groundY - 50, '🥋 STANCE!', f.color);
            updateFighterOrientations();

            choreographyTimer = 0;
            choreographyPhase = 0;
        }

        dragTarget = null;
        isActualDrag = false;
        pointerHistory = [];
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
        // If clicked on empty space, trigger shockwave push!
        if (!hitTestFighter(blueFighter, x, y) && !hitTestFighter(redFighter, x, y)) {
            triggerManualClash(x, Math.min(groundY, y));
        } else {
            // Clicked a fighter: quick martial blade guard flourish
            const f = hitTestFighter(blueFighter, x, y) ? blueFighter : redFighter;
            f.swordAngle = f.dir * 1.4;
            f.shieldAlpha = 0.95;
            f.action = 'parry';
            addSparks(f.x, f.y - 30, 8, f.color, '#fff');
            playAudio('shield');
            addFloatingText(f.x, f.y - 50, '⚔️ PARRY READY!', f.color);
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
            if (!hitTestFighter(blueFighter, tx, ty) && !hitTestFighter(redFighter, tx, ty)) {
                triggerManualClash(tx, Math.min(groundY, ty));
            }
        }
        isActualDrag = false;
    });
    window.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) onPointerMove(e);
    }, { passive: true });

    // ── Draw stylized kinematic stickman with authentic sword & struggle physics ─
    function drawStickman(f) {
        const x = f.x;
        const y = f.y;
        const dir = f.dir;
        const crouchY = f.crouch;

        ctx.save();

        if (f.toppleAngle !== 0) {
            ctx.translate(x, y < groundY - 20 ? y : groundY);
            ctx.rotate(f.toppleAngle);
            ctx.translate(-x, -(y < groundY - 20 ? y : groundY));
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

        // Legs (with dangling struggle kick animation when held in air)
        ctx.beginPath();
        if (f.isDragged && f.y < groundY - 20) {
            // 🥋 DANGLE STRUGGLE: Cycling kicking legs while held by user!
            const struggleTime = performance.now() * 0.018;
            const kick1 = Math.sin(struggleTime) * 14;
            const kick2 = -Math.sin(struggleTime) * 14;
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x - 8 * dir + kick1, y - 6);
            ctx.lineTo(x - 14 * dir + kick1 * 1.3, y + 6);
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x + 8 * dir + kick2, y - 6);
            ctx.lineTo(x + 14 * dir + kick2 * 1.3, y + 6);
        } else if (f.toppleState === 'falling' || f.toppleState === 'dazed') {
            // Limp tuck
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x - 8 * dir, y - 10);
            ctx.lineTo(x - 14 * dir, y - 2);
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x + 6 * dir, y - 12);
            ctx.lineTo(x + 10 * dir, y - 4);
        } else if (f.crouch > 5) {
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x - 14 * dir, y - 8);
            ctx.lineTo(x - 18 * dir, y);
            ctx.moveTo(x, y - 18 + crouchY);
            ctx.lineTo(x + 12 * dir, y - 8);
            ctx.lineTo(x + 16 * dir, y);
        } else {
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

        if (f.isDragged && f.y < groundY - 20) {
            const wave = Math.sin(performance.now() * 0.02) * 6;
            handX = x + (22 * dir);
            handY = y - 36 + wave;
            f.swordAngle = f.dir * 0.6 + Math.sin(performance.now() * 0.015) * 0.35;
        } else if (f.action === 'slash' || f.action === 'lunge') {
            handX = x + (32 * dir);
            handY = y - 38 + crouchY;
        } else if (f.action === 'parry') {
            handX = x + (14 * dir);
            handY = y - 44 + crouchY;
        } else if (f.action === 'recoil') {
            handX = x - (10 * dir);
            handY = y - 26 + crouchY;
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
    let combatErrorJitter = 0;
    let combatWhiffRoll = false;

    function renderLoop() {
        if (document.hidden) {
            animFrameId = requestAnimationFrame(renderLoop);
            return;
        }

        const W = cssWidth;
        const H = cssHeight;

        // Clean entire device pixel buffer to guarantee zero boundary streaks/smears on High-DPI screens
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // ── Seamless Holographic Cyber Floor (Edge-to-Edge Corner Coverage) ──
        ctx.save();
        const floorReflect = ctx.createLinearGradient(0, groundY, 0, H);
        floorReflect.addColorStop(0, 'rgba(56, 189, 248, 0.09)');
        floorReflect.addColorStop(0.5, 'rgba(168, 85, 247, 0.04)');
        floorReflect.addColorStop(1, 'transparent');
        ctx.fillStyle = floorReflect;
        ctx.fillRect(0, groundY, W, H - groundY);

        const floorGrad = ctx.createLinearGradient(0, groundY, W, groundY);
        floorGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        floorGrad.addColorStop(0.08, 'rgba(56, 189, 248, 0.85)');
        floorGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.95)');
        floorGrad.addColorStop(0.92, 'rgba(244, 63, 94, 0.85)');
        floorGrad.addColorStop(1, 'rgba(244, 63, 94, 0.45)');
        ctx.strokeStyle = floorGrad;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(W, groundY);
        ctx.stroke();
        ctx.restore();

        // ── Physics Integration (Gravity, Inertia, Friction, Recovery) ────
        [blueFighter, redFighter].forEach(f => {
            // Mid-air gravity drop or falling tumble
            if (!f.isDragged && f.y < groundY) {
                f.vy += 1.2;
                f.y += f.vy;
                f.x += f.vx;
                f.vx *= 0.97;
                f.x = Math.max(36, Math.min(W - 36, f.x));

                // Ceil clamp so flung/jumped fighters never clip at canvas top
                if (f.y < minHeadRoomY) {
                    f.y = minHeadRoomY;
                    if (f.vy < 0) f.vy = 0;
                }

                if (f.toppleState === 'falling') {
                    f.toppleAngle += f.toppleAngVel;
                }

                if (f.y >= groundY) {
                    f.y = groundY;
                    f.vy = 0;

                    if (f.toppleState === 'falling') {
                        // Impact floor tumble
                        f.toppleAngle = f.toppleDir * (Math.PI * 0.47);
                        f.toppleState = 'dazed';
                        f.toppleTimer = 38; // ~0.6s tumble on floor
                        addSparks(f.x + f.toppleDir * 20, groundY - 2, 9, '#94a3b8', f.color);
                        playAudio('hit');
                    } else {
                        f.crouch = 8;
                        f.baseX = f.x;
                        updateFighterOrientations();
                        addSparks(f.x, groundY - 2, 7, f.color, '#ffffff');
                        playAudio('kipup');
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
                    addFloatingText(f.x, groundY - 50, recoveryCheers[Math.floor(Math.random() * recoveryCheers.length)], f.color);
                }
            } else if (f.toppleState === 'recovering') {
                f.toppleTimer--;
                const prog = 1 - (f.toppleTimer / 22);
                f.y = groundY - Math.sin(prog * Math.PI) * 32; // High ninja spring hop
                f.toppleAngle = (1 - prog) * f.toppleDir * (Math.PI * 0.47);
                if (f.toppleTimer <= 0) {
                    f.toppleAngle = 0;
                    f.y = groundY;
                    f.crouch = 10;
                    f.toppleState = 'upright';
                    f.action = 'idle';
                    f.baseX = Math.max(36, Math.min(W - 36, f.x));
                    updateFighterOrientations();
                    addSparks(f.x, groundY - 2, 8, f.color, '#ffffff');
                }
            } else if (f.toppleState === 'upright' && !f.isDragged) {
                // Smooth momentum friction & boundary preservation
                f.x += f.vx;
                f.vx *= 0.85; // Natural kinetic deceleration
                f.crouch *= 0.88;
                f.x = Math.max(36, Math.min(W - 36, f.x));
            }
        });

        // ── ⚔️ Interactive Aerial Pursuit While A Fighter Is Held ───────────
        const isOneHeld = (blueFighter.isDragged !== redFighter.isDragged);
        if (isOneHeld) {
            const fHeld = blueFighter.isDragged ? blueFighter : redFighter;
            const fAttacker = blueFighter.isDragged ? redFighter : blueFighter;

            if (fAttacker.toppleState === 'upright' && !fAttacker.isDragged) {
                fAttacker.dir = (fHeld.x >= fAttacker.x) ? 1 : -1;
                const dx = fHeld.x - fAttacker.x;

                if (fAttacker.y >= groundY - 2) {
                    // Running along ground towards held fighter
                    if (Math.abs(dx) > 36) {
                        fAttacker.vx = Math.sign(dx) * 5.2;
                    } else {
                        // Close enough -> EXECUTE HIGH AERIAL LEAP ATTACK!
                        fAttacker.vy = -13.5;
                        fAttacker.action = 'lunge';
                        fAttacker.swordAngle = fAttacker.dir * 1.35;
                        addFloatingText(fAttacker.x, fAttacker.y - 35, '⚡ AERIAL STRIKE!', fAttacker.color);
                    }
                } else {
                    // In mid-air leaping towards held fighter
                    const midAirDist = Math.hypot(fAttacker.x - fHeld.x, fAttacker.y - fHeld.y);
                    if (midAirDist <= 50) {
                        // MIDAIR CLASH IMPACT!
                        const clashX = (fAttacker.x + fHeld.x) * 0.5;
                        const clashY = (fAttacker.y + fHeld.y) * 0.5;
                        addSparks(clashX, clashY, 20, fAttacker.color, fHeld.color);
                        addShockwave(clashX, clashY, '#ffffff');
                        playAudio('clash');
                        addFloatingText(clashX, clashY - 20, '⚔️ MIDAIR CLASH!', '#fbbf24');
                        fAttacker.vx = -fAttacker.dir * 4.5;
                        fHeld.vx = fAttacker.dir * 3.0; // slight push on held target
                    }
                }
            }
        }

        // ── ⚔️ Autonomous Acrobatic Combat Choreography (Both Ready) ────────
        const bothReady = (!blueFighter.isDragged && !redFighter.isDragged &&
                           blueFighter.toppleState === 'upright' && redFighter.toppleState === 'upright' &&
                           blueFighter.y >= groundY - 2 && redFighter.y >= groundY - 2);

        if (bothReady) {
            choreographyTimer++;

            // Gentle center framing so fighters remain centered under the neon headline even after flings
            const midBaseX = (blueFighter.baseX + redFighter.baseX) * 0.5;
            const desiredMidX = cssWidth * 0.5;
            const drift = (desiredMidX - midBaseX) * 0.015;
            blueFighter.baseX += drift;
            redFighter.baseX += drift;

            const leftF = (blueFighter.baseX <= redFighter.baseX) ? blueFighter : redFighter;
            const rightF = (blueFighter.baseX <= redFighter.baseX) ? redFighter : blueFighter;
            leftF.dir = 1;
            rightF.dir = -1;

            const closeCombatDist = 48; // Physical contact spacing where swords cross

            // Paced martial arts rhythm (~35% slower, deliberate, cinematic flow)
            const phaseDurations = [95, 135, 155, 160];
            if (choreographyTimer > (phaseDurations[choreographyPhase] || 120)) {
                choreographyTimer = 0;
                choreographyPhase = (choreographyPhase + 1) % 4;
                // Roll new dynamic combat variance and near-miss / whiff chance
                combatErrorJitter = (Math.random() - 0.5) * 16;
                combatWhiffRoll = (Math.random() < 0.24);
            }

            if (choreographyPhase === 0) {
                // Sequence 0: Tactical Combat Footwork & Distance Prowling (Wide Arena Sway)
                const wideSway = Math.sin(choreographyTimer * 0.06) * 45;
                const bounce = Math.sin(choreographyTimer * 0.08) * 2.2;
                leftF.x += (leftF.baseX - 40 + wideSway - leftF.x) * 0.06;
                leftF.y = groundY + bounce;
                leftF.swordAngle = 0.35 + Math.sin(choreographyTimer * 0.06) * 0.18;
                leftF.shieldAlpha *= 0.88;

                rightF.x += (rightF.baseX + 40 + wideSway - rightF.x) * 0.06;
                rightF.y = groundY + bounce;
                rightF.swordAngle = -0.35 - Math.sin(choreographyTimer * 0.06) * 0.18;
                rightF.shieldAlpha *= 0.88;

            } else if (choreographyPhase === 1) {
                // Sequence 1: Overhead Lunge · Dynamic Whiff or Blade Lock
                const strikeTargetX = rightF.x - closeCombatDist;

                if (choreographyTimer < 46) {
                    const prog = choreographyTimer / 46;
                    leftF.x = leftF.baseX + (strikeTargetX - leftF.baseX) * prog;
                    leftF.swordAngle = 0.35 + prog * 1.0;
                    leftF.action = 'lunge';

                    if (combatWhiffRoll) {
                        // 💨 Dynamic Whiff / Dodge Error: Defender ducks beneath swing!
                        rightF.crouch = prog * 16;
                        rightF.swordAngle = -0.35 - prog * 0.2;
                        rightF.action = 'dodge';
                        if (choreographyTimer === 45) {
                            const clashX = leftF.x + 18;
                            addSparks(clashX, groundY - 48, 12, leftF.color, '#ffffff');
                            addFloatingText(clashX, groundY - 62, '💨 DUCK DODGE!', '#38bdf8');
                            playAudio('kipup');
                        }
                    } else {
                        // Standard Parry & Lock
                        rightF.swordAngle = -0.35 - prog * 0.55;
                        rightF.shieldAlpha = prog * 0.95;
                        rightF.action = 'parry';

                        if (choreographyTimer === 45 || Math.abs(rightF.x - leftF.x) <= (closeCombatDist + 4)) {
                            const clashX = (leftF.x + rightF.x) * 0.5;
                            const clashY = groundY - 38;
                            addSparks(clashX, clashY, 26, leftF.color, rightF.color);
                            addShockwave(clashX, clashY, '#ffffff');
                            playAudio('clash');
                            const clashLabels = ['⚔️ BLADE LOCK!', '🛡️ PARRY!', '⚡ COUNTER!'];
                            addFloatingText(clashX, clashY - 20, clashLabels[Math.floor(Math.random() * clashLabels.length)], '#fbbf24');
                        }
                    }
                } else if (choreographyTimer < 90) {
                    leftF.x = rightF.x - closeCombatDist;
                    const lockJitter = Math.sin(choreographyTimer * 1.1) * 0.08 + (combatErrorJitter * 0.003);
                    leftF.swordAngle = 1.35 + lockJitter;
                    rightF.swordAngle = -0.85 - lockJitter;
                    leftF.action = 'slash';
                    if (!combatWhiffRoll) {
                        rightF.action = 'parry';
                        rightF.shieldAlpha = 0.85;
                        if (choreographyTimer % 12 === 0) {
                            const clashX = (leftF.x + rightF.x) * 0.5;
                            addSparks(clashX, groundY - 38, 4, '#fef08a', leftF.color);
                        }
                    }
                } else if (choreographyTimer === 90) {
                    leftF.vx = -4.8 + (combatErrorJitter * 0.08);
                    rightF.vx = 2.4 - (combatErrorJitter * 0.06);
                    leftF.action = 'recoil';
                    const clashX = (leftF.x + rightF.x) * 0.5;
                    addSparks(clashX, groundY - 38, 14, rightF.color, '#ffffff');
                    playAudio('shield');
                } else {
                    leftF.x += (leftF.baseX - leftF.x) * 0.05;
                    rightF.x += (rightF.baseX - rightF.x) * 0.05;
                    leftF.swordAngle += (0.35 - leftF.swordAngle) * 0.06;
                    rightF.swordAngle += (-0.35 - rightF.swordAngle) * 0.06;
                    rightF.shieldAlpha *= 0.9;
                    rightF.crouch *= 0.88;
                }

            } else if (choreographyPhase === 2) {
                // Sequence 2: 🤸 ACROBATIC LEAPFROG VAULT OVER OPPONENT'S HEAD! (Paced & Varied Apex)
                const midX = (leftF.baseX + rightF.baseX) * 0.5;
                const vaultApex = 75 + combatErrorJitter; // Natural jump height error/variation

                if (choreographyTimer < 56) {
                    const prog = choreographyTimer / 56;
                    // Right dashes low with ground katana sweep
                    rightF.x = rightF.baseX - (rightF.baseX - (midX - 25)) * prog;
                    rightF.crouch = prog * 15;
                    rightF.swordAngle = -0.35 - prog * 1.1;
                    rightF.action = 'lunge';

                    // Left vaults completely over Right's head into high air!
                    leftF.x = leftF.baseX + ((rightF.baseX + 60) - leftF.baseX) * prog;
                    leftF.y = groundY - Math.sin(prog * Math.PI) * vaultApex;
                    leftF.swordAngle = 0.35 + prog * (Math.PI * 1.5);
                    leftF.action = 'slash';

                    // Clashes right at peak mid-air apex!
                    if (choreographyTimer === 28) {
                        const clashX = leftF.x;
                        const clashY = leftF.y + 20;
                        addSparks(clashX, clashY, 28, leftF.color, rightF.color);
                        addShockwave(clashX, clashY, '#ffffff');
                        playAudio('clash');
                        const jumpTexts = ['🤸 LEAPFROG VAULT!', '⚡ APEX CLASH!', '🥷 MID-AIR STRIKE!'];
                        addFloatingText(clashX, clashY - 25, jumpTexts[Math.floor(Math.random() * jumpTexts.length)], '#38bdf8');
                    }
                } else if (choreographyTimer < 95) {
                    leftF.y += (groundY - leftF.y) * 0.1;
                    leftF.crouch = 10;
                    rightF.crouch *= 0.92;
                    rightF.shieldAlpha = 0.85;
                } else {
                    leftF.y = groundY;
                    leftF.x += (leftF.baseX - leftF.x) * 0.05;
                    rightF.x += (rightF.baseX - rightF.x) * 0.05;
                    leftF.swordAngle += (0.35 - leftF.swordAngle) * 0.06;
                    rightF.swordAngle += (-0.35 - rightF.swordAngle) * 0.06;
                    rightF.shieldAlpha *= 0.9;
                }

            } else if (choreographyPhase === 3) {
                // Sequence 3: Cinematic Flurry & Mutual Heavy Cross-Counter Recoil
                const meetMidX = (leftF.baseX + rightF.baseX) * 0.5;
                const leftClashX = meetMidX - (closeCombatDist * 0.5);
                const rightClashX = meetMidX + (closeCombatDist * 0.5);
                const clashX = meetMidX;

                if (choreographyTimer < 35) {
                    const prog = choreographyTimer / 35;
                    leftF.x = leftF.baseX + (leftClashX - leftF.baseX) * prog;
                    rightF.x = rightF.baseX - (rightF.baseX - rightClashX) * prog;
                    leftF.swordAngle = 0.35 + prog * 0.9;
                    rightF.swordAngle = -0.35 - prog * 0.9;

                } else if (choreographyTimer < 65) {
                    leftF.x = leftClashX;
                    rightF.x = rightClashX;
                    leftF.swordAngle = 1.25;
                    rightF.swordAngle = -1.25;
                    if (choreographyTimer === 36) {
                        addSparks(clashX, groundY - 44, 20, leftF.color, rightF.color);
                        playAudio('clash');
                        addFloatingText(clashX, groundY - 60, '⚔️ CLASH!', '#fbbf24');
                    }
                } else if (choreographyTimer < 95) {
                    leftF.crouch = 8;
                    rightF.crouch = 8;
                    leftF.swordAngle = 0.8;
                    rightF.swordAngle = -0.8;
                    if (choreographyTimer === 66) {
                        addSparks(clashX, groundY - 26, 20, rightF.color, leftF.color);
                        playAudio('clash');
                        addFloatingText(clashX, groundY - 60, '🛡️ PARRY!', '#f43f5e');
                    }
                } else if (choreographyTimer < 125) {
                    if (choreographyTimer === 96) {
                        addSparks(clashX, groundY - 36, 36, '#ffffff', '#fbbf24');
                        addShockwave(clashX, groundY - 36, '#ffffff');
                        playAudio('wave');
                        const finishText = Math.abs(combatErrorJitter) > 4 ? '💥 GLANCING PARRY!' : '💥 CROSS-COUNTER!';
                        addFloatingText(clashX, groundY - 60, finishText, '#fbbf24');

                        leftF.vx = -5.5 + (combatErrorJitter * 0.1);
                        rightF.vx = 5.5 - (combatErrorJitter * 0.1);
                        leftF.shieldAlpha = 0.9;
                        rightF.shieldAlpha = 0.9;
                    }
                } else {
                    leftF.crouch *= 0.9;
                    rightF.crouch *= 0.9;
                    leftF.x += (leftF.baseX - leftF.x) * 0.05;
                    rightF.x += (rightF.baseX - rightF.x) * 0.05;
                    leftF.swordAngle += (0.35 - leftF.swordAngle) * 0.06;
                    rightF.swordAngle += (-0.35 - rightF.swordAngle) * 0.06;
                    leftF.shieldAlpha *= 0.9;
                    rightF.shieldAlpha *= 0.9;
                }
            }
        }

        // Draw Dynamic Shadows below fighters
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(blueFighter.x, groundY + 2, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(redFighter.x, groundY + 2, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw Fighters
        drawStickman(blueFighter);
        drawStickman(redFighter);

        // Update & Render Shockwaves
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += 2.6;
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

            if (s.alpha <= 0 || s.y > groundY + 8) {
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
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = Math.max(0, ft.alpha);
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
