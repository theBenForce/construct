# Phase 5: Code Review & Diff Viewer

## Goal
Empower the user to review, approve, or reject AI-generated code changes within a unified, interactive UI.

## Technical Specifications
- **Library:** `react-diff-viewer-continued` for high-fidelity diff rendering.
- **UI:** `DiffViewerDialog` using Shadcn `Dialog` and `ScrollArea`.
- **Workflow Integration:** Orchestrates Phase 3 (Git) and Phase 4 (Agent) into a single user action.

## Review Workflow
1. User clicks "Start Work" on a ticket.
2. App creates worktree and runs init commands.
3. App executes the assigned agent in the worktree.
4. App fetches the resulting diff.
5. `DiffViewerDialog` opens automatically for user review.

## Tasks
- [x] Integrate diff viewer library in the frontend.
- [x] Build the `DiffViewerDialog` component.
- [x] Connect the "Start Work" button to the end-to-end Rust workflow.
- [ ] Implement **Approve & Commit**: Logic to commit the worktree changes and push to origin.
- [ ] Implement **Reject & Cleanup**: Logic to discard changes and delete the worktree.
- [ ] Implement **Persistent Review State**: Track which tickets have pending reviews in the database.
