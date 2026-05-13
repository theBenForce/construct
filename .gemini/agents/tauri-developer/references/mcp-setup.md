# Tauri MCP Debugging Guide

The Tauri MCP server allows the agent to interact with a running Tauri application in development mode.

## Setup Requirements
1. **Plugin**: `tauri-plugin-mcp-bridge` must be added to `src-tauri/Cargo.toml`.
2. **Registration**: The plugin must be initialized in `lib.rs` or `main.rs`:
   ```rust
   #[cfg(debug_assertions)]
   builder = builder.plugin(tauri_plugin_mcp_bridge::init());
   ```
3. **Global Tauri**: `withGlobalTauri: true` must be set in `Tauri.toml` or `tauri.conf.json`.
4. **Permissions**: The `"mcp-bridge:default"` permission must be included in the app's capabilities.

## Debugging Workflow
1. **Start the App**: Run `pnpm tauri dev` or `cargo tauri dev`.
2. **Connect**: Call `driver_session(action="start")`. This connects to the WebSocket server exposed by the plugin (default port 9223).
3. **Verify**: Use `driver_session(action="status")` to ensure the connection is active.
4. **Inspect UI**:
   - `webview_dom_snapshot(type="accessibility")`: Get the ARIA tree.
   - `webview_dom_snapshot(type="structure")`: Get the full DOM structure.
   - `webview_screenshot()`: Get a visual snapshot.
5. **Interact**:
   - `webview_interact(action="click", selector=".my-button")`.
   - `webview_keyboard(action="type", text="Hello", selector="#input")`.
6. **IPC Monitoring**:
   - `ipc_monitor(action="start")`: Start capturing calls between frontend and Rust.
   - `ipc_get_captured()`: Review the captured IPC traffic.

## Troubleshooting
- **Connection Refused**: Ensure the app is actually running and the plugin is correctly registered.
- **Permission Denied**: Check if the capability includes `mcp-bridge:default`.
- **Selector Not Found**: The webview might not have finished loading. Use `webview_wait_for(type="selector", value=".target")`.
