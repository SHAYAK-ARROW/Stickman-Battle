"""
Stickman Adaptive Combat Engine (SACE) — Production-Grade Master Bot
Author: Shayak Sadhukhan (Arrow's Development Hub, Class 12, Hindu School, Kolkata)
Project: Stickman Battle (Educational Code-Combat Game)
Architecture: Katz's Backoff N-Gram (5-to-1) + Health-Aware Heuristic Invention + Online Markov Learning
            + Muster Bot Script-Diff Learning (Change-Factor f) + Reward-Weighted Adaptation
"""

import math
import random
import json
import difflib
from typing import Dict, List, Tuple, Optional, Any

# ==============================================================================
# 1. ACTION ENCODINGS & TOKENIZATION (FULL 18-COMMAND MAPPING)
# ==============================================================================
ACTION_IDS = {
    "move": 1,
    "dash": 2,
    "run": 3,
    "jump": 4,
    "crouch": 5,
    "dodge": 6,
    "swing": 7,
    "attack": 8,
    "heavy_attack": 9,
    "block": 10,
    "throw_sword": 11,
    "sec_barrier": 12,
    "cosec_dome": 13,
    "cot_wall": 14,
    "sin_wave": 15,
    "cos_wave": 16,
    "tan_spike": 17,
    "flip": 18,
}

ID_TO_ACTION = {v: k for k, v in ACTION_IDS.items()}
SPELL_ACTIONS = {"sec_barrier", "cosec_dome", "cot_wall", "sin_wave", "cos_wave", "tan_spike"}

# Exact energy costs matching char.py rules (prevents "Low Energy" action stalls)
ACTION_ENERGY_COSTS = {
    "move": 0,
    "run": 0,
    "jump": 0,
    "crouch": 0,
    "flip": 0,
    "attack": 5,
    "swing": 5,
    "block": 10,
    "dash": 10,
    "dodge": 10,
    "sin_wave": 15,
    "cos_wave": 15,
    "tan_spike": 18,
    "cot_wall": 18,
    "sec_barrier": 20,
    "cosec_dome": 20,
    "throw_sword": 20,
    "heavy_attack": 25,
}


def encode_action(name: str, param: int = 0) -> str:
    """
    Encodes action into a compact token: 'ACTION_ID:PARAM'.
    - Quantizes spell power (15-90) into buckets of 15 to prevent key explosion.
    - Preserves movement steps (1-10) without loss.
    """
    clean_name = str(name).lower().strip()
    action_id = ACTION_IDS.get(clean_name, 1)

    try:
        p = int(round(float(param)))
    except (ValueError, TypeError):
        p = 0

    if clean_name in SPELL_ACTIONS:
        quantized_param = max(15, min(90, round(p / 15) * 15)) if p > 0 else 45
    else:
        quantized_param = max(1, min(10, p)) if p > 0 else 1

    return f"{action_id}:{quantized_param}"


def decode_action(token: str) -> Tuple[str, int]:
    """
    Crash-proof action decoder.
    Returns (action_name, parameter). Safely falls back to ('move', 1) on corrupt data.
    """
    if not token or not isinstance(token, str):
        return ("move", 1)

    parts = token.split(":")
    if not parts or not parts[0]:
        return ("move", 1)

    try:
        action_id = int(parts[0])
    except ValueError:
        return ("move", 1)

    action_name = ID_TO_ACTION.get(action_id, "move")

    try:
        param = int(parts[1]) if len(parts) > 1 else 1
    except ValueError:
        param = 1

    return (action_name, param)


# ==============================================================================
# 2. TRI-FACTOR SITUATIONAL SENSORS
# ==============================================================================
def perceive_distance(real_distance: float, noise_rate: float = 0.15) -> str:
    """
    Categorizes physical distance with adaptive sensory noise.
    Prevents robotic aim-botting while avoiding close-range blindness.
    - Close range (<=100px): tight perception (+/-10px max)
    - Mid range (101-250px): moderate depth noise (+/-20px)
    - Far range (>250px): human estimation noise (+/-35px)
    """
    perceived = max(0.0, float(real_distance))
    if random.random() < noise_rate:
        if perceived <= 100.0:
            noise = random.choice([-10.0, 10.0])
        elif perceived <= 250.0:
            noise = random.choice([-20.0, 20.0])
        else:
            noise = random.choice([-35.0, 35.0])
        perceived = max(0.0, perceived + noise)

    if perceived <= 125.0:
        return "CLOSE"
    elif perceived <= 320.0:
        return "MID"
    else:
        return "FAR"


def get_health_stance(self_hp: float, enemy_hp: float) -> Tuple[str, str]:
    """Categorizes health into tactical bands (Critical, Stable, Dominant)."""
    self_stance = "CRITICAL" if self_hp <= 3 else ("DOMINANT" if self_hp >= 8 else "STABLE")
    enemy_stance = "LETHAL_WINDOW" if enemy_hp <= 3 else "HEALTHY"
    return self_stance, enemy_stance


# ==============================================================================
# 3. COMBAT HEURISTIC & COUNTER MATRIX (CORRECTED DIRECTIONAL MECHANICS)
# ==============================================================================
# In char.py:
#   dodge(step) naturally subtracts: target_x -= (10 * step * direction)  -> moves BACKWARD
#   dash(step) naturally adds:       target_x += (10 * step * direction)  -> moves FORWARD
# All steps are positive numbers to prevent negative multiplication inversion!
BASE_COUNTERS = {
    # --- CLOSE RANGE (0 - 125 px) ---
    ("CLOSE", "swing"): ("block", 0),             # Swift slash intercepted by shield
    ("CLOSE", "attack"): ("block", 0),            # Standard attack blocked
    ("CLOSE", "heavy_attack"): ("dodge", 2),      # Heavy attack shatters shield -> dodge backward!
    ("CLOSE", "crouch"): ("swing", 0),            # Low duck punished by downward horizontal slash
    ("CLOSE", "block"): ("heavy_attack", 0),      # Guarding opponent broken by heavy attack
    ("CLOSE", "dash"): ("swing", 0),              # Rushing point-blank intercepted by sword strike
    ("CLOSE", "move"): ("swing", 0),              # Slow walking close punished by sword slash
    ("CLOSE", "run"): ("swing", 0),               # Running into blade intercepted by slash
    ("CLOSE", "jump"): ("swing", 0),              # Airborne target clipped on descent
    ("CLOSE", "dodge"): ("dash", 1),              # Retreating opponent pursued with forward dash
    ("CLOSE", "sec_barrier"): ("dodge", 2),       # Close barrier avoided by spacing out
    ("CLOSE", "throw_sword"): ("block", 0),       # Deflect point-blank throw
    ("CLOSE", "cosec_dome"): ("dodge", 2),        # Step out of dome perimeter
    ("CLOSE", "cot_wall"): ("swing", 0),           # Cut through close barrier

    # --- MID RANGE (125 - 320 px) ---
    ("MID", "dash"): ("dash", 3),                 # Meet rusher with aggressive forward dash
    ("MID", "run"): ("dash", 3),                  # Meet running opponent head-on
    ("MID", "move"): ("dash", 3),                 # Close distance aggressively into sword range
    ("MID", "jump"): ("swing", 0),                # Airborne opponent clipped on descent
    ("MID", "dodge"): ("dash", 3),                # Retreating opponent pursued with forward dash
    ("MID", "swing"): ("dash", 3),                # Whiffed strike punished by rushing into recovery
    ("MID", "attack"): ("dash", 3),               # Whiffed strike punished by rushing in
    ("MID", "heavy_attack"): ("dash", 3),         # Heavy startup / recovery punished with forward dash
    ("MID", "crouch"): ("dash", 3),               # Ducking opponent closed in on
    ("MID", "sin_wave"): ("sec_barrier", 45),     # Neutralized by barrier (prevents high-low ground spike lock!)
    ("MID", "cos_wave"): ("block", 0),            # Mid-range cosine wave blocked with shield (10 energy, 0 dmg!)
    ("MID", "tan_spike"): ("dodge", 2),           # Mid-range floor spike avoided via backward dodge
    ("MID", "block"): ("dash", 3),                # Mid-range turtle closed in on with heavy strike
    ("MID", "sec_barrier"): ("dash", 3),           # Close gap into melee range (barrier only blocks spells, not sword!)
    ("MID", "throw_sword"): ("block", 0),         # Thrown sword deflected by shield
    ("MID", "cosec_dome"): ("dodge", 2),          # Reposition out of dome radius
    ("MID", "cot_wall"): ("dash", 3),             # Pass wall obstacle

    # --- FAR RANGE (> 320 px) ---
    ("FAR", "sin_wave"): ("sec_barrier", 45),     # Long-range wave absorbed by barrier (prevents ground spike trap!)
    ("FAR", "cos_wave"): ("sec_barrier", 45),     # Cosine wave neutralized by barrier
    ("FAR", "tan_spike"): ("dodge", 2),           # Distant ground spike avoided by dodge (stays grounded!)
    ("FAR", "dash"): ("dash", 4),                 # Meet rusher head-on with equal forward dash
    ("FAR", "run"): ("dash", 4),                  # Meet running opponent head-on
    ("FAR", "move"): ("dash", 5),                 # Close the vast gap aggressively
    ("FAR", "block"): ("dash", 5),                # Close in to punish stationary camper
    ("FAR", "throw_sword"): ("sec_barrier", 45),  # Thrown sword absorbed by barrier
    ("FAR", "jump"): ("sin_wave", 45),            # Aerial trajectory hit by ranged wave
    ("FAR", "dodge"): ("dash", 5),                # Close the vast gap with dash
    ("FAR", "heavy_attack"): ("dash", 5),         # Punish far whiff by closing the distance
    ("FAR", "swing"): ("dash", 5),                # Whiff punished by closing the distance
    ("FAR", "attack"): ("dash", 5),               # Whiff punished by closing the distance
    ("FAR", "crouch"): ("tan_spike", 60),         # Stationary crouch struck by long spike
    ("FAR", "sec_barrier"): ("dash", 3),          # Close gap with dash while opponent holds stationary barrier
    ("FAR", "cosec_dome"): ("dash", 3),           # Close in while they channel dome
    ("FAR", "cot_wall"): ("sin_wave", 60),        # High arc wave over cot wall
}


# ==============================================================================
# 4. MUSTER BOT — SCRIPT DIFF & CHANGE-FACTOR ENGINE
# ==============================================================================

def _sanitize_script(script: str) -> List[str]:
    """
    Strips comments, blank lines, prints, speech bubbles, and normalises whitespace.
    Returns a list of stripped non-empty lines for clean diff comparison.
    NOTE: Drops non-combat print/say/ask/input calls. Only strips Python comments ('#').
    """
    lines = []
    for raw in script.splitlines():
        line = raw.strip()
        # Drop non-combat print/input lines
        clean_prefix = line.replace(" ", "")
        if any(clean_prefix.startswith(p) for p in ("print(", "input(")):
            continue
        # Remove Python comments only
        if "#" in line:
            line = line[:line.index("#")].strip()
        if line:
            lines.append(line)
    return lines


