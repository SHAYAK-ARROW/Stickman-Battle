import ast
import logging
import math
import multiprocessing
import random as py_random
import re
import threading
import traceback

logger = logging.getLogger("stickman_battle.compiler")

MAX_CODE_LENGTH = 2000
MAX_EXECUTION_SECONDS = 1.0
MAX_ACTIONS = 100
PROCESS_STARTUP_GRACE_SECONDS = 5.0
_SANDBOX_LOCK = threading.Lock()
_SANDBOX_PROCESS = None
_SANDBOX_CONNECTION = None


NUMERIC_COMMANDS = {
    'move', 'run', 'run_to', 'dash', 'dodge', 'jump', 'long_jump',
    'project', 'set_sword', 'set_shield', 'sin_wave', 'cos_wave',
    'tan_spike', 'sec_barrier', 'cosec_dome', 'cot_wall'
}

def _record_command(commands, name, args):
    """Record only small, serializable command arguments in the worker."""
    if len(commands) >= MAX_ACTIONS:
        return
    if name in NUMERIC_COMMANDS:
        clean_args = []
        for val in args:
            if isinstance(val, bool) or not isinstance(val, (int, float)):
                raise ValueError(f"Command '{name}' expects numeric argument(s), got {type(val).__name__}")
            if not math.isfinite(val):
                raise ValueError(f"Command '{name}' received non-finite numeric argument")
            clean_args.append(val)
        commands.append((name, tuple(clean_args)))
    else:
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
        prompt_str = (" ".join(str(a) for a in args) if args else "").lower()
        if "rush" in prompt_str:
            return "rush"
        if "attack" in prompt_str:
            return "attack"
        if "defend" in prompt_str or "block" in prompt_str:
            return "defend"
        return "yes"

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

    def _safe_randint(a, b):
        if isinstance(a, bool) or isinstance(b, bool) or not isinstance(a, int) or not isinstance(b, int):
            raise TypeError("random.randint(a, b) expects integer arguments")
        if abs(a) > 1000 or abs(b) > 1000:
            raise ValueError("random.randint() bounds must be within [-1000, 1000]")
        return py_random.randint(min(a, b), max(a, b))

    def _safe_choice(seq):
        if not isinstance(seq, (list, tuple)):
            raise TypeError("random.choice() expects a list or tuple")
        if len(seq) == 0:
            raise IndexError("Cannot choose from an empty sequence")
        if len(seq) > 100:
            raise ValueError("Sequence length exceeds limit (max 100)")
        return py_random.choice(seq)

    def _safe_uniform(a, b):
        if isinstance(a, bool) or isinstance(b, bool) or not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            raise TypeError("random.uniform(a, b) expects numeric arguments")
        if abs(a) > 1000 or abs(b) > 1000:
            raise ValueError("random.uniform() bounds must be within [-1000, 1000]")
        return py_random.uniform(a, b)

    random_api = type("SafeRandom", (), {
        "randint": staticmethod(_safe_randint),
        "choice": staticmethod(_safe_choice),
        "random": staticmethod(py_random.random),
        "uniform": staticmethod(_safe_uniform),
    })()

    def restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
        if level != 0:
            raise ImportError("Relative imports are not allowed")
        if name == "math":
            if fromlist:
                for item in fromlist:
                    if not hasattr(math_api, item):
                        raise ImportError(f"Cannot import '{item}' from math. Note: This is Stickman Battle's battle math module (sin, cos, tan, cot, sec, cosec, pi, e).")
            return math_api
        elif name == "random":
            if fromlist:
                for item in fromlist:
                    if not hasattr(random_api, item):
                        raise ImportError(f"Cannot import '{item}' from random. Available methods: randint, choice, random, uniform")
            return random_api
        raise ImportError(f"Importing '{name}' is restricted for battle security! Only 'math' and 'random' are allowed.")

    safe_builtins["__import__"] = restricted_import

    safe_env.update({
        "enemy_distance": sensors["enemy_distance"],
        "get_enemy_distance": lambda: sensors["enemy_distance"],
        "enemy_attacking": sensors["enemy_attacking"],
        "is_enemy_attacking": lambda: sensors["enemy_attacking"],
        "enemy_blocking": sensors.get("enemy_blocking", False),
        "is_enemy_blocking": lambda: sensors.get("enemy_blocking", False),
        "enemy_crouching": sensors.get("enemy_crouching", False),
        "is_enemy_crouching": lambda: sensors.get("enemy_crouching", False),
        "enemy_airborne": sensors.get("enemy_airborne", False),
        "is_enemy_airborne": lambda: sensors.get("enemy_airborne", False),
        "enemy_direction": sensors.get("enemy_direction", -1),
        "get_enemy_direction": lambda: sensors.get("enemy_direction", -1),
        "my_health": sensors["my_health"],
        "get_my_health": lambda: sensors["my_health"],
        "enemy_health": sensors["enemy_health"],
        "get_enemy_health": lambda: sensors["enemy_health"],
        "my_energy": sensors.get("my_energy", 100),
        "get_my_energy": lambda: sensors.get("my_energy", 100),
        "enemy_energy": sensors.get("enemy_energy", 100),
        "get_enemy_energy": lambda: sensors.get("enemy_energy", 100),
        "print": game_print,
        "input": game_input,
        "Input": game_input,
    })

    total_loop_steps = 0
    def _check_loop(loop_id):
        nonlocal total_loop_steps
        total_loop_steps += 1
        return total_loop_steps <= 100

    safe_env["_check_loop"] = _check_loop

    try:
        parsed_tree = ast.parse(code, filename="<strategy.py>")
        guard = WhileLoopGuard()
        transformed_tree = guard.visit(parsed_tree)
        ast.fix_missing_locations(transformed_tree)
        compiled = compile(transformed_tree, "<strategy.py>", "exec")
        exec(compiled, safe_env)
    except Exception as exc:
        tb = traceback.extract_tb(exc.__traceback__)
        strat_frame = next((f for f in reversed(tb) if f.filename == "<strategy.py>"), None)
        lineno = strat_frame.lineno if strat_frame else (tb[-1].lineno if tb else 1)
        code_lines = code.splitlines()
        fault_line = code_lines[lineno - 1].strip() if lineno and 0 < lineno <= len(code_lines) else ""
        idle_err = (
            f'Traceback (most recent call last):\n'
            f'  File "<strategy.py>", line {lineno}, in <module>\n'
            f'    {fault_line}\n'
            f'{type(exc).__name__}: {exc}'
        )
        return ("error", type(exc).__name__, idle_err)
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

