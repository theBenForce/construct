CREATE TABLE agent_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  ticket_id INTEGER NOT NULL,
  task_type TEXT NOT NULL, -- 'initial_assignment', 'user_message'
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents (id),
  FOREIGN KEY (ticket_id) REFERENCES tickets (id)
);
