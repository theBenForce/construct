use std::process::Command;
use std::path::Path;

pub fn create_worktree(repo_path: &str, ticket_id: &str) -> Result<String, String> {
    let repo_path = Path::new(repo_path);
    let worktree_dir = repo_path.join(".construct").join(ticket_id);
    let branch_name = format!("construct/ticket-{}", ticket_id);

    if !repo_path.exists() {
        return Err(format!("Repository path does not exist: {}", repo_path.display()));
    }

    if worktree_dir.exists() {
        return Ok(worktree_dir.to_string_lossy().to_string());
    }

    let construct_dir = repo_path.join(".construct");
    if !construct_dir.exists() {
        std::fs::create_dir_all(&construct_dir).map_err(|e| e.to_string())?;
    }

    let output = Command::new("git")
        .current_dir(repo_path)
        .args([
            "worktree",
            "add",
            "-b",
            &branch_name,
            &worktree_dir.to_string_lossy(),
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(worktree_dir.to_string_lossy().to_string())
}

pub fn remove_worktree(repo_path: &str, ticket_id: &str) -> Result<(), String> {
    let repo_path = Path::new(repo_path);
    let worktree_dir = repo_path.join(".construct").join(ticket_id);

    if !worktree_dir.exists() {
        return Ok(());
    }

    let output = Command::new("git")
        .current_dir(repo_path)
        .args(["worktree", "remove", "--force", &worktree_dir.to_string_lossy()])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}

pub fn get_diff(worktree_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(worktree_path)
        .args(["diff"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn run_init_commands(worktree_path: &str, commands: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let shell = "cmd";
    #[cfg(not(target_os = "windows"))]
    let shell = "sh";

    #[cfg(target_os = "windows")]
    let flag = "/C";
    #[cfg(not(target_os = "windows"))]
    let flag = "-c";

    let output = Command::new(shell)
        .current_dir(worktree_path)
        .args([flag, commands])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(())
}
