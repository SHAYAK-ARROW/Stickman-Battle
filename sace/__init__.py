"""
SACE (Stickman Adaptive Combat Engine) Package
Master Bot AI with 5-Gram Pattern Recognition, Bayesian Reinforcement, and LocalStorage Persistence.
"""

from .sace_engine import MasterBotBrain, load_localstorage_grant, BotGrant
from .adapter import SaceBattleBot

__all__ = ["MasterBotBrain", "load_localstorage_grant", "BotGrant", "SaceBattleBot"]
