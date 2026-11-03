import unittest

import game


class TestPrivateRoomTokens(unittest.TestCase):
    def setUp(self):
        game.rooms.clear()
        game.sid_auth.clear()
        self.client = game.app.test_client()

    def tearDown(self):
        game.rooms.clear()
        game.sid_auth.clear()

    def test_new_room_issues_private_player_one_token(self):
        response = self.client.get('/player1')
        self.assertEqual(response.status_code, 302)
        location = response.headers['Location']
        self.assertIn('token=', location)
        self.assertNotIn('player=', location)
        self.assertEqual(self.client.get(location).status_code, 200)

    def test_existing_room_rejects_role_spoof_without_token(self):
        room = game.get_or_create_room('private2')
        owner_url = f"/room/private2?token={room.player_tokens[1]}"
        self.assertEqual(self.client.get(owner_url).status_code, 200)
        self.assertEqual(self.client.get('/room/private2?player=2').status_code, 403)
        self.assertEqual(self.client.get('/room/private2?token=wrong').status_code, 403)

    def test_tokens_are_distinct_and_roles_are_server_derived(self):
        room = game.get_or_create_room('private3')
        self.assertNotEqual(room.player_tokens[1], room.player_tokens[2])
        self.assertEqual(game.get_player_for_token(room, room.player_tokens[1]), 1)
        self.assertEqual(game.get_player_for_token(room, room.player_tokens[2]), 2)
        self.assertIsNone(game.get_player_for_token(room, 'player=2'))

    def test_player_two_invite_is_present_only_as_tokenized_link(self):
        room = game.get_or_create_room('private4')
        response = self.client.get(f"/room/private4?token={room.player_tokens[1]}")
        self.assertEqual(response.status_code, 200)
        body = response.get_data(as_text=True)
        self.assertIn(room.player_tokens[2], body)
        self.assertNotIn('?player=2', body)

    def test_unknown_room_cannot_be_claimed_by_room_id(self):
        self.assertEqual(self.client.get('/room/not_created').status_code, 403)


if __name__ == '__main__':
    unittest.main()
