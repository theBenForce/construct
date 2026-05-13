CREATE TABLE ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  agent_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets (id),
  FOREIGN KEY (agent_id) REFERENCES agents (id)
);
