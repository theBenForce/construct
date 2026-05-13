import { createRootRoute, Outlet, Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useState, createContext, useContext } from "react";
import {
  getWorkspaces,
  Workspace,
  getProjects,
  Project,
  getAgents,
  Agent,
  getTickets,
  Ticket,
} from "@/services/database";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@construct/components";
import {
  Plus,
  RefreshCw,
  Settings,
  Briefcase,
  Users,
  Ticket as TicketIcon,
  Folder,
} from "lucide-react";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { AddAgentDialog } from "@/components/AddAgentDialog";
import { AddTicketDialog } from "@/components/AddTicketDialog";
import { AddWorkspaceDialog } from "@/components/AddWorkspaceDialog";
import { DiffViewerDialog } from "@/components/DiffViewerDialog";

interface AppContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace | null) => void;
  projects: Project[];
  agents: Agent[];
  tickets: Ticket[];
  loadWorkspaceData: (workspaceId: number) => Promise<void>;
  handleRefresh: () => void;
  setShowAddProject: (show: boolean) => void;
  setShowAddAgent: (show: boolean) => void;
  setShowAddTicket: (show: boolean) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);

  const [showDiff, setShowDiff] = useState(false);
  const [currentDiff] = useState("");

  const state = useRouterState();
  const pathname = state.location.pathname;

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceData(activeWorkspace.id);
    } else {
      setProjects([]);
      setAgents([]);
      setTickets([]);
    }
  }, [activeWorkspace]);

  async function loadWorkspaces(selectId?: number) {
    try {
      const ws = await getWorkspaces();
      setWorkspaces(ws);
      if (selectId) {
        const selected = ws.find((w) => w.id === selectId);
        if (selected) setActiveWorkspace(selected);
      } else if (ws.length > 0 && !activeWorkspace) {
        setActiveWorkspace(ws[0]);
      }
    } catch (error) {
      console.error("loadWorkspaces error:", error);
    }
  }

  async function loadWorkspaceData(workspaceId: number) {
    const [p, a, t] = await Promise.all([
      getProjects(workspaceId),
      getAgents(workspaceId),
      getTickets(workspaceId),
    ]);
    setProjects(p);
    setAgents(a);
    setTickets(t);
  }

  const handleRefresh = () => {
    if (activeWorkspace) loadWorkspaceData(activeWorkspace.id);
  };

  const getActiveTab = () => {
    if (pathname.startsWith('/projects')) return 'projects';
    if (pathname.startsWith('/agents')) return 'agents';
    if (pathname.startsWith('/tickets')) return 'tickets';
    return 'tickets';
  };

  const activeTab = getActiveTab();

  return (
    <AppContext.Provider value={{
      workspaces,
      activeWorkspace,
      setActiveWorkspace,
      projects,
      agents,
      tickets,
      loadWorkspaceData,
      handleRefresh,
      setShowAddProject,
      setShowAddAgent,
      setShowAddTicket
    }}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border flex flex-col bg-muted/30">
          <div className="p-4 border-b border-border flex gap-2 items-center">
            <Select
              value={activeWorkspace?.id.toString()}
              onValueChange={(val) => {
                const ws = workspaces.find((w) => w.id.toString() === val);
                if (ws) setActiveWorkspace(ws);
              }}
            >
              <SelectTrigger className="flex-1 h-9 bg-background">
                <SelectValue placeholder="Select swarm..." />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id.toString()}>
                    {ws.name}
                  </SelectItem>
                ))}
                {workspaces.length === 0 && (
                  <SelectItem value="none" disabled>
                    No swarms found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon-sm" className="shrink-0">
              <Settings className="size-4" />
            </Button>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            <Link
              to="/projects"
              disabled={!activeWorkspace}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 [&.active]:bg-primary [&.active]:text-primary-foreground hover:bg-muted text-muted-foreground hover:text-foreground`}
            >
              <Folder className="size-4" />
              Projects
            </Link>
            <Link
              to="/agents"
              disabled={!activeWorkspace}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 [&.active]:bg-primary [&.active]:text-primary-foreground hover:bg-muted text-muted-foreground hover:text-foreground`}
            >
              <Users className="size-4" />
              Agents
            </Link>
            <Link
              to="/tickets"
              disabled={!activeWorkspace}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 [&.active]:bg-primary [&.active]:text-primary-foreground hover:bg-muted text-muted-foreground hover:text-foreground`}
            >
              <TicketIcon className="size-4" />
              Tickets
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeWorkspace ? (
            <>
              <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold text-lg">
                    {activeWorkspace.name}
                  </h2>
                  <Badge variant="outline" className="font-normal capitalize">
                    {activeTab}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="size-3 mr-2" />
                    Refresh
                  </Button>
                  {activeTab === "projects" && (
                    <Button size="sm" onClick={() => setShowAddProject(true)}>
                      <Plus className="size-3 mr-2" />
                      New Project
                    </Button>
                  )}
                  {activeTab === "agents" && (
                    <Button size="sm" onClick={() => setShowAddAgent(true)}>
                      <Plus className="size-3 mr-2" />
                      New Agent
                    </Button>
                  )}
                  {activeTab === "tickets" && (
                    <Button size="sm" onClick={() => setShowAddTicket(true)}>
                      <Plus className="size-3 mr-2" />
                      New Ticket
                    </Button>
                  )}
                </div>
              </header>

              <div className="flex-1 overflow-auto p-6">
                <Outlet />
              </div>

              <AddProjectDialog
                workspaceId={activeWorkspace.id}
                open={showAddProject}
                onOpenChange={setShowAddProject}
                onSuccess={handleRefresh}
              />
              <AddAgentDialog
                workspaceId={activeWorkspace.id}
                open={showAddAgent}
                onOpenChange={setShowAddAgent}
                onSuccess={handleRefresh}
                availableAgents={agents}
              />
              <AddTicketDialog
                workspaceId={activeWorkspace.id}
                projects={projects}
                agents={agents}
                open={showAddTicket}
                onOpenChange={setShowAddTicket}
                onSuccess={handleRefresh}
              />
              <DiffViewerDialog
                open={showDiff}
                onOpenChange={setShowDiff}
                diff={currentDiff}
                onApprove={() => setShowDiff(false)}
                onReject={() => setShowDiff(false)}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <Briefcase className="size-16 text-muted-foreground mb-4 opacity-20" />
              <h1 className="text-3xl font-bold mb-2">Welcome to Construct</h1>
              <p className="text-muted-foreground max-w-md mb-8">
                Construct helps you orchestrate AI swarms across your projects.
                Select a swarm from the dropdown or create a new one to begin.
              </p>
              <Button onClick={() => setShowAddWorkspace(true)}>
                <Plus className="size-4 mr-2" />
                Create New Swarm
              </Button>
            </div>
          )}
        </main>

        <AddWorkspaceDialog
          open={showAddWorkspace}
          onOpenChange={setShowAddWorkspace}
          onSuccess={(id) => loadWorkspaces(id)}
        />
      </div>
    </AppContext.Provider>
  );
}
