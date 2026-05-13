use std::path::Path;
use git2::{Repository, WorktreeAddOptions, BranchType, DiffOptions, DiffFormat};

pub fn create_worktree(repo_path: &str, ticket_id: &str) -> Result<String, String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;
    let worktree_dir = Path::new(repo_path).join(".construct").join(ticket_id);
    let branch_name = format!("construct/ticket-{}", ticket_id);

    if worktree_dir.exists() {
        return Ok(worktree_dir.to_string_lossy().to_string());
    }

    if let Some(parent) = worktree_dir.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    // Create branch if it doesn't exist
    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;

    let branch = match repo.find_branch(&branch_name, BranchType::Local) {
        Ok(b) => b,
        Err(_) => repo.branch(&branch_name, &commit, false).map_err(|e| e.to_string())?,
    };

    let mut opts = WorktreeAddOptions::new();
    opts.reference(Some(branch.get()));

    repo.worktree(ticket_id, &worktree_dir, Some(&opts))
        .map_err(|e| e.to_string())?;

    Ok(worktree_dir.to_string_lossy().to_string())
}

pub fn remove_worktree(repo_path: &str, ticket_id: &str) -> Result<(), String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;
    let worktree_dir = Path::new(repo_path).join(".construct").join(ticket_id);

    if worktree_dir.exists() {
        std::fs::remove_dir_all(&worktree_dir).map_err(|e| e.to_string())?;
    }

    if let Ok(wt) = repo.find_worktree(ticket_id) {
        let mut opts = git2::WorktreePruneOptions::new();
        // Since we deleted the directory, the worktree is no longer valid.
        // Pruning will clean up the metadata in .git/worktrees/
        wt.prune(Some(&mut opts)).map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub fn get_diff(worktree_path: &str) -> Result<String, String> {
    let repo = Repository::open(worktree_path).map_err(|e| e.to_string())?;
    let mut diff_opts = DiffOptions::new();
    let diff = repo.diff_index_to_workdir(None, Some(&mut diff_opts)).map_err(|e| e.to_string())?;

    let mut patch = String::new();
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        let origin = line.origin();
        match origin {
            '+' | '-' | ' ' => patch.push(origin),
            _ => {}
        }
        patch.push_str(std::str::from_utf8(line.content()).unwrap_or(""));
        true
    }).map_err(|e| e.to_string())?;

    Ok(patch)
}

pub fn run_init_commands(worktree_path: &str, commands: &str) -> Result<(), String> {
    use std::process::Command;

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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use git2::Signature;

    fn setup_repo(dir: &Path) -> Repository {
        let repo = Repository::init(dir).unwrap();
        let sig = Signature::now("Test User", "test@example.com").unwrap();

        {
            // Initial empty commit
            let mut index = repo.index().unwrap();
            let tree_id = index.write_tree().unwrap();
            let tree = repo.find_tree(tree_id).unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[]).unwrap();
        }

        {
            // Add a tracked file
            std::fs::write(dir.join("tracked.txt"), "original content\n").unwrap();
            let mut index = repo.index().unwrap();
            index.add_path(Path::new("tracked.txt")).unwrap();
            index.write().unwrap();
            let tree_id = index.write_tree().unwrap();
            let tree = repo.find_tree(tree_id).unwrap();
            let parent = repo.head().unwrap().peel_to_commit().unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, "Add tracked.txt", &tree, &[&parent]).unwrap();
        }

        repo
    }
    #[test]
    fn test_worktree_lifecycle() {
        let temp = TempDir::new().unwrap();
        let repo_path = temp.path().to_str().unwrap();
        setup_repo(temp.path());

        let ticket_id = "test-ticket";
        let wt_path = create_worktree(repo_path, ticket_id).expect("Failed to create worktree");

        assert!(Path::new(&wt_path).exists());

        // Verify diff is empty initially
        let diff = get_diff(&wt_path).expect("Failed to get diff");
        assert!(diff.is_empty(), "Diff should be empty but was: {}", diff);

        // Modify tracked file and verify diff
        std::fs::write(Path::new(&wt_path).join("tracked.txt"), "modified content\n").unwrap();
        let diff = get_diff(&wt_path).expect("Failed to get diff after modification");
        assert!(diff.contains("-original content"));
        assert!(diff.contains("+modified content"));

        // Remove worktree
        remove_worktree(repo_path, ticket_id).expect("Failed to remove worktree");
        assert!(!Path::new(&wt_path).exists());

        // Verify git metadata is cleaned up (find_worktree should fail)
        let repo = Repository::open(repo_path).unwrap();
        assert!(repo.find_worktree(ticket_id).is_err());
    }
}
