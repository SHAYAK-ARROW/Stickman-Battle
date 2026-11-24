/**
 * Stickman Battle — Fighter Profile, Identity & Modal System
 * v2.3 Lightweight LocalStorage Identity & Tactical Hub
 * Made by Arrows Development Hub
 */
(function() {
    'use strict';

    const ADJECTIVES = [
        'Shadow', 'Cyber', 'Iron', 'Blaze', 'Swift', 'Frost',
        'Thunder', 'Ghost', 'Neon', 'Viper', 'Titan', 'Zen',
        'Arcane', 'Crimson', 'Storm', 'Echo', 'Phantom', 'Solar'
    ];

    const NOUNS = [
        'Coder', 'Ninja', 'Fighter', 'Striker', 'Blade', 'Warrior',
        'Hacker', 'Ronin', 'Samurai', 'Duelist', 'Knight', 'Wizard'
    ];

    const AVATARS = ['🥋', '🥷', '⚔️', '⚡', '🧙'];

    const STAGE_RANKS = {
        1: { rank: 'Novice Coder', badge: 'LVL 1', color: '#10b981', stageName: 'Beginner' },
        2: { rank: 'Byte Striker', badge: 'LVL 2', color: '#38bdf8', stageName: 'Byte Rusher' },
        3: { rank: 'Iron Guardian', badge: 'LVL 3', color: '#6366f1', stageName: 'Iron Turtle' },
        4: { rank: 'Wave Sorcerer', badge: 'LVL 4', color: '#8b5cf6', stageName: 'Wave Weaver' },
        5: { rank: 'Shadow Master', badge: 'LVL 5', color: '#ec4899', stageName: 'Shadow Duelist' },
        6: { rank: 'Apex Grandmaster', badge: 'MAX', color: '#f59e0b', stageName: 'Apex Sovereign' }
    };

    function generateRandomName() {
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        const num = Math.floor(100 + Math.random() * 900);
        return `${adj}${noun}_${num}`;
    }

    function getPlayerName() {
        try {
            let name = localStorage.getItem('sb_player_name');
            if (!name || typeof name !== 'string' || name.trim() === '') {
                name = generateRandomName();
                localStorage.setItem('sb_player_name', name);
            }
            return name;
        } catch (e) {
            return 'Fighter_' + Math.floor(100 + Math.random() * 900);
        }
    }

    function setPlayerName(newName) {
        if (!newName || typeof newName !== 'string') return false;
        const clean = newName.trim().slice(0, 20);
        if (clean) {
            try {
                localStorage.setItem('sb_player_name', clean);
            } catch (e) {
                console.warn('LocalStorage unavailable for profile name:', e);
            }
            updateProfileUI();
            return true;
        }
        return false;
    }

    function getPlayerAvatar() {
        try {
            let av = localStorage.getItem('sb_player_avatar');
            if (!av || !AVATARS.includes(av)) {
                av = '🥋';
            }
            return av;
        } catch (e) {
            return '🥋';
        }
    }

    function setPlayerAvatar(av) {
        if (!AVATARS.includes(av)) return;
        try {
            localStorage.setItem('sb_player_avatar', av);
        } catch (e) {
            console.warn('LocalStorage unavailable for profile avatar:', e);
        }
        updateProfileUI();
    }

    function getArcadeProgress() {
        try {
            const raw = parseInt(localStorage.getItem('sb_arcade_unlocked'), 10);
            return (isNaN(raw) || raw < 1) ? 1 : Math.min(raw, 6);
        } catch (e) {
            return 1;
        }
    }

    function getRankInfo() {
        const progress = getArcadeProgress();
        return STAGE_RANKS[progress] || STAGE_RANKS[1];
    }

    function updateProfileUI() {
        const name = getPlayerName();
        const avatar = getPlayerAvatar();
        const rankInfo = getRankInfo();

        // Update all display names
        document.querySelectorAll('.profile-display-name').forEach(el => {
            el.textContent = name;
        });

        // Update all avatars
        document.querySelectorAll('.profile-avatar-icon').forEach(el => {
            el.textContent = avatar;
        });

        // Update all rank badges
        document.querySelectorAll('.profile-rank-badge').forEach(el => {
            el.textContent = rankInfo.badge;
            el.title = `${rankInfo.rank} (${rankInfo.stageName})`;
            el.style.borderColor = rankInfo.color;
            el.style.color = rankInfo.color;
        });

        // Update inputs if any
        document.querySelectorAll('.profile-name-input').forEach(input => {
            if (input.value !== name) input.value = name;
        });
    }

    // Ensure the Modal DOM structure exists
    function ensureModalDOM() {
        let modal = document.getElementById('profile_modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'profile_modal';
        modal.className = 'profile-modal-overlay';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="profile-modal-card" onclick="event.stopPropagation()">
                <div class="profile-modal-header">
                    <div class="profile-modal-title">
                        <span class="profile-modal-header-icon">🥋</span>
                        <div>
                            <h3>Fighter Identity &amp; Combos</h3>
                            <p class="profile-modal-sub">Customise your coder handle, track rank, and view hotkeys</p>
                        </div>
                    </div>
                    <button type="button" class="profile-modal-close" onclick="closeProfileModal()" aria-label="Close Profile">✕</button>
                </div>

                <div class="profile-modal-body">
                    <!-- Avatar Selection Row -->
                    <div class="profile-section">
                        <label class="profile-section-label">CHOOSE FIGHTER AVATAR</label>
                        <div class="profile-avatar-selector" id="profile_avatar_selector">
                            ${AVATARS.map(av => `
                                <button type="button" class="profile-avatar-choice ${av === getPlayerAvatar() ? 'is-active' : ''}" onclick="window.PlayerProfile.setAvatar('${av}')" title="Pick ${av}">
                                    ${av}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Fighter Name Customization -->
                    <div class="profile-section">
                        <label class="profile-section-label" for="profile_name_field">FIGHTER HANDLE (MAX 20 CHARS)</label>
                        <div class="profile-input-group">
                            <span class="profile-input-icon">👤</span>
                            <input type="text" id="profile_name_field" class="profile-text-input" maxlength="20" placeholder="Enter your fighter handle..." value="${getPlayerName()}">
                            <button type="button" class="button button-primary profile-save-btn" onclick="window.PlayerProfile.saveNameFromModal()">Save</button>
                            <button type="button" class="button button-secondary profile-random-btn" onclick="window.PlayerProfile.rollRandomName()" title="Roll random martial-arts handle">🎲 Roll</button>
                        </div>
                        <div id="profile_save_feedback" class="profile-feedback-msg" style="display: none;"></div>
                    </div>

                    <!-- Arcade Progression Ladder & Rank -->
                    <div class="profile-section">
                        <label class="profile-section-label">ARCADE LADDER PROGRESSION</label>
                        <div class="profile-ladder-card" id="profile_ladder_card">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Signature Combos & Hotkeys Cheat Sheet -->
                    <div class="profile-section">
                        <label class="profile-section-label">TACTICAL COMBOS &amp; PANIC HOTKEYS</label>
                        <div class="profile-combos-grid">
                            <div class="profile-combo-item">
                                <span class="combo-key">Alt + S</span>
                                <span class="combo-desc">🛡️ Emergency Panic Shield (Instant Block)</span>
                            </div>
                            <div class="profile-combo-item">
                                <span class="combo-key">Alt + D</span>
                                <span class="combo-desc">💨 Emergency Panic Dodge (Evasive Jump)</span>
                            </div>
                            <div class="profile-combo-item">
                                <span class="combo-key">sin_wave()</span>
                                <span class="combo-desc">🌊 Trig Sine Wave Ranged Attack</span>
                            </div>
                            <div class="profile-combo-item">
                                <span class="combo-key">sec_barrier()</span>
                                <span class="combo-desc">🛡️ Trig Secant Energy Barrier</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="profile-modal-footer">
                    <span class="profile-footer-tip">💡 Progress automatically syncs in browser localStorage</span>
                    <button type="button" class="button button-primary" onclick="closeProfileModal()">Done</button>
                </div>
            </div>
        `;

        modal.onclick = function(e) {
            if (e.target === modal) {
                closeProfileModal();
            }
        };

        document.body.appendChild(modal);
        return modal;
    }

    function renderLadderCard() {
        const ladderCard = document.getElementById('profile_ladder_card');
        if (!ladderCard) return;

        const currentStage = getArcadeProgress();
        const rankInfo = getRankInfo();

        ladderCard.innerHTML = `
            <div class="profile-rank-header">
                <div class="profile-rank-info">
                    <span class="profile-rank-title" style="color: ${rankInfo.color};">${rankInfo.rank}</span>
                    <span class="profile-stage-status">Stage ${currentStage} / 6 Conquered</span>
                </div>
                <span class="profile-level-badge" style="border-color: ${rankInfo.color}; color: ${rankInfo.color};">
                    ${rankInfo.badge}
                </span>
            </div>
            <div class="profile-stages-track">
                ${[1, 2, 3, 4, 5, 6].map(stg => {
                    const stgInfo = STAGE_RANKS[stg];
                    const isUnlocked = stg <= currentStage;
                    const isCurrent = stg === currentStage;
                    return `
                        <div class="profile-stage-dot ${isUnlocked ? 'is-unlocked' : 'is-locked'} ${isCurrent ? 'is-current' : ''}" title="Stage ${stg}: ${stgInfo.stageName} (${isUnlocked ? 'Unlocked' : 'Locked'})">
                            <span class="dot-num">${stg}</span>
                            <span class="dot-name">${stgInfo.stageName}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function openProfileModal(e) {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        const modal = ensureModalDOM();
        const input = document.getElementById('profile_name_field');
        if (input) {
            input.value = getPlayerName();
        }

        // Highlight active avatar
        const curAv = getPlayerAvatar();
        document.querySelectorAll('.profile-avatar-choice').forEach(btn => {
            btn.classList.toggle('is-active', btn.textContent.trim() === curAv);
        });

        renderLadderCard();
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('is-visible');
            if (input) input.focus();
        }, 10);
    }

    function closeProfileModal() {
        const modal = document.getElementById('profile_modal');
        if (!modal) return;
        modal.classList.remove('is-visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 200);
    }

    function saveNameFromModal() {
        const input = document.getElementById('profile_name_field');
        const feedback = document.getElementById('profile_save_feedback');
        if (!input) return;

        const val = input.value;
        if (setPlayerName(val)) {
            if (feedback) {
                feedback.textContent = '✓ Fighter handle saved!';
                feedback.className = 'profile-feedback-msg is-success';
                feedback.style.display = 'block';
                setTimeout(() => { feedback.style.display = 'none'; }, 2500);
            }
        } else {
            if (feedback) {
                feedback.textContent = 'Please enter a valid handle (1-20 characters).';
                feedback.className = 'profile-feedback-msg is-error';
                feedback.style.display = 'block';
                setTimeout(() => { feedback.style.display = 'none'; }, 2500);
            }
        }
    }

    function rollRandomName() {
        const newName = generateRandomName();
        const input = document.getElementById('profile_name_field');
        if (input) {
            input.value = newName;
        }
        setPlayerName(newName);
        const feedback = document.getElementById('profile_save_feedback');
        if (feedback) {
            feedback.textContent = `🎲 Rolled: ${newName}`;
            feedback.className = 'profile-feedback-msg is-success';
            feedback.style.display = 'block';
            setTimeout(() => { feedback.style.display = 'none'; }, 2000);
        }
    }

    // Global keyboard listener for Esc key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('profile_modal');
            if (modal && modal.style.display !== 'none') {
                closeProfileModal();
            }
        }
    });

    // Public API
    window.editProfileName = openProfileModal;
    window.openProfileModal = openProfileModal;
    window.closeProfileModal = closeProfileModal;

    window.PlayerProfile = {
        getName: getPlayerName,
        setName: setPlayerName,
        getAvatar: getPlayerAvatar,
        setAvatar: setPlayerAvatar,
        getProgress: getArcadeProgress,
        getRank: getRankInfo,
        saveNameFromModal: saveNameFromModal,
        rollRandomName: rollRandomName,
        updateUI: updateProfileUI,
        openModal: openProfileModal,
        closeModal: closeProfileModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateProfileUI);
    } else {
        updateProfileUI();
    }
})();
