// ami js jani na ai bujhiye diche tai korchi vnaila js
const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 30,
    reconnectionDelay: 1000
}); // Connect to the server using Socket.IO (prioritize WebSocket for low latency)
window.socket = socket;

// Connection Status Helpers
const statusDot = document.getElementById('status_dot');
const statusText = document.getElementById('status_text');

function updateConnectionStatus(status) {
    if (!statusDot || !statusText) return;
    if (status === 'connected') {
        statusDot.style.background = '#4ade80';
        statusText.style.color = '#4ade80';
        statusText.innerText = 'Online';
    } else if (status === 'reconnecting') {
        statusDot.style.background = '#facc15';
        statusText.style.color = '#facc15';
        statusText.innerText = 'Reconnecting...';
    } else if (status === 'offline') {
        statusDot.style.background = '#ef4444';
        statusText.style.color = '#ef4444';
        statusText.innerText = 'Offline';
    }
}

// --- Reusable Modern Toast Notification ---
function showToast({ title, message, type = 'info', duration = 3500 }) {
    let container = document.getElementById('toast_container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast_container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const iconSymbols = { success: '✓', warning: '⚡', info: 'ℹ', danger: '✕' };
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
window.showToast = showToast;

// --- ⚡ 30-Second Quick Start Guide Banner Handlers ---
function dismissQuickGuide() {
    const banner = document.getElementById('quick_start_guide_banner');
    if (banner) {
        banner.style.display = 'none';
        try {
            localStorage.setItem('stickman_quick_guide_dismissed', '1');
        } catch(e) {}
    }
}
window.dismissQuickGuide = dismissQuickGuide;

function toggleQuickGuide() {
    const banner = document.getElementById('quick_start_guide_banner');
    if (!banner) return;
    const isHidden = (banner.style.display === 'none' || getComputedStyle(banner).display === 'none');
    if (isHidden) {
        banner.style.display = 'block';
        try {
            localStorage.removeItem('stickman_quick_guide_dismissed');
        } catch(e) {}
    } else {
        banner.style.display = 'none';
        try {
            localStorage.setItem('stickman_quick_guide_dismissed', '1');
        } catch(e) {}
    }
}
window.toggleQuickGuide = toggleQuickGuide;

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (localStorage.getItem('stickman_quick_guide_dismissed') === '1') {
            const banner = document.getElementById('quick_start_guide_banner');
            if (banner) banner.style.display = 'none';
        }
    } catch(e) {}
});

// --- 📡 Combat Telemetry Logging Engine ---
const telemetryStartTime = Date.now();
const MAX_TELEMETRY_LOGS = 12;

