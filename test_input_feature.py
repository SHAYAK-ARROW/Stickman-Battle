import sys
sys.path.insert(0, r"C:\Users\SHAYAK SADHUKHAN\Desktop\github\Stickman-Battle")

import compiler
from char import Body
from engine import GameEngine
from game import GameRoom, handle_reply_input, rooms

def test_input_model1():
    print("Testing input() Model 1 (Challenge/Dialogue Prompt)...")

    p1 = Body("player1", 200, 470, 1)
    p2 = Body("player2", 600, 470, -1)
    engine = GameEngine()
    engine.add_player(p1, p2)

    # Test 1: Calling input() queues ('ask', prompt)
    code = "input('Give up?')"
    compiler.compiler(code, p1, p2)
    assert len(p1.action_queue) == 1, f"Expected 1 action, got {len(p1.action_queue)}"
    action_type, prompt = p1.action_queue[0]
    assert action_type == 'ask', f"Expected 'ask', got {action_type}"
    assert prompt == 'Give up?', f"Expected 'Give up?', got {prompt}"
    print("  [PASS] Test 1: input() queues ('ask', prompt)")

    # Test 2: Executing 'ask' action sets speech bubble for asking stickman AND pending_question
    p1.execute_next_action()
    assert p1.pending_question == 'Give up?', f"Expected pending_question 'Give up?', got {p1.pending_question}"
    assert p1.speech_text == 'Give up?', f"Expected speech_text 'Give up?', got {p1.speech_text}"
    assert p1.speech_timer == 90, f"Expected speech_timer == 90, got {p1.speech_timer}"
    print("  [PASS] Test 2: 'ask' sets speech bubble and pending_question")

    # Test 3: Length cap at 40 chars
    p1.action_queue.clear()
    long_q = "Q" * 100
    compiler.compiler(f"input('{long_q}')", p1, p2)
    _, capped = p1.action_queue[0]
    assert len(capped) == 40, f"Expected 40 chars, got {len(capped)}"
    print("  [PASS] Test 3: Length cap at 40 chars")

    # Test 4: Spam cap (max 3 input prompts per script)
    p1.action_queue.clear()
    spam_code = """
for i in range(10):
    input(f"Question {i}")
"""
    compiler.compiler(spam_code, p1, p2)
    ask_actions = [a for a in p1.action_queue if a[0] == 'ask']
    assert len(ask_actions) == 3, f"Expected 3 ask actions, got {len(ask_actions)}"
    print("  [PASS] Test 4: Spam cap (max 3 input prompts)")

    # Test 5: Opponent reply populates speech bubble on opponent stickman
    room = GameRoom("test_room_reply")
    rooms["test_room_reply"] = room
    handle_reply_input({
        'room_id': 'test_room_reply',
        'from_player': 2,
        'reply': 'Kokhono na!'
    })
    assert room.player2.speech_text == 'Kokhono na!', f"Expected opponent speech 'Kokhono na!', got {room.player2.speech_text}"
    assert room.player2.speech_timer == 90, f"Expected timer == 90, got {room.player2.speech_timer}"
    print("  [PASS] Test 5: Opponent reply triggers speech bubble on opponent stickman")

    # Test 6: Room reset clears pending_question
    room.player1.pending_question = "Unanswered"
    room.reset_match()
    assert room.player1.pending_question is None, "Expected pending_question to be cleared on reset"
    print("  [PASS] Test 6: Room reset clears pending_question")

    print("\nALL INPUT MODEL 1 TESTS PASSED SUCCESSFULLY! (VERDICT: PASS)")

if __name__ == '__main__':
    test_input_model1()

