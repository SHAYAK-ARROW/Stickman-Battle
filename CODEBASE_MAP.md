# 🗺️ STICKMAN BATTLE — CODEBASE ARCHITECTURE & SYSTEM MAP

> **Quick Reference Guide for Developers & AI Agents**  
> **Active Git Branch:** `v2.3` *(Work exclusively on `v2.3` — STRICTLY NO PUSH, NO MERGE TO MAIN)*  
> **Tech Stack:** Python 3.10+ · Flask · Flask-SocketIO · HTML5 Canvas (60 FPS) · CodeMirror 5 · Web Audio API · Vanilla JS

---

## 📂 1. Directory & File Structure

```text
Stickman-Battle/
├── game.py                 # Backend: Flask routes, WebSocket events, room state, game loop
├── engine.py               # Physics Engine: 1200x600 coordinate plane, combat math, spell collisions
├── sace_ai.py              # AI Engine: Self-Adaptive Combat Engine (6 boss behaviors, RL counters)
├── requirements.txt        # Python dependencies (flask, flask-socketio, gevent, etc.)
├── CODEBASE_MAP.md         # [THIS FILE] Master architecture reference & navigation index
│
├── templates/              # Jinja2 HTML Templates
│   ├── index.html          # Home Lobby: 460px hero stage, autonomous sparring, boss gauntlet cards
│   ├── game.html           # In-Game Cockpit: 3-column layout (Telemetry | Battle Arena | Code Editor)
│   ├── wardrobe.html       # Fighter Wardrobe Studio: 20 avatars, rune customizations, preview canvas
│   └── info.html           # Game handbook, trigonometric spell math guide, commands documentation
│
├── static/                 # Frontend Assets & Client Scripts
│   ├── game.js             # Client combat runtime, WebSocket client, tactical hotkeys, run(code)
│   ├── render.js           # Live canvas renderer for game.html: stickmen, auras, spells, effects
│   ├── editor.js           # CodeMirror 5 controller, autocompletion, 10-slot Strategy Vault
│   ├── main.js             # Lobby controller: 460px hero stage sparring choreography, drag & fling
│   ├── profile.js          # Player identity: Handle, Rank (LVL 1-MAX), 20 Avatar selector modal
│   ├── audio.js            # Procedural Web Audio API synth: clashes, shields, waves, hits, dodges
│   ├── style.css           # Master stylesheet (~5,100 lines): Cyberpunk neon UI, layout grids
│   ├── favicon.png         # Site brand icon
│   └── lib/codemirror/     # Bundled CodeMirror core, python mode, show-hint
│
└── test_*.py               # Automated Python test suites
```

---

## ⚙️ 2. Backend Architecture

### `game.py` (Flask & WebSocket Controller)
- **HTTP Routes:**
  - `/` (`lobby_menu()`): Renders `index.html`. Handles cookie unlocks & guest sessions.
  - `/bot/<difficulty>` (`play_vs_bot(diff)`): Spawns solo AI room and redirects to `/room/<room_id>`.
  - `/room/<room_id>` (`join_room_game(room_id)`): Renders `game.html` with room token & player ID.
  - `/wardrobe` (`wardrobe_view()`): Renders `wardrobe.html` customization studio.
  - `/api/claim_victory`, `/api/sync_progression`: REST endpoints for milestones & progression.
- **WebSocket Handlers (`flask-socketio`):**
  - `connect` / `disconnect`: Client session lifecycle.
  - `join`: Authenticates token, assigns Player 1 (Red) or Player 2 / Bot (Blue).
  - `run_code`: Parses user Python combat AST, validates sandbox safety, updates fighter action queue.
  - `emergency_action`: Instant panic trigger (`shield` or `dodge`) bypassing AST evaluation.
- **Daemon Note:** Flask caches templates in memory when debug is off. *Always restart the daemon when modifying `templates/*.html`.*

### `engine.py` (Deterministic Combat & Physics Simulation)
- **Coordinate System:** Fixed 1200x600 resolution (`groundY = 500`, ceiling at `0`).
- **Kinematic State:**
  - `x`, `y`, `vx`, `vy`, `health` (100 HP), `energy` (100 MP), `facing_dir` (+1 or -1).
- **Martial Combat Moves:**
  - `move(step)`, `jump(power)`, `long_jump()`, `crouch()`, `dash(step)`, `dodge()`.
  - `attack()` (Fast Katana Slash, 12 DMG), `heavy_attack()` (Charged Overhead Strike, 26 DMG).
  - `block()` (Shield Defense: 85% damage mitigation, drains stamina).
- **6 Trigonometric Energy Spells:**
  - `sin_wave()`: Propagating oscillating sine projectile.
  - `cos_wave()`: Shifted cosine energy wave.
  - `tan_spike()`: High vertical spikes erupting from floor.
  - `sec_barrier()`: Flat vertical reflective wall.
  - `cosec_dome()`: Circular parabolic defense dome.
  - `cot_wall()`: Static ground barrier.
- **Physical Collision Detection:**
  - Exact blade-to-blade bounding box and raycast checks (`weapon_collides_with_weapon()`).
  - Mutual kinetic recoil impulses applied to both fighters upon blade clash.

