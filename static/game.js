// ami js jani na ai bujhiye diche tai korchi vnaila js
const socket = io(); // Connect to the server using Socket.IO

socket.on('connect', () => {
    console.log("Connected to server! Room:", typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default');
    // server ke janachhi ami ke (pl1 na pl2) ebong kon room e achi
    socket.emit('player_joined', { 
        player_id: MY_PLAYER_ID,
        room_id: typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
    });
});

const canvas = document.getElementById('gui_screen');// eta diye canvas ta khuje bar kora hoche
const ctx = canvas.getContext('2d');// canvas ta je 2d hobe seta thikm roe dichi 
//HAT PA GULO AI BOLE DIYECHE AMI SYTAX JANI BUYTT BUJHI KORE CHI KINTU JAGA MOTON BOSANO TA AI 
//match start holei pop up ortyhat waiting pop up lukiye felbo  displsy naone korchi 
socket.on('match_start', () => {
    console.log("Match started!");
    const waitScreen = document.getElementById('wait_screen');
    if (waitScreen) {
        waitScreen.style.display = 'none'; // ukiyedhichi 
    }
    // match shuru hoyeche tai run button khule dilam
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "Run";
    }
});

// player 2 jodi tab kete beriye jay tahole player 1 er screen e abar waiting screen chalu korbo
socket.on('player_left', (data) => {
    console.log("Player left:", data.player_id);
    // match bondho hoyeche tai run button lock korlam
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerText = "Run (Waiting for Player...)";
    }
    // ami jodi player 1 hoi ar player 2 jodi chole jay tobe abar wait screen dekhabo
    if (MY_PLAYER_ID === 1 && data.player_id === 2) {
        const waitScreen = document.getElementById('wait_screen');
        if (waitScreen) {
            waitScreen.style.display = 'block'; // waiting pop up abar samne anlam
        }
    }
});
function draw_on_camvas(data) {
    if (!data || !data.player1 || !data.player2) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing
    
    // --- GROUND (Bhumi) aaka ---
    ctx.strokeStyle = "green"; // Matir rong green kora holo
    ctx.lineWidth = 10;        // Line ta 10 pixel mota kora holo
    ctx.beginPath();
    ctx.moveTo(0, 600);        // Player der pa (470 + 130) theke shuru
    ctx.lineTo(canvas.width, 600); // Canvas er shesh obdhi
    ctx.stroke();

    // Player Ankar Function
    function draw_player(player, color) {
        let x = player.x;
        let y = player.y;
        let dir = player.direction; // 1 (Right) or -1 (Left)
        
        // mathar opore koyta heart ache dekhanor jono
        if (player.heart !== undefined) {
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            let heart_text = player.heart > 0 ? "❤️".repeat(player.heart) : "💀 DEAD";
            ctx.fillText(heart_text, x, y - 30);
        }
        
        // Matha (Head)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Baki shorir (Body)
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x, y + 20); // Gola
        ctx.lineTo(x, y + 80); // Komor
        
        // Pa (Legs)
        ctx.moveTo(x, y + 80);
        ctx.lineTo(x - 20, y + 130);
        ctx.moveTo(x, y + 80);
        ctx.lineTo(x + 20, y + 130);
        
        let is_blocking = player.is_blocking || false;
        
        // Fighting Stance a Hat (Dynamic Arms for v2)
        let sword_hand_x, sword_hand_y;
        let shield_hand_x, shield_hand_y;

        if (is_blocking) {
            // Block korar somoy dhaler hat samne chole asbe guard korar jono
            shield_hand_x = x + (40 * dir);
            shield_hand_y = y + 42;
            
            // toloyarer hat pichone bhitore dhuke jabe jate dhaler pichone safe thake
            sword_hand_x = x + (15 * dir);
            sword_hand_y = y + 55;
        } else {
            // Normal obosthay toloyar samne thakbe
            sword_hand_x = x + (35 * dir);
            sword_hand_y = y + 45;
            
            // dhal pichone thakbe
            shield_hand_x = x + (20 * dir);
            shield_hand_y = y + 55;
        }

        // Dhaler hat (Arm to shield)
        ctx.moveTo(x, y + 40); // Kadh (Shoulder)
        ctx.lineTo(shield_hand_x, shield_hand_y);
        
        // Toloyarer hat (Arm to sword)
        ctx.moveTo(x, y + 40); // Kadh
        ctx.lineTo(sword_hand_x, sword_hand_y);
        
        ctx.stroke(); // Shorir aaka sesh
        
        // --- SWORD ---
        if (player.sword_angle !== undefined) {
            ctx.save();
            ctx.translate(sword_hand_x, sword_hand_y);
            // Default 45 degree tilt + animation angle
            let rad = ((player.sword_angle + 45) * dir) * (Math.PI / 180);
            ctx.rotate(rad);
            
            ctx.strokeStyle = "white"; // Sword sada kora holo
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(0, 0); 
            ctx.lineTo(0, -50); // 50px lamba toroyal
            ctx.stroke();
            ctx.restore();
        }

        // --- SHIELD (Dhal toloyarer pore draw hobe jate block korle dhal samne thake) ---
        ctx.save();
        ctx.translate(shield_hand_x, shield_hand_y);
        if (player.shield_angle !== undefined) {
            let rad = (player.shield_angle * dir) * (Math.PI / 180);
            ctx.rotate(rad);
        }

        ctx.strokeStyle = "yellow"; // Shield yellow kora holo
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-5 * dir, -22); // Shield er opor
        ctx.lineTo(-5 * dir, 25);  // Shield er nich
        ctx.stroke();
        ctx.restore();

        // --- SPEECH BUBBLE (print message render) ---
        if (player.speech && player.speech.trim() !== "") {
            ctx.save();
            ctx.font = "bold 13px 'Consolas', 'Courier New', monospace";
            let text = player.speech;
            let textMetrics = ctx.measureText(text);
            let bubbleWidth = Math.max(textMetrics.width + 18, 45);
            let bubbleHeight = 26;
            
            // Mathar opore heart bar er opore thakbe
            let bubbleY = y - 72;
            let bubbleX = dir === 1 ? (x + 10) : (x - 10 - bubbleWidth);
            
            // Screen boundary clamping jate canvas theke beriye na jay
            if (bubbleX < 10) bubbleX = 10;
            if (bubbleX + bubbleWidth > canvas.width - 10) bubbleX = canvas.width - bubbleWidth - 10;
            if (bubbleY < 10) bubbleY = 10;
            
            // Bubble box
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
            
            // Pointer tail pointing towards stickman
            ctx.beginPath();
            let tailBaseX = Math.min(Math.max(x + (dir * 10), bubbleX + 10), bubbleX + bubbleWidth - 10);
            let tailTipX = x + (dir * 5);
            let tailTipY = Math.min(bubbleY + bubbleHeight + 8, y - 35);
            ctx.moveTo(tailBaseX - 5, bubbleY + bubbleHeight);
            ctx.lineTo(tailTipX, tailTipY);
            ctx.lineTo(tailBaseX + 5, bubbleY + bubbleHeight);
            ctx.closePath();
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fill();
            ctx.stroke();

            // Tail base connection mask
            ctx.beginPath();
            ctx.moveTo(tailBaseX - 4, bubbleY + bubbleHeight);
            ctx.lineTo(tailBaseX + 4, bubbleY + bubbleHeight);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Text render inside bubble
            ctx.fillStyle = "#111";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, bubbleX + (bubbleWidth / 2), bubbleY + (bubbleHeight / 2) + 1);
            ctx.restore();
        }
    }

    // Dujon player k aa ki
    draw_player(data.player1, "red");
    draw_player(data.player2, "blue");

    // keu jite gele ba game over hole boro kore winner dekhano
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

    // game over hole rematch button dekhabo ebong run button freeze korbo
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
    let code = document.getElementById("ide").value;// html e je ide tag ewr text era ache jeta code eddiotr hisebe use hobe seta etar bhitor ki lekha ache ta bar korchi 
    data = {
        "code": code,
        "player_id": MY_PLAYER_ID,
        "room_id": typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
    };
    socket.emit("run_code", data);
}

