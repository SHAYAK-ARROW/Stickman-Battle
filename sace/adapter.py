"""
SACE Battle Bot Server Adapter
=============================
Integrates the MasterBotBrain with the live Flask-SocketIO game engine (game.py).
Provides human-friendly pacing (1.0s - 1.4s interval), LocalStorage memory hydration,
and real-time tactical action execution.

Author: Shayak Sadhukhan & Gemini
Version: 2.0.0
"""

import time
import random
import json
import logging
from typing import Optional, Dict, Any

from .sace_engine import MasterBotBrain, load_localstorage_grant, perceive_distance

logger = logging.getLogger("stickman_battle.sace")


def execute_action(character, action_name: str, param: int = 0):
    """Executes a parsed combat action on a character entity."""
    clean = str(action_name).lower().strip()
    try:
        p = int(round(float(param)))
    except (ValueError, TypeError):
        p = 0

    if clean == "move":
        character.move(max(1, p) if p != 0 else 1)
    elif clean == "run":
        if hasattr(character, "run"):
            character.run(max(1, p) if p != 0 else 3)
        elif hasattr(character, "run_to"):
            character.run_to(max(1, p) if p != 0 else 3)
    elif clean == "dash":
        character.dash(max(1, p) if p != 0 else 2)
    elif clean == "dodge":
        character.dodge(max(1, p) if p != 0 else 2)
    elif clean == "jump":
        # SACE Master Bot stays grounded: jumping into projectile arcs is tactically fatal
        return
    elif clean == "crouch":
        if getattr(character, "crouch_timer", 0) > 0:
            return
        if hasattr(character, "action_queue") and any(a[0] == "crouch" for a in character.action_queue):
            return
        character.crouch()
    elif clean == "swing":
        character.swing()
    elif clean == "attack":
        character.attack()
    elif clean == "heavy_attack":
        character.heavy_attack()
    elif clean == "block":
        if hasattr(character, "shield") and character.shield.block_timer > 0:
            return
        if hasattr(character, "shield"):
            character.shield.block()
        else:
            character.block()
    elif clean == "flip":
        if hasattr(character, "flip"):
            character.flip()
    elif clean == "sin_wave":
        character.sin_wave(max(1, p // 15) if p > 0 else 1)
    elif clean == "cos_wave":
        character.cos_wave(max(1, p // 15) if p > 0 else 1)
    elif clean == "tan_spike":
        character.tan_spike(max(1, p // 15) if p > 0 else 1)
    elif clean == "sec_barrier":
        character.sec_barrier(max(1, p // 15) if p > 0 else 1)
    elif clean == "cosec_dome":
        character.cosec_dome(max(1, p // 15) if p > 0 else 1)


class SaceBattleBot:
    """Production server-side adapter for the SACE Master Bot AI."""

    def __init__(self, difficulty: float = 1.0, avatar_level: str = "3"):
        self.difficulty = "master"
        self.avatar_level = str(avatar_level)
        titles = {
            "1": "👑 SACE Master Bot (Avatar 1: Apprentice)",
            "2": "👑 SACE Master Bot (Avatar 2: Tactical)",
            "3": "👑 SACE Master Bot (Avatar 3: Grandmaster)"
        }
        self.title = titles.get(self.avatar_level, titles["3"])
        self.mistake_rate = 0.15 if self.avatar_level == "1" else (0.08 if self.avatar_level == "2" else 0.04)
        self.brain = MasterBotBrain(difficulty=difficulty)

        # Pacing intervals calibrated per avatar level:
        # Avatar 3 (Master / SACE): 0.35s - 0.50s (competitive tournament AI reflexes)
        # Avatar 2 (Tactical): 0.60s - 0.85s (swift cadence)
        # Avatar 1 (Apprentice): 1.80s - 2.50s (forgiving, beginner-friendly)
        if self.avatar_level == "1":
            self.interval_range = (1.80, 2.50)
        elif self.avatar_level == "2":
            self.interval_range = (0.60, 0.85)
        else:
            self.interval_range = (0.35, 0.50)
        self.decision_interval = random.uniform(*self.interval_range)
        self.last_decision_time = time.time()
        self.last_banter_time = time.time()
        self.last_evasion_time = 0.0
        self.last_melee_reflex_time = 0.0
        self.evaded_spell_ids = set()
        self.last_known_health = 10
        self.consecutive_hits_taken = 0
        self.last_hit_time = 0.0
        self.is_enraged = False

        self.player_last_action = None
        self.last_tracked_action_id = None

        self.banter_phrases = [
            "Analyzing your Python loops... 🧠",
            "Fascinating algorithm! Adapting strategy...",
            "Tactical pattern observed: Shifting counter-guard!",
            "My 5-gram weights are evolving in real-time! ⚡",
            "Trig calculus engaged: Wave trajectory predicted! 📐",
            "Shield angle computed: Counter-strike ready! 🛡️",
            "SACE Neural Model active: All functions decoded! 🧠",
            "Can your next function break my prediction?",
            "Optimizing counter-trajectory... 📐",
            "Sharpen your loops, coder! ⚔️"
        ]

    def reset(self):
        """Resets timers and in-round telemetry for a fresh round."""
        self.last_decision_time = time.time()
        self.last_banter_time = time.time()
        self.last_evasion_time = 0.0
        self.last_melee_reflex_time = 0.0
        self.evaded_spell_ids.clear()
        self.last_known_health = 10
        self.consecutive_hits_taken = 0
        self.last_hit_time = 0.0
        self.is_enraged = False
        if self.avatar_level == "1":
            self.interval_range = (1.80, 2.50)
        elif self.avatar_level == "2":
            self.interval_range = (0.60, 0.85)
        else:
            self.interval_range = (0.35, 0.50)
        self.decision_interval = random.uniform(*self.interval_range)
        self.player_last_action = None

    def load_grant(self, raw_grant_data: Any) -> bool:
        """Hydrates the brain memory with weights from browser localStorage or socket dict."""
        if not raw_grant_data:
            return False
        try:
            if isinstance(raw_grant_data, dict):
                raw_json = json.dumps(raw_grant_data)
            else:
                raw_json = str(raw_grant_data)
            grant = load_localstorage_grant(raw_json)
            if grant and not grant.is_empty:
                self.brain._apply_grant(grant)
                logger.info(f"SACE Master Bot successfully hydrated memory from player grant: {len(self.brain.weights)} keys loaded.")
                return True
        except Exception as e:
            logger.warning(f"Failed to load SACE grant: {e}. Falling back to default seed weights.")
        return False

    def export_grant(self) -> Dict[str, Any]:
        """Exports learned weights as a lightweight dictionary for localStorage persistence."""
        try:
            return self.brain.export_to_dict()
        except Exception as e:
            logger.error(f"Error exporting SACE grant: {e}")
            return {}

    def tick(self, room):
        """Called every frame (60 FPS) by the server tick loop."""
        if getattr(room, "is_paused", False):
            # When paused, keep decision timestamp refreshed so bot doesn't blitz on tick 0 of unpause
            self.last_decision_time = time.time()
            return

        bot_char = room.player2
        player_char = room.player1

        if room.player1.heart <= 0 or room.player2.heart <= 0:
            return

        now = time.time()
        real_dist = abs(player_char.x - bot_char.x)
        dist_cat = perceive_distance(real_dist, noise_rate=0.03 if self.avatar_level == "3" else 0.07)

        # 0. PHASE 2 ENRAGE TRIGGER (Avatar 3 Grandmaster enters Hyper-Overclock when HP <= 4)
        if self.avatar_level == "3" and bot_char.heart <= 4 and not getattr(self, "is_enraged", False):
            self.is_enraged = True
            self.interval_range = (0.20, 0.35)
            self.decision_interval = random.uniform(*self.interval_range)
            bot_char.speech_text = "🔥 PHASE 2: HYPER-OVERCLOCK ACTIVATED!"
            bot_char.speech_timer = 90
            logger.info("👑 SACE Master Bot entered PHASE 2 ENRAGE MODE (HP <= 4)!")

        # 1. CONTINUOUS 60 FPS REAL-TIME PERCEPTION
        # Track player actions every single frame so repetitive loops are never missed!
        detected_player_act = None
        if hasattr(player_char, "sword") and player_char.sword.attack_state != 0:
            is_heavy = getattr(player_char.sword, "is_heavy", False)
            detected_player_act = ("heavy_attack" if is_heavy else "attack", 0)
        elif getattr(player_char, "crouch_timer", 0) > 0:
            detected_player_act = ("crouch", 0)
        elif hasattr(player_char, "shield") and player_char.shield.block_timer > 0:
            detected_player_act = ("block", 0)
        elif getattr(player_char, "cast_timer", 0) > 0:
            last_cast = getattr(player_char, "last_spell_cast", "sin_wave")
            detected_player_act = (last_cast, 0)
        elif player_char.x != getattr(player_char, "target_x", player_char.x):
            detected_player_act = ("dash", 2)
        # Note: Do NOT peek into player_char.action_queue! Bot perceives only observable physical arena actions.

        # Learn immediately when player executes any new action
        if detected_player_act and detected_player_act != self.player_last_action:
            prior = list(self.brain.action_history)
            self.brain.record_player_action(detected_player_act[0], detected_player_act[1])
            self.brain.update_learning(dist_cat, detected_player_act[0], detected_player_act[1], prior)
            self.player_last_action = detected_player_act

        # 2. COMBO BREAKER (Disrupts repetitive button-mashing attack loops)
        current_health = bot_char.heart
        if current_health < self.last_known_health:
            dmg_taken = self.last_known_health - current_health
            self.last_known_health = current_health
            if now - self.last_hit_time < 2.0:
                self.consecutive_hits_taken += dmg_taken
            else:
                self.consecutive_hits_taken = dmg_taken
            self.last_hit_time = now

            # If bot took 2 or more consecutive hits within 2.0s in close quarters:
            # Avatar 1 (Apprentice): combo breaker only triggers after 4+ hits (much more forgiving)
            combo_threshold = 4 if self.avatar_level == "1" else (3 if self.avatar_level == "2" else 2)
            if self.consecutive_hits_taken >= combo_threshold and real_dist < 125:
                self.consecutive_hits_taken = 0
                if hasattr(bot_char, "action_queue"):
                    bot_char.action_queue.clear()
                # Frame-1 immediate parry barrier with shield
                if hasattr(bot_char, "shield"):
                    bot_char.shield.block()
                # Tactical disengage: slide back out of immediate sword reach away from opponent
                disengage_dir = 1 if bot_char.x >= player_char.x else -1
                bot_char.target_x = max(60, min(740, bot_char.target_x + (45 * disengage_dir)))
                bot_char.speed_x = 6
                self.last_melee_reflex_time = now
                self.last_decision_time = now
                if hasattr(bot_char, "say") and random.random() < 0.65:
                    bot_char.say(random.choice(["Combo broken! 🛡️", "Predictable loop! ⚔️", "Guard reset! ⚡"]))
                logger.info(f"SACE Master Bot activated COMBO BREAKER at dist {real_dist:.1f}px!")
                return
        elif current_health > self.last_known_health:
            # Rematch or health reset
            self.last_known_health = current_health
            self.consecutive_hits_taken = 0

        # 3. EMERGENCY TACTICAL REFLEX (Shuts down mindless attack spam!)
        # If enemy is swinging sword in close quarters, instantly react with block/parry
        # Avatar 1 (Apprentice): Only 15% reflex chance — misses most attacks, beginner-friendly
        reflex_rate = 0.95 if getattr(self, "is_enraged", False) else (0.85 if self.avatar_level == "3" else (0.65 if self.avatar_level == "2" else 0.15))
        is_player_attacking_near = (
            real_dist < 110
            and hasattr(player_char, "sword")
            and player_char.sword.attack_state != 0
        )
        if is_player_attacking_near and (now - self.last_melee_reflex_time > 0.30):
            bot_sword_busy = hasattr(bot_char, "sword") and bot_char.sword.attack_state != 0
            bot_shield_active = hasattr(bot_char, "shield") and bot_char.shield.block_timer > 0
            bot_crouching = getattr(bot_char, "crouch_timer", 0) > 0
            if not bot_shield_active and not bot_sword_busy and not bot_crouching:
                if random.random() < reflex_rate:
                    self.last_melee_reflex_time = now
                    if hasattr(bot_char, "action_queue"):
                        bot_char.action_queue.clear()
                    bot_energy = getattr(bot_char, "energy", 100)
                    if getattr(player_char.sword, "is_heavy", False):
                        # Close-quarters heavy attacks (<65px) cannot be safely blocked;
                        # Bot rolls backward away from heavy strike (costs 10 energy)
                        if real_dist >= 65 and bot_energy >= 10:
                            execute_action(bot_char, "dodge", 2)
                        elif hasattr(bot_char, "shield"):
                            bot_char.shield.block()
                        else:
                            execute_action(bot_char, "block", 0)
                    else:
                        if hasattr(bot_char, "shield"):
                            bot_char.shield.block()
                        else:
                            execute_action(bot_char, "block", 0)
                    self.last_decision_time = now
                    return

        # 3. IN-FLIGHT SPELL REFLEX (Reacts with Shield Deflection, Harmonic Barrier, or Low Duck — NEVER JUMPS!)
        active_spells = getattr(room.engine, "spells", [])
        current_spell_ids = {id(s) for s in active_spells}
        self.evaded_spell_ids = {sid for sid in self.evaded_spell_ids if sid in current_spell_ids}

        evasion_cd = 0.20 if (getattr(self, "is_enraged", False) or self.avatar_level == "3") else (0.35 if self.avatar_level == "2" else 0.55)
        if active_spells and (now - self.last_evasion_time > evasion_cd):
            for s in active_spells:
                s_id = id(s)
                if s_id in self.evaded_spell_ids:
                    continue
                if s.get("has_hit", False):
                    self.evaded_spell_ids.add(s_id)
                    continue

                s_owner = s.get("owner")
                if s_owner is not None and getattr(s_owner, "x", None) != bot_char.x:
                    stype = s.get("type", "")
                    sx = s.get("x", 0)
                    sdir = s.get("dir", 0)
                    incoming = (sdir == 1 and sx < bot_char.x) or (sdir == -1 and sx > bot_char.x)
                    if incoming and abs(sx - bot_char.x) < 160:
                        evasion_rate = 1.0 if getattr(self, "is_enraged", False) else (0.95 if self.avatar_level == "3" else (0.75 if self.avatar_level == "2" else 0.20))
                        self.evaded_spell_ids.add(s_id)
                        if random.random() < evasion_rate:
                            self.last_evasion_time = now
                            if hasattr(bot_char, "action_queue"):
                                bot_char.action_queue.clear()

                            bot_energy = getattr(bot_char, "energy", 100)
                            if stype in ("sin_wave", "cos_wave"):
                                # STAMINA OPTIMIZED DEFENSE:
                                # Shield block costs only 10 energy and blocks waves with 100% reliability (0 dmg)!
                                if bot_energy >= 50 and real_dist >= 140 and random.random() < 0.40:
                                    counter_act = "cos_wave" if stype == "sin_wave" else "sin_wave"
                                    execute_action(bot_char, counter_act, 45)
                                    if hasattr(bot_char, "say") and random.random() < 0.35:
                                        bot_char.say("Trig Fusion Counter! ⚡")
                                elif bot_energy >= 10:
                                    execute_action(bot_char, "block", 0)
                                else:
                                    # Low energy: zero-energy crouch ducks under high sinusoidal arcs
                                    execute_action(bot_char, "crouch", 0)
                                self.last_decision_time = now
                                return

                            elif stype == "tan_spike":
                                # Ground spikes avoided via rolling back or running away (NEVER JUMP into air!)
                                if bot_energy >= 10:
                                    execute_action(bot_char, "dodge", 2)
                                else:
                                    execute_action(bot_char, "run", 2)
                                self.last_decision_time = now
                                return

                            elif stype == "throw_sword":
                                if bot_energy >= 10 and hasattr(bot_char, "shield"):
                                    execute_action(bot_char, "block", 0)
                                else:
                                    execute_action(bot_char, "crouch", 0)
                                self.last_decision_time = now
                                return

        # 4. CAST-LAG PUNISHMENT (Punish vulnerable player during spell casting animation)
        is_player_casting = getattr(player_char, "cast_timer", 0) > 0
        if self.avatar_level in ("2", "3") and is_player_casting:
            if now - self.last_decision_time > 0.30:
                bot_energy = getattr(bot_char, "energy", 100)
                if hasattr(bot_char, "action_queue"):
                    bot_char.action_queue.clear()
                
                # Sprint forward for FREE (run costs 0 energy!)
                if real_dist > 130:
                    execute_action(bot_char, "run", 4)
                elif real_dist <= 85:
                    if bot_energy >= 35:
                        execute_action(bot_char, "heavy_attack", 0)
                    elif bot_energy >= 5:
                        execute_action(bot_char, "attack", 0)
                elif bot_energy >= 45:
                    execute_action(bot_char, "dash", 2)
                    execute_action(bot_char, "attack", 0)
                self.last_decision_time = now
                if hasattr(bot_char, "say") and random.random() < 0.30:
                    bot_char.say("Punishing casting lag! ⚡")
                return

        # Clear stalled action queue if bot doesn't have energy to execute it
        if hasattr(bot_char, "action_queue") and len(bot_char.action_queue) > 0:
            if getattr(bot_char, "energy", 100) < 10 and (now - self.last_decision_time > 1.0):
                bot_char.action_queue.clear()

        # 5. Check if bot is busy executing an ongoing animation
        # Note: Normal 30px knockback displacement does not lock out tactical decisions
        is_busy = (
            abs(bot_char.x - bot_char.target_x) > 40
            or bot_char.y < 470
            or bot_char.jump_pixel != 0
            or (hasattr(bot_char, "sword") and bot_char.sword.attack_state != 0)
            or (hasattr(bot_char, "shield") and bot_char.shield.block_timer > 0)
            or getattr(bot_char, "crouch_timer", 0) > 0
            or getattr(bot_char, "cast_timer", 0) > 0
            or (hasattr(bot_char, "action_queue") and len(bot_char.action_queue) > 0)
        )
        if is_busy:
            return

        # 5. Pacing delay: enforces fast, responsive decision making
        if now - self.last_decision_time < self.decision_interval:
            return

        self.last_decision_time = now
        self.decision_interval = random.uniform(*self.interval_range)

        # 6. Decide and execute predictive counter action
        try:
            action_name, param = self.brain.decide_bot_action(
                real_dist,
                bot_char.heart,
                player_char.heart,
                bot_char.energy,
                player_char.energy,
                self_x=bot_char.x,
                enemy_x=player_char.x,
                self_direction=bot_char.direction,
                active_spells=active_spells,
                current_frame=getattr(room.engine, "frame_count", None)
            )
            execute_action(bot_char, action_name, param)

            # --- DEADLY MICRO-COMBOS (Energy Disciplined: Only when close and energy >= 40) ---
            if self.avatar_level in ("2", "3") and hasattr(bot_char, "energy"):
                b_energy = bot_char.energy
                # Strict Energy Conservation: Never combo if energy is below 40
                if b_energy >= 40:
                    combo_chance = 0.80 if getattr(self, "is_enraged", False) else 0.50
                    
                    if dist_cat == "CLOSE" and real_dist <= 85 and random.random() < combo_chance:
                        # If player is hiding behind shield, crush it with heavy attack!
                        if hasattr(player_char, "shield") and player_char.shield.block_timer > 0:
                            if b_energy >= 30 and action_name != "heavy_attack":
                                execute_action(bot_char, "heavy_attack", 0)
                        elif action_name == "heavy_attack" and b_energy >= 15:
                            execute_action(bot_char, "swing", 0)
                        elif action_name == "swing" and b_energy >= 15:
                            execute_action(bot_char, "attack", 0)
                        elif action_name == "block" and b_energy >= 15:
                            execute_action(bot_char, "swing", 0) # Parry riposte

                    elif dist_cat == "MID" and real_dist <= 110 and random.random() < combo_chance:
                        # Only follow up with attack if enemy is within blade distance
                        if action_name in ("dash", "run") and b_energy >= 15:
                            execute_action(bot_char, "attack", 0)
        except Exception as e:
            logger.error(f"SACE decision error: {e}")

        # 7. Periodic intellectual banter
        if now - self.last_banter_time > 10 and random.random() < 0.40:
            self.last_banter_time = now
            if hasattr(bot_char, "say"):
                bot_char.say(random.choice(self.banter_phrases))