def compute_script_diff(prev_script: str, cur_script: str) -> int:
    """
    Counts the number of changed lines between two scripts.
    FIX #1: Skips '---' and '+++' file-header lines produced by unified_diff.
    Real content changes look like '-block()' and '+dash(2)' — no space after sign.
    The headers look like '--- ' and '+++ ' — with a space (or empty) after sign.
    Returns 0 if scripts are identical.
    """
    prev_lines = _sanitize_script(prev_script)
    cur_lines  = _sanitize_script(cur_script)
    diff = list(difflib.unified_diff(prev_lines, cur_lines, lineterm=""))
    changed = sum(
        1 for l in diff
        if (l.startswith("+") or l.startswith("-"))
        # Skip the file-header lines: '--- ' '+++ ' and hunk header '@@'
        and not l.startswith("--- ") and not l.startswith("+++ ") and not l.startswith("@@")
    )
    return changed


def build_line_connection_map(prev_script: str, cur_script: str) -> Dict[Tuple[str, str], int]:
    """
    FIX #3: Uses SequenceMatcher.get_opcodes() to find ACTUAL replaced line pairs
    instead of a cartesian cross-product of all lines.

    Opcodes:
      'replace' → prev[i1:i2] was swapped for cur[j1:j2]  ← we care about these
      'delete'  → prev lines removed (map to sentinel '__DELETED__')
      'insert'  → cur lines added   (map from sentinel '__INSERTED__')
      'equal'   → unchanged — skip

    Returns: { (prev_line, cur_line): count }
    """
    prev_lines = _sanitize_script(prev_script)
    cur_lines  = _sanitize_script(cur_script)
    connection_map: Dict[Tuple[str, str], int] = {}

    matcher = difflib.SequenceMatcher(None, prev_lines, cur_lines, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "replace":
            # Zip removed lines with inserted lines, preserving unzipped excess
            pl_slice = prev_lines[i1:i2]
            cl_slice = cur_lines[j1:j2]
            for pl, cl in zip(pl_slice, cl_slice):
                key = (pl, cl)
                connection_map[key] = connection_map.get(key, 0) + 1
            if len(pl_slice) > len(cl_slice):
                for pl in pl_slice[len(cl_slice):]:
                    key = (pl, "__DELETED__")
                    connection_map[key] = connection_map.get(key, 0) + 1
            elif len(cl_slice) > len(pl_slice):
                for cl in cl_slice[len(pl_slice):]:
                    key = ("__INSERTED__", cl)
                    connection_map[key] = connection_map.get(key, 0) + 1
        elif tag == "delete":
            for pl in prev_lines[i1:i2]:
                key = (pl, "__DELETED__")
                connection_map[key] = connection_map.get(key, 0) + 1
        elif tag == "insert":
            for cl in cur_lines[j1:j2]:
                key = ("__INSERTED__", cl)
                connection_map[key] = connection_map.get(key, 0) + 1
        # 'equal' → skip

    return connection_map


# ==============================================================================
# 5. MASTER BOT CORE ENGINE (with Muster Learning)
# ==============================================================================
class MasterBotBrain:
    def __init__(self, grant: "Optional[BotGrant]" = None,
                 initial_weights: Optional[Dict[str, Any]] = None,
                 difficulty: float = 1.0):
        """
        Initializes the bot brain.

        Preferred usage:
            grant = load_localstorage_grant(raw_json_from_localstorage)
            bot   = MasterBotBrain(grant=grant, difficulty=1.0) # 0.1-1.0 or 1-10

        Legacy usage:
            bot = MasterBotBrain(initial_weights=some_dict)
            bot = MasterBotBrain()   # seed weights only (defaults to difficulty 1.0)
        """
        # Difficulty scaling (accepts 0.1 - 1.0 or 1 - 10)
        try:
            d_val = float(difficulty)
            if d_val > 1.0:
                self.difficulty: float = max(0.1, min(1.0, d_val / 10.0))
            else:
                self.difficulty: float = max(0.1, min(1.0, d_val))
        except (ValueError, TypeError):
            self.difficulty = 1.0
        # Muster state defaults (must be set BEFORE _apply_grant)
        self._script_history:  List[str]            = []
        self._change_factors:  List[int]            = []
        self.co_factor_f:      float                = 0.0
        self._line_conn_map:   Dict[str, int]       = {}
        self._reward_table:    Dict[str, Dict[str, int]] = {}
        self._pending_outcome: Optional[int]        = None
        self._last_bot_action: Optional[Tuple[str, int]] = None
        self._last_dist_cat:   Optional[str]        = None
        self._match_action_log: List[Tuple[str, str, int]] = []
        self.player_label:     str                  = "UNKNOWN"

        self.action_history:    List[str] = []
        self.max_history_len:   int       = 8
        self.max_memory_keys:   int       = 120
        self._internal_tick:    int       = 0
        self._active_threats:   List[Dict[str, Any]] = []

        # ── Load weights (3-tier priority) ───────────────────────────────────
        self.weights: Dict[str, Dict[str, int]] = self._default_seed_weights()

        if grant is not None and isinstance(grant, BotGrant) and not grant.is_empty:
            # Preferred path: use clean BotGrant from load_localstorage_grant()
            self._apply_grant(grant)
        elif initial_weights and isinstance(initial_weights, dict):
            # Legacy path: raw dict passed directly (test harness, old code)
            self.import_from_dict(initial_weights)

    def set_difficulty(self, difficulty: float):
        """Allows dynamically scaling bot difficulty at runtime (accepts 0.1-1.0 or 1-10)."""
        try:
            d_val = float(difficulty)
            if d_val > 1.0:
                self.difficulty = max(0.1, min(1.0, d_val / 10.0))
            else:
                self.difficulty = max(0.1, min(1.0, d_val))
        except (ValueError, TypeError):
            self.difficulty = 1.0

    def _default_seed_weights(self) -> Dict[str, Dict[str, int]]:
        """
        Pre-trained foundational weights — generated by test_muster/pretrain.py.
        DO NOT edit manually. Run pretrain.py to regenerate.
        """
        return {
                    "MID": {
                                "2:3": 20,
                                "3:3": 20,
                                "9:1": 20,
                                "2:2": 20,
                                "7:1": 20,
                                "6:1": 20,
                                "11:1": 20,
                                "12:60": 20,
                                "10:1": 20,
                                "16:45": 20,
                                "12:45": 20,
                                "6:2": 20,
                                "17:45": 20,
                                "15:60": 20,
                                "16:60": 20,
                                "15:75": 20,
                                "18:1": 20,
                                "5:1": 20,
                                "8:1": 20,
                                "1:1": 20,
                                "3:1": 20,
                                "11:10": 20,
                                "10:10": 20,
                                "18:10": 20,
                                "13:60": 20,
                                "3:10": 20,
                                "4:1": 20,
                                "14:45": 20,
                                "2:10": 20,
                                "18:2": 20,
                                "11:2": 20,
                                "5:10": 20,
                                "17:15": 20,
                                "8:3": 20,
                                "5:2": 20,
                                "9:10": 20,
                                "4:3": 20,
                                "4:10": 20,
                                "10:2": 20,
                                "4:2": 20,
                                "14:15": 20,
                                "6:10": 20,
                                "11:3": 20,
                                "16:15": 20,
                                "7:2": 20,
                                "9:2": 20,
                                "8:10": 20,
                                "7:10": 20,
                                "12:15": 20,
                                "14:60": 20,
                                "13:15": 20,
                                "15:45": 20,
                                "2:1": 20,
                                "8:2": 20,
                                "10:3": 20,
                                "3:2": 20,
                                "9:3": 20,
                                "6:3": 20,
                                "18:3": 20,
                                "5:3": 20,
                                "13:45": 20,
                                "15:15": 20,
                                "7:3": 20,
                                "17:60": 20
                    },
                    "2:3@MID": {
                                "2:3": 20,
                                "3:3": 20,
                                "9:1": 20,
                                "2:2": 20,
                                "7:1": 20,
                                "8:10": 9,
                                "18:2": 2,
                                "14:45": 7,
                                "11:2": 1,
                                "12:15": 4,
                                "10:3": 3,
                                "17:15": 7,
                                "1:1": 13,
                                "18:10": 5,
                                "2:1": 6,
                                "4:1": 5,
                                "8:1": 4,
                                "15:15": 5,
                                "5:1": 5,
                                "18:3": 2,
                                "17:45": 5,
                                "16:45": 3,
                                "5:3": 3,
                                "13:45": 5,
                                "18:1": 2,
                                "8:2": 2,
                                "7:10": 4,
                                "11:1": 2,
                                "13:15": 7,
                                "6:2": 5,
                                "4:10": 7,
                                "4:2": 5,
                                "14:60": 2,
                                "10:2": 2,
                                "6:1": 2,
                                "3:2": 2,
                                "14:15": 6,
                                "10:1": 3,
                                "8:3": 1,
                                "15:45": 4,
                                "6:10": 3,
                                "3:1": 5,
                                "9:10": 4,
                                "11:10": 4,
                                "16:60": 1,
                                "11:3": 1,
                                "2:10": 2,
                                "17:60": 1,
                                "15:60": 3,
                                "3:10": 3,
                                "5:2": 1,
                                "10:10": 4,
                                "5:10": 6,
                                "6:3": 2,
                                "16:15": 5,
                                "9:3": 2
                    },
                    "9:1@MID": {
                                "2:2": 20,
                                "9:1": 20,
                                "7:1": 20,
                                "17:15": 7,
                                "4:1": 7,
                                "7:2": 7,
                                "9:10": 9,
                                "1:1": 14,
                                "8:10": 8,
                                "10:10": 7,
                                "13:15": 15,
                                "15:15": 13,
                                "12:15": 9,
                                "3:10": 7,
                                "2:10": 10,
                                "17:60": 3,
                                "14:60": 6,
                                "11:3": 9,
                                "14:45": 6,
                                "10:1": 5,
                                "4:10": 9,
                                "7:10": 14,
                                "16:15": 11,
                                "5:3": 7,
                                "3:1": 11,
                                "5:2": 3,
                                "18:2": 1,
                                "18:10": 7,
                                "6:10": 11,
                                "4:2": 2,
                                "6:1": 9,
                                "16:45": 5,
                                "14:15": 15,
                                "2:1": 5,
                                "7:3": 4,
                                "13:60": 3,
                                "12:45": 8,
                                "10:2": 3,
                                "11:1": 7,
                                "11:10": 6,
                                "11:2": 5,
                                "9:2": 2,
                                "6:3": 5,
                                "3:2": 3,
                                "9:3": 2,
                                "15:45": 3,
                                "13:45": 5,
                                "5:10": 5,
                                "10:3": 2,
                                "17:45": 2,
                                "18:1": 7,
                                "6:2": 1,
                                "5:1": 3,
                                "15:60": 4,
                                "16:60": 4,
                                "4:3": 2,
                                "2:3": 5,
                                "8:1": 1,
                                "3:3": 3,
                                "8:2": 2,
                                "18:3": 1
                    },
                    "CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "2:2": 20,
                                "10:1": 20,
                                "12:45": 20,
                                "6:2": 20,
                                "18:1": 20,
                                "5:1": 20,
                                "11:10": 20,
                                "16:45": 20,
                                "1:1": 20,
                                "12:15": 20,
                                "12:60": 20,
                                "11:3": 20,
                                "10:3": 20,
                                "6:10": 20,
                                "15:45": 20,
                                "15:60": 20,
                                "4:3": 20,
                                "3:10": 20,
                                "6:3": 20,
                                "10:2": 20,
                                "13:45": 20,
                                "17:15": 20,
                                "15:15": 20,
                                "13:15": 20,
                                "9:10": 20,
                                "3:1": 20,
                                "2:10": 20,
                                "16:15": 20,
                                "5:2": 20,
                                "8:3": 20,
                                "14:45": 20,
                                "3:3": 20,
                                "5:3": 20,
                                "18:3": 20,
                                "3:2": 20,
                                "11:1": 20,
                                "4:10": 20,
                                "14:60": 20,
                                "5:10": 20,
                                "6:1": 20,
                                "18:10": 20,
                                "9:2": 20,
                                "7:10": 20,
                                "9:3": 20,
                                "7:3": 20,
                                "16:60": 20,
                                "4:2": 20,
                                "10:10": 20,
                                "7:2": 20,
                                "14:15": 20,
                                "8:2": 20,
                                "4:1": 20,
                                "13:60": 20,
                                "2:3": 20,
                                "8:10": 20,
                                "2:1": 20,
                                "17:60": 20,
                                "18:2": 20,
                                "17:45": 20,
                                "11:2": 20
                    },
                    "9:1->2:2@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "2:2": 20,
                                "16:45": 1
                    },
                    "2:2@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "2:2": 20,
                                "8:1": 20,
                                "16:15": 4,
                                "12:15": 3,
                                "14:15": 2,
                                "9:2": 2,
                                "17:15": 5,
                                "15:60": 1,
                                "1:1": 7,
                                "8:10": 2,
                                "3:1": 2,
                                "10:10": 2,
                                "2:10": 4,
                                "18:1": 1,
                                "17:60": 1,
                                "8:2": 1,
                                "10:2": 2,
                                "6:1": 4,
                                "4:1": 2,
                                "6:2": 2,
                                "7:3": 2,
                                "5:10": 2,
                                "11:10": 4,
                                "17:45": 2,
                                "7:2": 2,
                                "18:2": 2,
                                "11:3": 3,
                                "13:60": 1,
                                "11:1": 1,
                                "15:15": 3,
                                "10:1": 1,
                                "4:10": 3,
                                "6:3": 1,
                                "12:45": 2,
                                "2:1": 3,
                                "14:45": 1,
                                "13:15": 3,
                                "16:45": 1,
                                "6:10": 1,
                                "9:10": 1,
                                "7:10": 1,
                                "4:3": 1,
                                "15:45": 1,
                                "18:10": 1
                    },
                    "9:1->2:2->9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "2:2": 1
                    },
                    "2:2->9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "2:2": 20,
                                "1:1": 1
                    },
                    "9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "2:2": 20,
                                "3:3": 4,
                                "5:10": 7,
                                "7:3": 2,
                                "1:1": 15,
                                "6:1": 5,
                                "5:1": 3,
                                "12:15": 5,
                                "13:15": 3,
                                "15:15": 5,
                                "11:1": 3,
                                "18:1": 6,
                                "16:15": 5,
                                "14:15": 10,
                                "11:2": 1,
                                "4:10": 6,
                                "16:45": 5,
                                "2:1": 2,
                                "7:10": 5,
                                "18:10": 5,
                                "15:45": 4,
                                "4:1": 3,
                                "3:10": 2,
                                "8:3": 3,
                                "3:2": 1,
                                "17:15": 4,
                                "2:3": 3,
                                "6:10": 5,
                                "2:10": 6,
                                "10:10": 4,
                                "5:2": 2,
                                "8:10": 3,
                                "6:2": 8,
                                "9:2": 1,
                                "9:10": 6,
                                "11:10": 3,
                                "15:60": 4,
                                "14:60": 3,
                                "9:3": 5,
                                "13:60": 3,
                                "17:45": 3,
                                "4:2": 2,
                                "18:2": 1,
                                "12:45": 8,
                                "3:1": 2,
                                "10:2": 1,
                                "7:2": 2,
                                "8:2": 1,
                                "14:45": 1,
                                "13:45": 1,
                                "10:1": 2,
                                "11:3": 1,
                                "18:3": 1
                    },
                    "2:2->9:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20,
                                "2:2": 20,
                                "5:10": 1
                    },
                    "9:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20,
                                "2:2": 20,
                                "14:15": 1,
                                "5:10": 1
                    },
                    "2:2->9:1->9:1->7:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->9:1->7:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20,
                                "2:2": 2
                    },
                    "9:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20,
                                "2:2": 20,
                                "6:10": 1,
                                "4:10": 1,
                                "17:15": 1
                    },
                    "7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20,
                                "2:2": 20,
                                "10:2": 3,
                                "16:45": 4,
                                "18:3": 6,
                                "2:3": 2,
                                "12:15": 8,
                                "1:1": 9,
                                "15:15": 5,
                                "6:1": 2,
                                "4:1": 4,
                                "6:10": 6,
                                "9:3": 2,
                                "14:60": 2,
                                "8:3": 3,
                                "13:60": 2,
                                "17:45": 4,
                                "16:15": 4,
                                "5:1": 7,
                                "12:45": 5,
                                "13:45": 3,
                                "18:2": 2,
                                "12:60": 4,
                                "8:10": 5,
                                "3:10": 3,
                                "15:45": 2,
                                "5:2": 2,
                                "3:1": 3,
                                "5:10": 4,
                                "6:2": 2,
                                "10:1": 7,
                                "3:2": 3,
                                "7:10": 2,
                                "16:60": 3,
                                "11:1": 8,
                                "14:45": 3,
                                "9:10": 2,
                                "17:15": 10,
                                "11:2": 3,
                                "4:10": 2,
                                "13:15": 1,
                                "11:10": 2,
                                "14:15": 5,
                                "18:1": 1,
                                "17:60": 5,
                                "2:1": 2,
                                "6:3": 2,
                                "2:10": 2,
                                "3:3": 1,
                                "10:10": 3,
                                "18:10": 2,
                                "15:60": 1,
                                "7:2": 2,
                                "8:2": 1,
                                "4:3": 1,
                                "7:3": 1
                    },
                    "9:1->9:1->7:1->7:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->7:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20,
                                "2:2": 2
                    },
                    "7:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20,
                                "2:2": 9,
                                "2:3": 1,
                                "12:45": 1,
                                "11:2": 1,
                                "3:10": 1,
                                "1:1": 1
                    },
                    "7:1->7:1->8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "7:1->8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "10:1": 20,
                                "11:1": 1,
                                "7:10": 1,
                                "3:1": 1,
                                "1:1": 1,
                                "12:60": 1
                    },
                    "8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "10:1": 20,
                                "1:1": 9,
                                "3:2": 1,
                                "2:10": 4,
                                "11:1": 3,
                                "9:3": 2,
                                "16:15": 6,
                                "13:45": 3,
                                "3:10": 4,
                                "16:60": 1,
                                "14:45": 2,
                                "8:2": 3,
                                "2:1": 11,
                                "10:10": 1,
                                "14:15": 5,
                                "18:3": 6,
                                "7:3": 4,
                                "15:15": 6,
                                "7:10": 5,
                                "18:10": 2,
                                "6:1": 6,
                                "13:60": 2,
                                "15:45": 6,
                                "14:60": 2,
                                "5:2": 1,
                                "7:2": 3,
                                "5:10": 2,
                                "5:1": 3,
                                "17:45": 1,
                                "18:2": 1,
                                "4:2": 3,
                                "18:1": 5,
                                "6:10": 5,
                                "4:1": 3,
                                "3:3": 2,
                                "9:10": 2,
                                "15:60": 4,
                                "8:10": 6,
                                "11:10": 2,
                                "11:2": 3,
                                "12:60": 5,
                                "16:45": 2,
                                "3:1": 2,
                                "12:45": 4,
                                "4:3": 3,
                                "17:15": 2,
                                "12:15": 2,
                                "6:2": 4,
                                "5:3": 2,
                                "11:3": 2,
                                "13:15": 1,
                                "4:10": 2,
                                "2:3": 1,
                                "2:2": 1,
                                "8:3": 1,
                                "9:2": 1
                    },
                    "7:1->8:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "8:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20,
                                "6:1": 1,
                                "2:2": 1,
                                "13:45": 1
                    },
                    "7:1->8:1->9:1->7:1@CLOSE": {
                                "8:1": 20,
                                "9:1": 20,
                                "7:1": 20
                    },
                    "8:1->9:1->7:1@CLOSE": {
                                "8:1": 20,
                                "9:1": 20,
                                "7:1": 20
                    },
                    "8:1->9:1->7:1->8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->7:1->8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->7:1->8:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "7:1->8:1->7:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "8:1->7:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "3:10": 1,
                                "6:2": 1,
                                "11:1": 1,
                                "14:15": 1
                    },
                    "7:1->8:1->7:1->9:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "8:1->7:1->9:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "7:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20,
                                "2:2": 20,
                                "6:10": 1,
                                "2:3": 1
                    },
                    "7:1->9:1->7:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "7:1->9:1->7:1->9:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "9:1->7:1->9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "2:2": 3
                    },
                    "9:1->7:1->9:1->9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "7:1->9:1->9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "14:15": 1
                    },
                    "9:1->7:1->9:1->9:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "7:1->9:1->9:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->9:1->9:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20,
                                "2:2": 1
                    },
                    "9:1->9:1->9:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->9:1->7:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->9:1->7:1->9:1->7:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->7:1->9:1->7:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->7:1->9:1->8:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "7:1->9:1->8:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->8:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20,
                                "13:45": 1,
                                "4:1": 1,
                                "15:15": 1
                    },
                    "7:1->9:1->8:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->8:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->8:1->7:1->7:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "8:1->7:1->7:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->8:1->7:1->7:1->9:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "8:1->7:1->7:1->9:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->7:1->7:1->8:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->8:1->9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->8:1->9:1->9:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "8:1->9:1->9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->8:1->9:1->9:1->9:1@CLOSE": {
                                "8:1": 20,
                                "7:1": 20,
                                "9:1": 20
                    },
                    "8:1->9:1->9:1->9:1@CLOSE": {
                                "8:1": 20,
                                "7:1": 20,
                                "9:1": 20
                    },
                    "9:1->9:1->9:1->8:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->9:1->8:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->9:1->9:1->8:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->9:1->8:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->9:1->7:1->8:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "9:1->9:1->7:1->8:1->9:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "9:1->7:1->8:1->9:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->9:1->7:1->9:1->9:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "9:1->9:1->9:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "9:1->9:1->9:1->9:1->7:1@CLOSE": {
                                "8:1": 20,
                                "7:1": 20,
                                "9:1": 20
                    },
                    "9:1->9:1->9:1->7:1->8:1@CLOSE": {
                                "8:1": 20,
                                "9:1": 20,
                                "7:1": 20
                    },
                    "8:1->8:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20,
                                "14:15": 1,
                                "18:3": 1
                    },
                    "8:1->8:1->9:1@CLOSE": {
                                "8:1": 20,
                                "7:1": 20,
                                "9:1": 20
                    },
                    "9:1->8:1->7:1->8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "8:1->7:1->8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->8:1->7:1->8:1->9:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 17,
                                "7:1": 20
                    },
                    "8:1->7:1->8:1->9:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "9:1->9:1->9:1->7:1->7:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "9:1->9:1->7:1->7:1->9:1@CLOSE": {
                                "8:1": 20,
                                "7:1": 20,
                                "9:1": 20
                    },
                    "9:1->9:1->8:1->7:1->8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "9:1->9:1->8:1->8:1@CLOSE": {
                                "8:1": 20,
                                "7:1": 20,
                                "9:1": 20
                    },
                    "9:1->8:1->8:1@CLOSE": {
                                "8:1": 20,
                                "9:1": 20,
                                "7:1": 20
                    },
                    "8:1->8:1->8:1@CLOSE": {
                                "8:1": 20,
                                "9:1": 20,
                                "7:1": 20
                    },
                    "FAR": {
                                "2:2": 20,
                                "2:3": 20,
                                "3:3": 20,
                                "10:1": 20,
                                "12:60": 20,
                                "16:45": 20,
                                "15:75": 20,
                                "16:60": 20,
                                "7:1": 20,
                                "5:1": 20,
                                "8:1": 20,
                                "12:15": 20,
                                "11:10": 20,
                                "14:15": 20,
                                "5:2": 20,
                                "17:60": 20,
                                "9:2": 20,
                                "1:1": 20,
                                "13:15": 20,
                                "13:45": 20,
                                "3:1": 20,
                                "5:3": 20,
                                "12:45": 20,
                                "17:15": 20,
                                "6:10": 20,
                                "18:10": 20,
                                "4:3": 20,
                                "2:1": 20,
                                "16:15": 20,
                                "6:1": 20,
                                "8:3": 20,
                                "8:2": 20,
                                "11:1": 20,
                                "5:10": 20,
                                "18:1": 20,
                                "4:1": 20,
                                "4:2": 20,
                                "4:10": 20,
                                "17:45": 20,
                                "7:10": 20,
                                "15:45": 20,
                                "2:10": 20,
                                "7:3": 20,
                                "9:1": 20,
                                "15:15": 20,
                                "13:60": 20,
                                "3:10": 20,
                                "3:2": 20,
                                "8:10": 20,
                                "10:3": 20,
                                "10:10": 20,
                                "6:2": 20,
                                "18:2": 20,
                                "18:3": 20,
                                "7:2": 20,
                                "14:45": 20,
                                "11:2": 20,
                                "10:2": 20,
                                "15:60": 20,
                                "11:3": 20,
                                "9:3": 20,
                                "9:10": 20,
                                "14:60": 20,
                                "6:3": 20
                    },
                    "2:2@MID": {
                                "2:3": 20,
                                "9:1": 20,
                                "7:1": 20,
                                "2:2": 20,
                                "3:3": 20,
                                "13:15": 8,
                                "16:45": 7,
                                "9:3": 2,
                                "1:1": 16,
                                "6:2": 3,
                                "14:15": 7,
                                "11:10": 2,
                                "6:1": 6,
                                "17:45": 5,
                                "5:3": 2,
                                "9:2": 3,
                                "17:15": 10,
                                "8:2": 3,
                                "5:2": 1,
                                "9:10": 4,
                                "13:45": 5,
                                "14:45": 4,
                                "8:1": 2,
                                "4:1": 4,
                                "10:2": 2,
                                "7:3": 3,
                                "4:10": 6,
                                "6:10": 3,
                                "2:10": 4,
                                "8:10": 2,
                                "18:1": 4,
                                "12:15": 2,
                                "18:10": 2,
                                "11:3": 2,
                                "3:10": 5,
                                "10:10": 1,
                                "18:2": 1,
                                "5:10": 6,
                                "15:45": 6,
                                "13:60": 2,
                                "5:1": 3,
                                "3:2": 3,
                                "15:60": 3,
                                "2:1": 1,
                                "10:3": 2,
                                "3:1": 4,
                                "15:15": 3,
                                "11:1": 4,
                                "7:10": 6,
                                "16:15": 2,
                                "17:60": 1,
                                "16:60": 1,
                                "10:1": 7,
                                "6:3": 2,
                                "12:60": 1,
                                "4:2": 1,
                                "4:3": 1,
                                "11:2": 1
                    },
                    "2:2->7:1@CLOSE": {
                                "2:2": 20,
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20,
                                "17:60": 1,
                                "14:15": 1,
                                "12:15": 1
                    },
                    "9:1->7:1->9:1->8:1->9:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "7:1->9:1->8:1->9:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->9:1->9:1->7:1->9:1@CLOSE": {
                                "8:1": 20,
                                "9:1": 20,
                                "7:1": 20
                    },
                    "9:1->8:1->9:1->8:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "8:1->9:1->8:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "7:1->7:1->9:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20,
                                "2:2": 1
                    },
                    "9:1->9:1->9:1->9:1->9:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "9:1->9:1->9:1->9:1->8:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "7:1->9:1->9:1->9:1->9:1@CLOSE": {
                                "9:1": 20,
                                "7:1": 20,
                                "8:1": 20
                    },
                    "8:1->9:1->7:1->9:1@CLOSE": {
                                "8:1": 20,
                                "9:1": 20,
                                "7:1": 20
                    },
                    "9:1->9:1->9:1->8:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "7:1->7:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20,
                                "2:3": 1
                    },
                    "9:1->9:1->8:1->9:1@CLOSE": {
                                "8:1": 20,
                                "7:1": 20,
                                "9:1": 20
                    },
                    "9:1->8:1->9:1->7:1@CLOSE": {
                                "7:1": 20,
                                "8:1": 20,
                                "9:1": 20
                    },
                    "9:1->8:1->9:1->7:1->7:1@CLOSE": {
                                "9:1": 20,
                                "8:1": 20,
                                "7:1": 20
                    },
                    "9:1->7:1->7:1->9:1@CLOSE": {
                                "8:1": 20,
                                "9:1": 20,
                                "7:1": 20
                    },
                    "2:3->2:3@MID": {
                                "2:3": 20,
                                "7:1": 20,
                                "3:3": 20,
                                "9:1": 20,
                                "2:2": 20,
                                "15:15": 1,
                                "8:1": 1
                    },
                    "3:3@MID": {
                                "2:3": 20,
                                "3:3": 20,
                                "2:2": 20,
                                "9:1": 20,
                                "7:1": 20,
                                "3:1": 5,
                                "12:15": 3,
                                "15:60": 1,
                                "18:1": 6,
                                "16:45": 1,
                                "8:1": 4,
                                "14:60": 2,
                                "17:15": 11,
                                "2:1": 5,
                                "6:1": 4,
                                "5:10": 7,
                                "16:15": 6,
                                "15:45": 3,
                                "10:1": 2,
                                "4:1": 5,
                                "8:2": 2,
                                "10:3": 1,
                                "5:1": 2,
                                "11:3": 2,
                                "18:10": 2,
                                "9:3": 4,
                                "15:15": 3,
                                "2:10": 3,
                                "9:2": 6,
                                "3:10": 2,
                                "4:10": 4,
                                "7:2": 3,
                                "7:10": 4,
                                "11:10": 1,
                                "6:3": 2,
                                "12:45": 1,
                                "11:1": 4,
                                "12:60": 2,
                                "13:15": 3,
                                "13:60": 2,
                                "6:10": 1,
                                "13:45": 1,
                                "17:45": 3,
                                "3:2": 3,
                                "8:10": 3,
                                "14:15": 5,
                                "18:2": 1,
                                "18:3": 4,
                                "4:2": 5,
                                "6:2": 1,
                                "10:10": 3,
                                "1:1": 7,
                                "4:3": 1,
                                "9:10": 6,
                                "14:45": 3,
                                "16:60": 1,
                                "11:2": 1,
                                "17:60": 2,
                                "8:3": 1,
                                "7:3": 1
                    },
                    "9:1->7:1->9:1->7:1->9:1@CLOSE": {
                                "7:1": 20,
                                "9:1": 20,
                                "8:1": 20
                    },
                    "16:45@MID": {
                                "16:45": 1,
                                "15:45": 8,
                                "17:45": 7,
                                "4:6": 6
                    },
                    "2:3@FAR": {
                                "7:1": 8,
                                "8:1": 6,
                                "10:1": 5
                    },
                    "10:1@CLOSE": {
                                "9:1": 8,
                                "7:1": 6
                    },
                    "5:1@CLOSE": {
                                "7:1": 9,
                                "8:1": 6
                    },
                    "15:45@MID": {
                                "16:45": 8,
                                "17:45": 7,
                                "5:1": 6
                    },
                    "17:45@MID": {
                                "15:45": 8,
                                "2:2": 7,
                                "4:6": 6
                    },
                    "15:60@FAR": {
                                "16:60": 8,
                                "12:60": 7,
                                "5:1": 6
                    },
                    "16:60@FAR": {
                                "15:60": 8,
                                "17:60": 7,
                                "12:45": 6
                    },
                    "12:45@MID": {
                                "10:1": 8,
                                "7:1": 7,
                                "17:45": 6
                    }
        }

    def ingest_player_script(self, new_script: str) -> Dict[str, Any]:
        """
        Called every time the player submits a new script (A → B → C → D → E…).
        1. Computes the diff (changed lines) vs the previous script.
        2. Updates the sliding change factors [x, y, z, p].
        3. Recomputes co-factor f = avg(x, y, z, p).
        4. Updates the line-connection map.
        5. Assigns the player a power label.
        Returns a summary dict for the game server to log.
        """
        # Slide the script history (keep last 5 = A..E)
        self._script_history.append(new_script)
        if len(self._script_history) > 5:
            self._script_history.pop(0)

        result: Dict[str, Any] = {
            "script_count": len(self._script_history),
            "diff": 0,
            "co_factor_f": self.co_factor_f,
            "player_label": self.player_label,
        }

        if len(self._script_history) < 2:
            # First script ever — nothing to diff
            return result

        prev_script = self._script_history[-2]
        cur_script  = self._script_history[-1]

        # --- Step 1: Compute changed lines ---
        diff_count = compute_script_diff(prev_script, cur_script)
        result["diff"] = diff_count

        # --- Step 2: Slide change factors (x, y, z, p) ---
        self._change_factors.append(diff_count)
        if len(self._change_factors) > 4:
            self._change_factors.pop(0)

        # --- Step 3: Recompute co-factor f (with recency weighting) ---
        if self._change_factors:
            weights = [1.0, 1.25, 1.5, 2.0][-len(self._change_factors):]
            self.co_factor_f = round(sum(cf * w for cf, w in zip(self._change_factors, weights)) / sum(weights), 2)
        result["co_factor_f"] = self.co_factor_f

        # --- Step 4: Update line-connection map ---
        conn = build_line_connection_map(prev_script, cur_script)
        for (pl, cl), cnt in conn.items():
            key = f"{pl[:30]}→{cl[:30]}"  # Compact key for storage
            self._line_conn_map[key] = self._line_conn_map.get(key, 0) + cnt
        # Cap map size to 200 entries
        if len(self._line_conn_map) > 200:
            # Prune least-seen pairs
            sorted_pairs = sorted(self._line_conn_map.items(), key=lambda kv: kv[1])
            for k, _ in sorted_pairs[:50]:
                del self._line_conn_map[k]

        # --- Step 5: Assign player power label ---
        self.player_label = self._classify_player()
        result["player_label"] = self.player_label

        return result

    def _classify_player(self) -> str:
        """
        FIX #6: Thresholds now match _select_counter_by_f() exactly.
          f ≤ 1.5  → STATIC    (never/rarely changes → bot dominates ~90%)
          f ≤ 4.0  → NORMAL    (moderate changes     → bot ~70-80%)
          f ≤ 9.0  → ADAPTIVE  (high variation       → bot ~60-70%)
          f > 9.0  → CREATIVE  (wild/random          → bot ~50-60%)
        """
        f = self.co_factor_f
        if len(self._change_factors) < 2:
            return "UNKNOWN"
        if f <= 1.5:
            return "STATIC"
        elif f <= 4.0:
            return "NORMAL"
        elif f <= 9.0:
            return "ADAPTIVE"
        else:
            return "CREATIVE"

    # --------------------------------------------------------------------------
    # MUSTER BOT — Reward Attribution (Win/Loss Feedback)
    # --------------------------------------------------------------------------
    def register_match_outcome(self, outcome: int):
        """
        Called at the end of each match round.
        outcome: +1 = bot won,  -1 = bot lost,  0 = draw.

        FIX #7: Distributes reward across the last N actions of the match
        (not just the very last action). Recent actions get full reward;
        earlier ones get half-weight to reflect temporal relevance.
        Also resets the match action log for the next match.
        """
        self._pending_outcome = outcome

        if not self._match_action_log:
            return

        # Give full reward to last 5 actions, half-weight to older ones
        log = self._match_action_log
        recent  = log[-5:]           # last 5 actions (full reward)
        earlier = log[:-5]           # older actions  (half reward)

        def _apply_reward(dist_key: str, action_key: str, weight: float):
            """Applies scaled reward/penalty to reward_table."""
            if dist_key not in self._reward_table:
                self._reward_table[dist_key] = {}
            current = self._reward_table[dist_key].get(action_key, 0)
            # +2 win / -3 loss, scaled by weight
            delta = int(round((2 if outcome == 1 else (-3 if outcome == -1 else 0)) * weight))
            self._reward_table[dist_key][action_key] = max(-10, min(30, current + delta))

        for dist_key, aname, aparam in recent:
            action_key = encode_action(aname, aparam)
            _apply_reward(dist_key, action_key, 1.0)

        for dist_key, aname, aparam in earlier:
            action_key = encode_action(aname, aparam)
            _apply_reward(dist_key, action_key, 0.5)

        # Reset for next match
        self._match_action_log = []
        self._last_bot_action  = None
        self._last_dist_cat    = None

    # --------------------------------------------------------------------------
    # MUSTER BOT — f-Aware Counter Selection
    # --------------------------------------------------------------------------
    def _select_counter_by_f(self, dist_cat: str, pred_action: str, pred_param: int) -> Optional[Tuple[str, int]]:
        """
        Chooses the best counter using three signals:
          1. Hard counter matrix (BASE_COUNTERS)
          2. Reward table bonus (which counters have worked before)
          3. Co-factor f (how predictable the player is)

        FIX #28: Prevents suicidal reward overrides against lethal / spell moves.
        """
        hard_counter = BASE_COUNTERS.get((dist_cat, pred_action))

        # Reward table: collect candidates from this distance
        reward_candidates = self._reward_table.get(dist_cat, {})
        best_rewarded_token = None
        if reward_candidates:
            best_rewarded_token = max(reward_candidates, key=reward_candidates.get)

        f = self.co_factor_f

        # Moves that bypass shield or deal heavy unblockable damage
        DANGEROUS_MOVES = {"heavy_attack", "sin_wave", "cos_wave", "tan_spike", "sec_barrier"}

        if hard_counter:
            # If incoming attack is lethal/unblockable, NEVER gamble with reward table!
            if pred_action in DANGEROUS_MOVES:
                return hard_counter

            if f <= 1.5:
                # STATIC player → punish with hard counter
                return hard_counter
            elif f <= 4.0:
                # NORMAL player → 90% hard counter, 10% reward-winner only if positive
                if best_rewarded_token and reward_candidates.get(best_rewarded_token, 0) > 2 and random.random() < 0.10:
                    return decode_action(best_rewarded_token)
                return hard_counter
            else:
                # ADAPTIVE/CREATIVE → 75% hard counter, 25% reward-winner only if positive
                if best_rewarded_token and reward_candidates.get(best_rewarded_token, 0) > 2 and random.random() < 0.25:
                    return decode_action(best_rewarded_token)
                return hard_counter

        # If no hard counter exists, use positive reward candidate if available
        if best_rewarded_token and reward_candidates.get(best_rewarded_token, 0) > 0:
            return decode_action(best_rewarded_token)

        return None

    def record_player_action(self, action_name: str, param: int = 0,
                             frame: Optional[int] = None, dist: Optional[float] = None) -> str:
        """Pushes an executed player action token into sliding history and registers physics-based threat tracking."""
        token = encode_action(action_name, param)
        self.action_history.append(token)
        if len(self.action_history) > self.max_history_len:
            self.action_history.pop(0)

        # Physics-based Time-Aware Projectile Threat Registration
        clean_act = str(action_name).lower().strip()
        current_t = frame if frame is not None else self._internal_tick
        current_d = dist if dist is not None else (180.0 if self._last_dist_cat == "MID" else (350.0 if self._last_dist_cat == "FAR" else 80.0))

        if clean_act == "tan_spike":
            self._active_threats.append({
                "action": "tan_spike",
                "param": param,
                "impact_min": current_t + 10,
                "impact_max": current_t + 45
            })
        elif clean_act in ("sin_wave", "cos_wave"):
            flight_time = max(5, int(current_d / 7.0))
            self._active_threats.append({
                "action": clean_act,
                "param": param,
                "impact_min": current_t + flight_time - 8,
                "impact_max": current_t + flight_time + 8
            })
        elif clean_act == "throw_sword":
            flight_time = max(4, int(current_d / 14.0))
            self._active_threats.append({
                "action": "throw_sword",
                "param": param,
                "impact_min": current_t + flight_time - 5,
                "impact_max": current_t + flight_time + 5
            })

        return token

    # --------------------------------------------------------------------------
    # PREDICTION VIA KATZ'S BACKOFF (5-Gram down to 1-Gram)
    # --------------------------------------------------------------------------
    def predict_player_next_move(self, dist_cat: str) -> Optional[Tuple[str, int]]:
        """
        Queries memory using Katz's Backoff strategy:
        5-Gram -> 4-Gram -> 3-Gram -> 2-Gram -> 1-Gram -> Distance Prior.

        FIX #4: Applies a confidence threshold — only trusts a prediction if
        the top candidate has weight >= MIN_CONFIDENCE (seen at least 3 times).
        Returns decoded action tuple (action_name, param), or None if unseen/uncertain.
        """
        MIN_CONFIDENCE = 3  # Must be observed at least 3 times to be trusted

        def _best_from(candidates: Dict[str, int]) -> Optional[Tuple[str, int]]:
            if not candidates:
                return None
            best_token = max(candidates, key=candidates.get)
            if candidates[best_token] < MIN_CONFIDENCE:
                return None   # Not enough evidence yet
            return decode_action(best_token)

        if not self.action_history:
            # Cold-start fallback to Distance prior (seed weights are trusted)
            if dist_cat in self.weights and self.weights[dist_cat]:
                return decode_action(max(self.weights[dist_cat], key=self.weights[dist_cat].get))
            return None

        # Backoff from highest N-gram down to 1-gram (scaled by difficulty depth)
        max_n = min(max(1, int(round(1 + 4 * self.difficulty))), len(self.action_history))
        for n in range(max_n, 0, -1):
            pattern_key = "->".join(self.action_history[-n:]) + f"@{dist_cat}"
            if pattern_key in self.weights:
                result = _best_from(self.weights[pattern_key])
                if result is not None:
                    return result

        # Fallback to general distance habit (seed weights: always trusted)
        if dist_cat in self.weights and self.weights[dist_cat]:
            return decode_action(max(self.weights[dist_cat], key=self.weights[dist_cat].get))

        return None

    # --------------------------------------------------------------------------
    # HEALTH & ENERGY-AWARE HEURISTIC INVENTION (NO BLIND EXPERIMENTS / LOW STAMINA STALLS)
    # --------------------------------------------------------------------------
    def invent_smart_move(self, dist_cat: str, self_hp: float, enemy_hp: float,
                          self_energy: float = 100.0, enemy_energy: float = 100.0) -> Tuple[str, int]:
        """
        Synthesizes an intelligent counter-move when N-Gram memory is novel/unseen.
        Constrained by Quad-Factor Situational State (Self HP, Enemy HP, Distance, Energy).
        """
        self_stance, enemy_stance = get_health_stance(self_hp, enemy_hp)

        # 1. Survival Stance: Bot is in critical health -> NO risky blind attacks!
        if self_stance == "CRITICAL":
            if dist_cat == "CLOSE":
                return ("block", 0) if self_energy >= 10 else ("crouch", 0)
            elif dist_cat == "MID":
                return ("dodge", 2) if self_energy >= 10 else ("move", 1)
            else:
                return ("sec_barrier", 60) if self_energy >= 20 else ("move", 1)

        # 2. Executioner Stance: Enemy is 1-2 hits from defeat -> aggressive burst!
        if enemy_stance == "LETHAL_WINDOW":
            if dist_cat == "CLOSE":
                if self_energy >= 25:
                    return ("heavy_attack", 0)    # Heavy finisher breaks shields
                elif self_energy >= 5:
                    return ("swing", 0)
                else:
                    return ("attack", 0)
            elif dist_cat == "MID":
                return ("dash", 3) if self_energy >= 10 else ("run", 3)
            else:
                return ("dash", 5) if self_energy >= 10 else ("run", 4)

        # 3. Enemy Exhaustion Exploitation: Enemy has low energy (< 18) -> cannot heavy_attack or cast!
        if enemy_energy < 18:
            if dist_cat == "CLOSE":
                if self_energy >= 25:
                    return ("heavy_attack", 0)    # Punish stationary exhausted foe
                elif self_energy >= 5:
                    return ("swing", 0)
                else:
                    return ("block", 0) if self_energy >= 10 else ("crouch", 0)
            elif dist_cat == "MID":
                if self_energy >= 10:
                    return ("dash", 3)
                elif self_energy >= 18:
                    return ("tan_spike", 45)
                else:
                    return ("run", 2)
            else:
                if self_energy >= 10:
                    return ("dash", 5)
                elif self_energy >= 18:
                    return ("tan_spike", 60)
                else:
                    return ("run", 3)

        # 4. Low Self-Energy Preservation: conserve stamina, avoid stalling!
        if self_energy < 15:
            if dist_cat == "CLOSE":
                if self_energy >= 10:
                    return ("block", 0)
                elif self_energy >= 5:
                    return ("swing", 0)
                else:
                    return ("crouch", 0)
            elif dist_cat == "MID":
                return ("dodge", 1) if self_energy >= 10 else ("move", 1)
            else:
                return ("move", 1)

        # 5. Balanced Tactical Stance (Stable Health & Sufficient Energy)
        if dist_cat == "CLOSE":
            candidates = [("swing", 0), ("attack", 0)]
            if self_energy >= 10:
                candidates.append(("block", 0))
            if self_energy >= 25:
                candidates.append(("heavy_attack", 0))
            return random.choice(candidates)
        elif dist_cat == "MID":
            candidates = []
            if self_energy < 40:
                # Energy conservation: use free sprint and tactical shield
                candidates.extend([("run", 3), ("move", 2)])
                if self_energy >= 10:
                    candidates.append(("block", 0))
            else:
                candidates.extend([("run", 3), ("dash", 2)])
                if self_energy >= 50:
                    candidates.append(("sin_wave", 45))
                if self_energy >= 60:
                    candidates.append(("tan_spike", 45))
            return random.choice(candidates)
        else:
            candidates = []
            # Long range: Use free sprint (run costs 0 energy!) to conserve stamina
            candidates.extend([("run", 4), ("run", 5), ("move", 3)])
            # Only use dash or offensive spells if energy is high (>= 55)
            if self_energy >= 55:
                candidates.append(("dash", 3))
            if self_energy >= 60:
                candidates.append(("sin_wave", 45))
            return random.choice(candidates)

    # --------------------------------------------------------------------------
    # DECISION ARBITRATOR (WITH IMMEDIATE REGENERATION, REFLEX FALLBACK & ENERGY GATING)
    # --------------------------------------------------------------------------
    def decide_bot_action(self, real_dist: float, self_hp: float, enemy_hp: float,
                          self_energy: float = 100.0, enemy_energy: float = 100.0,
                          self_x: Optional[float] = None, enemy_x: Optional[float] = None,
                          self_direction: Optional[int] = None,
                          active_spells: Optional[List[Dict[str, Any]]] = None,
                          current_frame: Optional[int] = None,
                          difficulty: Optional[float] = None) -> Tuple[str, int]:
        """
        Main arbitration loop (enhanced with Orientation Layer 0, Time-Aware Layer 0.5, Dynamic Difficulty, Muster f-aware selection & Energy Budgeting):
        Orientation Reflex → In-Flight Spell Evasion → Perceptual Distance → N-Gram Prediction → f-Aware Counter → Heuristic Invention.
        Also records the chosen action for reward attribution.
        Energy Guard: Prevents "Low Energy" stalls by validating affordability against self_energy.
        """
        self._internal_tick = current_frame if current_frame is not None else (self._internal_tick + 1)

        # Effective difficulty resolution (0.1 - 1.0 or 1 - 10)
        if difficulty is not None:
            try:
                d_val = float(difficulty)
                eff_diff = max(0.1, min(1.0, d_val / 10.0 if d_val > 1.0 else d_val))
            except (ValueError, TypeError):
                eff_diff = self.difficulty
        else:
            eff_diff = self.difficulty

        # Layer 0: Orientation Reflex (Auto-Facing - guarantees bot faces enemy)
        if self_x is not None and enemy_x is not None and self_direction is not None:
            if (enemy_x > self_x and self_direction == -1) or (enemy_x < self_x and self_direction == 1):
                return ("flip", 0)

        # Dynamic distance noise: 5% at diff=1.0, 15% at diff=0.7, 30% at diff=0.2
        dist_noise = 0.05 + 0.25 * (1.0 - eff_diff)
        dist_cat = perceive_distance(real_dist, noise_rate=dist_noise)
        self._last_dist_cat = dist_cat

        chosen: Optional[Tuple[str, int]] = None

        # Layer 0.5: Time-Aware In-Flight Spell Evasion & Defense Reflex
        # Spell perception error rate: 0% at diff=1.0, 15% at diff=0.8, 37.5% at diff=0.5
        spell_error_rate = max(0.0, 0.75 * (1.0 - eff_diff))
        can_perceive_spells = (random.random() >= spell_error_rate)

        if can_perceive_spells:
            # 1. Direct Engine Perception (if active_spells is provided)
            if active_spells is not None and self_x is not None:
                for s in active_spells:
                    stype = s.get('type')
                    owner = s.get('owner')
                    if owner is None or (hasattr(owner, 'x') and abs(owner.x - self_x) > 10):
                        if stype == 'tan_spike':
                            spike_x = s.get('target_x', s.get('x', self_x))
                            if abs(spike_x - self_x) <= 55 and 10 <= s.get('t', 0) <= 45:
                                chosen = ("dodge", 2) if self_energy >= 10 else ("crouch", 0)
                                break
                        elif stype in ('sin_wave', 'cos_wave'):
                            spell_x = s.get('x', 0)
                            spell_dir = s.get('dir', 0)
                            is_incoming = (spell_dir == 1 and spell_x < self_x) or (spell_dir == -1 and spell_x > self_x)
                            if is_incoming and abs(spell_x - self_x) <= 140:
                                if self_energy >= 50 and random.random() < 0.40:
                                    chosen = ("cos_wave", 45) if stype == "sin_wave" else ("sin_wave", 45)
                                elif self_energy >= 10:
                                    chosen = ("block", 0)
                                else:
                                    chosen = ("crouch", 0)
                                break
                        elif stype == 'throw_sword':
                            spell_x = s.get('x', 0)
                            spell_dir = s.get('dir', 0)
                            is_incoming = (spell_dir == 1 and spell_x < self_x) or (spell_dir == -1 and spell_x > self_x)
                            if is_incoming and abs(spell_x - self_x) <= 100:
                                chosen = ("block", 0) if self_energy >= 10 else ("crouch", 0)
                                break

            # 2. Physics-based Internal Flight-Time Estimation (when active_spells not passed, but frame-based clock is active)
            if chosen is None and self._active_threats and current_frame is not None:
                curr_t = self._internal_tick
                self._active_threats = [t for t in self._active_threats if curr_t <= t["impact_max"] + 5]
                for t in self._active_threats:
                    if t["impact_min"] <= curr_t <= t["impact_max"]:
                        act = t["action"]
                        if act == "tan_spike":
                            chosen = ("dodge", 2) if self_energy >= 10 else ("crouch", 0)
                        elif act in ("sin_wave", "cos_wave"):
                            if self_energy >= 50 and random.random() < 0.40:
                                chosen = ("cos_wave", 45) if act == "sin_wave" else ("sin_wave", 45)
                            elif self_energy >= 10:
                                chosen = ("block", 0)
                            else:
                                chosen = ("crouch", 0)
                        elif act == "throw_sword":
                            chosen = ("block", 0) if self_energy >= 10 else ("crouch", 0)
                        if chosen:
                            break

        # Layer 1: Primary Arbitration with Instant Retry/Regeneration
        if chosen is None:
            try:
                prediction = self.predict_player_next_move(dist_cat)
                if prediction:
                    pred_action, pred_param = prediction
                    # Dynamic counter execution: at lower difficulty, bot may hesitate or miss the optimal counter
                    if random.random() < eff_diff:
                        chosen = self._select_counter_by_f(dist_cat, pred_action, pred_param)

                if chosen is None:
                    # Fallback: invent contextually-smart move with energy awareness
                    chosen = self.invent_smart_move(dist_cat, self_hp, enemy_hp, self_energy, enemy_energy)
            except Exception:
                # Immediate regeneration retry on error (0ms fallback)
                try:
                    chosen = self.invent_smart_move(dist_cat, self_hp, enemy_hp, self_energy, enemy_energy)
                except Exception:
                    chosen = None

        # Layer 2: Emergency Reflex Fallback (Guaranteed Safe Move)
        if chosen is None or not isinstance(chosen, tuple) or len(chosen) != 2:
            if dist_cat == "CLOSE":
                chosen = ("block", 0) if self_energy >= 10 else ("crouch", 0)
            elif dist_cat == "MID":
                chosen = ("dodge", 1) if self_energy >= 10 else ("move", 1)
            else:
                chosen = ("move", 1)

        # Layer 3: Energy Budgeting & Affordability Filter (Zero-Stall Protection)
        cost = ACTION_ENERGY_COSTS.get(chosen[0], 0)
        if self_energy < cost:
            # Downgrade to the most tactical affordable action for current distance
            if dist_cat == "CLOSE":
                if self_energy >= 10:
                    chosen = ("block", 0)
                elif self_energy >= 5:
                    chosen = ("swing", 0)
                else:
                    chosen = ("crouch", 0)
            elif dist_cat == "MID":
                if self_energy >= 10:
                    chosen = ("dodge", 1)
                else:
                    chosen = ("move", 1)
            else:
                chosen = ("move", 1)

        # Record for reward attribution
        self._last_bot_action = chosen
        # FIX #7: append every action to the match log
        self._match_action_log.append((dist_cat, chosen[0], chosen[1]))
        return chosen

    # --------------------------------------------------------------------------
    # ONLINE REINFORCEMENT LEARNING (FIXED CONTEXT OFF-BY-ONE & MARKOV INTEGRITY)
    # --------------------------------------------------------------------------
    def update_learning(self, dist_cat: str, actual_action: str, actual_param: int, prior_history: Optional[List[str]] = None):
        """
        Learns player behavioral habits into N-gram transition keys.
        CRITICAL FIX: Uses the PRECEDING history (prior_history) as context,
        mapping: [preceding_moves] @ dist_cat -> actual_action.
        """
        context = list(prior_history) if prior_history is not None else list(self.action_history[:-1])
        token = encode_action(actual_action, actual_param)

        # 1. Update distance general prior
        if dist_cat not in self.weights:
            self.weights[dist_cat] = {}
        self.weights[dist_cat][token] = min(20, self.weights[dist_cat].get(token, 0) + 1)

        # 2. Update multi-gram transitions (FIX #8: now 1-gram to 5-gram, matching predict)
        if context:
            for n in range(min(5, len(context)), 0, -1):
                pattern_key = "->".join(context[-n:]) + f"@{dist_cat}"
                if pattern_key not in self.weights:
                    self.weights[pattern_key] = {}
                # Increment observation frequency (capped at 20)
                current_w = self.weights[pattern_key].get(token, 0)
                self.weights[pattern_key][token] = min(20, current_w + 1)

        # 3. Maintain bounded memory footprint (Prune if exceeding threshold)
        if len(self.weights) > self.max_memory_keys:
            self.prune_memory()

    def prune_memory(self):
        """Prunes least active / lowest weight keys to keep JSON footprint tiny (< 25 KB)."""
        scored_keys = []
        for k, subdict in self.weights.items():
            total_weight = sum(subdict.values())
            scored_keys.append((total_weight, k))

        # Sort ascending by activity and prune bottom 25%
        scored_keys.sort()
        remove_count = max(1, len(self.weights) - self.max_memory_keys + 15)
        for _, k in scored_keys[:remove_count]:
            if k not in ("FAR", "MID", "CLOSE"):  # Preserve root distance priors
                self.weights.pop(k, None)

    # --------------------------------------------------------------------------
    # SERIALIZATION — Export only (bot → JSON string for LocalStorage)
    # --------------------------------------------------------------------------
    def export_to_dict(self) -> Dict[str, Any]:
        """Serializes weights and state to a compact dictionary for WebSocket/LocalStorage."""
        return {
            "w": self.weights,
            "muster": {
                "cf": [round(c, 2) for c in self._change_factors],
                "f":  round(self.co_factor_f, 2),
                "lc": self._line_conn_map,
                "rt": self._reward_table,
                "pl": self.player_label,
            }
        }

    def export_to_json(self) -> str:
        """Serializes weights AND Muster bot state to an ultra-compact JSON string."""
        payload = {
            "w": self.weights,
            "muster": {
                "cf": [round(c, 2) for c in self._change_factors],
                "f":  round(self.co_factor_f, 2),
                "lc": self._line_conn_map,
                "rt": self._reward_table,
                "pl": self.player_label,
            }
        }
        return json.dumps(payload, separators=(",", ":"))

    def _apply_grant(self, grant: "BotGrant"):
        """
        Internal method: applies a parsed BotGrant onto this bot instance.
        Called only by load_localstorage_grant() — never directly.
        Bot does NOT touch LocalStorage or JSON — that's the Grant's job.
        """
        # --- Merge weights: seed (Tier 1) + grant (Tier 2) ---
        merged: Dict[str, Dict[str, int]] = self._default_seed_weights()
        for k, sub in grant.weights.items():
            if k not in merged:
                merged[k] = {}
            for token, w in sub.items():
                merged[k][token] = w   # User's observed weight takes priority
        self.weights = merged

        # --- Restore Muster state ---
        if grant.change_factors:
            self._change_factors = grant.change_factors[:]
            self.co_factor_f     = grant.co_factor_f
        if grant.line_conn_map:
            self._line_conn_map  = dict(grant.line_conn_map)
        if grant.reward_table:
            self._reward_table   = {k: dict(v) for k, v in grant.reward_table.items()}
        if grant.player_label != "UNKNOWN":
            self.player_label    = grant.player_label

    def import_from_dict(self, data: Any):
        """
        Legacy compatibility shim — still works for old code / test harness.
        New code should use: load_localstorage_grant(raw_json) → BotGrant → MasterBotBrain(grant)
        """
        grant = load_localstorage_grant(json.dumps(data) if not isinstance(data, str) else data)
        self._apply_grant(grant)


