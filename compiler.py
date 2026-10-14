def compiler(code,current_player):
    # Notun code run korar shathe shathe ager pending action queue clear kora holo
    if hasattr(current_player, 'action_queue'):
        current_player.action_queue.clear()

    code=code.lower()
    
    # Safe sandboxed builtins - os, sys, eval, exec, __import__, open shob block thakbe security r jonno
    safe_builtins = {
        "range": range,
        "len": len,
        "print": print,
        "min": min,
        "max": max,
        "abs": abs,
        "round": round,
        "int": int,
        "float": float,
        "str": str,
        "bool": bool,
        "list": list,
        "dict": dict,
        "True": True,
        "False": False,
        "None": None,
        # code.lower() use kora hoyeche tai lowercase boolean o support korche
        "true": True,
        "false": False,
        "none": None,
    }

    safe_env = {
        "__builtins__": safe_builtins,
        # Character & Body methods
        "move": current_player.move,
        "run": current_player.run_to,
        "jump": current_player.jump,
        "bend": current_player.bend,
        "flip": current_player.flip,
        
        # hand
        "set_right_hand": current_player.set_right_hand,
        "set_left_hand": current_player.set_left_hand,
        "move_right_hand": current_player.move_right_hand,
        "move_left_hand": current_player.move_left_hand,
        
        # sword
        "set_sword": current_player.sword.set_sword,
        "swing": current_player.sword.swing,
        "attack": current_player.attack,
        
        # shield (Body.block use kora hocche jate queue te step-by-step execute hoy)
        "set_shield": current_player.shield.set_shield,
        "block": current_player.block,
        
        # laf deoyar jono       
        "project": current_player.project,
        "long_jump": current_player.long_jump
    }

    try:
        # Sandboxed environment e code run kora hocche (kono malicious code kaj korbena)
        exec(code, safe_env)
        print("Code executed successfully! Actions queued.")
    except Exception as e:
        print("Error occurred during code execution:", e)