class WhileLoopGuard(ast.NodeTransformer):
    """Safely bounds all 'while' loops so they cannot exceed 100 total iterations."""
    def __init__(self):
        super().__init__()
        self.loop_id = 0

    def visit_While(self, node):
        self.generic_visit(node)
        self.loop_id += 1
        check_call = ast.Call(
            func=ast.Name(id='_check_loop', ctx=ast.Load()),
            args=[ast.Constant(value=self.loop_id)],
            keywords=[]
        )
        node.test = ast.BoolOp(
            op=ast.And(),
            values=[node.test, check_call]
        )
        return node

class SecurityValidator(ast.NodeVisitor):
    FORBIDDEN_NAMES = {
        'eval', 'exec', 'compile', 'getattr', 'setattr', 'delattr',
        'globals', 'locals', 'vars', 'breakpoint', 'memoryview',
        '__import__', 'open', 'exit', 'quit', 'help'
    }

    ALLOWED_MODULES = {'math', 'random'}

    def __init__(self):
        self.loop_depth = 0
        self.current_function = None

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name not in self.ALLOWED_MODULES:
                raise ValueError(f"Importing '{alias.name}' is restricted for battle security! Only 'math' and 'random' are allowed.")

    def visit_ImportFrom(self, node):
        if node.module not in self.ALLOWED_MODULES:
            raise ValueError(f"Importing from '{node.module}' is restricted for battle security! Only 'math' and 'random' are allowed.")

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
        self.loop_depth += 1
        if self.loop_depth > 2:
            raise ValueError("Max 2 nested loops allowed to prevent CPU exhaustion!")
        self.generic_visit(node)
        self.loop_depth -= 1

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

    def visit_ListComp(self, node):
        raise ValueError("List comprehensions are restricted for security! Use 'for' loops.")

    def visit_SetComp(self, node):
        raise ValueError("Set comprehensions are restricted for security! Use 'for' loops.")

    def visit_DictComp(self, node):
        raise ValueError("Dict comprehensions are restricted for security! Use 'for' loops.")

    def visit_GeneratorExp(self, node):
        raise ValueError("Generator expressions are restricted for security!")

    def visit_BinOp(self, node):
        if isinstance(node.op, ast.Mult):
            if isinstance(node.left, ast.Constant) and isinstance(node.left.value, (str, list, tuple)):
                if isinstance(node.right, ast.Constant) and isinstance(node.right.value, (int, float)) and node.right.value > 100:
                    raise ValueError("Multiplication repetition exceeds safety limit (max 100)!")
            elif isinstance(node.right, ast.Constant) and isinstance(node.right.value, (str, list, tuple)):
                if isinstance(node.left, ast.Constant) and isinstance(node.left.value, (int, float)) and node.left.value > 100:
                    raise ValueError("Multiplication repetition exceeds safety limit (max 100)!")
        self.generic_visit(node)

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


