# Defining Custom Agents (Subagents)

Gemini CLI allows you to define specialized agent personas using Markdown files with YAML frontmatter. This is the preferred way to inject "expert" behavior into a project dynamically.

## Agent Definition Structure

Create a file at `.gemini/agents/<agent-name>.md`:

```markdown
---
name: frontend-expert
description: Specialized in React, Tailwind CSS, and Shadcn UI.
tools: ["mcp_*", "fs_*", "terminal_*"]
model: gemini-2.0-flash
---

# Frontend Expert Instructions

You are a senior frontend engineer. Your goal is to build high-quality, accessible, and responsive UIs.

## Standards
- Use functional components and hooks.
- Prefer Tailwind CSS for styling.
- Ensure all components are accessible (a11y).
```

## How to Inject Dynamically from a Client (Construct)

If you want the Construct app to "inject" an agent definition into a project that doesn't have one:

### 1. File-Based Injection (Simplest)
Before spawning the Gemini CLI process, your app can write a hidden agent definition:
- Path: `<project-root>/.gemini/agents/construct-agent.md`
- Gemini CLI will automatically discover this and make it available as a subagent or use its instructions if activated.

### 2. ACP Handshake Injection
During the `initialize` or `session/new` call, you can provide the instructions directly in the `params`:

```json
{
  "jsonrpc": "2.0",
  "method": "session/new",
  "params": {
    "instructions": "You are the Construct Agent. [Detailed Instructions Here...]",
    "model": "gemini-2.0-flash"
  }
}
```

### 3. CLI Flag Injection
When spawning the agent process, use the `--agent` or `--skill` flags:
```bash
gemini --agent path/to/my/agent.md acp
```

## Recommended Strategy for Construct
For a "clean" injection that doesn't clutter the user's project:
1. Store your agent definitions (personas) internally in the Construct database.
2. When a project is opened, spawn Gemini CLI with the `--agent` flag pointing to a temporary file or a internal reference.
3. Use the `session/new` `instructions` parameter to pass the specific system prompt for that user session.
