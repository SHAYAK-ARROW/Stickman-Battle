// ==============================================================================
// 🎨 STICKMAN BATTLE - CANVAS RENDERING & VISUAL FX ENGINE
// Handles: Canvas drawing, Stickman bones, dynamic swords, motion blur slashes,
// trig spells, energy shields, health HUDs, damage hit sparks & speech bubbles.
// ==============================================================================

// Note: canvas and ctx are already declared in game.js

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

// Note: SFX state tracking and swordTrails are declared in game.js

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

    // --- PROCEDURAL AUDIO SFX EVENT TRIGGERS ---
    if (window.AudioEngine) {
        const eventsHandled = new Set();
        if (data.combat_events && Array.isArray(data.combat_events)) {
            data.combat_events.forEach(evt => {
                switch (evt.type) {
                    case 'sword_clash':
                        window.AudioEngine.playSwordClash();
                        eventsHandled.add('clash');
                        break;
                    case 'shield_block':
                        window.AudioEngine.playShieldBlock();
                        eventsHandled.add('shield_block');
                        break;
                    case 'shield_break':
                        if (window.AudioEngine.playShieldBreak) window.AudioEngine.playShieldBreak();
                        else window.AudioEngine.playShieldBlock();
                        eventsHandled.add('shield_break');
                        eventsHandled.add('hit');
                        break;
                    case 'damage_hit':
                        window.AudioEngine.playDamageHit(!!evt.is_heavy);
                        eventsHandled.add('hit');
                        break;
                    case 'barrier_absorb':
                        if (window.AudioEngine.playBarrierDeflect) window.AudioEngine.playBarrierDeflect();
                        else window.AudioEngine.playShieldBlock();
                        break;
                    case 'evasion':
                        window.AudioEngine.playDodge();
                        eventsHandled.add('evasion');
                        break;
                    case 'trig_fusion':
                        if (window.AudioEngine.playTrigFusion) window.AudioEngine.playTrigFusion();
                        break;
                    case 'wave_clash':
                        if (window.AudioEngine.playWaveClash) window.AudioEngine.playWaveClash();
                        break;
                    case 'spell_slice':
                        if (window.AudioEngine.playSpellSlice) window.AudioEngine.playSpellSlice();
                        break;
                    case 'sword_catch':
                        if (window.AudioEngine.playSwordCatch) window.AudioEngine.playSwordCatch();
                        break;
                }
            });
        }

        // 1. Damage Hit Fallback
        if (!eventsHandled.has('hit')) {
            if (prevP1Heart !== null && data.player1.heart < prevP1Heart) {
                window.AudioEngine.playDamageHit(false);
            }
            if (prevP2Heart !== null && data.player2.heart < prevP2Heart) {
                window.AudioEngine.playDamageHit(false);
            }
        }
        prevP1Heart = data.player1.heart;
        prevP2Heart = data.player2.heart;

        // 2. Sword Swing & Dynamic Clash
        const p1Slashing = data.player1.has_sword && data.player1.attack_state === 2;
        const p2Slashing = data.player2.has_sword && data.player2.attack_state === 2;
        const fightersClose = Math.abs(data.player1.x - data.player2.x) <= 140;

        if (data.clash || (p1Slashing && p2Slashing && fightersClose && (!prevP1Attacking || !prevP2Attacking))) {
            if (!eventsHandled.has('clash')) window.AudioEngine.playSwordClash();
        } else {
            if (p1Slashing && !prevP1Attacking && !eventsHandled.has('clash')) window.AudioEngine.playSwordSwing();
            if (p2Slashing && !prevP2Attacking && !eventsHandled.has('clash')) window.AudioEngine.playSwordSwing();
        }
        prevP1Attacking = p1Slashing;
        prevP2Attacking = p2Slashing;

        // 3. Shield Block
        prevP1Blocking = !!data.player1.is_blocking;
        prevP2Blocking = !!data.player2.is_blocking;

        // 4. Dodge / Crouch
        if (!eventsHandled.has('evasion')) {
            if ((data.player1.is_crouching && !prevP1Crouching) || (data.player2.is_crouching && !prevP2Crouching)) {
                window.AudioEngine.playDodge();
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
                    window.AudioEngine.playSpell(s.type);
                }
            });
            if (activeSpellKeys.size > 150) activeSpellKeys.clear();
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // --- GROUND (Bhumi) ---
    ctx.strokeStyle = "green";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 595);
    ctx.lineTo(canvas.width, 595);
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

        const bodyColor = player.body_color || color;

        // Matha (Head)
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(x, y + crouchY, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Baki shorir (Body)
        ctx.strokeStyle = bodyColor;
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
                bladeStroke = player.sword_color || "#ffffff";
                bladeFill = player.sword_color || "#e2e8f0";
                ctx.shadowColor = player.sword_color || "rgba(255, 255, 255, 0.6)";
                ctx.shadowBlur = player.sword_color ? 12 : 6;
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

        // Glowing rim border: vibrant gold when normal, electric cyan when actively blocking (or custom wardrobe color)
        const shieldBorder = isBlocking ? "#38bdf8" : (player.shield_color || "#f59e0b");
        ctx.strokeStyle = shieldBorder;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = shieldBorder;
        ctx.shadowBlur = isBlocking ? 12 : (player.shield_color ? 10 : 5);
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
        const width = 210;
        const height = 12;
        const left = align === "right" ? x - width : x;
        const ratio = health / maxHealth;
        const color = ratio > 0.5 ? "#6ec69a" : ratio > 0.25 ? "#d4b84a" : "#e05a5a";

        ctx.save();
        ctx.textAlign = align === "right" ? "right" : "left";
        ctx.textBaseline = "alphabetic";
        const tagColor = label === "P1" ? "#ff5c5c" : "#38bdf8";

        if (align === "right") {
            const healthStr = `${health}/${maxHealth}`;
            ctx.font = "600 14px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText(healthStr, x, 24);
            const healthWidth = ctx.measureText(healthStr).width;

            ctx.font = "800 18px 'Space Grotesk', 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = tagColor;
            ctx.fillText(label, x - healthWidth - 10, 24);
        } else {
            ctx.font = "800 18px 'Space Grotesk', 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = tagColor;
            ctx.fillText(label, x, 24);
            const labelWidth = ctx.measureText(label).width;

            ctx.font = "600 14px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText(` ${health}/${maxHealth}`, x + labelWidth + 6, 24);
        }

        // Health bar background & fill (210x12px, radius 4)
        ctx.fillStyle = "#1e1f26";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 29, width, height, 4); ctx.fill(); }
        else { ctx.fillRect(left, 29, width, height); }
        if (ratio > 0) {
            ctx.fillStyle = color;
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 29, width * ratio, height, 4); ctx.fill(); }
            else { ctx.fillRect(left, 29, width * ratio, height); }
        }

        // Fixed HUD Energy / Stamina Bar (y = 45, height = 6, cyan glow)
        const maxEnergy = player.max_energy || 100;
        const energy = Math.max(0, Math.min(maxEnergy, player.energy !== undefined ? player.energy : 100));
        const energyRatio = energy / maxEnergy;
        
        ctx.fillStyle = "#16171d";
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 45, width, 6, 3); ctx.fill(); }
        else { ctx.fillRect(left, 45, width, 6); }
        
        if (energyRatio > 0) {
            ctx.fillStyle = energyRatio > 0.35 ? "#38bdf8" : "#f59e0b";
            if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(left, 45, width * energyRatio, 6, 3); ctx.fill(); }
            else { ctx.fillRect(left, 45, width * energyRatio, 6); }
        }

        // Energy text badge
        ctx.font = "600 11px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = "#7dd3fc";
        const energyStr = `${Math.round(energy)}⚡`;
        ctx.fillText(energyStr, x, 61);
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
            } else if (spell.type === 'shockwave') {
                ctx.save();
                const swRadius = spell.radius || (spell.t * 5.5);
                const swAlpha = Math.max(0, 1 - (spell.t / 20));
                ctx.globalAlpha = swAlpha;
                ctx.strokeStyle = "#38bdf8";
                ctx.shadowColor = "#e040fb";
                ctx.shadowBlur = 20;
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(sx, sy, swRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Inner golden harmonic ring
                ctx.strokeStyle = "#ffd700";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(sx, sy, swRadius * 0.65, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    // Winner Banner - clean modern pill with Mutual K.O. Draw support
    let is_game_over = false;
    let winnerText = "";
    let winnerColor = "";
    const p1Dead = data.player1 && data.player1.heart <= 0;
    const p2Dead = data.player2 && data.player2.heart <= 0;

    if (p1Dead && p2Dead) {
        winnerText = "MUTUAL K.O. · DRAW! ⚔️";
        winnerColor = "#fbbf24";
        is_game_over = true;
    } else if (p1Dead) {
        winnerText = (typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM) ? "BOT WINS! 🤖" : "PLAYER 2 WINS! 🏆";
        winnerColor = "#38bdf8";
        is_game_over = true;
    } else if (p2Dead) {
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

    if (is_game_over && !prevGameOver) {
        if (window.AudioEngine) {
            const isDraw = p1Dead && p2Dead;
            const iWon = !isDraw && ((MY_PLAYER_ID === 1 && p2Dead) || (MY_PLAYER_ID === 2 && p1Dead));
            window.AudioEngine.playGameOver(iWon);

            // 🏆 Progressive Arcade Unlock Record on Victory
            if (iWon && typeof IS_BOT_ROOM !== 'undefined' && IS_BOT_ROOM && typeof BOT_DIFFICULTY !== 'undefined') {
                const stageMap = { 'rusher': 1, 'easy': 1, 'turtle': 2, 'weaver': 3, 'duelist': 4, 'hard': 5, 'berserker': 5, 'apex': 6 };
                const currentStage = stageMap[BOT_DIFFICULTY];
                if (currentStage && currentStage < 6) {
                    try {
                        const prevUnlocked = parseInt(localStorage.getItem('stickman_arcade_unlocked') || '1', 10);
                        const nextStage = Math.max(prevUnlocked, currentStage + 1);
                        localStorage.setItem('stickman_arcade_unlocked', nextStage.toString());
                        console.log(`🏆 Arcade milestone unlocked: Stage ${nextStage}!`);
                    } catch(e) {}
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
        } else if (data.is_match_active && runBtn.disabled) {
            // Self-healing: if server reports active match, ensure button is ready
            runBtn.disabled = false;
            runBtn.innerText = "Run";
            const waitScreen = document.getElementById('wait_screen');
            if (waitScreen) waitScreen.style.display = 'none';
        }
    }
}

