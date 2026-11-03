import ast
import threading
import logging

logger = logging.getLogger("stickman_battle.compiler")

MAX_CODE_LENGTH = 2000

class SecurityValidator(ast.NodeVisitor):
    FORBIDDEN_NAMES = {
        'eval', 'exec', 'compile', 'getattr', 'setattr', 'delattr',
        'globals', 'locals', 'vars', 'breakpoint', 'memoryview',
        '__import__', 'open', 'exit', 'quit', 'help'
    }

    def __init__(self):
        self.loop_depth = 0
        self.current_function = None

    def visit_Import(self, node):
        raise ValueError("Importing modules ('import') is forbidden!")

    def visit_ImportFrom(self, node):
        raise ValueError("Importing modules ('from ... import') is forbidden!")

    def visit_Attribute(self, node):
        if node.attr.startswith('_'):
            raise ValueError(f"Attribute '{node.attr}' is forbidden!")
        self.generic_visit(node)

    def visit_Name(self, node):
        if node.id.startswith('_'):
            raise ValueError(f"Variable '{node.id}' is forbidden!")
        if node.id in self.FORBIDDEN_NAMES:
            raise ValueError(f"Function/Identifier '{node.id}' is restricted!")
        self.generic_visit(node)

    def visit_While(self, node):
        raise ValueError("'while' loops are disabled! Use 'for i in range(...)'.")

    def visit_Try(self, node):
        raise ValueError("'try/except' blocks are forbidden!")

    def visit_With(self, node):
        raise ValueError("'with' blocks are forbidden!")

    def visit_AsyncFunctionDef(self, node):
        raise ValueError("Async functions are forbidden!")

    def visit_AsyncWith(self, node):
        raise ValueError("Async blocks are forbidden!")

    def visit_AsyncFor(self, node):
        raise ValueError("Async loops are forbidden!")

    def visit_For(self, node):
        self.loop_depth += 1
        if self.loop_depth > 2:
            raise ValueError("Max 2 nested loops allowed to prevent CPU exhaustion!")
        self.generic_visit(node)
        self.loop_depth -= 1

    def visit_FunctionDef(self, node):
        old_func = self.current_function
        self.current_function = node.name
        self.generic_visit(node)
        self.current_function = old_func

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if self.current_function and node.func.id == self.current_function:
                raise ValueError(f"Recursion detected! Function '{node.func.id}' cannot call itself.")
        self.generic_visit(node)

def safe_range(*args):
    # Action queue limit is 100, so prevent huge loop iterations
    if len(args) == 1:
        if args[0] > 100:
            raise ValueError("Max 100 loop iterations allowed!")
    elif len(args) >= 2:
        if abs(args[1] - args[0]) > 100:
            raise ValueError("Max 100 loop iterations allowed!")
    return range(*args)

