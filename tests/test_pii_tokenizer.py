# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Unit tests for Sprint 1: Sovereign PII Tokenizer & Resilient Vault Manager.
"""

import time
import pytest
from src.adk.pii_tokenizer import (
    SovereignPIITokenizer,
    validate_luhn,
    validate_au_tfn,
    validate_au_medicare,
)


@pytest.fixture
def tokenizer():
    return SovereignPIITokenizer(default_salt="7A")


def test_standard_entity_detection(tokenizer):
    prompt = "Contact John Smith at john.smith@enterprise.com or call +61 412 345 678. Server IP: 192.168.1.50."
    tokenized, vault, telemetry = tokenizer.tokenize(prompt, session_id="test-session")

    assert "john.smith@enterprise.com" not in tokenized
    assert "John Smith" not in tokenized
    assert "+61 412 345 678" not in tokenized
    assert "192.168.1.50" not in tokenized

    assert "[[PII_PERSON_" in tokenized
    assert "[[PII_EMAIL_ADDRESS_" in tokenized
    assert "[[PII_PHONE_NUMBER_" in tokenized
    assert "[[PII_IP_ADDRESS_" in tokenized

    assert telemetry.entitiesIntercepted >= 4
    assert telemetry.zeroEgressVerified is True


def test_australian_sovereignty_pack_detection(tokenizer):
    prompt = (
        "Customer Jane Doe provided AU TFN 123 456 782, Medicare card 2123 45670 1, "
        "and requested a transfer from account 123-456 98765432."
    )
    tokenized, vault, telemetry = tokenizer.tokenize(prompt, session_id="au-session")

    assert "Jane Doe" not in tokenized
    assert "123 456 782" not in tokenized
    assert "2123 45670 1" not in tokenized
    assert "123-456 98765432" not in tokenized

    assert "[[PII_PERSON_" in tokenized
    assert "[[PII_AU_TFN_" in tokenized
    assert "[[PII_AU_MEDICARE_" in tokenized
    assert "[[PII_AU_BSB_ACCOUNT_" in tokenized


def test_deterministic_multi_turn_stability(tokenizer):
    session_id = "session-det-1"
    vault = {}

    turn1 = "John Smith wants to transfer $1000."
    tok1, vault, tel1 = tokenizer.tokenize(turn1, session_id=session_id, vault=vault)

    turn2 = "Also check the balance for John Smith."
    tok2, vault, tel2 = tokenizer.tokenize(turn2, session_id=session_id, vault=vault)

    # Extract token for John Smith
    john_token = None
    for k, v in vault.items():
        if v.get("raw") == "John Smith":
            john_token = f"[[{k}]]"
            break

    assert john_token is not None
    assert john_token in tok1
    assert john_token in tok2
    # Ensure only 1 vault entry was created for John Smith
    assert sum(1 for v in vault.values() if v.get("raw") == "John Smith") == 1


def test_session_salt_isolation():
    tok_a = SovereignPIITokenizer(default_salt="auto")
    tok_b = SovereignPIITokenizer(default_salt="auto")

    prompt = "Transfer funds to John Smith."
    res_a, vault_a, _ = tok_a.tokenize(prompt, session_id="session-user-AAA")
    res_b, vault_b, _ = tok_b.tokenize(prompt, session_id="session-user-BBB")

    # Tokens across distinct sessions must have different salts
    token_key_a = list(vault_a.keys())[0]
    token_key_b = list(vault_b.keys())[0]

    assert token_key_a != token_key_b


def test_fuzzy_mutation_healing(tokenizer):
    session_id = "fuzzy-session"
    prompt = "Please send statement to John Smith."
    _, vault, _ = tokenizer.tokenize(prompt, session_id=session_id)

    token_key = list(vault.keys())[0]  # e.g., PII_PERSON_1_7A

    # Test exact bracket
    assert tokenizer.detokenize(f"Hello [[{token_key}]]!", vault) == "Hello John Smith!"

    # Test single curly braces
    assert tokenizer.detokenize(f"Hello {{{token_key}}}!", vault) == "Hello John Smith!"

    # Test double curly braces
    assert tokenizer.detokenize(f"Hello {{{{{token_key}}}}}!", vault) == "Hello John Smith!"

    # Test single square bracket
    assert tokenizer.detokenize(f"Hello [{token_key}]!", vault) == "Hello John Smith!"

    # Test case variation
    assert tokenizer.detokenize(f"Hello [[{token_key.lower()}]]!", vault) == "Hello John Smith!"

    # Test possessive bracket inside
    assert tokenizer.detokenize(f"This is [[{token_key}'s]] account.", vault) == "This is John Smith's account."

    # Test possessive bracket outside
    assert tokenizer.detokenize(f"This is [[{token_key}]]'s account.", vault) == "This is John Smith's account."

    # Test whitespace inside brackets
    assert tokenizer.detokenize(f"Hello [[  {token_key}  ]]!", vault) == "Hello John Smith!"

    # Test bare token with word boundary
    assert tokenizer.detokenize(f"Hello {token_key}!", vault) == "Hello John Smith!"


def test_tokenization_latency_sla(tokenizer):
    prompt = "Transfer $2500 from John Smith's account 123-456 to Jane Doe at jane@example.com."
    
    # Warm up
    tokenizer.tokenize(prompt, session_id="bench-session")

    start = time.perf_counter()
    for _ in range(20):
        _, _, tel = tokenizer.tokenize(prompt, session_id="bench-session")
    elapsed_avg_ms = ((time.perf_counter() - start) / 20) * 1000.0

    assert elapsed_avg_ms < 25.0  # Must satisfy NFR-1 < 25ms SLA


def test_validators():
    # Luhn
    assert validate_luhn("4532015112830366") is True
    assert validate_luhn("4532015112830367") is False

    # AU TFN
    assert validate_au_tfn("123456782") is True
    assert validate_au_tfn("111111111") is False

    # AU Medicare (checksum for 21234567 is (2*1+1*3+2*7+3*9+4*1+5*3+6*7+7*9)%10 = 170%10 = 0)
    assert validate_au_medicare("21234567011") is True
    assert validate_au_medicare("11234567011") is False  # Must start with 2-6


def test_conversational_and_lowercase_name_detection(tokenizer):
    # Test case from user: lowercase friend name
    prompt = "my best friend is julia roberts"
    tokenized, vault, telemetry = tokenizer.tokenize(prompt, session_id="friend-session")

    assert "julia roberts" not in tokenized
    assert "[[PII_PERSON_" in tokenized
    assert telemetry.entitiesIntercepted == 1
    assert tokenizer.detokenize(tokenized, vault) == prompt

    # Test other conversational forms
    prompt2 = "my manager mark zuckerberg approved the transfer to jane doe"
    tok2, vault2, tel2 = tokenizer.tokenize(prompt2, session_id="mgmt-session")
    assert "mark zuckerberg" not in tok2
    assert "jane doe" not in tok2
    assert tel2.entitiesIntercepted >= 2
    assert tokenizer.detokenize(tok2, vault2) == prompt2


def test_custom_pii_rules(tokenizer):
    tokenizer.add_custom_rule({
        "name": "Project Codename",
        "pattern": r"\bProject\s+[A-Z][a-z]+\b",
        "entity_type": "PROJECT_CODENAME",
        "confidence": 0.95,
        "description": "Internal enterprise project names"
    })
    tokenizer.add_custom_rule({
        "name": "Employee Badge",
        "pattern": r"\bEMP-\d{5}\b",
        "entity_type": "EMPLOYEE_ID",
        "confidence": 0.99,
        "description": "Internal employee badge numbers"
    })

    prompt = "User EMP-54321 is working on Project Apollo and Project Titan."
    tokenized, vault, telemetry = tokenizer.tokenize(prompt, session_id="custom-rules-session")

    assert "EMP-54321" not in tokenized
    assert "Project Apollo" not in tokenized
    assert "Project Titan" not in tokenized
    assert "[[PII_EMPLOYEE_ID_" in tokenized
    assert "[[PII_PROJECT_CODENAME_" in tokenized
    assert telemetry.entitiesIntercepted == 3

    restored = tokenizer.detokenize(tokenized, vault)
    assert restored == prompt