### `sace_ai.py` (Self-Adaptive Combat Engine)
- **Boss Archetypes:**
  1. `Byte Rusher` (Stage 1): Relentless gap-close & rapid basic attacks.
  2. `Iron Turtle` (Stage 2): Defensive parry specialist, heavily punishes whiffed strikes.
  3. `Wave Weaver` (Stage 3): Trigonometric projectile harassment & ranged spacing.
  4. `Shadow Duelist` (Stage 4): Feints, counter-strikes, and tactical rolls.
  5. `Apex Sovereign` (Stage 6): Neural pattern recognition adapting to player habits.

---

## 🎨 3. Frontend Architecture

### Lobby Hero Stage (`templates/index.html` + `static/main.js`)
- **Stage Dimensions:** `.hero-stage-container` (`min-height: 460px`, spans full hero section).
- **Floating Typography:** Title `CLASH NEON BLADES. CODE YOUR VICTORY.` floats with `pointer-events: none`, allowing mouse/touch interaction anywhere across the stage.
- **Interactive Stage Physics:**
  - **Ragdoll Drag & Pick-up:** Grab fighters with mouse/touch.
  - **Dangle Struggle:** Holding a fighter in the air makes him kick legs rapidly in struggle.
  - **Aerial Pursuit:** Ground fighter runs under dangling target and executes a high aerial leap strike (`⚡ MIDAIR CLASH!`).
  - **Fling Toss & Ninja Kip-up:** Fast flick throws fighter tumbling across floor; springs up with `🥷 KIP-UP!`. Gentle drop lands in athletic fighting stance (`🥋 STANCE!`).
  - **Edge-to-Edge Buffer Clear:** Clears raw device pixels (`ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(...)`) preventing High-DPI boundary streaks.
  - **Cinematic Pacing & Whiffs:** Paced ~35% slower martial arts flow with ~24% dynamic dodge/whiffs (`💨 DUCK DODGE!`).

### In-Game Arena Cockpit (`templates/game.html` + `static/game.js` + `static/render.js`)
- **3-Column Cockpit Layout (`#battle_layout`):**
  - Left: `Telemetry Sidebar (20%)` — Combat log, FPS, round status.
  - Middle: `Battle Arena (50%)` — High-DPI 60 FPS HTML5 Canvas.
  - Splitter: `#layout_splitter` (8px draggable bar to resize Arena vs Editor).
  - Right: `Code Editor (30%)` — CodeMirror 5, Strategy Vault, 1-Click Tactical Dock.
- **Master Run Shortcut (`Ctrl+Enter` / `Cmd+Enter`):**
  - Global capture-phase window listener intercepts `Ctrl+Enter` anywhere in the app to immediately execute `run()`.

### Code Editor & Strategy Vault (`static/editor.js`)
- **Editor:** CodeMirror 5 with custom dark theme, Python mode, line numbers, autocomplete (`CodeMirror.hint.python`).
- **10-Slot Strategy Vault:**
  - 10 custom user loadout slots saved in `localStorage['stickman_strategy_vault_v2']`.
  - In-game save strategy modal (`#save_strategy_modal`) with custom slot naming.

### Identity & 20 Fighter Avatars (`static/profile.js`)
- **Modal Trigger:** Click circular Fighter Profile Avatar button on top right of navbar.
- **20 Fighter Roles Grid:**
  - `🥋 Master Ronin`, `🥷 Cyber Ninja`, `🛡️ Iron Aegis`, `🌊 Wave Mystic`, `🗡️ Shadow Blade`,
  - `🔥 Flame Ronin`, `👑 Apex Monarch`, `🐉 Dragon Knight`, `🤖 Cyber Mecha`, `🧠 Neural Hacker`,
  - `🏹 Phantom Ranger`, `🔮 Cosmic Archmage`, `🐺 Dire Wolf`, `💀 Skull Phantom`, `🦊 Cyber Kitsune`,
  - `🐯 Tiger Claw`, `🐍 Viper Fang`, `🦅 Storm Eagle`, `💻 Python Scribe`, `⭐ Galactic Champion`.
- **Persistence:** Automatically syncs `sb_player_name`, `sb_player_avatar`, and `stickman_custom_avatar`.

### Audio Synthesizer (`static/audio.js`)
- Pure Web Audio API procedural synthesizer (zero audio file assets required):
  - `playSwordClash()`: Metallic ring with exponential pitch decay.
  - `playShieldBlock()`: Low frequency resonant metallic thud.
  - `playWaveClash()`: Sine wave harmonic distortion blast.
  - `playDamageHit()`: Punchy flesh/wood kinetic impact.
  - `playDodge()`: Air swoosh white noise bandpass filter.

---

## 🛠️ 4. Common Commands & Verification

```powershell
# 1. Validate JavaScript syntax
node -c static/main.js static/game.js static/editor.js static/profile.js static/audio.js

# 2. Run Python unit tests
python -m unittest discover -s . -p "test_*.py"

# 3. Clean port 5000 (Windows PowerShell)
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# 4. Start Flask Server (Local port 5000)
python game.py
```

---

## 🔒 5. Development Constraints
1. **BRANCH SAFETY:** Work exclusively on local branch `v2.3`. **NEVER push or merge to `main`.**
2. **NO BROWSER PROMPTS:** Never use native `prompt()`, `alert()`, or `confirm()`. Use stylized in-game cyber modals.
3. **COMMUNICATION:** Friendly, warm Bengali using polite informal "তুমি".

---

## 📚 6. Master Function & Symbol Dictionary

