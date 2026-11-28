// ami js jani na ai bujhiye diche tai korchi vnaila js
const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 30,
    reconnectionDelay: 1000
}); // Connect to the server using Socket.IO (prioritize WebSocket for low latency)
window.socket = socket;

// --- GOOGLE ANALYTICS (GA4) CUSTOM COMBAT TELEMETRY ---
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

// Connection Status Helpers
const statusDot = document.getElementById('status_dot');
const statusText = document.getElementById('status_text');

function showNetworkToast(isOnline, customMsg) {
    let toast = document.getElementById('network_status_toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'network_status_toast';
        toast.className = 'network-status-toast';
        document.body.appendChild(toast);
    }

    if (!isOnline) {
        toast.className = 'network-status-toast is-visible';
        toast.innerHTML = `<span>📶</span> <span>${customMsg || "Connection lost. Reconnecting to arena server — code is safely cached..."}</span>`;
    } else {
        toast.className = 'network-status-toast is-visible is-online';
        toast.innerHTML = `<span>⚡</span> <span>${customMsg || "Back Online! Reconnected to arena server."}</span>`;
        setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 3200);
    }
}

window.addEventListener('offline', () => showNetworkToast(false, "You are currently offline. Check your internet connection."));
window.addEventListener('online', () => showNetworkToast(true, "Back Online! Reconnecting to battle..."));

