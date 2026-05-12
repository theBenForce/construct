# Phase 1: Project Initialization & Database Setup

## Goal
Establish a high-performance monorepo foundation with a modular Rust backend and a persistent data layer.

## Architecture
- **Monorepo:** Turborepo for task orchestration.
- **Package Manager:** `pnpm` with **Named Catalogs** in `pnpm-workspace.yaml` to centralize dependency versions (React, Tailwind, Vite, etc.).
- **Backend:** Modular Rust structure using workspace path dependencies.
  - `packages/rust-git`: For repository operations.
  - `packages/rust-acp`: For Agent Client Protocol communication.
- **Frontend:** Tauri + React 19 + Tailwind CSS v3 + Shadcn UI.
- **Database:** SQLite via `tauri-plugin-sql` with embedded migrations.

## Core Entities (Schema)
- `workspaces`: Container for grouping projects and agents.
- `projects`: Git repo details and local paths.
- `agents`: Backend configurations (Gemini, Claude, Cursor).
- `tickets`: Tasks assigned to projects and agents.

## Tasks
- [x] Initialize pnpm workspace and Turborepo.
- [x] Configure named catalogs for version consistency.
- [x] Scaffold `apps/frontend` using the Tauri React template.
- [x] Scaffold `packages/components` for shared Shadcn components.
- [x] Create modular Rust crates in `packages/`.
- [x] Integrate SQLite and write initial migration (`1.sql`).
- [x] Verify full workspace build pipeline.
