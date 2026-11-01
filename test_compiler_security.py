import compiler
from char import Body

def test_compiler_security():
    print("Testing Compiler AST Security...")

    p1 = Body("player1", 200, 470, 1)

    # 1. Test 'import os'
    compiler.compiler("import os\nos.system('dir')", p1)
    assert p1.speech_text.startswith("Security:"), f"Expected security speech, got: {p1.speech_text}"
    assert len(p1.action_queue) == 0, "No combat actions should be queued on security violation"
    print("  [PASS] Blocked: import os -> Speech bubble:", p1.speech_text)

    # 2. Test 'from sys import exit'
    p1.speech_text = ""
    compiler.compiler("from sys import exit\nexit()", p1)
    assert p1.speech_text.startswith("Security:"), f"Expected security speech, got: {p1.speech_text}"
    assert len(p1.action_queue) == 0
    print("  [PASS] Blocked: from sys import exit -> Speech bubble:", p1.speech_text)

    # 3. Test 'while True:'
    p1.speech_text = ""
    compiler.compiler("while True:\n    attack()", p1)
    assert "while" in p1.speech_text.lower(), f"Expected while warning, got: {p1.speech_text}"
    assert len(p1.action_queue) == 0
    print("  [PASS] Blocked: while loop -> Speech bubble:", p1.speech_text)

    # 4. Test dunder access: '().__class__'
    p1.speech_text = ""
    compiler.compiler("x = ().__class__", p1)
    assert p1.speech_text.startswith("Security:"), f"Expected security speech, got: {p1.speech_text}"
    assert len(p1.action_queue) == 0
    print("  [PASS] Blocked: dunder attribute access -> Speech bubble:", p1.speech_text)

    # 5. Test range(1000) limit
    p1.speech_text = ""
    compiler.compiler("for i in range(500):\n    move(1)", p1)
    assert "Max 100 loop" in p1.speech_text or "Error:" in p1.speech_text
    print("  [PASS] Blocked: range(500) exceeded limit -> Speech bubble:", p1.speech_text)

    # 6. Test syntax error
    p1.speech_text = ""
    compiler.compiler("if True\n    attack()", p1)
    assert p1.speech_text.startswith("Syntax Error"), f"Expected syntax error speech, got: {p1.speech_text}"
    print("  [PASS] Handled syntax error -> Speech bubble:", p1.speech_text)

    # 7. Test allowed legitimate Python code
    p1.speech_text = ""
    valid_code = """
def combat():
    for i in range(3):
        move(2)
        if get_enemy_distance() < 100:
            attack()
        else:
            block()
combat()
"""
    p2 = Body("player2", 600, 470, -1)
    compiler.compiler(valid_code, p1, p2)
    assert len(p1.action_queue) > 0, "Valid actions should be queued!"
    print(f"  [PASS] Valid Python combat code queued {len(p1.action_queue)} actions successfully!")

    print("\nALL COMPILER SECURITY TESTS PASSED! (VERDICT: PASS)")

if __name__ == '__main__':
    test_compiler_security()
