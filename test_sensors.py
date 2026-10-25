import unittest
from char import Body
import compiler

class TestSensorFunctions(unittest.TestCase):
    def setUp(self):
        self.p1 = Body(name="Fighter1", x=200, y=300, direction=1)
        self.p2 = Body(name="Fighter2", x=600, y=300, direction=-1)

    def test_enemy_distance(self):
        # Initial distance: abs(200 - 600) = 400
        code = """
if get_enemy_distance() > 300:
    run(2)
else:
    attack()
"""
        compiler.compiler(code=code, current_player=self.p1, enemy_player=self.p2)
        # Should queue 'run' because distance is 400 > 300
        self.assertEqual(len(self.p1.action_queue), 1)
        self.assertEqual(self.p1.action_queue[0], ('run', 2))

    def test_is_enemy_attacking_false(self):
        # Enemy is not attacking (attack_state == 0)
        code = """
if is_enemy_attacking():
    block()
else:
    run(3)
"""
        compiler.compiler(code=code, current_player=self.p1, enemy_player=self.p2)
        self.assertEqual(len(self.p1.action_queue), 1)
        self.assertEqual(self.p1.action_queue[0], ('run', 3))

    def test_is_enemy_attacking_true(self):
        # Enemy starts attacking
        self.p2.sword.attack_state = 1
        code = """
if is_enemy_attacking():
    block()
else:
    attack()
"""
        compiler.compiler(code=code, current_player=self.p1, enemy_player=self.p2)
        self.assertEqual(len(self.p1.action_queue), 1)
        self.assertEqual(self.p1.action_queue[0], ('block',))

    def test_health_sensors(self):
        self.p1.heart = 2
        self.p2.heart = 4
        code = """
if get_my_health() <= 2:
    block()
if get_enemy_health() > 3:
    attack()
"""
        compiler.compiler(code=code, current_player=self.p1, enemy_player=self.p2)
        self.assertEqual(len(self.p1.action_queue), 2)
        self.assertEqual(self.p1.action_queue[0], ('block',))
        self.assertEqual(self.p1.action_queue[1], ('attack',))

    def test_none_enemy_safe_fallback(self):
        # Fallback when no enemy provided
        code = """
d = get_enemy_distance()
atk = is_enemy_attacking()
h = get_enemy_health()
if d == 999 and not atk and h == 0:
    move(1)
"""
        compiler.compiler(code=code, current_player=self.p1, enemy_player=None)
        self.assertEqual(len(self.p1.action_queue), 1)
        self.assertEqual(self.p1.action_queue[0], ('move', 1))

if __name__ == '__main__':
    unittest.main()

