import math

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
        # Match game over kina check (keu mara geche kina)
        is_game_over = any(player.heart <= 0 for player in self.players)
    
        for player in self.players:
            # Game over hole shob player er queue clear kora ebong walking stop kora
            if is_game_over:
                if hasattr(player, 'action_queue') and player.action_queue:
                    player.action_queue.clear()
                player.target_x = player.x
            
            # Action Queue Processor: jodi match active thake ebong player idle thake, tobe queue theke next action execute hobe
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
                    player.speed_x = 2 # Reset speed to default
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
                
            # Sword Animation State Machine (supports normal and heavy_attack)
            if hasattr(player, 'sword'):
                sword = player.sword
                is_heavy = getattr(sword, 'is_heavy', False)
                speed_angle = 6 if is_heavy else 8
                
                if sword.sword_angle != sword.target_angle:
                    if sword.sword_angle > sword.target_angle:
                        sword.sword_angle -= speed_angle
                        if sword.sword_angle < sword.target_angle:
                            sword.sword_angle = sword.target_angle
                    elif sword.sword_angle < sword.target_angle:
                        sword.sword_angle += speed_angle
                        if sword.sword_angle > sword.target_angle:
                            sword.sword_angle = sword.target_angle
                            
                # State transition when target is reached
                if sword.sword_angle == sword.target_angle:
                    if sword.attack_state == 1:
                        sword.attack_state = 2
                        sword.target_angle = 75 if is_heavy else 60  # Full slash!
                    elif sword.attack_state == 2:
                        sword.attack_state = 3
                        sword.target_angle = 0   # Return
                    elif sword.attack_state == 3:
                        sword.attack_state = 0   # Idle
                        sword.is_heavy = False

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
                            player.sword.target_angle = -70 if getattr(player.sword, 'is_heavy', False) else -40

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
                    self.spells.append(sp)
                player.pending_spells.clear()
        
        # --- MELEE SWORD COLLISION & DAMAGE ---
        if not is_game_over and len(self.players) >= 2:
            p1 = self.players[0]
            p2 = self.players[1]
            dx = abs(p1.x - p2.x)
            dy = abs(p1.y - p2.y)
            
            sword_range = (dx <= 155 and dy <= 60)
            body_range = (dx <= 105 and dy <= 60)

            p1_facing_p2 = (p1.direction == 1 and p2.x > p1.x) or (p1.direction == -1 and p2.x < p1.x)
            p2_facing_p1 = (p2.direction == 1 and p1.x > p2.x) or (p2.direction == -1 and p1.x < p2.x)
            
            p1_slashing = (hasattr(p1, 'sword') and p1.sword.attack_state == 2 and not getattr(p1.sword, 'has_hit', False))
            p2_slashing = (hasattr(p2, 'sword') and p2.sword.attack_state == 2 and not getattr(p2.sword, 'has_hit', False))
            
            # Case 1: Dujon eksathe attack korle -> SWORD CLASH!
            if sword_range and p1_slashing and p2_slashing and p1_facing_p2 and p2_facing_p1:
                p1.sword.has_hit = True
                p2.sword.has_hit = True
                p1.target_x -= 20 * p1.direction
                p2.target_x -= 20 * p2.direction
                p1.speed_x = 4
                p2.speed_x = 4
                print("--- SWORD CLASH! ---")
                
            # Case 2: Player 1 attacks Player 2
            elif body_range and p1_slashing and p1_facing_p2:
                p1.sword.has_hit = True
                is_heavy = getattr(p1.sword, 'is_heavy', False)
                p2_crouching = getattr(p2, 'crouch_timer', 0) > 0
                p2_blocking = hasattr(p2, 'shield') and p2.shield.block_timer > 0 and p2_facing_p1
                
                if p2_crouching:
                    print("--- PLAYER 2 CROUCHED/DUCKED! Attack missed! ---")
                elif p2_blocking:
                    if is_heavy:
                        p2.shield.block_timer = 0  # Break shield!
                        p2.heart -= 1
                        p2.target_x += 45 * p1.direction
                        p2.speed_x = 5
                        print("--- HEAVY ATTACK BROKE SHIELD! 1 DAMAGE! ---")
                    else:
                        print("--- PLAYER 2 BLOCKED WITH SHIELD! ---")
                else:
                    dmg = 2 if is_heavy else 1
                    p2.heart -= dmg
                    p2.target_x += (50 if is_heavy else 30) * p1.direction
                    p2.speed_x = (5 if is_heavy else 4)
                    print(f"--- PLAYER 2 HIT! Damage: {dmg}, Hearts left: {p2.heart} ---")
                    
            # Case 3: Player 2 attacks Player 1
            elif body_range and p2_slashing and p2_facing_p1:
                p2.sword.has_hit = True
                is_heavy = getattr(p2.sword, 'is_heavy', False)
                p1_crouching = getattr(p1, 'crouch_timer', 0) > 0
                p1_blocking = hasattr(p1, 'shield') and p1.shield.block_timer > 0 and p1_facing_p2
                
                if p1_crouching:
                    print("--- PLAYER 1 CROUCHED/DUCKED! Attack missed! ---")
                elif p1_blocking:
                    if is_heavy:
                        p1.shield.block_timer = 0  # Break shield!
                        p1.heart -= 1
                        p1.target_x += 45 * p2.direction
                        p1.speed_x = 5
                        print("--- HEAVY ATTACK BROKE SHIELD! 1 DAMAGE! ---")
                    else:
                        print("--- PLAYER 1 BLOCKED WITH SHIELD! ---")
                else:
                    dmg = 2 if is_heavy else 1
                    p1.heart -= dmg
                    p1.target_x += (50 if is_heavy else 30) * p2.direction
                    p1.speed_x = (5 if is_heavy else 4)
                    print(f"--- PLAYER 1 HIT! Damage: {dmg}, Hearts left: {p1.heart} ---")
                    
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
                    s['x'] += 12 * s['dir']
                    if abs(s['x'] - enemy.x) <= 35 and abs(s['y'] - enemy.y) <= 65:
                        if getattr(enemy, 'barrier_timer', 0) > 0:
                            print("--- THROWN SWORD ABSORBED BY SEC_BARRIER! ---")
                        elif getattr(enemy, 'crouch_timer', 0) > 0:
                            print("--- THROWN SWORD FLEW OVER DUCKED OPPONENT! ---")
                        elif hasattr(enemy, 'shield') and enemy.shield.block_timer > 0:
                            print("--- THROWN SWORD DEFLECTED BY SHIELD! ---")
                        else:
                            enemy.heart -= 1
                            enemy.target_x += 30 * s['dir']
                            enemy.speed_x = 4
                            print(f"--- THROWN SWORD HIT! Enemy hearts: {enemy.heart} ---")
                        remove_spell = True
                    elif s['x'] < 0 or s['x'] > 800 or s['t'] > 80:
                        remove_spell = True

                elif stype == 'sin_wave':
                    s['x'] += 9 * s['dir']
                    s['y'] = s.get('origin_y', 515) - 35 * math.sin(s['t'] * 0.25)
                    if abs(s['x'] - enemy.x) <= 35 and abs(s['y'] - enemy.y) <= 65:
                        if getattr(enemy, 'barrier_timer', 0) > 0:
                            print("--- SIN_WAVE ABSORBED BY SEC_BARRIER! ---")
                        elif getattr(enemy, 'crouch_timer', 0) > 0 and s['y'] < enemy.y + 35:
                            print("--- SIN_WAVE PASSED OVER CROUCHING OPPONENT! ---")
                        elif hasattr(enemy, 'shield') and enemy.shield.block_timer > 0:
                            print("--- SIN_WAVE BLOCKED BY SHIELD! ---")
                        else:
                            enemy.heart -= 1
                            enemy.target_x += 30 * s['dir']
                            enemy.speed_x = 4
                            print(f"--- SIN_WAVE HIT! Enemy hearts: {enemy.heart} ---")
                        remove_spell = True
                    elif s['x'] < 0 or s['x'] > 800 or s['t'] > 90:
                        remove_spell = True

                elif stype == 'cos_wave':
                    s['x'] += 8 * s['dir']
                    s['y'] = s.get('origin_y', 515) - 75 + 45 * abs(math.cos(s['t'] * 0.15))
                    if abs(s['x'] - enemy.x) <= 40 and abs(s['y'] - enemy.y) <= 75:
                        if getattr(enemy, 'dome_timer', 0) > 0:
                            print("--- OVERHEAD COS_WAVE ABSORBED BY COSEC_DOME! ---")
                        elif getattr(enemy, 'barrier_timer', 0) > 0:
                            print("--- COS_WAVE ABSORBED BY SEC_BARRIER! ---")
                        else:
                            enemy.heart -= 1
                            enemy.target_x += 35 * s['dir']
                            enemy.speed_x = 4
                            print(f"--- COS_WAVE CRUSHED ENEMY! Hearts: {enemy.heart} ---")
                        remove_spell = True
                    elif s['x'] < 0 or s['x'] > 800 or s['t'] > 90:
                        remove_spell = True

                elif stype == 'tan_spike':
                    if 'target_x' not in s:
                        s['target_x'] = owner.x + (100 * s['dir'])
                        s['x'] = s['target_x']
                        s['y'] = 600
                    if 6 <= s['t'] <= 18 and not s.get('has_hit'):
                        # Hit enemy standing on ground near the spike
                        if abs(enemy.x - s['target_x']) <= 45 and enemy.y >= 440:
                            s['has_hit'] = True
                            enemy.heart -= 1
                            enemy.jump_pixel = -12  # Piercing launch into air!
                            print(f"--- TAN_SPIKE PIERCED FROM GROUND! Hearts: {enemy.heart} ---")
                    elif s['t'] > 25:
                        remove_spell = True

                elif stype == 'cot_wall':
                    if 'x' not in s:
                        s['x'] = owner.x + (70 * s['dir'])
                        s['y'] = 530
                    if abs(enemy.x - s['x']) <= 30 and not s.get('hit_cooldown'):
                        enemy.heart -= 1
                        enemy.target_x += 45 * s['dir']  # Heavy barricade pushback
                        enemy.speed_x = 5
                        s['hit_cooldown'] = 25
                        print(f"--- ENEMY HIT COT_WALL! Pushback! Hearts: {enemy.heart} ---")
                    if s.get('hit_cooldown', 0) > 0:
                        s['hit_cooldown'] -= 1
                    if s['t'] > 60:
                        remove_spell = True

                if not remove_spell:
                    remaining_spells.append(s)

            self.spells = remaining_spells