> **Instant Lookup Reference for Agents & Developers**  
> Total indexed functions: **~322 functions** (155 Python backend + 167 JavaScript frontend).  
> *How to inspect:* Search symbol with `Select-String` / `grep` to find exact line, then read with `read_file(StartLine, EndLine)`.

### 🐍 Python Backend & AI Modules

#### `game.py` — Flask Routes, Sockets & State (38 functions)

| Function / Method | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `add_security_and_cors_headers(response)` | L56 | Appends security & CORS headers to all HTTP responses |
| `GameRoom.__init__(room_id)` | L68 | Initializes multiplayer/bot game room state, players, and match flags |
| `GameRoom.reset_match()` | L97 | Resets fighter positions, HP, energy, and round timer for new duel |
| `generate_victory_receipt(room_id, bot_diff, combat_time, hp_remaining)` | L196 | Generates cryptographically signed HMAC token for match victory |
| `verify_victory_receipt(room_id, bot_diff, combat_time, hp_remaining, receipt_token)` | L202 | Verifies validity of victory HMAC token to prevent spoofed rewards |
| `get_or_create_room(room_id)` | L214 | Fetches existing room by ID or spawns new room instance |
| `create_private_room()` | L226 | Creates a private room with a unique invite code |
| `get_player_for_token(room, token)` | L236 | Resolves player slot (P1 or P2) based on session token |
| `lobby_menu()` | L245 | Flask GET `/`: Serves main lobby `index.html` |
| `favicon()` | L261 | Flask GET `/favicon.ico` or `/favicon.png`: Serves game favicon |
| `robots_txt()` | L266 | Flask GET `/robots.txt`: Search crawler directives |
| `llms_txt()` | L271 | Flask GET `/llms.txt`: Machine-readable overview for AI agents |
| `llms_full_txt()` | L276 | Flask GET `/llms-full.txt`: Full API specifications for LLMs |
| `sitemap_xml()` | L281 | Flask GET `/sitemap.xml`: SEO sitemap XML |
| `google_verify()` | L286 | Flask GET Google Search Console verification token |
| `game_info()` | L291 | Flask GET `/info`: Renders handbook, spell math, and rules `info.html` |
| `wardrobe_view()` | L318 | Flask GET `/wardrobe`: Renders avatar customization studio |
| `api_wardrobe_eval()` | L322 | POST `/api/wardrobe/eval`: Validates & equips custom fighter skins |
| `api_claim_victory()` | L329 | POST `/api/claim_victory`: Claims progression rewards with valid receipt |
| `api_sync_progression()` | L355 | POST `/api/sync_progression`: Syncs level, ranks, and unlocked skins |
| `play_vs_bot(difficulty)` | L368 | GET `/bot/<diff>`: Initiates solo PvE match against SACE AI stage |
| `host_game()` | L415 | GET `/host`: Spawns PvP multiplayer lobby room |
| `join_game()` | L423 | GET `/join`: Joins matchmaking queue or invites |
| `join_room_game(room_id)` | L427 | GET `/room/<room_id>`: Serves battle cockpit `game.html` |
| `handle_player_join(data)` | L468 | Socket.IO `join`: Connects player to room & assigns red/blue fighter |
| `handle_player_customization(data)` | L547 | Socket.IO `customize`: Broadcasts avatar & cosmetics to room |
| `handle_start_match(data)` | L566 | Socket.IO `start_match`: Triggers match countdown & enables input |
| `handle_tab_state(data)` | L582 | Socket.IO `tab_state`: Pauses/resumes telemetry when tab blurs/focuses |
| `handle_toggle_bot_pause(data)` | L631 | Socket.IO `toggle_bot_pause`: Toggles bot decision loop pause |
| `code_handler(data)` | L674 | Socket.IO `run_code`: Compiles & validates fighter Python action script |
| `handle_emergency_action(data)` | L780 | Socket.IO `emergency_action`: Triggers instant panic dodge or shield |
| `handle_restart_game(data)` | L842 | Socket.IO `restart`: Resets arena state for rematch |
| `handle_reply_input(data)` | L864 | Socket.IO `reply_input`: Processes interactive chatbot/SACE replies |
| `handle_disconnect()` | L884 | Socket.IO `disconnect`: Handles player disconnect & cleanup |
| `_get_public_speech(player)` | L904 | Generates contextual taunts/remarks from AI boss personality |
| `game_loop()` | L912 | Core 60 FPS tick loop updating physics, collisions, and state sync |
| `ensure_game_loop()` | L1111 | Guarantees background room tick thread is alive and running |
| `handle_connect()` | L1118 | Socket.IO `connect`: Client socket connection handler |

#### `engine.py` — Physics & Kinematic Simulation (4 functions)

| Function / Method | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `_spell_damage(power)` | L11 | Calculates normalized spell damage from wave/spike intensity (1-3 hearts) |
| `GameEngine.__init__()` | L17 | Initializes physics simulation, boundaries, and fighter slots |
| `GameEngine.add_player()` | L26 | Adds a fighter entity to the simulation with coordinate bounds |
| `GameEngine.update()` | L30 | Main physics frame step: velocities, gravity, collisions, spell travel |

#### `char.py` — Fighter Kinematics & Skeletal Limbs (43 functions)

