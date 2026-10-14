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
        # ekhane amder ekta kotha ache amra ekta class banabop dujon player er jono
        self.right_hand_x = x+40
        self.right_hand_y = y
        self.left_hand_x = x+40
        self.left_hand_y = y 
        self.jump_pixel=0
        self.bend_angle=0
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
        # Action queue te bend pathano holo
        if len(self.action_queue) < 100:
            self.action_queue.append(('bend', angle))

    def jump(self, power=5):
        # Action queue te jump command pathano holo
        if len(self.action_queue) < 100:
            self.action_queue.append(('jump', power))

    def long_jump(self, step=2, power=5):
        # Action queue te long_jump command pathano holo
        if len(self.action_queue) < 100:
            self.action_queue.append(('long_jump', step, power))
            
    def project(self, angle=45, power=5):
        # Action queue te project command pathano holo
        if len(self.action_queue) < 100:
            self.action_queue.append(('project', angle, power))

    def attack(self):
        # Action queue te attack command pathano holo
        if len(self.action_queue) < 100:
            self.action_queue.append(('attack',))

    def block(self):
        # Action queue te block command pathano holo
        if len(self.action_queue) < 100:
            self.action_queue.append(('block',))

    def execute_next_action(self):
        # Action Queue theke porer command ber kore execute kora
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
            self.speed_x = 4  # run korle speed beshi (4px/frame)
            self.target_x += (10 * step * self.direction)
        elif action_type == 'flip':
            if self.direction == 1:
                self.direction = -1
            elif self.direction == -1:
                self.direction = 1
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
            # Shield block cholakale attack queue hobe, nahole direct -40 deg windup shuru hobe
            if hasattr(self, 'shield') and self.shield.block_timer > 0:
                self.sword.attack_queued = True
            elif hasattr(self, 'sword') and self.sword.attack_state == 0:
                self.sword.attack()
        elif action_type == 'block':
            if hasattr(self, 'shield'):
                self.shield.block()
        

        
class Shield:
    def __init__(self,length):
        self.shield_lenght = length
        self.shield_angel = 45
        self.block_timer=0


    def set_shield(self, length, angle):
        #problem 1
        ...
    def block(self):
        # Move the shield by dx and dy
        #problem 1
        self.shield_angel=0
        self.block_timer=30#30 frame er jono block orbe but eta ektu kom mone hoche namr  predekhhi

        ...
class Sword:
    def __init__(self, length, angle=0):
        self.sword_length = length
        self.sword_angle = angle
        self.target_angle = angle
        self.attack_state = 0 # 0=idle, 1=windup, 2=slash, 3=return
        self.attack_queued = False
        self.has_hit = False
        
    def set_sword(self, length, angle):
        #problem 1
        pass
        
    def swing(self, dx, dy):
        # Move the sword by dx and dy
        #problem 1
        pass
        
    def attack(self):
        # mathar pichone 40 degree tulbe (Windup)
        if self.attack_state == 0:
            self.attack_state = 1
            self.target_angle = -40


def collision(obj1, obj2):
    # Check if the bounding boxes of obj1 and obj2 overlap
    ...