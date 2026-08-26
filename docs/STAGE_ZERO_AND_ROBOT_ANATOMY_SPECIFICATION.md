# Project Sovereign-Stream: Stage 0 Genesis Lab & Dynamic Robot Anatomy Specification

**Document Version:** 1.0.0  
**Status:** Approved Engineering Specification  
**Scope:** Stage 0 Power-Up Laboratory, Industrial Circuit Breakers, Cybernetic Robot Character Anatomy & Multi-Stage Geometry  

---

## 1. Executive Summary & Objective

In **Stage 0 (Agent Genesis / Power-Up Sequence)**, Project Sovereign-Stream introduces a visceral, tactile interactive laboratory that transforms the Sovereign Agent Architecture Specs card into a living, cybernetic robot character. 

Rather than presenting an empty or static chat screen at the beginning of the demonstration, Stage 0 replaces the chat area with an **Industrial Power-Up Lab** featuring two heavy-duty circuit breakers:
1. **Circuit Breaker #1 (Execution Runtime):** Powers the mechanical chassis, triggers rapid optic visor bootup blinking, and injects the execution runtime element into the robot's body.
2. **Circuit Breaker #2 (Cognitive Intelligence):** Awakens the neural engine, illuminates the glowing cybernetic brain within a glass dome atop the robot's head, and injects model selection and data residency into the body.

As the user advances from **Stage 0 through Stage 4**, the robot's body dynamically expands to incorporate new architectural governance modules (Zero-PII Shield, APRA Skills, Deterministic Tools, Sovereign Storage, and Inference Tokenomics), while its articulated arms and hydraulic legs adjust their geometry in real time to maintain aesthetic balance.

---

## 2. Dynamic Robot Character Anatomy

```
                              +---------------------------------------+
                              |         [ GLASS DOME VISOR ]          |
                              |   🧠 Synaptic Brain (Tier Pulse Glow) |
                              |   🤖 Visor Eyes (Boot Strobe / Glow)  |
                              +---------------------------------------+
                                                 ||  (Cervical Piston)
                   +---------------+   +--------------------+   +---------------+
     (Left Arm)    | 🦾 SHOULDER   |   |   ROBOT TORSO      |   | 🦾 SHOULDER   |    (Right Arm)
                   | • Upper Piston|---|   [Agent Chassis]  |---| • Upper Piston|
                   | • Forearm     |   |   • Runtime (0)    |   | • Forearm     |
                   | • Energy Rib  |   |   • Model Loc (0)  |   | • Energy Rib  |
                   |               |   |   • Model Tier (0) |   |               |
                   | Articulates & |   |   • Memory (1)     |   | Articulates & |
                   | Tracks Height |   |   • PII Shield (2) |   | Tracks Height |
                   | Dynamically   |   |   • Skill Rule (3) |   | Dynamically   |
                   +---------------+   |   • LVR Tool (3)   |   +---------------+
                                       |   • Storage (3)    |
                                       |   • Tokenomics (4) |
                                       +--------------------+
                                                 ||
                                       +--------------------+
                                       | 🦵 🦵 HYDRAULIC    |
                                       |    SUSPENSION LEGS |
                                       | (Compresses Stance |
                                       |   as Torso Grows)  |
                                       +--------------------+
```

### 2.1 The Head: Glass Dome & Neural Core
* **Glass Dome Enclosure:** A high-clarity curved dome with subtle glass refraction highlights (`backdrop-blur-sm`, `stroke-slate-500/40`, radial glass glare overlay).
* **Illuminated Cyber-Brain:** A multi-layered SVG neural brain that renders synaptic pulses matching the active sovereign tier:
  * **Global Tier (Tier 1):** Sapphire Blue pulse (`#3b82f6` / `shadow-blue-500/50`).
  * **Regional Tier (Tier 2):** Amber Gold pulse (`#f59e0b` / `shadow-amber-500/50`).
  * **Sovereign Tier (Tier 3):** Emerald Green pulse (`#10b981` / `shadow-emerald-500/50`).
* **Face Visor & Optics:** LED ocular lenses that support bootup strobe sequences (`@keyframes opticStrobe`), active streaming blink, and standby dark mode.

### 2.2 The Torso: Active Sovereign Architecture Chassis
The central chassis encapsulates the live governance telemetry and metadata elements:
* **Stage 0 Baseline (When Breakers Engaged):**
  * `⚙️ Runtime:` Execution runtime host (Vertex AI Agent Engine AU-SYD / Private On-Prem).
  * `📍 Model Location:` Active data boundary location (Global Multi-Region / Sydney Domestic / Airgapped).
  * `⚡ Model:` Foundation model tier (Gemini 3.7 Flash / Gemini 2.5 Flash / Gemma 2 Self-Hosted).
* **Stage 1 (Resilience & Failover):**
  * `💾 Memory:` Stateful session store & replication mode (Vertex AI Managed Sessions / Local Redis Standby).
* **Stage 2 (Zero-PII Shield):**
  * `🛡️ PII Cleanser:` Cryptographic entity tokenizer (Cloud Run Domestic / Local Sidecar).
* **Stage 3 (Enterprise Sovereignty):**
  * `🧠 Skill:` APRA CPS 234 Underwriter rulebook (Cloud Registry CMEK / Baked Enclave).
  * `🔧 Tool:` Deterministic Loan LVR Tool (`calculate_customer_lvr`).
  * `📁 Storage (Rest):` Encrypted storage at rest (`gs://au-fsi-customer-assets/` / Local Disk Mirror).
