use tauri_plugin_sql::{Migration, MigrationKind};

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
    prompt: String
) -> Result<String, String> {
    let mut session = rust_acp::AgentSession::spawn(&acp_id, &worktree_path).await?;
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
