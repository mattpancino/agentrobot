# Copyright 2026 Google LLC. All Rights Reserved.
"""Unit tests for SovereignFleetReasoningEngine wrapper."""

import pytest
from unittest.mock import MagicMock, patch
from src.adk.vertex_reasoning_engine import SovereignFleetReasoningEngine


@pytest.fixture
def reasoning_engine():
    engine = SovereignFleetReasoningEngine(project_id="test-project", location="australia-southeast1")
    engine.set_up()
    return engine


def test_reasoning_engine_query_roundtrip(reasoning_engine):
    # Mock model generate_content dynamically to echo back the tokenized string
    def mock_generate(prompt_str):
        mock_resp = MagicMock()
        mock_resp.text = f"Summary report: {prompt_str}"
        return mock_resp

    reasoning_engine.model.generate_content = MagicMock(side_effect=mock_generate)

    query_result = reasoning_engine.query(
        prompt="Tell me about Sarah Jenkins and car ABC-123",
        session_id="test-vertex-session",
        enable_grounding=True,
    )

    # 1. Verify model only received tokenized prompt & sanitized context
    sent_prompt = query_result["sanitized_prompt_sent_to_model"]
    assert "Sarah Jenkins" not in sent_prompt
    assert "ABC-123" not in sent_prompt
    assert "PII_PERSON" in sent_prompt
    assert "PII_AU_LICENSE_PLATE" in sent_prompt

    # 2. Verify returned answer is de-tokenized cleanly for the authorized end user
    final_answer = query_result["answer"]
    assert "Sarah Jenkins" in final_answer
    assert "ABC-123" in final_answer
    assert "PII_PERSON" not in final_answer
    assert "PII_AU_LICENSE_PLATE" not in final_answer

    assert query_result["zero_egress_verified"] is True

    assert query_result["zero_egress_verified"] is True
