from flask import Flask, render_template, request, redirect, url_for, abort, send_from_directory
from flask_socketio import SocketIO, join_room, leave_room
from char import Body, MAX_HEALTH
import compiler
from engine import GameEngine
from bot import BattleBot
import os
import json
import time 
import threading
import re
import logging
import secrets

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("stickman_battle.game")

ROOM_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,24}$')
MAX_ROOMS = 100

app = Flask(__name__)

# Secure yet flexible CORS configuration (supports localhost, 127.0.0.1, LAN IPs & Render)
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS")
if ALLOWED_ORIGINS:
    if ALLOWED_ORIGINS.strip() == "*":
        cors_origins = "*"
    else:
        cors_origins = [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip()]
else:
    LOCAL_ORIGIN_RE = re.compile(r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$")
    ITCH_ORIGIN_RE = re.compile(r"^https?://([a-zA-Z0-9-]+\.)*(itch\.io|itch\.zone|hwcdn\.net)(:\d+)?$")
    def check_cors_origin(origin):
        if not origin or origin == "null":
            return True
        if LOCAL_ORIGIN_RE.match(origin):
            return True
        if origin == "https://stickman-battle.onrender.com":
            return True
        if ITCH_ORIGIN_RE.match(origin):
            return True
        return False
    cors_origins = check_cors_origin

socketio = SocketIO(app, async_mode='threading', cors_allowed_origins=cors_origins)

@app.after_request
def add_security_and_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin and check_cors_origin(origin):
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    # Prevent X-Frame-Options from blocking Itch.io iframe embed
    response.headers.pop('X-Frame-Options', None)
    return response

class GameRoom:
    def __init__(self, room_id):
        self.room_id = room_id
        self.player1 = Body(name="Fighter1", x=200, y=300, direction=1)
        self.player2 = Body(name="Fighter2", x=600, y=300, direction=-1)
        self.engine = GameEngine()
        self.connected_players = set()
        self.sid_to_player = {}
        self.is_match_active = False
        self.pending_disconnects = {}
        self.last_activity = time.time()
        self.player_tokens = {
            1: secrets.token_urlsafe(24),
            2: secrets.token_urlsafe(24),
        }
        self.is_bot_room = False
        self.bot_difficulty = None
        self.bot = None
        self.engine.add_player(self.player1, self.player2)

    def reset_match(self):
        self.last_activity = time.time()
        # Reset Player 1
        self.player1.heart = MAX_HEALTH
        self.player1.energy = 100
        self.player1.max_energy = 100
        self.player1.x = 200
        self.player1.target_x = 200
        self.player1.y = 300
        self.player1.target_y = 470
        self.player1.speed_x = 4
        self.player1.jump_pixel = 0
        self.player1.direction = 1
        self.player1.crouch_timer = 0
        self.player1.barrier_timer = 0
        self.player1.dome_timer = 0
        self.player1.barrier_power = 1
        self.player1.dome_power = 1
        self.player1.cast_timer = 0
        self.player1.has_sword = True
        self.player1.pending_spells = []
        if hasattr(self.player1, 'action_queue') and self.player1.action_queue:
            self.player1.action_queue.clear()
        else:
            self.player1.action_queue = []
        if hasattr(self.player1, 'sword'):
            self.player1.sword.attack_state = 0
            self.player1.sword.sword_angle = 0
            self.player1.sword.target_angle = 0
            self.player1.sword.has_hit = False
            self.player1.sword.is_heavy = False
            self.player1.sword.is_swing = False
        if hasattr(self.player1, 'shield'):
            self.player1.shield.shield_angel = 45
            self.player1.shield.block_timer = 0
        self.player1.speech_text = ""
        self.player1.speech_timer = 0
        self.player1.pending_question = None

        # Reset Player 2
        self.player2.heart = MAX_HEALTH
        self.player2.energy = 100
        self.player2.max_energy = 100
        self.player2.x = 600
        self.player2.target_x = 600
        self.player2.y = 300
        self.player2.target_y = 470
        self.player2.speed_x = 4
        self.player2.jump_pixel = 0
        self.player2.direction = -1
        self.player2.crouch_timer = 0
        self.player2.barrier_timer = 0
        self.player2.dome_timer = 0
        self.player2.barrier_power = 1
        self.player2.dome_power = 1
        self.player2.cast_timer = 0
        self.player2.has_sword = True
        self.player2.pending_spells = []
        if hasattr(self.player2, 'action_queue') and self.player2.action_queue:
            self.player2.action_queue.clear()
        else:
            self.player2.action_queue = []
        if hasattr(self.player2, 'sword'):
            self.player2.sword.attack_state = 0
            self.player2.sword.sword_angle = 0
            self.player2.sword.target_angle = 0
            self.player2.sword.has_hit = False
            self.player2.sword.is_heavy = False
            self.player2.sword.is_swing = False
        if hasattr(self.player2, 'shield'):
            self.player2.shield.shield_angel = 45
            self.player2.shield.block_timer = 0
        self.player2.speech_text = ""
        self.player2.speech_timer = 0
        self.player2.pending_question = None
        self.pending_disconnects.clear()
        self.player1_emergency_cooldowns = {}
        self.player2_emergency_cooldowns = {}
        self.engine.spells = []
        if getattr(self, 'is_bot_room', False) and getattr(self, 'bot', None):
            self.bot.reset()

rooms = {}
sid_auth = {} # sid -> {'room_id': str, 'player_id': int}

def get_or_create_room(room_id):
    if not ROOM_ID_PATTERN.match(room_id):
        logger.warning(f"Invalid room_id rejected by pattern: '{room_id}'")
        return None
    if room_id not in rooms:
        if len(rooms) >= MAX_ROOMS:
            logger.warning(f"Server room capacity reached ({len(rooms)}/{MAX_ROOMS}). Cannot create room '{room_id}'.")
            return None
        rooms[room_id] = GameRoom(room_id)
        logger.info(f"Created new room: [{room_id}] (Active rooms: {len(rooms)})")
    return rooms[room_id]

def create_private_room():
    """Create a room with unpredictable ID and per-player invite tokens."""
    while True:
        room_id = f"room_{secrets.token_hex(6)}"
        if room_id not in rooms:
            room = get_or_create_room(room_id)
            if room is not None:
                return room
            return None

def get_player_for_token(room, token):
    if not room or not token:
        return None
    for player_id, player_token in room.player_tokens.items():
        if secrets.compare_digest(player_token, token):
            return player_id
    return None

@app.route('/')
def lobby_menu():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.png', mimetype='image/png')

@app.route('/info')
def game_info():
    info_data = {}
    info_path = os.path.join(os.path.dirname(__file__), 'info.json')
    if os.path.exists(info_path):
        try:
            with open(info_path, 'r', encoding='utf-8') as f:
                info_data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read info.json: {e}")
    return render_template('info.html', info=info_data)

@app.route('/bot/<difficulty>')
def play_vs_bot(difficulty):
    diff = 'hard' if str(difficulty).lower() == 'hard' else 'easy'
    room = create_private_room()
    if room is None:
        abort(503, "Server room limit reached. Please try again later.")
    room.is_bot_room = True
    room.bot_difficulty = diff
    room.bot = BattleBot(diff)
    room.player2.name = f"Bot ({diff.capitalize()})"
    room.connected_players.add(2)
    return redirect(url_for('join_room_game', room_id=room.room_id,
                            token=room.player_tokens[1]))

@app.route('/player1')
def host_game():
    room = create_private_room()
    if room is None:
        abort(503, "Server room limit reached. Please try again later.")
    return redirect(url_for('join_room_game', room_id=room.room_id,
                            token=room.player_tokens[1]))

@app.route('/player2')
def join_game():
    abort(403, "Player 2 must use the private invite link from Player 1.")

@app.route('/room/<room_id>')
def join_room_game(room_id):
    if not ROOM_ID_PATTERN.match(room_id):
        abort(400, "Invalid Room ID format. Use 3-24 alphanumeric characters, underscores, or hyphens.")
    room = rooms.get(room_id)
    token = request.args.get('token', '')

    # A private token identifies either reserved slot. For convenience, a bare
    # room code is also allowed to join the open Player 2 slot. Explicit role
    # query parameters are never trusted and remain rejected without a token.
    if room is None:
        abort(403, "Unknown room. Create a room from the lobby or use a private invite link.")

    if token:
        assigned_player = get_player_for_token(room, token)
        if assigned_player is None:
            abort(403, "This room requires a valid private invite link.")
        room_token = token
    elif request.args.get('player'):
        abort(403, "This room requires a valid private invite link.")
    else:
        # Public room-code join targets Player 2 slot only if not already occupied
        # by a connected human player (or if it's a bot room that can be taken over).
        if 2 in room.connected_players and not getattr(room, 'is_bot_room', False):
            abort(403, "This match is already in progress with 2 players. Create a new room from the lobby.")
        assigned_player = 2
        room_token = room.player_tokens[2]

    return render_template(
        'game.html',
        room_id=room_id,
        player_id=assigned_player,
        room_token=room_token,
        player2_token=room.player_tokens[2],
        is_bot_room=getattr(room, 'is_bot_room', False),
        bot_difficulty=getattr(room, 'bot_difficulty', '') or '',
    )

# --- SOCKET.IO EVENT HANDLERS WITH STRICT AUTHENTICATION ---

@socketio.on('player_joined')
def handle_player_join(data):
    if not isinstance(data, dict):
        logger.warning(f"Malformed player_joined payload from {request.sid}")
        return
    
    room_id = str(data.get('room_id', '')).strip()
    if not ROOM_ID_PATTERN.match(room_id):
        logger.warning(f"Rejected join with invalid room_id: '{room_id}'")
        return
        
    token = str(data.get('token', '')).strip()
    room = rooms.get(room_id)
    player_id = get_player_for_token(room, token)
    if player_id is None:
        logger.warning(f"Rejected join with invalid room token from {request.sid}")
        return

    # Evict any previous/stale socket for this authenticated player slot (seamless reconnects/tab switch)
    for old_sid, pid in list(room.sid_to_player.items()):
        if pid == player_id and old_sid != request.sid:
            logger.info(f"Room [{room_id}] -> Evicting stale socket {old_sid} for Player {player_id} in favor of new connection {request.sid}")
            sid_auth.pop(old_sid, None)
            room.sid_to_player.pop(old_sid, None)

    join_room(room_id)
    # Register SID authentication binding
    sid_auth[request.sid] = {'room_id': room_id, 'player_id': player_id}
    room.sid_to_player[request.sid] = player_id
    room.connected_players.add(player_id)
    room.last_activity = time.time()
    
    if player_id in room.pending_disconnects:
        del room.pending_disconnects[player_id]
        logger.info(f"Room [{room_id}] -> Player {player_id} reconnected within grace period.")
        
    logger.info(f"Room [{room_id}] -> Player {player_id} authenticated and joined. Connected: {room.connected_players}")
    
    if getattr(room, 'is_bot_room', False):
        if player_id == 2:
            # A real human connected as Player 2!
            # Seamlessly retire the bot and promote this match to a 1v1 PvP duel!
            logger.info(f"Room [{room_id}] -> Human Player 2 joined! Converting bot room to 1v1 PvP duel.")
            room.is_bot_room = False
            room.bot = None
            room.player2.name = "Fighter2"
            room.reset_match()
            room.is_match_active = True
            socketio.emit('bot_replaced_by_human', {
                'message': 'A friend joined the arena! The bot has stepped aside. Match converted to 1v1 PvP duel!'
            }, to=room_id)
            socketio.emit('match_start', to=room_id)
            return
        else:
            room.connected_players.add(2)
            room.is_match_active = True
            logger.info(f"Room [{room_id}] -> Solo match started against {room.bot_difficulty} bot!")
            socketio.emit('match_start', to=room_id)
            return
    elif room.is_match_active:
        # Match is already active; immediately unlock the returning/reconnecting player's Run button
        logger.info(f"Room [{room_id}] -> Reconnected Player {player_id} receiving match_start immediately.")
        socketio.emit('match_start', to=request.sid)
    elif 1 in room.connected_players and 2 in room.connected_players:
        room.is_match_active = True
        logger.info(f"Room [{room_id}] -> Both players connected! Starting match...")
        socketio.emit('match_start', to=room_id)

@socketio.on('run_code')
def code_handler(data):
    # Verify SID authentication binding
    auth = sid_auth.get(request.sid)
    if not auth:
        logger.warning(f"Rejected unauthenticated run_code attempt from sid {request.sid}")
        socketio.emit('code_error', {'error': 'Reconnecting to room... please click Run again in 1s.'}, to=request.sid)
        return
        
    room_id = auth['room_id']
    player_id = auth['player_id'] # Enforce authenticated player_id, reject client forgery
    
    room = rooms.get(room_id)
    if not room:
        socketio.emit('code_error', {'error': 'Room not found. Please return to lobby.'}, to=request.sid)
        return
        
    # Auto-activate match if both players or bot are in the room
    if not room.is_match_active:
        if (1 in room.connected_players and 2 in room.connected_players) or getattr(room, 'is_bot_room', False):
            logger.info(f"Room [{room_id}] -> Auto-activating match upon code run.")
            room.is_match_active = True
            socketio.emit('match_start', to=room_id)
        else:
            logger.info(f"Room [{room_id}] -> Match not active (waiting for Player 2). Code run blocked.")
            socketio.emit('code_error', {'error': 'Waiting for Player 2 to join the duel!'}, to=request.sid)
            return
        
    if room.player1.heart <= 0 or room.player2.heart <= 0:
        logger.info(f"Room [{room_id}] -> Match game over. Rematch required.")
        socketio.emit('code_error', {'error': 'Match is over! Click Play Again below to rematch.'}, to=request.sid)
        return
        
    if not isinstance(data, dict):
        return
        
    raw_code = str(data.get('code', ''))
    if len(raw_code) > 2000:
        raw_code = raw_code[:2000]
        
    room.last_activity = time.time()
    logger.info(f"Room [{room_id}] -> Authorized Player {player_id} Code Execution.")
    
    target_player = room.player1 if player_id == 1 else room.player2
    enemy_player = room.player2 if player_id == 1 else room.player1
    target_player.last_error = None
    res = compiler.compiler(code=raw_code, current_player=target_player, enemy_player=enemy_player)
    last_err = getattr(target_player, 'last_error', None)
    if isinstance(res, dict) and not res.get('success'):
        err_msg = res.get('error') or last_err or "Compilation error"
        socketio.emit('code_error', {'error': str(err_msg)}, to=request.sid)
    elif last_err:
        socketio.emit('code_error', {'error': str(last_err)}, to=request.sid)
    else:
        socketio.emit('code_success', {'message': 'Code executed successfully!'}, to=request.sid)

@socketio.on('emergency_action')
def handle_emergency_action(data):
    auth = sid_auth.get(request.sid)
    if not auth:
        logger.warning(f"Rejected unauthenticated emergency_action from sid {request.sid}")
        return
        
    room_id = auth['room_id']
    player_id = auth['player_id']
    room = rooms.get(room_id)
    if not room or not room.is_match_active:
        return
        
    if room.player1.heart <= 0 or room.player2.heart <= 0:
        return
        
    if not isinstance(data, dict):
        return
        
    action = data.get('action') # 'shield' or 'dodge'
    if action not in ('shield', 'dodge'):
        return

    now = time.time()
    COOLDOWN_SEC = 8.0
    attr_name = f"player{player_id}_emergency_cooldowns"
    cooldown_dict = getattr(room, attr_name, None)
    if cooldown_dict is None:
        cooldown_dict = {}
        setattr(room, attr_name, cooldown_dict)

    last_used = cooldown_dict.get(action, 0)
    if now - last_used < COOLDOWN_SEC:
        rem = round(COOLDOWN_SEC - (now - last_used), 1)
        socketio.emit('emergency_cooldown', {'action': action, 'remaining': rem}, to=request.sid)
        return

    target_player = room.player1 if player_id == 1 else room.player2
    cost = 15
    if getattr(target_player, 'energy', 100) < cost:
        socketio.emit('emergency_rejected', {
            'action': action, 
            'reason': 'Not enough energy! (15⚡ required)'
        }, to=request.sid)
        return

    # Deduct energy & update cooldown
    target_player.energy = max(0, target_player.energy - cost)
    cooldown_dict[action] = now
    room.last_activity = now

    if action == 'shield':
        if hasattr(target_player, 'shield'):
            target_player.shield.block()
        logger.info(f"Room [{room_id}] -> Player {player_id} used Emergency Shield.")
    elif action == 'dodge':
        target_player.speed_x = 10
        target_player.target_x -= (10 * 3 * target_player.direction)
        logger.info(f"Room [{room_id}] -> Player {player_id} used Emergency Dodge.")

    socketio.emit('emergency_used', {'action': action, 'cooldown': COOLDOWN_SEC}, to=request.sid)

@socketio.on('restart_game')
def handle_restart_game(data=None):
    auth = sid_auth.get(request.sid)
    if not auth:
        logger.warning(f"Rejected unauthenticated restart_game attempt from sid {request.sid}")
        return
    room_id = auth['room_id']
    room = rooms.get(room_id)
    if not room:
        return
    room.last_activity = time.time()
    logger.info(f"Room [{room_id}] -> Authorized rematch requested by Player {auth['player_id']}.")
    room.reset_match()
    if getattr(room, 'is_bot_room', False):
        room.connected_players.add(2)
        room.is_match_active = True
    elif 1 in room.connected_players and 2 in room.connected_players:
        room.is_match_active = True
    socketio.emit('game_restarted', to=room_id)
    if room.is_match_active:
        socketio.emit('match_start', to=room_id)

@socketio.on('reply_input')
def handle_reply_input(data):
    auth = sid_auth.get(request.sid)
    if not auth:
        logger.warning(f"Rejected unauthenticated reply_input from sid {request.sid}")
        return
    room_id = auth['room_id']
    from_player = auth['player_id'] # Enforce authentic sender
    room = rooms.get(room_id)
    if not room or not isinstance(data, dict):
        return
    reply = str(data.get('reply', ''))[:40].strip()
    if not reply:
        return
    room.last_activity = time.time()
    target_player = room.player1 if from_player == 1 else room.player2
    target_player.speech_text = reply
    target_player.speech_timer = 90
    logger.info(f"Room [{room_id}] -> Player {from_player} replied: '{reply}'")

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    auth = sid_auth.pop(sid, None)
    if not auth:
        return
    room_id = auth['room_id']
    player_id = auth['player_id']
    room = rooms.get(room_id)
    if not room:
        return
    room.sid_to_player.pop(sid, None)
    if player_id not in room.sid_to_player.values():
        room.pending_disconnects[player_id] = time.time()
        logger.info(f"Room [{room_id}] -> Player {player_id} disconnected. Grace period (30s) started...")
        socketio.emit('player_reconnecting', {'player_id': player_id}, to=room_id)

# --- 60 FPS BACKGROUND GAME SIMULATION & GARBAGE COLLECTION LOOP ---
bg_thread = None
bg_lock = threading.Lock()

def _get_public_speech(player):
    if getattr(player, 'speech_timer', 0) <= 0:
        return ""
    text = str(getattr(player, 'speech_text', ''))
    if text.startswith(('Error:', 'Syntax Error', 'Security:')):
        return "" # Keep private in-editor diagnostics; do not broadcast error stack to opponent
    return text

def game_loop():
    last_cleanup_time = time.time()
    while True:
        try:
            now = time.time()
            # Periodic room garbage collection (every 60 seconds)
            if now - last_cleanup_time > 60.0:
                last_cleanup_time = now
                for rid, r in list(rooms.items()):
                    no_connected = (len(r.connected_players) == 0 and len(r.pending_disconnects) == 0)
                    is_stale = (now - r.last_activity > 900) # 15 minutes inactive
                    is_abandoned = (now - r.last_activity > 1800) # 30 minutes abandoned
                    if (no_connected and is_stale) or is_abandoned:
                        logger.info(f"Garbage collecting inactive room [{rid}]")
                        del rooms[rid]

            # Update all active rooms
            for room in list(rooms.values()):
                try:
                    if room.is_match_active or room.connected_players or room.pending_disconnects:
                        if getattr(room, 'is_bot_room', False) and room.is_match_active and getattr(room, 'bot', None):
                            try:
                                room.bot.tick(room)
                            except Exception as be:
                                logger.error(f"Bot tick error in room {room.room_id}: {be}")
                        room.engine.update()
                        
                        # Opponent dialogue question dispatch
                        if getattr(room.player1, 'pending_question', None):
                            q = room.player1.pending_question
                            room.player1.pending_question = None
                            socketio.emit('prompt_opponent_input', {'from_player': 1, 'prompt': q}, to=room.room_id)
                        if getattr(room.player2, 'pending_question', None):
                            q = room.player2.pending_question
                            room.player2.pending_question = None
                            socketio.emit('prompt_opponent_input', {'from_player': 2, 'prompt': q}, to=room.room_id)
                        
                        # Grace period expiration
                        for pid, disc_time in list(room.pending_disconnects.items()):
                            if pid in room.sid_to_player.values():
                                del room.pending_disconnects[pid]
                            elif now - disc_time > 30.0:
                                del room.pending_disconnects[pid]
                                room.connected_players.discard(pid)
                                room.is_match_active = False
                                room.reset_match()
                                logger.info(f"Room [{room.room_id}] -> Player {pid} grace period expired.")
                                socketio.emit('player_left', {'player_id': pid}, to=room.room_id)
                        
                        # 60 FPS state broadcast with dynamic weapon lengths & states
                        data_to_send = {
                            'is_match_active': getattr(room, 'is_match_active', False),
                            'player1': {
                                'x': room.player1.x,
                                'y': room.player1.y,
                                'direction': room.player1.direction,
                                'sword_angle': room.player1.sword.sword_angle,
                                'sword_length': getattr(room.player1.sword, 'sword_length', 50),
                                'shield_angle': room.player1.shield.shield_angel,
                                'shield_length': getattr(room.player1.shield, 'shield_length', 40),
                                'is_blocking': room.player1.shield.block_timer > 0,
                                'is_crouching': getattr(room.player1, 'crouch_timer', 0) > 0,
                                'has_barrier': getattr(room.player1, 'barrier_timer', 0) > 0,
                                'has_dome': getattr(room.player1, 'dome_timer', 0) > 0,
                                'barrier_power': getattr(room.player1, 'barrier_power', 1),
                                'dome_power': getattr(room.player1, 'dome_power', 1),
                                'has_sword': getattr(room.player1, 'has_sword', True),
                                'is_heavy': getattr(room.player1.sword, 'is_heavy', False),
                                'is_swing': getattr(room.player1.sword, 'is_swing', False),
                                'attack_state': getattr(room.player1.sword, 'attack_state', 0),
                                'heart': room.player1.heart,
                                'max_health': MAX_HEALTH,
                                'energy': round(getattr(room.player1, 'energy', 100), 1),
                                'max_energy': getattr(room.player1, 'max_energy', 100),
                                'speech': _get_public_speech(room.player1)
                            },
                            'player2': {
                                'x': room.player2.x,
                                'y': room.player2.y,
                                'direction': room.player2.direction,
                                'sword_angle': room.player2.sword.sword_angle,
                                'sword_length': getattr(room.player2.sword, 'sword_length', 50),
                                'shield_angle': room.player2.shield.shield_angel,
                                'shield_length': getattr(room.player2.shield, 'shield_length', 40),
                                'is_blocking': room.player2.shield.block_timer > 0,
                                'is_crouching': getattr(room.player2, 'crouch_timer', 0) > 0,
                                'has_barrier': getattr(room.player2, 'barrier_timer', 0) > 0,
                                'has_dome': getattr(room.player2, 'dome_timer', 0) > 0,
                                'barrier_power': getattr(room.player2, 'barrier_power', 1),
                                'dome_power': getattr(room.player2, 'dome_power', 1),
                                'has_sword': getattr(room.player2, 'has_sword', True),
                                'is_heavy': getattr(room.player2.sword, 'is_heavy', False),
                                'is_swing': getattr(room.player2.sword, 'is_swing', False),
                                'attack_state': getattr(room.player2.sword, 'attack_state', 0),
                                'heart': room.player2.heart,
                                'max_health': MAX_HEALTH,
                                'energy': round(getattr(room.player2, 'energy', 100), 1),
                                'max_energy': getattr(room.player2, 'max_energy', 100),
                                'speech': _get_public_speech(room.player2)
                            },
                            'spells': [
                                {
                                    'type': s['type'],
                                    'x': round(s.get('x', s.get('target_x', 0)), 1),
                                    'y': round(s.get('y', 470), 1),
                                    'dir': s.get('dir', 1),
                                    't': s.get('t', 0),
                                    'power': s.get('power', 1),
                                    'origin_x': round(s.get('origin_x', s.get('x', 0)), 1),
                                    'origin_y': round(s.get('origin_y', s.get('y', 470)), 1)
                                }
                                for s in getattr(room.engine, 'spells', [])
                            ]
                        }
                        socketio.emit('update_game_gui', data_to_send, to=room.room_id)
                except Exception as re:
                    logger.error(f"Error updating room {getattr(room, 'room_id', 'unknown')}: {re}", exc_info=True)
        except Exception:
            logger.exception("Unexpected error in 60 FPS game loop:")
        socketio.sleep(1/60)

def ensure_game_loop():
    global bg_thread
    with bg_lock:
        if bg_thread is None:
            bg_thread = socketio.start_background_task(game_loop)

@socketio.on('connect')
def handle_connect():
    ensure_game_loop()

if __name__ == '__main__':
    compiler.warm_sandbox()
    ensure_game_loop()
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