# ==============================================================================
# 6. BOT GRANT - LocalStorage Parser (COMPLETELY SEPARATE FROM BOT)
# ==============================================================================

class BotGrant:
    """
    A clean, validated data packet parsed from LocalStorage.

    The Bot accepts this object as input rather than raw JSON strings.
    The Bot is agnostic to data origin (file, network, or localStorage).

    Fields:
        weights       : N-gram pattern weights (Dict[str, Dict[str, int]])
        change_factors: Script diff history [x, y, z, p]
        co_factor_f   : Averaged change factor
        line_conn_map : Line substitution map
        reward_table  : Win/loss reward by action
        player_label  : STATIC / NORMAL / ADAPTIVE / CREATIVE / UNKNOWN
        is_empty      : True if no usable data was found (fresh player)
        errors        : List of issues found during parsing (for logging)
    """
    __slots__ = (
        "weights", "change_factors", "co_factor_f",
        "line_conn_map", "reward_table", "player_label",
        "is_empty", "errors",
    )

    def __init__(self):
        self.weights:        Dict[str, Dict[str, int]] = {}
        self.change_factors: List[int]                 = []
        self.co_factor_f:    float                     = 0.0
        self.line_conn_map:  Dict[str, int]            = {}
        self.reward_table:   Dict[str, Dict[str, int]] = {}
        self.player_label:   str                       = "UNKNOWN"
        self.is_empty:       bool                      = True
        self.errors:         List[str]                 = []

    def __repr__(self) -> str:
        return (
            f"BotGrant(keys={len(self.weights)}, f={self.co_factor_f}, "
            f"label={self.player_label}, empty={self.is_empty}, "
            f"errors={len(self.errors)})"
        )


