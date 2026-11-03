// ami js jani na ai bujhiye diche tai korchi vnaila js
const socket = io(); // Connect to the server using Socket.IO

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

function draw_on_camvas(data) {
    if (!data || !data.player1 || !data.player2) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // --- GROUND (Bhumi) ---
    ctx.strokeStyle = "green";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 600);
    ctx.lineTo(canvas.width, 600);
    ctx.stroke();

    // Player Ankar Function
    function draw_player(player, color) {
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
    draw_player(data.player1, "#ff5c5c");
    draw_player(data.player2, "#38bdf8");

    // Fixed HUD health bars - clean, minimal style.
    function draw_health_bar(player, label, x, align) {
        const maxHealth = player.max_health || 10;
        const health = Math.max(0, Math.min(maxHealth, player.heart || 0));
        const width = 140;
        const height = 6;
        const left = align === "right" ? x - width : x;
        const ratio = health / maxHealth;
        const color = ratio > 0.5 ? "#6ec69a" : ratio > 0.25 ? "#d4b84a" : "#e05a5a";

        ctx.save();
        ctx.textAlign = align === "right" ? "right" : "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = "600 11px 'Segoe UI', Arial, sans-serif";
        const tagColor = label === "P1" ? "#ff5c5c" : "#38bdf8";
        ctx.font = "700 11px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = tagColor;
        if (align === "right") {
            ctx.fillText(label, x - 42, 22);
            ctx.fillStyle = "#8a8b94";
            ctx.font = "500 11px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(`${health}/${maxHealth}`, x, 22);
        } else {
            ctx.fillText(label, x, 22);
            ctx.fillStyle = "#8a8b94";
            ctx.font = "500 11px 'Segoe UI', Arial, sans-serif";
            ctx.fillText(` ${health}/${maxHealth}`, x + 20, 22);
        }
        ctx.fillStyle = "#1e1f26";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 28, width, height, 3); ctx.fill(); }
        else { ctx.fillRect(left, 28, width, height); }
        if (ratio > 0) {
            ctx.fillStyle = color;
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 28, width * ratio, height, 3); ctx.fill(); }
            else { ctx.fillRect(left, 28, width * ratio, height); }
        }

        // Fixed HUD Energy / Stamina Bar (y = 38, height = 4, cyan glow)
        const maxEnergy = player.max_energy || 100;
        const energy = Math.max(0, Math.min(maxEnergy, player.energy !== undefined ? player.energy : 100));
        const energyRatio = energy / maxEnergy;
        
        ctx.fillStyle = "#16171d";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 38, width, 4, 2); ctx.fill(); }
        else { ctx.fillRect(left, 38, width, 4); }
        
        if (energyRatio > 0) {
            ctx.fillStyle = energyRatio > 0.35 ? "#38bdf8" : "#f59e0b";
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 38, width * energyRatio, 4, 2); ctx.fill(); }
            else { ctx.fillRect(left, 38, width * energyRatio, 4); }
        }

        // Energy text badge
        ctx.font = "600 9.5px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = "#7dd3fc";
        const energyStr = `${Math.round(energy)}⚡`;
        if (align === "right") {
            ctx.fillText(energyStr, x, 49);
        } else {
            ctx.fillText(energyStr, x, 49);
        }
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

    const restartBtn = document.getElementById('restart_btn');
    if (restartBtn) {
        restartBtn.style.display = is_game_over ? 'inline-block' : 'none';
    }

    const runBtn = document.getElementById('run_btn');
    if (runBtn && is_game_over) {
        runBtn.disabled = true;
        runBtn.innerText = "Match Over (Play Again to Rematch)";
    }
}

function run() {
    dismissDiagnostics();
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
    let code = document.getElementById("ide").value;
    data = {
        "code": code,
        "player_id": MY_PLAYER_ID,
        "room_id": typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
    };
    socket.emit("run_code", data);
}

function request_restart() {
    socket.emit('restart_game', {
        "room_id": typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
    });
}

socket.on('game_restarted', () => {
    console.log("Game restarted!");
    const restartBtn = document.getElementById('restart_btn');
    if (restartBtn) {
        restartBtn.style.display = 'none';
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
    if (data && data.error) {
        showDiagnostics(data.error);
    }
});

socket.on('code_success', () => {
    dismissDiagnostics();
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
});

socket.on('emergency_cooldown', (data) => {
    showEmergencyFeedback(`Wait ${data.remaining}s`, 'warning');
});

socket.on('emergency_rejected', (data) => {
    showEmergencyFeedback(data.reason || 'Action rejected', 'danger');
});

// Tactical Keyboard Hotkeys (Alt+S for Shield, Alt+D for Dodge)
window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        triggerEmergency('shield');
    } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        triggerEmergency('dodge');
    }
});

// --- VS Code Style Code Editor (Line Numbers, Dynamic Indent Guides & Auto-Indent) ---
const ide = document.getElementById("ide");
const lineNumbers = document.getElementById("line_numbers");
const indentGuides = document.getElementById("indent_guides");

function updateLineNumbers() {
    if (!ide || !lineNumbers) return;
    const lines = ide.value.split("\n");
    let numbers = "";
    for (let i = 1; i <= lines.length; i++) {
        numbers += i + "<br>";
    }
    lineNumbers.innerHTML = numbers;
}

