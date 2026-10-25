import os
import sys

# Ensure import path
sys.path.insert(0, r"C:\Users\SHAYAK SADHUKHAN\Desktop\github\Stickman-Battle")

import compiler
from char import Body
from engine import GameEngine
from game import GameRoom

def test_speech_bubble_feature():
    print("Testing print() Speech Bubble Feature...")
    
    p1 = Body("player1", 200, 470, 1)
    p2 = Body("player2", 600, 470, -1)
    engine = GameEngine()
    engine.add_player(p1, p2)
    
    # Test 1: Single print queues ('say', text)
    code = "print('Hello Fighter!')"
    compiler.compiler(code, p1, p2)
    assert len(p1.action_queue) == 1, f"Expected 1 action, got {len(p1.action_queue)}"
    action_type, text = p1.action_queue[0]
    assert action_type == 'say', f"Expected action 'say', got {action_type}"
    assert text == 'Hello Fighter!', f"Expected 'Hello Fighter!', got {text}"
    print("  [PASS] Test 1: Single print queue verification")

    # Test 2: Execution sets speech_text and speech_timer
    p1.execute_next_action()
    assert p1.speech_text == 'Hello Fighter!', f"Expected 'Hello Fighter!', got {p1.speech_text}"
    assert p1.speech_timer == 90, f"Expected speech_timer == 90, got {p1.speech_timer}"
    print("  [PASS] Test 2: Action execution sets speech_text & speech_timer = 90")

    # Test 3: Engine update decrements speech_timer and clears on 0
    for _ in range(90):
        assert p1.speech_timer > 0
        assert p1.speech_text == 'Hello Fighter!'
        engine.update()
    
    assert p1.speech_timer == 0, f"Expected timer == 0, got {p1.speech_timer}"
    assert p1.speech_text == "", f"Expected empty text after expiry, got '{p1.speech_text}'"
    print("  [PASS] Test 3: Engine updates and timer expiry (90 frames)")

    # Test 4: Message length capping (max 40 chars)
    p1.action_queue.clear()
    long_msg = "X" * 100
    compiler.compiler(f"print('{long_msg}')", p1, p2)
    _, capped_text = p1.action_queue[0]
    assert len(capped_text) == 40, f"Expected length 40, got {len(capped_text)}"
    print("  [PASS] Test 4: Length cap at 40 chars")

    # Test 5: Loop spam cap (max 5 prints per script execution)
    p1.action_queue.clear()
    loop_code = """
for i in range(20):
    print(f"Attack {i}")
"""
    compiler.compiler(loop_code, p1, p2)
    say_actions = [a for a in p1.action_queue if a[0] == 'say']
    assert len(say_actions) == 5, f"Expected exactly 5 say actions, got {len(say_actions)}"
    print("  [PASS] Test 5: Loop spam cap (max 5 prints)")

    # Test 6: Room reset_match clears speech
    room = GameRoom("test_room")
    room.player1.speech_text = "Talking"
    room.player1.speech_timer = 50
    room.reset_match()
    assert room.player1.speech_text == ""
    assert room.player1.speech_timer == 0
    print("  [PASS] Test 6: Room reset_match clears speech attributes")

    print("\nALL SPEECH BUBBLE TESTS PASSED SUCCESSFULLY! (VERDICT: PASS)")

if __name__ == '__main__':
    test_speech_bubble_feature()

