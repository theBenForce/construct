mod mcp;

use tauri_plugin_sql::{Migration, MigrationKind};
use sqlx::sqlite::SqlitePoolOptions;
use tauri::{Manager, AppHandle, Emitter};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use serde::{Serialize, Deserialize};
use serde_json;
use sqlx::Row;

struct McpPort(u16);
struct BusyAgents(Arc<Mutex<HashSet<i32>>>);

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct AgentQueueItem {
    id: i32,
    agent_id: i32,
    ticket_id: i32,
    task_type: String,
    status: String,
}

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
async fn run_agent_task(
    app_handle: AppHandle,
    item: AgentQueueItem,
    pool: sqlx::SqlitePool,
    mcp_port: u16,
    busy_agents: Arc<Mutex<HashSet<i32>>>,
) -> Result<(), String> {
    // 1. Mark as processing
    sqlx::query("UPDATE agent_queue SET status = 'processing' WHERE id = ?")
        .bind(item.id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    // 2. Fetch agent and ticket info
    let (acp_id, system_prompt, _workspace_id) = sqlx::query_as::<_, (String, Option<String>, i32)>("SELECT acp_id, system_prompt, workspace_id FROM agents WHERE id = ?")
        .bind(item.agent_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let ticket = sqlx::query("SELECT project_id, title, description FROM tickets WHERE id = ?")
        .bind(item.ticket_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let project_id: i32 = ticket.get("project_id");
    let title: String = ticket.get("title");
    let description: Option<String> = ticket.get("description");

    let project = sqlx::query("SELECT local_path, init_commands FROM projects WHERE id = ?")
        .bind(project_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let local_path: String = project.get("local_path");
    let init_commands: Option<String> = project.get("init_commands");

    // 3. Prepare Worktree
    let worktree_path = rust_git::create_worktree(&local_path, &item.ticket_id.to_string())?;
    
    if let Some(cmds) = init_commands {
        if !cmds.is_empty() {
            rust_git::run_init_commands(&worktree_path, &cmds)?;
        }
    }

    // 4. Prepare Prompt
    let mut final_instructions = system_prompt.unwrap_or_default();
    let context = format!(
        "\n\nCURRENT TICKET CONTEXT:\nTitle: {}\nDescription: {}\n",
        title,
        description.unwrap_or_else(|| "No description provided".to_string())
    );
    final_instructions.push_str(&context);

    // Get the last user message for this ticket
    let last_message = sqlx::query("SELECT content FROM ticket_messages WHERE ticket_id = ? AND role = 'user' ORDER BY created_at DESC LIMIT 1")
        .bind(item.ticket_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let prompt = if item.task_type == "initial_assignment" {
        "Please start working on this ticket.".to_string()
    } else {
        last_message.map(|m| m.get("content")).unwrap_or_else(|| "Please continue working.".to_string())
    };

    // 5. Run Agent Session
    let mut session = rust_acp::AgentSession::spawn(&acp_id, &worktree_path).await?;
    if !final_instructions.is_empty() {
        session = session.with_system_prompt(&final_instructions);
    }

    let ticket_id = item.ticket_id;
    let app_handle_clone = app_handle.clone();
    
    session = session.with_raw_message_callback(move |content, direction| {
        let _ = app_handle_clone.emit(&format!("agent-raw-{}", ticket_id), serde_json::json!({
            "content": content,
            "direction": direction
        }));
    });

    let mcp_server = agent_client_protocol::schema::McpServer::Sse(
        agent_client_protocol::schema::McpServerSse::new(
            "Construct Local",
            format!("http://localhost:{}/mcp", mcp_port)
        )
    );
    
    session = session.with_mcp_server(mcp_server);
    session.initialize().await?;

    let ticket_id = item.ticket_id;
    let app_handle_clone = app_handle.clone();
    
    let response = session.prompt_with_callback(&prompt, Some(move |chunk| {
        let _ = app_handle_clone.emit(&format!("agent-chunk-{}", ticket_id), chunk);
    })).await.map_err(|e| e.to_string())?;

    // 6. Save Agent Response
    sqlx::query("INSERT INTO ticket_messages (ticket_id, role, content, agent_id) VALUES (?, 'agent', ?, ?)")
        .bind(item.ticket_id)
        .bind(&response)
        .bind(item.agent_id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    // 7. Mark as completed
    sqlx::query("UPDATE agent_queue SET status = 'completed' WHERE id = ?")
        .bind(item.id)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    // 8. Emit completed event
    let _ = app_handle.emit(&format!("agent-completed-{}", item.ticket_id), ());

    // 9. Cleanup busy agent
    busy_agents.lock().unwrap().remove(&item.agent_id);

    Ok(())
}

fn start_global_dispatcher(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            eprintln!("[Dispatcher] Checking for pending tasks...");

            let pool = match app_handle.try_state::<sqlx::SqlitePool>() {
                Some(p) => p.inner().clone(),
                None => {
                    eprintln!("[Dispatcher] Error: Database pool not found in state");
                    continue;
                }
            };

            let mcp_port = match app_handle.try_state::<McpPort>() {
                Some(p) => p.0,
                None => {
                    eprintln!("[Dispatcher] Warning: MCP port not yet available");
                    continue;
                }
            };

            let busy_agents = match app_handle.try_state::<BusyAgents>() {
                Some(b) => b.0.clone(),
                None => {
                    eprintln!("[Dispatcher] Error: BusyAgents not found in state");
                    continue;
                }
            };

            // Fetch pending items
            let pending_items = sqlx::query_as::<_, AgentQueueItem>("SELECT id, agent_id, ticket_id, task_type, status FROM agent_queue WHERE status = 'pending' ORDER BY created_at ASC")
                .fetch_all(&pool)
                .await;

            match pending_items {
                Ok(items) => {
                    if !items.is_empty() {
                        eprintln!("[Dispatcher] Found {} pending items", items.len());
                    }
                    for item in items {
                        let is_busy = {
                            let busy = busy_agents.lock().unwrap();
                            busy.contains(&item.agent_id)
                        };

                        if !is_busy {
                            eprintln!("[Dispatcher] Spawning task for agent {} on ticket {}", item.agent_id, item.ticket_id);
                            // Mark as busy and spawn
                            busy_agents.lock().unwrap().insert(item.agent_id);
                            
                            let pool_clone = pool.clone();
                            let busy_clone = busy_agents.clone();
                            let app_handle_clone = app_handle.clone();
                            
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = run_agent_task(app_handle_clone, item, pool_clone, mcp_port, busy_clone).await {
                                    eprintln!("[Dispatcher] Error running agent task: {}", e);
                                }
                            });
                        } else {
                            eprintln!("[Dispatcher] Agent {} is currently busy, skipping task {}", item.agent_id, item.id);
                        }
                    }
                }
                Err(e) => eprintln!("[Dispatcher] Error fetching agent queue: {}", e),
            }
        }
    });
}

#[tauri::command]
async fn enqueue_message(
    agent_id: i32,
    ticket_id: i32,
    content: String,
    pool: tauri::State<'_, sqlx::SqlitePool>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Save user message
    sqlx::query("INSERT INTO ticket_messages (ticket_id, role, content, agent_id) VALUES (?, 'user', ?, ?)")
        .bind(ticket_id)
        .bind(&content)
        .bind(agent_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // 2. Enqueue task
    sqlx::query("INSERT INTO agent_queue (agent_id, ticket_id, task_type, status) VALUES (?, ?, 'user_message', 'pending')")
        .bind(agent_id)
        .bind(ticket_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
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
        },
        Migration {
            version: 3,
            description: "add system_prompt to agents",
            sql: include_str!("../migrations/3.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create ticket_messages table",
            sql: include_str!("../migrations/4.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create agent_queue table",
            sql: include_str!("../migrations/5.sql"),
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
            app.manage(BusyAgents(Arc::new(Mutex::new(HashSet::new()))));
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

                // Start Dispatcher after port is available
                start_global_dispatcher(app_handle.clone());
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            create_worktree,
            remove_worktree,
            get_diff,
            run_init_commands,
            enqueue_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
