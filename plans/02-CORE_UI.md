# Phase 2: Core UI & Entity Management

## Goal
Build a responsive desktop interface to manage the application's core entities (Workspaces, Projects, Agents, Tickets).

## Technical Specifications
- **Database Service:** A frontend abstraction layer (`services/database.ts`) interacting with the Tauri SQL plugin.
- **Layout:** A two-pane design with a Workspace sidebar and a dynamic main content area.
- **State Management:** React `useState` and `useEffect` for managing active workspace data and refreshes.
- **Component Strategy:** Shared UI components in `packages/components`, domain-specific dialogs in `apps/frontend/src/components`.

## Key Components
- **Sidebar:** Workspace selector with "Add Workspace" inline functionality.
- **Dashboard:** Tabbed view for Projects, Agents, and Tickets.
- **AddProjectDialog:** Captures repo URL, local path, and init commands.
- **AddAgentDialog:** Configures CLI types and manager assignments.
- **AddTicketDialog:** Handles task definition and agent assignment.

## Tasks
- [x] Implement frontend database service with CRUD methods.
- [x] Build the main application layout and sidebar.
- [x] Implement the Projects dashboard view.
- [x] Implement the Agents dashboard view.
- [x] Implement the Tickets dashboard view.
- [x] Build modular dialog components for all entities.
- [x] Implement state-driven data refreshing after additions.
