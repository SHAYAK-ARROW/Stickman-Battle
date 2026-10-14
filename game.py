from flask import Flask, render_template, request
from flask_socketio import SocketIO,join_room,leave_room # acha ei duto holo flask lib er readuy made duto fumcyon
# acha jana thaklo amder je ekta module theke aldakroe fuction o impoer kor ajay 
from char import Body
import compiler
from engine import GameEngine
import os
import time 
import threading





app=Flask(__name__)#ekta flask app banalam eta mainly web server
socketio=SocketIO(app, async_mode='threading', cors_allowed_origins="*")#ekta socketio banalam eta mainly web server er sathe client er communication er jono mane ekta conctoin feet korlam

class GameRoom:# eta ekek ta room  class  eta bsicaly room guro data rajb e ami jani na eto kom jinins ner commen trochi keno?
    
    def __init__(self,room_id):
        self.room_id=room_id
        self.player1 = Body(name="Fighter1",x=200, y=300, direction=1)
        self.player2 = Body(name="Fighter2",x=600, y=300, direction=-1)

        # engine baniye palyer dhokano holo
        self.engine = GameEngine()
        self.connected_players=set()#sey nilam jate repet na hoy 
        self.sid_to_player = {} # socket id er sathe player track korar jono
        self.is_match_active = False # dujon player game e na asha porjonto kew move korte parbena
        self.engine.add_player(self.player1,self.player2)

    def reset_match(self):
        # player 1 ke ager jaygay firiye deoya
        self.player1.heart = 5
        self.player1.x = 200
        self.player1.target_x = 200
        self.player1.y = 300
        self.player1.target_y = 470
        self.player1.speed_x = 4
        self.player1.jump_pixel = 0
        self.player1.direction = 1
        if hasattr(self.player1, 'action_queue') and self.player1.action_queue:
            self.player1.action_queue.clear()
        else:
            self.player1.action_queue = []
        if hasattr(self.player1, 'sword'):
            self.player1.sword.attack_state = 0
            self.player1.sword.sword_angle = 0
            self.player1.sword.target_angle = 0
            self.player1.sword.has_hit = False
        if hasattr(self.player1, 'shield'):
            self.player1.shield.shield_angel = 45
            self.player1.shield.block_timer = 0

        # player 2 ke ager jaygay firiye deoya
        self.player2.heart = 5
        self.player2.x = 600
        self.player2.target_x = 600
        self.player2.y = 300
        self.player2.target_y = 470
        self.player2.speed_x = 4
        self.player2.jump_pixel = 0
        self.player2.direction = -1
        if hasattr(self.player2, 'action_queue') and self.player2.action_queue:
            self.player2.action_queue.clear()
        else:
            self.player2.action_queue = []
        if hasattr(self.player2, 'sword'):
            self.player2.sword.attack_state = 0
            self.player2.sword.sword_angle = 0
            self.player2.sword.target_angle = 0
            self.player2.sword.has_hit = False
        if hasattr(self.player2, 'shield'):
            self.player2.shield.shield_angel = 45
            self.player2.shield.block_timer = 0

rooms={}
def get_or_create_room(room_id):#eta besicaly room banabe mane room an thakle room banabe thakle banabe na 
    if room_id not in rooms:# jodi na thke tahole ekhane baniye nebe 
        rooms[room_id]=GameRoom(room_id)
    return rooms[room_id]

@app.route('/')
def lobby_menu():
    return render_template('index.html')

@app.route('/player1')
def host_game():
    return render_template('game.html', player_id=1)

@app.route('/player2')
def join_game():
    return render_template('game.html', player_id=2)

@app.route('/room/<room_id>')#<> eta holon onke ta f string er  moto jet aurl e vaiable er man bosai 
def join_room_game(room_id):
    room = get_or_create_room(room_id)
    # prothom jon ashle Player 1, tarporer jon ashle Player 2
    assigned_player = 1 if 1 not in room.connected_players else 2
    return render_template('game.html', room_id=room_id, player_id=assigned_player)


