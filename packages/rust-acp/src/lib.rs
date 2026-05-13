use agent_client_protocol::{Client, on_receive_request, AgentRequest, Responder, ConnectionTo, Agent, schema::*};
use agent_client_protocol_tokio::AcpAgent;
use std::str::FromStr;

pub struct AgentSession {
    agent_config: Option<AcpAgent>,
    client_name: String,
    mcp_servers: Vec<McpServer>,
    system_prompt: Option<String>,
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
        }
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
                // Fallback: assume it might be a global command if not in registry
                // or just default to gemini-cli if unknown
                format!("npx -y {} --acp", acp_id)
            }
        }
    }

    pub async fn prompt(&mut self, text: &str) -> anyhow::Result<String> {
        let agent_config = self.agent_config.take().ok_or_else(|| anyhow::anyhow!("Agent already spawned or not initialized"))?;
        let text_owned = text.to_string();
        let client_name = self.client_name.clone();
        let _mcp_servers = std::mem::take(&mut self.mcp_servers);
        let system_prompt = self.system_prompt.take();

        let transport = agent_config;

        let result = Client::default().builder()
            .name(client_name)
            .on_receive_request(|request: AgentRequest, responder: Responder<serde_json::Value>, _cx: ConnectionTo<Agent>| async move {
                match request {
                    AgentRequest::RequestPermissionRequest(args) => {
                        if let Some(option) = args.options.first() {
                             responder.respond(serde_json::to_value(RequestPermissionOutcome::Selected(
                                 SelectedPermissionOutcome::new(option.option_id.clone())
                             ))?)?;
                        } else {
                            responder.respond(serde_json::to_value(RequestPermissionOutcome::Cancelled)?)?;
                        }
                    }
                    AgentRequest::ReadTextFileRequest(args) => {
                        let content = tokio::fs::read_to_string(&args.path).await.map_err(anyhow::Error::from)?;
                        responder.respond(serde_json::to_value(ReadTextFileResponse::new(content))?)?;
                    }
                    AgentRequest::WriteTextFileRequest(args) => {
                        tokio::fs::write(&args.path, &args.content).await.map_err(anyhow::Error::from)?;
                        responder.respond(serde_json::to_value(WriteTextFileResponse::new())?)?;
                    }
                    _ => {
                    }
                }
                Ok(())
            }, on_receive_request!())
            .connect_with(transport, |cx: ConnectionTo<Agent>| async move {
                let mut init_req = InitializeRequest::new(ProtocolVersion::V1)
                    .client_info(Implementation::new("Construct", "0.1.0"));

                // InitializeRequest doesn't seem to have instructions in this version,
                // but NewSessionRequest might, or we can use meta as a fallback.
                if let Some(prompt) = system_prompt.clone() {
                    let mut meta = serde_json::Map::new();
                    meta.insert("instructions".to_string(), serde_json::Value::String(prompt));
                    init_req = init_req.meta(meta);
                }

                cx.send_request(init_req).block_task().await?;

                let mut session_req = NewSessionRequest::new(std::env::current_dir().unwrap_or_default());
                if !_mcp_servers.is_empty() {
                    session_req = session_req.mcp_servers(_mcp_servers);
                }
                
                // Set instructions in NewSessionRequest as well if supported or via meta
                if let Some(prompt) = system_prompt {
                     let mut meta = session_req.meta.clone().unwrap_or_default();
                     meta.insert("instructions".to_string(), serde_json::Value::String(prompt));
                     session_req = session_req.meta(meta);
                }

                let session_builder = cx.build_session_from(session_req).block_task();
                
                let mut session = session_builder.start_session().await?;
                session.send_prompt(text_owned)?;

                let response = session.read_to_string().await?;
                Ok(response)
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
