# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Asynchronous Recovery Sentinel for Google ADK.

Background health worker that probes demoted higher tiers (e.g., TIER_1_GLOBAL)
out-of-band while the user session continues uninterrupted on sticky fallback tiers.
Enforces stability hysteresis (2 consecutive healthy checks under latency SLA)
before promoting session.state['stickyTier'] back to the primary global tier.
"""

import time
import asyncio
from typing import Dict, Any, Tuple, Optional


class RecoverySentinel:
    """
    Monitors demoted tiers and autonomously restores session routing when stability returns.
    """

    def __init__(
        self,
        probe_interval_sec: float = 5.0,
        required_successes: int = 2,
        latency_sla_ms: int = 600,
        target_tier: str = "TIER_1_GLOBAL",
    ):
        self.probe_interval_sec = probe_interval_sec
        self.required_successes = required_successes
        self.latency_sla_ms = latency_sla_ms
        self.target_tier = target_tier

    async def _probe_endpoint(self, tier_id: str) -> Tuple[bool, int]:
        """
        Sends a lightweight synthetic token ping to the specified tier endpoint.

        Returns:
            Tuple of (is_healthy: bool, latency_ms: int)
        """
        start_time = time.time()
        # Simulate lightweight health check (e.g. 110ms round-trip to Global API)
        await asyncio.sleep(0.015)
        latency_ms = int((time.time() - start_time) * 1000)
        return True, latency_ms

    async def run_probe_cycle(self, session_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a single out-of-band health probe cycle against the demoted tier.

        Args:
            session_state: The ADK session dictionary containing 'stickyTier'.

        Returns:
            Dictionary with current Sentinel telemetry and status message.
        """
        current_sticky = session_state.get("stickyTier", "TIER_1_GLOBAL")

        # If we are already on the target tier, no recovery probing is necessary
        if current_sticky == self.target_tier:
            sentinel_status = {
                "status": "IDLE_HEALTHY",
                "targetTier": self.target_tier,
                "probeIntervalSec": self.probe_interval_sec,
                "consecutiveSuccesses": self.required_successes,
                "requiredSuccesses": self.required_successes,
                "lastProbeLatencyMs": 0,
                "message": f"Active tier is already {self.target_tier}. Sentinel idle.",
            }
            session_state["recoverySentinel"] = sentinel_status
            return sentinel_status

        # Initialize recoverySentinel metadata if not present
        if "recoverySentinel" not in session_state or not isinstance(session_state["recoverySentinel"], dict):
            session_state["recoverySentinel"] = {
                "consecutiveSuccesses": 0,
            }

        sentinel_meta = session_state["recoverySentinel"]
        consecutive_successes = sentinel_meta.get("consecutiveSuccesses", 0)

        # Probe the higher target tier out-of-band
        try:
            is_healthy, latency_ms = await self._probe_endpoint(self.target_tier)
            under_sla = latency_ms <= self.latency_sla_ms
        except Exception:
            is_healthy = False
            latency_ms = 9999
            under_sla = False

        if is_healthy and under_sla:
            consecutive_successes += 1
            if consecutive_successes >= self.required_successes:
                # STABILITY THRESHOLD REACHED: Atomically promote the session!
                session_state["stickyTier"] = self.target_tier
                message = (
                    f"Tier 1 Global verified healthy across {consecutive_successes} consecutive cycles "
                    f"(latency: {latency_ms}ms <= {self.latency_sla_ms}ms). Session auto-promoted to Global!"
                )
                status_code = "PROMOTED_RESTORED"
            else:
                message = (
                    f"Tier 1 responding normally ({consecutive_successes}/{self.required_successes}). "
                    f"Probing 1 more cycle before auto-promotion."
                )
                status_code = "PROBING_BACKGROUND"
        else:
            # Probe failed or breached SLA: Reset consecutive success count
            consecutive_successes = 0
            message = (
                f"Tier 1 health probe failed or exceeded latency SLA ({latency_ms}ms > {self.latency_sla_ms}ms). "
                f"Remaining on sticky fallback {current_sticky}."
            )
            status_code = "PROBE_FAILED_HYSTERESIS_RESET"

        sentinel_status = {
            "status": status_code,
            "targetTier": self.target_tier,
            "probeIntervalSec": self.probe_interval_sec,
            "consecutiveSuccesses": consecutive_successes,
            "requiredSuccesses": self.required_successes,
            "lastProbeLatencyMs": latency_ms,
            "message": message,
        }
        session_state["recoverySentinel"] = sentinel_status
        return sentinel_status

    async def start_background_monitor(
        self, session_state: Dict[str, Any], stop_event: asyncio.Event
    ) -> None:
        """
        Runs an asyncio loop executing health probes periodically until stopped or promoted.
        """
        while not stop_event.is_set():
            status = await self.run_probe_cycle(session_state)
            if status["status"] == "PROMOTED_RESTORED" or status["status"] == "IDLE_HEALTHY":
                break
            await asyncio.sleep(self.probe_interval_sec)
