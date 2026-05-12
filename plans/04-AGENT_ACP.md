# Phase 4: Agent Orchestrator (ACP)

## Goal
Standardize communication with modern AI agents using the Agent Client Protocol (ACP) while maintaining backward compatibility for standard headless CLIs.

## Technical Specifications
- **Protocol:** JSON-RPC 2.0 over standard I/O (`stdio`).
- **Package:** `packages/rust-acp` (Modular Rust crate).
- **Async Runtime:** `tokio` for non-blocking process I/O.

## Integration Modes
1. **ACP Mode:** Used for Gemini CLI (`--acp`) and Cursor Agent (`acp`). Supports `initialize` and `prompt` methods.
2. **Headless Mode:** Fallback for Claude Code and others. Captures standard output from a single execution.

## Core Logic
- **`AgentSession`:** Manages the lifecycle of the spawned agent process.
- **`call`:** Sends a JSON-RPC request and waits for the matching response.
- **`initialize`:** Performs the ACP handshake with client metadata.
- **`prompt`:** Sends the ticket task and retrieves the agent's textual response.

## Tasks
- [x] Implement `rust-acp` library crate with Tokio support.
- [x] Define JSON-RPC request and response structures.
- [x] Implement process spawning and pipe management.
- [x] Implement the ACP initialization handshake.
- [x] Implement structured prompting.
- [x] Add headless execution fallback.
- [x] Expose `run_agent` as a Tauri command.
