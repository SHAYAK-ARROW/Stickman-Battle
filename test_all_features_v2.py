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

    def test_swing_as_distinct_swift_attack(self):
        # swing() queues ('swing',) and has faster lifecycle and animation
        self.p1.swing()
        self.assertEqual(self.p1.action_queue[0], ('swing',))
        
        self.p1.execute_next_action()
        self.assertTrue(self.p1.sword.is_swing)
        self.assertEqual(self.p1.sword.attack_state, 1)
        self.assertEqual(self.p1.sword.target_angle, -15)
        
        # Test collision damage for swing
        self.p1.x = 200
        self.p2.x = 270
        self.p2.heart = 5
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 45
        self.p1.sword.has_hit = False
        
        self.engine.update()
        self.assertEqual(self.p2.heart, 4)

    def test_dynamic_sword_length_reach(self):
        # Default sword length is 50. Reach is 50 + 55 = 105px
        # Enemy at dx = 120 is out of reach for a 50px sword
        self.p1.x = 200
        self.p2.x = 320 # dx = 120px
        self.p2.heart = 5
        self.p1.sword.set_sword(50, 0)
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 60
        self.p1.sword.has_hit = False
        
        self.engine.update()
        self.assertEqual(self.p2.heart, 5) # Missed!
        
        # Now forge a longer claymore (75px)! Reach becomes 75 + 55 = 130px
        self.p1.set_sword(75, 0)
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 60
        self.p1.sword.has_hit = False
        
        self.engine.update()
        self.assertEqual(self.p2.heart, 4) # Hit! Longer sword reached!

    def test_dynamic_shield_length_blocking(self):
        self.p1.x = 200
        self.p2.x = 280
        self.p2.heart = 5
        self.p2.shield.block_timer = 20
        
        # Standard shield (40px) blocks normal attack
        self.p2.set_shield(40, 45)
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 60
        self.p1.sword.has_hit = False
        
        self.engine.update()
        self.assertEqual(self.p2.heart, 5) # Blocked!
        
        # Too tiny shield (<25px) fails to block full strike
        self.p2.set_shield(20, 45)
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 60
        self.p1.sword.has_hit = False
        
        self.engine.update()
        self.assertEqual(self.p2.heart, 4) # Took damage!

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
            
        # Returning flight
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

    def test_tan_spike_targets_opponent_and_remains_active_for_graph(self):
        self.p1.x = self.p1.target_x = 200
        self.p2.x = self.p2.target_x = 600
        self.p1.tan_spike(45)
        self.p1.execute_next_action()

        self.engine.update()
        self.assertEqual(self.engine.spells[0]['target_x'], 600)
        for _ in range(9):
            self.engine.update()
        self.assertLess(self.p2.heart, 10)

        for _ in range(15):
            self.engine.update()
        self.assertTrue(any(spell['type'] == 'tan_spike' for spell in self.engine.spells))

    def test_compiler_code_execution(self):
        user_code = '''
set_sword(65, 5)
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
