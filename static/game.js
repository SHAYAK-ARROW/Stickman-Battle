// ami js jani na ai bujhiye diche tai korchi vnaila js
const socket = io(); // Connect to the server using Socket.IO
const canvas = document.getElementById('gui_screen');// eta diye canvas ta khuje bar kora hoche
const ctx = canvas.getContext('2d');// canvas ta je 2d hobe seta thikm roe dichi 
//HAT PA GULO AI BOLE DIYECHE AMI SYTAX JANI BUYTT BUJHI KORE CHI KINTU JAGA MOTON BOSANO TA AI 

function draw_on_camvas(data) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing
//player 1    
  // head ta 
  //jehetu solid gol lagbe tai fillstyel 
    ctx.fillStyle="red";// lal color er  putul hobemulto tulir color lal kore nilam 
    ctx.beginPath();// eta diye bolaam amra nutun kichua ka huur korchi  eta thik bujhlam n akeno but eta bojhar dporkar be  mone hoche na 
    ctx.arc(data.player1.x, data.player1.y, 20, 0, Math.PI * 2); // Draw player 1 as a circle redius 20 o deg theke 360 obdhi dag
    ctx.fill();// et korchi solid math asolid color e bhosa circle e r jono
//body ta 
     //jehetu normal line lagbe tai strockstyel
     ctx.strokeStyle="red"
     ctx.lineWidth=5;//lene ta 5 pixel mota 
     ctx.beginPath();
     ctx.moveTo(data.player1.x, data.player1.y + 20)//kono dag na ke te oi jagay turtle ta niye jete ms trutle er pen up ermot
     ctx.lineTo(data.player1.x, data.player1.y + 80);// ebar body line ta komor obdhi kete neoya holo
//pa t a   
//pa
     ctx.moveTo(data.player1.x, data.player1.y + 80);
     ctx.lineTo(data.player1.x - 20, data.player1.y + 130)
     //dan 
     ctx.moveTo(data.player1.x, data.player1.y + 80);
     ctx.lineTo(data.player1.x + 20, data.player1.y + 130); 

//   HAT TA 
//BAM HAT 
     ctx.moveTo(data.player1.x, data.player1.y + 40);
     ctx.lineTo(data.player1.x - 30, data.player1.y + 60);

//DAN HAT 
     ctx.moveTo(data.player1.x, data.player1.y + 40);
     ctx.lineTo(data.player1.x + 30, data.player1.y + 60);
ctx.stroke();
     //player 2

     ctx.fillStyle="blue";// lal color er  putul hobemulto tulir color lal kore nilam 
    ctx.beginPath();// eta diye bolaam amra nutun kichua ka huur korchi  eta thik bujhlam n akeno but eta bojhar dporkar be  mone hoche na 
    ctx.arc(data.player2.x, data.player2.y, 20, 0, Math.PI * 2); // Draw player 1 as a circle redius 20 o deg theke 360 obdhi dag
    ctx.fill();// et korchi solid math asolid color e bhosa circle e r jono
//body ta 
     //jehetu normal line lagbe tai strockstyel
     ctx.strokeStyle="blue"
     ctx.lineWidth=5;//lene ta 5 pixel mota 
     ctx.beginPath();
     ctx.moveTo(data.player2.x, data.player2.y + 20)//kono dag na ke te oi jagay turtle ta niye jete ms trutle er pen up ermot
     ctx.lineTo(data.player2.x, data.player2.y + 80);// ebar body line ta komor obdhi kete neoya holo
//pa t a   
//ba 
     ctx.moveTo(data.player2.x, data.player2.y + 80);
     ctx.lineTo(data.player2.x - 20, data.player2.y + 130)
     //dan 
     ctx.moveTo(data.player2.x, data.player2.y + 80);
     ctx.lineTo(data.player2.x + 20, data.player2.y + 130); 
//HAT 
//BA HAT
     ctx.moveTo(data.player2.x, data.player2.y + 40);
     ctx.lineTo(data.player2.x - 30, data.player2.y + 60);

//DAN HAT 
     ctx.moveTo(data.player2.x, data.player2.y + 40);
     ctx.lineTo(data.player2.x + 30, data.player2.y + 60);

//line gulo canvas e dekhar order
    ctx.stroke();
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