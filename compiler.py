import ast
import logging
import math
import multiprocessing
import threading

logger = logging.getLogger("stickman_battle.compiler")

MAX_CODE_LENGTH = 2000
MAX_EXECUTION_SECONDS = 1.0
MAX_ACTIONS = 100
PROCESS_STARTUP_GRACE_SECONDS = 5.0
_SANDBOX_LOCK = threading.Lock()
_SANDBOX_PROCESS = None
_SANDBOX_CONNECTION = None


def _record_command(commands, name, args):
    """Record only small, serializable command arguments in the worker."""
    if len(commands) >= MAX_ACTIONS:
        return
    if not all(isinstance(value, (int, float, str, bool, type(None))) for value in args):
        raise ValueError("Command arguments must be simple values")
    commands.append((name, tuple(args)))


def _sandbox_execute(code, sensors):
    """Run one untrusted script and return only recorded game commands."""
    commands = []
    print_count = 0
    input_count = 0

    def command(name):
        def proxy(*args):
            _record_command(commands, name, args)
        return proxy

    def game_print(*args):
        nonlocal print_count
        if print_count < 5:
            print_count += 1
            _record_command(commands, "say", (" ".join(str(a) for a in args)[:40],))

    def game_input(*args):
        nonlocal input_count
        if input_count < 3:
            input_count += 1
            prompt = " ".join(str(a) for a in args)[:40] if args else "Say something:"
            _record_command(commands, "ask", (prompt,))
        return ""

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
    safe_env = {"__builtins__": safe_builtins}

    command_aliases = {
        "move": "move", "Move": "move",
        "run": "run_to", "Run": "run_to",
        "jump": "jump", "Jump": "jump",
        "bend": "bend", "Bend": "bend",
        "flip": "flip", "Flip": "flip",
        "crouch": "crouch", "Crouch": "crouch",
        "duck": "duck", "Duck": "duck",
        "dash": "dash", "Dash": "dash",
        "dodge": "dodge", "Dodge": "dodge",
        "set_right_hand": "set_right_hand",
        "set_left_hand": "set_left_hand",
        "move_right_hand": "move_right_hand",
        "move_left_hand": "move_left_hand",
        "set_sword": "set_sword", "Set_sword": "set_sword",
        "swing": "swing", "Swing": "swing",
        "attack": "attack", "Attack": "attack",
        "heavy_attack": "heavy_attack", "Heavy_attack": "heavy_attack",
        "throw_sword": "throw_sword", "Throw_sword": "throw_sword",
        "set_shield": "set_shield", "Set_shield": "set_shield",
        "block": "block", "Block": "block",
        "project": "project", "Project": "project",
        "long_jump": "long_jump", "Long_jump": "long_jump",
        "sin_wave": "sin_wave", "Sin_wave": "sin_wave",
        "cos_wave": "cos_wave", "Cos_wave": "cos_wave",
        "tan_spike": "tan_spike", "Tan_spike": "tan_spike",
        "sec_barrier": "sec_barrier", "Sec_barrier": "sec_barrier",
        "cosec_dome": "cosec_dome", "Cosec_dome": "cosec_dome",
        "cot_wall": "cot_wall", "Cot_wall": "cot_wall",
    }
    for public_name, command_name in command_aliases.items():
        safe_env[public_name] = command(command_name)

    def trig_spell(name):
        def invoke(*args):
            if len(args) == 0:
                power = 45
            elif len(args) == 1:
                power = args[0]
            else:
                raise TypeError(f"math.{name}() takes at most 1 power argument (1-90)")
            if (isinstance(power, bool) or not isinstance(power, (int, float))
                    or (isinstance(power, float) and not math.isfinite(power))):
                raise ValueError("Spell power must be a number from 1 to 90")
            power = max(1, min(90, power))
            _record_command(commands, name, (power,))
            return None
        return staticmethod(invoke)

    math_api = type("SafeMath", (), {
        "sin": trig_spell("sin_wave"),
        "cos": trig_spell("cos_wave"),
        "tan": trig_spell("tan_spike"),
        "cot": trig_spell("cot_wall"),
        "sec": trig_spell("sec_barrier"),
        "cosec": trig_spell("cosec_dome"),
        "sin_wave": trig_spell("sin_wave"),
        "cos_wave": trig_spell("cos_wave"),
        "tan_spike": trig_spell("tan_spike"),
        "cot_wall": trig_spell("cot_wall"),
        "sec_barrier": trig_spell("sec_barrier"),
        "cosec_dome": trig_spell("cosec_dome"),
        "pi": math.pi,
        "e": math.e,
        "sin_value": staticmethod(math.sin),
        "cos_value": staticmethod(math.cos),
        "tan_value": staticmethod(math.tan),
        "cot_value": staticmethod(lambda value: math.cos(value) / math.sin(value)),
        "sec_value": staticmethod(lambda value: 1 / math.cos(value)),
        "cosec_value": staticmethod(lambda value: 1 / math.sin(value)),
    })()

    def restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "math" and level == 0 and not fromlist:
            return math_api
        raise ImportError("Only 'import math' is allowed")

    safe_builtins["__import__"] = restricted_import

    safe_env.update({
        "get_enemy_distance": lambda: sensors["enemy_distance"],
        "is_enemy_attacking": lambda: sensors["enemy_attacking"],
        "get_my_health": lambda: sensors["my_health"],
        "get_enemy_health": lambda: sensors["enemy_health"],
        "print": game_print,
        "input": game_input,
        "Input": game_input,
    })

    try:
        exec(code, safe_env)
    except Exception as exc:
        return ("error", type(exc).__name__, str(exc)[:120])
    return ("ok", commands)


