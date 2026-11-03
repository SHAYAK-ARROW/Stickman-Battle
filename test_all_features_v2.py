import unittest
from char import Body
from engine import GameEngine
import compiler

class TestAllFeaturesV2(unittest.TestCase):
    def setUp(self):
        self.p1 = Body(name="Fighter1", x=200, y=470, direction=1)
        self.p2 = Body(name="Fighter2", x=300, y=470, direction=-1)
        self.engine = GameEngine()
        self.engine.add_player(self.p1, self.p2)

    def test_crouch_and_duck(self):
        self.p1.crouch()
        self.assertEqual(len(self.p1.action_queue), 1)
        self.assertEqual(self.p1.action_queue[0], ('crouch',))
        
        self.p1.execute_next_action()
        self.assertEqual(self.p1.crouch_timer, 30)
        
        self.p2.duck()
        self.p2.execute_next_action()
        self.assertEqual(self.p2.crouch_timer, 30)

    def test_crouch_evades_sword_slash(self):
        self.p1.x = 200
        self.p1.target_x = 200
        self.p2.x = 280
        self.p2.target_x = 280
        self.p2.heart = 5
        
        self.p2.crouch_timer = 20
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 60
        self.p1.sword.has_hit = False
        
        self.engine.update()
        self.assertEqual(self.p2.heart, 5)

    def test_dash_and_dodge(self):
        self.p1.dash(3)
        self.p1.execute_next_action()
        self.assertEqual(self.p1.speed_x, 10)
        self.assertEqual(self.p1.target_x, 200 + (10 * 3 * 1))
        
        self.p2.dodge(2)
        self.p2.execute_next_action()
        self.assertEqual(self.p2.speed_x, 10)
        self.assertEqual(self.p2.target_x, 300 - (10 * 2 * -1))

    def test_heavy_attack_damage_and_shield_break(self):
        self.p1.x = 200
        self.p1.target_x = 200
        self.p2.x = 280
        self.p2.target_x = 280
        self.p2.heart = 5
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 75
        self.p1.sword.is_heavy = True
        self.p1.sword.has_hit = False
        
        self.engine.update()
        self.assertEqual(self.p2.heart, 3)
        
        self.p2.shield.block_timer = 25
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 75
        self.p1.sword.is_heavy = True
        self.p1.sword.has_hit = False
        
        self.engine.update()
        self.assertEqual(self.p2.shield.block_timer, 0)
        self.assertEqual(self.p2.heart, 2)

    def test_weapon_setters_and_swing(self):
        # set_sword customize
        self.p1.set_sword(65, 15)
        self.assertEqual(self.p1.sword.sword_length, 65)
        self.assertEqual(self.p1.sword.sword_angle, 15)
        
        # set_shield customize
        self.p1.set_shield(50, 30)
        self.assertEqual(self.p1.shield.shield_lenght, 50)
        self.assertEqual(self.p1.shield.shield_angel, 30)
        
        # swing() triggers attack
        self.p1.swing()
        self.assertEqual(self.p1.action_queue[-1], ('attack',))

    def test_throw_sword_disarm_range_and_return(self):
        self.p1.x = 100
        self.p1.target_x = 100
        self.p2.x = 500  # far away beyond 280px range
        self.p2.target_x = 500
        self.p2.heart = 5
        
        self.assertTrue(self.p1.has_sword)
        self.p1.throw_sword()
        self.p1.execute_next_action()
        
        # P1 is disarmed!
        self.assertFalse(self.p1.has_sword)
        
        # P1 cannot attack while disarmed
        self.p1.attack()
        self.assertNotIn(('attack',), self.p1.action_queue)
        
        # Engine receives sword and starts flight
        self.engine.update()
        self.assertEqual(len(self.engine.spells), 1)
        
        # Sword flies outward up to 280px max range, then automatically reverses
        for _ in range(25):
            self.engine.update()
            
        # P2 was at 500 (beyond 100+280=380), so sword did not fly to end of canvas
        # It reversed and returned to P1's hand!
        for _ in range(25):
            self.engine.update()
            
        # Sword caught back in hand!
        self.assertTrue(self.p1.has_sword)
        self.assertEqual(len(self.engine.spells), 0)

    def test_trigonometric_spells_and_defenses(self):
        self.p1.sin_wave()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.pending_spells[0]['type'], 'sin_wave')
        self.p1.pending_spells.clear()
        
        self.p1.cos_wave()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.pending_spells[0]['type'], 'cos_wave')
        self.p1.pending_spells.clear()

        self.p1.tan_spike()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.pending_spells[0]['type'], 'tan_spike')
        self.p1.pending_spells.clear()

        self.p1.sec_barrier()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.barrier_timer, 50)

        self.p1.cosec_dome()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.dome_timer, 50)

        self.p1.cot_wall()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.pending_spells[0]['type'], 'cot_wall')
        self.p1.pending_spells.clear()

    def test_compiler_code_execution(self):
        user_code = '''
set_sword(60, 5)
set_shield(45, 30)
swing()
crouch()
dash(2)
heavy_attack()
throw_sword()
sin_wave()
cos_wave()
tan_spike()
sec_barrier()
cosec_dome()
cot_wall()
dodge(1)
duck()
'''
        compiler.compiler(user_code, self.p1, self.p2)
        self.assertGreater(len(self.p1.action_queue), 10)

if __name__ == '__main__':
    unittest.main()
