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
        player_id: MY_PLAYER_ID,
        room_id: typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
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
        
        // mathar opore koyta heart ache dekhanor jono
        if (player.heart !== undefined) {
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            let heart_text = player.heart > 0 ? "❤️".repeat(player.heart) : "💀 DEAD";
            ctx.fillText(heart_text, x, y - 30 + crouchY);
        }
        
        // Defensive Spell: cosec_dome (protective dome over head)
        if (player.has_dome) {
            ctx.save();
            ctx.strokeStyle = "#ffd700";
            ctx.shadowColor = "#ffd700";
            ctx.shadowBlur = 18;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, y + 35 + crouchY, 65, Math.PI, 0);
            ctx.stroke();
            ctx.restore();
        }

        // Defensive Spell: sec_barrier (curved force field in front)
        if (player.has_barrier) {
            ctx.save();
            ctx.strokeStyle = "#00f0ff";
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 16;
            ctx.lineWidth = 5;
            ctx.beginPath();
            let barX = x + (45 * dir);
            let startA = dir === 1 ? -Math.PI / 3 : (2 * Math.PI / 3);
            let endA = dir === 1 ? Math.PI / 3 : (4 * Math.PI / 3);
            ctx.arc(barX, y + 55 + crouchY, 55, startA, endA);
            ctx.stroke();
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
        
        // --- SWORD ---
        let has_sword = player.has_sword !== undefined ? player.has_sword : true;
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
            } else {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 5;
            }
            ctx.beginPath();
            ctx.moveTo(0, 0); 
            ctx.lineTo(0, player.is_heavy ? -60 : -50);
            ctx.stroke();
            ctx.restore();
        }

        // --- SHIELD ---
        ctx.save();
        ctx.translate(shield_hand_x, shield_hand_y);
        if (player.shield_angle !== undefined) {
            let rad = (player.shield_angle * dir) * (Math.PI / 180);
            ctx.rotate(rad);
        }

        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-5 * dir, -22);
        ctx.lineTo(-5 * dir, 25);
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

    // --- SPELLS & RANGED PROJECTILES RENDER ---
    if (data.spells && Array.isArray(data.spells)) {
        data.spells.forEach(spell => {
            let sx = spell.x;
            let sy = spell.y;
            let sdir = spell.dir || 1;
            let st = spell.t || 0;
            
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
                ctx.shadowBlur = 16;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(sx, sy, 9, 0, Math.PI * 2);
                ctx.fill();
                // Trail wave
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    let tx = sx - (i * 9 * sdir);
                    let ty = sy + Math.sin((st - i) * 0.25) * 16;
                    if (i === 0) ctx.moveTo(tx, ty);
                    else ctx.lineTo(tx, ty);
                }
                ctx.stroke();
                ctx.restore();
            } else if (spell.type === 'cos_wave') {
                ctx.save();
                ctx.strokeStyle = "#ffd700";
                ctx.fillStyle = "rgba(255, 215, 0, 0.25)";
                ctx.shadowColor = "#ffd700";
                ctx.shadowBlur = 18;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(sx, sy, 24, -Math.PI / 2, Math.PI / 2, sdir === -1);
                ctx.stroke();
                ctx.fill();
                ctx.restore();
            } else if (spell.type === 'tan_spike') {
                ctx.save();
                let progress = Math.sin(Math.min(st / 25, 1) * Math.PI);
                let h = progress * 135;
                ctx.fillStyle = "#e040fb";
                ctx.shadowColor = "#e040fb";
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.moveTo(sx - 15, 600);
                ctx.lineTo(sx + 15, 600);
                ctx.lineTo(sx, 600 - h);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (spell.type === 'cot_wall') {
                ctx.save();
                ctx.strokeStyle = "#ff3d00";
                ctx.shadowColor = "#ff3d00";
                ctx.shadowBlur = 16;
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(sx, 600);
                ctx.lineTo(sx, 460);
                ctx.stroke();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#ffff00";
                for (let gy = 480; gy < 600; gy += 25) {
                    ctx.beginPath();
                    ctx.moveTo(sx - 12, gy);
                    ctx.lineTo(sx + 12, gy);
                    ctx.stroke();
                }
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
        alert("Match sesh ba player ready na thakle code run kora jabe na! Rematch koro.");
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