def _sandbox_worker(connection):
    """Keep one isolated process warm and execute scripts on request."""
    try:
        connection.send(("ready",))
        while True:
            request = connection.recv()
            if request is None:
                break
            code, sensors = request
            connection.send(_sandbox_execute(code, sensors))
    except (EOFError, BrokenPipeError, OSError):
        pass
    finally:
        connection.close()


def _discard_sandbox_worker():
    global _SANDBOX_PROCESS, _SANDBOX_CONNECTION
    process, connection = _SANDBOX_PROCESS, _SANDBOX_CONNECTION
    _SANDBOX_PROCESS = None
    _SANDBOX_CONNECTION = None
    if connection is not None:
        connection.close()
    if process is not None and process.is_alive():
        process.terminate()
        process.join(0.2)
        if process.is_alive():
            process.kill()
            process.join()


def _ensure_sandbox_worker():
    global _SANDBOX_PROCESS, _SANDBOX_CONNECTION
    if _SANDBOX_PROCESS is not None and _SANDBOX_PROCESS.is_alive():
        return

    _discard_sandbox_worker()
    context = multiprocessing.get_context("spawn")
    parent_conn, child_conn = context.Pipe(duplex=True)
    process = context.Process(
        target=_sandbox_worker,
        args=(child_conn,),
        daemon=True,
    )
    process.start()
    child_conn.close()
    if not parent_conn.poll(PROCESS_STARTUP_GRACE_SECONDS):
        process.terminate()
        process.join(0.2)
        if process.is_alive():
            process.kill()
            process.join()
        parent_conn.close()
        raise TimeoutError("Sandbox worker failed to start in time!")
    if parent_conn.recv() != ("ready",):
        process.terminate()
        process.join(0.2)
        parent_conn.close()
        raise RuntimeError("Sandbox worker failed during startup")

    _SANDBOX_PROCESS = process
    _SANDBOX_CONNECTION = parent_conn


def warm_sandbox():
    """Start the sandbox before accepting players to avoid first-run delay."""
    with _SANDBOX_LOCK:
        _ensure_sandbox_worker()


def _apply_commands(commands, current_player):
    """Replay validated worker commands on the live player object."""
    for method_name, args in commands:
        method = getattr(current_player, method_name, None)
        if method is None:
            raise ValueError(f"Unsupported command: {method_name}")
        method(*args)

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
        if len(node.names) != 1 or node.names[0].name != 'math':
            raise ValueError("Only 'import math' is allowed!")

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
        "math": type("SafeMath", (), {
            "sin": staticmethod(math.sin),
            "cos": staticmethod(math.cos),
            "tan": staticmethod(math.tan),
        })(),

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

        # Step 2: Execute in the warm isolated worker. It receives sensor
        # snapshots and returns only primitive command records, never objects.
        sensors = {
            "enemy_distance": get_enemy_distance(),
            "enemy_attacking": is_enemy_attacking(),
            "my_health": get_my_health(),
            "enemy_health": get_enemy_health(),
        }
        with _SANDBOX_LOCK:
            _ensure_sandbox_worker()
            connection = _SANDBOX_CONNECTION
            connection.send((code, sensors))
            if not connection.poll(MAX_EXECUTION_SECONDS):
                _discard_sandbox_worker()
                raise TimeoutError(
                    f"Execution timed out (max {MAX_EXECUTION_SECONDS}s)!"
                )
            result = connection.recv()

        if result[0] == "error":
            raise RuntimeError(f"{result[1]}: {result[2]}")

        _apply_commands(result[1], current_player)

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
