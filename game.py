from flask import Flask, render_template, request, redirect, url_for, abort, send_from_directory, jsonify, session
from flask_socketio import SocketIO, join_room
from char import Body, MAX_HEALTH
import compiler
from engine import GameEngine
from bot import BattleBot
from sace import SaceBattleBot
import os
import json
import gzip
import time 
import threading
import re
import logging
import secrets
import hmac
import hashlib

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("stickman_battle.game")

ROOM_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,24}$')
MAX_ROOMS = 100

COMPRESSIBLE_MIMETYPES = (
    'text/',
    'application/javascript',
    'application/x-javascript',
    'application/json',
    'application/xml',
    'image/svg+xml',
)

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 86400
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "stickman_battle_sace_v2_anti_cheat_secret_2026")
SECRET_KEY_BYTES = app.secret_key.encode('utf-8')

_ASSET_VERSION_CACHE = {}

def get_static_asset_version(filename):
    """Return short content hash cached by (mtime_ns, size) for automatic cache busting."""
    rel = filename.lstrip('/')
    full_path = os.path.join(app.root_path, 'static', rel)
    try:
        st = os.stat(full_path)
        sig = (st.st_mtime_ns, st.st_size)
        cached = _ASSET_VERSION_CACHE.get(rel)
        if cached and cached[0] == sig:
            return cached[1]
        with open(full_path, 'rb') as f:
            digest = hashlib.sha256(f.read()).hexdigest()[:8]
        _ASSET_VERSION_CACHE[rel] = (sig, digest)
        return digest
    except OSError:
        return "2.4"

@app.context_processor
def inject_asset_version_helper():
    return dict(asset_v=get_static_asset_version)

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

    # Long browser caching for static assets (versioned files cached for 1 year)
    if request.path.startswith('/static/') or request.path == '/favicon.ico':
        if request.args.get('v'):
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        else:
            response.headers.setdefault('Cache-Control', 'public, max-age=86400')

    # Built-in Gzip compression to cut HTML/CSS/JS bandwidth by ~70-80%
    if (
        response.status_code == 200
        and 'Content-Encoding' not in response.headers
        and 'gzip' in request.headers.get('Accept-Encoding', '').lower()
        and any((response.mimetype or '').startswith(m) for m in COMPRESSIBLE_MIMETYPES)
    ):
        response.direct_passthrough = False
        raw_body = response.get_data()
        if len(raw_body) >= 512:
            compressed = gzip.compress(raw_body, compresslevel=6)
            if len(compressed) < len(raw_body):
                response.set_data(compressed)
                response.headers['Content-Encoding'] = 'gzip'
                response.headers['Content-Length'] = str(len(compressed))
                response.vary.add('Accept-Encoding')

    return response

class GameRoom:
    def __init__(self, room_id):
        self.room_id = room_id
        self.player1 = Body(name="Fighter1", x=200, y=300, direction=1)
        self.player2 = Body(name="Fighter2", x=600, y=300, direction=-1)
        self.player1.target_y = 470
        self.player2.target_y = 470
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
        self.sace_sync_done = False
        self.is_paused = False
        self.is_manual_pause = False
        self.paused_by = None
        self.pause_start_time = None
        self.pause_timeout = 60.0
        self.match_start_time = None
        self.victory_receipt_issued = False
        self.engine.add_player(self.player1, self.player2)

    def reset_match(self):
        self.last_activity = time.time()
        self.match_start_time = None
        self.victory_receipt_issued = False
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
        self.is_paused = False
        self.is_manual_pause = False
        self.paused_by = None
        self.pause_start_time = None
        self.pause_timeout = 60.0
        self.sace_sync_done = False
        if getattr(self, 'is_bot_room', False) and getattr(self, 'bot', None):
            self.bot.reset()

ARCADE_STAGE_ORDER = {
    'rusher': 1,
    'turtle': 2,
    'weaver': 3,
    'duelist': 4,
    'berserker': 5,
    'apex': 6
}

