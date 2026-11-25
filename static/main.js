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

function updateArcadeLadderUI() {
    const unlocked = getUnlockedStage();
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