* **Stage 4 (Tokenomics & Cost):**
  * `📊 Tokens (In/Out):` Live token generation counter.
  * `🏷️ Model Cost (/1M):` Published model rate card ($/1M in/out).
  * `💰 Cost / x10k Turns:` Projected 10,000-turn economic cost modeling.

### 2.3 Articulated Limbs & Stance Dynamics
* **Mechanical Arms:** Dual-articulated mechanical arms attached via shoulder ball-joints to the upper collar. The pistons scale vertically and adjust elbow angles proportionally to the torso height.
* **Hydraulic Legs:** Dual-piston legs with heavy foot pads mounted beneath the chassis baseplate. When the torso expands in height (from 3 items up to 10 items), the leg suspension smoothly compresses to maintain vertical center-of-gravity inside the scrollable sidebar.
* **Sidebar Chassis Expansion:** Sidebar width is expanded from `340px` to `390px` to comfortably accommodate the limb span with high visual fidelity.

---

## 3. Stage 0 Interactive Laboratory: Industrial Circuit Breakers

When the demo is initialized or switched to **Stage 0**, the primary workspace transitions from the standard chat stream into the **Genesis Power-Up Lab**.

```
+---------------------------------------------------------------------------------------------------+
|  ⚡ STAGE 0: SOVEREIGN AGENT GENESIS & ASSEMBLY LAB                                              |
|  Initialize foundational agent sub-systems via physical breaker isolation                        |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|     +-----------------------------------------+   +-----------------------------------------+     |
|     |         ⚡ CIRCUIT BREAKER #1           |   |         🧠 CIRCUIT BREAKER #2           |     |
|     |           [ EXECUTION RUNTIME ]         |   |        [ COGNITIVE INTELLIGENCE ]       |     |
|     |                                         |   |                                         |     |
|     |      Status: [ ENERGIZED ] (240V)       |   |      Status: [ SYNAPSED ] (ONLINE)      |     |
|     |                                         |   |                                         |     |
|     |             [  O N  ]                   |   |             [  O N  ]                   |     |
|     |                |                        |   |                |                        |     |
|     |              (===)                      |   |              (===)                      |     |
|     |                |                        |   |                |                        |     |
|     |             [ O F F ]                   |   |             [ O F F ]                   |     |
|     |                                         |   |                                         |     |
|     |  • Powers Chassis & Hardware Bus        |   |  • Mounts Gemini / Gemma Neural Weights |     |
|     |  • Visor Optics Strobe -> Steady Glow   |   |  • Illuminates Synaptic Brain in Dome   |     |
|     |  • Injects Runtime Row into Torso       |   |  • Injects Model & Location into Torso  |     |
|     +-----------------------------------------+   +-----------------------------------------+     |
|                                                                                                   |
|  [ 🎯 Direct Model Playground / Quick Diagnostics ]                                              |
|  Enter test prompt to verify raw LLM latency and baseline behavior before Stage 1 resilience...  |
+---------------------------------------------------------------------------------------------------+
```

### 3.1 Circuit Breaker Logic & Reversibility Matrix

| Breaker | Target Sub-System | Flip ON Action | Flip OFF (Reverse) Action |
| :--- | :--- | :--- | :--- |
| **Breaker #1 (Runtime)** | Hardware Chassis & Execution Engine | 1. Visor eyes strobe for 600ms, then stay illuminated.<br/>2. Injects `⚙️ Runtime` row into torso chassis. | 1. Visor eyes power down to dark state.<br/>2. Removes `⚙️ Runtime` row from torso. |
| **Breaker #2 (Intelligence)** | Foundation Model & Neural Reasoning | 1. Glass Dome illuminates; pulsing neural brain fades in.<br/>2. Injects `📍 Model Location` and `⚡ Model` into torso. | 1. Brain powers down and vanishes from dome.<br/>2. Removes Model & Location rows from torso. |

---

## 4. Full 5-Stage Demo Progression Architecture

| Stage | Name | Breaker 1 (Runtime) | Breaker 2 (Model) | Stateful Memory | PII Cleanser | Enterprise Skill & Tool | Tokenomics | Primary View |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **0** | **Genesis Lab** | *Interactive* | *Interactive* | Disabled | Disabled | Disabled | Disabled | **Genesis Lab View (Breakers)** |
| **1** | **Resilience & Cascades** | `ON` | `ON` | `Enabled` | Disabled | Disabled | Disabled | **Full Chat + Routing Telemetry** |
| **2** | **Zero-PII Shield** | `ON` | `ON` | `Enabled` | `Enabled` | Disabled | Disabled | **Full Chat + PII Sanitizer HUD** |
| **3** | **Enterprise Sovereignty**| `ON` | `ON` | `Enabled` | `Enabled` | `Enabled` | Disabled | **Full Chat + LVR Dataset & APRA** |
| **4** | **Tokenomics & Cost** | `ON` | `ON` | `Enabled` | `Enabled` | `Enabled` | `Enabled` | **Full Chat + Economics Analytics** |

---

## 5. Security, State, and API Synchronization

1. **State Persistence**: Breaker states in Stage 0 are held in application memory and reflected in the REST API payload via `/api/settings` and `/api/demo/reset`.
2. **Deterministic Stage Resets**: Triggering `/api/demo/reset` with `stage: 0` resets both breakers to `OFF` for consistent live presentation workflows.
3. **Graceful Fallback**: If user navigates directly from Stage 0 to Stage 1, 2, 3, or 4, both runtime and intelligence breakers automatically engage to ensure uninterrupted conversation flow.
