import unittest
import game
import bot
import char

class TestBotMode(unittest.TestCase):
    def setUp(self):
        game.rooms.clear()
        game.sid_auth.clear()
        self.client = game.app.test_client()

    def tearDown(self):
        game.rooms.clear()
        game.sid_auth.clear()

    def test_bot_initialization(self):
        easy_bot = bot.BattleBot('easy')
        hard_bot = bot.BattleBot('hard')
        self.assertEqual(easy_bot.difficulty, 'easy')
        self.assertEqual(hard_bot.difficulty, 'hard')
        self.assertAlmostEqual(easy_bot.mistake_rate, 0.45)
        self.assertAlmostEqual(hard_bot.mistake_rate, 0.20)

    def test_bot_endpoints_redirect_to_token_room(self):
        response = self.client.get('/bot/easy')
        self.assertEqual(response.status_code, 302)
        location = response.headers['Location']
        self.assertIn('token=', location)

        # Room should be created as a bot room
        self.assertEqual(len(game.rooms), 1)
        room = list(game.rooms.values())[0]
        self.assertTrue(room.is_bot_room)
        self.assertEqual(room.bot_difficulty, 'easy')
        self.assertIn(2, room.connected_players)

    def test_bot_hard_endpoint(self):
        response = self.client.get('/bot/hard')
        self.assertEqual(response.status_code, 302)
        room = list(game.rooms.values())[0]
        self.assertTrue(room.is_bot_room)
        self.assertEqual(room.bot_difficulty, 'hard')

    def test_bot_room_renders_proper_context(self):
        response = self.client.get('/bot/easy')
        redirect_url = response.headers['Location']
        res = self.client.get(redirect_url)
        self.assertEqual(res.status_code, 200)
        body = res.get_data(as_text=True)
        self.assertIn('IS_BOT_ROOM = true', body)
        self.assertIn('BOT_DIFFICULTY = "easy"', body)

    def test_bot_tick_combat_decision(self):
        room = game.create_private_room()
        room.player1.y = 470
        room.player2.y = 470
        room.is_bot_room = True
        room.bot_difficulty = 'easy'
        room.bot = bot.BattleBot('easy')
        room.is_match_active = True

        # Bot is at 600, player at 200 (distance = 400 > 260 => Long range)
        room.bot.last_decision_time = 0 # Force decision
        room.bot.tick(room)
        # Should have queued an action
        self.assertTrue(len(room.player2.action_queue) > 0)
        action = room.player2.action_queue[0][0]
        self.assertIn(action, ['move', 'dash', 'say'])

    def test_bot_counter_attack_close_range(self):
        room = game.create_private_room()
        room.player1.y = 470
        room.player2.y = 470
        room.is_bot_room = True
        room.bot_difficulty = 'hard'
        room.bot = bot.BattleBot('hard')
        room.bot.mistake_rate = 0.0 # Force tactical success
        room.is_match_active = True

        # Close distance
        room.player1.x = 550
        room.player2.x = 600
        room.player1.shield.block_timer = 30 # Enemy is blocking

        room.bot.last_decision_time = 0
        room.bot.tick(room)
        # Hard bot should heavy_attack to break shield
        self.assertTrue(len(room.player2.action_queue) > 0)
        action = room.player2.action_queue[0][0]
        self.assertEqual(action, 'heavy_attack')

if __name__ == '__main__':
    unittest.main()