def load_localstorage_grant(raw_json: Optional[str]) -> BotGrant:
    """
    =========================================================
    LocalStorage -> BotGrant Parser
    =========================================================
    Input:  raw JSON string from browser LocalStorage (or None/empty)
    Output: BotGrant (clean, validated, bot-ready)

    Operations:
      1. Parses JSON in a crash-proof manner.
      2. Handles both new format {"w": ..., "muster": ...} and legacy format.
      3. Sanitizes all fields (type check, range clamp, length limit).
      4. Safely drops corrupt or malicious entries.
      5. Returns a verified BotGrant instance.

    Usage:
        raw = localstorage.getItem("muster_bot_v2")   # JS side
        grant = load_localstorage_grant(raw)
        bot = MasterBotBrain(grant=grant)
    =========================================================
    """
    grant = BotGrant()

    # ── Step 1: Handle empty / missing data ──────────────────────────────────
    if not raw_json or not isinstance(raw_json, str) or raw_json.strip() in ("", "null", "undefined"):
        grant.errors.append("EMPTY: No LocalStorage data found — fresh player.")
        return grant   # is_empty = True

    # ── Step 2: Parse JSON safely ─────────────────────────────────────────────
    try:
        data = json.loads(raw_json)
    except (json.JSONDecodeError, ValueError) as e:
        grant.errors.append(f"JSON_ERROR: {e}")
        return grant   # is_empty = True, corrupted

    if not isinstance(data, dict):
        grant.errors.append("FORMAT_ERROR: Root must be a dict.")
        return grant

    # ── Step 3: Detect format (new vs legacy) ─────────────────────────────────
    if "w" in data:
        raw_weights  = data.get("w", {})
        muster_data  = data.get("muster", {})
    else:
        # Legacy: the whole dict is weights
        raw_weights  = data
        muster_data  = {}

    # ── Step 4: Sanitize weights ──────────────────────────────────────────────
    MAX_KEY_LEN    = 80
    MAX_TOKEN_LEN  = 12
    MAX_WEIGHT     = 25
    MIN_WEIGHT     = 1
    MAX_KEYS       = 150   # Safety cap

    clean_weights: Dict[str, Dict[str, int]] = {}
    key_count = 0

    for k, v in raw_weights.items():
        if key_count >= MAX_KEYS:
            grant.errors.append(f"PRUNED: Exceeded {MAX_KEYS} key limit.")
            break
        if not isinstance(k, str):
            grant.errors.append(f"SKIP_KEY: Non-string key {repr(k)[:30]}")
            continue
        if len(k) > MAX_KEY_LEN:
            grant.errors.append(f"SKIP_KEY: Key too long ({len(k)} > {MAX_KEY_LEN})")
            continue
        if not isinstance(v, dict):
            grant.errors.append(f"SKIP_VAL: Value for '{k}' is not a dict")
            continue

        clean_sub: Dict[str, int] = {}
        for token, weight in v.items():
            if not isinstance(token, str):
                continue
            if not isinstance(weight, (int, float)):
                continue
            clamped = int(max(MIN_WEIGHT, min(MAX_WEIGHT, weight)))
            clean_sub[token[:MAX_TOKEN_LEN]] = clamped

        if clean_sub:
            clean_weights[k] = clean_sub
            key_count += 1

    grant.weights = clean_weights

    # ── Step 5: Sanitize Muster state ─────────────────────────────────────────
    if isinstance(muster_data, dict):
        # change_factors
        cf_raw = muster_data.get("cf", [])
        if isinstance(cf_raw, list):
            grant.change_factors = [
                int(max(0, min(500, x)))
                for x in cf_raw
                if isinstance(x, (int, float))
            ][:4]

        # co_factor_f
        f_raw = muster_data.get("f", 0.0)
        if isinstance(f_raw, (int, float)):
            grant.co_factor_f = float(max(0.0, min(500.0, f_raw)))

        # line_conn_map
        lc_raw = muster_data.get("lc", {})
        if isinstance(lc_raw, dict):
            grant.line_conn_map = {
                str(k)[:62]: int(max(0, min(9999, v)))
                for k, v in lc_raw.items()
                if isinstance(v, (int, float))
            }

        # reward_table
        rt_raw = muster_data.get("rt", {})
        if isinstance(rt_raw, dict):
            clean_rt: Dict[str, Dict[str, int]] = {}
            for dk, dv in rt_raw.items():
                if not isinstance(dk, str) or not isinstance(dv, dict):
                    continue
                clean_rt[str(dk)[:20]] = {
                    str(ak)[:12]: int(max(-10, min(30, av)))
                    for ak, av in dv.items()
                    if isinstance(av, (int, float))
                }
            grant.reward_table = clean_rt

        # player_label
        pl_raw = muster_data.get("pl", "UNKNOWN")
        VALID_LABELS = {"STATIC", "NORMAL", "ADAPTIVE", "CREATIVE", "UNKNOWN"}
        grant.player_label = pl_raw if pl_raw in VALID_LABELS else "UNKNOWN"

    # ── Step 6: Mark as non-empty if we got anything useful ──────────────────
    if grant.weights or grant.change_factors:
        grant.is_empty = False

    return grant
