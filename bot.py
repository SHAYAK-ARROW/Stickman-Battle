import time
import random
import logging

logger = logging.getLogger("stickman_battle.bot")

BOT_CONFIGS = {
    "dummy": {
        "title": "🥋 Training Dummy",
        "interval": (1.2, 2.0),
        "mistake": 0.0,
        "style": "peaceful"
    },
    "easy": {
        "title": "🌱 Byte Rusher",
        "interval": (1.6, 2.4),
        "mistake": 0.45,
        "style": "rusher"
    },
    "rusher": {
        "title": "🌱 Byte Rusher",
        "interval": (1.6, 2.4),
        "mistake": 0.45,
        "style": "rusher"
    },
    "turtle": {
        "title": "🛡️ Iron Turtle",
        "interval": (1.2, 1.8),
        "mistake": 0.25,
        "style": "turtle"
    },
    "weaver": {
        "title": "📐 Wave Weaver",
        "interval": (1.0, 1.5),
        "mistake": 0.20,
        "style": "weaver"
    },
    "duelist": {
        "title": "🗡️ Shadow Duelist",
        "interval": (0.9, 1.3),
        "mistake": 0.15,
        "style": "duelist"
    },
    "hard": {
        "title": "🔥 Berserker Ronin",
        "interval": (0.8, 1.3),
        "mistake": 0.20,
        "style": "berserker"
    },
    "berserker": {
        "title": "🔥 Berserker Ronin",
        "interval": (0.7, 1.2),
        "mistake": 0.15,
        "style": "berserker"
    },
    "apex": {
        "title": "👑 Apex Sovereign",
        "interval": (0.5, 0.9),
        "mistake": 0.05,
        "style": "apex"
    }
}

