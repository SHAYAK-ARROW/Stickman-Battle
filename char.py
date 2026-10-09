class Character:
    def __init__(self, name,x=0,y=0):
        self.name = name
        self.heart = 5
        self.x=x
        self.y=y
        self.direction=1
    
    def move(self, dx, dy):
        ...
    
    
    def set_p(self, x, y):
        ...


class Body(Character):
    def __init__(self,name,x,y,direction=1):
        super().__init__(name=name,x=x,y=y)
        #ekhane amder ekta kotha ache amra ekta class banabop dujon player er jono ebar tara to screner  dui diye thakbe sei jono apto eta korchi anba fix value dichi na ekmon krote hobe  char er x y k0tahy ache dehe bosa te hoibe 
        self.right_hand_x = x+40
        self.right_hand_y = y
        self.left_hand_x = x+40
        self.left_hand_y = y 
        self.jump_pixel=0
        self.bend_angle=0
        self.sword  = Sword(length=50, angle=0)
        self.shield = Shield(length=40, angle=90)
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

    def move_left_hand(self, dx, dy):
        # Move the left hand by dx and dy
        #ekaneneo problem 1
        self.left_hand_x += dx
        self.left_hand_y += dy

    def bend(self, angle):
        # Bend the character's body

        ...
    def jump(self, pixel):
        # Jump the character by a certain number of pixels
        ...
    def project(angle,power):
        #projectile er jono amder ekta function lagbe jeta angle and power nibe and seta ke projectile er speed e convert krote hobe 
        #eta amdr laf diiye jete sahajo klorbe 
        ...

        
class Shield:
    def __init__(self,length,angle):
        self.shield_lenght = length
        self.shield_angel = angle

    def set_shield(self, length, angle):
        #problem 1
        ...
    def block(self, dx, dy):
        # Move the shield by dx and dy
        #problem 1
        ...
class Sword:
    def __init__(self,length,angle):
        self.sword_lenght = length
        self.sword_angel = angle
    def set_sword(self, length, angle):
        #problem 1
        ... 
    def swing(self, dx, dy):
        # Move the sword by dx and dy
        #problem 1
        ...
    def attack(self):
        # Move the sword 15 deg pichitye jabe tar por  20 deg egiye jabe  mane total egobe 5 deg  
        # ebar swing er function er dorka ki    but  tolyer ke pichote icha moto atack  take korte parbe na sei jonoi lagbe swing 
        
        ...


def collision(obj1, obj2):
    # Check if the bounding boxes of obj1 and obj2 overlap
    ...