function updateConnectionStatus(status) {
    if (status === 'connected') {
        if (window._hadDisconnect) {
            showNetworkToast(true, "Reconnected to battle server!");
            window._hadDisconnect = false;
        }
        if (statusDot) statusDot.style.background = '#4ade80';
        if (statusText) { statusText.style.color = '#4ade80'; statusText.innerText = 'Online'; }
    } else if (status === 'reconnecting') {
        window._hadDisconnect = true;
        showNetworkToast(false, "Connection interrupted. Reconnecting to arena...");
        if (statusDot) statusDot.style.background = '#facc15';
        if (statusText) { statusText.style.color = '#facc15'; statusText.innerText = 'Reconnecting...'; }
    } else if (status === 'offline') {
        window._hadDisconnect = true;
        showNetworkToast(false, "Server offline or match connection closed.");
        if (statusDot) statusDot.style.background = '#ef4444';
        if (statusText) { statusText.style.color = '#ef4444'; statusText.innerText = 'Offline'; }
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
    const btn = document.getElementById('guide_toggle_btn');
    if (banner) {
        banner.style.display = 'none';
    }
    if (btn) btn.classList.remove('is-active');
}
window.dismissQuickGuide = dismissQuickGuide;

function toggleQuickGuide() {
    const banner = document.getElementById('quick_start_guide_banner');
    const btn = document.getElementById('guide_toggle_btn');
    if (!banner) return;
    const isHidden = (banner.style.display === 'none' || getComputedStyle(banner).display === 'none');
    if (isHidden) {
        banner.style.display = 'block';
        if (btn) btn.classList.add('is-active');
    } else {
        banner.style.display = 'none';
        if (btn) btn.classList.remove('is-active');
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
const MAX_TELEMETRY_LOGS = 150;

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

function sendPlayerTabState(forceHidden) {
    const isHidden = typeof forceHidden === 'boolean' ? forceHidden : (!!document.hidden);
    console.log("🎮 Tab visibility changed. Hidden:", isHidden);
    if (typeof socket !== 'undefined' && socket && socket.connected) {
        socket.emit('player_tab_state', { hidden: isHidden });
    }
}

document.addEventListener('visibilitychange', () => sendPlayerTabState());
window.addEventListener('pagehide', () => sendPlayerTabState(true));
window.addEventListener('pageshow', () => sendPlayerTabState());
window.addEventListener('blur', () => sendPlayerTabState(true));
window.addEventListener('focus', () => sendPlayerTabState(false));

function toggle_bot_pause() {
    if (typeof socket !== 'undefined' && socket && socket.connected) {
        socket.emit('toggle_bot_pause', { room_id: typeof ROOM_ID !== 'undefined' ? ROOM_ID : '' });
    }
}
window.toggle_bot_pause = toggle_bot_pause;

function updatePauseUI(isPaused, isManual) {
    const pauseBtn = document.getElementById('pause_bot_btn');
    const overlay = document.getElementById('pause_overlay');
    const title = document.getElementById('pause_title');
    const desc = document.getElementById('pause_desc');
    const timerWrap = document.getElementById('pause_timer_wrap');
    const subtext = document.getElementById('pause_subtext');
    const cardResumeBtn = document.getElementById('pause_resume_card_btn');

    if (pauseBtn) {
        if (isPaused) {
            pauseBtn.innerHTML = "▶️ Resume";
            pauseBtn.classList.remove("button-secondary");
            pauseBtn.classList.add("button-primary");
            pauseBtn.style.color = "#10b981";
            pauseBtn.style.borderColor = "rgba(16, 185, 129, 0.5)";
            pauseBtn.title = "Resume Battle (Ctrl+P)";
        } else {
            pauseBtn.innerHTML = "⏸️ Pause";
            pauseBtn.classList.remove("button-primary");
            pauseBtn.classList.add("button-secondary");
            pauseBtn.style.color = "#fbbf24";
            pauseBtn.style.borderColor = "rgba(251, 191, 36, 0.4)";
            pauseBtn.title = "Pause Battle (Ctrl+P)";
        }
    }

    if (overlay) {
        if (isPaused) {
            overlay.style.display = 'flex';
            if (isManual) {
                if (title) title.innerText = "Battle Paused";
                if (desc) desc.innerText = "Arena physics & AI bot are frozen. Edit your Python code or click Resume to continue.";
                if (timerWrap) timerWrap.style.display = 'none';
                if (subtext) subtext.innerText = "Press Ctrl+P or click below to resume the fight.";
                if (cardResumeBtn) cardResumeBtn.style.display = 'inline-block';
            } else {
                if (title) title.innerText = "Game Paused";
                if (desc) desc.innerText = "Player is away in another tab. Arena & physics are frozen.";
                if (timerWrap) timerWrap.style.display = 'block';
                if (subtext) subtext.innerText = "Return to this tab within 1 minute or the match will forfeit and exit.";
                if (cardResumeBtn) cardResumeBtn.style.display = 'none';
            }
        } else {
            overlay.style.display = 'none';
        }
    }
}
window.updatePauseUI = updatePauseUI;

socket.on('game_paused', (data) => {
    isMatchPaused = true;
    pausePlayerId = data.paused_by;
    pauseSecondsLeft = data.timeout || 0;
    console.log("⏸️ Match paused by Player", data.paused_by);
    updatePauseUI(true, !!data.manual);
});

socket.on('game_resumed', (data) => {
    isMatchPaused = false;
    pausePlayerId = null;
    console.log("▶️ Match resumed by Player", data.resumed_by);
    updatePauseUI(false, !!data.manual);
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

    let saceGrant = null;
    try {
        const rawGrant = localStorage.getItem('stickman_sace_brain_v2');
        if (rawGrant) {
            saceGrant = JSON.parse(rawGrant);
        }
    } catch (e) {
        console.warn("Failed to read SACE grant from localStorage:", e);
    }

    socket.emit('player_joined', { 
        room_id: ROOM_ID,
        token: ROOM_TOKEN,
        sace_grant: saceGrant
    });

    if (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM && window.gateDismissed) {
        socket.emit('start_match');
    }

    if (document.hidden) {
        sendPlayerTabState(true);
    }
});

socket.on('sace_brain_updated', function(data) {
    if (data && data.weights) {
        try {
            localStorage.setItem('stickman_sace_brain_v2', JSON.stringify(data.weights));
            console.log("SACE Master Bot brain memory updated in localStorage!");
        } catch (err) {
            console.warn("Failed to persist SACE grant to localStorage:", err);
        }
    }
});

let latestVictoryReceipt = null;
let currentMatchChallengeMsg = "";
let matchStartTime = Date.now();
let matchCodeRunCount = 0;
let matchTrackedStarted = false;

function showDefeatDialog(oppTitle, combatDuration, opponentHp, codeLines) {
    const dialog = document.getElementById('victory_challenge_dialog');
    if (!dialog) return;

    dialog.classList.add('is-defeat');

    const trophyEl = document.getElementById('vic_trophy_glow');
    if (trophyEl) trophyEl.innerText = '💀';

    const titleEl = document.getElementById('vic_title');
    if (titleEl) titleEl.innerText = 'DEFEATED IN COMBAT!';

    const oppEl = document.getElementById('vic_opponent_title');
    if (oppEl) oppEl.innerText = `Defeated by ${oppTitle}`;

    const sealIcon = document.getElementById('vic_seal_icon');
    if (sealIcon) sealIcon.innerText = '⚔️';

    const sealEl = document.getElementById('vic_receipt_label');
    if (sealEl) sealEl.innerText = 'Combat Concluded · Challenge a Friend';

    const timeEl = document.getElementById('vic_combat_time');
    if (timeEl) timeEl.innerText = `${combatDuration}s`;

    const statLabel2 = document.getElementById('vic_stat_label_2');
    if (statLabel2) statLabel2.innerText = 'Opponent HP';

    const hpEl = document.getElementById('vic_hp_remaining');
    if (hpEl) hpEl.innerText = `${opponentHp} / 10`;

    const linesEl = document.getElementById('vic_code_lines');
    if (linesEl) linesEl.innerText = `${codeLines} lines`;

    const cleanOpp = oppTitle.replace(/[👑🥋🌱🛡️📐🗡️🔥🐣]/g, '').trim();
    const shareUrl = window.location.origin ? window.location.origin : 'https://arrows-dev.itch.io/stickman-battle';

    // Pure English challenge text:
    const challengeMsg = `⚔️ I couldn't defeat ${cleanOpp}, can you? It just crushed my Python strategy in Stickman Battle! Can your code beat it? 🔥\n🎮 Play free in browser 👉 ${shareUrl}`;
    currentMatchChallengeMsg = challengeMsg;

    const quoteEl = document.getElementById('vic_challenge_text');
    if (quoteEl) quoteEl.innerText = `"I couldn't defeat ${cleanOpp}, can you? ⚔️ Can your Python code beat this bot?"`;

    const waBtn = document.getElementById('btn_whatsapp_share');
    if (waBtn) {
        waBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(challengeMsg)}`;
    }

    const waText = document.getElementById('btn_whatsapp_share_text');
    if (waText) waText.innerText = 'Challenge on WhatsApp';

    const nextBtn = document.getElementById('vic_next_btn');
    if (nextBtn) nextBtn.style.display = 'none';

    setTimeout(() => {
        try {
            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }
        } catch(e) {}
    }, 600);
}

function showVictoryDialog(data) {
    const dialog = document.getElementById('victory_challenge_dialog');
    if (!dialog) return;

    dialog.classList.remove('is-defeat');

    const trophyEl = document.getElementById('vic_trophy_glow');
    if (trophyEl) trophyEl.innerText = '🏆';

    const titleEl = document.getElementById('vic_title');
    if (titleEl) titleEl.innerText = 'VICTORY ACHIEVED!';

    const oppEl = document.getElementById('vic_opponent_title');
    if (oppEl) oppEl.innerText = data.opponent_title || 'Opponent Defeated';

    const sealIcon = document.getElementById('vic_seal_icon');
    if (sealIcon) sealIcon.innerText = '🛡️';

    const sealEl = document.getElementById('vic_receipt_label');
    if (sealEl) sealEl.innerText = `Anti-Cheat Verified · #${data.receipt_token || 'SB2-VICTORY'}`;

    const timeEl = document.getElementById('vic_combat_time');
    if (timeEl) timeEl.innerText = `${data.combat_duration}s`;

    const statLabel2 = document.getElementById('vic_stat_label_2');
    if (statLabel2) statLabel2.innerText = 'HP Remaining';

    const hpEl = document.getElementById('vic_hp_remaining');
    if (hpEl) hpEl.innerText = `${data.hp_remaining} / 10`;

    let codeLines = 1;
    const cm = window.codeMirrorInstance || window.editor;
    if (cm) {
        const val = cm.getValue().trim();
        codeLines = val ? val.split('\n').filter(l => l.trim().length > 0).length : 1;
    }
    const linesEl = document.getElementById('vic_code_lines');
    if (linesEl) linesEl.innerText = `${codeLines} lines`;

    const oppName = (data.opponent_title || 'SACE Bot').replace(/[👑🥋🌱🛡️📐🗡️🔥🐣]/g, '').trim();
    const shareUrl = window.location.origin ? window.location.origin : 'https://arrows-dev.itch.io/stickman-battle';
    const challengeMsg = `⚔️ I just defeated ${oppName} in Stickman Battle in ${data.combat_duration}s with ${data.hp_remaining}/10 HP (${codeLines} lines of Python)!\nCan your code beat mine? 🔥\n🎮 Play free in browser 👉 ${shareUrl}`;
    currentMatchChallengeMsg = challengeMsg;

    const quoteEl = document.getElementById('vic_challenge_text');
    if (quoteEl) quoteEl.innerText = `"${challengeMsg.split('\n')[0]} Can your code beat mine? 🔥"`;

    const waBtn = document.getElementById('btn_whatsapp_share');
    if (waBtn) {
        waBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(challengeMsg)}`;
    }

    const waText = document.getElementById('btn_whatsapp_share_text');
    if (waText) waText.innerText = 'Challenge on WhatsApp';

    // Next stage button in dialog
    const nextBtn = document.getElementById('vic_next_btn');
    if (nextBtn) {
        const stageMap = {
            'easy': { key: 'turtle', label: 'Stage 2: Iron Turtle' },
            'rusher': { key: 'turtle', label: 'Stage 2: Iron Turtle' },
            'turtle': { key: 'weaver', label: 'Stage 3: Wave Weaver' },
            'weaver': { key: 'duelist', label: 'Stage 4: Shadow Duelist' },
            'duelist': { key: 'berserker', label: 'Stage 5: Berserker Ronin' },
            'hard': { key: 'apex', label: 'Stage 6: Apex Sovereign' },
            'berserker': { key: 'apex', label: 'Stage 6: Apex Sovereign' }
        };
        const nextInfo = stageMap[data.bot_difficulty];
        if (nextInfo) {
            nextBtn.style.display = 'inline-flex';
            nextBtn.href = '/bot/' + nextInfo.key;
            nextBtn.innerText = `⚔️ Next: ${nextInfo.label} ➔`;
        } else {
            nextBtn.style.display = 'none';
        }
    }

    setTimeout(() => {
        try {
            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }
        } catch(e) {}
    }, 700);
}

socket.on('match_victory_receipt', function(data) {
    if (!data || data.winner !== MY_PLAYER_ID) return;
    latestVictoryReceipt = data;
    console.log("🛡️ Received Anti-Cheat Verified Victory Receipt:", data);

    // 1. Post to /api/claim_victory to unlock on server
    fetch('/api/claim_victory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            room_id: (typeof ROOM_ID !== 'undefined' ? ROOM_ID : ''),
            bot_difficulty: data.bot_difficulty,
            combat_duration: data.combat_duration,
            hp_remaining: data.hp_remaining,
            receipt_token: data.receipt_token
        })
    }).then(res => res.json()).then(resData => {
        if (resData.success && resData.unlocked_stage) {
            try {
                localStorage.setItem('stickman_arcade_unlocked', resData.unlocked_stage.toString());
                console.log(`🏆 Server confirmed stage unlock: Stage ${resData.unlocked_stage}`);
            } catch(e) {}
        }
    }).catch(err => console.warn("Failed to claim victory token:", err));

    showVictoryDialog(data);
});

function copyMatchChallenge() {
    const msg = currentMatchChallengeMsg;
    if (!msg) return;

    const notify = () => {
        if (typeof showToast === 'function') {
            showToast({
                title: "Challenge Copied! 📋",
                message: "Challenge card copied to clipboard! Share it in WhatsApp or Discord.",
                type: "success",
                duration: 4000
            });
        }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(notify).catch(() => {
            const ta = document.createElement("textarea");
            ta.value = msg;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            notify();
        });
    } else {
        const ta = document.createElement("textarea");
        ta.value = msg;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        notify();
    }
}
window.copyMatchChallenge = copyMatchChallenge;
window.copyVictoryChallenge = copyMatchChallenge; // backward compatibility

function closeVictoryDialog() {
    const dialog = document.getElementById('victory_challenge_dialog');
    if (dialog) {
        if (typeof dialog.close === 'function') {
            dialog.close();
        } else {
            dialog.removeAttribute('open');
        }
        dialog.classList.remove('is-defeat');
    }
}

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
    if (!matchTrackedStarted) {
        matchStartTime = Date.now();
        matchCodeRunCount = 0;
        matchTrackedStarted = true;
        trackGameEvent('game_match_start', {
            mode: (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'bot' : 'pvp',
            difficulty: (typeof BOT_DIFFICULTY !== 'undefined' ? BOT_DIFFICULTY : 'pvp'),
            player_id: typeof MY_PLAYER_ID !== 'undefined' ? MY_PLAYER_ID : 1
        });
    }
    if (window.AudioEngine) {
        if (typeof window.AudioEngine.setBgmMode === 'function') window.AudioEngine.setBgmMode('battle');
        window.AudioEngine.playMatchStart();
    }
    const waitScreen = document.getElementById('wait_screen');
    if (waitScreen) {
        waitScreen.style.display = 'none';
    }
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "▶ RUN CODE (Ctrl+Enter)";
    }
});

socket.on('bot_ready', (data) => {
    console.log("Bot ready in arena:", data);
    if (window.AudioEngine && typeof window.AudioEngine.setBgmMode === 'function') {
        window.AudioEngine.setBgmMode('battle');
    }
    const waitScreen = document.getElementById('wait_screen');
    if (waitScreen) waitScreen.style.display = 'none';
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "▶ RUN CODE (Ctrl+Enter)";
    }
});

socket.on('player_left', (data) => {
    console.log("Player left:", data.player_id);
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerText = "Run (Waiting for Player...)";
    }
    if (typeof showToast === 'function') {
        showToast({
            title: "Opponent Left",
            message: `Player ${data.player_id} disconnected from the match. Waiting for reconnect...`,
            type: "warning"
        });
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
let p1HitFlashUntil = 0;
let p2HitFlashUntil = 0;
let prevClash = false;
let arenaShake = 0;
const _lastEvasionLogAt = { p1: 0, p2: 0 };

// --- FLOATING COMBAT POPUPS & DOJO ARENA EFFECTS ---
const combatPopups = [];
function spawnCombatPopup(x, y, text, color, scale) {
    if (combatPopups.length > 24) combatPopups.shift();
    combatPopups.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y,
        vy: -1.65,
        text: text,
        color: color || '#fbbf24',
        scale: scale || 1,
        alpha: 1.0
    });
}

function drawCombatPopups() {
    if (combatPopups.length === 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = combatPopups.length - 1; i >= 0; i--) {
        const p = combatPopups[i];
        p.y += p.vy;
        p.vy *= 0.96;
        p.alpha -= 0.022;
        if (p.alpha <= 0.02) {
            combatPopups.splice(i, 1);
            continue;
        }
        ctx.globalAlpha = Math.min(1, p.alpha);
        const fontSize = Math.round(14 * p.scale);
        ctx.font = `800 ${fontSize}px 'Space Grotesk', sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(10, 11, 15, 0.92)';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
}

function drawArenaBackdrop() {
    const W = canvas.width;
    const H = canvas.height;
    const floorY = 595;

    // 1. Forged Night Dojo Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, floorY);
    skyGrad.addColorStop(0, '#090a0d');
    skyGrad.addColorStop(0.65, '#111116');
    skyGrad.addColorStop(1, '#191418');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, floorY);

    // 2. Distant Torii / Dojo Timber Pillars & Warm Lantern Haze
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.022)';
    // Left & Right Dojo Support Pillars
    ctx.fillRect(88, 120, 16, floorY - 120);
    ctx.fillRect(W - 104, 120, 16, floorY - 120);
    // Top Dojo Crossbeam
    ctx.fillRect(56, 138, W - 112, 12);
    ctx.fillRect(72, 162, W - 144, 6);

    // Warm Amber Lantern Glows on Dojo Pillars
    [130, W - 130].forEach(lx => {
        const lanGrad = ctx.createRadialGradient(lx, 210, 4, lx, 210, 95);
        lanGrad.addColorStop(0, 'rgba(245, 158, 11, 0.14)');
        lanGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lanGrad;
        ctx.beginPath();
        ctx.arc(lx, 210, 95, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.fillRect(lx - 5, 202, 10, 16);
    });

    // Subtle Arena Perspective Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.028)';
    ctx.lineWidth = 1;
    for (let gx = 100; gx < W; gx += 100) {
        ctx.beginPath();
        ctx.moveTo(gx, 168);
        ctx.lineTo(gx, floorY);
        ctx.stroke();
    }
    for (let gy = 260; gy < floorY; gy += 95) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
    }

    // Center Arena Crest Ring
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, floorY - 115, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Stone / Steel Dojo Floor & Tactile 100px Distance Marks
    ctx.fillStyle = '#18161a';
    ctx.fillRect(0, floorY, W, H - floorY);

    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.stroke();

    // Distance ruler ticks every 100px for Python coders
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.font = '600 9px Consolas, monospace';
    ctx.textAlign = 'center';
    for (let dx = 100; dx < W; dx += 100) {
        ctx.beginPath();
        ctx.moveTo(dx, floorY - 4);
        ctx.lineTo(dx, floorY + 3);
        ctx.stroke();
    }
    ctx.restore();
}

// --- DYNAMIC COMBAT SPARK SYSTEM ---
const combatSparks = [];
function spawnCombatSparks(x, y, color, count) {
    if (combatSparks.length > 80) combatSparks.splice(0, 30); // prevent memory buildup
    const total = count || 10;
    for (let i = 0; i < total; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5.0;
        combatSparks.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2,
            color: color || '#facc15',
            alpha: 1.0,
            radius: 1.5 + Math.random() * 2.5
        });
    }
}

