import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@construct/components";
import { createTicket, Project, Agent } from "@/services/database";

interface AddTicketDialogProps {
  workspaceId: number;
  projects: Project[];
  agents: Agent[];
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTicketDialog({
  workspaceId,
  projects,
  agents,
  onSuccess,
  open,
  onOpenChange,
}: AddTicketDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [assignedAgentId, setAssignedAgentId] = useState<string>("none");

  async function handleSubmit() {
    if (!title || !projectId) return;
    await createTicket({
      workspace_id: workspaceId,
      project_id: parseInt(projectId),
      title,
      description: description || null,
      priority,
      status: "open",
      assigned_agent_id:
        assignedAgentId === "none" ? null : parseInt(assignedAgentId),
    });
    onSuccess();
    onOpenChange(false);
    setTitle("");
    setDescription("");
    setProjectId("");
    setPriority("medium");
    setAssignedAgentId("none");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Ticket Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the task..."
            />
          </div>
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v: any) => setPriority(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label>Assign Agent (Optional)</Label>
              <Select
                value={assignedAgentId}
                onValueChange={setAssignedAgentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
