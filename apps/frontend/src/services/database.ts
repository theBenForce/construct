import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb() {
  if (!db) {
    db = await Database.load("sqlite:construct.db");
  }
  return db;
}

export interface Workspace {
  id: number;
  name: string;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const database = await getDb();
  return database.select<Workspace[]>("SELECT * FROM workspaces");
}

export async function createWorkspace(name: string) {
  const database = await getDb();
  return database.execute("INSERT INTO workspaces (name) VALUES (?)", [name]);
}

export interface Project {
  id: number;
  workspace_id: number;
  name: string;
  repo_url: string | null;
  local_path: string;
  init_commands: string | null;
}

export async function getProjects(workspaceId: number): Promise<Project[]> {
  const database = await getDb();
  return database.select<Project[]>(
    "SELECT * FROM projects WHERE workspace_id = ?",
    [workspaceId],
  );
}

export async function createProject(project: Omit<Project, "id">) {
  const database = await getDb();
  return database.execute(
    "INSERT INTO projects (workspace_id, name, repo_url, local_path, init_commands) VALUES (?, ?, ?, ?, ?)",
    [
      project.workspace_id,
      project.name,
      project.repo_url,
      project.local_path,
      project.init_commands,
    ],
  );
}

export interface Agent {
  id: number;
  workspace_id: number;
  name: string;
  acp_id: string;
  manager_agent_id: number | null;
  system_prompt: string | null;
}

export async function getAgents(workspaceId: number): Promise<Agent[]> {
  const database = await getDb();
  return database.select<Agent[]>(
    "SELECT * FROM agents WHERE workspace_id = ?",
    [workspaceId],
  );
}

export async function createAgent(agent: Omit<Agent, "id">) {
  const database = await getDb();
  return database.execute(
    "INSERT INTO agents (workspace_id, name, acp_id, manager_agent_id, system_prompt) VALUES (?, ?, ?, ?, ?)",
    [
      agent.workspace_id,
      agent.name,
      agent.acp_id,
      agent.manager_agent_id,
      agent.system_prompt,
    ],
  );
}

export interface Ticket {
  id: number;
  workspace_id: number;
  project_id: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "review" | "done";
  assigned_agent_id: number | null;
}

export async function getTickets(workspaceId: number): Promise<Ticket[]> {
  const database = await getDb();
  return database.select<Ticket[]>(
    "SELECT * FROM tickets WHERE workspace_id = ?",
    [workspaceId],
  );
}

export async function createTicket(ticket: Omit<Ticket, "id">) {
  const database = await getDb();
  return database.execute(
    "INSERT INTO tickets (workspace_id, project_id, title, description, priority, status, assigned_agent_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      ticket.workspace_id,
      ticket.project_id,
      ticket.title,
      ticket.description,
      ticket.priority,
      ticket.status,
      ticket.assigned_agent_id,
    ],
  );
}