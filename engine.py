import math
import logging

logger = logging.getLogger("stickman_battle.engine")

WAVE_DURATION_FRAMES = 120  # Two seconds at the 60 FPS simulation rate.
WAVE_SPEED = 3
WAVE_AMPLITUDE = 55


def _spell_damage(power):
    """Map 1-10 spell intensity to a balanced 1-3 hearts of damage."""
    return max(1, min(3, (int(power) + 3) // 4))


class GameEngine:
    def __init__(self):
        self.players = []
        self.weapons = []
        self.shields = []
        self.spells = []

    def add_player(self, *player_list):
        for player in player_list:
            self.players.append(player)

    def update(self):
        # Match game over check
        is_game_over = any(player.heart <= 0 for player in self.players)
    
        # Gradual Energy Regeneration (0.25 per tick ≈ 15 energy / sec at 60 FPS)
        for player in self.players:
            if hasattr(player, 'energy') and player.energy < 100:
                player.energy = min(100.0, player.energy + 0.25)

        for player in self.players:
            # Game over: clear actions and stop
            if is_game_over:
                if hasattr(player, 'action_queue') and player.action_queue:
                    player.action_queue.clear()
                player.target_x = player.x
            
            # Action Queue Processor: idle check
            is_moving = (player.x != player.target_x)
            is_airborne = (player.y < 470 or player.jump_pixel != 0)
            is_attacking = (hasattr(player, 'sword') and player.sword.attack_state != 0)
            is_blocking = (hasattr(player, 'shield') and player.shield.block_timer > 0)
            is_crouching = (getattr(player, 'crouch_timer', 0) > 0)
            is_casting = (getattr(player, 'cast_timer', 0) > 0)
            
            is_busy = is_moving or is_airborne or is_attacking or is_blocking or is_crouching or is_casting
            
            if not is_game_over and not is_busy and hasattr(player, 'action_queue') and player.action_queue:
                player.execute_next_action()

            # Movement interpolation
            if player.x != player.target_x:
                speed = getattr(player, 'speed_x', 2)
                if abs(player.x - player.target_x) <= speed:
                    player.x = player.target_x
                    player.speed_x = 2
                elif player.x > player.target_x:
                    player.x -= speed
                elif player.x < player.target_x:
                    player.x += speed
                    
            if player.y != player.target_y:
                if player.y > player.target_y:
                    player.y -= 2
                elif player.y < player.target_y:
                    player.y += 2
                    
            # Physics and Gravity
            player.y += player.jump_pixel
                                
            # x boundary (hitbox)
            if player.x < 85:
                player.x = 85
                player.target_x = 85
            elif player.x > 715:
                player.x = 715
                player.target_x = 715
                
            # y boundary and Gravity check
            if player.y < 20:          
                player.y = 20
                player.target_y = 20
                player.jump_pixel = 0
            elif player.y >= 470:        
                player.y = 470
                player.target_y = 470
                player.jump_pixel = 0
            else:
                player.jump_pixel += 1
                
            # Sword Animation State Machine (supports attack, swing, heavy_attack)
            if hasattr(player, 'sword'):
                sword = player.sword
                is_heavy = getattr(sword, 'is_heavy', False)
                is_swing = getattr(sword, 'is_swing', False)
                
                if is_swing:
                    speed_angle = 14  # Swift horizontal slash
                elif is_heavy:
                    speed_angle = 6   # Heavy windup
                else:
                    speed_angle = 8   # Normal slash
                
                if sword.sword_angle != sword.target_angle:
                    if sword.sword_angle > sword.target_angle:
                        sword.sword_angle -= speed_angle
                        if sword.sword_angle < sword.target_angle:
                            sword.sword_angle = sword.target_angle
                    elif sword.sword_angle < sword.target_angle:
                        sword.sword_angle += speed_angle
                        if sword.sword_angle > sword.target_angle:
                            sword.sword_angle = sword.target_angle
                            
                # State transition when target angle is reached
                if sword.sword_angle == sword.target_angle:
                    if sword.attack_state == 1:
                        sword.attack_state = 2
                        if is_swing:
                            sword.target_angle = 45  # Quick jab slash
                        elif is_heavy:
                            sword.target_angle = 75  # Full cleave
                        else:
                            sword.target_angle = 60  # Standard slash
                    elif sword.attack_state == 2:
                        sword.attack_state = 3
                        sword.target_angle = 0   # Return
                    elif sword.attack_state == 3:
                        sword.attack_state = 0   # Idle
                        sword.is_heavy = False
                        sword.is_swing = False

            # Shield Block Timer & Queued Attack
            if hasattr(player, 'shield'):
                shield = player.shield
                if shield.block_timer > 0:
                    shield.block_timer -= 1
                    if shield.block_timer == 0:
                        shield.shield_angel = 45
                        if hasattr(player, 'sword') and player.sword.attack_queued:
                            player.sword.attack_queued = False
                            player.sword.attack_state = 1
                            if getattr(player.sword, 'is_heavy', False):
                                player.sword.target_angle = -70
                            elif getattr(player.sword, 'is_swing', False):
                                player.sword.target_angle = -15
                            else:
                                player.sword.target_angle = -40

            # Crouch / Duck timer
            if getattr(player, 'crouch_timer', 0) > 0:
                player.crouch_timer -= 1

            # Defensive spell auras
            if getattr(player, 'barrier_timer', 0) > 0:
                player.barrier_timer -= 1

            if getattr(player, 'dome_timer', 0) > 0:
                player.dome_timer -= 1

            if getattr(player, 'cast_timer', 0) > 0:
                player.cast_timer -= 1

            # Speech bubble timer
            if hasattr(player, 'speech_timer') and player.speech_timer > 0:
                player.speech_timer -= 1
                if player.speech_timer == 0:
                    player.speech_text = ""

            # Drain pending spells into engine
            if hasattr(player, 'pending_spells') and player.pending_spells:
                for sp in player.pending_spells:
                    sp['t'] = 0
                    sp['origin_y'] = player.y + 45
                    if sp.get('type') in ('sin_wave', 'cos_wave'):
                        sp['origin_x'] = player.x + (35 * player.direction)
                        sp['x'] = sp['origin_x']
                        sp['y'] = sp['origin_y']
                    self.spells.append(sp)
                player.pending_spells.clear()
        
        # --- MELEE SWORD COLLISION & DAMAGE (DYNAMIC SWORD & SHIELD LENGTH) ---
        if not is_game_over and len(self.players) >= 2:
            p1 = self.players[0]
            p2 = self.players[1]
            dx = abs(p1.x - p2.x)
            dy = abs(p1.y - p2.y)
            
            # Dynamic sword clash range based on actual weapon lengths
            p1_slen = getattr(p1.sword, 'sword_length', 50)
            p2_slen = getattr(p2.sword, 'sword_length', 50)
            sword_range = (dx <= (p1_slen + p2_slen + 55) and dy <= 60)
            
            # Dynamic reach against opponent's body based on attacker's sword length
            p1_body_range = (dx <= (p1_slen + 55) and dy <= 60)
            p2_body_range = (dx <= (p2_slen + 55) and dy <= 60)

            # Facing checks
            p1_facing_p2 = (p1.direction == 1 and p2.x > p1.x) or (p1.direction == -1 and p2.x < p1.x)
            p2_facing_p1 = (p2.direction == 1 and p1.x > p2.x) or (p2.direction == -1 and p1.x < p2.x)
            
            # Attacking only if fighter actually has sword in hand!
            p1_slashing = (hasattr(p1, 'sword') and getattr(p1, 'has_sword', True) and p1.sword.attack_state == 2 and not getattr(p1.sword, 'has_hit', False))
            p2_slashing = (hasattr(p2, 'sword') and getattr(p2, 'has_sword', True) and p2.sword.attack_state == 2 and not getattr(p2.sword, 'has_hit', False))
            
            # Case 1: Both attack simultaneously -> SWORD CLASH!
            if sword_range and p1_slashing and p2_slashing and p1_facing_p2 and p2_facing_p1:
                p1.sword.has_hit = True
                p2.sword.has_hit = True
                p1.target_x -= 20 * p1.direction
                p2.target_x -= 20 * p2.direction
                p1.speed_x = 4
                p2.speed_x = 4
                logger.info("--- SWORD CLASH! ---")
                
            # Case 2: Player 1 attacks Player 2
            elif p1_body_range and p1_slashing and p1_facing_p2:
                p1.sword.has_hit = True
                is_heavy = getattr(p1.sword, 'is_heavy', False)
                p2_crouching = getattr(p2, 'crouch_timer', 0) > 0
                p2_blocking = hasattr(p2, 'shield') and p2.shield.block_timer > 0 and p2_facing_p1
                p2_shield_len = getattr(p2.shield, 'shield_length', 40)
                
                if p2_crouching:
                    logger.info("--- PLAYER 2 CROUCHED/DUCKED! Attack missed! ---")
                elif p2_blocking:
                    if is_heavy:
                        p2.shield.block_timer = 0  # Heavy attack shatters shield!
                        p2.heart -= 1
                        p2.target_x += 45 * p1.direction
                        p2.speed_x = 5
                        logger.info("--- HEAVY ATTACK BROKE SHIELD! 1 DAMAGE! ---")
                    elif p2_shield_len < 25:
                        # Shield is too small (<25px) to block strike
                        p2.heart -= 1
                        p2.target_x += 30 * p1.direction
                        p2.speed_x = 4
                        logger.info("--- SHIELD TOO SMALL TO BLOCK! 1 DAMAGE! ---")
                    else:
                        logger.info("--- PLAYER 2 BLOCKED WITH SHIELD! ---")
                else:
                    dmg = 2 if is_heavy else 1
                    p2.heart -= dmg
                    p2.target_x += (50 if is_heavy else 30) * p1.direction
                    p2.speed_x = (5 if is_heavy else 4)
                    logger.info(f"--- PLAYER 2 HIT! Damage: {dmg}, Hearts left: {p2.heart} ---")
                    
            # Case 3: Player 2 attacks Player 1
            elif p2_body_range and p2_slashing and p2_facing_p1:
                p2.sword.has_hit = True
                is_heavy = getattr(p2.sword, 'is_heavy', False)
                p1_crouching = getattr(p1, 'crouch_timer', 0) > 0
                p1_blocking = hasattr(p1, 'shield') and p1.shield.block_timer > 0 and p1_facing_p2
                p1_shield_len = getattr(p1.shield, 'shield_length', 40)
                
                if p1_crouching:
                    logger.info("--- PLAYER 1 CROUCHED/DUCKED! Attack missed! ---")
                elif p1_blocking:
                    if is_heavy:
                        p1.shield.block_timer = 0  # Heavy attack shatters shield!
                        p1.heart -= 1
                        p1.target_x += 45 * p2.direction
                        p1.speed_x = 5
                        logger.info("--- HEAVY ATTACK BROKE SHIELD! 1 DAMAGE! ---")
                    elif p1_shield_len < 25:
                        p1.heart -= 1
                        p1.target_x += 30 * p2.direction
                        p1.speed_x = 4
                        logger.info("--- SHIELD TOO SMALL TO BLOCK! 1 DAMAGE! ---")
                    else:
                        logger.info("--- PLAYER 1 BLOCKED WITH SHIELD! ---")
                else:
                    dmg = 2 if is_heavy else 1
                    p1.heart -= dmg
                    p1.target_x += (50 if is_heavy else 30) * p2.direction
                    p1.speed_x = (5 if is_heavy else 4)
                    logger.info(f"--- PLAYER 1 HIT! Damage: {dmg}, Hearts left: {p1.heart} ---")
                    
            # Cooldown reset
            if hasattr(p1, 'sword') and p1.sword.attack_state == 0:
                p1.sword.has_hit = False
            if hasattr(p2, 'sword') and p2.sword.attack_state == 0:
                p2.sword.has_hit = False

        # --- SPELLS & RANGED PROJECTILES UPDATE & COLLISION ---
        if not is_game_over and len(self.players) >= 2:
            remaining_spells = []
            for s in self.spells:
                s['t'] += 1
                stype = s['type']
                owner = s.get('owner')
                enemy = self.players[1] if owner == self.players[0] else self.players[0]
                remove_spell = False
                
                if stype == 'throw_sword':
                    if not s.get('returning', False):
                        # Outward flight (max 280px range, fair tactical distance)
                        s['x'] += 14 * s['dir']
                        s['distance_traveled'] = s.get('distance_traveled', 0) + 14
                        
                        # Check collision with enemy
                        if abs(s['x'] - enemy.x) <= 35 and abs(s['y'] - enemy.y) <= 65:
                            if (getattr(enemy, 'barrier_timer', 0) > 0
                                    or getattr(enemy, 'dome_timer', 0) > 0):
                                logger.info("--- THROWN SWORD ABSORBED BY TRIG DEFENSE! ---")
                            elif getattr(enemy, 'crouch_timer', 0) > 0:
                                logger.info("--- THROWN SWORD FLEW OVER DUCKED OPPONENT! ---")
                            elif hasattr(enemy, 'shield') and enemy.shield.block_timer > 0:
                                logger.info("--- THROWN SWORD DEFLECTED BY SHIELD! ---")
                            else:
                                enemy.heart -= 1
                                enemy.target_x += 30 * s['dir']
                                enemy.speed_x = 4
                                logger.info(f"--- THROWN SWORD HIT! Enemy hearts: {enemy.heart} ---")
                            s['returning'] = True
                        elif s['distance_traveled'] >= 280 or s['x'] < 20 or s['x'] > 780:
                            s['returning'] = True
                    else:
                        # Boomerang Return to owner's hand
                        return_x = owner.x + (25 * owner.direction)
                        dx = return_x - s['x']
                        ret_speed = 16
                        if abs(dx) <= ret_speed:
                            s['x'] = return_x
                            owner.has_sword = True
                            remove_spell = True
                            logger.info("--- THROWN SWORD RETURNED TO OWNER'S HAND! ---")
                        else:
                            s['x'] += ret_speed * (1 if dx > 0 else -1)
                            
                    if s['t'] > 80:
                        owner.has_sword = True
                        remove_spell = True

                elif stype == 'sin_wave':
                    phase = (2 * math.pi * s['t']) / WAVE_DURATION_FRAMES
                    s['x'] = s['origin_x'] + (WAVE_SPEED * s['t'] * s['dir'])
                    amplitude = WAVE_AMPLITUDE * (0.3 + 0.07 * s.get('power', 1))
                    s['y'] = s['origin_y'] - amplitude * math.sin(phase)
                    if (not s.get('has_hit') and abs(s['x'] - enemy.x) <= 35
                            and abs(s['y'] - enemy.y) <= 65):
                        s['has_hit'] = True
                        if (getattr(enemy, 'barrier_timer', 0) > 0
                                or getattr(enemy, 'dome_timer', 0) > 0):
                            logger.info("--- SIN_WAVE ABSORBED BY TRIG DEFENSE! ---")
                        elif getattr(enemy, 'crouch_timer', 0) > 0 and s['y'] < enemy.y + 35:
                            logger.info("--- SIN_WAVE PASSED OVER CROUCHING OPPONENT! ---")
                        elif hasattr(enemy, 'shield') and enemy.shield.block_timer > 0:
                            logger.info("--- SIN_WAVE BLOCKED BY SHIELD! ---")
                        else:
                            power = s.get('power', 1)
                            enemy.heart -= _spell_damage(power)
                            enemy.target_x += (30 + 10 * (power - 1)) * s['dir']
                            enemy.speed_x = 4
                            logger.info(f"--- SIN_WAVE POWER {power} HIT! Enemy hearts: {enemy.heart} ---")
                    if s['t'] >= WAVE_DURATION_FRAMES:
                        remove_spell = True

                elif stype == 'cos_wave':
                    phase = (2 * math.pi * s['t']) / WAVE_DURATION_FRAMES
                    s['x'] = s['origin_x'] + (WAVE_SPEED * s['t'] * s['dir'])
                    amplitude = WAVE_AMPLITUDE * (0.3 + 0.07 * s.get('power', 1))
                    s['y'] = s['origin_y'] - amplitude * math.cos(phase)
                    if (not s.get('has_hit') and abs(s['x'] - enemy.x) <= 40
                            and abs(s['y'] - enemy.y) <= 75):
                        s['has_hit'] = True
                        if (getattr(enemy, 'dome_timer', 0) > 0
                                or getattr(enemy, 'barrier_timer', 0) > 0):
                            logger.info("--- COS_WAVE ABSORBED BY TRIG DEFENSE! ---")
                        else:
                            power = s.get('power', 1)
                            enemy.heart -= _spell_damage(power)
                            enemy.target_x += (35 + 10 * (power - 1)) * s['dir']
                            enemy.speed_x = 4
                            logger.info(f"--- COS_WAVE POWER {power} HIT! Enemy hearts: {enemy.heart} ---")
                    if s['t'] >= WAVE_DURATION_FRAMES:
                        remove_spell = True

                elif stype == 'tan_spike':
                    if 'target_x' not in s:
                        # Aim at the opponent's position when the spell is cast.
                        # The fixed 100px offset made this attack miss at normal
                        # starting distances and made it feel non-functional.
                        s['target_x'] = enemy.x
                        s['x'] = s['target_x']
                        s['y'] = 560
                    if 10 <= s['t'] <= 45 and not s.get('has_hit'):
                        if abs(enemy.x - s['target_x']) <= 45 and enemy.y >= 440:
                            s['has_hit'] = True
                            if (getattr(enemy, 'barrier_timer', 0) > 0
                                    or getattr(enemy, 'dome_timer', 0) > 0
                                    or (hasattr(enemy, 'shield') and enemy.shield.block_timer > 0)):
                                logger.info("--- TAN_SPIKE BLOCKED BY DEFENSE! ---")
                            else:
                                enemy.heart -= _spell_damage(s.get('power', 1))
                                enemy.jump_pixel = -12
                                logger.info(f"--- TAN_SPIKE PIERCED! Hearts: {enemy.heart} ---")
                    elif s['t'] > 60:
                        remove_spell = True

                elif stype == 'cot_wall':
                    if 'x' not in s:
                        s['x'] = owner.x + (70 * s['dir'])
                        s['y'] = 530
                    if abs(enemy.x - s['x']) <= 30 and not s.get('has_hit'):
                        s['has_hit'] = True
                        if (getattr(enemy, 'barrier_timer', 0) > 0
                                or getattr(enemy, 'dome_timer', 0) > 0
                                or (hasattr(enemy, 'shield') and enemy.shield.block_timer > 0)):
                            logger.info("--- COT_WALL BLOCKED BY DEFENSE! ---")
                        else:
                            power = s.get('power', 1)
                            enemy.heart -= _spell_damage(power)
                            enemy.target_x += (45 + 10 * (power - 1)) * s['dir']
                            enemy.speed_x = 5
                            logger.info(f"--- COT_WALL POWER {power} HIT! Hearts: {enemy.heart} ---")
                    if s['t'] > 60:
                        remove_spell = True

                if not remove_spell:
                    remaining_spells.append(s)

            self.spells = remaining_spells