function draw_combat_sparks() {
    if (combatSparks.length === 0) return;
    ctx.save();
    for (let i = combatSparks.length - 1; i >= 0; i--) {
        const s = combatSparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.22; // subtle gravity
        s.alpha *= 0.88;
        if (s.alpha < 0.05) {
            combatSparks.splice(i, 1);
            continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.fill();
    }
    ctx.restore();
}

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

// --- 🥋 FIGHTER PROFILE AVATAR & BOT THEME ENGINE ---
function getBotProfileTheme() {
    const diff = (typeof BOT_DIFFICULTY !== 'undefined' && BOT_DIFFICULTY ? BOT_DIFFICULTY.toLowerCase() : 'easy');
    const themes = {
        'rusher': { icon: '⚡', color: '#10b981', name: 'Byte Rusher' },
        'easy': { icon: '⚡', color: '#10b981', name: 'Byte Rusher' },
        'turtle': { icon: '🛡️', color: '#0ea5e9', name: 'Iron Turtle' },
        'weaver': { icon: '🌊', color: '#a855f7', name: 'Wave Weaver' },
        'duelist': { icon: '🗡️', color: '#f43f5e', name: 'Shadow Duelist' },
        'berserker': { icon: '🔥', color: '#f97316', name: 'Berserker Ronin' },
        'apex': { icon: '👑', color: '#f59e0b', name: 'Apex Sovereign' },
        'hard': { icon: '👑', color: '#f59e0b', name: 'Apex Sovereign' },
        'master': { icon: '👑', color: '#eab308', name: 'SACE Master' },
        'sace': { icon: '👑', color: '#eab308', name: 'SACE Master' },
        'dummy': { icon: '🥋', color: '#14b8a6', name: 'Practice Dojo' }
    };
    return themes[diff] || { icon: '🤖', color: '#38bdf8', name: 'Arena Bot' };
}

function getPlayerProfileTheme() {
    let avatarIcon = '🥋';
    let avatarName = 'YOU';
    let themeColor = '#10b981';

    // 1. Check equipped 20-Avatar choice from Wardrobe Studio
    try {
        const savedAvatar = localStorage.getItem('stickman_custom_avatar');
        if (savedAvatar) {
            const parsedAv = JSON.parse(savedAvatar);
            if (parsedAv.icon) avatarIcon = parsedAv.icon;
            if (parsedAv.name) avatarName = parsedAv.name;
            if (parsedAv.color) themeColor = parsedAv.color;
        }
    } catch(e) {}

    // 2. Also check custom wardrobe body color override if set
    try {
        const savedColors = localStorage.getItem("stickman_custom_colors");
        if (savedColors) {
            const parsedColors = JSON.parse(savedColors);
            if (parsedColors.body && !localStorage.getItem('stickman_custom_avatar')) {
                themeColor = parsedColors.body;
            }
        }
    } catch(e) {}

    return { icon: avatarIcon, color: themeColor, name: avatarName };
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

    if (window._lastKnownPaused !== isPaused) {
        window._lastKnownPaused = isPaused;
        const isManual = isPaused && (pauseSecondsLeft === 0 || (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM));
        updatePauseUI(isPaused, isManual);
    }

    // --- PROCEDURAL AUDIO SFX & COMBAT TELEMETRY EVENT STREAM ---
    if (!isPaused) {
        const eventsHandled = new Set();
        const targetIsBot = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM);
        const targetName = (t) => t === 1 ? 'P1' : (targetIsBot ? 'Bot' : 'P2');

        // 1. Explicit Combat Event Stream from Server Physics Engine
        if (data.combat_events && Array.isArray(data.combat_events) && data.combat_events.length > 0) {
            data.combat_events.forEach(evt => {
                const defenderLabel = targetName(evt.defender || evt.target || 2);
                const attackerLabel = targetName(evt.attacker || (evt.defender === 1 ? 2 : 1));

                switch (evt.type) {
                    case 'sword_clash':
                        if (!document.hidden && window.AudioEngine) window.AudioEngine.playSwordClash();
                        const clashX = evt.x || ((data.player1.x + data.player2.x) / 2);
                        const clashY = evt.y || 470;
                        arenaShake = Math.max(arenaShake, 4.5);
                        spawnCombatSparks(clashX, clashY, '#fef08a', 15);
                        spawnCombatPopup(clashX, clashY - 38, 'CLASH!', '#fbbf24', 1.05);
                        logCombatTelemetry('clash', '[CLASH]', 'Blades clashed mid-air!');
                        eventsHandled.add('clash');
                        break;

                    case 'shield_block':
                        if (!document.hidden && window.AudioEngine) window.AudioEngine.playShieldBlock();
                        const defX = (evt.defender === 1 ? data.player1.x : data.player2.x) + (evt.defender === 1 ? 25 : -25);
                        spawnCombatSparks(defX, 470, '#38bdf8', 12);
                        spawnCombatPopup(defX, 430, 'BLOCKED', '#94a3b8', 0.9);
                        const weaponDesc = evt.projectile ? evt.projectile.replace('_', ' ') : 'strike';
                        logCombatTelemetry('shield', '[BLOCK]', `${defenderLabel} blocked ${weaponDesc}`);
                        eventsHandled.add('shield_block');
                        break;

                    case 'shield_break':
                        if (!document.hidden && window.AudioEngine) {
                            if (window.AudioEngine.playShieldBreak) window.AudioEngine.playShieldBreak();
                            else {
                                window.AudioEngine.playShieldBlock();
                                window.AudioEngine.playDamageHit(true);
                            }
                        }
                        const breakX = (evt.defender === 1 ? data.player1.x : data.player2.x) + (evt.defender === 1 ? 25 : -25);
                        arenaShake = Math.max(arenaShake, 11);
                        spawnCombatSparks(breakX, 470, '#ef4444', 20);
                        spawnCombatPopup(breakX, 415, 'GUARD BROKEN! -1', '#ef4444', 1.15);
                        logCombatTelemetry('shield', '[BREAK]', `${defenderLabel}'s guard shattered! (-1 HP)`);
                        eventsHandled.add('shield_break');
                        eventsHandled.add('hit');
                        break;

                    case 'damage_hit':
                        const isHeavy = !!evt.is_heavy;
                        if (evt.target === 1) p1HitFlashUntil = Date.now() + 140;
                        else p2HitFlashUntil = Date.now() + 140;
                        if (!document.hidden && window.AudioEngine) window.AudioEngine.playDamageHit(isHeavy);
                        const tgtX = (evt.target === 1 ? data.player1.x : data.player2.x);
                        arenaShake = Math.max(arenaShake, isHeavy ? 10 : 6);
                        spawnCombatSparks(tgtX, 470, isHeavy ? '#f43f5e' : '#fbbf24', isHeavy ? 15 : 8);
                        const dmgVal = evt.damage || 1;
                        spawnCombatPopup(tgtX, 420, isHeavy ? `-${dmgVal} HEAVY!` : `-${dmgVal}`, isHeavy ? '#fbbf24' : '#f43f5e', isHeavy ? 1.2 : 1.05);
                        const srcDesc = evt.projectile ? evt.projectile.replace('_', ' ') : (isHeavy ? 'Heavy Strike' : 'Slash');
                        logCombatTelemetry('hit', '[HIT]', `${defenderLabel} took ${srcDesc} (-${dmgVal} HP)`);
                        eventsHandled.add('hit');
                        break;

                    case 'barrier_absorb':
                        if (!document.hidden && window.AudioEngine) {
                            if (window.AudioEngine.playBarrierDeflect) window.AudioEngine.playBarrierDeflect();
                            else window.AudioEngine.playShieldBlock();
                        }
                        const absorbX = (evt.defender === 1 ? data.player1.x : data.player2.x) + (evt.defender === 1 ? 25 : -25);
                        spawnCombatSparks(absorbX, 470, '#c084fc', 12);
                        spawnCombatPopup(absorbX, 430, 'ABSORBED', '#e2e8f0', 0.9);
                        const pName = (evt.projectile || 'spell').replace('_', ' ');
                        logCombatTelemetry('spell', '[GUARD]', `${defenderLabel} absorbed ${pName}`);
                        break;

                    case 'evasion':
                        if (!document.hidden && window.AudioEngine) window.AudioEngine.playDodge();
                        const evX = (evt.defender === 1 ? data.player1.x : data.player2.x);
                        spawnCombatPopup(evX, 425, 'DODGE', '#e2e8f0', 0.85);
                        const evKey = (evt.defender === 1) ? 'p1' : 'p2';
                        if (Date.now() - _lastEvasionLogAt[evKey] > 2400) {
                            _lastEvasionLogAt[evKey] = Date.now();
                            logCombatTelemetry('dodge', '[DODGE]', `${defenderLabel} ducked attack`);
                        }
                        eventsHandled.add('evasion');
                        break;

                    case 'trig_fusion':
                        if (!document.hidden && window.AudioEngine) {
                            if (window.AudioEngine.playTrigFusion) window.AudioEngine.playTrigFusion();
                            else window.AudioEngine.playSwordClash();
                        }
                        arenaShake = Math.max(arenaShake, 8);
                        spawnCombatSparks(evt.x || 400, evt.y || 470, '#38bdf8', 25);
                        spawnCombatSparks(evt.x || 400, evt.y || 470, '#f43f5e', 15);
                        spawnCombatPopup(evt.x || 400, (evt.y || 470) - 45, 'TRIG FUSION!', '#fbbf24', 1.15);
                        logCombatTelemetry('spell', '[FUSION]', `Sin + Cos collided at X=${Math.round(evt.x || 400)}`);
                        break;

                    case 'wave_clash':
                        if (!document.hidden && window.AudioEngine) {
                            if (window.AudioEngine.playWaveClash) window.AudioEngine.playWaveClash();
                            else window.AudioEngine.playDamageHit(false);
                        }
                        spawnCombatSparks(evt.x || 400, evt.y || 470, '#22d3ee', 14);
                        logCombatTelemetry('spell', '[WAVE]', `Opposing waves neutralized`);
                        break;

                    case 'spell_slice':
                        if (!document.hidden && window.AudioEngine) {
                            if (window.AudioEngine.playSpellSlice) window.AudioEngine.playSpellSlice();
                            else window.AudioEngine.playSwordSwing();
                        }
                        const sliceX = (data.player1.x + data.player2.x) / 2;
                        spawnCombatSparks(sliceX, 470, '#fef08a', 14);
                        spawnCombatPopup(sliceX, 430, 'SLICED!', '#fbbf24', 1.0);
                        const waveName = (evt.spell || 'wave').replace('_', ' ');
                        logCombatTelemetry('clash', '[SLICE]', `Thrown sword cut ${waveName}`);
                        break;

                    case 'sword_catch':
                        if (!document.hidden && window.AudioEngine) {
                            if (window.AudioEngine.playSwordCatch) window.AudioEngine.playSwordCatch();
                        }
                        const ownerLbl = targetName(evt.player || 1);
                        logCombatTelemetry('item', '[RETURN]', `Sword returned to ${ownerLbl}`);
                        break;
                }
            });
        }

        // 1.5 Action Sequence Completion & Queued Snippet Execution
        const myPlayer = (MY_PLAYER_ID === 1) ? data.player1 : data.player2;
        const myActionsCount = (myPlayer && typeof myPlayer.actions_count === 'number') ? myPlayer.actions_count : 0;
        if (window._prevActionsCount !== undefined && window._prevActionsCount > 0 && myActionsCount === 0) {
            logCombatTelemetry('code', '[COMPLETE]', 'Action sequence finished · Ready for next command!');
            
            // Pop queued snippet if any from fast 1-click combo buffer
            if (window._snippetQueue && window._snippetQueue.length > 0) {
                const nextSnippet = window._snippetQueue.shift();
                logCombatTelemetry('code', '[COMBO POP]', `Executing queued combo: ${nextSnippet} (${window._snippetQueue.length} remaining)`);
                setTimeout(() => {
                    if (typeof window.executeSnippetDirect === 'function') {
                        window.executeSnippetDirect(nextSnippet);
                    }
                }, 100);
            }
        }
        window._prevActionsCount = myActionsCount;

        // --- BACKWARD-COMPATIBLE FALLBACKS (State Diffing) ---
        // 1. Damage Hit Fallback
        if (!eventsHandled.has('hit')) {
            if (prevP1Heart !== null && data.player1.heart < prevP1Heart) {
                p1HitFlashUntil = Date.now() + 350;
                if (!document.hidden && window.AudioEngine) window.AudioEngine.playDamageHit(false);
                const dmg = prevP1Heart - data.player1.heart;
                logCombatTelemetry('hit', '[DAMAGE HIT]', `💥 P1 took ${dmg} DMG! (Hearts: ${data.player1.heart}/10)`);
            }
            if (prevP2Heart !== null && data.player2.heart < prevP2Heart) {
                p2HitFlashUntil = Date.now() + 350;
                if (!document.hidden && window.AudioEngine) window.AudioEngine.playDamageHit(false);
                const dmg = prevP2Heart - data.player2.heart;
                const target = targetIsBot ? 'Bot' : 'P2';
                logCombatTelemetry('hit', '[DAMAGE HIT]', `💥 ${target} took ${dmg} DMG! (Hearts: ${data.player2.heart}/10)`);
            }
        }
        prevP1Heart = data.player1.heart;
        prevP2Heart = data.player2.heart;

        // 2. Sword Swing & Dynamic Clash Fallback
        const p1Slashing = data.player1.has_sword && data.player1.attack_state === 2;
        const p2Slashing = data.player2.has_sword && data.player2.attack_state === 2;

        if (data.clash) {
            if (!eventsHandled.has('clash')) {
                if (!document.hidden && window.AudioEngine) window.AudioEngine.playSwordClash();
                spawnCombatSparks((data.player1.x + data.player2.x) / 2, 470, '#fef08a', 12);
                if (!prevClash) {
                    logCombatTelemetry('clash', '[SWORD CLASH]', '⚔️ Mid-air Sword Clash! Kinetic sparks erupted!');
                }
            }
        } else {
            if (p1Slashing && !prevP1Attacking && !eventsHandled.has('clash') && !document.hidden && window.AudioEngine) window.AudioEngine.playSwordSwing();
            if (p2Slashing && !prevP2Attacking && !eventsHandled.has('clash') && !document.hidden && window.AudioEngine) window.AudioEngine.playSwordSwing();
        }
        prevClash = !!data.clash;
        prevP1Attacking = p1Slashing;
        prevP2Attacking = p2Slashing;

        // 3. Shield Raise Banner
        if (data.player1.is_blocking && !prevP1Blocking) {
            logCombatTelemetry('shield', '[DEFENSE]', '🛡️ P1 raised shield barrier');
        }
        if (data.player2.is_blocking && !prevP2Blocking) {
            const target = targetIsBot ? 'Bot' : 'P2';
            logCombatTelemetry('shield', '[DEFENSE]', `🛡️ ${target} raised shield barrier`);
        }
        prevP1Blocking = !!data.player1.is_blocking;
        prevP2Blocking = !!data.player2.is_blocking;

        // 4. Dodge / Crouch Fallback
        if (!eventsHandled.has('evasion')) {
            if (data.player1.is_crouching && !prevP1Crouching) {
                if (!document.hidden && window.AudioEngine) window.AudioEngine.playDodge();
                if (Date.now() - _lastEvasionLogAt.p1 > 2400) {
                    _lastEvasionLogAt.p1 = Date.now();
                    logCombatTelemetry('dodge', '[DODGE]', 'P1 crouched');
                }
            }
            if (data.player2.is_crouching && !prevP2Crouching) {
                if (!document.hidden && window.AudioEngine) window.AudioEngine.playDodge();
                const target = targetIsBot ? 'Bot' : 'P2';
                if (Date.now() - _lastEvasionLogAt.p2 > 2400) {
                    _lastEvasionLogAt.p2 = Date.now();
                    logCombatTelemetry('dodge', '[DODGE]', `${target} crouched`);
                }
            }
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
                    const ownerLabel = s.owner === 1 ? 'P1' : (targetIsBot ? 'Bot' : 'P2');
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

    ctx.save();
    if (arenaShake > 0.4) {
        const sx = (Math.random() - 0.5) * arenaShake * 2;
        const sy = (Math.random() - 0.5) * arenaShake * 1.4;
        ctx.translate(sx, sy);
        arenaShake *= 0.82;
    } else {
        arenaShake = 0;
    }

    drawArenaBackdrop();

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

        // Matha (Head) with brief arcade hit-flash
        const isFlashed = (playerKey === 'p1' && Date.now() < p1HitFlashUntil) || (playerKey === 'p2' && Date.now() < p2HitFlashUntil);
        const renderColor = isFlashed ? '#ffffff' : color;
        ctx.fillStyle = renderColor;
        ctx.beginPath();
        ctx.arc(x, y + crouchY, 20, 0, Math.PI * 2);
        ctx.fill();

        // 🎯 Floating "▼ YOU" Marker above Player 1 (Never lose track of your fighter!)
        if (playerKey === 'p1') {
            ctx.save();
            const p1Theme = getPlayerProfileTheme();
            const floatBob = Math.sin(Date.now() / 200) * 2.5;
            const markerY = y + crouchY - 32 + floatBob;
            const tagText = `${p1Theme.icon} YOU`;
            ctx.font = "800 10px 'Space Grotesk', -apple-system, sans-serif";
            const textWidth = ctx.measureText(tagText).width;
            const pillW = textWidth + 12;
            const pillH = 16;
            const pillX = x - (pillW / 2);
            const pillY = markerY - pillH - 4;

            // Pill container with custom avatar theme glow
            ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
            ctx.strokeStyle = p1Theme.color;
            ctx.lineWidth = 1.4;
            ctx.shadowColor = p1Theme.color;
            ctx.shadowBlur = 8;
            
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(pillX, pillY, pillW, pillH, 4);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(pillX, pillY, pillW, pillH);
                ctx.strokeRect(pillX, pillY, pillW, pillH);
            }

            // Text with icon in theme color
            ctx.fillStyle = p1Theme.color;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(tagText, x, pillY + (pillH / 2) + 0.5);

            // Downward pointing arrow ▼
            ctx.fillStyle = p1Theme.color;
            ctx.beginPath();
            ctx.moveTo(x - 4, markerY - 3);
            ctx.lineTo(x + 4, markerY - 3);
            ctx.lineTo(x, markerY + 2);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
        
        // Baki shorir (Body)
        ctx.strokeStyle = renderColor;
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

    // Helper to draw a glowing retro arcade heart on canvas
    function draw_heart(ctx, hx, hy, size) {
        ctx.save();
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "rgba(239, 68, 68, 0.7)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        const topY = hy - size * 0.35;
        ctx.moveTo(hx, topY + size * 0.3);
        ctx.bezierCurveTo(hx, topY, hx - size * 0.55, topY, hx - size * 0.55, topY + size * 0.35);
        ctx.bezierCurveTo(hx - size * 0.55, topY + size * 0.65, hx, topY + size * 0.85, hx, topY + size);
        ctx.bezierCurveTo(hx, topY + size * 0.85, hx + size * 0.55, topY + size * 0.65, hx + size * 0.55, topY + size * 0.35);
        ctx.bezierCurveTo(hx + size * 0.55, topY, hx, topY, hx, topY + size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Helper to get Bot Profile Theme from lobby config
    function getBotProfileTheme() {
        const diff = (typeof BOT_DIFFICULTY !== 'undefined' && BOT_DIFFICULTY ? BOT_DIFFICULTY.toLowerCase() : 'easy');
        const themes = {
            'rusher': { icon: '⚡', color: '#10b981', name: 'Byte Rusher' },
            'easy': { icon: '⚡', color: '#10b981', name: 'Byte Rusher' },
            'turtle': { icon: '🛡️', color: '#0ea5e9', name: 'Iron Turtle' },
            'weaver': { icon: '🌊', color: '#a855f7', name: 'Wave Weaver' },
            'duelist': { icon: '🗡️', color: '#f43f5e', name: 'Shadow Duelist' },
            'berserker': { icon: '🔥', color: '#f97316', name: 'Berserker Ronin' },
            'apex': { icon: '👑', color: '#f59e0b', name: 'Apex Sovereign' },
            'hard': { icon: '👑', color: '#f59e0b', name: 'Apex Sovereign' },
            'master': { icon: '👑', color: '#eab308', name: 'SACE Master' },
            'sace': { icon: '👑', color: '#eab308', name: 'SACE Master' },
            'dummy': { icon: '🥋', color: '#14b8a6', name: 'Practice Dojo' }
        };
        return themes[diff] || { icon: '🤖', color: '#38bdf8', name: 'Arena Bot' };
    }

    // Fixed HUD Arcade Hearts & Energy Bar with Fighter Profile Avatar Badges
    function draw_health_bar(player, label, align) {
        const maxHealth = player.max_health || 10;
        const health = Math.max(0, Math.min(maxHealth, player.heart || 0));
        const heartSize = 13;
        const heartGap = 6;
        const totalHeartsWidth = maxHealth * (heartSize + heartGap) - heartGap;
        
        const isLeft = (align === "left");
        const isBot = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM);
        const theme = isLeft ? getPlayerProfileTheme() : (isBot ? getBotProfileTheme() : { icon: '👤', color: '#ec4899', name: 'Player 2' });
        
        // Check damage hit flash & Low-HP Danger Alarm (HP <= 3)
        const isFlashing = isLeft ? (Date.now() < p1HitFlashUntil) : (Date.now() < p2HitFlashUntil);
        const isLowHp = (health > 0 && health <= 3);
        const lowHpPulse = isLowHp ? (Math.sin(Date.now() / 150) * 0.5 + 0.5) : 0;
        
        let borderColor = theme.color;
        let shadowColor = theme.color;
        let shadowBlur = 8;
        let lineWidth = 1.8;
        let badgeBg = "rgba(15, 23, 42, 0.92)";

        if (isFlashing) {
            borderColor = "#ef4444";
            shadowColor = "#ef4444";
            shadowBlur = 18;
            lineWidth = 2.5;
            badgeBg = "rgba(239, 68, 68, 0.32)";
        } else if (isLowHp) {
            borderColor = `rgba(239, 68, 68, ${0.6 + 0.4 * lowHpPulse})`;
            shadowColor = "#ef4444";
            shadowBlur = 12 + 8 * lowHpPulse;
            lineWidth = 2 + 1 * lowHpPulse;
            badgeBg = `rgba(239, 68, 68, ${0.14 + 0.18 * lowHpPulse})`;
        }
        
        // Badge dimensions
        const badgeSize = 36;
        const badgeY = 14;
        const badgeX = isLeft ? 14 : (canvas.width - 14 - badgeSize);

        // Draw Fighter Profile Avatar Badge (Just like in the Lobby!)
        ctx.save();
        ctx.fillStyle = badgeBg;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, 8);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(badgeX, badgeY, badgeSize, badgeSize);
            ctx.strokeRect(badgeX, badgeY, badgeSize, badgeSize);
        }
        
        ctx.shadowBlur = 0;
        ctx.font = "18px 'Segoe UI Emoji', -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(theme.icon, badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1);
        ctx.restore();

        // HUD Bounds adjacent to Avatar Badge
        const hudLeft = isLeft ? (badgeX + badgeSize + 8) : (badgeX - 8 - totalHeartsWidth);
        const hudRight = hudLeft + totalHeartsWidth;

        ctx.save();
        ctx.textBaseline = "alphabetic";

        if (!isLeft) {
            // Player 2 / Bot Text (Right Aligned)
            ctx.textAlign = "right";
            const healthStr = `${health} ❤️`;
            ctx.font = "700 13px 'Space Grotesk', 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#f87171";
            ctx.fillText(healthStr, hudRight, 22);
            const healthWidth = ctx.measureText(healthStr).width;

            ctx.font = "800 15px 'Space Grotesk', 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = theme.color;
            ctx.fillText(theme.name, hudRight - healthWidth - 8, 22);
        } else {
            // Player 1 Text (Left Aligned)
            ctx.textAlign = "left";
            ctx.font = "800 15px 'Space Grotesk', 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = theme.color;
            ctx.fillText(theme.name, hudLeft, 22);
            const labelWidth = ctx.measureText(theme.name).width;

            ctx.font = "700 13px 'Space Grotesk', 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#f87171";
            ctx.fillText(` ${health} ❤️`, hudLeft + labelWidth + 4, 22);
        }

        // Draw Retro Arcade Hearts
        for (let i = 0; i < maxHealth; i++) {
            const heartX = hudLeft + i * (heartSize + heartGap) + heartSize / 2;
            const heartY = 32;

            if (i < health) {
                draw_heart(ctx, heartX, heartY, heartSize);
            }
        }

        // Fixed HUD Energy / Stamina Bar (y = 47, height = 5, cyan glow)
        const maxEnergy = player.max_energy || 100;
        const energy = Math.max(0, Math.min(maxEnergy, player.energy !== undefined ? player.energy : 100));
        const energyRatio = energy / maxEnergy;
        
        ctx.fillStyle = "#16171d";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(hudLeft, 47, totalHeartsWidth, 5, 2.5); ctx.fill(); }
        else { ctx.fillRect(hudLeft, 47, totalHeartsWidth, 5); }
        
        if (energyRatio > 0) {
            ctx.fillStyle = energyRatio > 0.35 ? "#38bdf8" : "#f59e0b";
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(hudLeft, 47, totalHeartsWidth * energyRatio, 5, 2.5); ctx.fill(); }
            else { ctx.fillRect(hudLeft, 47, totalHeartsWidth * energyRatio, 5); }
        }

        // Energy text badge
        ctx.font = "600 10px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = "#7dd3fc";
        const energyStr = `${Math.round(energy)}⚡`;
        if (isLeft) {
            ctx.textAlign = "left";
            ctx.fillText(energyStr, hudLeft + totalHeartsWidth + 6, 52);
        } else {
            ctx.textAlign = "right";
            ctx.fillText(energyStr, hudLeft - 6, 52);
        }
        ctx.restore();
    }
    const p2Label = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM)
        ? ("BOT" + (typeof BOT_DIFFICULTY !== 'undefined' && BOT_DIFFICULTY ? " (" + BOT_DIFFICULTY.toUpperCase() + ")" : ""))
        : "P2";
    draw_health_bar(data.player1, "P1", "left");
    draw_health_bar(data.player2, p2Label, "right");

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
    // Render active kinetic combat sparks & floating damage popups on top
    draw_combat_sparks();
    drawCombatPopups();
    ctx.restore();

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
        const combatDuration = Math.max(1, Math.round((Date.now() - matchStartTime) / 1000));

        trackGameEvent('game_match_end', {
            result: iWon ? 'victory' : (isDraw ? 'draw' : 'defeat'),
            duration_seconds: combatDuration,
            commands_run: matchCodeRunCount,
            mode: (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'bot' : 'pvp',
            difficulty: (typeof BOT_DIFFICULTY !== 'undefined' ? BOT_DIFFICULTY : 'pvp')
        });

        if (window.AudioEngine) {
            window.AudioEngine.playGameOver(iWon);
        }
        logCombatTelemetry('gameover', '[VICTORY]', `🏆 ${winnerText}`);

        // 🏆 Progressive Arcade Unlock Record on Victory
        if (iWon && typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM && typeof BOT_DIFFICULTY !== 'undefined') {
            if (BOT_DIFFICULTY === 'master' || BOT_DIFFICULTY === 'sace') {
                if (typeof showToast === 'function') {
                    showToast({
                        title: "Grandmaster Victor! 👑",
                        message: "Incredible! You defeated the SACE Adaptive Master Bot!",
                        type: "success",
                        duration: 5000
                    });
                }
            } else if (BOT_DIFFICULTY !== 'dummy') {
                const stageMap = { 'rusher': 1, 'easy': 1, 'turtle': 2, 'weaver': 3, 'duelist': 4, 'hard': 5, 'berserker': 5, 'apex': 6 };
                const currentStage = stageMap[BOT_DIFFICULTY];
                if (currentStage && currentStage < 6) {
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

            // Fallback victory dialog trigger if server receipt lags
            setTimeout(() => {
                const dialog = document.getElementById('victory_challenge_dialog');
                if (dialog && !dialog.open && !latestVictoryReceipt) {
                    const oppName = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM && typeof BOT_DIFFICULTY !== 'undefined')
                        ? ((typeof STAGE_TITLES !== 'undefined' && STAGE_TITLES[BOT_DIFFICULTY]) || 'Opponent')
                        : 'Player 2';
                    const hpLeft = (MY_PLAYER_ID === 1 && data.player1) ? data.player1.heart : ((MY_PLAYER_ID === 2 && data.player2) ? data.player2.heart : 10);
                    const combatDur = Math.max(1, Math.round((Date.now() - matchStartTime) / 1000));
                    showVictoryDialog({
                        opponent_title: oppName,
                        bot_difficulty: typeof BOT_DIFFICULTY !== 'undefined' ? BOT_DIFFICULTY : 'easy',
                        combat_duration: combatDur,
                        hp_remaining: hpLeft,
                        receipt_token: 'LOCAL-WIN'
                    });
                }
            }, 1200);
        } else if (!iWon) {
            // 💀 Defeat Dialog & WhatsApp Challenge on Match End (Guaranteed to open)
            const oppName = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM && typeof BOT_DIFFICULTY !== 'undefined')
                ? ((typeof STAGE_TITLES !== 'undefined' && STAGE_TITLES[BOT_DIFFICULTY]) || (BOT_DIFFICULTY.toUpperCase() + ' Bot'))
                : 'Player 2';
            const botHp = (MY_PLAYER_ID === 1 && data.player2) ? data.player2.heart : ((MY_PLAYER_ID === 2 && data.player1) ? data.player1.heart : 5);
            let codeLines = 1;
            const cm = window.codeMirrorInstance || window.editor;
            if (cm) {
                const val = cm.getValue().trim();
                codeLines = val ? val.split('\n').filter(l => l.trim().length > 0).length : 1;
            }
            const combatDur = Math.max(1, Math.round((Date.now() - matchStartTime) / 1000));
            showDefeatDialog(oppName, combatDur, botHp, codeLines);
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
    const pauseBotBtn = document.getElementById('pause_bot_btn');
    if (pauseBotBtn && typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) {
        pauseBotBtn.style.display = is_game_over ? 'none' : 'inline-flex';
    }
    const nextStageBtn = document.getElementById('next_stage_btn');
    if (nextStageBtn) {
        const p1Dead = (data.player1 && data.player1.heart <= 0);
        const p2Dead = (data.player2 && data.player2.heart <= 0);
        const wonMatch = (MY_PLAYER_ID === 1 && p2Dead) || (MY_PLAYER_ID === 2 && p1Dead);
        const nextBotMap = {
            'easy': { key: 'turtle', label: 'Stage 2: Iron Turtle' },
            'rusher': { key: 'turtle', label: 'Stage 2: Iron Turtle' },
            'turtle': { key: 'weaver', label: 'Stage 3: Wave Weaver' },
            'weaver': { key: 'duelist', label: 'Stage 4: Shadow Duelist' },
            'duelist': { key: 'berserker', label: 'Stage 5: Berserker Ronin' },
            'hard': { key: 'apex', label: 'Stage 6: Apex Sovereign' },
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
            if (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) {
                runBtn.disabled = false;
                runBtn.innerText = "▶️ Run & Resume";
            } else {
                runBtn.disabled = true;
                runBtn.innerText = "⏸️ Match Paused";
            }
        } else if (data.is_match_active && runBtn.disabled && (runBtn.innerText.includes("Paused") || runBtn.innerText.includes("Waiting"))) {
            // Self-healing: if server reports active match and unpaused, ensure button is ready
            runBtn.disabled = false;
            runBtn.innerText = "▶ RUN CODE (Ctrl+Enter)";
            const waitScreen = document.getElementById('wait_screen');
            if (waitScreen) waitScreen.style.display = 'none';
        }
    }
}

function run(customSnippet) {
    dismissDiagnostics();
    if (window.AudioEngine) window.AudioEngine.playClick();

    matchCodeRunCount++;
    trackGameEvent('game_code_run', {
        source: customSnippet ? 'tactical_card' : 'editor_run',
        mode: (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'bot' : 'pvp',
        difficulty: (typeof BOT_DIFFICULTY !== 'undefined' ? BOT_DIFFICULTY : 'pvp'),
        run_count: matchCodeRunCount
    });

    // Auto-dismiss battle start gate upon running combat code
    const gate = document.getElementById('battle_start_gate');
    if (gate && gate.style.display !== 'none' && typeof window.enterBattleGate === 'function') {
        window.enterBattleGate();
    }

    const runBtn = document.getElementById("run_btn");

    // Only block if match is actually over
    if (prevGameOver) {
        if (typeof showToast === 'function') {
            const hintMsg = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM)
                ? "The match is over. Click Rematch below to duel the bot again!"
                : "The match is over. Start a rematch or wait for Player 2.";
            showToast({
                title: "Match Ended",
                message: hintMsg,
                type: "warning"
            });
        }
        return;
    }

    // 1-Click Chip Combo Queuing: if button is busy, buffer the snippet!
    if (customSnippet && runBtn && (runBtn.disabled || runBtn.innerText === "Running...")) {
        window._snippetQueue = window._snippetQueue || [];
        if (window._snippetQueue.length < 5) {
            window._snippetQueue.push(customSnippet);
            logCombatTelemetry('code', '[QUEUED]', `Combo queued: ${customSnippet} (#${window._snippetQueue.length})`);
            if (typeof showToast === 'function') {
                showToast({
                    title: "⚡ Combo Queued",
                    message: `Queued: ${customSnippet} (#${window._snippetQueue.length})`,
                    type: "info",
                    duration: 1000
                });
            }
        }
        return;
    }

    // Prevent multi-click spam within 350ms for manual "Run" clicks
    const now = Date.now();
    if (!customSnippet && window._lastCodeRunTime && (now - window._lastCodeRunTime < 350)) {
        return;
    }
    if (!customSnippet) {
        window._lastCodeRunTime = now;
    }

    if (runBtn && runBtn.disabled) {
        if (typeof showToast === 'function') {
            showToast({
                title: "Execution in Progress",
                message: "Current combat routine is executing. Your next actions will queue when ready.",
                type: "info",
                duration: 1200
            });
        }
        return;
    }
    if (window.codeMirrorInstance && !customSnippet) {
        window.codeMirrorInstance.save();
    }
    const code = customSnippet || document.getElementById("ide").value;
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
    if (code.length > 2000) {
        if (typeof showToast === 'function') {
            showToast({
                title: "Code Limit Exceeded",
                message: `Code size (${code.length}/2000 characters) exceeds the maximum allowed limit. Please shorten your script.`,
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
    const sentDesc = customSnippet ? `Combo action: ${customSnippet}` : `Sent: ${shortCmd}`;
    logCombatTelemetry('code', `[P${MY_PLAYER_ID} CODE]`, sentDesc);

    // Safety timeout: Auto-recover from "Running..." if network hangs
    clearTimeout(window._runCodeSafetyTimeout);
    window._runCodeSafetyTimeout = setTimeout(() => {
        if (runBtn && runBtn.innerText === "Running...") {
            runBtn.disabled = false;
            runBtn.innerText = "▶ RUN CODE (Ctrl+Enter)";
            runBtn.style.opacity = "1";
        }
    }, 2500);
}

window.executeSnippetDirect = function(snippet) {
    if (!snippet) return;
    if (window.codeMirrorInstance) {
        window.codeMirrorInstance.setValue(snippet);
        window.codeMirrorInstance.save();
    } else {
        const ide = document.getElementById("ide");
        if (ide) ide.value = snippet;
    }
    run(snippet);
};

function request_restart() {
    closeVictoryDialog();
    prevGameOver = false;
    matchStartTime = Date.now();
    matchCodeRunCount = 0;
    matchTrackedStarted = false;
    window.gateDismissed = true;
    trackGameEvent('game_rematch_requested', {
        mode: (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'bot' : 'pvp',
        difficulty: (typeof BOT_DIFFICULTY !== 'undefined' ? BOT_DIFFICULTY : 'pvp')
    });
    socket.emit('restart_game', {
        "room_id": typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
    });
    if (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) {
        socket.emit('start_match');
    }
}

socket.on('game_restarted', () => {
    console.log("Game restarted!");
    closeVictoryDialog();
    prevGameOver = false;
    matchStartTime = Date.now();
    matchCodeRunCount = 0;
    matchTrackedStarted = false;
    try {
        const roomKey = typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default';
        sessionStorage.setItem('sb_gate_entered_' + roomKey, 'true');
    } catch(e) {}
    window._snippetQueue = [];
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
        runBtn.innerText = "▶ RUN CODE (Ctrl+Enter)";
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
    if (window.codeMirrorInstance && window._prevErrorLine !== undefined) {
        window.codeMirrorInstance.removeLineClass(window._prevErrorLine, 'background', 'cm-line-error');
        window._prevErrorLine = undefined;
    }
}

socket.on('code_error', (data) => {
    clearTimeout(window._runCodeSafetyTimeout);
    const runBtn = document.getElementById("run_btn");
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "▶ RUN CODE (Ctrl+Enter)";
        runBtn.style.opacity = "1";
    }
    if (data && data.error) {
        showDiagnostics(data.error);

        // Remove previous line highlight if any
        if (window.codeMirrorInstance && window._prevErrorLine !== undefined) {
            window.codeMirrorInstance.removeLineClass(window._prevErrorLine, 'background', 'cm-line-error');
            window._prevErrorLine = undefined;
        }

        const rawLines = String(data.error).split('\n').map(l => l.trim()).filter(Boolean);
        const errLine = rawLines.slice().reverse().find(l => 
            l.includes('Error:') || l.includes('Exception:') || l.includes('Error') || l.startsWith('Security:')
        ) || rawLines[rawLines.length - 1] || 'Syntax/Runtime Error';
        
        const lineMatch = data.error.match(/line (\d+)/i);
        const lineNumStr = lineMatch ? ` (Line ${lineMatch[1]})` : '';
        const cleanErr = (errLine.length > 45 ? errLine.slice(0, 42) + '...' : errLine);
        const displayErr = cleanErr.includes('Line') || !lineNumStr ? cleanErr : `${cleanErr}${lineNumStr}`;
        
        logCombatTelemetry('error', '[COMPILE ERR]', displayErr);

        if (window.codeMirrorInstance && lineMatch) {
            const lineIdx = parseInt(lineMatch[1], 10) - 1;
            if (lineIdx >= 0 && lineIdx < window.codeMirrorInstance.lineCount()) {
                window.codeMirrorInstance.addLineClass(lineIdx, 'background', 'cm-line-error');
                window._prevErrorLine = lineIdx;
            }
        }
    }
});

socket.on('code_success', (data) => {
    dismissDiagnostics();
    clearTimeout(window._runCodeSafetyTimeout);

    if (data && data.no_action) {
        logCombatTelemetry('warn', '[NO ACTION]', data.reason || '0 actions queued (check distance/conditions!)');
    } else {
        logCombatTelemetry('success', '[ACCEPTED]', 'Combat instructions verified & running');
    }

    const runBtn = document.getElementById("run_btn");
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = (data && data.no_action) ? "Ready" : "✓ Executed";
        runBtn.style.opacity = "1";
        setTimeout(() => {
            if (runBtn && !runBtn.disabled && (runBtn.innerText === "✓ Executed" || runBtn.innerText === "Ready")) {
                runBtn.innerText = "▶ RUN CODE (Ctrl+Enter)";
            }
        }, 1200);
    }

    // Drain queued snippets if player is idle / no pending actions
    if (window._snippetQueue && window._snippetQueue.length > 0) {
        if (!window._prevActionsCount || window._prevActionsCount === 0 || (data && data.no_action)) {
            const nextSnippet = window._snippetQueue.shift();
            logCombatTelemetry('code', '[COMBO POP]', `Executing queued combo: ${nextSnippet} (${window._snippetQueue.length} remaining)`);
            setTimeout(() => {
                if (typeof window.executeSnippetDirect === 'function') {
                    window.executeSnippetDirect(nextSnippet);
                }
            }, 120);
        }
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
        if (typeof window.AudioEngine.playEmergencyPanic === 'function') {
            window.AudioEngine.playEmergencyPanic(action);
        } else if (action === 'shield') {
            window.AudioEngine.playShieldBlock();
        } else if (action === 'dodge') {
            window.AudioEngine.playDodge();
        }
    }
    trackGameEvent('game_panic_trigger', {
        action: action,
        mode: (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? 'bot' : 'pvp',
        difficulty: (typeof BOT_DIFFICULTY !== 'undefined' ? BOT_DIFFICULTY : 'pvp')
    });
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

// ⚡ Global Master Shortcut: Ctrl+Enter / Cmd+Enter to Run Code from ANYWHERE in the Arena
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof run === 'function') {
            run();
        } else {
            const runBtn = document.getElementById('run_btn');
            if (runBtn) runBtn.click();
        }
    }
}, true); // Capture phase: intercepts Ctrl+Enter reliably whether inside CodeMirror, inputs, or canvas

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
    } else if (e.altKey && (e.key === '1' || e.code === 'Digit1')) {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_1', 'run(3)', 500);
        return;
    } else if (e.altKey && (e.key === '2' || e.code === 'Digit2')) {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_2', 'dash(3)', 600);
        return;
    } else if (e.altKey && (e.key === '3' || e.code === 'Digit3')) {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_3', 'attack()', 400);
        return;
    } else if (e.altKey && (e.key === '4' || e.code === 'Digit4')) {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_4', 'heavy_attack()', 800);
        return;
    } else if (e.altKey && (e.key === '5' || e.code === 'Digit5')) {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_5', 'block()', 700);
        return;
    } else if (e.altKey && (e.key === '6' || e.code === 'Digit6')) {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_6', 'sin_wave()', 1800);
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

    // ⚡ Hotkeys 1-6: Tactical Action Dock Quick Trigger (Outside Editor)
    if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_1', 'run(3)', 500);
        return;
    } else if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_2', 'dash(3)', 600);
        return;
    } else if (e.key === '3' || e.code === 'Digit3') {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_3', 'attack()', 400);
        return;
    } else if (e.key === '4' || e.code === 'Digit4') {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_4', 'heavy_attack()', 800);
        return;
    } else if (e.key === '5' || e.code === 'Digit5') {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_5', 'block()', 700);
        return;
    } else if (e.key === '6' || e.code === 'Digit6') {
        e.preventDefault();
        if (typeof window.triggerTacticalAction === 'function') window.triggerTacticalAction('dock_btn_6', 'sin_wave()', 1800);
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

// --- ⏸️ OPTION 3: BOT DUEL PAUSE / RESUME HANDLERS (Ctrl + P) ---
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        if (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) {
            e.preventDefault(); // Suppress browser print dialog
            toggle_bot_pause();
        }
    }
});

// Enable pause button visibility in bot rooms on load
if (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) {
    const pb = document.getElementById('pause_bot_btn');
    if (pb) pb.style.display = 'inline-flex';
}

// Allow clicking label text underneath any Quick Move circle button
document.querySelectorAll('.dock-action-wrapper').forEach(wrapper => {
    wrapper.addEventListener('click', (e) => {
        if (e.target.closest('button.dock-action-circle')) return;
        const btn = wrapper.querySelector('button.dock-action-circle');
        if (btn && !btn.disabled) btn.click();
    });
});
