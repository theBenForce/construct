mod mcp;

use tauri_plugin_sql::{Migration, MigrationKind};
use sqlx::sqlite::SqlitePoolOptions;
use tauri::Manager;

struct McpPort(u16);

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn create_worktree(repo_path: String, ticket_id: String) -> Result<String, String> {
    rust_git::create_worktree(&repo_path, &ticket_id)
}

#[tauri::command]
async fn remove_worktree(repo_path: String, ticket_id: String) -> Result<(), String> {
    rust_git::remove_worktree(&repo_path, &ticket_id)
}

#[tauri::command]
async fn get_diff(worktree_path: String) -> Result<String, String> {
    rust_git::get_diff(&worktree_path)
}

#[tauri::command]
async fn run_init_commands(worktree_path: String, commands: String) -> Result<(), String> {
    rust_git::run_init_commands(&worktree_path, &commands)
}

#[tauri::command]
async fn run_agent(
    acp_id: String,
    worktree_path: String,
    prompt: String,
    _workspace_id: i32,
    _pool: tauri::State<'_, sqlx::SqlitePool>,
    mcp_port: tauri::State<'_, McpPort>,
) -> Result<String, String> {
    let mut session = rust_acp::AgentSession::spawn(&acp_id, &worktree_path).await?;
    
    // Connect the agent to our local MCP server using the dynamic port
    let mcp_server = agent_client_protocol::schema::McpServer::Sse(
        agent_client_protocol::schema::McpServerSse::new(
            "Construct Local",
            format!("http://localhost:{}/sse", mcp_port.0)
        )
    );
    
    session = session.with_mcp_server(mcp_server);
    session.initialize().await?;
    session.prompt(&prompt).await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: include_str!("../migrations/1.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add acp_id to agents",
            sql: include_str!("../migrations/2.sql"),
            kind: MigrationKind::Up,
        }
    ];

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:construct.db", migrations)
                .build(),
        );

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    builder
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            tauri::async_runtime::spawn(async move {
                // Initialize sqlx pool for MCP server (sharing the same file)
                let db_path = app_handle.path().app_data_dir().unwrap().join("construct.db");
                let pool = SqlitePoolOptions::new()
                    .max_connections(5)
                    .connect(&format!("sqlite:{}", db_path.display()))
                    .await
                    .expect("Failed to connect to database");

                app_handle.manage(pool.clone());

                let (port_tx, port_rx) = tokio::sync::oneshot::channel();

                // Start MCP Server on a random port
                // For now, we hardcode workspace_id 1 as default
                let mcp_pool = pool.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = mcp::run_mcp_server(mcp_pool, 1, port_tx).await {
                        eprintln!("MCP Server error: {}", e);
                    }
                });

                if let Ok(port) = port_rx.await {
                    app_handle.manage(McpPort(port));
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            create_worktree,
            remove_worktree,
            get_diff,
            run_init_commands,
            run_agent
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