| Function / Method | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `_safe_float(val, default, min_val, max_val)` | L7 | Safely sanitizes float inputs within permissible ranges |
| `Character.__init__(name, x, y, direction)` | L16 | Initializes character kinematics (x, y, vx, vy, facing, health) |
| `Character.move(step)` | L31 | Executes standard walking locomotion in facing direction |
| `Character.run_to(step)` | L35 | Navigates fighter toward target x coordinate with speed scaling |
| `Character.flip()` | L39 | Inverts fighter horizontal facing orientation (+1 <-> -1) |
| `Character.wait(duration)` | L43 | Yields turn / idles for N simulation frames |
| `Body.__init__(name, x, y, direction)` | L49 | Initializes stickman skeletal hierarchy (joints, limbs, weapons) |
| `Body.set_right_hand(x, y)` | L68 | Positions right arm / katana grip angle |
| `Body.set_left_hand(x, y)` | L72 | Positions left arm / tactical shield angle |
| `Body.move_right_hand(dx, dy)` | L76 | Smoothly interpolates right hand toward target angle |
| `Body.move_left_hand(dx, dy)` | L80 | Combat / helper routine |
| `Body.set_sword(length, angle)` | L85 | Custom Weapon & Shield Setters (fully functional) |
| `Body.swing(dx, dy)` | L89 | Combat / helper routine |
| `Body.set_shield(length, angle)` | L97 | Combat / helper routine |
| `Body.crouch()` | L101 | Combat / helper routine |
| `Body.duck()` | L105 | Combat / helper routine |
| `Body.bend(angle)` | L108 | Combat / helper routine |
| `Body.dash(step)` | L111 | Combat / helper routine |
| `Body.dodge(step)` | L115 | Combat / helper routine |
| `Body.heavy_attack()` | L119 | Combat / helper routine |
| `Body.throw_sword()` | L126 | Combat / helper routine |
| `Body._queue_power_spell(spell_name, power)` | L134 | --- Trigonometric Magic Spells --- |
| `Body.sin_wave(power)` | L144 | Combat / helper routine |
| `Body.cos_wave(power)` | L147 | Combat / helper routine |
| `Body.tan_spike(power)` | L150 | Combat / helper routine |
| `Body.sec_barrier(power)` | L153 | Combat / helper routine |
| `Body.cosec_dome(power)` | L156 | Combat / helper routine |
| `Body.cot_wall(power)` | L159 | Combat / helper routine |
| `Body.jump(power)` | L162 | Combat / helper routine |
| `Body.long_jump(step, power)` | L166 | Combat / helper routine |
| `Body.project(angle, power)` | L170 | Combat / helper routine |
| `Body.attack()` | L174 | Combat / helper routine |
| `Body.block()` | L181 | Combat / helper routine |
| `Body.say(text)` | L185 | Combat / helper routine |
| `Body.ask(prompt)` | L189 | Combat / helper routine |
| `Body.execute_next_action()` | L193 | Combat / helper routine |
| `Shield.__init__(length)` | L400 | Combat / helper routine |
| `Shield.set_shield(length, angle)` | L406 | Combat / helper routine |
| `Shield.block()` | L411 | Combat / helper routine |
| `Sword.__init__(length, angle)` | L416 | Combat / helper routine |
| `Sword.set_sword(length, angle)` | L426 | Combat / helper routine |
| `Sword.swing(dx, dy)` | L431 | Combat / helper routine |
| `Sword.attack()` | L438 | Combat / helper routine |

#### `compiler.py` — AST Validation & Sandboxed Execution (37 functions)

| Function / Method | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `_record_command(commands, name, args)` | L27 | Record only small, serializable command arguments in the worker. |
| `_sandbox_execute(code, sensors)` | L46 | Run one untrusted script and return only recorded game commands. |
| `_sandbox_worker(connection)` | L286 | Keep one isolated process warm and execute scripts on request. |
| `_discard_sandbox_worker()` | L310 | Combat / helper routine |
| `_ensure_sandbox_worker()` | L325 | Combat / helper routine |
| `warm_sandbox()` | L358 | Start the sandbox before accepting players to avoid first-run delay. |
| `_apply_commands(commands, current_player)` | L367 | Replay validated worker commands on the live player object. |
| `WhileLoopGuard.__init__()` | L377 | Combat / helper routine |
| `WhileLoopGuard.visit_While(node)` | L381 | Combat / helper routine |
| `SecurityValidator.__init__()` | L406 | Combat / helper routine |
| `SecurityValidator.visit_Import(node)` | L410 | Combat / helper routine |
| `SecurityValidator.visit_ImportFrom(node)` | L415 | Combat / helper routine |
| `SecurityValidator.visit_Attribute(node)` | L419 | Combat / helper routine |
| `SecurityValidator.visit_Constant(node)` | L426 | Combat / helper routine |
| `SecurityValidator.visit_Name(node)` | L433 | Combat / helper routine |
| `SecurityValidator.visit_While(node)` | L440 | Combat / helper routine |
| `SecurityValidator.visit_Try(node)` | L447 | Combat / helper routine |
| `SecurityValidator.visit_With(node)` | L450 | Combat / helper routine |
| `SecurityValidator.visit_AsyncFunctionDef(node)` | L453 | Combat / helper routine |
| `SecurityValidator.visit_AsyncWith(node)` | L456 | Combat / helper routine |
| `SecurityValidator.visit_AsyncFor(node)` | L459 | Combat / helper routine |
| `SecurityValidator.visit_For(node)` | L462 | Combat / helper routine |
| `SecurityValidator.visit_FunctionDef(node)` | L469 | Combat / helper routine |
| `SecurityValidator.visit_ListComp(node)` | L475 | Combat / helper routine |
| `SecurityValidator.visit_SetComp(node)` | L478 | Combat / helper routine |
| `SecurityValidator.visit_DictComp(node)` | L481 | Combat / helper routine |
| `SecurityValidator.visit_GeneratorExp(node)` | L484 | Combat / helper routine |
| `SecurityValidator.visit_BinOp(node)` | L487 | Combat / helper routine |
| `SecurityValidator.visit_Call(node)` | L505 | Combat / helper routine |
| `safe_range()` | L511 | Combat / helper routine |
| `format_friendly_error(e)` | L522 | Translates raw Python errors into IDLE-style traceback with human-friendly hints |
| `compiler(code, current_player, enemy_player)` | L576 | Combat / helper routine |
| `resolve_color(val)` | L728 | Combat / helper routine |
| `_WardrobeItem.__init__(item_name)` | L739 | Combat / helper routine |
| `_WardrobeItem.change_color(c)` | L742 | Combat / helper routine |
| `_WardrobeItem.set_color(c)` | L744 | Combat / helper routine |
| `eval_wardrobe_code(code)` | L747 | Evaluates Python code submitted in the Wardrobe Studio. |