def compiler(code, current_player, enemy_player=None):
    if hasattr(current_player, 'action_queue'):
        current_player.action_queue.clear()

    if not code or not code.strip():
        return

    # Check code size limit
    if len(code) > MAX_CODE_LENGTH:
        err = f"Security: Code size limit ({len(code)}>{MAX_CODE_LENGTH})"
        logger.warning(err)
        if hasattr(current_player, 'say'):
            current_player.say(err[:40])
            if hasattr(current_player, 'execute_next_action'):
                current_player.execute_next_action()
        return

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

    # Safe sandboxed builtins
    safe_builtins = {
        "range": safe_range,
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
        "Bend": current_player.bend,
        "flip": current_player.flip,
        "Flip": current_player.flip,
        
        # New Movement & Evasion commands
        "crouch": getattr(current_player, 'crouch', current_player.bend),
        "Crouch": getattr(current_player, 'crouch', current_player.bend),
        "duck": getattr(current_player, 'duck', current_player.bend),
        "Duck": getattr(current_player, 'duck', current_player.bend),
        "dash": getattr(current_player, 'dash', current_player.run_to),
        "Dash": getattr(current_player, 'dash', current_player.run_to),
        "dodge": getattr(current_player, 'dodge', current_player.move),
        "Dodge": getattr(current_player, 'dodge', current_player.move),
        
        # hand
        "set_right_hand": current_player.set_right_hand,
        "set_left_hand": current_player.set_left_hand,
        "move_right_hand": current_player.move_right_hand,
        "move_left_hand": current_player.move_left_hand,
        
        # sword & attack
        "set_sword": getattr(current_player, 'set_sword', current_player.sword.set_sword),
        "Set_sword": getattr(current_player, 'set_sword', current_player.sword.set_sword),
        "swing": getattr(current_player, 'swing', current_player.attack),
        "Swing": getattr(current_player, 'swing', current_player.attack),
        "attack": current_player.attack,
        "Attack": current_player.attack,
        "heavy_attack": getattr(current_player, 'heavy_attack', current_player.attack),
        "Heavy_attack": getattr(current_player, 'heavy_attack', current_player.attack),
        "throw_sword": getattr(current_player, 'throw_sword', current_player.attack),
        "Throw_sword": getattr(current_player, 'throw_sword', current_player.attack),
        
        # shield
        "set_shield": getattr(current_player, 'set_shield', current_player.shield.set_shield),
        "Set_shield": getattr(current_player, 'set_shield', current_player.shield.set_shield),
        "block": current_player.block,
        "Block": current_player.block,
        
        # jump & project
        "project": current_player.project,
        "Project": current_player.project,
        "long_jump": current_player.long_jump,
        "Long_jump": current_player.long_jump,

        # Trigonometric Magic Spells
        "sin_wave": getattr(current_player, 'sin_wave', None),
        "Sin_wave": getattr(current_player, 'sin_wave', None),
        "cos_wave": getattr(current_player, 'cos_wave', None),
        "Cos_wave": getattr(current_player, 'cos_wave', None),
        "tan_spike": getattr(current_player, 'tan_spike', None),
        "Tan_spike": getattr(current_player, 'tan_spike', None),
        "sec_barrier": getattr(current_player, 'sec_barrier', None),
        "Sec_barrier": getattr(current_player, 'sec_barrier', None),
        "cosec_dome": getattr(current_player, 'cosec_dome', None),
        "Cosec_dome": getattr(current_player, 'cosec_dome', None),
        "cot_wall": getattr(current_player, 'cot_wall', None),
        "Cot_wall": getattr(current_player, 'cot_wall', None),

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
        # Step 1: AST Static Security Analysis
        parsed_tree = ast.parse(code)
        validator = SecurityValidator()
        validator.visit(parsed_tree)

        # Step 2: Sandboxed environment execution with 0.3s timeout guard
        exec_error = []
        def run_target():
            try:
                exec(code, safe_env)
            except Exception as ex:
                exec_error.append(ex)

        t = threading.Thread(target=run_target)
        t.daemon = True
        t.start()
        t.join(timeout=0.3)

        if t.is_alive():
            raise TimeoutError("Execution timed out (max 0.3s)!")
        if exec_error:
            raise exec_error[0]

        logger.info("Code executed successfully! Actions queued.")
    except SyntaxError as se:
        err = f"Syntax Error (line {se.lineno})"
        logger.warning(f"Syntax error: {err}")
        if hasattr(current_player, 'say'):
            current_player.say(err)
            if hasattr(current_player, 'execute_next_action'):
                current_player.execute_next_action()
    except (ValueError, TimeoutError) as ve:
        err = f"Security: {ve}"[:40]
        logger.warning(f"Security error: {err}")
        if hasattr(current_player, 'say'):
            current_player.say(err)
            if hasattr(current_player, 'execute_next_action'):
                current_player.execute_next_action()
    except Exception as e:
        err = f"Error: {e}"[:40]
        logger.warning(f"Execution error: {err}")
        if hasattr(current_player, 'say'):
            current_player.say(err)
            if hasattr(current_player, 'execute_next_action'):
                current_player.execute_next_action()
