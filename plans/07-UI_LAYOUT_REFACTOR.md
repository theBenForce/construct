# Phase 7: UI Layout Refactor

## Goal
Redesign the main application layout to improve navigation hierarchy. Workspace selection will move to a dropdown at the top-left, and the primary entities (Projects, Agents, Tickets) will become the main navigation items in the left sidebar.

## Technical Specifications
- **Workspace Dropdown:** A `Select` or custom `DropdownMenu` component at the top of the sidebar. It should display the active workspace and allow selecting other workspaces or creating a new one.
- **Sidebar Navigation:** A vertical list of navigation items (Projects, Agents, Tickets) with clear active state styling.
- **Main Content Area:** Displays the content based on the selected sidebar item. The header will now reflect the active section (e.g., "Projects") rather than the active workspace, and will house the primary action button for that section.

## Key Changes
1. **Sidebar (`aside`):**
   - **Header:** Workspace dropdown + settings button.
   - **Navigation:** Links for Projects, Agents, and Tickets.
2. **Main Content (`main`):**
   - **Header:** Update to show the active section name and its primary action (e.g., "Add Project").
   - Remove the old tab buttons from the header.
3. **Workspace Management:**
   - Integrate the "Add Workspace" input/button alongside the dropdown, or as a specific action within the dropdown menu.

## Tasks
- [x] Implement the `WorkspaceSelector` dropdown in the top-left sidebar.
- [x] Move the `activeTab` state logic to drive the new sidebar navigation list.
- [x] Refactor `App.tsx` layout structure: remove old header tabs and move action buttons to the new section headers.
- [x] Adapt the "Add Workspace" functionality to fit seamlessly into the new dropdown UI.
