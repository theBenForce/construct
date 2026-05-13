# Implementing ACP in Rust

The `rust-acp` package should leverage `serde` for JSON handling and `tokio` for asynchronous communication.

## Recommended Dependencies
```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tower = "0.4" # Optional, for service abstraction
```

## Data Structures
Define the JSON-RPC messages using `serde`.

```rust
#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Message {
    Request(Request),
    Response(Response),
    Notification(Notification),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Request {
    pub jsonrpc: String,
    pub method: String,
    pub params: Option<serde_json::Value>,
    pub id: Id,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Id {
    Number(i64),
    String(String),
}
```

## Communication Patterns

### Stdin/Stdout Handling
Use `tokio::io::stdin()` and `tokio::io::stdout()` for the transport. Wrap them in a codec or use `Lines` for line-delimited JSON.

```rust
use tokio::io::{AsyncBufReadExt, BufReader};

async fn run_loop() {
    let stdin = tokio::io::stdin();
    let mut reader = BufReader::new(stdin).lines();

    while let Some(line) = reader.next_line().await? {
        let message: Message = serde_json::from_str(&line)?;
        handle_message(message).await?;
    }
}
```

### Dispatcher
Implement a dispatcher that routes requests to handlers and tracks pending requests (for responses).

```rust
pub struct Client {
    pending_requests: Arc<Mutex<HashMap<Id, oneshot::Sender<Response>>>>,
}
```

## Gatekeeping (Permissions)
The most important part of the client is the permission requester.

```rust
impl Client {
    async fn request_permission(&self, description: &str) -> bool {
        // 1. Send session/request_permission to Agent
        // 2. Wait for response
        // 3. Return true/false
    }
}
```

## Tips
- **Absolute Paths**: Ensure you use `std::fs::canonicalize` or similar to handle paths correctly.
- **Error Codes**: Use standard JSON-RPC error codes (-32700 for parse error, -32600 for invalid request, etc.).
- **Async Trait**: Use `async-trait` crate if you want to define a common interface for different agents.
