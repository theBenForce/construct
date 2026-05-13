import { useState, useEffect } from "react";
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
import { createAgent, Agent } from "@/services/database";

interface RegistryAgent {
  id: string;
  name: string;
}

interface AddAgentDialogProps {
  workspaceId: number;
  availableAgents: Agent[];
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAgentDialog({
  workspaceId,
  availableAgents,
  onSuccess,
  open,
  onOpenChange,
}: AddAgentDialogProps) {
  const [name, setName] = useState("");
  const [acpId, setAcpId] = useState("");
  const [managerAgentId, setManagerAgentId] = useState<string>("none");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [registry, setRegistry] = useState<RegistryAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && registry.length === 0) {
      setIsLoading(true);
      fetch("https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json")
        .then((res) => res.json())
        .then((data) => {
          setRegistry(data.agents || []);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch registry", err);
          setIsLoading(false);
        });
    }
  }, [open, registry.length]);

  async function handleSubmit() {
    if (!name || !acpId) return;
    await createAgent({
      workspace_id: workspaceId,
      name,
      acp_id: acpId,
      manager_agent_id:
        managerAgentId === "none" ? null : parseInt(managerAgentId),
      system_prompt: systemPrompt || null,
    });
    onSuccess();
    onOpenChange(false);
    setName("");
    setAcpId("");
    setManagerAgentId("none");
    setSystemPrompt("");
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
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend Specialist"
            />
          </div>
          <div className="space-y-2">
            <Label>Agent Type (from Registry)</Label>
            <Select
              value={acpId}
              onValueChange={setAcpId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select agent"} />
              </SelectTrigger>
              <SelectContent>
                {registry.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Charter (Instructions)</Label>
            <textarea
              id="systemPrompt"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. You are the CTO. You report to the CEO. Your goal is to..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !acpId}>
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}