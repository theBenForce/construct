import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from "react";
import {
  Button,
  Card,
  Badge,
} from "@construct/components";
import {
  Users,
  Folder,
  Play,
  Eye,
} from "lucide-react";
import { useAppContext } from './__root'
import { invoke } from "@tauri-apps/api/core";
import { Ticket } from "@/services/database";

export const Route = createFileRoute('/tickets/')({
  component: TicketsView,
})

function TicketsView() {
  const { tickets, projects, agents, activeWorkspace } = useAppContext();
  const [isWorking, setIsWorking] = useState(false);
  const navigate = useNavigate();

  async function handleStartWork(ticket: Ticket) {
    const project = projects.find((p) => p.id === ticket.project_id);
    const agent = agents.find((a) => a.id === ticket.assigned_agent_id);

    if (!project || !agent || !activeWorkspace) {
      alert("Project, Agent, or Workspace not found for this ticket.");
      return;
    }

    setIsWorking(true);
    try {
      const worktreePath = await invoke<string>("create_worktree", {
        repoPath: project.local_path,
        ticketId: ticket.id.toString(),
      });

      if (project.init_commands) {
        await invoke("run_init_commands", {
          worktreePath,
          commands: project.init_commands,
        });
      }

      await invoke("run_agent", {
        agentId: agent.id,
        worktreePath,
        prompt: ticket.description || ticket.title,
        workspaceId: activeWorkspace.id,
        ticketId: ticket.id,
      });

      // TODO: Handle diff view after migration or within this component
      alert("Work started successfully!");
    } catch (error) {
      alert("Error during work: " + error);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => {
        const project = projects.find(
          (p) => p.id === ticket.project_id,
        );
        const agent = agents.find(
          (a) => a.id === ticket.assigned_agent_id,
        );

        return (
          <Card key={ticket.id}>
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">
                    {ticket.title}
                  </h3>
                  <Badge
                    className={
                      ticket.priority === "urgent"
                        ? "bg-destructive text-destructive-foreground"
                        : ""
                    }
                  >
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline">{ticket.status}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Folder className="size-3" />
                    {project?.name || "Unknown Project"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="size-3" />
                    {agent?.name || "Unassigned"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/tickets/$ticketId', params: { ticketId: ticket.id.toString() } })}>
                  <Eye className="size-4" />
                </Button>
                <Button
                  size="sm"
                  disabled={isWorking}
                  onClick={() => handleStartWork(ticket)}
                >
                  <Play className="size-3 mr-2" />
                  Start
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
      {tickets.length === 0 && (
        <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          No tickets yet. Create one to start an AI swarm.
        </div>
      )}
    </div>
  );
}
