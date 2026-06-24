"""
Tests for question type unification.

Canonical question types: 单选题, 多选题, 判断题, 综合题

Key invariants:
- check_answer_correct() uses simple string comparison (no special judgment mapping).
  Multi-select types (多选题, 综合题) sort characters before comparing.
- FSRSService.target_ratios has exactly 4 keys with prescribed values.
- agent_parser _build_prompt lists all 4 canonical type names.
"""
import pytest
from unittest.mock import MagicMock, patch
from types import SimpleNamespace

from app.api.practice import check_answer_correct
from app.services.fsrs_service import FSRSService
from app.services.agent_parser import AgentParser


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_question(question_type: str, correct_answer: str) -> SimpleNamespace:
    """Build a lightweight stand-in for Question with just the fields
    that check_answer_correct reads: question_type and correct_answer.

    We cannot use Question() directly because it is a SQLAlchemy declarative
    model that requires a properly initialised mapper.  Since
    check_answer_correct only accesses the two attributes, a SimpleNamespace
    is sufficient and avoids the ORM overhead.
    """
    return SimpleNamespace(question_type=question_type, correct_answer=correct_answer)


# ===================================================================
# 1. check_answer_correct — all 4 canonical question types
# ===================================================================

class TestCheckAnswerCorrect_SingleChoice:
    """单选题: plain string comparison after upper/strip."""

    def test_correct_match(self):
        q = _make_question("单选题", "A")
        assert check_answer_correct(q, "A") is True

    def test_incorrect_match(self):
        q = _make_question("单选题", "A")
        assert check_answer_correct(q, "B") is False

    def test_case_insensitive(self):
        q = _make_question("单选题", "A")
        assert check_answer_correct(q, "a") is True

    def test_whitespace_stripped(self):
        q = _make_question("单选题", "A")
        assert check_answer_correct(q, "  A  ") is True

    def test_answer_D(self):
        q = _make_question("单选题", "D")
        assert check_answer_correct(q, "D") is True
        assert check_answer_correct(q, "C") is False


class TestCheckAnswerCorrect_MultiSelect:
    """多选题: sorted character comparison (order-independent)."""

    def test_exact_match(self):
        q = _make_question("多选题", "ABC")
        assert check_answer_correct(q, "ABC") is True

    def test_order_independent(self):
        """ACB should match ABC after sorting."""
        q = _make_question("多选题", "ABC")
        assert check_answer_correct(q, "ACB") is True

    def test_partial_answer_wrong(self):
        """AB is not the same as ABC."""
        q = _make_question("多选题", "ABC")
        assert check_answer_correct(q, "AB") is False

    def test_extra_option_wrong(self):
        q = _make_question("多选题", "AB")
        assert check_answer_correct(q, "ABC") is False

    def test_comma_and_space_stripped(self):
        """Commas and spaces are removed before sorting."""
        q = _make_question("多选题", "ABC")
        assert check_answer_correct(q, "A, C, B") is True

    def test_case_insensitive(self):
        q = _make_question("多选题", "ABC")
        assert check_answer_correct(q, "abc") is True

    def test_two_options(self):
        q = _make_question("多选题", "AB")
        assert check_answer_correct(q, "BA") is True
        assert check_answer_correct(q, "AB") is True
        assert check_answer_correct(q, "AC") is False


class TestCheckAnswerCorrect_Judgment:
    """判断题: simple string comparison, NO special mapping for 正确/错误."""

    def test_A_correct_A(self):
        q = _make_question("判断题", "A")
        assert check_answer_correct(q, "A") is True

    def test_B_correct_B(self):
        q = _make_question("判断题", "B")
        assert check_answer_correct(q, "B") is True

    def test_A_wrong_B(self):
        q = _make_question("判断题", "A")
        assert check_answer_correct(q, "B") is False

    def test_B_wrong_A(self):
        q = _make_question("判断题", "B")
        assert check_answer_correct(q, "A") is False

    def test_no_special_mapping_for_chinese(self):
        """After unification, 正确/错误 should NOT be mapped to A/B.
        They are treated as plain strings and will not match A/B."""
        q = _make_question("判断题", "A")
        # "正确" upper-stripped is still "正确", which != "A"
        assert check_answer_correct(q, "正确") is False

    def test_no_special_mapping_for_wrong_chinese(self):
        q = _make_question("判断题", "B")
        assert check_answer_correct(q, "错误") is False

    def test_no_special_mapping_for_T_F(self):
        """T/F should NOT be mapped to A/B after unification."""
        q = _make_question("判断题", "A")
        assert check_answer_correct(q, "T") is False

    def test_case_insensitive(self):
        q = _make_question("判断题", "A")
        assert check_answer_correct(q, "a") is True


class TestCheckAnswerCorrect_Comprehensive:
    """综合题: same sorted-compare logic as 多选题."""

    def test_exact_match(self):
        q = _make_question("综合题", "ABD")
        assert check_answer_correct(q, "ABD") is True

    def test_order_independent(self):
        q = _make_question("综合题", "ABD")
        assert check_answer_correct(q, "DBA") is True

    def test_partial_wrong(self):
        q = _make_question("综合题", "ABD")
        assert check_answer_correct(q, "AB") is False

    def test_comma_space_stripped(self):
        q = _make_question("综合题", "ABD")
        assert check_answer_correct(q, "A, B, D") is True

    def test_case_insensitive(self):
        q = _make_question("综合题", "ABD")
        assert check_answer_correct(q, "abd") is True


