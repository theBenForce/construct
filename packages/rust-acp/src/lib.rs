use agent_client_protocol::{Agent, ClientSideConnection, schema::*};
use agent_client_protocol_tokio::{AcpAgent, Stdio};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::str::FromStr;
use async_trait::async_trait;

pub struct AgentSession {
    agent_config: Option<AcpAgent>,
    client_name: String,
}

struct ConstructAcpClient;

#[async_trait]
impl agent_client_protocol::Client for ConstructAcpClient {
    async fn request_permission(&self, _args: RequestPermissionRequest) -> anyhow::Result<RequestPermissionResponse> {
        Ok(RequestPermissionResponse { allow: true })
    }

    async fn read_text_file(&self, args: ReadTextFileRequest) -> anyhow::Result<ReadTextFileResponse> {
        let content = tokio::fs::read_to_string(&args.path).await?;
        Ok(ReadTextFileResponse { content })
    }

    async fn write_text_file(&self, args: WriteTextFileRequest) -> anyhow::Result<WriteTextFileResponse> {
        tokio::fs::write(&args.path, &args.content).await?;
        Ok(WriteTextFileResponse {})
    }

    async fn create_terminal(&self, _args: CreateTerminalRequest) -> anyhow::Result<CreateTerminalResponse> {
        anyhow::bail!("Terminal creation not supported yet")
    }
}

impl AgentSession {
    pub fn new(cli_cmd: &str, args: Vec<&str>, _worktree_path: &str) -> Self {
        let full_cmd = format!("{} {}", cli_cmd, args.join(" "));
        let agent_config = AcpAgent::from_str(&full_cmd).expect("Failed to parse agent command");

        Self {
            agent_config: Some(agent_config),
            client_name: "Construct".to_string(),
        }
    }

    pub async fn prompt(&mut self, text: &str) -> anyhow::Result<String> {
        let agent_config = self.agent_config.take().ok_or_else(|| anyhow::anyhow!("Agent already spawned or not initialized"))?;
        let text_owned = text.to_string();

        // Spawn the agent and get the transport
        let transport = Stdio::spawn(agent_config)?;

        // Create the client-side connection
        // ClientSideConnection::new(transport, handler)
        let (connection, driver) = ClientSideConnection::new(transport, ConstructAcpClient);

        // Run the driver in the background
        let _driver_handle = tokio::spawn(driver);

        // 1. Initialize
        connection.initialize(InitializeRequest::new(
            ProtocolVersion::V1,
            self.client_name.clone(),
            "0.1.0".to_string(),
        )).await?;

        // 2. Create Session and Prompt
        let mut session = connection.build_session_cwd().await?;
        session.send_prompt(text_owned)?;

        let response = session.read_to_string().await?;
        Ok(response)
    }

    pub async fn spawn(cli_cmd: &str, args: Vec<&str>, worktree_path: &str) -> Result<Self, String> {
        Ok(Self::new(cli_cmd, args, worktree_path))
    }

    pub async fn initialize(&mut self) -> Result<(), String> {
        Ok(())
    }

    pub async fn run_headless(cli_cmd: &str, args: Vec<&str>, worktree_path: &str) -> Result<String, String> {
        let mut session = Self::new(cli_cmd, args, worktree_path);
        session.prompt("").await.map_err(|e| e.to_string())
    }
}
