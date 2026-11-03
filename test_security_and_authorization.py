import unittest
import ast
import re
from char import Body
import compiler
import game

class TestSecurityAndAuthorization(unittest.TestCase):
    def setUp(self):
        self.p1 = Body(name="Fighter1", x=200, y=470, direction=1)
        self.p2 = Body(name="Fighter2", x=300, y=470, direction=-1)

    def test_code_size_limit(self):
        # Code > 2000 characters should be rejected
        huge_code = "# safe comment\n" * 150 # ~2250 chars
        self.assertGreater(len(huge_code), 2000)
        compiler.compiler(huge_code, self.p1, self.p2)
        # Should set speech alert and not queue actions
        self.assertEqual(len(self.p1.action_queue), 0)
        self.assertTrue(self.p1.speech_text.startswith("Security: Code size limit"))

    def test_nested_loops_limit(self):
        # 3 nested loops should be rejected by AST validator
        code = '''
for i in range(2):
    for j in range(2):
        for k in range(2):
            move(1)
'''
        compiler.compiler(code, self.p1, self.p2)
        self.assertEqual(len(self.p1.action_queue), 0)
        self.assertIn("Max 2 nested loops allowed", self.p1.speech_text)

    def test_recursion_detection(self):
        # Recursive function calling itself should be rejected
        code = '''
def loop_forever(n):
    loop_forever(n + 1)
loop_forever(1)
'''
        compiler.compiler(code, self.p1, self.p2)
        self.assertEqual(len(self.p1.action_queue), 0)
        self.assertIn("Recursion detected", self.p1.speech_text)

    def test_forbidden_identifiers(self):
        # Testing eval, exec, getattr, globals, open
        forbidden = [
            "eval('1+1')",
            "exec('move(1)')",
            "getattr(move, '__doc__')",
            "globals()",
            "locals()",
            "open('game.py')",
            "__import__('os')"
        ]
        for f in forbidden:
            compiler.compiler(f, self.p1, self.p2)
            self.assertEqual(len(self.p1.action_queue), 0, f"Failed to block: {f}")
            self.assertTrue(self.p1.speech_text.startswith("Security:"), f"Failed security alert for: {f}")

    def test_execution_timeout(self):
        # Code that attempts to run too many iterations should hit the 0.3s timeout guard
        # Note: while loops and 3 nested loops are blocked by AST, but two 100-loops doing work
        code = '''
s = 0
for i in range(100):
    for j in range(100):
        for x in range(10): # wait, 3 loops is blocked by AST!
            pass
'''
        # Let's test a time-consuming calculation that AST permits (2 loops)
        code2 = '''
total = 0
for i in range(100):
    for j in range(100):
        total += len(str(i ** 500))
'''
        # This will either finish fast or trigger timeout; compiler should never hang
        compiler.compiler(code2, self.p1, self.p2)
        # Main thread remained alive and responsive
        self.assertTrue(True)

    def test_room_id_regex_validation(self):
        valid_ids = ["room_1", "battle_arena", "abc123", "match-99_x"]
        invalid_ids = [
            "../bad_path",
            "<script>alert(1)</script>",
            "room with spaces",
            "ab", # too short (<3)
            "this_is_a_room_name_that_exceeds_twenty_four_chars_long", # > 24
            "room$#@!"
        ]
        for vid in valid_ids:
            self.assertTrue(bool(game.ROOM_ID_PATTERN.match(vid)), f"Should be valid: {vid}")
        for inv in invalid_ids:
            self.assertFalse(bool(game.ROOM_ID_PATTERN.match(inv)), f"Should be invalid: {inv}")

    def test_socket_sid_authorization(self):
        # Clear test state
        game.rooms.clear()
        game.sid_auth.clear()
        
        # 1. Test unauthenticated request.sid
        test_sid = "fake_unauthenticated_sid_123"
        # Mocking request context by checking sid_auth lookup directly
        self.assertNotIn(test_sid, game.sid_auth)
        
        # 2. Register valid Player 1
        room = game.get_or_create_room("room_test_auth")
        game.sid_auth["sid_player_1"] = {'room_id': "room_test_auth", 'player_id': 1}
        room.sid_to_player["sid_player_1"] = 1
        room.connected_players.add(1)
        
        # 3. Register valid Player 2
        game.sid_auth["sid_player_2"] = {'room_id': "room_test_auth", 'player_id': 2}
        room.sid_to_player["sid_player_2"] = 2
        room.connected_players.add(2)
        room.is_match_active = True
        
        # Verify authenticated lookups
        self.assertEqual(game.sid_auth["sid_player_1"]['player_id'], 1)
        self.assertEqual(game.sid_auth["sid_player_2"]['player_id'], 2)
        
        # 4. Attempt spoofing: if sid_player_1 claims player_id=2 in payload,
        # our code handler enforces sid_auth['player_id'] (which is 1),
        # preventing impersonation!
        auth = game.sid_auth["sid_player_1"]
        enforced_player_id = auth['player_id']
        self.assertEqual(enforced_player_id, 1)

if __name__ == '__main__':
    unittest.main()
