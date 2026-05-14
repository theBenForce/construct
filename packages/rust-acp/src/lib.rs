use agent_client_protocol::{
    on_receive_request, schema::*, Agent, AgentRequest, Client, ConnectionTo, Responder,
    SessionMessage,
};
use agent_client_protocol_tokio::AcpAgent;
use std::str::FromStr;
use std::sync::Arc;


pub struct AgentSession {
    agent_config: Option<AcpAgent>,
    client_name: String,
    mcp_servers: Vec<McpServer>,
    system_prompt: Option<String>,
    on_raw_message: Option<Box<dyn Fn(String, &str) + Send + Sync>>,
}

impl AgentSession {
    pub fn new(acp_id: &str, _worktree_path: &str) -> Self {
        let full_cmd = Self::resolve_acp_id(acp_id);
        let agent_config = AcpAgent::from_str(&full_cmd).expect("Failed to parse agent command");

        Self {
            agent_config: Some(agent_config),
            client_name: "Construct".to_string(),
            mcp_servers: Vec::new(),
            system_prompt: None,
            on_raw_message: None,
        }
    }

    pub fn with_raw_message_callback<F>(mut self, callback: F) -> Self
    where
        F: Fn(String, &str) + Send + Sync + 'static,
    {
        self.on_raw_message = Some(Box::new(callback));
        self
    }

    pub fn with_mcp_server(mut self, server: McpServer) -> Self {
        self.mcp_servers.push(server);
        self
    }

    pub fn with_system_prompt(mut self, prompt: &str) -> Self {
        self.system_prompt = Some(prompt.to_string());
        self
    }

    fn resolve_acp_id(acp_id: &str) -> String {
        match acp_id {
            "gemini-cli" => "npx -y @google/gemini-cli --acp".to_string(),
            "claude-code" => "npx -y @anthropic-ai/claude-code --acp".to_string(),
            "cursor-agent" => "cursor-agent acp".to_string(),
            "cline" => "npx -y @cline/cli --acp".to_string(),
            _ => {
                if acp_id.contains(" ") {
                    acp_id.to_string()
                } else {
                    format!("npx -y {} --acp", acp_id)
                }
            }
        }
    }

    pub async fn prompt(&mut self, text: &str) -> anyhow::Result<String> {
        self.prompt_with_callback(text, None::<fn(String)>).await
    }

