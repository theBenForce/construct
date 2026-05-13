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
import { createWorkspace } from "@/services/database";

interface AddWorkspaceDialogProps {
  onSuccess: (newWorkspaceId: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWorkspaceDialog({
  onSuccess,
  open,
  onOpenChange,
}: AddWorkspaceDialogProps) {
  const [name, setName] = useState("");

  async function handleSubmit() {
    if (!name.trim()) return;
    try {
      const result = await createWorkspace(name);
      // @ts-ignore result.lastInsertId exists in Tauri SQL
      onSuccess(result.lastInsertId);
      onOpenChange(false);
      setName("");
    } catch (error) {
      console.error("Failed to create swarm:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Create New Swarm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Swarm Name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Personal Projects"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Swarm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