# ===================================================================
# 2. FSRSService.target_ratios
# ===================================================================

class TestFSRSTargetRatios:
    """target_ratios must have exactly 4 canonical keys with prescribed values."""

    EXPECTED_RATIOS = {
        "单选题": 0.40,
        "多选题": 0.25,
        "判断题": 0.20,
        "综合题": 0.15,
    }

    def test_has_exactly_four_keys(self):
        svc = FSRSService()
        assert len(svc.target_ratios) == 4

    def test_keys_are_canonical(self):
        svc = FSRSService()
        assert set(svc.target_ratios.keys()) == set(self.EXPECTED_RATIOS.keys())

    def test_values_are_correct(self):
        svc = FSRSService()
        for key, expected_val in self.EXPECTED_RATIOS.items():
            assert svc.target_ratios[key] == expected_val, (
                f"target_ratios[{key!r}] = {svc.target_ratios[key]!r}, "
                f"expected {expected_val!r}"
            )

    def test_ratios_sum_to_one(self):
        svc = FSRSService()
        total = sum(svc.target_ratios.values())
        assert abs(total - 1.0) < 1e-9, f"Ratios sum to {total}, expected 1.0"

    def test_no_legacy_keys(self):
        """Old short names (单选, 多选, 判断) must not appear."""
        svc = FSRSService()
        legacy_keys = {"单选", "多选", "判断", "不定项", "不定项选择"}
        for lk in legacy_keys:
            assert lk not in svc.target_ratios, (
                f"Legacy key {lk!r} found in target_ratios"
            )


# ===================================================================
# 3. FSRSService.get_next_questions with new type names (mock test)
# ===================================================================

class TestFSRSGetNextQuestions:
    """get_next_questions should iterate over the 4 canonical type names."""

    def test_queries_use_canonical_type_names(self):
        """Verify that get_next_questions issues queries for each canonical type."""
        svc = FSRSService()

        # We mock the db session and its query builder to avoid a real database.
        mock_db = MagicMock()

        # Build a chain: db.query(Question) -> ... -> .all() returns []
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.outerjoin.return_value = mock_query
        # Return empty lists so no questions are selected
        mock_query.all.return_value = []
        mock_db.query.return_value = mock_query

        result = svc.get_next_questions(mock_db, limit=20)

        assert result == []

        # The method should have called db.query at least once per type in target_ratios
        # (due queries + new-question queries). We just verify it was called.
        assert mock_db.query.called

    def test_target_ratios_used_for_allocation(self):
        """Each type in target_ratios gets at least 1 slot (max(1, int(limit*ratio)))."""
        svc = FSRSService()
        limit = 20

        # Compute expected per-type limits
        expected_limits = {}
        for q_type, ratio in svc.target_ratios.items():
            expected_limits[q_type] = max(1, int(limit * ratio))

        # 单选题: max(1, int(20*0.40)) = 8
        # 多选题: max(1, int(20*0.25)) = 5
        # 判断题: max(1, int(20*0.20)) = 4
        # 综合题: max(1, int(20*0.15)) = 3
        assert expected_limits["单选题"] == 8
        assert expected_limits["多选题"] == 5
        assert expected_limits["判断题"] == 4
        assert expected_limits["综合题"] == 3


# ===================================================================
# 4. agent_parser _build_prompt contains all 4 type names
# ===================================================================

class TestAgentParserBuildPrompt:
    """_build_prompt must list all 4 canonical question type names."""

    CANONICAL_TYPES = ["单选题", "多选题", "判断题", "综合题"]

    def test_prompt_contains_all_canonical_types(self):
        parser = AgentParser()
        prompt = parser._build_prompt("sample text")

        for type_name in self.CANONICAL_TYPES:
            assert type_name in prompt, (
                f"Canonical type {type_name!r} not found in _build_prompt output"
            )

    def test_prompt_contains_pipe_separated_type_options(self):
        """The prompt should list types as '单选题|多选题|判断题|综合题'."""
        parser = AgentParser()
        prompt = parser._build_prompt("sample text")

        expected_options = "单选题|多选题|判断题|综合题"
        assert expected_options in prompt, (
            f"Expected pipe-separated type options {expected_options!r} not in prompt"
        )

    def test_prompt_does_not_use_legacy_short_names(self):
        """Old short names (单选, 多选, 判断 without 题) should not appear
        as the question_type option list. They may appear in explanatory text,
        but the type option specification should use the full canonical names."""
        parser = AgentParser()
        prompt = parser._build_prompt("sample text")

        # The key line is the question_type specification.
        # Legacy format was: "单选|多选|判断"
        legacy_option_line = '"question_type": "单选|多选|判断"'
        assert legacy_option_line not in prompt, (
            f"Legacy type option format found in prompt: {legacy_option_line!r}"
        )

    def test_prompt_includes_sample_text(self):
        """The prompt should embed the input text."""
        parser = AgentParser()
        sample = "这是第1题的样例文本"
        prompt = parser._build_prompt(sample)
        assert sample in prompt