def generate_victory_receipt(room_id, bot_diff, combat_time, hp_remaining):
    """Generate tamper-proof cryptographic receipt for verified victory."""
    payload = f"{room_id}:{bot_diff}:{combat_time:.1f}:{hp_remaining}"
    sig = hmac.new(SECRET_KEY_BYTES, payload.encode('utf-8'), hashlib.sha256).hexdigest()[:16]
    return f"SB2-{sig.upper()}"

def verify_victory_receipt(room_id, bot_diff, combat_time, hp_remaining, receipt_token):
    """Validate that victory receipt was authentically signed by server."""
    if not receipt_token or not str(receipt_token).startswith("SB2-"):
        return False
    expected = generate_victory_receipt(room_id, bot_diff, combat_time, hp_remaining)
    return hmac.compare_digest(str(receipt_token), expected)

rooms = {}
sid_auth = {} # sid -> {'room_id': str, 'player_id': int}
player_run_cooldown = {} # (room_id, player_id) -> float (timestamp)
RUN_CODE_COOLDOWN_SECONDS = 0.35

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
    cookie_unlocked = 1
    try:
        raw_cookie = request.cookies.get('stickman_arcade_unlocked')
        if raw_cookie:
            cookie_unlocked = int(raw_cookie)
    except (ValueError, TypeError):
        cookie_unlocked = 1
    unlocked = max(session.get('arcade_unlocked', 1), cookie_unlocked)
    session['arcade_unlocked'] = unlocked

    locked_diff = request.args.get('locked', '')
    req_stage = request.args.get('required_stage', '')
    return render_template('index.html', arcade_unlocked=unlocked, locked_diff=locked_diff, req_stage=req_stage)

@app.route('/health')
@app.route('/ping')
def health_check():
    return "ok", 200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
    }

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.png', mimetype='image/png')

@app.route('/robots.txt')
def robots_txt():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'robots.txt', mimetype='text/plain')

@app.route('/llms.txt')
def llms_txt():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'llms.txt', mimetype='text/plain; charset=utf-8')

@app.route('/llms-full.txt')
def llms_full_txt():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'llms-full.txt', mimetype='text/plain; charset=utf-8')

@app.route('/sitemap.xml')
def sitemap_xml():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'sitemap.xml', mimetype='application/xml')

@app.route('/google853a9cfab5a32793.html')
def google_verify():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'google853a9cfab5a32793.html')

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

BOT_TITLES = {
    'dummy': '🥋 Training Dummy',
    'beginner': '🐣 Beginner Bot',
    'easy': '⚡ Byte Rusher',
    'rusher': '⚡ Byte Rusher',
    'turtle': '🛡️ Iron Turtle',
    'weaver': '🌊 Wave Weaver',
    'duelist': '🗡️ Shadow Duelist',
    'hard': '🔥 Berserker Ronin',
    'berserker': '🔥 Berserker Ronin',
    'apex': '👑 Apex Sovereign',
    'master': '👑 SACE Master Bot (Adaptive AI)',
    'sace': '👑 SACE Master Bot (Adaptive AI)',
}

@app.route('/wardrobe')
def wardrobe_view():
    return render_template('wardrobe.html')

@app.route('/api/wardrobe/eval', methods=['POST'])
def api_wardrobe_eval():
    data = request.get_json(silent=True) or {}
    code = data.get('code', '')
    res = compiler.eval_wardrobe_code(code)
    return jsonify(res)

