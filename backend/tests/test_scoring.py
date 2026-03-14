"""
Critical-path tests: scoring engine correctness and idempotency.

Tests the pure scoring functions directly (no HTTP, no DB).
"""
from app.api.predictions import (
    score_match_result,
    score_correct_score,
    score_btts,
    score_over_under,
    score_ht_ft,
    score_first_goalscorer,
    score_anytime_goalscorer,
    score_player_assist,
    score_player_carded,
    score_man_of_the_match,
    rank_title_for,
)


# ---------------------------------------------------------------------------
# Match result (3 pts)
# ---------------------------------------------------------------------------

def test_match_result_correct_home():
    assert score_match_result("home", 2, 1) == 3

def test_match_result_correct_draw():
    assert score_match_result("draw", 1, 1) == 3

def test_match_result_correct_away():
    assert score_match_result("away", 0, 3) == 3

def test_match_result_wrong():
    assert score_match_result("home", 0, 1) == 0


# ---------------------------------------------------------------------------
# Correct score (10 pts)
# ---------------------------------------------------------------------------

def test_correct_score_exact():
    assert score_correct_score({"home": 2, "away": 1}, 2, 1) == 10

def test_correct_score_wrong():
    assert score_correct_score({"home": 2, "away": 1}, 3, 1) == 0


# ---------------------------------------------------------------------------
# BTTS (5 pts)
# ---------------------------------------------------------------------------

def test_btts_correct_yes():
    assert score_btts(True, 1, 2) == 5

def test_btts_correct_no():
    assert score_btts(False, 3, 0) == 5

def test_btts_wrong():
    assert score_btts(True, 2, 0) == 0


# ---------------------------------------------------------------------------
# Over/Under (4 pts)
# ---------------------------------------------------------------------------

def test_over_correct():
    assert score_over_under({"line": 2.5, "pick": "over"}, 2, 1) == 4

def test_under_correct():
    assert score_over_under({"line": 2.5, "pick": "under"}, 1, 0) == 4

def test_over_wrong():
    assert score_over_under({"line": 2.5, "pick": "over"}, 1, 0) == 0


# ---------------------------------------------------------------------------
# HT/FT (6 pts both, 3 pts one)
# ---------------------------------------------------------------------------

def test_htft_both_correct():
    assert score_ht_ft({"ht": "home", "ft": "home"}, 1, 0, 2, 0) == 6

def test_htft_one_correct():
    # HT: predicted "home", actual draw (0-0) = wrong. FT: predicted "away", actual away (0-1) = correct.
    assert score_ht_ft({"ht": "home", "ft": "away"}, 0, 0, 0, 1) == 3

def test_htft_none_correct():
    assert score_ht_ft({"ht": "home", "ft": "home"}, 0, 1, 0, 2) == 0


# ---------------------------------------------------------------------------
# Player predictions
# ---------------------------------------------------------------------------

def test_first_goalscorer_correct():
    assert score_first_goalscorer("Messi", "Messi") == 10

def test_first_goalscorer_case_insensitive():
    assert score_first_goalscorer("messi", "Messi") == 10

def test_first_goalscorer_wrong():
    assert score_first_goalscorer("Ronaldo", "Messi") == 0

def test_anytime_goalscorer_in_list():
    assert score_anytime_goalscorer("Messi", ["Messi", "Alvarez"]) == 5

def test_anytime_goalscorer_not_in_list():
    assert score_anytime_goalscorer("Ronaldo", ["Messi", "Alvarez"]) == 0

def test_player_assist_correct():
    assert score_player_assist("Di Maria", ["Di Maria"]) == 5

def test_player_carded_correct():
    assert score_player_carded("Otamendi", ["Otamendi", "Casemiro"]) == 4

def test_motm_correct():
    assert score_man_of_the_match("Messi", "Messi") == 8

def test_motm_wrong():
    assert score_man_of_the_match("Ronaldo", "Messi") == 0


# ---------------------------------------------------------------------------
# Rank titles
# ---------------------------------------------------------------------------

def test_rank_scout():
    assert rank_title_for(0) == "Scout"

def test_rank_analyst():
    assert rank_title_for(100) == "Analyst"

def test_rank_tactician():
    assert rank_title_for(300) == "Tactician"

def test_rank_commander():
    assert rank_title_for(600) == "Commander"

def test_rank_legend():
    assert rank_title_for(1000) == "Legend"
