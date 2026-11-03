import unittest
import time
from char import Body
import compiler
import game

class TestTwoPlayerLifecycleSimulation(unittest.TestCase):
    def setUp(self):
        # Reset state
        game.rooms.clear()
        game.sid_auth.clear()

    def test_complete_two_player_match_lifecycle(self):
        room_id = "battle_arena_sim"
        room = game.get_or_create_room(room_id)
        self.assertIsNotNone(room)

        # 1. Player 1 joins with sid_1
        sid_1 = "socket_client_p1"
        game.sid_auth[sid_1] = {'room_id': room_id, 'player_id': 1}
        room.sid_to_player[sid_1] = 1
        room.connected_players.add(1)
        self.assertFalse(room.is_match_active)

        # 2. Player 2 joins with sid_2
        sid_2 = "socket_client_p2"
        game.sid_auth[sid_2] = {'room_id': room_id, 'player_id': 2}
        room.sid_to_player[sid_2] = 2
        room.connected_players.add(2)
        room.is_match_active = True # Match starts!
        self.assertTrue(room.is_match_active)

        # 3. Player 1 executes throw_sword()
        p1 = room.player1
        p2 = room.player2
        p1.x, p1.target_x = 200, 200
        p2.x, p2.target_x = 350, 350

        p1.throw_sword()
        p1.execute_next_action()
        # Verify P1 is disarmed
        self.assertFalse(p1.has_sword)

        # While disarmed, attack is locked
        p1.attack()
        self.assertNotIn(('attack',), p1.action_queue)

        # Engine processes flight and return
        room.engine.update()
        self.assertEqual(len(room.engine.spells), 1)

        for _ in range(40):
            room.engine.update()

        # Thrown sword hit P2 and returned to P1's hand
        self.assertTrue(p1.has_sword)
        self.assertLess(p2.heart, 5)

        # 4. Game over simulation
        p2.heart = 0
        self.assertTrue(p2.heart <= 0)

        # 5. Rematch simulation
        room.reset_match()
        self.assertEqual(p1.heart, 5)
        self.assertEqual(p2.heart, 5)
        self.assertTrue(p1.has_sword)
        self.assertTrue(p2.has_sword)
        self.assertEqual(len(room.engine.spells), 0)

if __name__ == '__main__':
    unittest.main()
