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
        
        // --- SWORD (Dynamic length & stances) ---
        let has_sword = player.has_sword !== undefined ? player.has_sword : true;
        let swordLen = player.sword_length || 50;
        if (has_sword && player.sword_angle !== undefined) {
            ctx.save();
            ctx.translate(sword_hand_x, sword_hand_y);
            let rad = ((player.sword_angle + 45) * dir) * (Math.PI / 180);
            ctx.rotate(rad);
            
            if (player.is_heavy) {
                ctx.strokeStyle = "#ff4500"; // Heavy attack glowing fiery red-orange blade
                ctx.shadowColor = "#ff4500";
                ctx.shadowBlur = 14;
                ctx.lineWidth = 7;
                swordLen += 10;
            } else if (player.is_swing) {
                ctx.strokeStyle = "#00f0ff"; // Swift horizontal swing cyan glow
                ctx.shadowColor = "#00f0ff";
                ctx.shadowBlur = 12;
                ctx.lineWidth = 5;
            } else {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 5;
            }
            ctx.beginPath();
            ctx.moveTo(0, 0); 
            ctx.lineTo(0, -swordLen);
            ctx.stroke();
            ctx.restore();
        }

        // --- SHIELD (Dynamic length) ---
        ctx.save();
        ctx.translate(shield_hand_x, shield_hand_y);
        if (player.shield_angle !== undefined) {
            let rad = (player.shield_angle * dir) * (Math.PI / 180);
            ctx.rotate(rad);
        }

        let shieldLen = player.shield_length || 40;
        let halfH = shieldLen / 2;
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-5 * dir, -halfH);
        ctx.lineTo(-5 * dir, halfH);
        ctx.stroke();
        ctx.restore();

        // --- SPEECH BUBBLE ---
        if (player.speech && player.speech.trim() !== "") {
            ctx.save();
            ctx.font = "bold 13px 'Consolas', 'Courier New', monospace";
            let text = player.speech;
            let textMetrics = ctx.measureText(text);
            let bubbleWidth = Math.max(textMetrics.width + 18, 45);
            let bubbleHeight = 26;
            
            let bubbleY = y - 72 + crouchY;
            let bubbleX = dir === 1 ? (x + 10) : (x - 10 - bubbleWidth);
            
            if (bubbleX < 10) bubbleX = 10;
            if (bubbleX + bubbleWidth > canvas.width - 10) bubbleX = canvas.width - bubbleWidth - 10;
            if (bubbleY < 10) bubbleY = 10;
            
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 6);
            } else {
                ctx.rect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
            }
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            let tailBaseX = Math.min(Math.max(x + (dir * 10), bubbleX + 10), bubbleX + bubbleWidth - 10);
            let tailTipX = x + (dir * 5);
            let tailTipY = Math.min(bubbleY + bubbleHeight + 8, y - 35 + crouchY);
            ctx.moveTo(tailBaseX - 5, bubbleY + bubbleHeight);
            ctx.lineTo(tailTipX, tailTipY);
            ctx.lineTo(tailBaseX + 5, bubbleY + bubbleHeight);
            ctx.closePath();
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(tailBaseX - 4, bubbleY + bubbleHeight);
            ctx.lineTo(tailBaseX + 4, bubbleY + bubbleHeight);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = "#111";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, bubbleX + (bubbleWidth / 2), bubbleY + (bubbleHeight / 2) + 1);
            ctx.restore();
        }
    }

    // Dujon player draw kora holo
    draw_player(data.player1, "red");
    draw_player(data.player2, "blue");

    // Fixed HUD health bars keep health readable without crowding the fighters.
    function draw_health_bar(player, label, x, align) {
        const maxHealth = player.max_health || 10;
        const health = Math.max(0, Math.min(maxHealth, player.heart || 0));
        const width = 150;
        const height = 12;
        const left = align === "right" ? x - width : x;
        const ratio = health / maxHealth;
        const color = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#facc15" : "#ef4444";

        ctx.save();
        ctx.textAlign = align === "right" ? "right" : "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = "bold 13px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${label}  HP ${health}/${maxHealth}`, align === "right" ? x : x, 24);
        ctx.fillStyle = "#333333";
        ctx.fillRect(left, 30, width, height);
        ctx.fillStyle = color;
        ctx.fillRect(left, 30, width * ratio, height);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(left, 30, width, height);
        ctx.restore();
    }
    draw_health_bar(data.player1, "P1", 20, "left");
    draw_health_bar(data.player2, "P2", canvas.width - 20, "right");

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
                ctx.strokeStyle = "#ffffff";
                ctx.shadowColor = "#ffffff";
                ctx.shadowBlur = 12;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-25, 0);
                ctx.lineTo(25, 0);
                ctx.moveTo(12, -8);
                ctx.lineTo(12, 8);
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

    // Winner Banner
    ctx.textAlign = "center";
    ctx.font = "bold 36px Arial";
    let is_game_over = false;
    if (data.player1 && data.player1.heart <= 0) {
        ctx.fillStyle = "blue";
        ctx.fillText("PLAYER 2 WINS! 🏆", canvas.width / 2, 250);
        is_game_over = true;
    } else if (data.player2 && data.player2.heart <= 0) {
        ctx.fillStyle = "red";
        ctx.fillText("PLAYER 1 WINS! 🏆", canvas.width / 2, 250);
        is_game_over = true;
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
    const runBtn = document.getElementById("run_btn");
    if (runBtn && runBtn.disabled) {
        alert("The match is over or Player 2 is not ready. Start a rematch or wait for Player 2.");
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
