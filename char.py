class Character:
    def __init__(self, name,x=0,y=0,direction=1):
        self.name = name
        self.heart = 5
        self.x=x
        self.y=y
        self.direction=direction
        self.target_x=x
        self.target_y=y
        self.action_queue = []
        self.speech_text = ""
        self.speech_timer = 0
        self.pending_question = None
    
    # 1 step amra 10 pixel dhorchi - command gulo action queue te append hocche
    def move(self, step=1):
        # Action queue te move pathano holo (1 step = 10 pixel)
        if len(self.action_queue) < 100:
            self.action_queue.append(('move', step))
    
    def run_to(self, step=1):
        # Action queue te run pathano holo (druto dauranor jonno)
        if len(self.action_queue) < 100:
            self.action_queue.append(('run', step))

    def flip(self):
        # Action queue te flip pathano holo (mukh ghoranor jonno)
        if len(self.action_queue) < 100:
            self.action_queue.append(('flip',))

class Body(Character):
    def __init__(self,name,x,y,direction=1):
        super().__init__(name=name,x=x,y=y,direction=direction)
        self.right_hand_x = x+40
        self.right_hand_y = y
        self.left_hand_x = x+40
        self.left_hand_y = y 
        self.jump_pixel=0
        self.bend_angle=0
        self.crouch_timer = 0
        self.barrier_timer = 0
        self.dome_timer = 0
        self.cast_timer = 0
        self.pending_spells = []
        self.sword  = Sword(length=50, angle=0)
        self.shield = Shield(length=40)
       
    def set_right_hand(self, x, y):
        ...
      
    def set_left_hand(self, x, y):
        ...

    def move_right_hand(self, dx, dy):
        self.right_hand_x += dx
        self.right_hand_y += dy

    def move_left_hand(self, dx, dy):
        self.left_hand_x += dx
        self.left_hand_y += dy

    def bend(self, angle=0):
        if len(self.action_queue) < 100:
            self.action_queue.append(('bend', angle))

    def crouch(self):
        # Action queue te crouch pathano holo (matha nichu kore toloyar er koper niche bacha)
        if len(self.action_queue) < 100:
            self.action_queue.append(('crouch',))

    def duck(self):
        # crouch er synonym
        self.crouch()

    def dash(self, step=3):
        # Action queue te dash pathano holo (druto samne jhapano)
        if len(self.action_queue) < 100:
            self.action_queue.append(('dash', step))

    def dodge(self, step=3):
        # Action queue te dodge pathano holo (druto pichone sore jawya)
        if len(self.action_queue) < 100:
            self.action_queue.append(('dodge', step))

    def heavy_attack(self):
        # Action queue te heavy attack pathano holo (dhire kintu 2 damage ba dhal bhenge dewa)
        if len(self.action_queue) < 100:
            self.action_queue.append(('heavy_attack',))

    def throw_sword(self):
        # Action queue te toloyar chhunre marar ranged attack
        if len(self.action_queue) < 100:
            self.action_queue.append(('throw_sword',))

    # --- Trigonometric Magic Spells ---
    def sin_wave(self):
        # sin(x) dheuer moto opore niche oscillator energy projectile
        if len(self.action_queue) < 100:
            self.action_queue.append(('spell', 'sin_wave'))

    def cos_wave(self):
        # cos(x) er moto overhead unchu theke suru howa bhari shockwave
        if len(self.action_queue) < 100:
            self.action_queue.append(('spell', 'cos_wave'))

    def tan_spike(self):
        # tan(x) asymptote er moto mati funre khara opore uthe jaoya energy spike
        if len(self.action_queue) < 100:
            self.action_queue.append(('spell', 'tan_spike'))

    def sec_barrier(self):
        # sec(x) er moto curved defensive force shield
        if len(self.action_queue) < 100:
            self.action_queue.append(('spell', 'sec_barrier'))

    def cosec_dome(self):
        # csc(x) er moto protective energy dome
        if len(self.action_queue) < 100:
            self.action_queue.append(('spell', 'cosec_dome'))

    def cot_wall(self):
        # cot(x) energy barricade ja sotru ke pushback debe
        if len(self.action_queue) < 100:
            self.action_queue.append(('spell', 'cot_wall'))

    def jump(self, power=5):
        if len(self.action_queue) < 100:
            self.action_queue.append(('jump', power))

    def long_jump(self, step=2, power=5):
        if len(self.action_queue) < 100:
            self.action_queue.append(('long_jump', step, power))
            
    def project(self, angle=45, power=5):
        if len(self.action_queue) < 100:
            self.action_queue.append(('project', angle, power))

    def attack(self):
        if len(self.action_queue) < 100:
            self.action_queue.append(('attack',))

    def block(self):
        if len(self.action_queue) < 100:
            self.action_queue.append(('block',))

    def say(self, text):
        if len(self.action_queue) < 100:
            self.action_queue.append(('say', str(text)[:40]))

    def ask(self, prompt=""):
        if len(self.action_queue) < 100:
            self.action_queue.append(('ask', str(prompt)[:40]))

    def execute_next_action(self):
        if not self.action_queue:
            return
            
        action = self.action_queue.pop(0)
        action_type = action[0]
        
        if action_type == 'move':
            step = action[1]
            self.speed_x = 2
            self.target_x += (10 * step * self.direction)
        elif action_type == 'run':
            step = action[1]
            self.speed_x = 4
            self.target_x += (10 * step * self.direction)
        elif action_type == 'flip':
            if self.direction == 1:
                self.direction = -1
            elif self.direction == -1:
                self.direction = 1
        elif action_type == 'dash':
            step = action[1]
            self.speed_x = 10
            self.target_x += (10 * step * self.direction)
        elif action_type == 'dodge':
            step = action[1]
            self.speed_x = 10
            self.target_x -= (10 * step * self.direction)
        elif action_type == 'crouch':
            self.crouch_timer = 30  # 30 frames crouch thakbe (~0.5 sec)
        elif action_type == 'jump':
            power = action[1]
            pixel = power * 5
            self.jump_pixel = -pixel
        elif action_type == 'long_jump':
            step, power = action[1], action[2]
            v_y = power * 5
            self.jump_pixel = -v_y
            air_time = 2 * v_y
            distance = step * 10
            self.target_x += (distance * self.direction)
            if air_time > 0:
                self.speed_x = abs(distance / air_time)
            else:
                self.speed_x = 2
        elif action_type == 'project':
            import math
            angle, power = action[1], action[2]
            rad = math.radians(angle)
            v = power * 5
            v_y = v * math.sin(rad)
            v_x = v * math.cos(rad)
            self.jump_pixel = -v_y
            air_time = 2 * v_y
            distance = v_x * air_time
            self.target_x += (distance * self.direction)
            if air_time > 0:
                self.speed_x = abs(distance / air_time)
            else:
                self.speed_x = 2
        elif action_type == 'attack':
            if hasattr(self, 'shield') and self.shield.block_timer > 0:
                self.sword.attack_queued = True
                self.sword.is_heavy = False
            elif hasattr(self, 'sword') and self.sword.attack_state == 0:
                self.sword.is_heavy = False
                self.sword.attack()
        elif action_type == 'heavy_attack':
            if hasattr(self, 'shield') and self.shield.block_timer > 0:
                self.sword.attack_queued = True
                self.sword.is_heavy = True
            elif hasattr(self, 'sword') and self.sword.attack_state == 0:
                self.sword.is_heavy = True
                self.sword.attack_state = 1
                self.sword.target_angle = -70
        elif action_type == 'throw_sword':
            self.pending_spells.append({
                'type': 'throw_sword',
                'x': self.x + (35 * self.direction),
                'y': self.y + 45,
                'dir': self.direction,
                'owner': self
            })
            self.cast_timer = 12
        elif action_type == 'spell':
            spell_name = action[1]
            if spell_name == 'sec_barrier':
                self.barrier_timer = 50
            elif spell_name == 'cosec_dome':
                self.dome_timer = 50
            else:
                self.pending_spells.append({
                    'type': spell_name,
                    'x': self.x,
                    'y': self.y,
                    'dir': self.direction,
                    'owner': self
                })
            self.cast_timer = 12
        elif action_type == 'block':
            if hasattr(self, 'shield'):
                self.shield.block()
        elif action_type == 'say':
            self.speech_text = action[1]
            self.speech_timer = 90
            if self.action_queue:
                self.execute_next_action()
        elif action_type == 'ask':
            self.pending_question = action[1]
            self.speech_text = action[1]
            self.speech_timer = 90
            if self.action_queue:
                self.execute_next_action()

class Shield:
    def __init__(self,length):
        self.shield_lenght = length
        self.shield_angel = 45
        self.block_timer=0

    def set_shield(self, length, angle):
        ...

    def block(self):
        self.shield_angel=0
        self.block_timer=30

class Sword:
    def __init__(self, length, angle=0):
        self.sword_length = length
        self.sword_angle = angle
        self.target_angle = angle
        self.attack_state = 0 # 0=idle, 1=windup, 2=slash, 3=return
        self.attack_queued = False
        self.has_hit = False
        self.is_heavy = False
        
    def set_sword(self, length, angle):
        pass
        
    def swing(self, dx, dy):
        pass
        
    def attack(self):
        if self.attack_state == 0:
            self.is_heavy = False
            self.attack_state = 1
            self.target_angle = -40

def collision(obj1, obj2):
    ...