def format_friendly_error(e) -> str:
    """Translates raw Python errors into IDLE-style traceback with human-friendly hints."""
    if isinstance(e, SyntaxError):
        lines = traceback.format_exception_only(type(e), e)
        idle_syn = "".join(lines).strip()
        msg = str(getattr(e, 'msg', e))
        if "expected ':'" in msg or "invalid syntax" in msg:
            hint = "\n[Hint]: Check for missing colon ':' or unclosed bracket ')'."
        else:
            hint = ""
        return f"{idle_syn}{hint}"

    s = str(e).strip()
    if s.startswith("RuntimeError: "):
        s = s[len("RuntimeError: "):]
    if s.startswith("Error: "):
        s = s[len("Error: "):]

    hint = ""
    # 1. Missing parentheses on sensor function (e.g. get_enemy_distance < 20)
    if any(k in s for k in ("'<' not supported between instances of 'function'",
                            "'>' not supported between instances of 'function'",
                            "'<=' not supported between instances of 'function'",
                            "'>=' not supported between instances of 'function'")):
        hint = "\n[Hint]: Missing '()' on sensor! Example: use get_enemy_distance() instead of get_enemy_distance."
    elif "not supported between instances of 'str' and 'int'" in s:
        hint = "\n[Hint]: Cannot compare text (str) with number (int). Convert with int() or check your variable."
    elif "object is not callable" in s:
        hint = "\n[Hint]: Did you put '()' after a variable that is not a function?"
    elif "is not defined" in s:
        m = re.search(r"name '([^']+)' is not defined", s)
        if m:
            name = m.group(1)
            typos = {
                "atack": "attack()",
                "attak": "attack()",
                "blok": "block()",
                "dashh": "dash(step)",
                "jamp": "jump(power)",
                "croch": "crouch()",
                "dist": "get_enemy_distance()",
                "distance": "get_enemy_distance()",
            }
            if name.lower() in typos:
                hint = f"\n[Hint]: '{name}' is not recognized. Did you mean {typos[name.lower()]}?"
            else:
                hint = f"\n[Hint]: '{name}' is not defined. Check spelling or check Commands Manual."
    elif "IndentationError" in s or "unindent does not match" in s:
        hint = "\n[Hint]: Check your spaces! Code inside 'if', 'else', or 'for' must be indented by 4 spaces."

    return f"{s}{hint}"

