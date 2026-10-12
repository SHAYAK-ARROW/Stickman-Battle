// ami js jani na ai bujhiye diche tai korchi vnaila js
const socket = io(); // Connect to the server using Socket.IO
const canvas = document.getElementById('gui_screen');// eta diye canvas ta khuje bar kora hoche
const ctx = canvas.getContext('2d');// canvas ta je 2d hobe seta thikm roe dichi 
//HAT PA GULO AI BOLE DIYECHE AMI SYTAX JANI BUYTT BUJHI KORE CHI KINTU JAGA MOTON BOSANO TA AI 

function draw_on_camvas(data) {
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
        
        // Fighting Stance a Hat (Arms)
        // Pichoner Hat (Back Hand) - Ektu niche
        let back_hand_x = x + (20 * dir);
        let back_hand_y = y + 55;
        ctx.moveTo(x, y + 40); // Kadh (Shoulder)
        ctx.lineTo(back_hand_x, back_hand_y);
        
        // Samner Hat (Front Hand) - Ektu upore
        let front_hand_x = x + (35 * dir);
        let front_hand_y = y + 45;
        ctx.moveTo(x, y + 40); // Kadh
        ctx.lineTo(front_hand_x, front_hand_y);
        
        ctx.stroke(); // Shorir aaka sesh
        
        // --- SHIELD (Pichoner hate) ---
        ctx.save();
        ctx.translate(back_hand_x, back_hand_y);//tranmslet ta buihlam na canmvasd er ak relet kichu apto tukei kaj chalachi 
        if (player.shield_angle !== undefined) {// angel anujai shild ghure jabe //undefief  mane none 
        let rad = (player.shield_angle * dir) * (Math.PI / 180);
       ctx.rotate(rad);
}

        ctx.strokeStyle = "yellow"; // Shield yellow kora holo
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-5 * dir, -20); // Shield er opor
        ctx.lineTo(-5 * dir, 25);  // Shield er nich
        ctx.stroke();
        ctx.restore();
        
        // --- SWORD (Samner hate) ---
        if (player.sword_angle !== undefined) {
            ctx.save();
            ctx.translate(front_hand_x, front_hand_y);
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
    }

    // Dujon player k aa ki
    draw_player(data.player1, "red");
    draw_player(data.player2, "blue");
}



function run(){
let code=document.getElementById("ide").value;// html e je  ide tag ewr text era ache jeta code eddiotr hisebe use hobe seta etar bhitor ki lekha ache ta bar korchi 
data={
        "code":code,
        "player_id": MY_PLAYER_ID
};
socket.emit("run_code",data);

}


socket.on('update_game_gui',draw_on_camvas);// oi tag julto data jokhoni pabe ei ta triger hobe draw_on_camvas function ta call hobe and oi data ke draw_on_camvas function e pathabe