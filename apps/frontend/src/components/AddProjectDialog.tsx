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
} from "@construct/components";
import { createProject } from "@/services/database";

interface AddProjectDialogProps {
  workspaceId: number;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProjectDialog({
  workspaceId,
  onSuccess,
  open,
  onOpenChange,
}: AddProjectDialogProps) {
  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [initCommands, setInitCommands] = useState("");

  async function handleSubmit() {
    if (!name || !localPath) return;
    await createProject({
      workspace_id: workspaceId,
      name,
      repo_url: repoUrl || null,
      local_path: localPath,
      init_commands: initCommands || null,
    });
    onSuccess();
    onOpenChange(false);
    setName("");
    setRepoUrl("");
    setLocalPath("");
    setInitCommands("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Awesome App"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo">Git Repository URL (Optional)</Label>
            <Input
              id="repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="path">Local Path</Label>
            <Input
              id="path"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="/Users/me/repos/my-app"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="init">Init Commands (Optional)</Label>
            <Input
              id="init"
              value={initCommands}
              onChange={(e) => setInitCommands(e.target.value)}
              placeholder="pnpm install && pnpm build"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
