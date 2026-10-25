def compiler(code, current_player, enemy_player=None):
    # Notun code run korar shathe shathe ager pending action queue clear kora holo
    if hasattr(current_player, 'action_queue'):
        current_player.action_queue.clear()

    # Code string lowercase kora bad deoya holo jate print("Text") er case preserve thake
    # code = code.lower()
    
    # Custom Speech Bubble Print (Max 5 dialogues per execution, 40 chars cap)
    print_count = 0
    def game_print(*args):
        nonlocal print_count
        if print_count >= 5:
            return
        print_count += 1
        msg = " ".join(str(a) for a in args)[:40]
        if hasattr(current_player, 'say'):
            current_player.say(msg)

    # Custom Opponent Input Prompt (Max 3 prompts per execution, 40 chars cap)
    input_count = 0
    def game_input(*args):
        nonlocal input_count
        if input_count >= 3:
            return ""
        input_count += 1
        prompt = " ".join(str(a) for a in args)[:40] if args else "Say something:"
        if hasattr(current_player, 'ask'):
            current_player.ask(prompt)
        return ""

    # Safe sandboxed builtins - os, sys, eval, exec, __import__, open shob block thakbe security r jonno
    safe_builtins = {
        "range": range,
        "len": len,
        "print": game_print,
        "input": game_input,
        "Input": game_input,
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

    # Sensor / Intel functions
    def get_enemy_distance():
        if enemy_player is None:
            return 999
        return abs(current_player.x - enemy_player.x)

    def is_enemy_attacking():
        if enemy_player is None or not hasattr(enemy_player, 'sword'):
            return False
        return enemy_player.sword.attack_state != 0

    def get_my_health():
        return current_player.heart

    def get_enemy_health():
        if enemy_player is None:
            return 0
        return enemy_player.heart

    safe_env = {
        "__builtins__": safe_builtins,
        # Character & Body methods
        "move": current_player.move,
        "Move": current_player.move,
        "run": current_player.run_to,
        "Run": current_player.run_to,
        "jump": current_player.jump,
        "Jump": current_player.jump,
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
        "Attack": current_player.attack,
        
        # shield (Body.block use kora hocche jate queue te step-by-step execute hoy)
        "set_shield": current_player.shield.set_shield,
        "block": current_player.block,
        "Block": current_player.block,
        
        # laf deoyar jono       
        "project": current_player.project,
        "long_jump": current_player.long_jump,

        # Sensor / Intel functions
        "get_enemy_distance": get_enemy_distance,
        "is_enemy_attacking": is_enemy_attacking,
        "get_my_health": get_my_health,
        "get_enemy_health": get_enemy_health,

        # Direct print and input access
        "print": game_print,
        "input": game_input,
        "Input": game_input
    }

    try:
        # Sandboxed environment e code run kora hocche (kono malicious code kaj korbena)
        exec(code, safe_env)
        print("Code executed successfully! Actions queued.")
    except Exception as e:
        print("Error occurred during code execution:", e)
