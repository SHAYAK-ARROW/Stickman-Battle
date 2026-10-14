class   GameEngine:
    def __init__(self):
        self.players=[]
        self.weapons=[]
        self.shields=[]

    def add_player(self,*player_list):
        for player in player_list:
            self.players.append(player)

    def update(self):
    
        for player in self.players:
            # Player mara gele tar queue clear kore debe
            if player.heart <= 0:
                if hasattr(player, 'action_queue') and player.action_queue:
                    player.action_queue.clear()
            
            # Action Queue Processor: jodi player kono kaj na korche (idle ache), tobe queue theke next action execute hobe
            is_moving = (player.x != player.target_x)
            is_airborne = (player.y < 470 or player.jump_pixel != 0)
            is_attacking = (hasattr(player, 'sword') and player.sword.attack_state != 0)
            is_blocking = (hasattr(player, 'shield') and player.shield.block_timer > 0)
            
            is_busy = is_moving or is_airborne or is_attacking or is_blocking
            
            if not is_busy and hasattr(player, 'action_queue') and player.action_queue:
                player.execute_next_action()

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
                                
            # x boundary (with hitbox, taking sword length into account)
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
                
            # Sword Animation State Machine
            if hasattr(player, 'sword'):
                sword = player.sword
                
                if sword.sword_angle != sword.target_angle:
                    speed_angle = 8
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
                        sword.target_angle = 60  # Samne soto kop marbe (Full slash!)
                    elif sword.attack_state == 2:
                        sword.attack_state = 3
                        sword.target_angle = 0   # Pichone jabe, idle hobe
                    elif sword.attack_state == 3:
                        sword.attack_state = 0   # Idle
                                # Shield Block Timer & Queued Attack
            if hasattr(player, 'shield'):# eta atribute ache kna cheke kroe 
                shield = player.shield
                if shield.block_timer > 0:
                    shield.block_timer -= 1
                    
                    #after 10 fra,me r ejono to block korvbe to 10 fram e seh hole thik korar jono
                    if shield.block_timer == 0:
                        shield.shield_angel = 45  # shield ta 45  deg e bakabo ekhabbne 
                        
                        # atcak mere thekele take jaga kore dao?
                        if hasattr(player, 'sword') and player.sword.attack_queued:
                            player.sword.attack_queued = False
                            player.sword.attack_state = 1
                            player.sword.target_angle = -40
        
        #colison 
        if len(self.players)>=2:
            p1=self.players[0]
            p2=self.players[1]
            dx=abs(p1.x-p2.x)#distanse bar korchi 
            dy=abs(p1.y-p2.y)
            
            # toloyare toloyare clash range (155px er moddhe dujonei toloyar chalale clash hobe)
            sword_range = True if (dx<=155 and dy<=60) else False  
            # kintu gaye lagte gele toloyar ke asole sorir obdhi pouchate hobe (105px)
            body_range = True if (dx<=105 and dy<=60) else False 

            # mukh kon dike ache
            p1_facing_p2 = (p1.direction == 1 and p2.x > p1.x) or (p1.direction == -1 and p2.x < p1.x)
            p2_facing_p1 = (p2.direction == 1 and p1.x > p2.x) or (p2.direction == -1 and p1.x < p2.x)
            
            # attack active kina (shudhu attack_state == 2 thakle)
            p1_slashing = (hasattr(p1, 'sword') and p1.sword.attack_state == 2 and not getattr(p1.sword, 'has_hit', False))
            p2_slashing = (hasattr(p2, 'sword') and p2.sword.attack_state == 2 and not getattr(p2.sword, 'has_hit', False))
            
            # Case 1: Dujon eksathe attack korle toloyare toloyare bari kheye -> CLASH!
            if sword_range and p1_slashing and p2_slashing and p1_facing_p2 and p2_facing_p1:
                p1.sword.has_hit = True
                p2.sword.has_hit = True
                p1.target_x -= 20 * p1.direction
                p2.target_x -= 20 * p2.direction
                p1.speed_x = 4
                p2.speed_x = 4
                print("--- SWORD CLASH! ---")
                
            # Case 2: Player 1 attack korle (gaye lagle tobe damage hobe)
            elif body_range and p1_slashing and p1_facing_p2:
                p1.sword.has_hit = True
                if hasattr(p2, 'shield') and p2.shield.block_timer > 0 and p2_facing_p1:
                    print("--- PLAYER 2 BLOCKED WITH SHIELD! ---")
                else:
                    p2.heart -= 1
                    p2.target_x += 30 * p1.direction
                    p2.speed_x = 4
                    print(f"--- PLAYER 2 HIT! Hearts left: {p2.heart} ---")
                    
            # Case 3: Player 2 attack korle (gaye lagle tobe damage hobe)
            elif body_range and p2_slashing and p2_facing_p1:
                p2.sword.has_hit = True
                if hasattr(p1, 'shield') and p1.shield.block_timer > 0 and p1_facing_p2:
                    print("--- PLAYER 1 BLOCKED WITH SHIELD! ---")
                else:
                    p1.heart -= 1
                    p1.target_x += 30 * p2.direction
                    p1.speed_x = 4
                    print(f"--- PLAYER 1 HIT! Hearts left: {p1.heart} ---")
                    
            # Cooldown reset: attack sesh hole has_hit False kora
            if hasattr(p1, 'sword') and p1.sword.attack_state == 0:
                p1.sword.has_hit = False
            if hasattr(p2, 'sword') and p2.sword.attack_state == 0:
                p2.sword.has_hit = False