@socketio.on('run_code')# templet er name hobe run code okleta title er jono just caption oi caption thakle or nocher function triger hobe 
def code_handeler(data): 
     # data theke room_id ber kore oi room khuje nilam
    room_id = data.get('room_id', 'default')
    room = get_or_create_room(room_id)
    # oi room e dujon player ready na thakle code run bondho
    if not room.is_match_active:
        print(f"Room [{room_id}] -> Dujon player ready nei! Code run kora jabe na.")
        return
    print(f"Room [{room_id}] -> Player {data['player_id']} Code Run!")
    
    # oi room er player1 naki player2 seta thik kore compiler ke dilam
    target_player = room.player1 if data['player_id'] == 1 else room.player2
    compiler.compiler(code=data['code'], current_player=target_player)
    # eta holo player join korar function
@socketio.on('player_joined')
def handle_player_join(data):
    # data theke room_id ber korlam (na thakle defult' dhorbo)
    room_id = data.get('room_id', 'default')
    room = get_or_create_room(room_id)
    
    # ai connection take oi specific room e dhukiye dilambut somoa hobe ekhane slow hot pare bodahy 

    join_room(room_id)# paetr der room e dhokano 
    #acha amra dict use krochi tai duplicate room sombhob na  
    player_id = data.get('player_id')
    if player_id:
        # ekhon global sid r connected_players na, ei room er bhetor track hobe
        room.sid_to_player[request.sid] = player_id
        room.connected_players.add(player_id)
        print(f"Room [{room_id}] -> Player {player_id} joined! Connected: {room.connected_players}")
        
        # oi room e jodi 1 ar 2 dujonei ready hoy, tobe shudhu oi room e match start bolbo!
        if 1 in room.connected_players and 2 in room.connected_players:
            room.is_match_active = True
            print(f"Room [{room_id}] -> Both players in! Starting match...")
            socketio.emit('match_start', to=room_id)

# keu jodi game theke beriye jay ba browser tab kete dey tobe eta cholbe
@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    # shob room e khuje dekhbo kon room theke player beriye geche
    for room in list(rooms.values()):
        if sid in room.sid_to_player:
            player_id = room.sid_to_player.pop(sid)
            if player_id not in room.sid_to_player.values():
                room.connected_players.discard(player_id)
                room.is_match_active = False
                room.reset_match() # oi nirdishto room reset holo
                print(f"Room [{room.room_id}] -> Player {player_id} left!")
                socketio.emit('player_left', {'player_id': player_id}, to=room.room_id)

# frontend theke restart button e chap dile eta cholbe
@socketio.on('restart_game')
def handle_restart_game(data=None):
    room_id = data.get('room_id', 'default') if isinstance(data, dict) else 'default'
    room = get_or_create_room(room_id)
    print(f"Room [{room_id}] -> Match rematch/restart hocche...")
    room.reset_match()
    socketio.emit('game_restarted', to=room_id)

bg_thread = None
bg_lock = threading.Lock()

def game_loop():
    while True:
        try:
            # shob active room er engine update kora hocche
            for room in list(rooms.values()):
                if room.is_match_active or room.connected_players:
                    room.engine.update()
                    
                    data_to_send = {
                        'player1': {
                            'x': room.player1.x,
                            'y': room.player1.y,
                            'direction': room.player1.direction,
                            'sword_angle': room.player1.sword.sword_angle,
                            'shield_angle': room.player1.shield.shield_angel,
                            'is_blocking': room.player1.shield.block_timer > 0,
                            'heart': room.player1.heart
                        },
                        'player2': {
                            'x': room.player2.x,
                            'y': room.player2.y,
                            'direction': room.player2.direction,
                            'sword_angle': room.player2.sword.sword_angle,
                            'shield_angle': room.player2.shield.shield_angel,
                            'is_blocking': room.player2.shield.block_timer > 0,
                            'heart': room.player2.heart
                        }
                    }
                    # shudhu oi nirdishto room er player der kache update pathano holo
                    socketio.emit('update_game_gui', data_to_send, to=room.room_id)
        except Exception:
            pass
        socketio.sleep(1/60) # 60 FPS

def ensure_game_loop():
    global bg_thread
    with bg_lock:
        if bg_thread is None:
            bg_thread = socketio.start_background_task(game_loop)

@socketio.on('connect')
def handle_connect():
    ensure_game_loop()

# gunicorn o local python - dujaygay e background loop chalu kora
ensure_game_loop()

if __name__ == '__main__':
    # render er jono dinamic port number 
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)