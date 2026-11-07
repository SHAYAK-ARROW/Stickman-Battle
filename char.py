import math

MAX_HEALTH = 10
MAX_ENERGY = 100


def _safe_float(val, default=1.0, min_val=-100.0, max_val=100.0):
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        return default
    if not math.isfinite(val):
        return default
    return max(min_val, min(max_val, float(val)))


class Character:
    def __init__(self, name, x=0, y=0, direction=1):
        self.name = name
        self.heart = MAX_HEALTH
        self.energy = MAX_ENERGY
        self.max_energy = MAX_ENERGY
        self.x = x
        self.y = y
        self.direction = direction
        self.target_x = x
        self.target_y = y
        self.action_queue = []
        self.speech_text = ""
        self.speech_timer = 0
        self.pending_question = None
    
    def move(self, step=1):
        if len(self.action_queue) < 100:
            self.action_queue.append(('move', _safe_float(step, 1.0, -20.0, 20.0)))
    
    def run_to(self, step=1):
        if len(self.action_queue) < 100:
            self.action_queue.append(('run', _safe_float(step, 1.0, -20.0, 20.0)))

    def flip(self):
        if len(self.action_queue) < 100:
            self.action_queue.append(('flip',))

class Body(Character):
    def __init__(self, name, x, y, direction=1):
        super().__init__(name=name, x=x, y=y, direction=direction)
        self.right_hand_x = x + 40
        self.right_hand_y = y
        self.left_hand_x = x + 40
        self.left_hand_y = y 
        self.jump_pixel = 0
        self.bend_angle = 0
        self.crouch_timer = 0
        self.barrier_timer = 0
        self.dome_timer = 0
        self.barrier_power = 1
        self.dome_power = 1
        self.cast_timer = 0
        self.has_sword = True
        self.pending_spells = []
        self.sword = Sword(length=50, angle=0)
        self.shield = Shield(length=40)
       
    def set_right_hand(self, x, y):
        self.right_hand_x = x
        self.right_hand_y = y
      
    def set_left_hand(self, x, y):
        self.left_hand_x = x
        self.left_hand_y = y

    def move_right_hand(self, dx, dy):
        self.right_hand_x += dx
        self.right_hand_y += dy

    def move_left_hand(self, dx, dy):
        self.left_hand_x += dx
        self.left_hand_y += dy

    # Custom Weapon & Shield Setters (fully functional)
    def set_sword(self, length=50, angle=0):
        if hasattr(self, 'sword'):
            self.sword.set_sword(_safe_float(length, 50.0, 10.0, 120.0), _safe_float(angle, 0.0, -360.0, 360.0))

    def swing(self, dx=0, dy=0):
        # Distinct swift horizontal attack (faster than regular attack)
        if not getattr(self, 'has_sword', True):
            self.say("No sword to swing!")
            return
        if len(self.action_queue) < 100:
            self.action_queue.append(('swing',))

    def set_shield(self, length=40, angle=45):
        if hasattr(self, 'shield'):
            self.shield.set_shield(_safe_float(length, 40.0, 10.0, 100.0), _safe_float(angle, 45.0, -360.0, 360.0))

    def crouch(self):
        if len(self.action_queue) < 100:
            self.action_queue.append(('crouch',))

    def duck(self):
        self.crouch()

    def bend(self, angle=0):
        self.crouch()

    def dash(self, step=3):
        if len(self.action_queue) < 100:
            self.action_queue.append(('dash', _safe_float(step, 3.0, -20.0, 20.0)))

    def dodge(self, step=3):
        if len(self.action_queue) < 100:
            self.action_queue.append(('dodge', _safe_float(step, 3.0, -20.0, 20.0)))

    def heavy_attack(self):
        if not getattr(self, 'has_sword', True):
            self.say("No sword in hand!")
            return
        if len(self.action_queue) < 100:
            self.action_queue.append(('heavy_attack',))

    def throw_sword(self):
        if not getattr(self, 'has_sword', True):
            self.say("No sword to throw!")
            return
        if len(self.action_queue) < 100:
            self.action_queue.append(('throw_sword',))

    # --- Trigonometric Magic Spells ---
    def _queue_power_spell(self, spell_name, power=1):
        if (isinstance(power, bool) or not isinstance(power, (int, float))
                or (isinstance(power, float) and not math.isfinite(power))):
            self.say("Spell power must be a number from 1 to 90")
            return
        raw_power = max(1, min(90, power))
        power_tier = int(math.floor(1 + ((raw_power - 1) * 9 / 89) + 0.5))
        if len(self.action_queue) < 100:
            self.action_queue.append(('spell', spell_name, power_tier))

    def sin_wave(self, power=1):
        self._queue_power_spell('sin_wave', power)

    def cos_wave(self, power=1):
        self._queue_power_spell('cos_wave', power)

    def tan_spike(self, power=1):
        self._queue_power_spell('tan_spike', power)

    def sec_barrier(self, power=1):
        self._queue_power_spell('sec_barrier', power)

    def cosec_dome(self, power=1):
        self._queue_power_spell('cosec_dome', power)

    def cot_wall(self, power=1):
        self._queue_power_spell('cot_wall', power)

    def jump(self, power=5):
        if len(self.action_queue) < 100:
            self.action_queue.append(('jump', _safe_float(power, 5.0, 0.0, 30.0)))

    def long_jump(self, step=2, power=5):
        if len(self.action_queue) < 100:
            self.action_queue.append(('long_jump', _safe_float(step, 2.0, -20.0, 20.0), _safe_float(power, 5.0, 0.0, 30.0)))
            
    def project(self, angle=45, power=5):
        if len(self.action_queue) < 100:
            self.action_queue.append(('project', _safe_float(angle, 45.0, -360.0, 360.0), _safe_float(power, 5.0, 0.0, 30.0)))

    def attack(self):
        if not getattr(self, 'has_sword', True):
            self.say("No sword in hand!")
            return
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
            
        action = self.action_queue[0]
        action_type = action[0]
        
        # Energy Cost Evaluation
        if action_type == 'spell':
            power = action[2] if len(action) > 2 else 1
            cost = 12 + (power * 2)
        elif action_type == 'heavy_attack':
            cost = 25
        elif action_type == 'throw_sword':
            cost = 20
        elif action_type in ('block', 'dash', 'dodge'):
            cost = 10
        elif action_type in ('attack', 'swing'):
            cost = 5
        else:
            cost = 0

        # Stamina / Energy Check: wait for passive recharge instead of dropping action
        current_energy = getattr(self, 'energy', MAX_ENERGY)
        if current_energy < cost:
            self.speech_text = f"Low Energy ({int(current_energy)}/{cost}⚡)"
            self.speech_timer = 30
            return
        
        # Pop only when sufficient energy is confirmed
        self.action_queue.pop(0)
        
        if cost > 0:
            self.energy = max(0, current_energy - cost)
        
        if action_type == 'move':
            step = _safe_float(action[1], 1.0, -20.0, 20.0)
            self.speed_x = 2
            self.target_x += (10 * step * self.direction)
        elif action_type == 'run':
            step = _safe_float(action[1], 1.0, -20.0, 20.0)
            self.speed_x = 4
            self.target_x += (10 * step * self.direction)
        elif action_type == 'flip':
            if self.direction == 1:
                self.direction = -1
            elif self.direction == -1:
                self.direction = 1
        elif action_type == 'dash':
            step = _safe_float(action[1], 3.0, -20.0, 20.0)
            self.speed_x = 10
            self.target_x += (10 * step * self.direction)
        elif action_type == 'dodge':
            step = _safe_float(action[1], 3.0, -20.0, 20.0)
            self.speed_x = 10
            self.target_x -= (10 * step * self.direction)
        elif action_type == 'crouch':
            self.crouch_timer = 30
        elif action_type == 'jump':
            power = _safe_float(action[1], 5.0, 0.0, 30.0)
            pixel = power * 5
            self.jump_pixel = -pixel
        elif action_type == 'long_jump':
            step = _safe_float(action[1], 2.0, -20.0, 20.0)
            power = _safe_float(action[2] if len(action) > 2 else 5.0, 5.0, 0.0, 30.0)
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
            raw_angle = _safe_float(action[1], 45.0, -360.0, 360.0)
            # Clamp angle to upward arc (10 to 170 degrees) to prevent diving into floor
            angle = max(10.0, min(170.0, abs(raw_angle) if abs(raw_angle) > 0 else 45.0))
            power = _safe_float(action[2] if len(action) > 2 else 5.0, 5.0, 0.0, 30.0)
            rad = math.radians(angle)
            v = power * 5
            v_y = max(1.0, v * math.sin(rad))
            v_x = v * math.cos(rad)
            self.jump_pixel = -v_y
            air_time = 2 * v_y
            distance = v_x * air_time
            self.target_x += (distance * self.direction)
            if air_time > 0:
                self.speed_x = max(1.0, abs(distance / air_time))
            else:
                self.speed_x = 2
        elif action_type == 'attack':
            if not getattr(self, 'has_sword', True):
                self.speech_text = "No sword!"
                self.speech_timer = 40
            elif hasattr(self, 'shield') and self.shield.block_timer > 0:
                self.sword.attack_queued = True
                self.sword.is_heavy = False
                self.sword.is_swing = False
            elif hasattr(self, 'sword') and self.sword.attack_state == 0:
                self.sword.is_heavy = False
                self.sword.is_swing = False
                self.sword.attack()
        elif action_type == 'swing':
            if not getattr(self, 'has_sword', True):
                self.speech_text = "No sword!"
                self.speech_timer = 40
            elif hasattr(self, 'shield') and self.shield.block_timer > 0:
                self.sword.attack_queued = True
                self.sword.is_heavy = False
                self.sword.is_swing = True
            elif hasattr(self, 'sword') and self.sword.attack_state == 0:
                self.sword.is_heavy = False
                self.sword.is_swing = True
                self.sword.attack_state = 1
                self.sword.target_angle = -15  # Swift horizontal windup
        elif action_type == 'heavy_attack':
            if not getattr(self, 'has_sword', True):
                self.speech_text = "No sword!"
                self.speech_timer = 40
            elif hasattr(self, 'shield') and self.shield.block_timer > 0:
                self.sword.attack_queued = True
                self.sword.is_heavy = True
                self.sword.is_swing = False
            elif hasattr(self, 'sword') and self.sword.attack_state == 0:
                self.sword.is_heavy = True
                self.sword.is_swing = False
                self.sword.attack_state = 1
                self.sword.target_angle = -70
        elif action_type == 'throw_sword':
            if getattr(self, 'has_sword', True):
                self.has_sword = False # Disarmed until sword returns!
                self.pending_spells.append({
                    'type': 'throw_sword',
                    'x': self.x + (35 * self.direction),
                    'y': self.y + 45,
                    'dir': self.direction,
                    'owner': self,
                    'origin_x': self.x,
                    'distance_traveled': 0,
                    'returning': False
                })
                self.cast_timer = 12
            else:
                self.speech_text = "No sword to throw!"
                self.speech_timer = 40
        elif action_type == 'spell':
            spell_name = action[1]
            power = action[2] if len(action) > 2 else 1
            if spell_name == 'sec_barrier':
                self.barrier_power = power
                self.barrier_timer = 40 + (10 * power)
            elif spell_name == 'cosec_dome':
                self.dome_power = power
                self.dome_timer = 40 + (10 * power)
            else:
                self.pending_spells.append({
                    'type': spell_name,
                    'x': self.x,
                    'y': self.y,
                    'dir': self.direction,
                    'owner': self,
                    'power': power
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
    def __init__(self, length=40):
        self.shield_length = max(20, min(70, int(length)))
        self.shield_lenght = self.shield_length # Compatibility
        self.shield_angel = 45
        self.block_timer = 0

    def set_shield(self, length=40, angle=45):
        self.shield_length = max(20, min(70, int(length)))
        self.shield_lenght = self.shield_length
        self.shield_angel = int(angle)

    def block(self):
        self.shield_angel = 0
        self.block_timer = 30

class Sword:
    def __init__(self, length=50, angle=0):
        self.sword_length = max(30, min(80, int(length)))
        self.sword_angle = int(angle)
        self.target_angle = int(angle)
        self.attack_state = 0 # 0=idle, 1=windup, 2=slash, 3=return
        self.attack_queued = False
        self.has_hit = False
        self.is_heavy = False
        self.is_swing = False
        
    def set_sword(self, length=50, angle=0):
        self.sword_length = max(30, min(80, int(length)))
        self.sword_angle = int(angle)
        self.target_angle = int(angle)
        
    def swing(self, dx=0, dy=0):
        if self.attack_state == 0:
            self.is_heavy = False
            self.is_swing = True
            self.attack_state = 1
            self.target_angle = -15
        
    def attack(self):
        if self.attack_state == 0:
            self.is_heavy = False
            self.is_swing = False
            self.attack_state = 1
            self.target_angle = -40
