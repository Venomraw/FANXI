from app.models import MatchPrediction
from typing import Dict

def calculate_tactical_score(prediction: MatchPrediction, real_stats: Dict) -> int:
    """
    The 'Tactical Haki': Compares user sliders to real-world match data.
    Example: If user set 'Pressing' to 80 and the team actually pressed at 85, high points!
    """
    score = 0
    
    # 1. Formation Match (e.g., +20 points)
    if prediction.formation == real_stats.get("actual_formation"):
        score += 20
        
    # 2. Pressing Intensity (Proximity logic)
    # We calculate the difference between predicted and actual intensity
    diff = abs(prediction.pressing_intensity - real_stats.get("actual_pressing", 50))
    if diff <= 10:
        score += 30  # Great tactical read!
    elif diff <= 25:
        score += 15  # Decent tactical read.
        
    return score