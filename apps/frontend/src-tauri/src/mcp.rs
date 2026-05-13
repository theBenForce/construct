use rmcp::{handler::server::wrapper::Parameters, schemars, tool, tool_router};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;
use axum::{Router, routing::get, response::Sse, response::sse::Event};
use futures::stream::{self, Stream, StreamExt};
use std::convert::Infallible;

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

#[derive(Clone)]
pub struct McpState {
    pub pool: SqlitePool,
    pub workspace_id: i32,
}

#[derive(Clone)]
pub struct McpServer {
    state: Arc<McpState>,
}

#[tool_router(server_handler)]
impl McpServer {
    #[tool(description = "List tickets for the current workspace")]
    async fn list_tickets(&self, Parameters(params): Parameters<ListTicketsParams>) -> String {
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
            Ok(rows) => serde_json::to_string(&rows).unwrap_or_else(|_| "Error serializing tickets".to_string()),
            Err(e) => format!("Error fetching tickets: {}", e),
        }
    }

    #[tool(description = "Update the status of a ticket")]
    async fn update_ticket_status(&self, Parameters(params): Parameters<UpdateTicketStatusParams>) -> String {
        let result = sqlx::query("UPDATE tickets SET status = ? WHERE id = ? AND workspace_id = ?")
            .bind(&params.status)
            .bind(params.ticket_id)
            .bind(self.state.workspace_id)
            .execute(&self.state.pool)
            .await;

        match result {
            Ok(_) => format!("Ticket {} status updated to {}", params.ticket_id, params.status),
            Err(e) => format!("Error updating ticket: {}", e),
        }
    }

    #[tool(description = "Send a prompt to another agent")]
    async fn talk_to_agent(&self, Parameters(params): Parameters<TalkToAgentParams>) -> String {
        let agent = sqlx::query_as::<_, AgentRow>("SELECT acp_id FROM agents WHERE id = ? AND workspace_id = ?")
            .bind(params.agent_id)
            .bind(self.state.workspace_id)
            .fetch_optional(&self.state.pool)
            .await;

        match agent {
            Ok(Some(row)) => {
                let mut session = match rust_acp::AgentSession::spawn(&row.acp_id, &params.worktree_path).await {
                    Ok(s) => s,
                    Err(e) => return format!("Error spawning agent: {}", e),
                };
                
                match session.prompt(&params.prompt).await {
                    Ok(response) => response,
                    Err(e) => format!("Error from agent: {}", e),
                }
            }
            Ok(None) => "Agent not found".to_string(),
            Err(e) => format!("Error fetching agent: {}", e),
        }
    }
}

#[derive(sqlx::FromRow, Serialize)]
struct TicketRow {
    id: i32,
    title: String,
    status: String,
    priority: String,
}

#[derive(sqlx::FromRow)]
struct AgentRow {
    acp_id: String,
}

pub async fn run_mcp_server(pool: SqlitePool, workspace_id: i32, port_sender: tokio::sync::oneshot::Sender<u16>) -> anyhow::Result<()> {
    let state = Arc::new(McpState { pool, workspace_id });
    let server = McpServer { state: state.clone() };

    let app = Router::new()
        .route("/sse", get(sse_handler))
        .with_state(server);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();
    let _ = port_sender.send(port);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn sse_handler() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    // This is a placeholder for the actual rmcp SSE transport integration.
    // rmcp usually handles the protocol framing.
    let stream = stream::repeat_with(|| Ok(Event::default())).take(1);
    Sse::new(stream)
}
