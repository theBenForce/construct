# ACP Protocol Specification Summary

The Agent Client Protocol (ACP) is based on JSON-RPC 2.0 and facilitates communication between an AI Agent and a Client (IDE/Editor).

## JSON-RPC 2.0 Basics
- **Request**: `{"jsonrpc": "2.0", "method": "...", "params": {...}, "id": 1}`
- **Response**: `{"jsonrpc": "2.0", "result": {...}, "id": 1}`
- **Error**: `{"jsonrpc": "2.0", "error": {"code": -32600, "message": "..."}, "id": 1}`
- **Notification**: `{"jsonrpc": "2.0", "method": "...", "params": {...}}` (No ID)

## Lifecycle Methods

### `initialize` (Client -> Agent)
Negotiates capabilities and protocol version.
- **Params**: `protocol_version`, `capabilities` (e.g., `fs`, `terminal`), `client_info`.
- **MCP Extension**: Clients can provide MCP server connection details in the `capabilities` or `_meta` fields. This allows the agent to connect back to the client and use local tools.
  - Pattern: `capabilities: { mcp: { servers: [ { type: "stdio", command: "...", args: [...] } ] } }`
- **Result**: `protocol_version`, `capabilities`, `agent_info`.

### `authenticate` (Client -> Agent, Optional)
Performs authentication if the agent requires it.

### `session/new` (Client -> Agent)
Starts a new session. Returns a `session_id`.

### `session/prompt` (Client -> Agent)
Sends a user message to the agent.
- **Params**: `session_id`, `message`.
- **Streaming**: The agent responds with `session/update` notifications during processing.

## Agent -> Client Methods (Callbacks)

### `session/request_permission`
**Required.** The agent must call this before executing any sensitive tool or modification.
- **Params**: `session_id`, `permission_type`, `description`.
- **Result**: `{"allowed": true}` or `{"allowed": false}`.

### `fs/read_text_file`, `fs/write_text_file`
If the client supports `fs` capability.
- **Paths**: Must be absolute.
- **Lines**: 1-based indexing.

### `terminal/create`, `terminal/output`, `terminal/wait_for_exit`
If the client supports `terminal` capability.

## Notifications (Agent -> Client)

### `session/update`
Provides real-time updates.
- **Update Types**:
  - `message_chunk`: Streaming text.
  - `tool_call`: Information about an ongoing tool execution.
  - `plan`: The agent's intended steps.
  - `status`: General status updates.

## Protocol Constraints
- **Absolute Paths**: All file paths must be absolute.
- **1-Based Indexing**: Line numbers are 1-based.
- **Standard I/O**: Default transport is stdin/stdout.
