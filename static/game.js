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