function updateIndentGuides() {
    if (!ide || !indentGuides) return;
    const lines = ide.value.split("\n");
    const indents = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().length === 0) {
            indents.push(-1);
        } else {
            let leadingSpaces = 0;
            for (let c = 0; c < line.length; c++) {
                if (line[c] === ' ') leadingSpaces += 1;
                else if (line[c] === '\t') leadingSpaces += 4;
                else break;
            }
            indents.push(Math.floor(leadingSpaces / 4));
        }
    }
    
    for (let i = 0; i < indents.length; i++) {
        if (indents[i] === -1) {
            let prevIndent = 0;
            for (let p = i - 1; p >= 0; p--) {
                if (indents[p] !== -1) { prevIndent = indents[p]; break; }
            }
            let nextIndent = 0;
            for (let n = i + 1; n < indents.length; n++) {
                if (indents[n] !== -1) { nextIndent = indents[n]; break; }
            }
            indents[i] = Math.min(prevIndent, nextIndent);
        }
    }
    
    let html = "";
    for (let i = 0; i < lines.length; i++) {
        const lvl = indents[i];
        if (lvl > 0) {
            let spans = "";
            for (let j = 0; j < lvl; j++) {
                spans += '<span style="display:inline-block; width:4ch; height:20px; box-sizing:border-box; border-right:1px solid rgba(255, 255, 255, 0.15); vertical-align:top;"></span>';
            }
            html += `<div style="height:20px; line-height:20px; white-space:pre;">${spans}</div>`;
        } else {
            html += '<div style="height:20px; line-height:20px; white-space:pre;"></div>';
        }
    }
    indentGuides.innerHTML = html;
}

function syncEditorScroll() {
    if (!ide) return;
    if (lineNumbers) lineNumbers.scrollTop = ide.scrollTop;
    if (indentGuides) {
        indentGuides.scrollTop = ide.scrollTop;
        indentGuides.scrollLeft = ide.scrollLeft;
    }
}

function updateEditorUI() {
    updateLineNumbers();
    updateIndentGuides();
}

if (ide) {
    ide.addEventListener("input", updateEditorUI);
    ide.addEventListener("scroll", syncEditorScroll);

    ide.addEventListener("keydown", function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;

        if (e.key === "Tab") {
            e.preventDefault();
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
            updateEditorUI();
        } else if (e.key === "Enter") {
            e.preventDefault();
            const textBefore = this.value.substring(0, start);
            const textAfter = this.value.substring(end);
            const currentLine = textBefore.split("\n").pop();
            const match = currentLine.match(/^\s*/);
            let indent = match ? match[0] : "";

            if (currentLine.trim().endsWith(":")) {
                indent += "    ";
            }

            this.value = textBefore + "\n" + indent + textAfter;
            this.selectionStart = this.selectionEnd = start + 1 + indent.length;
            updateEditorUI();
            this.dispatchEvent(new Event("scroll"));
        } else if (e.key === "Backspace" && start === end && start >= 4) {
            const before = this.value.substring(start - 4, start);
            const currentLineBefore = this.value.substring(0, start).split("\n").pop();
            if (before === "    " && /^\s+$/.test(currentLineBefore)) {
                e.preventDefault();
                this.value = this.value.substring(0, start - 4) + this.value.substring(start);
                this.selectionStart = this.selectionEnd = start - 4;
                updateEditorUI();
            }
        }
    });

    updateEditorUI();
}

// --- OPPONENT INPUT MODAL (Model 1 Challenge/Dialogue) ---
socket.on('prompt_opponent_input', function(data) {
    if (data.from_player !== MY_PLAYER_ID) {
        let modal = document.getElementById('opponent_input_modal');
        let title = document.getElementById('input_modal_title');
        let prompt = document.getElementById('input_modal_prompt');
        let field = document.getElementById('input_modal_field');
        if (modal && prompt && field) {
            title.innerText = `💬 Player ${data.from_player} asks:`;
            prompt.innerText = data.prompt || "Say something:";
            field.value = "";
            modal.style.display = "block";
            setTimeout(() => field.focus(), 50);
        }
    }
});

function sendInputReply() {
    let modal = document.getElementById('opponent_input_modal');
    let field = document.getElementById('input_modal_field');
    if (!field || !modal) return;
    let reply = field.value.trim();
    if (reply) {
        socket.emit('reply_input', {
            room_id: typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default',
            from_player: MY_PLAYER_ID,
            reply: reply
        });
    }
    modal.style.display = "none";
    field.value = "";
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('input_modal_send')?.addEventListener('click', sendInputReply);
    document.getElementById('input_modal_close')?.addEventListener('click', () => {
        let modal = document.getElementById('opponent_input_modal');
        if (modal) modal.style.display = "none";
    });
    document.getElementById('input_modal_field')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendInputReply();
        }
    });
});
document.getElementById('input_modal_send')?.addEventListener('click', sendInputReply);
document.getElementById('input_modal_close')?.addEventListener('click', () => {
    let modal = document.getElementById('opponent_input_modal');
    if (modal) modal.style.display = "none";
});
document.getElementById('input_modal_field')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendInputReply();
    }
});


// --- Commands Dialog Live Search Filter ---
function filterCommands(query) {
    const table = document.getElementById("commands_table");
    if (!table) return;
    const q = query.toLowerCase().trim();
    const rows = table.querySelectorAll("tr");
    rows.forEach((row, idx) => {
        if (idx === 0) return; // Skip table header
        const text = row.innerText.toLowerCase();
        row.style.display = (!q || text.includes(q)) ? "" : "none";
    });
}


// Quick banter chip helper for dialogue
function sendQuickReply(text) {
    const field = document.getElementById('input_modal_field');
    if (field) field.value = text;
    sendInputReply();
}
