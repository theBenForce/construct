import ReactDiffViewer from 'react-diff-viewer-continued';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  Button,
  ScrollArea
} from "@construct/components";

interface DiffViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diff: string;
  onApprove: () => void;
  onReject: () => void;
}

export function DiffViewerDialog({ open, onOpenChange, diff, onApprove, onReject }: DiffViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Changes</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 border rounded-md mt-4">
          {diff ? (
            <ReactDiffViewer 
              oldValue="" 
              newValue={diff} 
              splitView={false} 
              useDarkTheme={true}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">No changes detected.</div>
          )}
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onReject}>Reject & Clean Up</Button>
          <Button onClick={onApprove}>Approve & Commit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