// restart button e click korle server ke bolbo
function request_restart() {
    socket.emit('restart_game', {
        "room_id": typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default'
    });
}

// server theke game reset er signal pele
socket.on('game_restarted', () => {
    console.log("Game restarted!");
    const restartBtn = document.getElementById('restart_btn');
    if (restartBtn) {
        restartBtn.style.display = 'none';
    }
    // rematch shuru hoyeche tai run button abar chalu korlam
    const runBtn = document.getElementById('run_btn');
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerText = "Run";
    }
});

socket.on('update_game_gui',draw_on_camvas);// oi tag julto data jokhoni pabe ei ta triger hobe draw_on_camvas function ta call hobe and oi data ke draw_on_camvas function e pathabe


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
    
    // 1. Calculate indent level for each line (4 spaces = 1 level)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().length === 0) {
            indents.push(-1); // Empty line
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
    
    // 2. Interpolate empty lines inside indented blocks (VS Code behavior)
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
    
    // 3. Render guide lines ONLY where indent exists (no stripes across empty space)
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

        // 1. Tab Key Handler (inserts 4 spaces instead of losing focus)
        if (e.key === "Tab") {
            e.preventDefault();
            this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
            updateEditorUI();
        }
        // 2. Enter Key Handler (Auto-indentation, extra 4 spaces on ':')
        else if (e.key === "Enter") {
            e.preventDefault();
            const textBefore = this.value.substring(0, start);
            const textAfter = this.value.substring(end);

            // current line ber kora
            const currentLine = textBefore.split("\n").pop();

            // current line er leading spaces ber kora
            const match = currentLine.match(/^\s*/);
            let indent = match ? match[0] : "";

            // line er seshe ':' thakle aro 4 space barano
            if (currentLine.trim().endsWith(":")) {
                indent += "    ";
            }

            this.value = textBefore + "\n" + indent + textAfter;
            this.selectionStart = this.selectionEnd = start + 1 + indent.length;
            updateEditorUI();

            // cursor scroll er sathe align rakha
            this.dispatchEvent(new Event("scroll"));
        }
        // 3. Backspace Key Handler (Smart delete 4 spaces if on indent)
        else if (e.key === "Backspace" && start === end && start >= 4) {
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

    // Initial line numbers and indent guides on page load
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
// Fallback direct listeners if script runs after DOMContentLoaded
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
