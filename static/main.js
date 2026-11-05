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
    const valid = ['easy', 'hard', 'dummy', 'rusher', 'turtle', 'weaver', 'duelist', 'berserker', 'apex'];
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

document.addEventListener('DOMContentLoaded', updateArcadeLadderUI);

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
