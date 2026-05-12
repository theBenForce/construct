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
  SelectItem
} from "@construct/components";
import { createAgent, Agent } from "../services/database";

interface AddAgentDialogProps {
  workspaceId: number;
  availableAgents: Agent[];
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAgentDialog({ workspaceId, availableAgents, onSuccess, open, onOpenChange }: AddAgentDialogProps) {
  const [name, setName] = useState("");
  const [backendType, setBackendType] = useState<"gemini" | "claude" | "cursor">("gemini");
  const [cliPath, setCliPath] = useState("");
  const [managerAgentId, setManagerAgentId] = useState<string>("none");

  async function handleSubmit() {
    if (!name) return;
    await createAgent({
      workspace_id: workspaceId,
      name,
      backend_type: backendType,
      cli_path: cliPath || null,
      manager_agent_id: managerAgentId === "none" ? null : parseInt(managerAgentId)
    });
    onSuccess();
    onOpenChange(false);
    setName("");
    setBackendType("gemini");
    setCliPath("");
    setManagerAgentId("none");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frontend Specialist" />
          </div>
          <div className="space-y-2">
            <Label>Backend Type</Label>
            <Select value={backendType} onValueChange={(v: any) => setBackendType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini CLI</SelectItem>
                <SelectItem value="claude">Claude Code</SelectItem>
                <SelectItem value="cursor">Cursor Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli">CLI Command/Path (Optional)</Label>
            <Input id="cli" value={cliPath} onChange={(e) => setCliPath(e.target.value)} placeholder="e.g. gemini or /path/to/claude" />
          </div>
          <div className="space-y-2">
            <Label>Manager Agent (Optional)</Label>
            <Select value={managerAgentId} onValueChange={setManagerAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {availableAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Agent</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
