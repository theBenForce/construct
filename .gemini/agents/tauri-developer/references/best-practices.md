# Tauri v2 Best Practices

## Security & Permissions
- **Capabilities**: Group permissions into logical capabilities in `src-tauri/capabilities/`. Use the `default.json` for essential app functionality.
- **Granular Permissions**: Instead of `fs:default`, use specific commands like `fs:read` or `fs:write`.
- **Command Scoping**: Use scopes to restrict access. For example, limit file system access to specific directories:
  ```json
  {
    "identifier": "allow-fs-read",
    "permissions": [
      {
        "identifier": "fs:allow-read",
        "allow": [{ "path": "$APP_DATA/**" }]
      }
    ]
  }
  ```

## Rust Backend
- **Command State**: Use `tauri::State` for shared resources like database pools or configuration.
- **Error Handling**: Return `Result<T, E>` from commands where `E` implements `serde::Serialize` to provide meaningful errors to the frontend.
- **Async Commands**: Always use `async fn` for long-running or I/O bound tasks to avoid blocking the main thread.

## Frontend
- **SPA/SSG**: Prefer Single Page Applications or Static Site Generation. Avoid any runtime that requires a server (like standard SSR).
- **Global Tauri API**: Use the `@tauri-apps/api` package for IPC and system features. If using `withGlobalTauri: true`, you can also access them via `window.__TAURI__`.

## Performance
- **Data Transfer**: Avoid sending large blobs of data over IPC. If possible, process data in Rust or use optimized formats.
- **Plugin Usage**: Disable unused core features in `Tauri.toml` and remove unused plugins from `Cargo.toml`.
