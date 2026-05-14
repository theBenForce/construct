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
  status: "open" | "researching" | "planning" | "in_progress" | "review" | "done" | "cancelled";
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

export async function updateTicketStatus(ticketId: number, status: Ticket["status"]) {
  const database = await getDb();
  return database.execute(
    "UPDATE tickets SET status = ? WHERE id = ?",
    [status, ticketId],
  );
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  role: "user" | "agent" | "system";
  content: string;
  agent_id: number | null;
  created_at: string;
}

export async function getTicketMessages(
  ticketId: number,
): Promise<TicketMessage[]> {
  const database = await getDb();
  return database.select<TicketMessage[]>(
    "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC",
    [ticketId],
  );
}

export async function createTicketMessage(
  message: Omit<TicketMessage, "id" | "created_at">,
) {
  const database = await getDb();
  return database.execute(
    "INSERT INTO ticket_messages (ticket_id, role, content, agent_id) VALUES (?, ?, ?, ?)",
    [message.ticket_id, message.role, message.content, message.agent_id],
  );
}

export interface AgentQueueItem {
  id: number;
  agent_id: number;
  ticket_id: number;
  task_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export async function getAgentQueue(workspaceId: number): Promise<AgentQueueItem[]> {
  const database = await getDb();
  return database.select<AgentQueueItem[]>(
    "SELECT aq.* FROM agent_queue aq JOIN agents a ON aq.agent_id = a.id WHERE a.workspace_id = ? ORDER BY aq.created_at DESC",
    [workspaceId]
  );
}