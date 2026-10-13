# eventlet monkey patch jate gunicorn o socketio smooth chole
try:
    import eventlet
    eventlet.monkey_patch()
except Exception:
    pass
#eta ai er kora ami kichu jani na 
from flask import Flask,render_template
from flask_socketio import SocketIO
from char import Body
import compiler
from engine import GameEngine
import os
import time 
import threading





app=Flask(__name__)#ekta flask app banalam eta mainly web server
socketio=SocketIO(app, cors_allowed_origins="*")#ekta socketio banalam eta mainly web server er sathe client er communication er jono mane ekta conctoin feet korlam

player1 = Body(name="Fighter1",x=200, y=300, direction=1)
player2 = Body(name="Fighter2",x=600, y=300, direction=-1)

# engine baniye palyer dhokano holo
engine = GameEngine()
connected_players=set()#sey nilam jate repet na hoy 
engine.add_player(player1, player2)

@app.route('/')
def lobby_menu():
    return render_template('index.html')

@app.route('/player1')
def host_game():
    return render_template('game.html', player_id=1)

@app.route('/player2')
def join_game():
    return render_template('game.html', player_id=2)

    


@socketio.on('run_code')# templet er name hobe run code okleta title er jono just caption oi caption thakle or nocher function triger hobe 
def code_handeler(data): 
    print("Player ID:", data['player_id'], " | Code:", data['code'])
    compiler.compiler(code=data['code'],current_player= player1 if data['player_id']==1 else player2 )
    # eta hllo joiner fucntion 
@socketio.on('player_joined')
def handle_player_join(data):
    player_id = data.get('player_id')
    connected_players.add(player_id)
    print(f"Player {player_id} joined! Connected: {connected_players}")
    
    # dujonei game e ready  game start match start korchi oi set ta ei joni  chilo 
    if 1 in connected_players and 2 in connected_players:
        print("Both players are in! Starting match...")
        socketio.emit('match_start')

# game sesh hole abar reset korar function
def reset_match():
    # player1 ke ager jaygay firiye deoya
    player1.heart = 5
    player1.x = 200
    player1.target_x = 200
    player1.y = 300
    player1.target_y = 470
    player1.speed_x = 4
    player1.jump_pixel = 0
    player1.direction = 1
    if hasattr(player1, 'action_queue') and player1.action_queue:
        player1.action_queue.clear()
    else:
        player1.action_queue = []
    if hasattr(player1, 'sword'):
        player1.sword.attack_state = 0
        player1.sword.sword_angle = 0
        player1.sword.target_angle = 0
        player1.sword.has_hit = False
    if hasattr(player1, 'shield'):
        player1.shield.shield_angel = 45
        player1.shield.block_timer = 0

    # player2 ke ager jaygay firiye deoya
    player2.heart = 5
    player2.x = 600
    player2.target_x = 600
    player2.y = 300
    player2.target_y = 470
    player2.speed_x = 4
    player2.jump_pixel = 0
    player2.direction = -1
    if hasattr(player2, 'action_queue') and player2.action_queue:
        player2.action_queue.clear()
    else:
        player2.action_queue = []
    if hasattr(player2, 'sword'):
        player2.sword.attack_state = 0
        player2.sword.sword_angle = 0
        player2.sword.target_angle = 0
        player2.sword.has_hit = False
    if hasattr(player2, 'shield'):
        player2.shield.shield_angel = 45
        player2.shield.block_timer = 0

# frontend theke restart button e chap dile eta cholbe
@socketio.on('restart_game')
def handle_restart_game():
    print("Match rematch/restart hocche...")
    reset_match()
    socketio.emit('game_restarted')

def game_loop():
    while True:
        
        # engine ek update r daito dilam 
        engine.update()
        
        #debug [pprint]
        print(f"Player1 X: {player1.x}, Target: {player1.target_x}")
        # ami alda kroe dict banalam karon amr bojhar subodhar jono 
        data_to_send={
            'player1': {
                'x': player1.x,
                'y': player1.y,
                'direction': player1.direction,
                'sword_angle': player1.sword.sword_angle,
                'shield_angle':player1.shield.shield_angel,
                'heart': player1.heart # pl1 er koyta heart baki ache
            },
            'player2': {
                'x': player2.x,
                'y': player2.y,
                'direction': player2.direction,
                'sword_angle': player2.sword.sword_angle,
                'shield_angle':player2.shield.shield_angel,
                'heart': player2.heart # pl2 er koyta heart baki ache
            }

        }
        socketio.emit('update_game_gui',data_to_send)# dat gui kle paytha no holo front end ke 
        socketio.sleep(1/60)#    60 FPS

# gunicorn o local python - dujaygay e background loop chalu kora
socketio.start_background_task(game_loop)

if __name__ == '__main__':
    # render er jono dinamic port number 
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=True, use_reloader=False)