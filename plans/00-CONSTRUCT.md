# Construct Implementation Plans

## Phase 1: Project Initialization & Database Setup
- [x] Scaffold Turborepo workspace with `pnpm`.
- [x] Setup `pnpm-workspace.yaml` with named catalogs for dependency management.
- [x] Create `apps/frontend` (Tauri + React + Vite).
- [x] Create `packages/components` (Shared Shadcn UI library).
- [x] Create `packages/rust-git` and `packages/rust-acp` for modular backend logic.
- [x] Integrate `tauri-plugin-sql` (SQLite) and implement Rust-based migrations.
- [x] Configure Tailwind CSS v3 and Shadcn UI.

## Phase 2: Core UI & Entity Management
- [x] Implement `database.ts` service in the frontend for CRUD operations.
- [x] Build Sidebar with Workspace (Cluster) selection and navigation.
- [x] Build Dashboard views for Projects, Agents, and Tickets.
- [x] Create modular dialogs: `AddProjectDialog`, `AddAgentDialog`, `AddTicketDialog`, and `AddWorkspaceDialog`.
- [x] Implement state management for active workspace and data refreshing.

## Phase 3: Git Operations & Worktree Management
- [x] Implement modular `rust-git` package.
- [x] Logic for `git worktree add` and `git worktree remove`.
- [x] Logic for `git diff` extraction from worktrees.
- [x] Logic for executing project initialization commands in the worktree.
- [x] Expose Git operations as Tauri commands.

## Phase 4: Agent Orchestrator (ACP)
- [x] Implement modular `rust-acp` package.
- [x] Build JSON-RPC client over `stdio` for the Agent Client Protocol.
- [x] Implement `AgentSession` with `initialize` and `prompt` methods.
- [x] Add headless execution fallback for non-ACP agents (like Claude Code V1).
- [x] Expose `run_agent` as a Tauri command.

## Phase 5: Code Review & Diff Viewer
- [x] Integrate `react-diff-viewer-continued` in the frontend.
- [x] Implement `DiffViewerDialog` for change review.
- [x] Connect the end-to-end workflow: Create Worktree -> Init -> Run Agent -> Show Diff.
- [ ] Implement Approve & Commit logic.
- [ ] Implement Reject & Cleanup logic.

## Phase 6: Manager Agent & Automation (V2)
- [ ] Implement Manager agent logic to automatically assign tickets to sub-agents.
- [ ] Implement JSON Schema output parsing for assignment decisions.
- [ ] Build UI for manager-to-agent relationship mapping.

## Phase 7: UI Layout Refactor
- [x] Move Workspace selection to a top-left dropdown.
- [x] Move Projects, Agents, and Tickets navigation to the left sidebar.
- [x] Update main content headers to reflect active sidebar selection.

## Phase 8: Markdown Support
- [x] Integrate `react-markdown` and `remark-gfm`.
- [x] Configure Tailwind Typography for chat bubbles.
- [x] Implement markdown rendering for static and streaming agent messages.
