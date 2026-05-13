---
name: acp-client-expert
description: Expert in implementing Agent Client Protocol (ACP) clients. Use when implementing or debugging ACP client methods, session management, or JSON-RPC 2.0 communication.
---

# ACP Client Expert

## Overview
This skill provides guidance and technical patterns for implementing high-quality ACP clients. It focuses on protocol compliance, security (gatekeeping), and robust async communication.

## Core Implementation Tasks

### 1. Protocol Setup
- **JSON-RPC 2.0**: Implement a robust JSON-RPC parser. See [spec.md](references/spec.md) for details.
- **Initialization**: Handle the `initialize` handshake to negotiate capabilities.
- **Session Management**: Manage `session/new` and `session/prompt` flows.

### 2. Capability Implementation
- **Gatekeeping**: Implement `session/request_permission`. This is mandatory for security.
- **File System**: Implement `fs/read_text_file` and `fs/write_text_file` with absolute paths and 1-based line indexing.
- **Terminal**: Provide controlled terminal access if needed.

### 3. Language-Specific Patterns
- **Rust**: Use `serde` and `tokio`. See [rust-patterns.md](references/rust-patterns.md).

### 4. Extending with MCP
- **MCP Integration**: ACP clients can expose local tools to the agent by providing MCP server connection details during the `initialize` handshake. See [spec.md](references/spec.md) for the registration pattern.

### 5. Injecting Agent Personas
To ensure Gemini CLI adopts a specific persona (e.g., "Frontend Specialist") when your app connects:
- **Project-Level Injection**: Write a temporary `.gemini/agents/<name>.md` file in the project root before spawning the agent. Gemini CLI automatically discovers these.
- **Session Instructions**: Pass a custom system prompt in the `session/new` or `initialize` handshake.
- **Skill Activation**: If the persona is complex, package it as a Skill and use the `--skill` CLI flag or `activate_skill` tool.
- **Subagent Definition**: Use the YAML frontmatter pattern (see [agents.md](references/agents.md)) to define specific capabilities and tools for your injected agent.

## Security Guardrails
- **NEVER** allow an agent to execute code or write files without user permission via `session/request_permission`.
- **VALIDATE** all paths from the agent. Ensure they are absolute and within allowed boundaries.
- **TRUNCATE** large outputs from the client to avoid overloading the agent's context.

## Workflow: Building a Client
1. **Define Types**: Create types for JSON-RPC requests, responses, and notifications.
2. **Transport Layer**: Implement a reader/writer for stdin/stdout or WebSocket.
3. **Initialization Logic**: Implement the `initialize` method.
4. **Dispatcher**: Set up a loop to handle incoming messages and route them.
5. **UI Integration**: Connect the dispatcher to your frontend to show `session/update` notifications.