@app.route('/api/claim_victory', methods=['POST'])
def api_claim_victory():
    try:
        data = request.get_json(silent=True) or {}
        room_id = data.get('room_id', '')
        diff = data.get('bot_difficulty', '')
        combat_dur = float(data.get('combat_duration', 0))
        p1_hp = int(data.get('hp_remaining', 0))
        token = data.get('receipt_token', '')

        if not verify_victory_receipt(room_id, diff, combat_dur, p1_hp, token):
            logger.warning(f"Rejected unverified or fraudulent victory claim: room [{room_id}] token [{token}]")
            return jsonify({'success': False, 'error': 'Invalid anti-cheat verification signature'}), 403

        stage_num = ARCADE_STAGE_ORDER.get(diff, None)
        if stage_num:
            current_unlocked = session.get('arcade_unlocked', 1)
            new_unlocked = max(current_unlocked, stage_num + 1)
            session['arcade_unlocked'] = new_unlocked
            logger.info(f"Anti-cheat verified victory for [{diff}]! Arcade unlocked advanced: {current_unlocked} -> {new_unlocked}")
            return jsonify({'success': True, 'unlocked_stage': new_unlocked, 'verified_receipt': token})
        return jsonify({'success': True, 'unlocked_stage': session.get('arcade_unlocked', 1), 'verified_receipt': token})
    except Exception as e:
        logger.error(f"Error in api_claim_victory: {e}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/sync_progression', methods=['POST'])
def api_sync_progression():
    try:
        data = request.get_json() or {}
        client_unlocked = int(data.get('unlocked', 1))
        client_unlocked = max(1, min(6, client_unlocked))
        session['arcade_unlocked'] = max(session.get('arcade_unlocked', 1), client_unlocked)
        resp = jsonify({'success': True, 'unlocked': session['arcade_unlocked']})
        resp.set_cookie('stickman_arcade_unlocked', str(session['arcade_unlocked']), max_age=31536000, samesite='Lax')
        return resp
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/bot/<difficulty>')
def play_vs_bot(difficulty):
    req_diff = str(difficulty).lower()
    valid_diffs = ('easy', 'hard', 'dummy', 'beginner', 'rusher', 'turtle', 'weaver', 'duelist', 'berserker', 'apex', 'master', 'sace')
    diff = req_diff if req_diff in valid_diffs else 'easy'

    # 🔒 Server-Side Anti-Cheat Progression Lock for Arcade Stages
    if diff in ARCADE_STAGE_ORDER:
        req_stage = ARCADE_STAGE_ORDER[diff]
        cookie_unlocked = 1
        try:
            raw_cookie = request.cookies.get('stickman_arcade_unlocked')
            if raw_cookie:
                cookie_unlocked = int(raw_cookie)
        except (ValueError, TypeError):
            cookie_unlocked = 1
        unlocked = max(session.get('arcade_unlocked', 1), cookie_unlocked)
        session['arcade_unlocked'] = unlocked

        if req_stage > unlocked:
            logger.warning(f"Player attempted to access locked stage {req_stage} ('{diff}') with current unlocked level {unlocked}.")
            return redirect(url_for('lobby_menu', locked=diff, required_stage=req_stage - 1))

    room = create_private_room()
    if room is None:
        abort(503, "Server room limit reached. Please try again later.")
    room.is_bot_room = True
    room.bot_difficulty = diff
    if diff in ('master', 'sace'):
        level_str = str(request.args.get('level', '3')).strip()
        level_map = {
            '1': (0.25, '👑 SACE Master Bot (Tier 1: Apprentice)'),
            '2': (0.75, '👑 SACE Master Bot (Tier 2: Tactical)'),
            '3': (1.00, '👑 SACE Master Bot (Tier 3: Grandmaster)')
        }
        diff_val, title = level_map.get(level_str, level_map['3'])
        room.bot = SaceBattleBot(difficulty=diff_val, avatar_level=level_str)
        room.bot_avatar_level = level_str
        room.bot_title = title
        room.player2.name = title
    else:
        room.bot = BattleBot(diff)
        room.player2.name = BOT_TITLES.get(diff, f"Bot ({diff.capitalize()})")
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
        bot_avatar_level=getattr(room, 'bot_avatar_level', '3'),
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
    room._last_gui_payload = None  # Force immediate fresh state frame for newly connected client
    
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
            # Player 1 connected to bot room: hydrate SACE brain if player provided saved grant
            if getattr(room, 'bot_difficulty', '') in ('master', 'sace') and getattr(room, 'bot', None):
                sace_grant = data.get('sace_grant') if isinstance(data, dict) else None
                if sace_grant and hasattr(room.bot, 'load_grant'):
                    room.bot.load_grant(sace_grant)

            room.connected_players.add(2)
            room.is_match_active = False  # Standby until player clicks Enter Battle or executes code
            if getattr(room, 'bot', None) and hasattr(room.bot, 'last_decision_time'):
                room.bot.last_decision_time = time.time() + 1.0
            logger.info(f"Room [{room_id}] -> Solo bot room standby against {room.bot_difficulty} bot. Waiting for battle gate enter.")
            socketio.emit('bot_ready', {
                'bot_title': getattr(room, 'bot_title', 'Bot'),
                'is_bot_room': True
            }, to=room_id)
            return
    elif room.is_match_active:
        # Match is already active; immediately unlock the returning/reconnecting player's Run button
        logger.info(f"Room [{room_id}] -> Reconnected Player {player_id} receiving match_start immediately.")
        socketio.emit('match_start', to=request.sid)
    elif 1 in room.connected_players and 2 in room.connected_players:
        room.is_match_active = True
        logger.info(f"Room [{room_id}] -> Both players connected! Starting match...")
        socketio.emit('match_start', to=room_id)

@socketio.on('set_player_customization')
def handle_player_customization(data):
    if not isinstance(data, dict):
        return
    auth = sid_auth.get(request.sid)
    if not auth:
        return
    room = rooms.get(auth['room_id'])
    if not room:
        return
    player_id = auth['player_id']
    target_player = room.player1 if player_id == 1 else room.player2
    if 'body' in data and data['body']:
        target_player.body_color = compiler.resolve_color(data['body'])
    if 'shield' in data and data['shield']:
        target_player.shield_color = compiler.resolve_color(data['shield'])
    if 'sword' in data and data['sword']:
        target_player.sword_color = compiler.resolve_color(data['sword'])

@socketio.on('start_match')
def handle_start_match(data=None):
    auth = sid_auth.get(request.sid)
    if not auth:
        return
    room_id = auth.get('room_id')
    room = rooms.get(room_id)
    if not room:
        return
    if not room.is_match_active:
        room.is_match_active = True
        if getattr(room, 'bot', None) and hasattr(room.bot, 'last_decision_time'):
            room.bot.last_decision_time = time.time() + 1.0  # 1.0s combat grace before bot moves
        logger.info(f"Room [{room_id}] -> Match officially started by Player {auth.get('player_id', 1)} via Enter Battle.")
        socketio.emit('match_start', to=room_id)

@socketio.on('player_tab_state')
def handle_tab_state(data):
    auth = sid_auth.get(request.sid)
    if not auth:
        return
    room_id = auth.get('room_id')
    player_id = auth.get('player_id')
    room = rooms.get(room_id)
    if not room or not getattr(room, 'is_match_active', False):
        return

    hidden = bool(data.get('hidden', False))
    now = time.time()
    is_bot = getattr(room, 'is_bot_room', False)

    if hidden:
        if not getattr(room, 'is_paused', False):
            room.is_paused = True
            room.is_manual_pause = False
            room.paused_by = player_id
            room.pause_start_time = now
            room.pause_timeout = 999999.0 if is_bot else 60.0
            logger.info(f"Room [{room_id}] -> Paused by Player {player_id} (switched tab / unfocused).")
            socketio.emit('game_paused', {
                'paused': True,
                'paused_by': player_id,
                'timeout': 0 if is_bot else 60,
                'is_bot_room': is_bot,
                'manual': False
            }, to=room_id)
    else:
        if getattr(room, 'is_paused', False):
            # If match was manually paused by the user, DO NOT auto-unpause on tab focus!
            if getattr(room, 'is_manual_pause', False):
                logger.info(f"Room [{room_id}] -> Tab refocused, but match remains paused (manual pause active).")
                return
            if getattr(room, 'paused_by', None) == player_id:
                room.is_paused = False
                room.is_manual_pause = False
                room.paused_by = None
                room.pause_start_time = None
                logger.info(f"Room [{room_id}] -> Resumed by Player {player_id} (returned to tab).")
                socketio.emit('game_resumed', {
                    'paused': False,
                    'resumed_by': player_id,
                    'is_bot_room': is_bot,
                    'manual': False
                }, to=room_id)

@socketio.on('toggle_bot_pause')
def handle_toggle_bot_pause(data=None):
    auth = sid_auth.get(request.sid)
    if not auth:
        return
    room_id = auth.get('room_id')
    room = rooms.get(room_id)
    if not room or not getattr(room, 'is_match_active', False):
        return
    # ONLY permitted in bot rooms (single player practice / arcade)
    if not getattr(room, 'is_bot_room', False):
        return
    if room.player1.heart <= 0 or room.player2.heart <= 0:
        return

    player_id = auth.get('player_id', 1)
    room.is_paused = not getattr(room, 'is_paused', False)
    if room.is_paused:
        room.is_manual_pause = True
        room.paused_by = player_id
        room.pause_start_time = time.time()
        room.pause_timeout = 999999.0  # Indefinite pause until unpaused
        logger.info(f"Room [{room_id}] -> Bot duel manually paused by Player {player_id}.")
        socketio.emit('game_paused', {
            'paused': True,
            'paused_by': player_id,
            'timeout': 0,
            'is_bot_room': True,
            'manual': True
        }, to=room_id)
    else:
        room.is_manual_pause = False
        room.paused_by = None
        room.pause_start_time = None
        room.pause_timeout = 999999.0
        logger.info(f"Room [{room_id}] -> Bot duel manually resumed by Player {player_id}.")
        socketio.emit('game_resumed', {
            'paused': False,
            'resumed_by': player_id,
            'is_bot_room': True,
            'manual': True
        }, to=room_id)

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
    
    # Rate limit check (Bug #5: Cooldown between code executions)
    now = time.time()
    cooldown_key = (room_id, player_id)
    last_run_time = player_run_cooldown.get(cooldown_key, 0)
    if now - last_run_time < RUN_CODE_COOLDOWN_SECONDS:
        remaining = round(RUN_CODE_COOLDOWN_SECONDS - (now - last_run_time), 2)
        socketio.emit('code_error', {
            'error': f'Cooldown active! Please wait {remaining}s before executing code again.'
        }, to=request.sid)
        return
    player_run_cooldown[cooldown_key] = now

    room = rooms.get(room_id)
    if not room:
        socketio.emit('code_error', {'error': 'Room not found. Please return to lobby.'}, to=request.sid)
        return
        
    # Auto-activate match if both players or bot are in the room
    if not room.is_match_active:
        if (1 in room.connected_players and 2 in room.connected_players) or getattr(room, 'is_bot_room', False):
            logger.info(f"Room [{room_id}] -> Auto-activating match upon code run.")
            room.is_match_active = True
            if getattr(room, 'bot', None) and hasattr(room.bot, 'last_decision_time'):
                room.bot.last_decision_time = time.time() + 0.5
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
        logger.warning(f"Room [{room_id}] -> Rejected Player {player_id} code: exceeds 2000 chars ({len(raw_code)}).")
        socketio.emit('code_error', {
            'error': f"Code size exceeds limit ({len(raw_code)}/2000 characters). Please shorten your script."
        }, to=request.sid)
        return
        
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
        # Code compiled and actions queued successfully! Resume combat if match was paused.
        if getattr(room, 'is_paused', False) and getattr(room, 'is_bot_room', False):
            room.is_paused = False
            room.is_manual_pause = False
            room.paused_by = None
            room.pause_start_time = None
            room.pause_timeout = 999999.0
            socketio.emit('game_resumed', {
                'paused': False,
                'resumed_by': player_id,
                'is_bot_room': True,
                'manual': True
            }, to=room_id)

        warning_msg = None
        if isinstance(res, dict) and res.get('loop_capped'):
            warning_msg = "Loop safety: While loop stopped after 100 iterations."
        
        no_action = False
        reason = None
        distance = None
        if isinstance(res, dict) and res.get('no_action'):
            no_action = True
            reason = res.get('reason')
            distance = res.get('distance')

        socketio.emit('code_success', {
            'message': 'Code executed successfully!',
            'warning': warning_msg,
            'no_action': no_action,
            'reason': reason,
            'distance': distance
        }, to=request.sid)

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
        if getattr(room, 'bot', None) and hasattr(room.bot, 'last_decision_time'):
            room.bot.last_decision_time = time.time() + 1.0  # Match 1.0s entrance grace on rematch
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

def _serialize_player_state(player):
    """Build compact GUI state payload for a fighter with rounded coordinates."""
    return {
        'x': round(player.x, 1),
        'y': round(player.y, 1),
        'direction': player.direction,
        'sword_angle': round(player.sword.sword_angle, 1),
        'sword_length': getattr(player.sword, 'sword_length', 50),
        'shield_angle': round(player.shield.shield_angel, 1),
        'shield_length': getattr(player.shield, 'shield_length', 40),
        'is_blocking': player.shield.block_timer > 0,
        'is_crouching': getattr(player, 'crouch_timer', 0) > 0,
        'has_barrier': getattr(player, 'barrier_timer', 0) > 0,
        'has_dome': getattr(player, 'dome_timer', 0) > 0,
        'barrier_power': getattr(player, 'barrier_power', 1),
        'dome_power': getattr(player, 'dome_power', 1),
        'has_sword': getattr(player, 'has_sword', True),
        'is_heavy': getattr(player.sword, 'is_heavy', False),
        'is_swing': getattr(player.sword, 'is_swing', False),
        'attack_state': getattr(player.sword, 'attack_state', 0),
        'heart': player.heart,
        'max_health': MAX_HEALTH,
        'energy': round(getattr(player, 'energy', 100), 1),
        'max_energy': getattr(player, 'max_energy', 100),
        'speech': _get_public_speech(player),
        'body_color': getattr(player, 'body_color', None),
        'shield_color': getattr(player, 'shield_color', None),
        'sword_color': getattr(player, 'sword_color', None),
        'actions_count': len(getattr(player, 'action_queue', []))
    }

def _should_emit_gui_state(room, data_to_send, now):
    """Emit at 60 FPS during active combat/fadeouts; throttle idle/paused rooms to save bandwidth."""
    last_payload = getattr(room, '_last_gui_payload', None)
    last_change_at = getattr(room, '_last_gui_change_at', 0.0)
    last_emit_at = getattr(room, '_last_gui_emit_at', 0.0)

    if last_payload != data_to_send:
        room._last_gui_payload = data_to_send
        room._last_gui_change_at = now
        room._last_gui_emit_at = now
        return True

    if not data_to_send.get('is_paused') and (now - last_change_at) < 1.2:
        room._last_gui_emit_at = now
        return True

    if (now - last_emit_at) >= 5.0:
        room._last_gui_emit_at = now
        return True

    return False

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
                        # ⏸️ TAB-CHANGE PAUSE & 1-MINUTE AFK AUTO-EXIT CHECK
                        if getattr(room, 'is_paused', False):
                            # Only human vs human PvP enforces a 60s AFK timeout forfeit.
                            # Bot practice matches pause indefinitely without timeout.
                            if not getattr(room, 'is_bot_room', False):
                                pause_elapsed = now - getattr(room, 'pause_start_time', now)
                                timeout_limit = getattr(room, 'pause_timeout', 60.0)
                                if pause_elapsed > timeout_limit:
                                    afk_pid = getattr(room, 'paused_by', 1)
                                    winner_pid = 2 if afk_pid == 1 else 1
                                    logger.info(f"Room [{room.room_id}] -> 1-minute AFK timeout reached for Player {afk_pid}!")
                                    socketio.emit('player_afk_timeout', {
                                        'afk_player': afk_pid,
                                        'winner': winner_pid,
                                        'is_bot_room': False,
                                        'message': f"Match ended: Player {afk_pid} was away for more than 1 minute."
                                    }, to=room.room_id)
                                    room.is_match_active = False
                                    room.is_paused = False
                                    room.is_manual_pause = False
                                    room.paused_by = None
                                    room.pause_start_time = None
                                    room.reset_match()
                            # Freeze physics and bot updates during pause!
                        else:
                            if getattr(room, 'is_bot_room', False) and room.is_match_active:
                                if getattr(room, 'match_start_time', None) is None:
                                    room.match_start_time = now
                                if getattr(room, 'bot', None):
                                    try:
                                        room.bot.tick(room)
                                    except Exception as be:
                                        logger.error(f"Bot tick error in room {room.room_id}: {be}")
                            room.engine.update()

                            # SACE Brain Persistence Sync: dispatch learned memory on match end (KO)
                            if getattr(room, 'is_bot_room', False) and getattr(room, 'bot_difficulty', '') in ('master', 'sace'):
                                if (room.player1.heart <= 0 or room.player2.heart <= 0) and not getattr(room, 'sace_sync_done', False):
                                    room.sace_sync_done = True
                                    if getattr(room, 'bot', None) and hasattr(room.bot, 'export_grant'):
                                        updated_weights = room.bot.export_grant()
                                        socketio.emit('sace_brain_updated', {'weights': updated_weights}, to=room.room_id)
                                        logger.info(f"Room [{room.room_id}] -> SACE Master Bot brain exported ({len(updated_weights)} keys) and dispatched to client.")

                            # 🛡️ Server-Verified Victory Receipt for Anti-Cheat Progression & WhatsApp Brag
                            if getattr(room, 'is_bot_room', False) and (room.player1.heart <= 0 or room.player2.heart <= 0) and not getattr(room, 'victory_receipt_issued', False):
                                room.victory_receipt_issued = True
                                if room.player2.heart <= 0 and room.player1.heart > 0:
                                    combat_dur = round(max(1.0, now - (getattr(room, 'match_start_time', None) or now)), 1)
                                    diff = getattr(room, 'bot_difficulty', 'easy')
                                    p1_hp = max(1, room.player1.heart)
                                    token = generate_victory_receipt(room.room_id, diff, combat_dur, p1_hp)
                                    stage_num = ARCADE_STAGE_ORDER.get(diff, None)
                                    opp_title = getattr(room, 'bot_title', None) or BOT_TITLES.get(diff, f"Bot ({diff})")
                                    receipt = {
                                        'winner': 1,
                                        'receipt_token': token,
                                        'combat_duration': combat_dur,
                                        'hp_remaining': p1_hp,
                                        'opponent_title': opp_title,
                                        'bot_difficulty': diff,
                                        'stage_number': stage_num,
                                        'next_stage_unlocked': (stage_num + 1) if (stage_num and stage_num < 6) else None
                                    }
                                    socketio.emit('match_victory_receipt', receipt, to=room.room_id)
                                    logger.info(f"Room [{room.room_id}] -> Issued Anti-Cheat Victory Receipt: {token} (Time: {combat_dur}s, HP: {p1_hp})")
                        
                        # Opponent dialogue question dispatch
                        if getattr(room.player1, 'pending_question', None):
                            q = room.player1.pending_question
                            room.player1.pending_question = None
                            socketio.emit('prompt_opponent_input', {'from_player': 1, 'prompt': q}, to=room.room_id)
                        if getattr(room.player2, 'pending_question', None):
                            q = room.player2.pending_question
                            room.player2.pending_question = None
                            socketio.emit('prompt_opponent_input', {'from_player': 2, 'prompt': q}, to=room.room_id)
                        
                        # Grace period expiration (120 seconds / 2 minutes to tolerate weak mobile networks)
                        for pid, disc_time in list(room.pending_disconnects.items()):
                            if pid in room.sid_to_player.values():
                                del room.pending_disconnects[pid]
                            elif now - disc_time > 120.0:
                                del room.pending_disconnects[pid]
                                room.connected_players.discard(pid)
                                room.is_match_active = False
                                room.reset_match()
                                logger.info(f"Room [{room.room_id}] -> Player {pid} grace period (2m) expired.")
                                socketio.emit('player_left', {'player_id': pid}, to=room.room_id)
                        
                        # 60 FPS state broadcast with dynamic weapon lengths & states
                        pause_secs_left = 0
                        if getattr(room, 'is_paused', False):
                            elapsed_p = now - getattr(room, 'pause_start_time', now)
                            pause_secs_left = max(0, int(getattr(room, 'pause_timeout', 60.0) - elapsed_p))

                        data_to_send = {
                            'is_match_active': getattr(room, 'is_match_active', False),
                            'is_paused': getattr(room, 'is_paused', False),
                            'paused_by': getattr(room, 'paused_by', None),
                            'pause_seconds_left': pause_secs_left,
                            'player1': _serialize_player_state(room.player1),
                            'player2': _serialize_player_state(room.player2),
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
                            ],
                            'combat_events': list(getattr(room.engine, 'combat_events', [])),
                            'clash': getattr(room.engine, 'clash_event', False)
                        }
                        if _should_emit_gui_state(room, data_to_send, now):
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
