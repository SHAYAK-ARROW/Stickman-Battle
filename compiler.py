def compiler(code,current_player):
    code=code.lower()
    safe_env = {
        # Character & Body body
        "move": current_player.move,
        "set_p": current_player.set_p,
        "jump": current_player.jump,
        "bend": current_player.bend,
        
        # hand
        "set_right_hand": current_player.set_right_hand,
        "set_left_hand": current_player.set_left_hand,
        "move_right_hand": current_player.move_right_hand,
        "move_left_hand": current_player.move_left_hand,
        
        # sword
        "set_sword": current_player.sword.set_sword,
        "swing": current_player.sword.swing,
        "attack": current_player.sword.attack,
        
        # shild
        "set_shield": current_player.shield.set_shield,
        "block": current_player.shield.block,
         #laf deoyar jono       
         "project": current_player.project 
    }
    # builtin method ditye jekono sytax je smoik bhabe chage kroa jay dtiled jani na ei module ta bujhi o ni tobe jani eta usw er bhasa ke  sohoj bhasa jekhane opp er ullkhe thakbe na 
    # cheg kroe dichi jate user ke beshi khatte na hoy jeno ete asol pythoner if else loops use korte parbo mul udehso jeta cpde kore python sekha 

    try:
        # Etao ami jani na eta ekrta spcila sytax jeta code take run kroa u  eval use korni kaorn multylie sting acvhe 
        exec(code, {"__builtins__": None}, safe_env)
        print("Code executed successfully!")
    except Exception as e:
        print("Error ocuard:", e)