function logCombatTelemetry(category, tag, message) {
    const feed = document.getElementById('telemetry_log_feed');
    if (!feed) return;

    const elapsed = Math.floor((Date.now() - telemetryStartTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    const timeStr = `${m}:${s}`;

    const entry = document.createElement('div');
    entry.className = `telemetry-entry ${category}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'telemetry-time';
    timeSpan.textContent = timeStr;

    const tagSpan = document.createElement('span');
    tagSpan.className = `telemetry-tag ${category}`;
    tagSpan.textContent = tag;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'telemetry-msg';
    msgSpan.textContent = message;

    entry.appendChild(timeSpan);
    entry.appendChild(tagSpan);
    entry.appendChild(msgSpan);

    feed.appendChild(entry);

    while (feed.children.length > MAX_TELEMETRY_LOGS) {
        feed.removeChild(feed.firstChild);
    }
    feed.scrollTop = feed.scrollHeight;

    const counter = document.getElementById('telemetry_counter');
    if (counter) {
        counter.textContent = `${feed.children.length} Events`;
    }
}
window.logCombatTelemetry = logCombatTelemetry;

function clearCombatTelemetry() {
    const feed = document.getElementById('telemetry_log_feed');
    if (feed) {
        feed.innerHTML = `
            <div class="telemetry-entry sys">
                <span class="telemetry-time">00:00</span>
                <span class="telemetry-tag sys">[RESET]</span>
                <span class="telemetry-msg">Telemetry feed cleared. Listening for combat events...</span>
            </div>
        `;
    }
    const counter = document.getElementById('telemetry_counter');
    if (counter) counter.textContent = 'Cleared';
}
window.clearCombatTelemetry = clearCombatTelemetry;

// --- TAB VISIBILITY & MATCH PAUSE SYNCHRONIZATION ---
let isMatchPaused = false;
let pauseSecondsLeft = 60;
let pausePlayerId = null;

function sendPlayerTabState() {
    const isHidden = !!document.hidden;
    console.log("🎮 Tab visibility changed. Hidden:", isHidden);
    if (typeof socket !== 'undefined' && socket && socket.connected) {
        socket.emit('player_tab_state', { hidden: isHidden });
    }
}

document.addEventListener('visibilitychange', sendPlayerTabState);
window.addEventListener('pagehide', () => sendPlayerTabState());
window.addEventListener('pageshow', () => sendPlayerTabState());

socket.on('game_paused', (data) => {
    isMatchPaused = true;
    pausePlayerId = data.paused_by;
    pauseSecondsLeft = data.timeout || 60;
    console.log("⏸️ Match paused by Player", data.paused_by);
});

socket.on('game_resumed', (data) => {
    isMatchPaused = false;
    pausePlayerId = null;
    console.log("▶️ Match resumed by Player", data.resumed_by);
});

socket.on('player_afk_timeout', (data) => {
    isMatchPaused = false;
    pausePlayerId = null;
    console.warn("⚠️ Match ended due to AFK timeout:", data.message);
    if (typeof showToast === 'function') {
        showToast({
            title: "Match Ended",
            message: data.message || "Player was away for more than 1 minute.",
            type: "warning",
            duration: 6000
        });
    }
});

socket.on('connect', () => {
    console.log("Connected to server! Room:", typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default');
    updateConnectionStatus('connected');
    socket.emit('player_joined', { 
        room_id: ROOM_ID,
        token: ROOM_TOKEN
    });
});

socket.on('disconnect', (reason) => {
    console.log("Socket disconnected:", reason);
    updateConnectionStatus('reconnecting');
});

socket.on('connect_error', () => {
    updateConnectionStatus('reconnecting');
});

socket.on('player_reconnecting', (data) => {
    console.log("Player temporary disconnect (grace period):", data);
});

socket.on('bot_replaced_by_human', (data) => {
    if (typeof IS_BOT_ROOM !== 'undefined') {
        IS_BOT_ROOM = false;
    }
    const st = document.getElementById('status_text');
    if (st) st.innerText = 'Online PvP';
    const rb = document.getElementById('run_btn');
    if (rb) rb.disabled = false;
    if (typeof showToast === 'function') {
        showToast({
            title: "Friend Joined!",
            message: (data && data.message) ? data.message : "A friend joined the arena! The bot has stepped aside. Match converted to 1v1 PvP duel!",
            type: "success",
            duration: 5000
        });
    }
});

const canvas = document.getElementById('gui_screen');
const ctx = canvas.getContext('2d');

function drawTrigCurve(context, options) {
    const { centerX, centerY, width, start, end, samples, fn, scale, direction, ySign } = options;
    context.beginPath();
    for (let i = 0; i <= samples; i++) {
        const ratio = i / samples;
        const angle = start + ((end - start) * ratio);
        const value = Math.max(-3, Math.min(3, fn(angle)));
        const px = centerX + (direction * ((ratio - 0.5) * width));
        const py = centerY + (ySign * value * scale);
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
    }
    context.stroke();
}

socket.on('match_start', () => {
    console.log("Match started!");
    if (window.AudioEngine) window.AudioEngine.playMatchStart();
    const waitScreen = document.getElementById('wait_screen');
    if (waitScreen) {
        waitScreen.style.display = 'none';
    }
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "Run";
    }
});

socket.on('player_left', (data) => {
    console.log("Player left:", data.player_id);
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerText = "Run (Waiting for Player...)";
    }
    if (MY_PLAYER_ID === 1 && data.player_id === 2) {
        const waitScreen = document.getElementById('wait_screen');
        if (waitScreen) {
            waitScreen.style.display = 'block';
        }
    }
});

// --- PROCEDURAL AUDIO SFX STATE TRACKING ---
let prevP1Heart = null;
let prevP2Heart = null;
let prevP1Blocking = false;
let prevP2Blocking = false;
let prevP1Crouching = false;
let prevP2Crouching = false;
let prevP1Attacking = false;
let prevP2Attacking = false;
let activeSpellKeys = new Set();
let prevGameOver = false;
let prevClash = false;

// --- SWORD TRAIL / MOTION BLUR SYSTEM ---
const swordTrails = {
    p1: [],
    p2: []
};

function draw_sword_trails() {
    ['p1', 'p2'].forEach(key => {
        const trail = swordTrails[key];
        if (!trail || trail.length === 0) return;

        // Fade and clean old trail points
        for (let i = trail.length - 1; i >= 0; i--) {
            trail[i].alpha *= 0.70;
            if (trail[i].alpha < 0.05) {
                trail.splice(i, 1);
            }
        }

        if (trail.length < 2) return;

        // Draw motion blur ribbon arcs between consecutive positions
        for (let i = 0; i < trail.length - 1; i++) {
            const ptA = trail[i];
            const ptB = trail[i + 1];
            const avgAlpha = (ptA.alpha + ptB.alpha) * 0.5;

            ctx.save();
            let strokeColor, fillColor;
            if (ptB.isHeavy) {
                strokeColor = `rgba(255, 69, 0, ${avgAlpha * 0.95})`;
                fillColor = `rgba(249, 115, 22, ${avgAlpha * 0.38})`;
                ctx.shadowColor = "#ff4500";
                ctx.shadowBlur = 18;
            } else if (ptB.isSwing) {
                strokeColor = `rgba(0, 240, 255, ${avgAlpha * 0.95})`;
                fillColor = `rgba(56, 189, 248, ${avgAlpha * 0.32})`;
                ctx.shadowColor = "#00f0ff";
                ctx.shadowBlur = 14;
            } else {
                strokeColor = `rgba(255, 255, 255, ${avgAlpha * 0.90})`;
                fillColor = `rgba(226, 232, 240, ${avgAlpha * 0.28})`;
                ctx.shadowColor = ptB.color || "rgba(255, 255, 255, 0.8)";
                ctx.shadowBlur = 12;
            }

            // 1. Shaded motion blur fan ribbon between hand and blade tip
            ctx.beginPath();
            ctx.moveTo(ptA.baseX, ptA.baseY);
            ctx.lineTo(ptA.tipX, ptA.tipY);
            ctx.lineTo(ptB.tipX, ptB.tipY);
            ctx.lineTo(ptB.baseX, ptB.baseY);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();

            // 2. High-intensity glowing blade edge arc along the tip
            ctx.beginPath();
            ctx.moveTo(ptA.tipX, ptA.tipY);
            ctx.lineTo(ptB.tipX, ptB.tipY);
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.strokeStyle = strokeColor;
            ctx.stroke();

            ctx.restore();
        }
    });
}

function draw_on_camvas(data) {
    if (!data || !data.player1 || !data.player2) return;

    const isPaused = !!data.is_paused;
    isMatchPaused = isPaused;
    if (data.pause_seconds_left !== undefined) {
        pauseSecondsLeft = data.pause_seconds_left;
    }
    if (data.paused_by !== undefined) {
        pausePlayerId = data.paused_by;
    }

    // --- PROCEDURAL AUDIO SFX & COMBAT TELEMETRY EVENT TRIGGERS ---
    if (!isPaused) {
        // 1. Damage Hit
        if (prevP1Heart !== null && data.player1.heart < prevP1Heart) {
            if (!document.hidden && window.AudioEngine) window.AudioEngine.playDamageHit();
            const dmg = prevP1Heart - data.player1.heart;
            logCombatTelemetry('hit', '[DAMAGE HIT]', `💥 P1 took ${dmg} DMG! (Hearts: ${data.player1.heart}/10)`);
        }
        if (prevP2Heart !== null && data.player2.heart < prevP2Heart) {
            if (!document.hidden && window.AudioEngine) window.AudioEngine.playDamageHit();
            const dmg = prevP2Heart - data.player2.heart;
            const target = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'Bot' : 'P2';
            logCombatTelemetry('hit', '[DAMAGE HIT]', `💥 ${target} took ${dmg} DMG! (Hearts: ${data.player2.heart}/10)`);
        }
        prevP1Heart = data.player1.heart;
        prevP2Heart = data.player2.heart;

        // 2. Sword Swing & Dynamic Clash
        const p1Slashing = data.player1.has_sword && data.player1.attack_state === 2;
        const p2Slashing = data.player2.has_sword && data.player2.attack_state === 2;

        if (data.clash) {
            if (!document.hidden && window.AudioEngine) window.AudioEngine.playSwordClash();
            if (!prevClash) {
                logCombatTelemetry('clash', '[SWORD CLASH]', '⚔️ Mid-air Sword Clash! Kinetic sparks erupted!');
            }
        } else {
            if (p1Slashing && !prevP1Attacking && !document.hidden && window.AudioEngine) window.AudioEngine.playSwordSwing();
            if (p2Slashing && !prevP2Attacking && !document.hidden && window.AudioEngine) window.AudioEngine.playSwordSwing();
        }
        prevClash = !!data.clash;
        prevP1Attacking = p1Slashing;
        prevP2Attacking = p2Slashing;

        // 3. Shield Block
        if (data.player1.is_blocking && !prevP1Blocking) {
            if (!document.hidden && window.AudioEngine) window.AudioEngine.playShieldBlock();
            logCombatTelemetry('shield', '[DEFENSE]', '🛡️ P1 raised shield barrier');
        }
        if (data.player2.is_blocking && !prevP2Blocking) {
            if (!document.hidden && window.AudioEngine) window.AudioEngine.playShieldBlock();
            const target = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'Bot' : 'P2';
            logCombatTelemetry('shield', '[DEFENSE]', `🛡️ ${target} raised shield barrier`);
        }
        prevP1Blocking = !!data.player1.is_blocking;
        prevP2Blocking = !!data.player2.is_blocking;

        // 4. Dodge / Crouch
        if (data.player1.is_crouching && !prevP1Crouching) {
            if (!document.hidden && window.AudioEngine) window.AudioEngine.playDodge();
            logCombatTelemetry('dodge', '[EVASION]', '💨 P1 crouched / evaded');
        }
        if (data.player2.is_crouching && !prevP2Crouching) {
            if (!document.hidden && window.AudioEngine) window.AudioEngine.playDodge();
            const target = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'Bot' : 'P2';
            logCombatTelemetry('dodge', '[EVASION]', `💨 ${target} crouched / evaded`);
        }
        prevP1Crouching = !!data.player1.is_crouching;
        prevP2Crouching = !!data.player2.is_crouching;

        // 5. Trig Spells (trigger once on spell creation)
        if (data.spells && Array.isArray(data.spells)) {
            data.spells.forEach(s => {
                const sKey = `${s.type}_${s.owner || 0}_${s.origin_x || s.x || 0}`;
                if (!activeSpellKeys.has(sKey) && (s.t === undefined || s.t <= 2)) {
                    activeSpellKeys.add(sKey);
                    if (!document.hidden && window.AudioEngine) window.AudioEngine.playSpell(s.type);
                    const ownerLabel = s.owner === 1 ? 'P1' : ((typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'Bot' : 'P2');
                    logCombatTelemetry('spell', '[TRIG SPELL]', `✨ ${ownerLabel} cast ${s.type} (Power: ${s.power || 1})`);
                }
            });
            if (activeSpellKeys.size > 150) activeSpellKeys.clear();
        }
    } else {
        prevP1Heart = data.player1.heart;
        prevP2Heart = data.player2.heart;
        prevP1Attacking = false;
        prevP2Attacking = false;
        prevClash = false;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // --- GROUND (Bhumi) ---
    ctx.strokeStyle = "green";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 600);
    ctx.lineTo(canvas.width, 600);
    ctx.stroke();

    // Render sword slash trails & motion blur arcs behind fighters
    draw_sword_trails();

    // Player Ankar Function
    function draw_player(player, color, playerKey) {
        let x = player.x;
        let y = player.y;
        let dir = player.direction; // 1 (Right) or -1 (Left)
        let is_crouching = player.is_crouching || false;
        let crouchY = is_crouching ? 35 : 0;
        
        // Defensive cosecant curve projected in front of the fighter.
        if (player.has_dome) {
            ctx.save();
            ctx.strokeStyle = "#ffd700";
            ctx.shadowColor = "#ffd700";
            ctx.shadowBlur = 18;
            ctx.lineWidth = 4;
            const domePower = player.dome_power || 1;
            drawTrigCurve(ctx, {
                centerX: x + (62 * dir), centerY: y + 15 + crouchY,
                width: 82, start: 0.4, end: Math.PI - 0.4, samples: 40,
                fn: angle => 1 / Math.sin(angle),
                scale: 8 + (1.5 * domePower), direction: dir, ySign: 1
            });
            ctx.restore();
        }

        // Defensive secant curve projected in front of the fighter.
        if (player.has_barrier) {
            ctx.save();
            ctx.strokeStyle = "#00f0ff";
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 16;
            ctx.lineWidth = 4;
            const barrierPower = player.barrier_power || 1;
            drawTrigCurve(ctx, {
                centerX: x + (55 * dir), centerY: y + 40 + crouchY,
                width: 72, start: -1.05, end: 1.05, samples: 40,
                fn: angle => 1 / Math.cos(angle),
                scale: 8 + (1.5 * barrierPower), direction: dir, ySign: 1
            });
            ctx.restore();
        }

        // Matha (Head)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y + crouchY, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Baki shorir (Body)
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        if (is_crouching) {
            // Bent low crouch/duck stance
            ctx.moveTo(x, y + 20 + crouchY); // Gola
            ctx.lineTo(x - (10 * dir), y + 70 + crouchY); // Komor lowered
            // Pa (Bent legs)
            ctx.moveTo(x - (10 * dir), y + 70 + crouchY);
            ctx.lineTo(x - (25 * dir), y + 100);
            ctx.lineTo(x - (30 * dir), y + 130);
            ctx.moveTo(x - (10 * dir), y + 70 + crouchY);
            ctx.lineTo(x + (15 * dir), y + 100);
            ctx.lineTo(x + (20 * dir), y + 130);
        } else {
            ctx.moveTo(x, y + 20); // Gola
            ctx.lineTo(x, y + 80); // Komor
            // Pa (Normal legs)
            ctx.moveTo(x, y + 80);
            ctx.lineTo(x - 20, y + 130);
            ctx.moveTo(x, y + 80);
            ctx.lineTo(x + 20, y + 130);
        }
        
        let is_blocking = player.is_blocking || false;
        let sword_hand_x, sword_hand_y;
        let shield_hand_x, shield_hand_y;

        if (is_blocking) {
            shield_hand_x = x + (40 * dir);
            shield_hand_y = y + 42 + crouchY;
            sword_hand_x = x + (15 * dir);
            sword_hand_y = y + 55 + crouchY;
        } else {
            sword_hand_x = x + (35 * dir);
            sword_hand_y = y + 45 + crouchY;
            shield_hand_x = x + (20 * dir);
            shield_hand_y = y + 55 + crouchY;
        }

        // Dhaler hat (Arm to shield)
        ctx.moveTo(x, y + 40 + crouchY);
        ctx.lineTo(shield_hand_x, shield_hand_y);
        
        // Toloyarer hat (Arm to sword)
        ctx.moveTo(x, y + 40 + crouchY);
        ctx.lineTo(sword_hand_x, sword_hand_y);
        
        ctx.stroke(); // Shorir aaka sesh
        
        // --- STYLIZED SWORD (Crossguard, grip, pommel & tapered blade) ---
        let has_sword = player.has_sword !== undefined ? player.has_sword : true;
        let swordLen = player.sword_length || 50;
        if (has_sword && player.sword_angle !== undefined) {
            ctx.save();
            ctx.translate(sword_hand_x, sword_hand_y);
            let rad = ((player.sword_angle + 45) * dir) * (Math.PI / 180);
            ctx.rotate(rad);
            
            const isHeavy = player.is_heavy;
            const isSwing = player.is_swing;
            const actualLen = isHeavy ? swordLen + 10 : swordLen;

            // Record motion blur trail during attack swing
            if ((player.attack_state === 2 || isHeavy || isSwing) && playerKey && swordTrails[playerKey]) {
                const tipX = sword_hand_x + Math.sin(rad) * actualLen;
                const tipY = sword_hand_y - Math.cos(rad) * actualLen;
                swordTrails[playerKey].push({
                    tipX: tipX,
                    tipY: tipY,
                    baseX: sword_hand_x,
                    baseY: sword_hand_y,
                    alpha: 1.0,
                    isHeavy: isHeavy,
                    isSwing: isSwing,
                    color: color
                });
                if (swordTrails[playerKey].length > 8) {
                    swordTrails[playerKey].shift();
                }
            }

            // 1. Grip / Handle (extends backward into hand)
            ctx.save();
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, 11);
            ctx.stroke();

            // Pommel (end of hilt)
            ctx.fillStyle = isHeavy ? "#f59e0b" : "#cbd5e1";
            ctx.beginPath();
            ctx.arc(0, 12, 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 2. Crossguard (Hilt bar perpendicular to blade)
            ctx.save();
            ctx.strokeStyle = isHeavy ? "#f59e0b" : (isSwing ? "#38bdf8" : "#94a3b8");
            ctx.lineWidth = 3.2;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.stroke();
            ctx.restore();

            // 3. Blade (Tapered double-edge steel with pointed tip)
            ctx.save();
            let bladeStroke = "#ffffff";
            let bladeFill = "rgba(226, 232, 240, 0.9)";
            if (isHeavy) {
                bladeStroke = "#ff4500";
                bladeFill = "#f97316";
                ctx.shadowColor = "#ff4500";
                ctx.shadowBlur = 16;
            } else if (isSwing) {
                bladeStroke = "#00f0ff";
                bladeFill = "#38bdf8";
                ctx.shadowColor = "#00f0ff";
                ctx.shadowBlur = 14;
            } else {
                bladeStroke = "#ffffff";
                bladeFill = "#e2e8f0";
                ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
                ctx.shadowBlur = 6;
            }

            // Outer sharp blade polygon
            ctx.beginPath();
            ctx.moveTo(-3, 0);
            ctx.lineTo(-2.2, -actualLen + 9);
            ctx.lineTo(0, -actualLen); // Sharp pointed tip!
            ctx.lineTo(2.2, -actualLen + 9);
            ctx.lineTo(3, 0);
            ctx.closePath();
            ctx.fillStyle = bladeFill;
            ctx.fill();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = bladeStroke;
            ctx.stroke();

            // Center spine / fuller highlight line
            ctx.beginPath();
            ctx.strokeStyle = isHeavy ? "#fef08a" : (isSwing ? "#e0f2fe" : "#ffffff");
            ctx.lineWidth = 1;
            ctx.moveTo(0, -1);
            ctx.lineTo(0, -actualLen + 7);
            ctx.stroke();

            ctx.restore();
            ctx.restore();
        }

        // --- STYLIZED DEFENSIVE HEATER SHIELD (Dynamic length & active glow) ---
        ctx.save();
        ctx.translate(shield_hand_x, shield_hand_y);
        if (player.shield_angle !== undefined) {
            let rad = (player.shield_angle * dir) * (Math.PI / 180);
            ctx.rotate(rad);
        }

        let shieldLen = player.shield_length || 40;
        let halfH = shieldLen / 2;
        let isBlocking = player.is_blocking || false;
        let forward = 8 * dir;

        // 1. If actively blocking, draw an outer luminous energy barrier shimmer
        if (isBlocking) {
            ctx.save();
            ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
            ctx.shadowColor = "#38bdf8";
            ctx.shadowBlur = 18;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(forward + (3 * dir), -halfH - 5);
            ctx.quadraticCurveTo(forward + (15 * dir), 0, forward + (3 * dir), halfH + 5);
            ctx.stroke();
            ctx.restore();
        }

        // 2. Shield Body (Curved layered heater plate)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, -halfH);
        ctx.quadraticCurveTo(forward + (4 * dir), 0, 0, halfH);
        ctx.quadraticCurveTo(-4 * dir, 0, 0, -halfH);
        ctx.closePath();

        // Plate fill: dark steel with slight translucency
        ctx.fillStyle = isBlocking ? "rgba(30, 41, 59, 0.95)" : "rgba(22, 23, 29, 0.95)";
        ctx.fill();

        // Glowing rim border: vibrant gold when normal, electric cyan when actively blocking
        ctx.strokeStyle = isBlocking ? "#38bdf8" : "#f59e0b";
        ctx.lineWidth = 2.4;
        ctx.shadowColor = isBlocking ? "#38bdf8" : "rgba(245, 158, 11, 0.65)";
        ctx.shadowBlur = isBlocking ? 12 : 5;
        ctx.stroke();

        // 3. Center Boss / Grip Stud
        ctx.beginPath();
        ctx.arc(forward * 0.3, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = isBlocking ? "#38bdf8" : "#fbbf24";
        ctx.shadowBlur = isBlocking ? 8 : 4;
        ctx.fill();

        // 4. Subtle metallic rim studs at top and bottom
        ctx.beginPath();
        ctx.arc(0, -halfH + 3, 1.6, 0, Math.PI * 2);
        ctx.arc(0, halfH - 3, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = "#cbd5e1";
        ctx.shadowBlur = 0;
        ctx.fill();

        ctx.restore();
        ctx.restore();

        // --- SPEECH BUBBLE WITH PLAYER IDENTITY ---
        if (player.speech && player.speech.trim() !== "") {
            ctx.save();
            ctx.font = "600 12px 'DM Sans', -apple-system, sans-serif";
            let text = player.speech;
            let textMetrics = ctx.measureText(text);
            let bubbleWidth = Math.max(textMetrics.width + 26, 54);
            let bubbleHeight = 28;
            
            let bubbleY = y - 76 + crouchY;
            let bubbleX = dir === 1 ? (x + 10) : (x - 10 - bubbleWidth);
            
            if (bubbleX < 10) bubbleX = 10;
            if (bubbleX + bubbleWidth > canvas.width - 10) bubbleX = canvas.width - bubbleWidth - 10;
            if (bubbleY < 10) bubbleY = 10;
            
            const isP1 = (color === "#ff5c5c" || color === "red");
            const playerAccent = isP1 ? "#ff5c5c" : "#38bdf8";
            const borderTint = isP1 ? "rgba(255, 92, 92, 0.45)" : "rgba(56, 189, 248, 0.45)";

            // Bubble body
            ctx.fillStyle = "rgba(18, 19, 25, 0.96)";
            ctx.strokeStyle = borderTint;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
            } else {
                ctx.rect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
            }
            ctx.fill();
            ctx.stroke();
            
            // Pointer tail
            ctx.beginPath();
            let tailBaseX = Math.min(Math.max(x + (dir * 10), bubbleX + 12), bubbleX + bubbleWidth - 12);
            let tailTipX = x + (dir * 5);
            let tailTipY = Math.min(bubbleY + bubbleHeight + 7, y - 35 + crouchY);
            ctx.moveTo(tailBaseX - 5, bubbleY + bubbleHeight);
            ctx.lineTo(tailTipX, tailTipY);
            ctx.lineTo(tailBaseX + 5, bubbleY + bubbleHeight);
            ctx.closePath();
            ctx.fillStyle = "rgba(18, 19, 25, 0.96)";
            ctx.fill();

            // Small speaker indicator dot
            ctx.beginPath();
            ctx.arc(bubbleX + 10, bubbleY + (bubbleHeight / 2), 3, 0, Math.PI * 2);
            ctx.fillStyle = playerAccent;
            ctx.fill();
            
            // Speech text
            ctx.fillStyle = "#f1f0f5";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(text, bubbleX + 18, bubbleY + (bubbleHeight / 2) + 1);
            ctx.restore();
        }
    }

    // Two players drawn with clear, accessible modern dark palette
    draw_player(data.player1, "#ff5c5c", "p1");
    draw_player(data.player2, "#38bdf8", "p2");

    // Fixed HUD health bars - clear fighting game style.
    function draw_health_bar(player, label, x, align) {
        const maxHealth = player.max_health || 10;
        const health = Math.max(0, Math.min(maxHealth, player.heart || 0));
        const width = 180;
        const height = 10;
        const left = align === "right" ? x - width : x;
        const ratio = health / maxHealth;
        const color = ratio > 0.5 ? "#6ec69a" : ratio > 0.25 ? "#d4b84a" : "#e05a5a";

        ctx.save();
        ctx.textAlign = align === "right" ? "right" : "left";
        ctx.textBaseline = "alphabetic";
        const tagColor = label === "P1" ? "#ff5c5c" : "#38bdf8";

        if (align === "right") {
            const healthStr = `${health}/${maxHealth}`;
            ctx.font = "500 11.5px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#8a8b94";
            ctx.fillText(healthStr, x, 20);
            const healthWidth = ctx.measureText(healthStr).width;

            ctx.font = "700 11.5px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = tagColor;
            ctx.fillText(label, x - healthWidth - 10, 20);
        } else {
            ctx.font = "700 11.5px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = tagColor;
            ctx.fillText(label, x, 20);
            const labelWidth = ctx.measureText(label).width;

            ctx.font = "500 11.5px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#8a8b94";
            ctx.fillText(` ${health}/${maxHealth}`, x + labelWidth + 4, 20);
        }

        // Health bar background & fill (180x10px, radius 4)
        ctx.fillStyle = "#1e1f26";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 26, width, height, 4); ctx.fill(); }
        else { ctx.fillRect(left, 26, width, height); }
        if (ratio > 0) {
            ctx.fillStyle = color;
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 26, width * ratio, height, 4); ctx.fill(); }
            else { ctx.fillRect(left, 26, width * ratio, height); }
        }

        // Fixed HUD Energy / Stamina Bar (y = 40, height = 6, cyan glow)
        const maxEnergy = player.max_energy || 100;
        const energy = Math.max(0, Math.min(maxEnergy, player.energy !== undefined ? player.energy : 100));
        const energyRatio = energy / maxEnergy;
        
        ctx.fillStyle = "#16171d";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 40, width, 6, 3); ctx.fill(); }
        else { ctx.fillRect(left, 40, width, 6); }
        
        if (energyRatio > 0) {
            ctx.fillStyle = energyRatio > 0.35 ? "#38bdf8" : "#f59e0b";
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 40, width * energyRatio, 6, 3); ctx.fill(); }
            else { ctx.fillRect(left, 40, width * energyRatio, 6); }
        }

        // Energy text badge
        ctx.font = "600 10px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = "#7dd3fc";
        const energyStr = `${Math.round(energy)}⚡`;
        ctx.fillText(energyStr, x, 55);
        ctx.restore();
    }
    const p2Label = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM)
        ? ("BOT" + (typeof BOT_DIFFICULTY !== 'undefined' && BOT_DIFFICULTY ? " (" + BOT_DIFFICULTY.toUpperCase() + ")" : ""))
        : "P2";
    draw_health_bar(data.player1, "P1", 20, "left");
    draw_health_bar(data.player2, p2Label, canvas.width - 20, "right");

    // --- SPELLS & RANGED PROJECTILES RENDER ---
    if (data.spells && Array.isArray(data.spells)) {
        data.spells.forEach(spell => {
            let sx = spell.x;
            let sy = spell.y;
            let sdir = spell.dir || 1;
            let st = spell.t || 0;
            let spellPower = spell.power || 1;
            
            if (spell.type === 'throw_sword') {
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate((st * 28 * Math.PI) / 180);
                
                // Crossguard
                ctx.strokeStyle = "#cbd5e1";
                ctx.lineWidth = 3;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(-6, 0);
                ctx.lineTo(6, 0);
                ctx.stroke();

                // Grip & Pommel
                ctx.strokeStyle = "#475569";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, 10);
                ctx.stroke();
                ctx.fillStyle = "#cbd5e1";
                ctx.beginPath();
                ctx.arc(0, 11, 2.5, 0, Math.PI * 2);
                ctx.fill();

                // Flying Glowing Blade
                ctx.shadowColor = "#00f0ff";
                ctx.shadowBlur = 14;
                ctx.fillStyle = "#f8fafc";
                ctx.strokeStyle = "#00f0ff";
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(-2.5, 0);
                ctx.lineTo(-2, -30);
                ctx.lineTo(0, -38);
                ctx.lineTo(2, -30);
                ctx.lineTo(2.5, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            } else if (spell.type === 'sin_wave') {
                ctx.save();
                ctx.strokeStyle = "#00ffff";
                ctx.fillStyle = "#00ffff";
                ctx.shadowColor = "#00ffff";
                ctx.shadowBlur = 18;
                ctx.lineWidth = 5;
                const duration = 120;
                const amplitude = 55 * (0.3 + 0.07 * spellPower);
                const originX = spell.origin_x ?? sx;
                const originY = spell.origin_y ?? sy;
                ctx.beginPath();
                for (let age = 0; age <= st; age += 2) {
                    const phase = (2 * Math.PI * age) / duration;
                    const tx = originX + (3 * age * sdir);
                    const ty = originY - amplitude * Math.sin(phase);
                    if (age === 0) ctx.moveTo(tx, ty);
                    else ctx.lineTo(tx, ty);
                }
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(sx, sy, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (spell.type === 'cos_wave') {
                ctx.save();
                ctx.strokeStyle = "#ffd700";
                ctx.shadowColor = "#ffd700";
                ctx.shadowBlur = 20;
                ctx.lineWidth = 5;
                const duration = 120;
                const amplitude = 55 * (0.3 + 0.07 * spellPower);
                const originX = spell.origin_x ?? sx;
                const originY = spell.origin_y ?? sy;
                ctx.beginPath();
                for (let age = 0; age <= st; age += 2) {
                    const phase = (2 * Math.PI * age) / duration;
                    const tx = originX + (3 * age * sdir);
                    const ty = originY - amplitude * Math.cos(phase);
                    if (age === 0) ctx.moveTo(tx, ty);
                    else ctx.lineTo(tx, ty);
                }
                ctx.stroke();
                ctx.fillStyle = "#ffd700";
                ctx.beginPath();
                ctx.arc(sx, sy, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (spell.type === 'tan_spike') {
                ctx.save();
                const rise = Math.min(st / 20, 1);
                const fade = st > 45 ? Math.max(0, (60 - st) / 15) : 1;
                const progress = rise * fade;
                ctx.globalAlpha = fade;
                ctx.strokeStyle = "#e040fb";
                ctx.shadowColor = "#e040fb";
                ctx.shadowBlur = 24;
                ctx.lineWidth = 6;
                drawTrigCurve(ctx, {
                    centerX: sx, centerY: 555 - (35 * rise), width: 130,
                    start: -1.35, end: 1.35, samples: 72,
                    fn: angle => Math.tan(angle),
                    scale: (10 + (1.5 * spellPower)) * progress,
                    direction: sdir, ySign: -1
                });
                ctx.restore();
            } else if (spell.type === 'cot_wall') {
                ctx.save();
                ctx.strokeStyle = "#ff3d00";
                ctx.shadowColor = "#ff3d00";
                ctx.shadowBlur = 16;
                ctx.lineWidth = 5;
                drawTrigCurve(ctx, {
                    centerX: sx, centerY: 520, width: 60,
                    start: 0.38, end: Math.PI - 0.38, samples: 48,
                    fn: angle => Math.cos(angle) / Math.sin(angle),
                    scale: 12 + (2 * spellPower), direction: sdir, ySign: -1
                });
                ctx.restore();
            }
        });
    }

    // Winner Banner - clean modern pill
    let is_game_over = false;
    let winnerText = "";
    let winnerColor = "";
    if (data.player1 && data.player1.heart <= 0) {
        winnerText = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? "BOT WINS! 🤖" : "PLAYER 2 WINS! 🏆";
        winnerColor = "#38bdf8";
        is_game_over = true;
    } else if (data.player2 && data.player2.heart <= 0) {
        winnerText = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? "YOU WIN! 🏆" : "PLAYER 1 WINS! 🏆";
        winnerColor = "#4ade80";
        is_game_over = true;
    }

    if (is_game_over) {
        ctx.save();
        ctx.font = "700 22px 'Space Grotesk', 'Segoe UI', sans-serif";
        const metrics = ctx.measureText(winnerText);
        const bannerW = metrics.width + 48;
        const bannerH = 48;
        const bannerX = (canvas.width - bannerW) / 2;
        const bannerY = 220;

        ctx.fillStyle = "rgba(22, 23, 29, 0.94)";
        ctx.strokeStyle = winnerColor;
        ctx.lineWidth = 1.5;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 10);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
            ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = winnerColor;
        ctx.fillText(winnerText, canvas.width / 2, bannerY + bannerH / 2);
        ctx.restore();
    }

    // Pause Overlay Banner
    if (isPaused && !is_game_over) {
        ctx.save();
        ctx.fillStyle = "rgba(10, 11, 16, 0.72)";
        ctx.fillRect(0, 0, canvas.width, 600);

        const bannerW = 440;
        const bannerH = 76;
        const bannerX = (canvas.width - bannerW) / 2;
        const bannerY = 220;

        ctx.fillStyle = "rgba(22, 23, 29, 0.95)";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
            ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.font = "700 22px 'Space Grotesk', 'Segoe UI', sans-serif";
        ctx.fillStyle = "#fbbf24";
        ctx.fillText("⏸️ MATCH PAUSED", canvas.width / 2, bannerY + 34);

        ctx.font = "500 14px 'Space Grotesk', 'Segoe UI', sans-serif";
        ctx.fillStyle = "#94a3b8";
        const isMyPause = (pausePlayerId !== null && typeof MY_PLAYER_ID !== 'undefined') ? (pausePlayerId === MY_PLAYER_ID) : true;
        const pauseMsg = isMyPause ?
            `You switched tab · Auto-forfeit in ${pauseSecondsLeft}s` :
            `Opponent switched tab · Waiting (Auto-win in ${pauseSecondsLeft}s)`;
        ctx.fillText(pauseMsg, canvas.width / 2, bannerY + 58);
        ctx.restore();
    }

    if (is_game_over && !prevGameOver) {
        const p1Dead = (data.player1 && data.player1.heart <= 0);
        const p2Dead = (data.player2 && data.player2.heart <= 0);
        const isDraw = p1Dead && p2Dead;
        const iWon = !isDraw && ((MY_PLAYER_ID === 1 && p2Dead) || (MY_PLAYER_ID === 2 && p1Dead));

        if (window.AudioEngine) {
            window.AudioEngine.playGameOver(iWon);
        }
        logCombatTelemetry('gameover', '[VICTORY]', `🏆 ${winnerText}`);

        // 🏆 Progressive Arcade Unlock Record on Victory
        if (iWon && typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM && typeof BOT_DIFFICULTY !== 'undefined') {
            const stageMap = { 'rusher': 1, 'easy': 1, 'turtle': 2, 'weaver': 3, 'duelist': 4, 'hard': 5, 'berserker': 5, 'apex': 6 };
            const currentStage = stageMap[BOT_DIFFICULTY] || 1;
            if (currentStage < 6) {
                try {
                    const prevUnlocked = parseInt(localStorage.getItem('stickman_arcade_unlocked') || '1', 10);
                    const nextStage = Math.max(prevUnlocked, currentStage + 1);
                    localStorage.setItem('stickman_arcade_unlocked', nextStage.toString());
                    console.log(`🏆 Arcade milestone unlocked: Stage ${nextStage}!`);
                    if (typeof showToast === 'function') {
                        showToast({
                            title: "Stage Unlocked! 🏆",
                            message: `Congratulations! Stage ${nextStage} has been unlocked in the Arcade Ladder!`,
                            type: "success",
                            duration: 5000
                        });
                    }
                } catch(e) {
                    console.error("Failed to save arcade milestone to localStorage", e);
                }
            }
        }
    }
    prevGameOver = is_game_over;

    const restartBtn = document.getElementById('restart_btn');
    if (restartBtn) {
        restartBtn.style.display = is_game_over ? 'inline-block' : 'none';
    }
    const exitMatchBtn = document.getElementById('exit_match_btn');
    if (exitMatchBtn) {
        exitMatchBtn.style.display = is_game_over ? 'inline-flex' : 'none';
    }
    const nextStageBtn = document.getElementById('next_stage_btn');
    if (nextStageBtn) {
        const p1Dead = (data.player1 && data.player1.heart <= 0);
        const p2Dead = (data.player2 && data.player2.heart <= 0);
        const wonMatch = (MY_PLAYER_ID === 1 && p2Dead) || (MY_PLAYER_ID === 2 && p1Dead);
        const nextBotMap = {
            'rusher': { key: 'turtle', label: 'Stage 2: Iron Turtle' },
            'turtle': { key: 'weaver', label: 'Stage 3: Wave Weaver' },
            'weaver': { key: 'duelist', label: 'Stage 4: Shadow Duelist' },
            'duelist': { key: 'berserker', label: 'Stage 5: Berserker Ronin' },
            'berserker': { key: 'apex', label: 'Stage 6: Apex Sovereign' }
        };
        const nextBot = (typeof BOT_DIFFICULTY !== 'undefined') ? nextBotMap[BOT_DIFFICULTY] : null;

        if (is_game_over && wonMatch && typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM && nextBot) {
            nextStageBtn.style.display = 'inline-flex';
            nextStageBtn.href = '/bot/' + nextBot.key;
            nextStageBtn.innerText = `⚔️ Next: ${nextBot.label} ➔`;
        } else {
            nextStageBtn.style.display = 'none';
        }
    }

    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        if (is_game_over) {
            runBtn.disabled = true;
            runBtn.innerText = "Match Over (Play Again to Rematch)";
        } else if (isPaused) {
            runBtn.disabled = true;
            runBtn.innerText = "⏸️ Match Paused";
        } else if (data.is_match_active && runBtn.disabled && (runBtn.innerText.includes("Paused") || runBtn.innerText.includes("Waiting"))) {
            // Self-healing: if server reports active match and unpaused, ensure button is ready
            runBtn.disabled = false;
            runBtn.innerText = "Run";
            const waitScreen = document.getElementById('wait_screen');
            if (waitScreen) waitScreen.style.display = 'none';
        }
    }
}

function run() {
    dismissDiagnostics();
    if (window.AudioEngine) window.AudioEngine.playClick();

    // Prevent multi-click spam within 350ms
    const now = Date.now();
    if (window._lastCodeRunTime && (now - window._lastCodeRunTime < 350)) {
        return;
    }
    window._lastCodeRunTime = now;

    const runBtn = document.getElementById("run_btn");
    if (runBtn && runBtn.disabled) {
        if (typeof showToast === 'function') {
            const hintMsg = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM)
                ? "The match is over. Click Rematch below to duel the bot again!"
                : "The match is over or Player 2 has not joined yet. Start a rematch or wait for Player 2.";
            showToast({
                title: "Player Not Ready",
                message: hintMsg,
                type: "warning"
            });
        } else {
            console.warn("The match is over or Player 2 is not ready.");
        }
        return;
    }
    if (window.codeMirrorInstance) {
        window.codeMirrorInstance.save();
    }
    const code = document.getElementById("ide").value;
    if (!code || !code.trim()) {
        if (typeof showToast === 'function') {
            showToast({
                title: "Code Editor Empty",
                message: "Please write or keep the Python combat strategy before clicking Run!",
                type: "warning"
            });
        }
        return;
    }
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerText = "Running...";
        runBtn.style.opacity = "0.75";
    }
    const payload = {
        "code": code,
        "player_id": MY_PLAYER_ID,
        "room_id": typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
    };
    socket.emit("run_code", payload);

    const activeLines = code.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const firstCmd = activeLines[0] || code.trim().split('\n')[0] || "custom algorithm";
    const shortCmd = firstCmd.length > 30 ? firstCmd.slice(0, 27) + '...' : firstCmd;
    logCombatTelemetry('code', `[P${MY_PLAYER_ID} CODE]`, `Sent: ${shortCmd}`);

    // Safety timeout: Auto-recover from "Running..." if network hangs
    clearTimeout(window._runCodeSafetyTimeout);
    window._runCodeSafetyTimeout = setTimeout(() => {
        if (runBtn && runBtn.innerText === "Running...") {
            runBtn.disabled = false;
            runBtn.innerText = "Run";
            runBtn.style.opacity = "1";
        }
    }, 2500);
}

function request_restart() {
    socket.emit('restart_game', {
        "room_id": typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
    });
}

socket.on('game_restarted', () => {
    console.log("Game restarted!");
    prevGameOver = false;
    const restartBtn = document.getElementById('restart_btn');
    if (restartBtn) {
        restartBtn.style.display = 'none';
    }
    const exitMatchBtn = document.getElementById('exit_match_btn');
    if (exitMatchBtn) {
        exitMatchBtn.style.display = 'none';
    }
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "Run";
    }
});

socket.on('update_game_gui', draw_on_camvas);

// --- PRIVATE IN-EDITOR DIAGNOSTICS (Opponent never sees this) ---
function showDiagnostics(msg) {
    const diag = document.getElementById("editor_diagnostics");
    const diagMsg = document.getElementById("diag_message");
    if (!diag || !diagMsg) return;
    diagMsg.innerText = msg;
    diag.style.display = "flex";
}

function dismissDiagnostics() {
    const diag = document.getElementById("editor_diagnostics");
    if (diag) diag.style.display = "none";
}

socket.on('code_error', (data) => {
    clearTimeout(window._runCodeSafetyTimeout);
    const runBtn = document.getElementById("run_btn");
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "Run";
        runBtn.style.opacity = "1";
    }
    if (data && data.error) {
        showDiagnostics(data.error);
        const firstErr = (data.error.split('\n')[0] || data.error);
        logCombatTelemetry('error', '[COMPILE ERR]', firstErr.slice(0, 42));
    }
});

socket.on('code_success', () => {
    dismissDiagnostics();
    clearTimeout(window._runCodeSafetyTimeout);
    logCombatTelemetry('success', '[ACCEPTED]', 'Combat instructions verified & running');
    const runBtn = document.getElementById("run_btn");
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "✓ Executed";
        runBtn.style.opacity = "1";
        setTimeout(() => {
            if (runBtn && !runBtn.disabled && runBtn.innerText === "✓ Executed") {
                runBtn.innerText = "Run";
            }
        }, 1200);
    }
});

// --- TACTICAL EMERGENCY DEFENSE SYSTEM ---
const emergencyCooldowns = {
    shield: 0,
    dodge: 0
};
let emergencyFeedbackTimer = null;

function showEmergencyFeedback(msg, type) {
    const el = document.getElementById('emergency_feedback');
    if (!el) return;
    el.innerText = msg;
    el.style.opacity = '1';
    if (type === 'warning') el.style.color = '#f59e0b';
    else if (type === 'danger') el.style.color = '#ef4444';
    else if (type === 'success') el.style.color = '#38bdf8';
    else el.style.color = '#8a8b94';

    if (emergencyFeedbackTimer) clearTimeout(emergencyFeedbackTimer);
    emergencyFeedbackTimer = setTimeout(() => {
        el.style.opacity = '0';
    }, 3200);
}

function triggerEmergency(action) {
    if (action !== 'shield' && action !== 'dodge') return;
    const now = Date.now();
    if (emergencyCooldowns[action] && now < emergencyCooldowns[action]) {
        const rem = Math.ceil((emergencyCooldowns[action] - now) / 1000);
        showEmergencyFeedback(`Cooling down... (${rem}s)`, 'warning');
        return;
    }
    if (window.AudioEngine) {
        if (action === 'shield') window.AudioEngine.playShieldBlock();
        else if (action === 'dodge') window.AudioEngine.playDodge();
    }
    socket.emit('emergency_action', { action: action });
}

function startEmergencyCooldownUI(action, cooldownSec) {
    const btn = document.getElementById(`emergency_${action}_btn`);
    const overlay = document.getElementById(`${action}_cd_overlay`);
    if (!btn || !overlay) return;

    btn.disabled = true;
    btn.classList.add('on-cooldown');
    let remaining = cooldownSec;
    overlay.innerText = `${remaining}s`;

    const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(interval);
            btn.disabled = false;
            btn.classList.remove('on-cooldown');
            overlay.innerText = '';
        } else {
            overlay.innerText = `${remaining}s`;
        }
    }, 1000);
}

socket.on('emergency_used', (data) => {
    const action = data.action;
    const cd = data.cooldown || 8;
    emergencyCooldowns[action] = Date.now() + (cd * 1000);
    startEmergencyCooldownUI(action, cd);
    const label = action === 'shield' ? '🛡️ Quick Shield' : '💨 Quick Dodge';
    showEmergencyFeedback(`${label} activated!`, 'success');
    logCombatTelemetry('emergency', '[PANIC REFLEX]', `🚨 ${label} activated! (-15⚡)`);
});

socket.on('emergency_cooldown', (data) => {
    showEmergencyFeedback(`Wait ${data.remaining}s`, 'warning');
});

socket.on('emergency_rejected', (data) => {
    showEmergencyFeedback(data.reason || 'Action rejected', 'danger');
});

// Tactical Keyboard Hotkeys (Alt+S for Shield, Alt+D for Dodge) & WASD Guidance
let lastWASDToastTime = 0;

window.addEventListener('keydown', (e) => {
    // 1. Tactical Keyboard Hotkeys
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        triggerEmergency('shield');
        return;
    } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        triggerEmergency('dodge');
        return;
    }

    // Don't intercept if modifier keys like Ctrl, Cmd, or Alt are pressed
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // Check if player is focused in an active input, textarea, or CodeMirror editor
    const activeEl = document.activeElement;
    const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable ||
        activeEl.closest('.CodeMirror') ||
        activeEl.closest('#opponent_input_modal') ||
        activeEl.closest('#strategy_vault_dialog') ||
        activeEl.closest('#commands_dialog')
    );
    if (isTyping) return;

    // Also don't intercept if battle start gate is visible (any key enters the gate)
    const gate = document.getElementById('battle_start_gate');
    if (gate && gate.style.display !== 'none' && gate.offsetParent !== null) {
        return;
    }

    // WASD & Arrow Keys Intervention for casual arcade gamers
    const wasdKeys = ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
    if (wasdKeys.includes(e.key) || ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        const now = Date.now();
        if (now - lastWASDToastTime > 3000) {
            lastWASDToastTime = now;
            if (typeof showToast === 'function') {
                showToast({
                    title: "Keyboard Controls Disabled ⚡",
                    message: "Standard keyboard controls disabled! Click Quick Snippets or write Python code to duel!",
                    type: "warning",
                    duration: 3800
                });
            }
            // Highlight the 1-Click Snippets row with a pulsing neon ring
            const chipsRow = document.getElementById('quick_code_chips_row') || document.querySelector('.quick-code-chips-row');
            if (chipsRow) {
                chipsRow.classList.remove('chips-attention-pulse');
                void chipsRow.offsetWidth; // trigger reflow
                chipsRow.classList.add('chips-attention-pulse');
                setTimeout(() => chipsRow.classList.remove('chips-attention-pulse'), 1600);
            }
        }
    }
});