def compiler(code, current_player, enemy_player=None):
    if hasattr(current_player, 'action_queue'):
        current_player.action_queue.clear()
    if hasattr(current_player, 'x') and hasattr(current_player, 'target_x'):
        current_player.target_x = current_player.x
        current_player.speed_x = 2

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

    try:
        # Step 1: AST Static Security Analysis
        parsed_tree = ast.parse(code, filename="<strategy.py>")
        validator = SecurityValidator()
        validator.visit(parsed_tree)

        # Step 2: Execute in the warm isolated worker. It receives sensor
        # snapshots and returns only primitive command records, never objects.
        sensors = {
            "enemy_distance": abs(current_player.x - enemy_player.x) if enemy_player else 999,
            "enemy_attacking": getattr(enemy_player.sword, 'attack_state', 0) != 0 if (enemy_player and hasattr(enemy_player, 'sword')) else False,
            "enemy_blocking": (hasattr(enemy_player, 'shield') and enemy_player.shield.block_timer > 0) if enemy_player else False,
            "enemy_crouching": getattr(enemy_player, 'crouch_timer', 0) > 0 if enemy_player else False,
            "enemy_airborne": (enemy_player.y < 470 or enemy_player.jump_pixel != 0) if enemy_player else False,
            "enemy_direction": getattr(enemy_player, 'direction', -1) if enemy_player else -1,
            "my_health": current_player.heart,
            "enemy_health": enemy_player.heart if enemy_player else 0,
            "my_energy": round(getattr(current_player, 'energy', 100), 1),
            "enemy_energy": round(getattr(enemy_player, 'energy', 100), 1) if enemy_player else 100,
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
            err = format_friendly_error(result[2])
            logger.warning("Runtime execution error:\n%s", err)
            current_player.last_error = err
            if hasattr(current_player, 'say'):
                err_lines = [l.strip() for l in err.splitlines() if l.strip()]
                short_say = next((l for l in reversed(err_lines) if "Error" in l or "Exception" in l), err_lines[0] if err_lines else "Error")
                current_player.say(short_say[:40])
                if hasattr(current_player, 'execute_next_action'):
                    current_player.execute_next_action()
            return {"success": False, "error": err}

        _apply_commands(result[1], current_player)

        logger.info("Code executed successfully! Actions queued.")
        current_player.last_error = None
        return {"success": True, "error": None}
    except SyntaxError as se:
        err = format_friendly_error(se)
        logger.warning("Syntax error:\n%s", err)
        current_player.last_error = err
        if hasattr(current_player, 'say'):
            err_lines = [l.strip() for l in err.splitlines() if l.strip()]
            short_say = next((l for l in reversed(err_lines) if "Error" in l or "Exception" in l), err_lines[0] if err_lines else "SyntaxError")
            current_player.say(short_say[:40])
            if hasattr(current_player, 'execute_next_action'):
                current_player.execute_next_action()
        return {"success": False, "error": err}
    except (ValueError, TimeoutError) as ve:
        err = f"Security: {ve}"
        logger.warning("Security error: %s", err)
        current_player.last_error = err
        if hasattr(current_player, 'say'):
            current_player.say(err[:40])
            if hasattr(current_player, 'execute_next_action'):
                current_player.execute_next_action()
        return {"success": False, "error": err}
    except Exception as e:
        err = format_friendly_error(e)
        logger.warning("Execution error:\n%s", err)
        current_player.last_error = err
        if hasattr(current_player, 'say'):
            err_lines = [l.strip() for l in err.splitlines() if l.strip()]
            short_say = next((l for l in reversed(err_lines) if "Error" in l or "Exception" in l), err_lines[0] if err_lines else "Error")
            current_player.say(short_say[:40])
            if hasattr(current_player, 'execute_next_action'):
                current_player.execute_next_action()
        return {"success": False, "error": err}


# ==========================================
# 🥋 WARDROBE STUDIO EVALUATOR (Level 1 & 7)
# ==========================================
COLOR_RUNES = {
    "cyan": "#00f0ff",
    "emerald": "#10b981",
    "green": "#10b981",
    "crimson": "#ff4757",
    "red": "#ff4757",
    "gold": "#fbbf24",
    "yellow": "#fbbf24",
    "amber": "#fbbf24",
    "violet": "#a855f7",
    "purple": "#a855f7",
    "obsidian": "#334155",
    "black": "#334155",
    "white": "#ffffff",
    "orange": "#ff7a00",
    "pink": "#ec4899",
    "blue": "#38bdf8",
    "silver": "#94a3b8",
}

def resolve_color(val):
    if not val or not isinstance(val, str):
        return None
    val_clean = val.strip().lower()
    if val_clean in COLOR_RUNES:
        return COLOR_RUNES[val_clean]
    if re.match(r"^#[0-9a-fA-F]{3,6}$", val.strip()):
        return val.strip()
    return COLOR_RUNES.get(val_clean, "#ffffff")

class _WardrobeItem:
    def __init__(self, item_name):
        self.name = item_name
        self.color = None
    def change_color(self, c):
        self.color = c
    def set_color(self, c):
        self.color = c

def eval_wardrobe_code(code: str) -> dict:
    """Evaluates Python code submitted in the Wardrobe Studio.
    Supports both Level 1 Variable syntax (body = 'emerald')
    and Level 7 OOP syntax (sword.change_color('crimson')).
    """
    if not code or not code.strip():
        return {"success": False, "error": "Code editor is empty! Write some Python code to equip your stickman."}
    
    if len(code) > 1000:
        return {"success": False, "error": "Wardrobe code exceeds maximum length (1000 characters)."}

    try:
        # Step 1: Syntax Analysis (IDLE filename strategy)
        parsed = ast.parse(code, filename="<wardrobe.py>")
        validator = SecurityValidator()
        validator.visit(parsed)
        
        # Step 2: Build Wardrobe Execution Scope
        fighter_obj = _WardrobeItem("fighter")
        sword_obj = _WardrobeItem("sword")
        shield_obj = _WardrobeItem("shield")

        safe_env = {
            "__builtins__": {
                "print": lambda *args: None,
                "len": len,
                "str": str,
                "int": int,
                "range": safe_range,
                "True": True,
                "False": False,
                "None": None
            },
            "fighter": fighter_obj,
            "player": fighter_obj,
            "body_item": fighter_obj,
            "sword": sword_obj,
            "shield": shield_obj,
        }

        compiled = compile(code, "<wardrobe.py>", "exec")
        exec(compiled, safe_env)

        # Extract values: Check variables first, then OOP objects
        body_val = safe_env.get("body") or safe_env.get("fighter_color") or fighter_obj.color
        shield_val = safe_env.get("shield") or safe_env.get("shield_color") or shield_obj.color
        sword_val = safe_env.get("sword") or safe_env.get("sword_color") or sword_obj.color

        # If user wrote sword = "blue" (rebound object with string), handle string
        if isinstance(sword_val, _WardrobeItem):
            sword_val = sword_val.color
        if isinstance(shield_val, _WardrobeItem):
            shield_val = shield_val.color
        if isinstance(body_val, _WardrobeItem):
            body_val = body_val.color

        colors = {}
        if body_val:
            colors["body"] = resolve_color(body_val)
        if shield_val:
            colors["shield"] = resolve_color(shield_val)
        if sword_val:
            colors["sword"] = resolve_color(sword_val)

        if not colors:
            return {
                "success": False,
                "error": "No color changes detected! Assign body, shield, or sword variables (e.g. body = 'emerald')."
            }

        return {
            "success": True,
            "colors": colors,
            "message": "Equipped successfully!"
        }
    except SyntaxError as se:
        return {"success": False, "error": format_friendly_error(se)}
    except Exception as e:
        tb = traceback.extract_tb(e.__traceback__)
        strat_frame = next((f for f in reversed(tb) if f.filename == "<wardrobe.py>"), None)
        lineno = strat_frame.lineno if strat_frame else (tb[-1].lineno if tb else 1)
        code_lines = code.splitlines()
        fault_line = code_lines[lineno - 1].strip() if lineno and 0 < lineno <= len(code_lines) else ""
        idle_err = (
            f'Traceback (most recent call last):\n'
            f'  File "<wardrobe.py>", line {lineno}, in <module>\n'
            f'    {fault_line}\n'
            f'{type(e).__name__}: {e}'
        )
        return {"success": False, "error": format_friendly_error(idle_err)}
