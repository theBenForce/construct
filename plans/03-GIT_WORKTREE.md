# Phase 3: Git Operations & Worktree Management

## Goal
Provide a secure and isolated environment for AI agents to perform code modifications using Git worktrees.

## Technical Specifications
- **Isolation Strategy:** Each ticket gets a unique worktree located at `[project-path]/.construct/[ticket-id]`.
- **Package:** `packages/rust-git` (Modular Rust crate).
- **Execution:** Uses `std::process::Command` to trigger Git CLI operations.

## Core Logic
- **`create_worktree`:** Automates `git worktree add -b construct/ticket-ID`.
- **`remove_worktree`:** Handles cleanup with `git worktree remove --force`.
- **`get_diff`:** Extracts the current state of changes from the isolated worktree.
- **`run_init_commands`:** Executes user-defined shell commands (e.g., `pnpm install`) after worktree creation.

## Tasks
- [x] Implement `rust-git` library crate.
- [x] Logic for worktree creation and automatic branching.
- [x] Logic for worktree removal and forced cleanup.
- [x] Logic for retrieving `git diff` output.
- [x] Logic for running project-specific initialization scripts.
- [x] Register and expose all methods as Tauri commands in `lib.rs`.
