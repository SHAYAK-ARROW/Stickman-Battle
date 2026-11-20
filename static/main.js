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
    try {
        const val = localStorage.getItem('stickman_arcade_unlocked');
        return val ? parseInt(val, 10) : 1;
    } catch(e) {
        return 1;
    }
}

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
            showToast({
                title: "Stage Locked! 🔒",
                message: `Defeat Stage ${stage - 1} to unlock this challenger!`,
                type: "warning"
            });
            return;
        }
    }
    const valid = ['easy', 'hard', 'dummy', 'beginner', 'rusher', 'turtle', 'weaver', 'duelist', 'berserker', 'apex', 'master', 'sace'];
    const diff = valid.includes(difficulty) ? difficulty : 'easy';
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

document.addEventListener('DOMContentLoaded', () => {
    updateArcadeLadderUI();
    initSaceAvatarSelection();
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