class BattleBot:
    def __init__(self, difficulty="easy"):
        diff = difficulty.lower() if difficulty else "easy"
        self.difficulty = diff if diff in BOT_CONFIGS else "easy"
        cfg = BOT_CONFIGS[self.difficulty]
        self.cfg = cfg
        self.title = cfg["title"]
        self.mistake_rate = cfg["mistake"]
        self.last_decision_time = time.time()
        self.decision_interval = random.uniform(cfg["interval"][0], cfg["interval"][1])
        self.last_banter_time = time.time()
        self.banter_phrases = [
            "Game on! ⚡",
            "Feel the blade! ⚔️",
            "Can't touch this guard! 🛡️",
            "Relentless strike! 🔥",
            "Analyzing your code...",
            "Nice algorithm!",
            "Can you break my defense?",
            "My math is sharp!",
            "Is that all your loop can do?",
            "Optimizing battle strategy...",
            "Watch out for my spells!"
        ]

    def reset(self):
        self.last_decision_time = time.time()
        self.last_banter_time = time.time()
        cfg = BOT_CONFIGS[self.difficulty]
        self.decision_interval = random.uniform(cfg["interval"][0], cfg["interval"][1])

    def tick(self, room):
        # 0. Practice Dojo Dummy: Immortal health maintenance & encouraging banter
        if self.difficulty == "dummy":
            if room.player2.heart < 5:
                room.player2.heart = 5
            now_dummy = time.time()
            if now_dummy - self.last_banter_time > 14:
                self.last_banter_time = now_dummy
                if hasattr(room.player2, 'say'):
                    dummy_phrases = [
                        "🥋 Test your loops & combos!",
                        "🥋 Can you break my guard?",
                        "🥋 Try get_enemy_distance()!",
                        "🥋 Immortal sparring partner at your service!"
                    ]
                    room.player2.say(random.choice(dummy_phrases))

        # Stop decisions if match is over
        if room.player1.heart <= 0 or room.player2.heart <= 0:
            return

        bot = room.player2
        player = room.player1
        now = time.time()

        # Check if bot is busy executing an existing action
        is_busy = (
            bot.x != bot.target_x
            or bot.y < 470
            or bot.jump_pixel != 0
            or (hasattr(bot, 'sword') and bot.sword.attack_state != 0)
            or (hasattr(bot, 'shield') and bot.shield.block_timer > 0)
            or getattr(bot, 'crouch_timer', 0) > 0
            or getattr(bot, 'cast_timer', 0) > 0
            or (hasattr(bot, 'action_queue') and len(bot.action_queue) > 0)
        )
        if is_busy:
            return

        # Pacing delay: don't react in 0ms (simulate human thinking latency)
        if now - self.last_decision_time < self.decision_interval:
            return

        self.last_decision_time = now
        cfg = BOT_CONFIGS[self.difficulty]

        # Tactical sensor measurements
        dx = abs(player.x - bot.x)

        base_interval = random.uniform(cfg["interval"][0], cfg["interval"][1])
        # If far away, close distance with tighter pacing (0.7s - 1.2s) instead of idling 2.4s
        if dx > 260 and cfg.get("style") != "peaceful":
            self.decision_interval = min(base_interval, random.uniform(0.7, 1.2))
        else:
            self.decision_interval = base_interval

        is_enemy_attacking = (hasattr(player, 'sword') and player.sword.attack_state != 0 and getattr(player, 'has_sword', True))
        is_enemy_blocking = (hasattr(player, 'shield') and player.shield.block_timer > 0)
        make_mistake = (random.random() < self.mistake_rate)

        try:
            self._evaluate_tactics(room, bot, player, now, cfg, dx, is_enemy_attacking, is_enemy_blocking, make_mistake)
        except Exception as e:
            logger.error(f"Bot decision error: {e}. Executing immediate reflex fallback.")
            self.last_decision_time = 0
            try:
                # Immediate Reflex Fallback:
                spells = getattr(room.engine, 'spells', [])
                incoming = any(
                    s.get('owner') == player and not s.get('returning', False) and
                    abs(bot.x - s.get('x', s.get('origin_x', 0))) < 220
                    for s in spells
                )
                if incoming:
                    if hasattr(bot, 'crouch'):
                        bot.crouch()
                    elif hasattr(bot, 'jump'):
                        bot.jump(10)
                elif is_enemy_attacking or dx < 100:
                    if hasattr(bot, 'block'):
                        bot.block()
                    elif hasattr(bot, 'crouch'):
                        bot.crouch()
                else:
                    if hasattr(bot, 'move'):
                        bot.move(1 if (player.x > bot.x and bot.direction == 1) else -1)
            except Exception as fe:
                logger.error(f"Immediate reflex fallback execution error: {fe}")

    def _evaluate_tactics(self, room, bot, player, now, cfg, dx, is_enemy_attacking, is_enemy_blocking, make_mistake):
        # 0. DIRECTION CHECK: face the enemy if opponent jumped behind
        if (player.x > bot.x and bot.direction == -1) or (player.x < bot.x and bot.direction == 1):
            bot.flip()
            return

        # 0.5. SPELL & PROJECTILE DEFENSE: Incoming enemy wave/projectile detection
        spells = getattr(room.engine, 'spells', [])
        incoming_spell = None
        for s in spells:
            if s.get('owner') == player and not s.get('returning', False):
                sx = s.get('x', s.get('origin_x', 0))
                sdir = s.get('dir', 1)
                dist_to_bot = abs(bot.x - sx)
                approaching = (sdir > 0 and bot.x > sx) or (sdir < 0 and bot.x < sx)
                if approaching and dist_to_bot < 220:
                    incoming_spell = s
                    break

        if incoming_spell and not make_mistake:
            spell_type = incoming_spell.get('type', '')
            # Advanced bots prioritize defensive barrier/dome or crouch
            if self.difficulty in ('hard', 'berserker', 'apex') and getattr(bot, 'energy', 100) >= 25:
                roll = random.random()
                if roll < 0.40 and hasattr(bot, 'sec_barrier'):
                    bot.sec_barrier(1)
                    return
                elif roll < 0.75 and hasattr(bot, 'cosec_dome'):
                    bot.cosec_dome(1)
                    return
                elif hasattr(bot, 'crouch'):
                    bot.crouch()
                    return

            if spell_type in ('sin_wave', 'cos_wave'):
                if hasattr(bot, 'crouch'):
                    bot.crouch()
                    return
            elif spell_type == 'tan_spike':
                if hasattr(bot, 'jump'):
                    bot.jump(12)
                    return
            else:
                if hasattr(bot, 'dodge') and getattr(bot, 'energy', 100) >= 15:
                    bot.dodge(2)
                    return

        # Periodic banter for immersion
        if now - self.last_banter_time > 10 and random.random() < 0.35:
            self.last_banter_time = now
            if hasattr(bot, 'say'):
                bot.say(random.choice(self.banter_phrases))

        style = cfg.get("style", "rusher")

        # --- STYLE: PEACEFUL / TRAINING DUMMY (Active Sparring Sandbox) ---
        # Roams the entire arena, jumps, dashes, crouches, blocks, but NEVER attacks!
        if style == "peaceful":
            if is_enemy_attacking:
                # React defensively so player can practice breaking guards or timing
                if random.random() < 0.60:
                    if hasattr(bot, 'block'): bot.block()
                elif hasattr(bot, 'crouch'):
                    bot.crouch()
                return

            if incoming_spell:
                # Evade spells by ducking or jumping
                if hasattr(bot, 'crouch'):
                    bot.crouch()
                elif hasattr(bot, 'jump'):
                    bot.jump(10)
                return

            # Active mobility across the arena
            action_roll = random.random()
            if action_roll < 0.40:
                # Move around: maintain agile sparring spacing
                step = 1 if dx > 180 else (-1 if dx < 70 else (1 if random.random() < 0.5 else -1))
                bot.move(step)
            elif action_roll < 0.60:
                if hasattr(bot, 'jump'):
                    bot.jump(random.choice([8, 10, 12]))
            elif action_roll < 0.75:
                if hasattr(bot, 'dash') and getattr(bot, 'energy', 100) >= 15:
                    dash_step = 2 if dx > 160 else -2
                    bot.dash(dash_step)
            elif action_roll < 0.90:
                if hasattr(bot, 'crouch'):
                    bot.crouch()
            else:
                if hasattr(bot, 'block'):
                    bot.block()
            return

        # --- STYLE: TURTLE (Heavy defense & counter-attacks) ---
        if style == "turtle":
            if dx < 120 and not make_mistake:
                if is_enemy_attacking:
                    if hasattr(bot, 'block'): bot.block()
                elif random.random() < 0.6:
                    if hasattr(bot, 'block'): bot.block()
                else:
                    if hasattr(bot, 'attack'): bot.attack()
                return
            elif dx >= 120:
                if random.random() < 0.5:
                    bot.move(1)
                else:
                    if hasattr(bot, 'sec_barrier') and bot.energy >= 25:
                        bot.sec_barrier(1)
                    else:
                        bot.move(1)
                return

        # --- STYLE: WEAVER (Trigonometric spells & zone control) ---
        if style == "weaver":
            if dx > 180 and not make_mistake:
                spell_choice = random.choice(["sin_wave", "cos_wave", "tan_spike", "cosec_dome"])
                if hasattr(bot, spell_choice) and bot.energy >= 20:
                    getattr(bot, spell_choice)(random.uniform(1.0, 1.5))
                    return
            elif dx <= 120:
                if hasattr(bot, 'dash') and bot.energy >= 15:
                    bot.dash(-2)
                    return

        # --- STYLE: DUELIST (Agile backstabs & dash-ins) ---
        if style == "duelist":
            if dx > 150:
                if hasattr(bot, 'dash') and bot.energy >= 15 and not make_mistake:
                    bot.dash(3)
                    return
            elif dx <= 90:
                if is_enemy_blocking and not make_mistake:
                    if hasattr(bot, 'jump'):
                        bot.jump(12)
                        return
                else:
                    if hasattr(bot, 'attack'):
                        bot.attack()
                        return

        # --- STANDARD / RUSHER / BERSERKER / APEX BEHAVIOR ---
        # 1. Close Range Combat (dx <= 90px)
        if dx <= 90:
            if is_enemy_attacking and not make_mistake:
                # If enemy is winding up heavy attack, shield block will be broken! Must crouch or dodge!
                if getattr(player.sword, 'is_heavy', False):
                    if hasattr(bot, 'crouch'):
                        bot.crouch()
                    elif hasattr(bot, 'dodge') and bot.energy >= 15:
                        bot.dodge(2)
                    return

                if hasattr(bot, 'block'):
                    bot.block()
                elif hasattr(bot, 'dash'):
                    bot.dash(-1)
                return

            if is_enemy_blocking and not make_mistake:
                if hasattr(bot, 'heavy_attack') and bot.energy >= 20:
                    bot.heavy_attack()
                elif hasattr(bot, 'dash'):
                    bot.dash(-1)
                return

            # Opponent is open; execute strike
            roll = random.random()
            if roll < 0.40 and hasattr(bot, 'attack'):
                bot.attack()
            elif roll < 0.70 and hasattr(bot, 'swing') and getattr(bot, 'energy', 100) >= 15:
                bot.swing()
            elif roll < 0.90 and hasattr(bot, 'heavy_attack') and getattr(bot, 'energy', 100) >= 20 and not make_mistake:
                bot.heavy_attack()
            else:
                if hasattr(bot, 'move'):
                    bot.move(-1 if roll < 0.95 else 1)
            return

        # 2. Mid Range Tactics (90px < dx <= 260px)
        if 90 < dx <= 260:
            roll = random.random()
            if roll < 0.45 and hasattr(bot, 'dash') and getattr(bot, 'energy', 100) >= 15 and not make_mistake:
                bot.dash(2)
            elif roll < 0.70 and hasattr(bot, 'sin_wave') and getattr(bot, 'energy', 100) >= 20 and not make_mistake:
                bot.sin_wave(random.uniform(1.0, 1.4))
            elif roll < 0.85 and hasattr(bot, 'move'):
                bot.move(2)
            elif hasattr(bot, 'jump') and not make_mistake:
                bot.jump(10)
            else:
                bot.move(1)
            return

        # 3. Long Range Approach (dx > 260px) - Active closing of distance
        if dx > 260:
            roll = random.random()
            if roll < 0.40 and hasattr(bot, 'dash') and getattr(bot, 'energy', 100) >= 15 and not make_mistake:
                bot.dash(4)
            elif roll < 0.70 and hasattr(bot, 'run'):
                bot.run(4)
            elif self.difficulty in ('hard', 'berserker', 'apex', 'weaver') and hasattr(bot, 'sin_wave') and getattr(bot, 'energy', 100) >= 20 and not make_mistake:
                bot.sin_wave(1.2)
            elif hasattr(bot, 'run'):
                bot.run(3)
            else:
                bot.move(2)
            return
