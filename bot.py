import time
import random
import logging

logger = logging.getLogger("stickman_battle.bot")

class BattleBot:
    def __init__(self, difficulty="easy"):
        self.difficulty = difficulty.lower() if difficulty in ("easy", "hard") else "easy"
        self.last_decision_time = time.time()
        # Human-like decision pacing (seconds between actions)
        self.decision_interval = random.uniform(1.6, 2.4) if self.difficulty == "easy" else random.uniform(0.8, 1.3)
        # Intentional error rates (easy makes more errors, hard makes few but realistic errors)
        self.mistake_rate = 0.45 if self.difficulty == "easy" else 0.20
        self.last_banter_time = time.time()
        self.banter_phrases = [
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
        self.decision_interval = random.uniform(1.6, 2.4) if self.difficulty == "easy" else random.uniform(0.8, 1.3)

    def tick(self, room):
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
        # Reset next decision interval with realistic human jitter
        self.decision_interval = random.uniform(1.6, 2.4) if self.difficulty == "easy" else random.uniform(0.8, 1.3)

        # Tactical sensor measurements
        dx = abs(player.x - bot.x)
        dy = abs(player.y - bot.y)
        is_enemy_attacking = (hasattr(player, 'sword') and player.sword.attack_state != 0 and getattr(player, 'has_sword', True))
        is_enemy_blocking = (hasattr(player, 'shield') and player.shield.block_timer > 0)
        make_mistake = (random.random() < self.mistake_rate)

        # 0. DIRECTION CHECK: face the enemy if opponent jumped behind
        if (player.x > bot.x and bot.direction == -1) or (player.x < bot.x and bot.direction == 1):
            bot.flip()
            return

        # Occasional banter (every 8-15 seconds)
        if now - self.last_banter_time > random.uniform(8, 15):
            self.last_banter_time = now
            if random.random() < 0.4:
                bot.say(random.choice(self.banter_phrases))

        # 1. DEFENSIVE REACTION: Enemy attacking at close range
        if is_enemy_attacking and dx < 115 and not make_mistake:
            if self.difficulty == "hard":
                roll = random.random()
                if roll < 0.50:
                    bot.block()
                elif roll < 0.80:
                    bot.crouch()
                else:
                    bot.dodge(3)
                return
            else:
                # Easy bot: 50% chance to block
                if random.random() < 0.50:
                    bot.block()
                    return

        # 2. CLOSE COMBAT (dx < 95)
        if dx < 95:
            if self.difficulty == "hard":
                if is_enemy_blocking and not make_mistake:
                    # Enemy has shield up -> heavy attack breaks shields!
                    bot.heavy_attack()
                else:
                    roll = random.random()
                    if roll < 0.45:
                        bot.attack()
                    elif roll < 0.75:
                        bot.swing()
                    else:
                        bot.heavy_attack()
            else:
                # Easy bot: basic attack or small move
                if random.random() < 0.60:
                    bot.attack()
                else:
                    bot.move(1)
            return

        # 3. MID RANGE (95 <= dx <= 260)
        if 95 <= dx <= 260:
            if self.difficulty == "hard":
                roll = random.random()
                if roll < 0.30:
                    bot.dash(3)
                elif roll < 0.55:
                    bot.throw_sword()
                elif roll < 0.85:
                    spell = random.choice(["sin_wave", "tan_spike", "cos_wave"])
                    if spell == "sin_wave":
                        bot.sin_wave(45)
                    elif spell == "tan_spike":
                        bot.tan_spike(45)
                    else:
                        bot.cos_wave(45)
                else:
                    bot.long_jump(2, 5)
            else:
                # Easy bot: walks forward or basic jump
                roll = random.random()
                if roll < 0.60:
                    bot.move(2)
                elif roll < 0.85:
                    bot.jump(5)
                else:
                    bot.sin_wave(20)
            return

        # 4. LONG RANGE (dx > 260)
        if dx > 260:
            if self.difficulty == "hard":
                if random.random() < 0.5:
                    bot.dash(4)
                else:
                    bot.dash(2)
            else:
                bot.move(2)
            return
