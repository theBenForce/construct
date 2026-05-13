CREATE TABLE workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  repo_url TEXT,
  local_path TEXT NOT NULL,
  init_commands TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
);

CREATE TABLE agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  backend_type TEXT NOT NULL,
  cli_path TEXT,
  manager_agent_id INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
  FOREIGN KEY (manager_agent_id) REFERENCES agents (id)
);

CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_agent_id INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (id),
  FOREIGN KEY (project_id) REFERENCES projects (id),
  FOREIGN KEY (assigned_agent_id) REFERENCES agents (id)
);