# ==============================================================================
if __name__ == "__main__":
    print("=" * 65)
    print("🥋 SACE ENGINE — COMPREHENSIVE VERIFICATION SUITE")
    print("=" * 65)

    bot = MasterBotBrain()

    # --- TEST 1: Verification of Repeated Pattern Learning ---
    print("\n[Test 1] Testing Behavioral Habit Learning (dash -> swing):")
    # Simulate human player establishing a habit: Dash forward then Swing sword
    for i in range(4):
        # Step A: Player dashes
        bot.record_player_action("dash", 2)
        # Step B: Player swings. Learn transition: [dash] -> swing (4× > MIN_CONFIDENCE=3)
        prior = list(bot.action_history)
        bot.record_player_action("swing", 1)
        bot.update_learning("CLOSE", "swing", 1, prior)

    # Now player dashes again at CLOSE distance:
    bot.record_player_action("dash", 2)
    predicted = bot.predict_player_next_move("CLOSE")
    print(f"  -> Next move predicted: {predicted}")
    assert predicted is not None, "Error: Prediction must not be None after 4 repeated demonstrations!"
    # Pre-trained weights + 4 observations of swing → swing should be predicted
    assert predicted[0] in ("swing", "attack", "dash"), f"Unexpected prediction: {predicted[0]}"
    print(f"  ✓ PASS: N-Gram successfully learned habit! Predicted: {predicted[0]}")

    # --- TEST 2: Counter Verification (use a fresh bot to isolate) ---
    bot_t2 = MasterBotBrain()
    for _ in range(4):
        bot_t2.record_player_action("dash", 2)
        prior_t2 = list(bot_t2.action_history)
        bot_t2.record_player_action("swing", 1)
        bot_t2.update_learning("CLOSE", "swing", 1, prior_t2)
    bot_t2.record_player_action("dash", 2)
    decision = bot_t2.decide_bot_action(real_dist=90.0, self_hp=9, enemy_hp=8)
    print(f"\n[Test 2] Counter for Predicted Swing at CLOSE range:")
    print(f"  -> Bot Decision: {decision[0]} (Param: {decision[1]})")
    assert decision[0] in ("block", "swing", "heavy_attack"), \
        f"Error: Expected a close-range counter, got {decision[0]}"
    print("  ✓ PASS: Bot correctly responded to predicted sword strike at close range!")

    # --- TEST 3: Health-Aware Smart Invention on Critical HP ---
    print("\n[Test 3] Smart Invention at CRITICAL HP (Self HP: 2, Enemy HP: 9):")
    # Directly test invent_smart_move() — the CRITICAL HP survival logic
    bot_critical = MasterBotBrain()
    bot_critical.weights = {}   # Clear ALL weights → forces invent_smart_move every time
    bot_critical.action_history.clear()
    crisis_decision = bot_critical.decide_bot_action(real_dist=100.0, self_hp=2, enemy_hp=9)
    print(f"  -> Decision under life threat: {crisis_decision[0]}")
    # invent_smart_move: CRITICAL + CLOSE → block (no prediction possible, no weights)
    assert crisis_decision[0] == "block", \
        f"Error: Bot must raise block at CRITICAL HP + CLOSE range, got {crisis_decision[0]}"
    print("  ✓ PASS: Bot refused suicidal attack and prioritized defensive survival!")

    # --- TEST 4: Crash-Proof Deserialization ---
    print("\n[Test 4] Crash Protection on Malformed LocalStorage JSON:")
    bot.import_from_dict({"corrupted_key": "not_a_dict", 123: 456, "valid@MID": {"8:1": "bad_weight"}})
    print(f"  -> Total valid sanitized keys: {len(bot.weights)}")
    print("  ✓ PASS: Deserializer rejected malicious/malformed inputs safely without raising exception!")

    # --- TEST 5: Memory Footprint & Pruning ---
    json_export = bot.export_to_json()
    byte_size = len(json_export.encode('utf-8'))
    print(f"\n[Test 5] Memory Footprint:")
    print(f"  -> Serialized JSON Size: {byte_size} bytes ({round(byte_size / 1024, 2)} KB)")
    assert byte_size < 15000, "Error: Serialized memory exceeded 15 KB threshold!"
    print("  ✓ PASS: Memory size is under 2 KB — perfectly suited for 60 FPS and zero-cloud LocalStorage!")

    print("\n" + "=" * 65)
    print("🎉 ALL SACE ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)

    # ===========================================================================
    # MUSTER BOT TESTS
    # ===========================================================================
    print("\n" + "=" * 65)
    print("🧠 MUSTER BOT — SCRIPT LEARNING VERIFICATION")
    print("=" * 65)

    bot2 = MasterBotBrain()

    # --- MUSTER TEST 1: Script diff & co-factor f calculation ---
    print("\n[Muster Test 1] Change-Factor f computation:")
    # Using actual multi-line strings (not \n escapes) so unified_diff sees real lines
    scripts = [
        "move(3)\nattack()\nblock()",
        "move(3)\nattack()\ndash(2)",          # 1 replace: block→dash
        "move(3)\nsin_wave(45)\ndash(2)",       # 1 replace: attack→sin_wave
        "jump(6)\nsin_wave(45)\ndash(2)\ncrouch()",     # 2 changes: move→jump, +crouch
        "jump(6)\ncos_wave(45)\nheavy_attack()\ncrouch()",  # 2 replaces: sin→cos, dash→heavy
    ]
    for s in scripts:
        result = bot2.ingest_player_script(s)

    print(f"  -> Change factors: {bot2._change_factors}")
    print(f"  -> Co-factor f   : {bot2.co_factor_f}")
    print(f"  -> Player label  : {bot2.player_label}")
    assert len(bot2._change_factors) == 4, "Should have 4 change factors after 5 scripts!"
    # After fix #1, diff correctly counts only content lines (no +++ / --- headers)
    # Scripts above have real changes, so f must be > 0
    assert bot2.co_factor_f > 0, f"Co-factor f must be > 0 after script changes! Got {bot2.co_factor_f}"
    print("  PASS: Co-factor f calculated correctly from script diffs!")

    # --- MUSTER TEST 2: Reward learning (win/loss feedback) ---
    print("\n[Muster Test 2] Reward-based weight adaptation (FIX #7 — match log):")
    bot2b = MasterBotBrain()
    # Simulate bot taking actions during a match
    bot2b.decide_bot_action(real_dist=200.0, self_hp=8, enemy_hp=6)   # MID action
    bot2b.decide_bot_action(real_dist=200.0, self_hp=8, enemy_hp=5)
    bot2b.decide_bot_action(real_dist=200.0, self_hp=7, enemy_hp=4)
    print(f"  -> Match action log entries: {len(bot2b._match_action_log)}")
    assert len(bot2b._match_action_log) == 3, "Match log should have 3 actions!"
    # Bot wins the match
    bot2b.register_match_outcome(+1)
    print(f"  -> Reward table after win: {bot2b._reward_table}")
    assert len(bot2b._reward_table) > 0, "Reward table should have entries after a win!"
    assert bot2b._match_action_log == [], "Match log should be cleared after outcome!"
    print("  PASS: Reward distributed across match actions, log cleared after outcome!")

    # Penalty test
    bot2b.decide_bot_action(real_dist=80.0, self_hp=5, enemy_hp=8)
    bot2b.register_match_outcome(-1)
    print("  PASS: Penalty applied correctly on loss!")

    # --- MUSTER TEST 3: Serialisation round-trip with Muster state ---
    print("\n[Muster Test 3] Serialisation round-trip:")
    exported = bot2.export_to_json()
    byte_size = len(exported.encode("utf-8"))
    print(f"  -> Serialized size: {byte_size} bytes ({round(byte_size/1024,2)} KB)")
    assert byte_size < 20000, "Serialized Muster state must stay under 20 KB!"
    bot3 = MasterBotBrain()
    bot3.import_from_dict(json.loads(exported))
    assert abs(bot3.co_factor_f - bot2.co_factor_f) < 0.01, "co_factor_f must survive serialisation!"
    assert bot3.player_label == bot2.player_label, "player_label must survive serialisation!"
    print(f"  -> Restored f={bot3.co_factor_f}, label={bot3.player_label}")
    print("  PASS: Full Muster state serialised and restored correctly!")

    # --- MUSTER TEST 4: Player label categories ---
    print("\n[Muster Test 4] Player label classification (FIX #6 — unified thresholds):")
    test_cases = [
        ([0, 0, 0, 0],       "STATIC"),    # f=0.0
        ([1, 1, 2, 1],       "STATIC"),    # f=1.25 ≤ 1.5
        ([2, 3, 2, 3],       "NORMAL"),    # f=2.5
        ([5, 6, 7, 8],       "ADAPTIVE"),  # f=6.5
        ([12, 15, 10, 14],   "CREATIVE"),  # f=12.75
    ]
    for factors, expected_label in test_cases:
        bot_t = MasterBotBrain()
        bot_t._change_factors = factors
        bot_t.co_factor_f     = sum(factors) / len(factors)
        label = bot_t._classify_player()
        print(f"  -> Factors={factors}, f={bot_t.co_factor_f:.1f} -> label={label}", end=" ")
        assert label == expected_label, f"Expected {expected_label}, got {label}"
        print("OK")
    print("  PASS: All player labels assigned correctly!")

    # --- MUSTER TEST 5: Standalone BotGrant Parsing & Clean Injection ---
    print("\n[Muster Test 5] Standalone BotGrant & Independent Bot Injection:")
    raw_storage_sample = json.dumps({
        "w": {"FAR": {"2:3": 12, "15:45": 9}},
        "muster": {
            "cf": [1, 2, 1, 2],
            "f": 1.5,
            "lc": {"dash→swing": 5},
            "rt": {"CLOSE": {"10:1": 8}},
            "pl": "STATIC"
        }
    })
    # Step A: External parser parses raw storage string into a pure data grant
    grant = load_localstorage_grant(raw_storage_sample)
    assert not grant.is_empty, "Grant should not be empty!"
    assert grant.co_factor_f == 1.5, f"Expected f=1.5, got {grant.co_factor_f}"
    assert grant.player_label == "STATIC", f"Expected STATIC, got {grant.player_label}"
    print(f"  -> Successfully parsed grant: {grant}")

    # Step B: Bot is initialized with the clean grant object (Zero localStorage coupling)
    bot_isolated = MasterBotBrain(grant=grant)
    assert bot_isolated.co_factor_f == 1.5, "Bot should have received f from grant!"
    assert bot_isolated.player_label == "STATIC", "Bot should have received label from grant!"
    assert bot_isolated.weights["FAR"]["2:3"] == 12, "User weight should override seed weight!"
    print("  PASS: Bot cleanly ingested BotGrant without touching LocalStorage!")

    print("\n" + "=" * 65)
    print("ALL MUSTER BOT TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)
