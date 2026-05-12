# Phase 6: Manager Agent & Automation

## Goal
Implement a hierarchical agent architecture where a "Manager" agent analyzes tickets and intelligently delegates them to specialized sub-agents.

## Technical Specifications
- **Manager Execution:** Run a high-capability agent (e.g., Gemini Flash or Claude 3.5) in ACP mode.
- **Schema Enforcement:** Use JSON Schema in the prompt to force the manager to output valid assignment data.
- **Orchestration:** The manager receives a list of available sub-agents and their "descriptions" to make an informed choice.

## Core Logic
1. **Assignment Prompt:** Construct a prompt containing Ticket Details + Available Agents + JSON Output Schema.
2. **Decision Parsing:** Backend parses the Manager's JSON response (e.g., `{"assigned_agent_id": 4}`).
3. **Database Update:** Update the ticket's `assigned_agent_id` in SQLite.
4. **Trigger Workflow:** Optionally trigger the Phase 5 workflow immediately after assignment.

## Tasks
- [ ] Implement the Manager assignment prompt builder.
- [ ] Implement JSON Schema output enforcement logic.
- [ ] Build UI to designate which agents are "Managers" vs. "Workers".
- [ ] Implement the automated assignment workflow triggered by new ticket creation.
- [ ] Build a "Log" view to see the Manager's reasoning for assignments.
