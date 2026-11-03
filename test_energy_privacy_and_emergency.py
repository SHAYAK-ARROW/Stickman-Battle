import unittest
import time
from char import Body, MAX_ENERGY
from engine import GameEngine
import compiler
from game import GameRoom, _get_public_speech, handle_emergency_action, sid_auth, rooms


class TestEnergyPrivacyAndEmergency(unittest.TestCase):
    def setUp(self):
        self.p1 = Body(name="Fighter1", x=200, y=470, direction=1)
        self.p2 = Body(name="Fighter2", x=600, y=470, direction=-1)
        self.engine = GameEngine()
        self.engine.add_player(self.p1, self.p2)

    def test_initial_energy_and_deduction(self):
        self.assertEqual(self.p1.energy, 100)
        self.assertEqual(self.p1.max_energy, 100)

        # Attack costs 8 energy
        self.p1.attack()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.energy, 92)

        # Heavy attack costs 30 energy
        self.p1.heavy_attack()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.energy, 62)

    def test_insufficient_energy_cancels_heavy_action(self):
        self.p1.energy = 10  # Not enough for heavy attack (needs 30)
        self.p1.heavy_attack()
        self.p1.execute_next_action()
        
        # Heavy attack should not have initiated (attack_state should stay 0)
        self.assertEqual(self.p1.sword.attack_state, 0)
        self.assertEqual(self.p1.energy, 10)  # Energy not deducted on fizzled move

    def test_energy_regeneration_in_engine(self):
        self.p1.energy = 50.0
        # 4 ticks of update should add 4 * 0.25 = 1.0 energy
        for _ in range(4):
            self.engine.update()
        self.assertAlmostEqual(self.p1.energy, 51.0, places=2)

    def test_energy_sensors_in_compiler(self):
        self.p1.energy = 85.0
        self.p2.energy = 40.0
        code = """
if get_my_energy() > 50:
    dash(2)
if get_enemy_energy() < 50:
    attack()
"""
        compiler.compiler(code, self.p1, self.p2)
        # Both dash and attack should be queued
        action_types = [a[0] for a in self.p1.action_queue]
        self.assertIn('dash', action_types)
        self.assertIn('attack', action_types)

    def test_error_privacy_filter(self):
        # Normal speech passes through
        self.p1.speech_text = "Good duel!"
        self.p1.speech_timer = 50
        self.assertEqual(_get_public_speech(self.p1), "Good duel!")

        # Syntax Error is hidden from public arena canvas
        self.p1.speech_text = "Syntax Error (line 2)"
        self.p1.speech_timer = 50
        self.assertEqual(_get_public_speech(self.p1), "")

        # Security Error is hidden from public arena canvas
        self.p1.speech_text = "Security: Forbidden import"
        self.p1.speech_timer = 50
        self.assertEqual(_get_public_speech(self.p1), "")

        # Generic Execution Error is hidden from public arena canvas
        self.p1.speech_text = "Error: division by zero"
        self.p1.speech_timer = 50
        self.assertEqual(_get_public_speech(self.p1), "")

    def test_room_reset_clears_cooldowns_and_resets_energy(self):
        room = GameRoom("test_energy_room")
        room.player1.energy = 20
        room.player2.energy = 30
        room.player1_emergency_cooldowns = {'shield': time.time()}
        
        room.reset_match()
        self.assertEqual(room.player1.energy, 100)
        self.assertEqual(room.player2.energy, 100)
        self.assertEqual(len(room.player1_emergency_cooldowns), 0)
        self.assertEqual(len(room.player2_emergency_cooldowns), 0)


if __name__ == '__main__':
    unittest.main()

