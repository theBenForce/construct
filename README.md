# Construct 🏗️

Construct is a desktop application built with Tauri and React that orchestrates AI agents (Gemini, Claude, Cursor) to work on your software projects in isolated Git environments.

## Architecture Highlights

- **Monorepo:** Managed with [Turborepo](https://turbo.build/) and [pnpm](https://pnpm.io/).
- **Frontend:** [Tauri v2](https://tauri.app/) with React 19, Tailwind CSS v3, and Shadcn UI.
- **Backend:** Modular Rust crates for Git worktree management and the Agent Client Protocol (ACP).
- **Database:** Local SQLite with automatic migrations.
- **Isolation:** AI agents perform work in dedicated `git worktrees` to keep your main branch clean.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or later recommended)
- **pnpm** (v10 or later)
- **Rust** (v1.82+ recommended) - We recommend using [mise](https://mise.jdx.dev/) to manage your toolchains.
- **Tauri Prerequisites:** Follow the [official guide](https://tauri.app/start/prerequisites/) for your operating system.

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/construct.git
cd construct
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Setup Toolchains (using mise)
If you have `mise` installed, you can use the following to ensure you have the correct versions:
```bash
mise use rust@latest -g
```

### 4. Run the Application in Development Mode
This will start the Vite frontend and the Tauri Rust backend in watch mode.
```bash
pnpm dev
```

## Project Structure

- `apps/frontend`: The main Tauri/React application.
- `packages/components`: Shared Shadcn UI component library.
- `packages/rust-git`: Modular Rust crate for Git worktree and diff operations.
- `packages/rust-acp`: Modular Rust crate for the Agent Client Protocol (JSON-RPC over stdio).
- `plans/`: Detailed technical specifications for each development phase.

## Common Developer Commands

- **Build all packages:** `pnpm build`
- **Lint code:** `pnpm lint`
- **Clean builds:** `pnpm clean` (if configured in package.json)
- **Rust check:** `cd apps/frontend/src-tauri && cargo check`

## Agent Configuration

To use the agents, ensure their respective CLIs are installed and available in your `$PATH`:
- **Gemini CLI:** `gemini`
- **Claude Code:** `claude`
- **Cursor Agent:** `cursor-agent`

## License

ISC License. See `LICENSE` for details.
# construct
