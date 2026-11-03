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
        # 1. crouch() and duck() queue action and set crouch_timer
        self.p1.crouch()
        self.assertEqual(len(self.p1.action_queue), 1)
        self.assertEqual(self.p1.action_queue[0], ('crouch',))
        
        self.p1.execute_next_action()
        self.assertEqual(self.p1.crouch_timer, 30)
        
        # Test duck synonym
        self.p2.duck()
        self.p2.execute_next_action()
        self.assertEqual(self.p2.crouch_timer, 30)

    def test_crouch_evades_sword_slash(self):
        # Position p2 within melee range
        self.p1.x = 200
        self.p1.target_x = 200
        self.p2.x = 280
        self.p2.target_x = 280
        self.p2.heart = 5
        
        # P2 crouches
        self.p2.crouch_timer = 20
        
        # P1 slashes in forward swing
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 60
        self.p1.sword.has_hit = False
        
        # Engine update
        self.engine.update()
        
        # Since P2 is crouched, P1's attack must miss! Heart remains 5
        self.assertEqual(self.p2.heart, 5)

    def test_dash_and_dodge(self):
        # Dash moves fast forward
        self.p1.dash(3)
        self.p1.execute_next_action()
        self.assertEqual(self.p1.speed_x, 10)
        self.assertEqual(self.p1.target_x, 200 + (10 * 3 * 1))
        
        # Dodge moves fast backward
        self.p2.dodge(2)
        self.p2.execute_next_action()
        self.assertEqual(self.p2.speed_x, 10)
        self.assertEqual(self.p2.target_x, 300 - (10 * 2 * -1))

    def test_heavy_attack_damage_and_shield_break(self):
        # P1 does heavy attack on unblocked P2
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
        # Heavy attack deals 2 hearts damage on unblocked opponent!
        self.assertEqual(self.p2.heart, 3)
        
        # Now P2 blocks, P1 does another heavy attack -> Breaks shield!
        self.p2.shield.block_timer = 25
        self.p1.sword.attack_state = 2
        self.p1.sword.sword_angle = 0
        self.p1.sword.target_angle = 75
        self.p1.sword.is_heavy = True
        self.p1.sword.has_hit = False
        
        self.engine.update()
        # Shield broken (block_timer reset to 0) and takes 1 damage
        self.assertEqual(self.p2.shield.block_timer, 0)
        self.assertEqual(self.p2.heart, 2)

    def test_throw_sword_projectile(self):
        self.p1.x = 100
        self.p1.target_x = 100
        self.p2.x = 300
        self.p2.target_x = 300
        self.p2.heart = 5
        
        self.p1.throw_sword()
        self.p1.execute_next_action()
        self.assertEqual(len(self.p1.pending_spells), 1)
        self.assertEqual(self.p1.pending_spells[0]['type'], 'throw_sword')
        
        # Engine receives pending spell and starts flight
        self.engine.update()
        self.assertEqual(len(self.engine.spells), 1)
        
        # Flying across canvas towards P2
        for _ in range(20):
            self.engine.update()
            
        # Thrown sword hit P2 and dealt damage
        self.assertEqual(self.p2.heart, 4)

    def test_trigonometric_spells_and_defenses(self):
        # 1. sin_wave
        self.p1.sin_wave()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.pending_spells[0]['type'], 'sin_wave')
        self.p1.pending_spells.clear()
        
        # 2. cos_wave
        self.p1.cos_wave()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.pending_spells[0]['type'], 'cos_wave')
        self.p1.pending_spells.clear()

        # 3. tan_spike
        self.p1.tan_spike()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.pending_spells[0]['type'], 'tan_spike')
        self.p1.pending_spells.clear()

        # 4. sec_barrier
        self.p1.sec_barrier()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.barrier_timer, 50)

        # 5. cosec_dome
        self.p1.cosec_dome()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.dome_timer, 50)

        # 6. cot_wall
        self.p1.cot_wall()
        self.p1.execute_next_action()
        self.assertEqual(self.p1.pending_spells[0]['type'], 'cot_wall')
        self.p1.pending_spells.clear()

    def test_compiler_code_execution(self):
        # Test that user can write all new commands in editor code
        user_code = '''
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
        # Verify 12 actions successfully parsed and queued
        self.assertEqual(len(self.p1.action_queue), 12)

if __name__ == '__main__':
    unittest.main()
