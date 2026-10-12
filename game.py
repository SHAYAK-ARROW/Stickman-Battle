from flask import Flask,render_template
from flask_socketio import SocketIO
from char import Body
import compiler
from engine import GameEngine

import time 
import threading





app=Flask(__name__)#ekta flask app banalam eta mainly web server
socketio=SocketIO(app)#ekta socketio banalam eta mainly web server er sathe client er communication er jono mane ekta conctoin feet korlam 

player1 = Body(name="Fighter1",x=200, y=300, direction=1)
player2 = Body(name="Fighter2",x=600, y=300, direction=-1)

# engine baniye palyer dhokano holo
engine = GameEngine()
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
                'shield_angle':player1.shield.shield_angel
            },
            'player2': {
                'x': player2.x,
                'y': player2.y,
                'direction': player2.direction,
                'sword_angle': player2.sword.sword_angle,
                'shield_angle':player2.shield.shield_angel
            }

        }
        socketio.emit('update_game_gui',data_to_send)# dat gui kle paytha no holo front end ke 
        socketio.sleep(1/60)#    60 FPS

if __name__ == '__main__':
    #game_thread = threading.Thread(target=game_loop,daemon=True)# gui ta sub thred back end main thred e gui freje hoe samlano soja hobe ete 
 #demon true kaorn server bondo korle jeno sob kichu abr ager oboshay fire jay 
    #game_thread.start()
    socketio.start_background_task(game_loop)


  
    socketio.run(app, host="0.0.0.0", port=5000, debug=True,use_reloader=False)