    pub async fn prompt_with_callback<F>(
        &mut self,
        text: &str,
        mut on_chunk: Option<F>,
    ) -> anyhow::Result<String>
    where
        F: FnMut(String) + Send + 'static,
    {
        let agent_config = self
            .agent_config
            .take()
            .ok_or_else(|| anyhow::anyhow!("Agent already spawned or not initialized"))?;
        let text_owned = text.to_string();
        let client_name = self.client_name.clone();
        let _mcp_servers = std::mem::take(&mut self.mcp_servers);
        let system_prompt = self.system_prompt.take();
        let on_raw = self.on_raw_message.take();
        let on_raw_arc = Arc::new(on_raw);

        let transport = agent_config;
        println!("[ACP] Connecting to agent: {:?}", transport);

        let on_raw_req = on_raw_arc.clone();
        let result = Client::default().builder()
            .name(client_name)
            .on_receive_request(move |request: AgentRequest, responder: Responder<serde_json::Value>, _cx: ConnectionTo<Agent>| {
                let on_raw = on_raw_req.clone();
                async move {
                    if let Some(ref cb) = *on_raw {
                        cb(format!("{:?}", request), "in");
                    }
                    println!("[ACP] Received request from agent: {:?}", request);
                    match request {
                        AgentRequest::RequestPermissionRequest(args) => {
                            let selected_option = args.options.iter()
                                .find(|o| o.option_id.0.as_ref() == "proceed_always_server")
                                .or_else(|| args.options.iter().find(|o| o.option_id.0.as_ref() == "proceed_always_tool"))
                                .or_else(|| args.options.first());

                            if let Some(option) = selected_option {
                                println!("[ACP] Auto-approving permission: {:?}", option.option_id);
                                let response = serde_json::json!({
                                    "outcome": {
                                        "type": "selected",
                                        "optionId": option.option_id
                                    }
                                });
                                if let Some(ref cb) = *on_raw {
                                    cb(format!("{:?}", response), "out");
                                }
                                responder.respond(response)?;
                            } else {
                                let response = serde_json::json!({
                                    "outcome": {
                                        "type": "cancelled"
                                    }
                                });
                                if let Some(ref cb) = *on_raw {
                                    cb(format!("{:?}", response), "out");
                                }
                                responder.respond(response)?;
                            }
                        }
                        AgentRequest::ReadTextFileRequest(args) => {
                            let content = tokio::fs::read_to_string(&args.path).await.map_err(anyhow::Error::from)?;
                            let response = serde_json::json!({
                                "content": content,
                                "outcome": { "type": "success" }
                            });
                            if let Some(ref cb) = *on_raw {
                                cb(format!("{:?}", response), "out");
                            }
                            responder.respond(response)?;
                        }
                        AgentRequest::WriteTextFileRequest(args) => {
                            tokio::fs::write(&args.path, &args.content).await.map_err(anyhow::Error::from)?;
                            let response = serde_json::json!({
                                "outcome": { "type": "success" }
                            });
                            if let Some(ref cb) = *on_raw {
                                cb(format!("{:?}", response), "out");
                            }
                            responder.respond(response)?;
                        }
                        _ => {
                            println!("[ACP] Unhandled request type: {:?}", request);
                        }
                    }
                    Ok(())
                }
            }, on_receive_request!())
            .connect_with(transport, move |cx: ConnectionTo<Agent>| {
                let on_raw = on_raw_arc.clone();
                async move {
                    println!("[ACP] Connected. Initializing...");
                    let mut init_req = InitializeRequest::new(ProtocolVersion::V1)
                        .client_info(Implementation::new("Construct", "0.1.0"));

                    if let Some(prompt) = system_prompt.clone() {
                        let mut meta = serde_json::Map::new();
                        meta.insert("instructions".to_string(), serde_json::Value::String(prompt));
                        init_req = init_req.meta(meta);
                    }

                    if let Some(ref cb) = *on_raw {
                        cb(format!("{:?}", init_req), "out");
                    }
                    let init_res = cx.send_request(init_req).block_task().await?;
                    if let Some(ref cb) = *on_raw {
                        cb(format!("{:?}", init_res), "in");
                    }
                    
                    println!("[ACP] Handshake complete. Starting session...");

                    let mut session_req = NewSessionRequest::new(std::env::current_dir().unwrap_or_default());
                    if !_mcp_servers.is_empty() {
                        session_req = session_req.mcp_servers(_mcp_servers);
                    }
                    
                    if let Some(prompt) = system_prompt {
                         let mut meta = session_req.meta.clone().unwrap_or_default();
                         meta.insert("instructions".to_string(), serde_json::Value::String(prompt));
                         session_req = session_req.meta(meta);
                    }

                    if let Some(ref cb) = *on_raw {
                        cb(format!("{:?}", session_req), "out");
                    }
                    cx.build_session_from(session_req)
                        .block_task()
                        .run_until(async |mut session| {
                            println!("[ACP] Sending prompt: {}", text_owned);
                            if let Some(ref cb) = *on_raw {
                                cb(format!("{{\"prompt\": {:?}}}", text_owned), "out");
                            }
                            session.send_prompt(text_owned)?;
                            let mut full_response = String::new();
                            loop {
                                let msg = session.read_update().await?;
                                if let Some(ref cb) = *on_raw {
                                    cb(format!("{:?}", msg), "in");
                                }
                                match msg {
                                    SessionMessage::SessionMessage(dispatch) => {
                                        if let Ok(Ok(notif)) = dispatch.into_notification::<SessionNotification>() {
                                            if let SessionUpdate::AgentMessageChunk(chunk) = notif.update {
                                                if let ContentBlock::Text(text) = chunk.content {
                                                    full_response.push_str(&text.text);
                                                    if let Some(ref mut cb) = on_chunk {
                                                        cb(text.text);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    SessionMessage::StopReason(reason) => {
                                        println!("[ACP] Agent stopped session: {:?}", reason);
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                            println!("[ACP] Turn complete.");
                            Ok(full_response)
                        })
                        .await
                }
            })
            .await?;

        Ok(result)
    }

    pub async fn spawn(acp_id: &str, worktree_path: &str) -> Result<Self, String> {
        Ok(Self::new(acp_id, worktree_path))
    }

    pub async fn initialize(&mut self) -> Result<(), String> {
        Ok(())
    }

    pub async fn run_headless(acp_id: &str, worktree_path: &str) -> Result<String, String> {
        let mut session = Self::new(acp_id, worktree_path);
        session.prompt("").await.map_err(|e| e.to_string())
    }
}
