use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use std::process::Stdio;

#[derive(Serialize, Deserialize, Debug)]
struct JsonRpcRequest {
    jsonrpc: String,
    method: String,
    params: Value,
    id: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct JsonRpcResponse {
    jsonrpc: String,
    result: Option<Value>,
    error: Option<Value>,
    id: Option<u64>,
}

pub struct AgentSession {
    child: Child,
}

impl AgentSession {
    pub async fn spawn(cli_cmd: &str, args: Vec<&str>, worktree_path: &str) -> Result<Self, String> {
        let child = Command::new(cli_cmd)
            .args(args)
            .current_dir(worktree_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn agent: {}", e))?;

        Ok(Self { child })
    }

    pub async fn call(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let stdin = self.child.stdin.as_mut().ok_or("Failed to open stdin")?;
        let stdout = self.child.stdout.as_mut().ok_or("Failed to open stdout")?;
        
        let id = 1;
        let request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            method: method.to_string(),
            params,
            id,
        };

        let request_str = serde_json::to_string(&request).map_err(|e| e.to_string())?;
        stdin.write_all(request_str.as_bytes()).await.map_err(|e| e.to_string())?;
        stdin.write_all(b"\n").await.map_err(|e| e.to_string())?;
        stdin.flush().await.map_err(|e| e.to_string())?;

        let mut reader = BufReader::new(stdout).lines();
        
        while let Some(line) = reader.next_line().await.map_err(|e| e.to_string())? {
            if let Ok(response) = serde_json::from_str::<JsonRpcResponse>(&line) {
                if response.id == Some(id) {
                    if let Some(error) = response.error {
                        return Err(format!("Agent error: {}", error));
                    }
                    return Ok(response.result.unwrap_or(Value::Null));
                }
            }
        }

        Err("Connection closed before response received".to_string())
    }

    pub async fn initialize(&mut self) -> Result<(), String> {
        self.call("initialize", json!({
            "capabilities": {},
            "clientInfo": { "name": "Construct", "version": "0.1.0" }
        })).await?;
        Ok(())
    }

    pub async fn prompt(&mut self, text: &str) -> Result<String, String> {
        let result = self.call("prompt", json!({ "text": text })).await?;
        Ok(result["text"].as_str().unwrap_or("").to_string())
    }

    pub async fn run_headless(cli_cmd: &str, args: Vec<&str>, worktree_path: &str) -> Result<String, String> {
        let output = Command::new(cli_cmd)
            .args(args)
            .current_dir(worktree_path)
            .output()
            .await
            .map_err(|e| format!("Failed to run headless agent: {}", e))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }
}
