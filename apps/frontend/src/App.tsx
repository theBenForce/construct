import { useEffect, useState } from "react";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
} from "@construct/components";
import {
  Plus,
  RefreshCw,
  Settings,
  Briefcase,
  Users,
  Ticket as TicketIcon,
  Folder,
  Play,
  Eye,
} from "lucide-react";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { AddAgentDialog } from "@/components/AddAgentDialog";
import { AddTicketDialog } from "@/components/AddTicketDialog";
import { AddWorkspaceDialog } from "@/components/AddWorkspaceDialog";
import { DiffViewerDialog } from "@/components/DiffViewerDialog";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null,
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [activeTab, setActiveTab] = useState<"projects" | "agents" | "tickets">(
    "projects",
  );

  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);

  const [showDiff, setShowDiff] = useState(false);
  const [currentDiff, setCurrentDiff] = useState("");
  const [isWorking, setIsWorking] = useState(false);

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

  async function handleStartWork(ticket: Ticket) {
    const project = projects.find((p) => p.id === ticket.project_id);
    const agent = agents.find((a) => a.id === ticket.assigned_agent_id);

    if (!project || !agent) {
      alert("Project or Agent not found for this ticket.");
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
        acpId: agent.acp_id,
        worktreePath,
        prompt: ticket.description || ticket.title,
        workspaceId: activeWorkspace.id,
      });

      const diff = await invoke<string>("get_diff", { worktreePath });
      setCurrentDiff(diff);
      setShowDiff(true);
    } catch (error) {
      alert("Error during work: " + error);
    } finally {
      setIsWorking(false);
    }
  }

  return (
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
          <button
            onClick={() => setActiveTab("projects")}
            disabled={!activeWorkspace}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 ${
              activeTab === "projects"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Folder className="size-4" />
            Projects
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            disabled={!activeWorkspace}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 ${
              activeTab === "agents"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="size-4" />
            Agents
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            disabled={!activeWorkspace}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-50 ${
              activeTab === "tickets"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <TicketIcon className="size-4" />
            Tickets
          </button>
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
              <Tabs value={activeTab} className="h-full flex flex-col">
                <TabsContent value="projects" className="mt-0 h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => (
                      <Card key={project.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {project.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xs text-muted-foreground break-all">
                            {project.local_path}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {projects.length === 0 && (
                      <div className="col-span-full py-12 text-center text-muted-foreground">
                        No projects in this swarm yet.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="agents" className="mt-0 h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => {
                      const manager = agents.find(
                        (a) => a.id === agent.manager_agent_id,
                      );
                      return (
                        <Card key={agent.id}>
                          <CardHeader className="pb-2 text-center">
                            <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                              <Users className="size-6 text-primary" />
                            </div>
                            <CardTitle className="text-base">
                              {agent.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-center space-y-2">
                            <div className="flex flex-wrap justify-center gap-2">
                              <Badge variant="secondary" className="uppercase">
                                {agent.acp_id}
                              </Badge>
                              {manager && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Users className="size-3" />
                                  Manager: {manager.name}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {agents.length === 0 && (
                      <div className="col-span-full py-12 text-center text-muted-foreground">
                        No agents in this swarm yet.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tickets" className="mt-0 h-full">
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
                              <Button variant="ghost" size="icon">
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
                </TabsContent>
              </Tabs>
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
              onApprove={() => {
                setShowDiff(false);
              }}
              onReject={() => {
                setShowDiff(false);
              }}
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
        onSuccess={(id) => {
          loadWorkspaces(id);
        }}
      />
    </div>
  );
}

export default App;