#### `sace/sace_engine.py` — Self-Adaptive Combat Engine (SACE) (27 functions)

| Function / Method | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `encode_action(name, param)` | L65 | Encodes action into a compact token: 'ACTION_ID:PARAM'. |
| `decode_action(token)` | L87 | Crash-proof action decoder. |
| `perceive_distance(real_distance, noise_rate)` | L117 | Categorizes physical distance with adaptive sensory noise. |
| `get_health_stance(self_hp, enemy_hp)` | L143 | Categorizes health into tactical bands (Critical, Stable, Dominant). |
| `_sanitize_script(script)` | L218 | Strips comments, blank lines, prints, speech bubbles, and normalises whitespace. |
| `compute_script_diff(prev_script, cur_script)` | L239 | Counts the number of changed lines between two scripts. |
| `build_line_connection_map(prev_script, cur_script)` | L259 | FIX #3: Uses SequenceMatcher.get_opcodes() to find ACTUAL replaced line pairs |
| `MasterBotBrain.__init__(grant, initial_weights, difficulty)` | L310 | Initializes the bot brain. |
| `MasterBotBrain.set_difficulty(difficulty)` | L361 | Allows dynamically scaling bot difficulty at runtime (accepts 0.1-1.0 or 1-10). |
| `MasterBotBrain._default_seed_weights()` | L372 | Pre-trained foundational weights — generated by test_muster/pretrain.py. |
| `MasterBotBrain.ingest_player_script(new_script)` | L1617 | Called every time the player submits a new script (A → B → C → D → E…). |
| `MasterBotBrain._classify_player()` | L1679 | FIX #6: Thresholds now match _select_counter_by_f() exactly. |
| `MasterBotBrain.register_match_outcome(outcome)` | L1702 | Called at the end of each match round. |
| `MasterBotBrain._select_counter_by_f(dist_cat, pred_action, pred_param)` | L1747 | Chooses the best counter using three signals: |
| `MasterBotBrain.record_player_action(action_name, param, frame, dist)` | L1794 | Pushes an executed player action token into sliding history and registers physic |
| `MasterBotBrain.predict_player_next_move(dist_cat)` | L1836 | Queries memory using Katz's Backoff strategy: |
| `MasterBotBrain.invent_smart_move(dist_cat, self_hp, enemy_hp, self_energy, enemy_energy)` | L1879 | Synthesizes an intelligent counter-move when N-Gram memory is novel/unseen. |
| `MasterBotBrain.decide_bot_action(real_dist, self_hp, enemy_hp, self_energy, enemy_energy, self_x, enemy_x, self_direction, active_spells, current_frame, difficulty)` | L1984 | Main arbitration loop (enhanced with Orientation Layer 0, Time-Aware Layer 0.5,  |
| `MasterBotBrain.update_learning(dist_cat, actual_action, actual_param, prior_history)` | L2136 | Learns player behavioral habits into N-gram transition keys. |
| `MasterBotBrain.prune_memory()` | L2164 | Prunes least active / lowest weight keys to keep JSON footprint tiny (< 25 KB). |
| `MasterBotBrain.export_to_dict()` | L2181 | Serializes weights and state to a compact dictionary for WebSocket/LocalStorage. |
| `MasterBotBrain.export_to_json()` | L2194 | Serializes weights AND Muster bot state to an ultra-compact JSON string. |
| `MasterBotBrain._apply_grant(grant)` | L2208 | Internal method: applies a parsed BotGrant onto this bot instance. |
| `MasterBotBrain.import_from_dict(data)` | L2234 | Legacy compatibility shim — still works for old code / test harness. |
| `BotGrant.__init__()` | L2270 | Combat / helper routine |
| `BotGrant.__repr__()` | L2280 | Combat / helper routine |
| `load_localstorage_grant(raw_json)` | L2288 | ========================================================= |

#### `sace/adapter.py` — SACE Engine Adapter & Bridge (6 functions)

| Function / Method | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `execute_action(character, action_name, param)` | L23 | Executes a parsed combat action on a character entity. |
| `SaceBattleBot.__init__(difficulty, avatar_level)` | L82 | Combat / helper routine |
| `SaceBattleBot.reset()` | L131 | Resets timers and in-round telemetry for a fresh round. |
| `SaceBattleBot.load_grant(raw_grant_data)` | L151 | Hydrates the brain memory with weights from browser localStorage or socket dict. |
| `SaceBattleBot.export_grant()` | L169 | Exports learned weights as a lightweight dictionary for localStorage persistence |
| `SaceBattleBot.tick(room)` | L177 | Called every frame (60 FPS) by the server tick loop. |

### 🌐 JavaScript Frontend Modules

#### `static/main.js` — Lobby Hero Stage & Autonomous Sparring (34 functions)

| Function / Routine | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `showToast({ title, message, type = 'info', duration = 3500 })` | L2 | Displays floating cyberpunk notification toast with auto-dismiss |
| `closeToast()` | L24 | Dismisses active notification toast |
| `start_game()` | L44 | Navigates to solo practice or multiplayer queue |
| `getUnlockedStage()` | L61 | Reads player's unlocked campaign boss stage from storage |
| `showStageLockedModal(requiredStageNum, targetDiff)` | L92 | Displays modal when player attempts to access locked boss stage |
| `closeStageLockedModal()` | L140 | Closes stage locked modal dialog |
| `play_bot(difficulty)` | L147 | Launches match against selected bot difficulty stage |
| `play_quick_play()` | L173 | Instantly starts match at player's highest unlocked campaign stage |
| `updateArcadeLadderUI()` | L188 | Updates visual lock/unlock badges on arcade stage cards |
| `setSaceAvatarLevel(level)` | L226 | Configures AI avatar visual styling based on difficulty level |
| `initSaceAvatarSelection()` | L292 | Initializes boss selector carousel and click handlers |
| `initRandomFeatureDeck()` | L405 | UI / client helper routine |
| `showNetworkToast(isOnline)` | L429 | Displays connection status toast (reconnecting, online, degraded) |
| `initNetworkStatusListeners()` | L450 | UI / client helper routine |
| `initLobbySparringAnimation()` | L459 | ── Live Autonomous Stickman Sparring Open Arena Stage (Full-Hero Unbounded Physi |
| `resizeCanvas()` | L472 | Handle High-DPI screens and dynamic container size |
| `addSparks(x, y, count, primaryColor, altColor)` | L501 | UI / client helper routine |
| `addShockwave(x, y, color)` | L518 | UI / client helper routine |
| `addFloatingText(x, y, text, color)` | L529 | UI / client helper routine |
| `playAudio(action)` | L540 | UI / client helper routine |
| `updateFighterOrientations()` | L596 | UI / client helper routine |
| `initFighterPositions()` | L606 | UI / client helper routine |
| `triggerManualClash(clickX, clickY)` | L621 | UI / client helper routine |
| `getCanvasCoords(e)` | L652 | UI / client helper routine |
| `hitTestFighter(f, px, py)` | L662 | UI / client helper routine |
| `onPointerDown(e)` | L668 | UI / client helper routine |
| `onPointerMove(e)` | L697 | UI / client helper routine |
| `releaseDraggedFighter(f)` | L729 | UI / client helper routine |
| `onPointerUp(e)` | L784 | UI / client helper routine |
| `onCanvasClick(e)` | L790 | UI / client helper routine |
| `drawStickman(f)` | L839 | ── Draw stylized kinematic stickman with authentic sword & struggle physics ─ |
| `renderLoop()` | L1020 | UI / client helper routine |
| `triggerColdBootNotice(elementId, msg)` | L1477 | UI / client helper routine |
| `join_custom_room()` | L1492 | UI / client helper routine |

#### `static/game.js` — Game Cockpit Runtime & WebSocket Bridge (35 functions)

| Function / Routine | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `showNetworkToast(isOnline, customMsg)` | L14 | Displays connection status toast (reconnecting, online, degraded) |
| `updateConnectionStatus(status)` | L38 | Updates UI indicator dot reflecting WebSocket ping & health |
| `showToast({ title, message, type = 'info', duration = 3500 })` | L60 | Displays floating cyberpunk notification toast with auto-dismiss |
| `closeToast()` | L82 | Dismisses active notification toast |
| `dismissQuickGuide()` | L104 | Hides quick gameplay instruction overlay |
| `toggleQuickGuide()` | L114 | Toggles visibility of quick guide panel |
| `logCombatTelemetry(category, tag, message)` | L142 | Appends formatted telemetry log entry to battle sidebar |
| `clearCombatTelemetry()` | L184 | Clears combat event log history |
| `sendPlayerTabState(forceHidden)` | L205 | Transmits visibility state (focus/blur) to server socket |
| `toggle_bot_pause()` | L219 | Sends toggle pause command for solo practice bot |
| `updatePauseUI(isPaused, isManual)` | L226 | Updates play/pause icon and label in cockpit controls |
| `showDefeatDialog(oppTitle, combatDuration, opponentHp, codeLines)` | L351 | UI / client helper routine |
| `showVictoryDialog(data)` | L416 | UI / client helper routine |
| `copyMatchChallenge()` | L532 | UI / client helper routine |
| `notify()` | L536 | UI / client helper routine |
| `closeVictoryDialog()` | L570 | UI / client helper routine |
| `drawTrigCurve(context, options)` | L616 | UI / client helper routine |
| `spawnCombatSparks(x, y, color, count)` | L701 | UI / client helper routine |
| `draw_combat_sparks()` | L719 | UI / client helper routine |
| `draw_sword_trails()` | L749 | UI / client helper routine |
| `getBotProfileTheme()` | L814 | --- 🥋 FIGHTER PROFILE AVATAR & BOT THEME ENGINE --- |
| `getPlayerProfileTheme()` | L832 | UI / client helper routine |
| `draw_on_camvas(data)` | L862 | UI / client helper routine |
| `targetName(t)` | L884 | UI / client helper routine |
| `draw_player(player, color, playerKey)` | L1117 | Player Ankar Function |
| `draw_heart(ctx, hx, hy, size)` | L1500 | Helper to draw a glowing retro arcade heart on canvas |
| `getBotProfileTheme()` | L1518 | Helper to get Bot Profile Theme from lobby config |
| `draw_health_bar(player, label, align)` | L1537 | Fixed HUD Arcade Hearts & Energy Bar with Fighter Profile Avatar Badges |
| `run(customSnippet)` | L2041 | UI / client helper routine |
| `request_restart()` | L2171 | UI / client helper routine |
| `showDiagnostics(msg)` | L2211 | --- PRIVATE IN-EDITOR DIAGNOSTICS (Opponent never sees this) --- |
| `dismissDiagnostics()` | L2219 | UI / client helper routine |
| `showEmergencyFeedback(msg, type)` | L2310 | UI / client helper routine |
| `triggerEmergency(action)` | L2326 | UI / client helper routine |
| `startEmergencyCooldownUI(action, cooldownSec)` | L2346 | UI / client helper routine |

#### `static/render.js` — Canvas Renderer & Visual Effects (6 functions)

| Function / Routine | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `drawTrigCurve(context, options)` | L9 | UI / client helper routine |
| `draw_sword_trails()` | L26 | UI / client helper routine |
| `draw_on_camvas(data)` | L90 | UI / client helper routine |
| `draw_player(player, color, playerKey)` | L207 | Player Ankar Function |
| `draw_heart(ctx, hx, hy, size)` | L544 | Helper to draw a glowing retro arcade heart on canvas |
| `draw_health_bar(player, label, x, align)` | L562 | Fixed HUD Arcade Hearts & Energy Bar - v2.3 Retro Arcade Style |

#### `static/editor.js` — CodeMirror 5 Controller & Strategy Vault (35 functions)

| Function / Routine | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `showDiagnostics(msg)` | L11 | UI / client helper routine |
| `dismissDiagnostics()` | L35 | UI / client helper routine |
| `updateLineNumbers(highlightLine = null)` | L52 | UI / client helper routine |
| `updateIndentGuides()` | L66 | UI / client helper routine |
| `syncEditorScroll()` | L116 | UI / client helper routine |
| `updateEditorUI()` | L125 | UI / client helper routine |
| `initCodeMirror()` | L176 | UI / client helper routine |
| `name(def ...)` | L188 | UI / client helper routine |
| `updateCharCounter()` | L417 | Live Character Counter & Limit Indicator |
| `getStrategyVault()` | L515 | ============================================================================== |
| `saveStrategyVault(slots)` | L540 | UI / client helper routine |
| `getActiveSlotId()` | L548 | UI / client helper routine |
| `setActiveSlotId(slotId)` | L553 | UI / client helper routine |
| `initStrategyVault()` | L557 | UI / client helper routine |
| `onStrategySlotChange(slotId)` | L583 | UI / client helper routine |
| `openSaveStrategyDialog()` | L619 | UI / client helper routine |
| `closeSaveStrategyDialog()` | L646 | UI / client helper routine |
| `confirmSaveStrategy()` | L653 | UI / client helper routine |
| `saveCurrentStrategy()` | L696 | UI / client helper routine |
| `insertCurrentStrategy(explicitSlotId = null)` | L700 | UI / client helper routine |
| `openStrategyVaultDialog()` | L755 | UI / client helper routine |
| `closeStrategyVaultDialog()` | L763 | UI / client helper routine |
| `renderVaultCards()` | L770 | UI / client helper routine |
| `saveToVaultCard(slotId)` | L808 | UI / client helper routine |
| `escapeStrategyHtml(str)` | L814 | UI / client helper routine |
| `sendInputReply()` | L856 | UI / client helper routine |
| `filterCommands(query)` | L892 | --- Commands Dialog Live Search Filter --- |
| `sendQuickReply(text)` | L906 | Quick banter chip helper for dialogue |
| `insertSnippet(snippet)` | L914 | --- Quick Code Snippet Insertion (Quick Chips & Commands Manual Insert) --- |
| `runSnippet(snippet)` | L964 | --- ⚡ 1-Click Action Snippet Runner (Zero-Friction Duel) --- |
| `updateCooldown(now)` | L1031 | UI / client helper routine |
| `setupCommandsTableInsertButtons()` | L1051 | UI / client helper routine |
| `applyCockpitLayout(term, arena, editor, label)` | L1109 | UI / client helper routine |
| `initCockpitLayoutSplitter()` | L1140 | UI / client helper routine |
| `setupSplitter()` | L1141 | UI / client helper routine |

#### `static/profile.js` — Player Profile, Ranks & 20 Avatars (13 functions)

| Function / Routine | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `generateRandomName()` | L54 | Generates cool cyberpunk cybernetic name (e.g. NeonRonin_84) |
| `getPlayerName()` | L61 | Retrieves cached player display name from localStorage |
| `setPlayerName(newName)` | L74 | Validates and persists updated player handle |
| `getPlayerAvatar()` | L89 | Retrieves active fighter avatar emoji/glyph |
| `setPlayerAvatar(av)` | L109 | Equips selected avatar glyph across lobby, cockpit, and storage |
| `getArcadeProgress()` | L135 | Fetches current campaign completion level and star counts |
| `getRankInfo()` | L153 | Computes rank title (Novice, Ronin, Sovereign) from stage progress |
| `updateProfileUI()` | L158 | Renders avatar button glyph and player handle in header |
| `ensureModalDOM()` | L198 | Builds and injects Fighter Profile modal into DOM if missing |
| `renderLadderCard()` | L308 | Renders interactive campaign progress card inside profile modal |
| `openProfileModal(e)` | L341 | Opens fighter profile modal and renders 20 avatar selector grid |
| `closeProfileModal()` | L365 | Closes fighter profile modal |
| `saveNameFromModal()` | L374 | Saves handle entered in profile modal input field |

#### `static/audio.js` — Procedural Web Audio API Synthesizer (43 functions)

| Function / Routine | Baseline Line | Description / Purpose |
| :--- | :---: | :--- |
| `safeGet(key, defaultVal)` | L17 | Safe Storage helper (Edge Tracking Prevention Proof) |
| `safeSet(key, val)` | L27 | UI / client helper routine |
| `getJitter(range)` | L55 | Random Pitch Jitter Helper (±range around base value, e.g. 0.08 = ±8%) |
| `getAudioContext(forceCreate)` | L75 | Lazily initializes Web Audio API context upon first user gesture |
| `startDronePad()` | L117 | UI / client helper routine |
| `stopDronePad(immediate)` | L151 | UI / client helper routine |
| `playAmbientChord(freqs, duration)` | L186 | UI / client helper routine |
| `playSparkleBell()` | L240 | UI / client helper routine |
| `lobbyBgmLoop()` | L259 | UI / client helper routine |
| `playSynthesizedKick(ctx, now)` | L274 | UI / client helper routine |
| `playSynthesizedHiHat(ctx, now, isAccent)` | L293 | UI / client helper routine |
| `playSynthesizedBassNote(ctx, now, freq)` | L320 | UI / client helper routine |
| `battleBeatStep()` | L346 | UI / client helper routine |
| `setBgmMode(newMode)` | L378 | UI / client helper routine |
| `startBGM()` | L404 | UI / client helper routine |
| `stopBGM(immediate)` | L424 | UI / client helper routine |
| `playSwordSwing()` | L451 | 1. Sword Swing (Fast Aerodynamic Blade Whoosh) |
| `playSwordClash()` | L488 | Synthesizes metallic blade clash with pitch sweep and resonant decay |
| `playShieldBlock()` | L545 | Synthesizes heavy shield impact / defensive parry resonance |
| `playShieldBreak()` | L583 | 3.5. Shield Break (Heavy Cleave + Violent Metallic Shatter) |
| `playDamageHit(isHeavy)` | L622 | Synthesizes kinetic flesh/body impact punch sound |
| `playBarrierDeflect()` | L705 | 4.5. Barrier Deflect (Harmonic Sci-Fi Shield Ping) |
| `playTrigFusion()` | L729 | 4.6. Trig Fusion (Detonation Shockwave) |
| `playWaveClash()` | L762 | Synthesizes harmonic distortion burst for trigonometric spell clashes |
| `playSpellSlice()` | L783 | 4.8. Spell Slice (Thrown Blade Slicing Magic Energy) |
| `playSwordCatch()` | L804 | 4.9. Sword Catch |
| `playSpell(type)` | L825 | 5. Trig Spells (Sci-Fi Laser / Wave) |
| `playDodge()` | L884 | Synthesizes high-velocity air whoosh for duck dodges and rolls |
| `playClick()` | L907 | 7. Tactical Click (Distinct High-Pitch Double Chime) |
| `playMatchStart()` | L926 | 8. Match Start: Heavy War Drum Boom & Brassy Gong (Ready... FIGHT!) |
| `playCountdownTick(step)` | L967 | 8.1. Arcade Countdown Beep (3... 2... 1...) |
| `playLightningStrike()` | L991 | 8.2. Lightning Strike & Electric Shockwave (FIGHT!) |
| `playGameOver(isWinner)` | L1048 | 9. Game Over (Dramatic K.O. Boom + Fanfare or Defeat Tone) |
| `playHeartbeat()` | L1092 | UI / client helper routine |
| `checkHeartbeat()` | L1127 | UI / client helper routine |
| `playEmergencyPanic(action)` | L1137 | 11. Tactical Emergency Panic Action (Alt+S Shield / Alt+D Dodge) |
| `updateUI()` | L1177 | --- CONTROLS & VOLUME ADJUSTMENT --- |
| `toggleBGM()` | L1209 | UI / client helper routine |
| `setBGMVolume(val)` | L1228 | UI / client helper routine |
| `toggleSFX()` | L1257 | UI / client helper routine |
| `setSFXVolume(val)` | L1276 | UI / client helper routine |
| `handleFirstUserGesture()` | L1304 | UI / client helper routine |
| `handleAudioVisibility(isHidden)` | L1338 | UI / client helper routine |
