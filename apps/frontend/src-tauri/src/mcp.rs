use rmcp::{
    handler::server::{wrapper::Parameters},
    model::*,
    schemars, tool, tool_handler, tool_router,
    transport::streamable_http_server::{
        session::local::LocalSessionManager,
        StreamableHttpService,
    },
    ServerHandler,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;
use axum::Router;

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct ListTicketsParams {
    /// Optional project ID to filter tickets
    pub project_id: Option<i32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct UpdateTicketStatusParams {
    pub ticket_id: i32,
    pub status: String,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct TalkToAgentParams {
    pub agent_id: i32,
    pub prompt: String,
    pub worktree_path: String,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct CreateAgentParams {
    pub name: String,
    pub acp_id: String,
    pub manager_agent_id: Option<i32>,
    pub system_prompt: Option<String>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct CreateTicketParams {
    pub project_id: i32,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub assigned_agent_id: Option<i32>,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct AssignTicketParams {
    pub ticket_id: i32,
    pub agent_id: i32,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
pub struct ListAgentsParams {
    pub manager_agent_id: Option<i32>,
}

#[derive(Clone)]
pub struct McpState {
    pub pool: SqlitePool,
    pub workspace_id: i32,
    pub port: u16,
}

#[derive(Clone)]
pub struct McpServer {
    state: Arc<McpState>,
}

impl McpServer {
    fn mcp_ok(&self, data: impl Serialize) -> CallToolResult {
        let text = serde_json::to_string(&data).unwrap_or_default();
        CallToolResult::structured(serde_json::json!({
            "status": "success",
            "data": text,
            "outcome": {
                "status": "success",
                "data": text
            }
        }))
    }

    fn mcp_msg(&self, msg: impl Into<String>) -> CallToolResult {
        let msg = msg.into();
        CallToolResult::structured(serde_json::json!({
            "status": "success",
            "message": msg,
            "outcome": {
                "status": "success",
                "message": msg
            }
        }))
    }

    fn mcp_err(&self, msg: impl ToString) -> CallToolResult {
        let msg = msg.to_string();
        CallToolResult::structured_error(serde_json::json!({
            "status": "error",
            "error": msg,
            "outcome": {
                "status": "error",
                "error": msg
            }
        }))
    }
}

#[tool_router]
impl McpServer {
    #[tool(description = "List tickets for the current workspace")]
    async fn list_tickets(&self, Parameters(params): Parameters<ListTicketsParams>) -> CallToolResult {
        let mut query = "SELECT id, title, status, priority FROM tickets WHERE workspace_id = ?".to_string();
        if params.project_id.is_some() {
            query.push_str(" AND project_id = ?");
        }

        let tickets = if let Some(project_id) = params.project_id {
            sqlx::query_as::<_, TicketRow>(&query)
                .bind(self.state.workspace_id)
                .bind(project_id)
                .fetch_all(&self.state.pool)
                .await
        } else {
            sqlx::query_as::<_, TicketRow>(&query)
                .bind(self.state.workspace_id)
                .fetch_all(&self.state.pool)
                .await
        };

        match tickets {
            Ok(rows) => self.mcp_ok(&rows),
            Err(e) => self.mcp_err(e),
        }
    }

    #[tool(description = "Update the status of a ticket")]
    async fn update_ticket_status(&self, Parameters(params): Parameters<UpdateTicketStatusParams>) -> CallToolResult {
        let result = sqlx::query("UPDATE tickets SET status = ? WHERE id = ? AND workspace_id = ?")
            .bind(&params.status)
            .bind(params.ticket_id)
            .bind(self.state.workspace_id)
            .execute(&self.state.pool)
            .await;

        match result {
            Ok(_) => self.mcp_msg(format!("Ticket {} status updated to {}", params.ticket_id, params.status)),
            Err(e) => self.mcp_err(e),
        }
    }

    #[tool(description = "Send a prompt to another agent")]
    async fn talk_to_agent(&self, Parameters(params): Parameters<TalkToAgentParams>) -> CallToolResult {
        let agent = sqlx::query_as::<_, AgentRow>("SELECT id, name, acp_id, manager_agent_id, system_prompt FROM agents WHERE id = ? AND workspace_id = ?")
            .bind(params.agent_id)
            .bind(self.state.workspace_id)
            .fetch_optional(&self.state.pool)
            .await;

        match agent {
            Ok(Some(row)) => {
                let mut session = match rust_acp::AgentSession::spawn(&row.acp_id, &params.worktree_path).await {
                    Ok(s) => s,
                    Err(e) => return self.mcp_err(format!("Error spawning agent: {}", e)),
                };
                
                // Set system prompt if available
                if let Some(prompt) = row.system_prompt {
                    session = session.with_system_prompt(&prompt);
                }

                // Connect the agent to our local MCP server
                let mcp_server = agent_client_protocol::schema::McpServer::Sse(
                    agent_client_protocol::schema::McpServerSse::new(
                        "Construct Local",
                        format!("http://localhost:{}/mcp", self.state.port)
                    )
                );
                session = session.with_mcp_server(mcp_server);
                
                match session.prompt(&params.prompt).await {
                    Ok(response) => self.mcp_msg(response),
                    Err(e) => self.mcp_err(format!("Error from agent: {}", e)),
                }
            }
            Ok(None) => self.mcp_err("Agent not found"),
            Err(e) => self.mcp_err(e),
        }
    }

    #[tool(description = "Create a new agent in the workspace")]
    async fn create_agent(&self, Parameters(params): Parameters<CreateAgentParams>) -> CallToolResult {
        let result = sqlx::query("INSERT INTO agents (workspace_id, name, acp_id, manager_agent_id, system_prompt) VALUES (?, ?, ?, ?, ?)")
            .bind(self.state.workspace_id)
            .bind(&params.name)
            .bind(&params.acp_id)
            .bind(params.manager_agent_id)
            .bind(&params.system_prompt)
            .execute(&self.state.pool)
            .await;

        match result {
            Ok(res) => self.mcp_msg(format!("Agent created with ID {}", res.last_insert_rowid())),
            Err(e) => self.mcp_err(e),
        }
    }

    #[tool(description = "Create a new ticket in the workspace")]
    async fn create_ticket(&self, Parameters(params): Parameters<CreateTicketParams>) -> CallToolResult {
        let result = sqlx::query("INSERT INTO tickets (workspace_id, project_id, title, description, priority, status, assigned_agent_id) VALUES (?, ?, ?, ?, ?, 'open', ?)")
            .bind(self.state.workspace_id)
            .bind(params.project_id)
            .bind(&params.title)
            .bind(&params.description)
            .bind(&params.priority)
            .bind(params.assigned_agent_id)
            .execute(&self.state.pool)
            .await;

        match result {
            Ok(res) => self.mcp_msg(format!("Ticket created with ID {}", res.last_insert_rowid())),
            Err(e) => self.mcp_err(e),
        }
    }

    #[tool(description = "Assign a ticket to an agent")]
    async fn assign_ticket(&self, Parameters(params): Parameters<AssignTicketParams>) -> CallToolResult {
        let result = sqlx::query("UPDATE tickets SET assigned_agent_id = ? WHERE id = ? AND workspace_id = ?")
            .bind(params.agent_id)
            .bind(params.ticket_id)
            .bind(self.state.workspace_id)
            .execute(&self.state.pool)
            .await;

        match result {
            Ok(_) => self.mcp_msg(format!("Ticket {} assigned to agent {}", params.ticket_id, params.agent_id)),
            Err(e) => self.mcp_err(e),
        }
    }

    #[tool(description = "List agents in the workspace")]
    async fn list_agents(&self, Parameters(params): Parameters<ListAgentsParams>) -> CallToolResult {
        let mut query = "SELECT id, name, acp_id, manager_agent_id FROM agents WHERE workspace_id = ?".to_string();
        if params.manager_agent_id.is_some() {
            query.push_str(" AND manager_agent_id = ?");
        }

        let agents = if let Some(manager_id) = params.manager_agent_id {
            sqlx::query_as::<_, AgentRow>(&query)
                .bind(self.state.workspace_id)
                .bind(manager_id)
                .fetch_all(&self.state.pool)
                .await
        } else {
            sqlx::query_as::<_, AgentRow>(&query)
                .bind(self.state.workspace_id)
                .fetch_all(&self.state.pool)
                .await
        };

        match agents {
            Ok(rows) => self.mcp_ok(&rows),
            Err(e) => self.mcp_err(e),
        }
    }
}

#[tool_handler]
impl ServerHandler for McpServer {
    fn get_info(&self) -> ServerInfo {
        let mut info = ServerInfo::default();
        info.protocol_version = ProtocolVersion::LATEST;
        info.capabilities = ServerCapabilities::builder()
            .enable_tools()
            .build();
        
        let mut impl_info = Implementation::default();
        impl_info.name = "Construct".into();
        impl_info.version = "0.1.0".into();
        
        info.server_info = impl_info;
        info
    }
}

#[derive(sqlx::FromRow, Serialize)]
struct TicketRow {
    id: i32,
    title: String,
    status: String,
    priority: String,
}

#[derive(sqlx::FromRow, Serialize)]
struct AgentRow {
    id: i32,
    name: String,
    acp_id: String,
    manager_agent_id: Option<i32>,
    system_prompt: Option<String>,
}

pub async fn run_mcp_server(pool: SqlitePool, workspace_id: i32, port_sender: tokio::sync::oneshot::Sender<u16>) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();
    let _ = port_sender.send(port);

    let state = Arc::new(McpState { pool, workspace_id, port: port });

    let mcp_service = StreamableHttpService::new(
        move || Ok(McpServer { state: state.clone() }),
        LocalSessionManager::default().into(),
        Default::default(),
    );

    let app = Router::new()
        .nest_service("/mcp", mcp_service);

    axum::serve(listener, app).await?;

    Ok(())
}
