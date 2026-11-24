/**
 * Stickman Battle — Fighter Profile & Identity System
 * v2.3 Lightweight LocalStorage Identity Manager
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
        if (!newName || typeof newName !== 'string') return;
        const clean = newName.trim().slice(0, 20);
        if (clean) {
            try {
                localStorage.setItem('sb_player_name', clean);
            } catch (e) {
                console.warn('LocalStorage unavailable for profile:', e);
            }
            updateProfileUI();
        }
    }

    function updateProfileUI() {
        const name = getPlayerName();
        const displayElements = document.querySelectorAll('.profile-display-name');
        displayElements.forEach(el => {
            el.textContent = name;
        });
        const nameInputs = document.querySelectorAll('.profile-name-input');
        nameInputs.forEach(input => {
            if (input.value !== name) input.value = name;
        });
    }

    window.editProfileName = function(e) {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        const current = getPlayerName();
        const entered = prompt('Enter your Fighter Name (max 20 characters):', current);
        if (entered !== null && entered.trim() !== '') {
            setPlayerName(entered);
        }
    };

    window.PlayerProfile = {
        getName: getPlayerName,
        setName: setPlayerName,
        updateUI: updateProfileUI
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateProfileUI);
    } else {
        updateProfileUI();
    }
})();
