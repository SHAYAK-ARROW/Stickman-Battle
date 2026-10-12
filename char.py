class Character:
    def __init__(self, name,x=0,y=0,direction=1):
        self.name = name
        self.heart = 5
        self.x=x
        self.y=y
        self.direction=direction
        self.target_x=x
        self.target_y=y
     
    
    #1 step amra 10 pixel dhorchi 
    def move(self,direction=1):
        self.target_x += (10 * direction * self.direction)
        ...
    
    
    def run_to(self, step):
        self.target_x += (10 * step * self.direction)

        ...
    def flip(self):
        if self.direction==1:
            self.direction=-1
        elif self.direction==-1:
            self.direction=1

class Body(Character):
    def __init__(self,name,x,y,direction=1):
        super().__init__(name=name,x=x,y=y,direction=direction)
        #ekhane amder ekta kotha ache amra ekta class banabop dujon player er jono ebar tara to screner  dui diye thakbe sei jono apto eta korchi anba fix value dichi na ekmon krote hobe  char er x y k0tahy ache dehe bosa te hoibe 
        self.right_hand_x = x+40
        self.right_hand_y = y
        self.left_hand_x = x+40
        self.left_hand_y = y 
        self.jump_pixel=0
        self.bend_angle=0
        self.sword  = Sword(length=50, angle=0)
    
        self.shield = Shield(length=40)
       
    def set_right_hand(self, x, y):
      #n ekhane amder dekhte hoibe right_hantx y theke x,y te jaoyar somoy colisiyion kina 
      #xy use debe 
      ...
      
      #problem 1====  #EI JAGAY SORA SORI SELF DIYE OI VARIVALE VA;LUE CHGE KROE DITEI PARTAM BUT SE KLHTRE SPEED E HAT NORLE COLLISIN HOE NA 
    # ekhane e kta jhamela ache seta holo jodi nijer sathe dhaka khay amto v1 er jono amder nijer satha dhaka ta upekha kra hobe 
    def set_left_hand(self, x, y):
        # see problm 1
        ...
    def move_right_hand(self, dx, dy):
        # Move the right hand by dx and dy
        #ekaneneo problem 1 
        self.right_hand_x += dx
        self.right_hand_y += dy
#dekho ekhane amr shuhdu variable ta set kro edilam kothay jete heb ekte egolam na eabr dekho ebar game lop theke jokhon update kom hobe se dekhe terget er bortoman obosthan differ korche tokhon se chage kore debe  
    def move_left_hand(self, dx, dy):
        # Move the left hand by dx and dy
        #ekaneneo problem 1
        self.left_hand_x += dx
        self.left_hand_y += dy

    def bend(self, angle):
        # Bend the character's body

        ...
    def jump(self, power):
        pixel=power*5
        self.jump_pixel=-pixel
        # default move will use fixed speed

    def long_jump(self, step, power):
        # Synchronize jump and horizontal move
        v_y = power * 5
        self.jump_pixel = -v_y
        
        # Calculate time in air (gravity is +1 per frame, so 2 * v_y frames total)
        air_time = 2 * v_y
        
        # Calculate total distance to move horizontally
        distance = step * 10
        self.target_x += (distance * self.direction)
        
        # Adjust horizontal speed so it finishes exactly when landing
        if air_time > 0:
            self.speed_x = abs(distance / air_time)
        else:
            self.speed_x = 2
            
    def project(self, angle, power):
        import math
        # Angle logic for jump
        rad = math.radians(angle)
        # Assuming maximum power ~ 10 -> initial velocity max ~ 50
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

    def attack(self):
        if self.shield.block_timer>0:
            self.sword.attack_queued=True
        elif self.sword.attack_state==0:
            self.sword.attack_state=1
            self.sword.target_angle=-15
        

        
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
        self.attack_queued=False
        
    def set_sword(self, length, angle):
        #problem 1
        pass
        
    def swing(self, dx, dy):
        # Move the sword by dx and dy
        #problem 1
        pass
        
    def attack(self):
        # 15 degree pichone nibe (Windup)
        if self.attack_state == 0:
            self.attack_state = 1
            self.target_angle = -15


def collision(obj1, obj2):
    # Check if the bounding boxes of obj1 and obj2 overlap
    ...